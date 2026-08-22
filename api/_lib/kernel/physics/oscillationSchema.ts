// api/_lib/kernel/physics/oscillationSchema.ts
// OscillationPlanSchema (zod) — chép spec §4 (physics-pack v1 dao động, đã áp phán quyết đợt 2).
// KIẾN TRÚC: plan RIÊNG + entry runOscillation RIÊNG — soi gương dynamics/circuit (mỗi chương một
// schema + một run), KHÔNG merge vào planSchema v0 (kinematics). Nhờ tách plan, lệnh "cấm trộn op
// dao động với động học" (OS-4) THÀNH HIỂN NHIÊN: một plan hoặc là dao động, hoặc là động học.
// TRIẾT LÝ: LLM chỉ DỊCH đề → khai A, ω/T/f, pha, con lắc; ENGINE tính. Không field nào nhận đáp tính hộ
// (kể cả đổi sin→cos, L→A, x₀v₀→A,φ). Sai mô hình ⇒ violations/errors, KHÔNG bịa đáp.
import { z } from 'zod';
import { PiRat, type PiRatInput } from './piScalar';

const Num = z.number().finite();
const Obj = z.string().min(1);
const VUnit = z.enum(['cm/s', 'm/s']);
const AUnit = z.enum(['cm/s2', 'm/s2']);

// PiRat > 0 SAU quy đổi (OS-2): số trần > 0; {n,d,pi} ⇒ n > 0 (d đã int dương). T=0/f=0 làm divExact
// THROW xuyên pipeline; ω âm cho T/f/vmax âm mà hệ thức v²+ω²x²=ω²A² vẫn pass (bình phương nuốt dấu).
function piRatPositive(pr: PiRatInput): boolean {
  return typeof pr === 'number' ? pr > 0 : pr.n > 0;
}

// ── Op oscillator (§4) ─────────────────────────────────────────────────────────
export const OscillatorOp = z
  .object({
    op: z.literal('oscillator'),
    name: Obj,
    // NGUỒN TỐC ĐỘ GÓC (0..n; ≥2 ⇒ nguồn ưu tiên tính, còn lại thành auto-assert §5.2)
    omega: PiRat.optional(), // rad/s
    T: PiRat.optional(), // s
    f: PiRat.optional(), // Hz
    count: z.object({ n: z.number().int().positive(), dt: PiRat }).optional(), // "n dao động trong dt giây"
    spring: z.object({ k: Num.positive() }).optional(), // N/m — rate khi có mass; energy khi chỉ có k
    pendulum: z
      .object({
        l: Num.positive(),
        lUnit: z.enum(['m', 'cm']).default('m'),
        g: Num.positive().optional(), // 9.8 / 10 THEO ĐỀ
        gAsPiSquared: z.boolean().default(false), // "g = π²" hoặc "g = 10, lấy π² = 10" ⇒ true (§5.4)
      })
      .optional(),
    mass: Num.positive().optional(), // cho ω=√(k/m) và W=½mω²A²
    massUnit: z.enum(['kg', 'g']).default('kg'),
    // NGUỒN BIÊN ĐỘ (0..n; ưu tiên + auto-assert; đơn vị units.length)
    A: Num.positive().optional(),
    L: Num.positive().optional(), // chiều dài quỹ đạo = 2A
    pathPerPeriod: Num.positive().optional(), // quãng đường 1 chu kỳ = 4A
    vmaxGiven: z.object({ v: Num.positive(), unit: VUnit.optional() }).optional(), // A = vmax/ω
    fromState: z.object({ x: Num, v: Num, unit: VUnit.optional() }).optional(), // A²=x²+v²/ω²
    initial: z.object({ x0: Num, v0: Num.default(0), unit: VUnit.optional() }).optional(), // t=0 → A VÀ φ (§5.3)
    // PHA
    phi: PiRat.optional(), // rad
    form: z.enum(['cos', 'sin']).default('cos'), // "x=A·sin(ωt+φₛ)" ⇒ form:'sin'; ENGINE đổi φ:=φₛ−π/2
  })
  .superRefine((op, ctx) => {
    const issue = (message: string): void => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    // OS-2: nguồn rate phải > 0 sau quy đổi.
    if (op.omega !== undefined && !piRatPositive(op.omega)) issue(`tần số góc ω của "${op.name}" phải dương`);
    if (op.T !== undefined && !piRatPositive(op.T)) issue(`chu kỳ T của "${op.name}" phải dương`);
    if (op.f !== undefined && !piRatPositive(op.f)) issue(`tần số f của "${op.name}" phải dương`);
    if (op.count !== undefined && !piRatPositive(op.count.dt)) issue(`khoảng thời gian đếm dao động của "${op.name}" phải dương`);
    // pendulum: g XOR gAsPiSquared.
    if (op.pendulum) {
      const hasG = op.pendulum.g !== undefined;
      if (hasG && op.pendulum.gAsPiSquared) issue(`con lắc "${op.name}": khai g HOẶC gAsPiSquared, không cả hai`);
      if (!hasG && !op.pendulum.gAsPiSquared) issue(`con lắc "${op.name}": thiếu g (số) hoặc gAsPiSquared:true`);
    }
    // OS-5: initial x0=0 và v0=0 ⇒ A=0, vật không dao động — từ chối sớm.
    if (op.initial && op.initial.x0 === 0 && (op.initial.v0 ?? 0) === 0) {
      issue(`vật "${op.name}" không dao động (initial x₀ = v₀ = 0 ⇒ A = 0)`);
    }
  });

