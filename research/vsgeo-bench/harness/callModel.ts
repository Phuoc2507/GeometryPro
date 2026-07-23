import type { ModelReply } from "./types";
import { estimateCostUsd } from "./pricing";
import { call as openaiCall } from "./models/openai";
import { call as geminiCall } from "./models/gemini";
import { call as anthropicCall } from "./models/anthropic";
import { call as openrouterCall } from "./models/openrouter";

// Kiểu một hàm adapter: nhận tên model (đã bỏ tiền tố) + system/user/opts, trả ModelReply.
export type AdapterCall = (
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number }
) => Promise<ModelReply>;

// Bảng adapter THẬT, khoá theo tiền tố nhà cung cấp.
const REAL_ADAPTERS: Record<string, AdapterCall> = {
  openai: openaiCall,
  gemini: geminiCall,
  anthropic: anthropicCall,
  openrouter: openrouterCall,
};

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Nhận biết lỗi "tạm thời" đáng thử lại (mạng chập, quá tải, giới hạn nhịp).
// Bắt chước cách phân loại của api/_lib/vilao.js.
function isTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("429") ||     // quá nhịp (rate limit)
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  );
}

export interface CallModelDeps {
  adapters?: Record<string, AdapterCall>;   // tiêm adapter giả khi test
  sleep?: (ms: number) => Promise<void>;    // tiêm sleep giả khi test
  maxAttempts?: number;                     // số lần thử tối đa (mặc định 3)
}

export async function callModel(
  modelId: string,
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
  deps: CallModelDeps = {}
): Promise<ModelReply> {
  const adapters = deps.adapters ?? REAL_ADAPTERS;
  const sleep = deps.sleep ?? realSleep;
  const maxAttempts = deps.maxAttempts ?? 3;

  // Tách "tiền tố:phần-còn-lại". indexOf để giữ nguyên dấu ':' trong tên model (vd openrouter path).
  const sep = modelId.indexOf(":");
  if (sep === -1) throw new Error(`modelId phải có dạng "nhàCC:tên", nhận: ${modelId}`);
  const provider = modelId.slice(0, sep);
  const bareModel = modelId.slice(sep + 1);

  const adapter = adapters[provider];
  if (!adapter) throw new Error(`callModel: không nhận ra nhà cung cấp "${provider}" (modelId=${modelId})`);

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const reply = await adapter(bareModel, system, user, opts);
      // Gắn chi phí ước tính (nếu chưa có sẵn từ adapter).
      const costUsd = reply.costUsd ?? estimateCostUsd(modelId, reply.usage);
      return { ...reply, costUsd };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts && isTransient(err)) {
        // Backoff luỹ thừa: chờ 500ms, 1000ms, 2000ms... trước lần thử kế.
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }
      throw err;   // lỗi vĩnh viễn hoặc đã hết lượt => ném ra
    }
  }
  throw lastErr;   // lý thuyết không tới đây, nhưng để TypeScript yên tâm
}
