// api/_lib/kernel-bridge/solveWithKernel.js
// Đường ống "kernel mode": đề → (LLM Translator) → Plan JSON → engine.run() → hình + đáp số.
// Import engine từ bản đã build (esbuild) để chạy được trong route .js thuần.
import { run, RunPlanSchema, entityTableToGeometryData } from '../kernel-dist/index.mjs';
import { callVilao } from '../vilao.js';
import { TRANSLATOR_PROMPT } from './translatorPrompt.js';

// Gỡ hàng rào ```json nếu model lỡ thêm dù đã dặn.
function extractJson(raw) {
  return String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

// Đề tiếng Việt → Plan JSON hợp lệ (đã validate bằng schema của engine).
// Model dịch có thể đổi qua env VILAO_TRANSLATOR_MODEL; mặc định gemini-flash (nhanh/rẻ).
const TRANSLATOR_MODEL = process.env.VILAO_TRANSLATOR_MODEL || 'ram/gemini-3.5-flash-low';

export async function planFromProblem(problem) {
  const raw = await callVilao(TRANSLATOR_PROMPT, problem, { model: TRANSLATOR_MODEL, maxTokens: 4096 });
  let json;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('Translator returned non-JSON output');
  }
  const parsed = RunPlanSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Translator plan failed schema: ' + (parsed.error.issues[0]?.message || 'invalid'));
  }
  return parsed.data;
}

// Chạy một Plan qua engine → gói kết quả để frontend dùng.
export function solvePlan(plan) {
  const result = run(plan);
  return {
    ok: result.ok,
    geometry: entityTableToGeometryData(result.entities, plan.solidName || 'figure'),
    answers: result.answers, // mỗi cái có .text (đáp số dạng exact) + .approximate
    violations: result.violations,
    errors: result.errors,
    trace: result.trace,
  };
}

export async function solveProblem(problem) {
  const plan = await planFromProblem(problem);
  return { plan, ...solvePlan(plan) };
}
