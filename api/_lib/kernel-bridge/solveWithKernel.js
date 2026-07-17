// api/_lib/kernel-bridge/solveWithKernel.js
// Đường ống "kernel mode": đề → (LLM Translator) → Plan JSON → engine.run() → hình + đáp số.
// Import engine từ bản đã build (esbuild) để chạy được trong route .js thuần.
import { runAny, RunPlanSchema, AnalysisPlanSchema, entityTableToGeometryData } from '../kernel-dist/index.mjs';
import { callVilao } from '../vilao.js';
import { TRANSLATOR_PROMPT } from './translatorPrompt.js';

// Gỡ hàng rào ```json nếu model lỡ thêm dù đã dặn.
function extractJson(raw) {
  return String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

// Đề tiếng Việt → Plan JSON hợp lệ (đã validate bằng schema của engine).
// Model dịch có thể đổi qua env VILAO_TRANSLATOR_MODEL; mặc định gemini-flash (nhanh/rẻ).
const TRANSLATOR_MODEL = process.env.VILAO_TRANSLATOR_MODEL || 'ram/gemini-3.5-flash-low';

// Timeout MẶC ĐỊNH cho bước dịch. Đo thực tế: 5–10s/đề (cả gemini lẫn claude). Đặt 25s = thừa đệm.
// KHÔNG dùng mặc định 180s của callVilao: khi engine là bước THỬ TRƯỚC rồi mới rơi về luồng cũ,
// một lần LLM treo sẽ bắt người dùng chờ 3 phút trước khi luồng cũ mới bắt đầu.
const TRANSLATE_TIMEOUT_MS = Number(process.env.VILAO_TRANSLATOR_TIMEOUT_MS) || 25000;

export async function planFromProblem(problem, options = {}) {
  const raw = await callVilao(TRANSLATOR_PROMPT, problem, {
    model: TRANSLATOR_MODEL,
    maxTokens: 4096,
    timeoutMs: options.timeoutMs ?? TRANSLATE_TIMEOUT_MS,
  });
  let json;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('Translator returned non-JSON output');
  }
  // Plan có khối `analyze` (bài tham số/tối ưu/hàm số) dùng schema analysis; còn lại là plan hình học thuần.
  const schema = json && typeof json === 'object' && 'analyze' in json ? AnalysisPlanSchema : RunPlanSchema;
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Translator plan failed schema: ' + (parsed.error.issues[0]?.message || 'invalid'));
  }
  return parsed.data;
}

// Chạy một Plan qua engine → gói kết quả để frontend dùng.
// Đáp số exact của engine mang BigInt (num/den của phân số chính xác). JSON.stringify NÉM khi gặp
// BigInt ⇒ res.json() của route sẽ chết. Chuyển BigInt → chuỗi để mọi consumer serialize được.
// (Giá trị exact vẫn đọc được ở .text dạng '√2'; đây chỉ là làm cho JSON an toàn.)
function jsonSafe(v) {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = jsonSafe(val);
    return out;
  }
  return v;
}

export function solvePlan(plan) {
  const result = runAny(plan);
  // Nhánh analysis: runAnalysis trả { parameter, answer } và KHÔNG có entities ⇒ chưa dựng được hình.
  if (!('entities' in result)) {
    return jsonSafe({
      ok: result.ok,
      geometry: null,
      parameter: result.parameter,
      answers: result.ok ? [result.answer] : [],
      violations: result.violations,
      errors: result.errors,
    });
  }
  return jsonSafe({
    ok: result.ok,
    geometry: entityTableToGeometryData(result.entities, plan.solidName || 'figure'),
    answers: result.answers, // mỗi cái có .text (đáp số dạng exact) + .approximate
    violations: result.violations,
    errors: result.errors,
    trace: result.trace,
  });
}

export async function solveProblem(problem, options = {}) {
  const plan = await planFromProblem(problem, options);
  return { plan, ...solvePlan(plan) };
}
