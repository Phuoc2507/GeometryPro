// api/_lib/kernel/physics/runAcCircuit.ts
// Entry RIÊNG runAcCircuit — soi gương runCircuit/runOscillation: schema riêng, giải riêng, KHÔNG đụng
// run()/core/planSchema v0. LLM chỉ DỊCH đề → AcPlan; engine TÍNH đóng trên (hữu tỉ+căn)·πᵏ + TỰ KIỂM
// (K1..K5 residual exact-0) + XUẤT phasor/charts/table; sai mô hình ⇒ violations/errors, KHÔNG bịa đáp.
// Contract chung {ok, answers, checks, violations, errors, geometry, table, phasor, charts, meta}.
// OS-2 (KHÔNG BAO GIỜ throw ra route/bridge): suy biến chặn ở superRefine (§6.3); lưới cuối try/catch
// đổi mọi Error còn lọt (divExact mẫu 0…) → errors[] tiếng Việt.
import { AcPlanSchema, type AcPlan } from './acSchema';
import { resolveModel, deriveAc, isResonant, type AcModel, type AcDerived } from './acCircuit';
import { computeAcQuery, normalizeMinus, type AcAns } from './acCompute';
import { certifyPiScalar, type PiScalar } from './piScalar';
import { selfChecks, type Check } from './acCheck';
import { buildPhasor, buildCharts, buildTable, type PhasorLayout, type AcChart, type TableRow } from './acLayout';
import type { GeometryData } from '../../../../src/types/geometry';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn 2–3 chữ số; LLM override qua asserts[].tol.

type NumPair = { text: string; approx: number };
export type AcViolation = { assert: string; expected: number; got: number; delta: number };
export type AcResult = {
  ok: boolean;
  answers: AcAns[]; // THEO THỨ TỰ queries
  checks: Check[]; // K1..K5
  violations: AcViolation[];
  errors: { message: string }[];
  geometry: GeometryData | null; // RỖNG hợp lệ (v1 không vẽ 3D)
  table: TableRow[];
  phasor: PhasorLayout | null;
  charts: AcChart[];
  meta: {
    omega: NumPair; Z: NumPair; I: NumPair; cosphi: NumPair;
    resonance: boolean; unitsNote: 'SI';
  };
};

const ZERO_META = {
  omega: { text: '0', approx: 0 }, Z: { text: '0', approx: 0 },
  I: { text: '0', approx: 0 }, cosphi: { text: '0', approx: 0 },
  resonance: false, unitsNote: 'SI' as const,
};

export function runAcCircuit(raw: unknown): AcResult {
  const parsed = AcPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}` : 'schema';
    return {
      ok: false, answers: [], checks: [], violations: [], errors: [{ message: `Invalid AC plan: ${detail}` }],
      geometry: null, table: [], phasor: null, charts: [], meta: ZERO_META,
    };
  }
  const plan: AcPlan = parsed.data;
  const geometry: GeometryData = { name: plan.problemName, points: [], lines: [], tags: ['physics', 'ac-circuit'] };

  const errors: AcResult['errors'] = [];
  const violations: AcViolation[] = [];
  const answers: AcAns[] = [];
  let checks: Check[] = [];
  let model: AcModel | null = null;
  let derived: AcDerived | null = null;
  let phasor: PhasorLayout | null = null;
  let charts: AcChart[] = [];
  let table: TableRow[] = [];

  try {
    // 1) Resolve op → model + derived (đóng, không throw ở nhánh A/B; nhánh C rơi float trung thực).
    model = resolveModel(plan);
    derived = deriveAc(model);

    // 2) Queries — công thức đóng; query lỗi ⇒ errors (không serve-sai).
    for (const [qi, q] of plan.queries.entries()) {
      const r = computeAcQuery(model, derived, q);
      if (r.ok === false) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
      answers.push({ ...r.answer, queryIndex: qi });
    }

    // 3) Tự kiểm K1..K5 (residual exact-0 nhánh A/B); fail (bug engine/tràn) ⇒ errors + ok:false.
    checks = selfChecks(model, derived, plan);
    for (const c of checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });

    // 4) Asserts khai báo (dữ kiện DƯ của đề) — lệch quá tol ⇒ violations (mô hình dịch sai đề).
    for (const a of plan.asserts) {
      const r = computeAcQuery(model, derived, a.query);
      if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
      const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
      const delta = Math.abs(r.answer.approx - a.equals);
      if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta });
    }

    // 5) Trình bày (phasor/charts/table) — chỉ dựng khi hệ giải sạch (không ảnh hưởng đáp).
    if (violations.length === 0 && errors.length === 0) {
      phasor = buildPhasor(model, derived);
      charts = buildCharts(model, derived);
      table = buildTable(model, derived);
    }
  } catch (err) {
    errors.push({ message: `lỗi engine điện xoay chiều: ${err instanceof Error ? err.message : String(err)}` });
  }

  const ok = violations.length === 0 && errors.length === 0
    && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));

  const info = (p: PiScalar, n: number): NumPair => {
    const c = certifyPiScalar(p, n);
    return { text: normalizeMinus(c.text), approx: c.approx };
  };
  const meta = model && derived
    ? {
        omega: info(model.omega, model.n.omega),
        Z: info(derived.Z, derived.n.Z),
        I: info(derived.I, derived.n.I),
        cosphi: info(derived.cosphi, derived.n.cosphi),
        resonance: isResonant(derived),
        unitsNote: 'SI' as const,
      }
    : ZERO_META;

  return { ok, answers, checks, violations, errors, geometry, table, phasor, charts, meta };
}
