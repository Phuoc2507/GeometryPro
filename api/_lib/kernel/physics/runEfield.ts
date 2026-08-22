// api/_lib/kernel/physics/runEfield.ts
// Entry RIÊNG runEfield — soi gương runCircuit/runPhysics: schema riêng, giải riêng, KHÔNG đụng run()/core.
// LLM chỉ DỊCH đề → EFieldPlan; engine TÍNH đóng + TỰ KIỂM (certify + chứng chỉ đối xứng + thay-ngược);
// cấu hình ngoài lớp exact-được ⇒ schema reject (abstain); assert dữ-kiện-dư sai ⇒ violations, KHÔNG serve.
import { EFieldPlanSchema, type EFieldPlan } from './efieldSchema';
import { type Scalar, div } from '../scalar';
import { scalarFromNumber } from './kinematics';
import {
  K, qtyCharge, qtyChargeN, qtyLength, qtyLengthN, qtyField, qtyFieldN, qtyVolt, qtyVoltN, qtyMass, qtyMassN,
  type PointCharge, type UniformField, type ChargedBody,
} from './efield';
import { computeEFieldQuery, type Entities, type EFieldAns, type Check } from './efieldCompute';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn 2–3 chữ số có nghĩa (§9); LLM override qua asserts[].tol

export type EFieldResult = {
  ok: boolean;
  answers: EFieldAns[];
  checks: Check[];
  violations: { assert: string; expected: number; got: number; delta: number }[];
  errors: { message: string }[];
  geometry: null; // v1 CẮT HẲN (§10.1) — điểm/mũi tên vector → v1.1
  meta: { epsilon: number; units: { length: string }; knowledgeTags: string[] };
};

function buildEntities(plan: EFieldPlan): Entities {
  const lenU = plan.units.length;
  const points = new Map<string, PointCharge>();
  const fields = new Map<string, UniformField>();
  const bodies = new Map<string, ChargedBody>();
  for (const op of plan.ops) {
    if (op.op === 'point_charge') {
      points.set(op.name, {
        name: op.name,
        q: qtyCharge(op.q.value, op.q.unit), qN: qtyChargeN(op.q.value, op.q.unit),
        x: qtyLength(op.at[0], lenU), y: qtyLength(op.at[1], lenU),
        xN: qtyLengthN(op.at[0], lenU), yN: qtyLengthN(op.at[1], lenU),
      });
    } else if (op.op === 'uniform_field') {
      let E: Scalar | null = null, EN = NaN;
      if (op.E) { E = qtyField(op.E.value, op.E.unit); EN = qtyFieldN(op.E.value, op.E.unit); }
      else if (op.fromVoltage) {
        const U = qtyVolt(op.fromVoltage.U.value, op.fromVoltage.U.unit), d = qtyLength(op.fromVoltage.d.value, op.fromVoltage.d.unit);
        E = div(U, d); EN = qtyVoltN(op.fromVoltage.U.value, op.fromVoltage.U.unit) / qtyLengthN(op.fromVoltage.d.value, op.fromVoltage.d.unit);
      }
      fields.set(op.name, { name: op.name, E, EN, direction: op.direction });
    } else {
      bodies.set(op.name, {
        name: op.name,
        q: qtyCharge(op.q.value, op.q.unit), qN: qtyChargeN(op.q.value, op.q.unit),
        mass: op.mass ? qtyMass(op.mass.value, op.mass.unit) : null,
        massN: op.mass ? qtyMassN(op.mass.value, op.mass.unit) : NaN,
      });
    }
  }
  const epsilon = scalarFromNumber(plan.epsilon);
  return { points, fields, bodies, kEff: div(K, epsilon), kEffN: 9e9 / plan.epsilon, epsilon: plan.epsilon, lengthUnit: lenU };
}

export function runEfield(raw: unknown): EFieldResult {
  const parsed = EFieldPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}` : 'schema';
    return {
      ok: false, answers: [], checks: [], violations: [],
      errors: [{ message: `Invalid efield plan: ${detail}` }],
      geometry: null, meta: { epsilon: 1, units: { length: 'm' }, knowledgeTags: [] },
    };
  }
  const plan = parsed.data;
  const meta = { epsilon: plan.epsilon, units: { length: plan.units.length }, knowledgeTags: plan.knowledgeTags };
  const ent = buildEntities(plan);
  const answers: EFieldAns[] = [];
  const checks: Check[] = [];
  const errors: EFieldResult['errors'] = [];

  // Queries — công thức đóng + tự kiểm riêng-query (symmetry/backsub).
  for (const [qi, q] of plan.queries.entries()) {
    const r = computeEFieldQuery(ent, q);
    if (r.ok === false) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
    answers.push({ ...r.answer, queryIndex: qi });
    for (const c of r.checks) checks.push(c);
  }
  for (const c of checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });

  // Asserts (dữ kiện DƯ) — lệch quá tol ⇒ violations (mô hình dịch sai đề).
  const violations: EFieldResult['violations'] = [];
  for (const a of plan.asserts) {
    const r = computeEFieldQuery(ent, a.query);
    if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
    const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta });
  }

  const ok = violations.length === 0 && errors.length === 0 && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));
  return { ok, answers, checks, violations, errors, geometry: null, meta };
}
