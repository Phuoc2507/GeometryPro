// api/_lib/kernel/physics/efieldSchema.ts
// EFieldPlanSchema (zod) — chép nguyên spec §7. LLM CHỈ DỊCH đề → khai điện tích/điện trường + câu hỏi;
// KHÔNG có field nào nhận F/E/thành-phần đã tính hộ. superRefine = GATE tất định §7.3 (ép abstain cho
// cấu hình vector ngoài lớp exact-được). Import classify/qty từ ./efield (efield KHÔNG import schema ⇒ không vòng).
import { z } from 'zod';
import { classify, qtyLength, qtyCharge, type SrcXYQ } from './efield';

const Num = z.number().finite();
const Name = z.string().min(1).regex(/^[A-Za-z0-9_]+$/); // tên = id: không dấu/cách
const Pt = z.tuple([Num, Num]);

const ChargeUnit = z.enum(['C', 'mC', 'uC', 'nC', 'pC']); // uC = μC (ascii)
const LenUnit = z.enum(['m', 'cm', 'mm']);
const FieldUnit = z.enum(['V/m', 'N/C', 'V/cm']);
const VoltUnit = z.enum(['V', 'kV']);
const MassUnit = z.enum(['kg', 'g']);
const Charge = z.object({ value: Num, unit: ChargeUnit.default('C') }); // value MANG DẤU (âm = điện tích âm)
const Dist = z.object({ value: Num, unit: LenUnit.default('m') });

// ── Ops (thực thể) ────────────────────────────────────────────────────────────
const PointChargeOp = z.object({ op: z.literal('point_charge'), name: Name, q: Charge, at: Pt.default([0, 0]) });
const UniformFieldOp = z.object({
  op: z.literal('uniform_field'), name: Name,
  E: z.object({ value: Num.positive(), unit: FieldUnit.default('V/m') }).optional(),
  fromVoltage: z.object({ U: z.object({ value: Num.positive(), unit: VoltUnit.default('V') }), d: Dist }).optional(),
  direction: z.enum(['up', 'down', 'left', 'right', 'x', 'y']).default('x'),
});
const ChargedBodyOp = z.object({
  op: z.literal('charged_body'), name: Name, q: Charge,
  mass: z.object({ value: Num.positive(), unit: MassUnit.default('kg') }).optional(),
});
export const EFieldOpSchema = z.discriminatedUnion('op', [PointChargeOp, UniformFieldOp, ChargedBodyOp]);

// ── Queries ────────────────────────────────────────────────────────────────────
export const EFieldQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('coulomb_force'), a: Name, b: Name, label: z.string().optional() }),
  z.object({ kind: z.literal('field_at'), at: Pt, by: z.array(Name).optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('field_symmetric'), sources: z.array(Name).length(2), r: Dist, angleBetweenDeg: Num, label: z.string().optional() }),
  z.object({ kind: z.literal('force_on_test'), q: Charge, at: Pt, by: z.array(Name).optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('potential_at'), at: Pt, by: z.array(Name).optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('electric_force'), body: Name, field: Name, label: z.string().optional() }),
  z.object({ kind: z.literal('work'), body: Name, field: Name, d: Dist, label: z.string().optional() }),
  z.object({ kind: z.literal('voltage'), field: Name, d: Dist, label: z.string().optional() }),
  z.object({ kind: z.literal('potential_energy'), body: Name, U: z.object({ value: Num, unit: VoltUnit.default('V') }), label: z.string().optional() }),
  z.object({ kind: z.literal('equilibrium_field'), body: Name, g: Num.positive().default(10), label: z.string().optional() }),
  z.object({ kind: z.literal('acceleration'), body: Name, field: Name, label: z.string().optional() }),
  z.object({ kind: z.literal('speed_after'), body: Name, field: Name, d: Dist, label: z.string().optional() }),
]);

