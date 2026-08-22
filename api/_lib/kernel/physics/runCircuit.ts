// api/_lib/kernel/physics/runCircuit.ts
// Entry RIÊNG runCircuit (phán quyết §15.6) — soi gương runPhysics: schema riêng, giải riêng, KHÔNG
// đụng run()/core. LLM chỉ DỊCH đề → plan; engine TÍNH đóng + TỰ KIỂM (K1..K4 + thay-đáp-ngược);
// sai mô hình → violations/errors, KHÔNG bịa đáp. Contract chung {ok, answers, violations, errors,
// checks, geometry, table, circuitLayout, meta}.
import { CircuitPlanSchema, type CircuitNode, type CircuitPlan } from './circuitSchema';
import { type Scalar, displayScalar } from '../scalar';
import { scalarFromNumber } from './kinematics';
import { solveCircuit, solveUnknown, containsUnknown, type Solved, type NodeVals } from './circuit';
import { computeCircuitQuery, mkAns, type CircuitAns } from './circuitCompute';
import { selfChecks, type Check } from './circuitKirchhoff';
import { buildLayout, type CircuitLayout } from './circuitLayout';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn 2–3 chữ số có nghĩa (spec §9); LLM override qua asserts[].tol

type NumPair = { text: string; approx: number };
type TableRow = {
  name: string;
  kind: 'resistor' | 'lamp' | 'unknown_resistor' | 'group_series' | 'group_parallel' | 'external';
  R: Omit<CircuitAns, 'verdict'>; U: Omit<CircuitAns, 'verdict'>;
  I: Omit<CircuitAns, 'verdict'>; P: Omit<CircuitAns, 'verdict'>;
};
export type CircuitResult = {
  ok: boolean;
  answers: CircuitAns[];
  checks: Check[];
  violations: { assert: string; expected: number; got: number; delta: number }[];
  errors: { message: string }[];
  geometry: { name: string; points: unknown[]; lines: unknown[]; tags: string[] } | null;
  table: TableRow[];
  circuitLayout: CircuitLayout;
  meta: { iMain: NumPair; uExternal: NumPair; rTotal: NumPair; unitsNote: 'SI' };
};

const pair = (s: Scalar): NumPair => ({ text: displayScalar(s), approx: s.approx });
const EMPTY_LAYOUT: CircuitLayout = { grid: { cols: 1, rows: 1 }, elements: [], junctions: [], wires: [] };
const ZERO_META = { iMain: { text: '0', approx: 0 }, uExternal: { text: '0', approx: 0 }, rTotal: { text: '0', approx: 0 }, unitsNote: 'SI' as const };

function findUnknown(node: CircuitNode): string | null {
  if (node.kind === 'unknown_resistor') return node.name;
  if (node.kind === 'series' || node.kind === 'parallel') {
    for (const it of node.items) { const f = findUnknown(it); if (f) return f; }
  }
  return null;
}

// Bảng §7.3 answer-hóa: mỗi lá/khối-có-tên + hàng mạch ngoài → {R,U,I,P} dạng answer.
function buildTable(solved: Solved): TableRow[] {
  const rows: TableRow[] = [];
  const rowFrom = (name: string, v: NodeVals, kind: TableRow['kind']): TableRow => ({
    name, kind,
    R: mkAns('resistance', v.R, v.Rn, 'Ω'),
    U: mkAns('voltage', v.U, v.Un, 'V'),
    I: mkAns('current', v.I, v.In, 'A'),
    P: mkAns('power', v.P, v.Pn, 'W'),
  });
  for (const [name, node] of solved.byName) rows.push(rowFrom(name, solved.vals.get(node) as NodeVals, (solved.vals.get(node) as NodeVals).kind));
  rows.push(rowFrom('_ngoai', solved.vals.get(solved.root) as NodeVals, 'external')); // hàng mạch ngoài
  return rows;
}