// ── Queries (§4) — 17 kind ───────────────────────────────────────────────────────
export const OscQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('x_at'), of: Obj, t: PiRat, label: z.string().optional() }),
  z.object({ kind: z.literal('v_at'), of: Obj, t: PiRat, unit: VUnit.optional(), label: z.string().optional() }), // ĐẠI SỐ, có dấu
  z.object({ kind: z.literal('a_at'), of: Obj, t: PiRat, unit: AUnit.optional(), label: z.string().optional() }), // ĐẠI SỐ
  z.object({ kind: z.literal('amplitude'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('omega'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('period'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('frequency'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('initial_phase'), of: Obj, label: z.string().optional() }), // chuẩn hóa (−π, π]
  z.object({ kind: z.literal('vmax'), of: Obj, unit: VUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('amax'), of: Obj, unit: AUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('speed_at_x'), of: Obj, x: Num, unit: VUnit.optional(), label: z.string().optional() }), // |v|
  z.object({ kind: z.literal('x_at_speed'), of: Obj, v: Num.min(0), vUnit: VUnit.optional(), label: z.string().optional() }), // |x|; v ≥ 0 (OS-6: v=0 hợp lệ ⇒ |x|=A)
  z.object({ kind: z.literal('energy_total'), of: Obj, label: z.string().optional() }), // J
  z.object({ kind: z.literal('energy_kinetic_at'), of: Obj, at: z.union([z.object({ x: Num }), z.object({ t: PiRat })]), label: z.string().optional() }),
  z.object({ kind: z.literal('energy_potential_at'), of: Obj, at: z.union([z.object({ x: Num }), z.object({ t: PiRat })]), label: z.string().optional() }),
  z.object({ kind: z.literal('x_where_energy_ratio'), of: Obj, ratio: Num.positive(), label: z.string().optional() }), // Wđ = ratio·Wt → |x|
  z.object({
    kind: z.literal('first_time_at_x'),
    of: Obj,
    x: Num,
    direction: z.enum(['positive', 'negative', 'any']).default('any'),
    label: z.string().optional(),
  }),
]);

// ── Plan wrapper (khung units/asserts/charts/scene giống v0/dynamics) ─────────────
export const OscillationPlanSchema = z
  .object({
    problemName: z.string().min(1).default('dao-dong'),
    // units.time = 's' (OS: chu kỳ tính giờ ngoài đề phổ thông); units.length ∈ {'m','cm'} (đề VN hầu hết cm).
    units: z
      .object({ length: z.enum(['cm', 'm']).default('cm'), time: z.literal('s').default('s') })
      .default({}),
    ops: z.array(OscillatorOp).min(1),
    queries: z.array(OscQuerySchema).min(1),
    asserts: z.array(z.object({ query: OscQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
    charts: z.array(z.object({ kind: z.enum(['x_t', 'v_t']), of: z.array(Obj).min(1) })).default([]),
    scene: z
      .object({ durationSec: Num.positive().optional(), labels: z.record(z.string(), z.string()).optional() })
      .default({}),
  })
  .superRefine((plan, ctx) => {
    const issue = (message: string): void => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const names = new Set<string>();
    for (const op of plan.ops) {
      if (names.has(op.name)) issue(`vật "${op.name}" khai báo 2 lần`);
      names.add(op.name);
    }
    // Mọi 'of' của query phải trỏ op tồn tại (OS-6 nhánh dispatch xử tiếp khi trỏ nhầm LOẠI, nhưng ở đây
    // một plan chỉ có op oscillator nên chỉ cần kiểm tồn tại).
    for (const q of plan.queries) {
      if ('of' in q && q.of !== undefined && !names.has(q.of)) issue(`query ${q.kind} trỏ vật "${q.of}" không tồn tại`);
    }
  });

export type OscillationPlan = z.infer<typeof OscillationPlanSchema>;
export type OscQuery = z.infer<typeof OscQuerySchema>;
export type OscillatorOpT = z.infer<typeof OscillatorOp>;
