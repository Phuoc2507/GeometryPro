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

// Nhận biết lỗi "tạm thời" đáng thử lại (mạng chập, quá tải, giới hạn nhịp, quá hạn).
// Bắt chước cách phân loại của api/_lib/vilao.js.
//
// Hai lỗi do bộ tự-phản-biện (adversarial review) phát hiện, đã vá ở đây:
//   F1 — timeout do CHÍNH harness kích qua AbortController.abort() làm fetch ném DOMException
//        name="AbortError", message "This operation was aborted" — KHÔNG chứa chữ "timeout".
//        Bản cũ dò chuỗi con "timeout" nên KHÔNG bắt được => timeout (lỗi tạm thời phổ biến
//        nhất khi gọi model chậm) không bao giờ được thử lại. Sửa: bắt theo TÊN lỗi.
//   F4 — bản cũ dò chuỗi con "500" nên khớp NHẦM "8500" trong thân lỗi của một HTTP 400
//        (vd "max_tokens ... 8500 tokens") => 4xx vĩnh viễn bị thử lại vô ích. Sửa: đọc ĐÚNG
//        mã trạng thái ngay sau "HTTP " (mọi adapter đều ném "PROVIDER HTTP <mã>: <thân>").
function isTransient(err: unknown): boolean {
  // F1 — timeout của harness: bắt theo TÊN lỗi, không theo chuỗi con.
  if (err instanceof Error && err.name === "AbortError") return true;

  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  // F4 — lỗi HTTP: đọc mã ngay sau "http " để KHÔNG khớp nhầm chữ số trong thân lỗi. Có mã HTTP
  // => quyết định LUÔN tại đây: chỉ 429 (quá nhịp) và 5xx là tạm thời; 4xx khác là vĩnh viễn.
  const httpMatch = msg.match(/\bhttp (\d{3})\b/);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    return status === 429 || status >= 500;
  }

  // Lỗi mạng cấp thấp (không kèm mã HTTP): chập mạng, mất/không nối được, quá hạn, quá nhịp.
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("rate limit")
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