export const EFieldPlanSchema = z
  .object({
    problemName: z.string().min(1),
    units: z.object({ length: LenUnit.default('m') }).default({}),
    epsilon: Num.positive().default(1),
    ops: z.array(EFieldOpSchema).min(1),
    queries: z.array(EFieldQuerySchema).min(1),
    asserts: z.array(z.object({ query: EFieldQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
    knowledgeTags: z.array(z.string()).default([]),
  })
  .superRefine((plan, ctx) => {
    const add = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const lenU = plan.units.length;

    // (1) Tên duy nhất + bảng loại.
    const opKind = new Map<string, 'point_charge' | 'uniform_field' | 'charged_body'>();
    for (const op of plan.ops) {
      if (opKind.has(op.name)) add(`tên "${op.name}" trùng — mọi tên ops phải duy nhất`);
      opKind.set(op.name, op.op);
    }
    const pointOp = new Map<string, { at: [number, number]; q: { value: number; unit: string } }>();
    for (const op of plan.ops) if (op.op === 'point_charge') pointOp.set(op.name, { at: op.at as [number, number], q: op.q as { value: number; unit: string } });

    const isKind = (n: string, k: string, where: string): boolean => {
      if (!opKind.has(n)) { add(`${where}: tên "${n}" không tồn tại trong ops`); return false; }
      if (opKind.get(n) !== k) { add(`${where}: "${n}" phải là ${k}`); return false; }
      return true;
    };

    // (2) uniform_field: KHÔNG cả hai {E,fromVoltage}; thiếu cả hai chỉ hợp lệ nếu KHÔNG query nào đọc (E4).
    const readFields = new Set<string>();
    for (const q of plan.queries) {
      if (q.kind === 'electric_force' || q.kind === 'work' || q.kind === 'voltage' || q.kind === 'acceleration' || q.kind === 'speed_after') readFields.add(q.field);
    }
    for (const op of plan.ops) {
      if (op.op !== 'uniform_field') continue;
      const hasE = op.E !== undefined, hasV = op.fromVoltage !== undefined;
      if (hasE && hasV) add(`uniform_field "${op.name}": chỉ khai MỘT trong {E, fromVoltage}`);
      if (!hasE && !hasV && readFields.has(op.name)) add(`uniform_field "${op.name}": thiếu cả E lẫn fromVoltage nhưng có query đọc trường này`);
    }

    // (3) Ref + loại cho mọi query; (4) mass cho query động lực; (5) GATE chồng chất.
    const needMass = (n: string, where: string) => {
      if (isKind(n, 'charged_body', where)) {
        const op = plan.ops.find((o) => o.name === n);
        if (op && op.op === 'charged_body' && op.mass === undefined) add(`${where}: vật "${n}" cần khai mass`);
      }
    };
    const gateSuper = (at: [number, number], by: string[] | undefined, where: string) => {
      const names = by && by.length ? by : [...pointOp.keys()];
      for (const n of names) isKind(n, 'point_charge', where);
      const srcs = names.map((n) => pointOp.get(n)).filter((p): p is NonNullable<typeof p> => !!p);
      if (srcs.length < 2) return; // single ⇒ luôn exact
      const P = { x: qtyLength(at[0], lenU), y: qtyLength(at[1], lenU) };
      const xyq: SrcXYQ[] = srcs.map((s) => ({ x: qtyLength(s.at[0], lenU), y: qtyLength(s.at[1], lenU), q: qtyCharge(s.q.value, s.q.unit) }));
      if (classify(P, xyq) === 'none')
        add(`${where}: cấu hình chồng chất không thuộc lớp exact-được (chỉ hỗ trợ thẳng hàng, cặp đối xứng đẳng cự toạ-độ-hữu-tỉ, hoặc field_symmetric góc đẹp) — v1 abstain (§14.2)`);
    };

    for (const q of plan.queries.concat(plan.asserts.map((a) => a.query))) {
      switch (q.kind) {
        case 'coulomb_force': isKind(q.a, 'point_charge', 'coulomb_force.a'); isKind(q.b, 'point_charge', 'coulomb_force.b'); break;
        case 'field_at': gateSuper(q.at as [number, number], q.by, 'field_at'); break;
        case 'force_on_test': gateSuper(q.at as [number, number], q.by, 'force_on_test'); break;
        case 'potential_at': (q.by && q.by.length ? q.by : [...pointOp.keys()]).forEach((n) => isKind(n, 'point_charge', 'potential_at.by')); break;
        case 'field_symmetric': {
          const okA = isKind(q.sources[0], 'point_charge', 'field_symmetric.sources'), okB = isKind(q.sources[1], 'point_charge', 'field_symmetric.sources');
          if (okA && okB) {
            const A = pointOp.get(q.sources[0]), B = pointOp.get(q.sources[1]);
            if (A && B) {
              const qa = qtyCharge(A.q.value, A.q.unit).approx, qb = qtyCharge(B.q.value, B.q.unit).approx;
              if (Math.abs(Math.abs(qa) - Math.abs(qb)) > 1e-18) add('field_symmetric: |q_A| phải bằng |q_B| (đối xứng đẳng nguồn)');
            }
          }
          if (q.r.value <= 0) add('field_symmetric: r phải > 0');
          break;
        }
        case 'electric_force': isKind(q.body, 'charged_body', 'electric_force.body'); isKind(q.field, 'uniform_field', 'electric_force.field'); break;
        case 'work': isKind(q.body, 'charged_body', 'work.body'); isKind(q.field, 'uniform_field', 'work.field'); break;
        case 'voltage': isKind(q.field, 'uniform_field', 'voltage.field'); break;
        case 'potential_energy': isKind(q.body, 'charged_body', 'potential_energy.body'); break;
        case 'equilibrium_field': needMass(q.body, 'equilibrium_field.body'); break;
        case 'acceleration': needMass(q.body, 'acceleration.body'); isKind(q.field, 'uniform_field', 'acceleration.field'); break;
        case 'speed_after': needMass(q.body, 'speed_after.body'); isKind(q.field, 'uniform_field', 'speed_after.field'); break;
      }
    }
  });

export type EFieldPlan = z.infer<typeof EFieldPlanSchema>;
export type EFieldQuery = z.infer<typeof EFieldQuerySchema>;
export type EFieldOp = z.infer<typeof EFieldOpSchema>;
