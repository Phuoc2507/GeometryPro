// api/_lib/kernel/physics/runOscillation.ts
// Entry RIÊNG runOscillation — soi gương runDynamics/runCircuit: schema riêng, giải riêng, KHÔNG đụng
// run()/core/kinematics. LLM chỉ DỊCH đề → plan; engine GIẢI công thức đóng trên (hữu tỉ+căn)·πᵏ +
// TỰ KIỂM (thay-ngược + hệ thức độc lập v²+ω²x²=ω²A² + bảo toàn năng lượng + quét minimality) +
// XUẤT scene/charts; sai mô hình ⇒ violations/errors, KHÔNG bịa đáp.
// Contract chung {ok, answers, checks, violations, errors, geometry, charts, meta} (mirror runDynamics §12).
// OS-2 (không bao giờ throw): refine zod chặn >0; guard A>0/ω null ⇒ errors; try/catch lưới cuối đổi
// mọi Error còn lọt (divExact mẫu 0…) thành errors[] tiếng Việt — KHÔNG ném ra route/bridge.
import { OscillationPlanSchema, type OscillationPlan, type OscQuery } from './oscillationSchema';
import {
  resolveModel, computeOscQuery, PHYSICAL_VIOLATIONS,
  type OscAns, type Check, type Violation, type Solved, type OscModel, type BaseLen,
} from './oscillation';
import { buildOscillationScene, buildOscillationCharts, type OscChart } from './oscillationScene';
import { approxP, TWO_PI, divP, toPiScalar } from './piScalar';
import type { GeometryData } from '../../../../src/types/geometry';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn 2–3 chữ số; LLM override qua asserts[].tol (§5.4 gAsPiSquared)

export type OscViolation = { assert?: string; id?: string; message: string; expected?: number; got?: number; delta?: number };
export type OscillationResult = {
  ok: boolean;
  answers: OscAns[];
  checks: Check[];
  violations: OscViolation[];
  errors: { message: string }[];
  geometry: GeometryData | null;
  charts: OscChart[];
  meta: {
    tPhys: number;
    playback: { durationSec: number; timeScale: number };
    unitsNote: 'per-quantity';
    length: BaseLen;
    models: { name: string; hasA: boolean; hasOmega: boolean; hasPhase: boolean; animated: boolean }[];
  };
};

const ZERO_PLAYBACK = { durationSec: 0, timeScale: 1 };

function timeOfQuery(q: OscQuery): number | null {
  // t trực tiếp (x_at/v_at/a_at) hoặc at.t (energy_*_at). Trả giây thực (approx), null nếu không có.
  const anyq = q as { t?: unknown; at?: { t?: unknown } };
  if (anyq.t !== undefined) return approxP(toPiScalar(anyq.t as never));
  if (anyq.at && (anyq.at as { t?: unknown }).t !== undefined) return approxP(toPiScalar((anyq.at as { t: unknown }).t as never));
  return null;
}

