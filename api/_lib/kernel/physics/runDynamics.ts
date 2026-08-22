// api/_lib/kernel/physics/runDynamics.ts
// Entry RIÊNG runDynamics — soi gương runCircuit/runPhysics: schema riêng, giải riêng, KHÔNG đụng
// run()/core. LLM chỉ DỊCH đề → plan; engine GIẢI Newton đóng + TỰ KIỂM (thay-a-ngược + ràng buộc
// vật lý) + BÀN GIAO động học; sai mô hình → violations/errors, KHÔNG bịa đáp.
// Contract chung {ok, answers, checks, violations, errors, geometry, charts, meta}.
import { DynamicsPlanSchema, type DynamicsPlan } from './dynamicsSchema';
import { solveDynamics, computeDynQuery, PHYSICAL_VIOLATIONS, type DynAns, type Check, type Violation } from './dynamics';
import { buildDynamicsScene, buildDynamicsCharts, type DynamicsChart } from './dynamicsScene';
import type { GeometryData } from '../../../../src/types/geometry';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn 2–3 chữ số (spec §9.3); LLM override qua asserts[].tol

export type DynamicsResult = {
  ok: boolean;
  answers: DynAns[];
  checks: Check[];
  violations: { assert?: string; id?: string; message: string; expected?: number; got?: number; delta?: number }[];
  errors: { message: string }[];
  geometry: GeometryData | null;
  charts: DynamicsChart[];
  meta: {
    model: { config: string; direction: string };
    tPhys: number;
    playback: { durationSec: number; timeScale: number };
    unitsNote: 'SI';
    horizonNote?: string;
  };
};

const ZERO_META: DynamicsResult['meta'] = { model: { config: 'ngang', direction: '' }, tPhys: 0, playback: { durationSec: 0, timeScale: 1 }, unitsNote: 'SI' };

export function runDynamics(raw: unknown): DynamicsResult {
  const parsed = DynamicsPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}` : 'schema';
    return { ok: false, answers: [], checks: [], violations: [], errors: [{ message: `Invalid dynamics plan: ${detail}` }], geometry: null, charts: [], meta: ZERO_META };
  }
  const plan: DynamicsPlan = parsed.data;
  const isSingle = plan.ops.filter((o) => o.op === 'body').length === 1;

  // 1) Giải hệ — trục/chiều/đổi đơn vị + Newton đóng + ràng buộc vật lý + self-check trạng thái.
  const solved = solveDynamics(plan);
  const errors: DynamicsResult['errors'] = [...solved.errors];
  const checks: Check[] = [...solved.checks];
  const violations: DynamicsResult['violations'] = solved.violations.map((v: Violation) => ({ id: v.id, message: v.message }));

  // 2) Queries — công thức đóng + tự kiểm động học; query lỗi ⇒ errors (không serve-sai).
  const answers: DynAns[] = [];
  let tMax = 0; // chân trời vật lý từ các đại lượng thời gian THẬT (query t, đáp thời gian, t_dừng)
  for (const [qi, q] of plan.queries.entries()) {
    const r = computeDynQuery(solved, q, isSingle);
    if (r.ok === false) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
    answers.push({ ...r.answer, queryIndex: qi });
    checks.push(...r.checks);
    for (const c of r.checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
    if (r.tSolved !== undefined && Number.isFinite(r.tSolved)) tMax = Math.max(tMax, r.tSolved);
  }
  for (const q of plan.queries) if ('t' in q && typeof (q as { t?: number }).t === 'number') tMax = Math.max(tMax, (q as { t: number }).t);
  solved.bodies.forEach((b) => { if (b.tStop !== null) tMax = Math.max(tMax, b.tStop); });
  // Bài thuần lực (không đại lượng thời gian) ⇒ T_phys = 2 s danh nghĩa (§10.2, §17.7).
  const tPhys = tMax > 1e-9 ? tMax : 2;

  // 3) Trạng thái tự kiểm FAIL (bug engine/tràn) ⇒ errors + ok:false, KHÔNG serve sai.
  for (const c of solved.checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });

  // 4) Asserts khai báo (dữ kiện DƯ của đề) — lệch quá tol ⇒ violations (mô hình dịch sai đề).
  for (const a of plan.asserts) {
    const r = computeDynQuery(solved, a.query, isSingle);
    if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
    const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta, message: `assert ${a.query.kind}: kỳ vọng ${a.equals}, engine tính ${r.answer.approx}` });
  }

  // Violation VẬT LÝ (mô hình không thoả đề) ⇒ KHÔNG serve đáp (§9.2 — "không bịa đáp"). Assert-sai KHÔNG xoá đáp
  // (engine tính đúng, chỉ dữ kiện DƯ của đề mâu thuẫn) nhưng vẫn ok:false.
  const hasPhysicalViolation = solved.violations.some((v: Violation) => PHYSICAL_VIOLATIONS.has(v.id));
  const servedAnswers = hasPhysicalViolation ? [] : answers;

  // 5) Scene + charts — trình bày thuần, không ảnh hưởng đáp (spec §10). Chỉ dựng khi hệ giải được.
  const okState = violations.length === 0 && errors.length === 0;
  const scene = okState ? buildDynamicsScene(plan, solved, tPhys) : { geometry: null, playback: { durationSec: 0, timeScale: 1 } };
  const charts = okState ? buildDynamicsCharts(plan, solved, tPhys) : [];

  const ok = violations.length === 0 && errors.length === 0 && servedAnswers.length === plan.queries.length && servedAnswers.every((a) => Number.isFinite(a.approx));
  return {
    ok, answers: servedAnswers, checks, violations, errors, geometry: scene.geometry, charts,
    meta: { model: { config: solved.meta.config, direction: solved.meta.direction }, tPhys, playback: scene.playback, unitsNote: 'SI', horizonNote: solved.meta.horizonNote },
  };
}
