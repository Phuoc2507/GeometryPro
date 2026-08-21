// api/_lib/kernel/physics/runPhysics.ts
// Entry Vật lý — soi gương runAnalysis: schema riêng, compute riêng, KHÔNG đụng run()/core.
// LLM chỉ DỊCH đề → plan; engine TÍNH đóng + TỰ KIỂM; sai mô hình → violations, không bịa đáp.
import { PhysicsPlanSchema } from './planSchema';
import { motionOf, qtyTime, type Motion } from './kinematics';
import { computePhysicsQuery, groundTau, type Check, type PhysicsAnswer } from './compute';
import { buildScene, buildCharts } from './scene';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn 2–3 chữ số có nghĩa (spec §7.3); LLM override được qua asserts[].tol

export type PhysicsResult = {
  ok: boolean;
  answers: PhysicsAnswer[];
  checks: Check[];
  violations: { assert: string; expected: number; got: number; delta: number }[];
  errors: { message: string }[];
  geometry: unknown | null;
  charts: unknown[];
  meta: { tPhys: number; playback: { durationSec: number; timeScale: number }; units: { length: string; time: string } };
};

export function runPhysics(raw: unknown): PhysicsResult {
  const parsed = PhysicsPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, answers: [], checks: [], violations: [],
      errors: [{ message: `Invalid physics plan: ${parsed.error.issues[0]?.message ?? 'schema'}` }],
      geometry: null, charts: [], meta: { tPhys: 0, playback: { durationSec: 0, timeScale: 0 }, units: { length: 'm', time: 's' } } };
  }
  const plan = parsed.data;
  // Chuẩn hoá units MỘT chỗ: zod đã điền default lúc parse; dòng ?? chỉ để hệ type có
  // {length: string, time: string} chắc chắn (dưới strictNullChecks:false, z.infer ra optional).
  const units = { length: plan.units.length ?? 'm', time: plan.units.time ?? 's' };
  const errors: { message: string }[] = [];
  const motions = new Map<string, Motion>();
  for (const op of plan.ops) {
    if (motions.has(op.name)) { errors.push({ message: `Vật "${op.name}" khai báo 2 lần` }); continue; }
    // motionOf đổi đơn vị per-quantity về hệ nền (F2) — unit/nền ngoài bảng ⇒ lỗi có cấu trúc, không ném.
    try { motions.set(op.name, motionOf(op, units)); }
    catch (e) { errors.push({ message: `op "${op.name}": ${(e as Error).message}` }); }
  }

  // 1) Queries — công thức đóng + tự kiểm thay-ngược; check fail cũng đổ vào errors (không serve-sai)
  const answers: PhysicsAnswer[] = [];
  const checks: Check[] = [];
  const events: { t: number; label: string }[] = [];
  for (const q of plan.queries) {
    const r = computePhysicsQuery(motions, q, units);
    if (r.ok === false) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
    answers.push(r.answer);
    checks.push(...r.checks);
    if (r.tSolved !== undefined) events.push({ t: r.tSolved, label: ('label' in q && q.label) || q.kind });
    for (const c of r.checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
  }

  // 2) Asserts khai báo (dữ kiện DƯ của đề) → lệch quá tol ⇒ violations (mô hình dịch sai đề)
  const violations: PhysicsResult['violations'] = [];
  for (const a of plan.asserts) {
    const r = computePhysicsQuery(motions, a.query, units);
    if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
    const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta });
  }

  // 3) Chân trời vật lý T_phys (spec §8.2): mọi t trong queries (đã đổi đơn vị nếu khai tUnit — F2)
  //    + đáp thời gian + t_đất mỗi vật rơi; tối thiểu 1.
  let tPhys = 1;
  for (const q of plan.queries) {
    if ('t' in q && typeof (q as { t?: number }).t === 'number') {
      let tq = (q as { t: number }).t;
      const tu = (q as { tUnit?: string }).tUnit;
      if (tu) { try { tq = qtyTime(tq, tu, units).approx; } catch { /* đã thành error ở compute */ } }
      tPhys = Math.max(tPhys, tq);
    }
  }
  for (const e of events) tPhys = Math.max(tPhys, e.t);
  motions.forEach((m) => {
    if (m.op.op !== 'mover1d') {
      const g = groundTau(m);
      if (!('problem' in g)) tPhys = Math.max(tPhys, m.t0.approx + g.tauN);
    }
  });

  // 4) Scene + charts — trình bày thuần, không ảnh hưởng đáp (spec §8)
  const { geometry, playback } = buildScene(plan, motions, tPhys);
  const charts = buildCharts(plan, motions, tPhys, events);

  const ok = violations.length === 0 && errors.length === 0
    && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));
  return { ok, answers, checks, violations, errors, geometry, charts, meta: { tPhys, playback, units } };
}
