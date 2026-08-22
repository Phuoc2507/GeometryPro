// api/_lib/kernel-bridge/solveSubject.js
// Đường ống "engine mode" cho LÝ & HÓA: đề → (LLM Translator) → Plan JSON → run{Chương}/runChem → đáp.
// Bắt chước solveWithKernel.js (bản hình học): import engine từ bundle đã build (kernel-dist) để chạy
// trong route .js thuần; LLM CHỈ dịch, engine tính đóng + tự kiểm + tự abstain (không bịa).
//
// ĐA CHƯƠNG LÝ (P — nối engine đã build vào route): Vật lý có NHIỀU chương, mỗi chương một pack RIÊNG
// (schema + run): kinematics (động học), dynamics (động lực học), circuit (mạch điện), oscillation
// (dao động). physicsChapterClassifier (tất định, không LLM) chọn CHƯƠNG → dispatch tới đúng
// {prompt dịch, schema, engine}. Chương CHƯA có bộ dịch (prompt=null) ⇒ abstain rõ ràng, KHÔNG bịa.
import {
  runPhysics, PhysicsPlanSchema,
  runCircuit, CircuitPlanSchema,
  runDynamics, DynamicsPlanSchema,
  runOscillation, OscillationPlanSchema,
  chem,
} from '../kernel-dist/index.mjs';
import { callVilao } from '../vilao.js';
import { classifyPhysicsChapter } from './physicsChapterClassifier.js';
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

// ── SÂN KHẤU (scene) chuẩn hoá theo chương — frontend đọc scene.geometry (+ playback/units) ─────
// Mọi chương phát `geometry` (GeometryData) để PhysicsSceneView vẽ; circuit kèm bảng R/U/I/P + layout.
function sceneMotion(r) {
  // kinematics / dynamics / oscillation: cảnh chuyển động + timeline + charts.
  const m = r.meta || {};
  const units = m.units // kinematics: {length,time}
    || { length: m.length /* oscillation base len */ || 'm', time: 's' };
  return {
    geometry: r.geometry,
    charts: r.charts || [],
    playback: m.playback ?? null,
    units,
    tPhys: m.tPhys ?? null,
  };
}
function sceneCircuit(r) {
  // circuit: sơ đồ TĨNH (không playback) + bảng đáp R/U/I/P + layout lưới.
  return {
    geometry: r.geometry,
    charts: [],
    table: r.table || [],
    circuitLayout: r.circuitLayout ?? null,
    playback: null,
    units: { length: '', time: '' },
    meta: r.meta ?? null,
  };
}

// ── ĐĂNG KÝ CHƯƠNG LÝ: chương → {schema, run, prompt, scene, postcheck} ─────────────
// prompt=null: engine đã có nhưng CHƯA mở bộ dịch tự nhiên (đề dạng đó tạm abstain, KHÔNG bịa).
// postcheck: chỉ kinematics/dynamics chia sẻ ngữ nghĩa ops/km-h của postcheckPhysics; circuit/oscillation
// dựa hoàn toàn vào superRefine của schema (postcheckPhysics inert với chúng — bỏ cho sạch).
const NO_POSTCHECK = () => ({ ok: true, warnings: [] });
const PHYSICS_CHAPTERS = {
  kinematics: { label: 'động học', schema: PhysicsPlanSchema, run: runPhysics, prompt: PHYSICS_TRANSLATOR_PROMPT, scene: sceneMotion, postcheck: postcheckPhysics },
  dynamics: { label: 'động lực học', schema: DynamicsPlanSchema, run: runDynamics, prompt: null, scene: sceneMotion, postcheck: postcheckPhysics },
  circuit: { label: 'mạch điện', schema: CircuitPlanSchema, run: runCircuit, prompt: null, scene: sceneCircuit, postcheck: NO_POSTCHECK },
  oscillation: { label: 'dao động', schema: OscillationPlanSchema, run: runOscillation, prompt: null, scene: sceneMotion, postcheck: NO_POSTCHECK },
};

