// api/_lib/kernel-bridge/solveSubject.js
// Đường ống "engine mode" cho LÝ & HÓA: đề → (LLM Translator) → Plan JSON → runPhysics/runChem → đáp.
// Bắt chước solveWithKernel.js (bản hình học): import engine từ bundle đã build (kernel-dist) để chạy
// trong route .js thuần; LLM CHỈ dịch, engine tính đóng + tự kiểm + tự abstain (không bịa).
import { runPhysics, PhysicsPlanSchema, chem } from '../kernel-dist/index.mjs';
import { callVilao } from '../vilao.js';
import { PHYSICS_TRANSLATOR_PROMPT } from './physicsTranslatorPrompt.js';
import { CHEM_TRANSLATOR_PROMPT } from './chemTranslatorPrompt.js';
import { postcheckPhysics, postcheckChem } from './planPostcheck.js';

const { runChem, ChemPlanSchema } = chem; // chem là namespace export của bundle

// Gỡ hàng rào ```json nếu model lỡ thêm dù đã dặn.
function extractJson(raw) {
  return String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

// Đáp exact của engine Hóa mang Rat (num/den BigInt) trong vài nhánh trace/scene; JSON.stringify NÉM
// khi gặp BigInt ⇒ res.json() chết. Chuyển BigInt → chuỗi để mọi consumer serialize được (như solveWithKernel).
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

// Model dịch có thể đổi qua env (mặc định gemini-flash — nhanh/rẻ, như bản hình học).
const TRANSLATOR_MODEL = process.env.VILAO_TRANSLATOR_MODEL || 'ram/gemini-3.5-flash-low';
// Timeout MẶC ĐỊNH bước dịch — 25s (đủ đệm; không dùng 180s mặc định của callVilao để tránh treo lâu).
const TRANSLATE_TIMEOUT_MS = Number(process.env.VILAO_TRANSLATOR_TIMEOUT_MS) || 25000;

// ── Bước DỊCH (đề → plan) — dùng chung cho Lý & Hóa ────────────────────────────
// Trả plan đã validate schema. Ném khi: non-JSON, abstain, hoặc sai schema (caller bắt để trả object lỗi).
async function translate(prompt, schema, problem, options = {}) {
  const raw = await callVilao(prompt, problem, {
    model: options.model || TRANSLATOR_MODEL,
    maxTokens: options.maxTokens || 4096,
    timeoutMs: options.timeoutMs ?? TRANSLATE_TIMEOUT_MS,
  });
  let json;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('Translator returned non-JSON output');
  }
  // Bộ dịch TỰ KHƯỚC TỪ khi đề thiếu số liệu / ngoài phạm vi (chống "phục vụ sai").
  if (json && typeof json === 'object' && json.abstain === true) {
    const e = new Error('translator abstained: ' + (json.abstain_reason || 'thiếu số liệu / ngoài phạm vi'));
    e.abstained = true;
    throw e;
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}` : 'invalid';
    throw new Error('Translator plan failed schema: ' + detail);
  }
  return parsed.data;
}

export async function physicsPlanFromProblem(problem, options = {}) {
  return translate(PHYSICS_TRANSLATOR_PROMPT, PhysicsPlanSchema, problem, options);
}
export async function chemPlanFromProblem(problem, options = {}) {
  return translate(CHEM_TRANSLATOR_PROMPT, ChemPlanSchema, problem, options);
}

// ── Chạy engine trên một PLAN (KHÔNG qua LLM) — điểm vào tất định cho dry-run/test ──
// Chuẩn hoá về khuôn chung { subject, ok, answers, violations, errors, trace, scene } + phần riêng môn.
export function solvePhysicsPlan(plan) {
  const r = runPhysics(plan);
  return jsonSafe({
    subject: 'physics',
    ok: r.ok,
    answers: r.answers,
    violations: r.violations,
    errors: r.errors,
    trace: r.checks,                     // "trace" chung = nhật ký tự kiểm của Lý
    scene: {                              // gói phần TRÌNH BÀY của Lý (canvas + timeline + charts)
      geometry: r.geometry,
      charts: r.charts,
      playback: r.meta?.playback ?? null,
      units: r.meta?.units ?? null,
      tPhys: r.meta?.tPhys ?? null,
    },
    checks: r.checks,                     // phần riêng Lý (tường minh)
    meta: r.meta,
  });
}

export function solveChemPlan(plan) {
  const r = runChem(plan);
  return jsonSafe({
    subject: 'chem',
    ok: r.ok,
    answers: r.answers,
    violations: r.violations,
    errors: r.errors,
    trace: r.trace,
    scene: r.scene,                       // ChemScene (2D overlay) — renderer riêng ở frontend
    reactions: r.reactions,               // phần riêng Hóa
    ledger: r.ledger,
    noReaction: r.noReaction ?? null,
  });
}

// ── Pipeline đầy đủ (đề → dịch → engine). Dịch hỏng ⇒ trả object ok:false (KHÔNG ném) ────
// để route quyết định (báo "ngoài phạm vi" / rơi về), giống solveWithKernel.solveProblem.
function translateFailure(subject, e) {
  return {
    subject, plan: null, ok: false, answers: [], violations: [],
    errors: [{ message: e && e.message ? e.message : 'lỗi dịch' }],
    trace: [], scene: null,
    abstained: !!(e && e.abstained),
  };
}

// Hậu-kiểm REJECT ⇒ object ok:false GIỮ plan (để route log lại) — engine KHÔNG được chạy.
function postcheckFailure(subject, plan, reason) {
  return {
    subject, plan, ok: false, answers: [], violations: [],
    errors: [{ message: reason, stage: 'postcheck' }],
    trace: [], scene: null,
    postcheck: { ok: false, reason },
  };
}

// Hậu-kiểm WARN ⇒ đính MỀM vào trace (dạng check severity:'warn', KHÔNG thành error) + field warnings.
function attachWarnings(solved, warnings) {
  if (!warnings || !warnings.length) return solved;
  const softChecks = warnings.map((message) => ({
    kind: 'postcheck', detail: message, residual: 0, pass: false, severity: 'warn',
  }));
  return {
    ...solved,
    trace: [...(solved.trace || []), ...softChecks],
    warnings: [...(solved.warnings || []), ...warnings],
    postcheck: { ok: true, warnings },
  };
}

export async function solvePhysicsProblem(problem, options = {}) {
  let plan;
  try {
    plan = await physicsPlanFromProblem(problem, options);
  } catch (e) {
    return translateFailure('physics', e);
  }
  // HẬU-KIỂM tất định: chạy NGAY SAU safeParse (trong translate), TRƯỚC engine.
  // Reject cứng ⇒ trả ok:false, KHÔNG chạy engine (chống "đáp sai âm thầm").
  const pc = postcheckPhysics(problem, plan);
  if (!pc.ok) return postcheckFailure('physics', plan, pc.reason);
  return attachWarnings({ plan, ...solvePhysicsPlan(plan) }, pc.warnings);
}

export async function solveChemProblem(problem, options = {}) {
  let plan;
  try {
    plan = await chemPlanFromProblem(problem, options);
  } catch (e) {
    return translateFailure('chem', e);
  }
  const pc = postcheckChem(problem, plan);
  if (!pc.ok) return postcheckFailure('chem', plan, pc.reason);
  return attachWarnings({ plan, ...solveChemPlan(plan) }, pc.warnings);
}
