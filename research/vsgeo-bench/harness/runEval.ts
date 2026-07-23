import type { Seed, Answer } from "./seedTypes";
import type { EvalRecord, ModelReply, PromptStyle, Verdict } from "./types";
import { buildPrompt } from "./prompt";
import { extractBoxed } from "./extract";

// Kiểu kết quả của grade() (khớp hợp đồng dùng chung, do kế hoạch 02 định nghĩa đầy đủ).
export interface GradeResult {
  verdict: Verdict;
  canonicalModel?: string;
  canonicalTruth?: string;
  reason: string;
}

// Các phụ thuộc TIÊM VÀO để test được: callModel giả + grade giả.
export interface RunEvalDeps {
  callModel: (
    modelId: string, system: string, user: string,
    opts: { temperature?: number; maxTokens?: number; timeoutMs?: number }
  ) => Promise<ModelReply>;
  grade: (modelAnswerRaw: string, truth: Answer) => GradeResult;
  onProgress?: (done: number, total: number, rec: EvalRecord) => void;  // in tiến độ (tuỳ chọn)
}

export interface RunEvalOptions {
  k: number;                    // số lần hỏi lại mỗi (seed, model, style)
  styles: PromptStyle[];        // vd ["zero_shot", "cot"]
  temperature: number;          // cố định, ghi lại
  maxTokens?: number;
  timeoutMs?: number;
}

export async function runEval(
  seeds: Seed[],
  models: string[],
  opts: RunEvalOptions,
  deps: RunEvalDeps
): Promise<EvalRecord[]> {
  const records: EvalRecord[] = [];
  const total = seeds.length * models.length * opts.styles.length * opts.k;
  let done = 0;

  for (const seed of seeds) {
    for (const modelId of models) {
      for (const style of opts.styles) {
        for (let run = 1; run <= opts.k; run++) {
          const { system, user } = buildPrompt(seed, style);
          let rec: EvalRecord;
          try {
            const reply = await deps.callModel(modelId, system, user, {
              temperature: opts.temperature,
              maxTokens: opts.maxTokens,
              timeoutMs: opts.timeoutMs,
            });
            const extracted = extractBoxed(reply.text);
            const g = deps.grade(reply.text, seed.answer);   // TRUYỀN NGUYÊN VĂN cho grade
            rec = {
              seedId: seed.id,
              modelId,
              run,
              promptStyle: style,
              rawOutput: reply.text,
              extractedAnswer: extracted,
              verdict: g.verdict,
              latencyMs: reply.latencyMs,
              costUsd: reply.costUsd,
            };
          } catch (err) {
            // CHỊU LỖI TỪNG BÀI: ghi lại thành 'unsure', không ném để mẻ chạy tiếp.
            const msg = err instanceof Error ? err.message : String(err);
            rec = {
              seedId: seed.id,
              modelId,
              run,
              promptStyle: style,
              rawOutput: `[LỖI] ${msg}`,
              extractedAnswer: null,
              verdict: "unsure",
              latencyMs: 0,
            };
          }
          records.push(rec);
          done++;
          deps.onProgress?.(done, total, rec);
        }
      }
    }
  }
  return records;
}
