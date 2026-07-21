// Lõi giải thuần — rút từ handler api/solve.js để Advance tái dùng per-câu
// (KHÔNG auth/credit/http). solveSteps KHÔNG BAO GIỜ throw: mọi lỗi LLM/parse
// ⇒ parsed=null ⇒ assembleSolveResult vẫn trả kết quả an toàn (đáp engine nếu có).
import { callVilao } from './vilao.js';
import { parseJsonResponse, repairTruncatedJson } from './jsonHelpers.js';
import { SOLVE_SYSTEM_PROMPT, buildSolveUserMessage } from './solvePrompts.js';
import { engineSolved, assembleSolveResult } from './solveAssemble.js';

// COPY nguyên văn từ api/solve.js (giờ solve.js import lại từ đây — 1 nguồn sự thật).
export function parseSolveResponse(raw) {
  const text = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed = null;
  // parseJsonResponse handles fence-stripping + first-JSON extraction, and throws on failure.
  try {
    parsed = parseJsonResponse(text);
  } catch (_e) {
    try {
      parsed = parseJsonResponse(repairTruncatedJson(text));
    } catch (_e2) {
      return null;
    }
  }
  if (!parsed) return null;

  if (!Array.isArray(parsed.steps)) return null;
  if (typeof parsed.final_answer !== 'string') return null;

  return parsed;
}

/**
 * solveSteps — (problem, geometry, engAnswer) → kết quả solve, thuần & không throw.
 *
 * @param {string} problem   Đề bài (đã trim ở nơi gọi nếu cần).
 * @param {object} geometry  Hình đã dựng (points/lines...).
 * @param {?{text:string,approx:number,verified:boolean}} engAnswer
 *        Đáp engine tất định (từ bước VẼ / geometry.engineAnswer). null nếu engine chưa giải.
 * @param {object} [opts]    { tags?, model?, apiKey?, maxTokens?, timeoutMs? }
 * @returns {Promise<{steps,final_answer,answer_value,verified,verify_error}>}
 */
export async function solveSteps(problem, geometry, engAnswer, opts = {}) {
  // Dựng eng theo ĐÚNG cách handler solve.js dựng từ geometry.engineAnswer.
  const eng = engAnswer && Number.isFinite(engAnswer.approx)
    ? { ok: !!engAnswer.verified, answers: [{ text: engAnswer.text, approx: engAnswer.approx }], violations: [] }
    : null;

  // Chuỗi đáp số đưa vào prompt = eng.answers[0].text KHI engine giải được (khớp solve.js),
  // ngược lại null. buildSolveUserMessage nhận STRING (không phải object) — nếu engine giải được
  // thì nhắc LLM viết các bước dẫn tới đúng đáp số này.
  const engineAnswerText = engineSolved(eng) ? eng.answers[0].text : null;

  let parsed = null;
  try {
    const userMessage = buildSolveUserMessage(problem, geometry, opts.tags, engineAnswerText);
    // Giữ ĐÚNG cách gọi callVilao + tham số hiện tại của solve.js (maxTokens 6144, timeoutMs 120000);
    // opts cho phép Advance override (model/apiKey/maxTokens/timeoutMs).
    const raw = await callVilao(SOLVE_SYSTEM_PROMPT, userMessage, {
      model: opts.model,
      apiKey: opts.apiKey,
      maxTokens: opts.maxTokens ?? 6144,
      timeoutMs: opts.timeoutMs ?? 120000,
    });
    parsed = parseSolveResponse(raw);
  } catch {
    // LLM lỗi mạng/timeout/parse ⇒ nuốt, để assemble trả đáp engine (nếu có) + steps rỗng.
    parsed = null;
  }

  return assembleSolveResult(eng, parsed);
}