export function runOscillation(raw: unknown): OscillationResult {
  const parsed = OscillationPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}` : 'schema';
    return {
      ok: false, answers: [], checks: [], violations: [], errors: [{ message: `Invalid oscillation plan: ${detail}` }],
      geometry: null, charts: [], meta: { tPhys: 0, playback: ZERO_PLAYBACK, unitsNote: 'per-quantity', length: 'cm', models: [] },
    };
  }
  const plan: OscillationPlan = parsed.data;
  const base: BaseLen = plan.units.length;

  const errors: OscillationResult['errors'] = [];
  const checks: Check[] = [];
  const violations: OscViolation[] = [];
  const answers: OscAns[] = [];
  let geometry: GeometryData | null = null;
  let charts: OscChart[] = [];
  let playback = { ...ZERO_PLAYBACK };
  let tPhys = 0;
  let models: OscModel[] = [];

  // OS-2 — lưới an toàn cuối: mọi Error còn lọt (kể cả divExact mẫu 0 xuyên pipeline) ⇒ errors tiếng Việt.
  try {
    // 1) Chuẩn hoá từng op → OscModel (+ auto-assert nguồn dư, guard A>0). Map name → Solved để dispatch query.
    const solvedByName = new Map<string, Solved>();
    for (const op of plan.ops) {
      const solved = resolveModel(op, base);
      solvedByName.set(op.name, solved);
      checks.push(...solved.checks);
      for (const v of solved.violations) violations.push({ id: v.id, message: v.message });
      for (const e of solved.errors) errors.push({ message: e.message });
    }
    models = plan.ops.map((op) => (solvedByName.get(op.name) as Solved).model);
    // Ghi chú: check FAIL của resolve (rate/ampl redundant lệch) LUÔN kèm violation 'nguon-du-lech'
    // (§5.2 — dịch sai đề, KHÔNG phải bug engine) nên không đổi thành errors ở đây.

    // 2) Queries — công thức đóng + tự kiểm; query lỗi ⇒ errors (không serve-sai).
    for (const [qi, q] of plan.queries.entries()) {
      const solved = solvedByName.get(q.of);
      if (!solved) { errors.push({ message: `query ${q.kind}: vật "${q.of}" không tồn tại` }); continue; }
      const r = computeOscQuery(solved, q, base);
      if (r.ok === false) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
      answers.push({ ...r.answer, queryIndex: qi });
      checks.push(...r.checks);
      for (const c of r.checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
      if (r.tSolved !== undefined && Number.isFinite(r.tSolved)) tPhys = Math.max(tPhys, r.tSolved);
    }

    // 3) Chân trời vật lý T_phys = max(2T mọi model, mọi t trong queries, mọi đáp first_time, 1) (§9.1).
    for (const m of models) if (m.omega !== null) {
      const T = approxP(divP(TWO_PI, m.omega));
      if (Number.isFinite(T)) tPhys = Math.max(tPhys, 2 * T);
    }
    for (const q of plan.queries) { const t = timeOfQuery(q); if (t !== null && Number.isFinite(t)) tPhys = Math.max(tPhys, t); }
    tPhys = tPhys > 1e-9 ? tPhys : 1;

    // 4) Asserts khai báo (dữ kiện DƯ của đề) — lệch quá tol ⇒ violations (mô hình dịch sai đề).
    for (const a of plan.asserts) {
      const solved = solvedByName.get(a.query.of);
      if (!solved) { errors.push({ message: `assert ${a.query.kind}: vật "${a.query.of}" không tồn tại` }); continue; }
      const r = computeOscQuery(solved, a.query, base);
      if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
      const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
      const delta = Math.abs(r.answer.approx - a.equals);
      if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta, message: `assert ${a.query.kind}: kỳ vọng ${a.equals}, engine tính ${r.answer.approx}` });
    }
  } catch (err) {
    errors.push({ message: `lỗi engine dao động: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Violation VẬT LÝ (mô hình không thoả đề: A≤0, nguồn dư lệch, li độ ngoài biên) ⇒ KHÔNG serve đáp
  // (§8.4 "không bịa đáp"). Assert-sai KHÔNG xoá đáp (engine tính đúng, chỉ dữ kiện đề mâu thuẫn) nhưng ok:false.
  const hasPhysicalViolation = violations.some((v) => v.id !== undefined && PHYSICAL_VIOLATIONS.has(v.id));
  const servedAnswers = hasPhysicalViolation ? [] : answers;

  // 5) Scene + charts — trình bày thuần, KHÔNG ảnh hưởng đáp (§9). Chỉ dựng khi hệ giải sạch.
  const okState = violations.length === 0 && errors.length === 0;
  if (okState) {
    const built = buildOscillationScene(plan, models, tPhys);
    geometry = built.geometry;
    playback = built.playback;
    charts = buildOscillationCharts(plan, models, tPhys);
  }

  const ok = violations.length === 0 && errors.length === 0
    && servedAnswers.length === plan.queries.length && servedAnswers.every((a) => Number.isFinite(a.approx));
  return {
    ok, answers: servedAnswers, checks, violations, errors, geometry, charts,
    meta: {
      tPhys, playback, unitsNote: 'per-quantity', length: base,
      models: models.map((m) => ({
        name: m.name, hasA: m.A !== null, hasOmega: m.omega !== null, hasPhase: m.phi !== null,
        animated: m.A !== null && m.omega !== null && m.phi !== null && !m.op.pendulum,
      })),
    },
  };
}