// Auto-nhận chương TỪ PLAN (dry-run/test cấp plan trần): schema các chương RỜI NHAU (kinematics op
// mover1d/free_fall/projectile; dynamics body/force/string; oscillation oscillator; circuit có source+circuit,
// KHÔNG ops) ⇒ safeParse đúng một chương. Thứ tự thử: circuit → oscillation → dynamics → kinematics.
function detectChapterFromPlan(plan) {
  for (const ch of ['circuit', 'oscillation', 'dynamics', 'kinematics']) {
    if (PHYSICS_CHAPTERS[ch].schema.safeParse(plan).success) return ch;
  }
  return 'kinematics'; // không khớp cái nào ⇒ để kinematics ném lỗi schema rõ ràng
}

export async function physicsPlanFromProblem(problem, options = {}) {
  // Giữ tương thích: mặc định dịch KINEMATICS (nhánh cũ). options.chapter để dispatch chương khác.
  const chapter = options.chapter && PHYSICS_CHAPTERS[options.chapter] ? options.chapter : 'kinematics';
  const entry = PHYSICS_CHAPTERS[chapter];
  if (!entry.prompt) {
    const e = new Error(`Chương "${entry.label}" đã có engine nhưng chưa mở bộ dịch tự nhiên`);
    e.abstained = true;
    throw e;
  }
  return translate(entry.prompt, entry.schema, problem, options);
}
export async function chemPlanFromProblem(problem, options = {}) {
  return translate(CHEM_TRANSLATOR_PROMPT, ChemPlanSchema, problem, options);
}

// ── Chạy engine trên một PLAN (KHÔNG qua LLM) — điểm vào tất định cho dry-run/test ──
// chapter tùy chọn; bỏ trống ⇒ auto-nhận từ hình dạng plan. Chuẩn hoá về khuôn chung
// { subject, chapter, ok, answers, violations, errors, trace, scene } + phần riêng chương.
export function solvePhysicsPlan(plan, chapter) {
  const ch = chapter && PHYSICS_CHAPTERS[chapter] ? chapter : detectChapterFromPlan(plan);
  const entry = PHYSICS_CHAPTERS[ch];
  const r = entry.run(plan);
  return jsonSafe({
    subject: 'physics',
    chapter: ch,
    ok: r.ok,
    answers: r.answers,
    violations: r.violations,
    errors: r.errors,
    trace: r.checks,                     // "trace" chung = nhật ký tự kiểm của Lý
    scene: entry.scene(r),               // gói phần TRÌNH BÀY riêng chương (canvas + timeline/bảng)
    checks: r.checks,                    // phần riêng Lý (tường minh)
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
function translateFailure(subject, e, extra = {}) {
  return {
    subject, plan: null, ok: false, answers: [], violations: [],
    errors: [{ message: e && e.message ? e.message : 'lỗi dịch' }],
    trace: [], scene: null,
    abstained: !!(e && e.abstained),
    ...extra,
  };
}

// Hậu-kiểm REJECT ⇒ object ok:false GIỮ plan (để route log lại) — engine KHÔNG được chạy.
function postcheckFailure(subject, plan, reason, extra = {}) {
  return {
    subject, plan, ok: false, answers: [], violations: [],
    errors: [{ message: reason, stage: 'postcheck' }],
    trace: [], scene: null,
    postcheck: { ok: false, reason },
    ...extra,
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
  // Chương do prefilter tất định chọn (không LLM); options.chapter cưỡng chế cho test.
  const chapter = options.chapter && PHYSICS_CHAPTERS[options.chapter]
    ? options.chapter
    : classifyPhysicsChapter(problem);
  const entry = PHYSICS_CHAPTERS[chapter];

  let plan;
  try {
    plan = await physicsPlanFromProblem(problem, { ...options, chapter });
  } catch (e) {
    return translateFailure('physics', e, { chapter });
  }
  // HẬU-KIỂM tất định: chạy NGAY SAU safeParse (trong translate), TRƯỚC engine.
  // Reject cứng ⇒ trả ok:false, KHÔNG chạy engine (chống "đáp sai âm thầm").
  const pc = entry.postcheck(problem, plan);
  if (!pc.ok) return postcheckFailure('physics', plan, pc.reason, { chapter });
  return attachWarnings({ plan, ...solvePhysicsPlan(plan, chapter) }, pc.warnings);
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