export function runCircuit(raw: unknown): CircuitResult {
  const parsed = CircuitPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}` : 'schema';
    return {
      ok: false, answers: [], checks: [], violations: [], errors: [{ message: `Invalid circuit plan: ${detail}` }],
      geometry: null, table: [], circuitLayout: EMPTY_LAYOUT, meta: ZERO_META,
    };
  }
  const plan: CircuitPlan = parsed.data;
  const errors: CircuitResult['errors'] = [];
  const layout = buildLayout(plan); // chỉ cần cây + số liệu đề — luôn dựng được (kể cả trước khi giải)
  const geometry = { name: plan.problemName, points: [], lines: [], tags: ['physics', 'circuit'] };

  // 1) Giải mạch — thế nghiệm trước nếu là bài nghịch (§7.5).
  const unknownName = findUnknown(plan.circuit);
  let solved: Solved;
  let backsub: { targetI: Scalar; targetIN: number } | undefined;
  try {
    if (unknownName) {
      const sq = plan.queries.find((q) => q.kind === 'solve_resistance'); // superRefine bảo đảm đúng 1
      if (!sq || sq.kind !== 'solve_resistance') throw new Error('thiếu query solve_resistance cho ẩn');
      const targetN = sq.targetCurrent * (sq.targetCurrentUnit === 'mA' ? 1e-3 : 1);
      const res = solveUnknown(plan.source, plan.circuit, unknownName, targetN);
      if (res.ok === false) {
        // Nghiệm âm / suy biến / dòng quá lớn ⇒ error, KHÔNG serve (§7.5).
        return { ok: false, answers: [], checks: [], violations: [], errors: [{ message: res.message }], geometry, table: [], circuitLayout: layout, meta: ZERO_META };
      }
      solved = solveCircuit(plan.source, plan.circuit, { name: unknownName, R: res.x, Rn: res.xN });
      backsub = { targetI: scalarFromNumber(targetN), targetIN: targetN };
    } else {
      solved = solveCircuit(plan.source, plan.circuit);
    }
  } catch (e) {
    return { ok: false, answers: [], checks: [], violations: [], errors: [{ message: (e as Error).message }], geometry, table: [], circuitLayout: layout, meta: ZERO_META };
  }

  // 2) Queries — công thức đóng (solve_resistance đọc x đã thế từ bảng).
  const answers: CircuitAns[] = [];
  for (const [qi, q] of plan.queries.entries()) {
    const r = computeCircuitQuery(solved, q);
    if (r.ok === false) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
    answers.push({ ...r.answer, queryIndex: qi });
  }

  // 3) Tự kiểm K1..K4 + thay-đáp-ngược; fail (bug engine/tràn) ⇒ errors + ok:false, KHÔNG serve sai.
  const hasEfficiency = plan.queries.some((q) => q.kind === 'efficiency') || plan.asserts.some((a) => a.query.kind === 'efficiency');
  const checks: Check[] = selfChecks(solved, { efficiency: hasEfficiency, backsub });
  // Assumption đèn (§15.1): ghi vào checks (pass:true, không lật ok).
  if (solved.lampInfo.size > 0) checks.push({ kind: 'assumption', detail: 'R đèn coi như không đổi (R = U_đm²/P_đm)', residual: 0, pass: true });
  for (const c of checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });

  // 4) Asserts khai báo (dữ kiện DƯ) — lệch quá tol ⇒ violations (mô hình dịch sai đề).
  const violations: CircuitResult['violations'] = [];
  for (const a of plan.asserts) {
    const r = computeCircuitQuery(solved, a.query);
    if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
    const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta });
  }

  const table = buildTable(solved);
  const meta = { iMain: pair(solved.iMain), uExternal: pair(solved.uExternal), rTotal: pair(solved.rTotal), unitsNote: 'SI' as const };
  const ok = violations.length === 0 && errors.length === 0
    && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));
  return { ok, answers, checks, violations, errors, geometry, table, circuitLayout: layout, meta };
}
