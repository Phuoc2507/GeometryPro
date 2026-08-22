// api/_lib/kernel/physics/runGasHeat.ts
// Entry RIÊNG runGasHeat — soi gương runCircuit/runDynamics: schema riêng, giải riêng, KHÔNG đụng
// run()/core/index.ts. LLM chỉ DỊCH đề → plan; engine GIẢI công thức đóng (hữu tỉ EXACT) + TỰ KIỂM
// (thay-ngược num===0n + ràng buộc vật lí) + abstain/violation; mô hình sai → violations/errors,
// KHÔNG bịa đáp. try/catch lưới cuối — KHÔNG throw ra ngoài. D34-a: geometry CẮT HẲN v1 (null).
import { GasHeatPlanSchema, type GasHeatPlan } from './gasHeatSchema';
import { buildEntities, solveProcess, PHYSICAL_VIOLATIONS, type Check } from './gasHeat';
import { computeGasHeatQuery, type GHAns } from './gasHeatCompute';
import type { GeometryData } from '../../../../src/types/geometry';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn ("≈ 2,67 atm"); LLM override qua asserts[].tol

export type GasHeatResult = {
  ok: boolean;
  answers: GHAns[];
  checks: Check[];
  violations: { assert?: string; id?: string; message: string; expected?: number; got?: number; delta?: number }[];
  errors: { message: string }[];
  geometry: GeometryData | null; // D34-a: hai chương không có hình không gian ⇒ cắt hẳn, giữ chỗ tags ở meta
  meta: { atmInPa: number; unitsNote: 'SI'; knowledgeTags: string[] };
};

const fail = (messages: string[], atmInPa = 101325, tags: string[] = []): GasHeatResult => ({
  ok: false, answers: [], checks: [], violations: [], errors: messages.map((m) => ({ message: m })), geometry: null,
  meta: { atmInPa, unitsNote: 'SI', knowledgeTags: tags },
});

export function runGasHeat(raw: unknown): GasHeatResult {
  const parsed = GasHeatPlanSchema.safeParse(raw);
  if (!parsed.success) {
    // Surface MỌI issue (cổng abstain §6.3 — LLM đọc lý do rõ tiếng Việt).
    const msgs = parsed.error.issues.map((iss) => `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}`);
    return fail(msgs.length ? msgs.map((m) => `Kế hoạch không hợp lệ: ${m}`) : ['Kế hoạch không hợp lệ']);
  }
  const plan: GasHeatPlan = parsed.data;

  try {
    const ent = buildEntities(plan);
    const errors: GasHeatResult['errors'] = [...ent.errors];
    const checks: Check[] = [...ent.checks];
    const violations: GasHeatResult['violations'] = ent.violations.map((v) => ({ id: v.id, message: v.message }));

    // 1) Giải QUÁ TRÌNH (nếu có) — điền ẩn vào bản đồ trạng thái cho state_value đọc.
    if (ent.process) {
      const from = ent.states.get(ent.process.from);
      const to = ent.states.get(ent.process.to);
      if (!from || !to) errors.push({ message: `process trỏ trạng thái không tồn tại (${ent.process.from} → ${ent.process.to})` });
      else {
        try {
          const ps = solveProcess(from, to, ent.process.kind);
          checks.push(...ps.checks);
          for (const v of ps.violations) violations.push({ id: v.id, message: v.message });
          const target = ent.states.get(ps.ofState);
          if (target) target[ps.quantity] = ps.value;
        } catch (e) {
          errors.push({ message: `giải quá trình ${ent.process.kind}: ${(e as Error).message}` });
        }
      }
    }

    // 2) Queries — công thức đóng + tự kiểm; query lỗi ⇒ errors (không serve-sai).
    const answers: GHAns[] = [];
    for (const [qi, query] of plan.queries.entries()) {
      const r = computeGasHeatQuery(ent, query, qi);
      if (r.ok === false) { errors.push({ message: `query ${query.kind}: ${r.problem}` }); continue; }
      answers.push(r.answer);
      checks.push(...r.checks);
      for (const v of r.violations) violations.push({ id: v.id, message: v.message });
      for (const c of r.checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual})` });
    }

    // 3) Asserts khai báo (dữ kiện DƯ) — lệch quá tol ⇒ violations (mô hình dịch sai đề).
    for (const a of plan.asserts) {
      const r = computeGasHeatQuery(ent, a.query, -1);
      if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
      const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
      const delta = Math.abs(r.answer.approx - a.equals);
      if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta, message: `assert ${a.query.kind}: kỳ vọng ${a.equals}, engine tính ${r.answer.approx}` });
    }

    // Violation VẬT LÍ ⇒ KHÔNG serve đáp (§8 "không bịa đáp"). Assert-sai KHÔNG xoá đáp nhưng vẫn ok:false.
    const hasPhysical = violations.some((v) => v.id !== undefined && PHYSICAL_VIOLATIONS.has(v.id));
    const served = hasPhysical ? [] : answers;

    const ok = violations.length === 0 && errors.length === 0 && served.length === plan.queries.length && served.every((a) => Number.isFinite(a.approx));
    return { ok, answers: served, checks, violations, errors, geometry: null, meta: { atmInPa: plan.atmInPa, unitsNote: 'SI', knowledgeTags: plan.knowledgeTags } };
  } catch (e) {
    return fail([`Lỗi engine bất ngờ: ${(e as Error).message}`], plan.atmInPa, plan.knowledgeTags);
  }
}
