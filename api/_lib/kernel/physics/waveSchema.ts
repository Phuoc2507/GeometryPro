// api/_lib/kernel/physics/waveSchema.ts
// WavePlanSchema (zod) — spec §5 (physics-pack v1 SÓNG CƠ & SÓNG ÂM). PACK RIÊNG HOÀN TOÀN ADDITIVE:
// định nghĩa WavePlanSchema + WaveOpSchema RIÊNG (soi OscillationPlanSchema), KHÔNG merge vào planSchema
// v0. Union op CHỈ có {wave, sound_source} ⇒ "cấm trộn op chương khác" TỰ TAN (finding W1). LLM chỉ DỊCH
// đề → khai dữ kiện literal (omega=20π, spaceCoeff=π/12, intensity={n,exp}); ENGINE suy MỌI thứ (chống R1).
import { z } from 'zod';
// PiRat + toPiScalar TÁI DÙNG NGUYÊN từ piScalar.ts (finding W2 — KHÔNG phải './oscSchema' vốn không tồn tại).
import { PiRat, type PiRatInput } from './piScalar';

const Num = z.number().finite();
const Obj = z.string().min(1);

const LenUnit = z.enum(['m', 'cm']);
const SpeedUnit = z.enum(['m/s', 'cm/s']);

// Sci — SỐ KHOA HỌC EXACT: giá trị = n·10^exp ÷ d. 10⁻¹² (I₀) có 12 chữ số lẻ, VƯỢT trần ≤9 của
// scalarFromNumber (rơi float, phá exact) ⇒ khai lũy thừa 10 tường minh, engine dựng hữu tỉ bằng BIGINT.
const Sci = z.union([
  Num,
  z.object({ n: Num, d: z.number().int().positive().default(1), exp: z.number().int().default(0) }),
]);
export type SciInput = z.infer<typeof Sci>;

// PiRat > 0 SAU quy đổi (OS-2): số trần > 0; {n,d,pi} ⇒ n > 0 (d đã int dương). spaceCoeff/omega = 0
// làm divP THROW xuyên pipeline ⇒ chặn sớm ở refine.
function piRatPositive(pr: PiRatInput): boolean {
  return typeof pr === 'number' ? pr > 0 : pr.n > 0;
}

// ── OP 1: WAVE — sóng cơ/âm truyền một chiều ──
export const WaveOp = z
  .object({
    op: z.literal('wave'),
    name: Obj,
    A: Num.positive().optional(), // biên độ (units.length)
    // NGUỒN TẦN SỐ (f/T π-tự-do; omega mang π khi đề cho pt "…cos(20πt−…)")
    f: Num.positive().optional(),
    T: Num.positive().optional(),
    omega: PiRat.optional(),
    // NGUỒN BƯỚC SÓNG / TỐC ĐỘ
    lambda: Num.positive().optional(),
    speed: Num.positive().optional(),
    speedUnit: SpeedUnit.optional(),
    spaceCoeff: PiRat.optional(), // HỆ SỐ KHÔNG GIAN của pt = 2π/λ (vd πx/12 → {n:1,d:12,pi:true})
    // PHA & CHIỀU
    phi: PiRat.optional(),
    direction: z.enum(['+x', '-x']).default('+x'), // pt u=Acos(ωt − 2πx/λ + φ) ⇒ '+x'; dấu '+' số hạng x ⇒ '-x'
  });
// GHI CHÚ (tự quyết): op giữ ZodObject THUẦN (KHÔNG .superRefine) — z.discriminatedUnion CHỈ nhận ZodObject,
// KHÔNG nhận ZodEffects (soi dynamicsSchema: BodyOp/ForceOp/StringOp thuần). Ràng buộc ω/spaceCoeff > 0 &
// "đúng một nguồn âm" ⇒ chuyển xuống WavePlanSchema.superRefine dưới đây.

// ── OP 2: SOUND_SOURCE — nguồn âm (điểm hoặc cường độ cho trực tiếp) ──
export const SoundSourceOp = z
  .object({
    op: z.literal('sound_source'),
    name: Obj,
    I0: Sci.default({ n: 1, exp: -12 }), // cường độ âm chuẩn (W/m²) — mặc định 10⁻¹²
    power: Sci.optional(), // công suất P (W) ⇒ nguồn điểm đẳng hướng, I(r) = P/(4πr²)
    intensity: z.object({ I: Sci, atDistance: Num.positive().optional(), rUnit: LenUnit.optional() }).optional(),
    level: z.object({ L: Num, atDistance: Num.positive().optional(), rUnit: LenUnit.optional() }).optional(),
  });

export const WaveQuerySchema = z.discriminatedUnion('kind', [
  // — đại lượng sóng —
  z.object({ kind: z.literal('speed'), of: Obj, unit: SpeedUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('wavelength'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('frequency'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('period'), of: Obj, label: z.string().optional() }),
  // — phương trình sóng —
  z.object({ kind: z.literal('displacement_at'), of: Obj, x: Num, t: PiRat, label: z.string().optional() }),
  // — độ lệch pha (d ≥ 0, units.length) —
  z.object({ kind: z.literal('phase_difference'), of: Obj, d: Num.nonnegative(), label: z.string().optional() }),
  // — giao thoa 2 nguồn cùng pha —
  z.object({ kind: z.literal('interference_count'), of: Obj, separation: Num.positive(), kind2: z.enum(['max', 'min']), label: z.string().optional() }),
  z.object({ kind: z.literal('interference_point'), of: Obj, d1: Num.nonnegative(), d2: Num.nonnegative(), label: z.string().optional() }),
  // — sóng dừng (boundary: hai đầu cố định | một đầu tự do) —
  z.object({ kind: z.literal('standing_antinodes'), of: Obj, length: Num.positive(), boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'), loops: z.number().int().positive().optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('standing_nodes'), of: Obj, length: Num.positive(), boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'), loops: z.number().int().positive().optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('standing_wavelength'), of: Obj, length: Num.positive(), boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'), loops: z.number().int().positive(), label: z.string().optional() }),
  z.object({ kind: z.literal('standing_frequency'), of: Obj, length: Num.positive(), boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'), loops: z.number().int().positive(), label: z.string().optional() }),
  z.object({ kind: z.literal('standing_min_frequency'), of: Obj, length: Num.positive(), boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'), label: z.string().optional() }),
  // — sóng âm —
  z.object({ kind: z.literal('sound_intensity'), of: Obj, atDistance: Num.positive().optional(), rUnit: LenUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('sound_level'), of: Obj, atDistance: Num.positive().optional(), rUnit: LenUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('sound_level_difference'), of: Obj, fromDistance: Num.positive(), toDistance: Num.positive(), rUnit: LenUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('distance_for_level'), of: Obj, level: Num, rUnit: LenUnit.optional(), label: z.string().optional() }),
]);

// ── OP UNION + PLAN RIÊNG (soi OscillationPlanSchema; finding W1) ──
export const WaveOpSchema = z.discriminatedUnion('op', [WaveOp, SoundSourceOp]); // CHỈ 2 op ⇒ "cấm trộn" tự tan

export const WavePlanSchema = z
  .object({
    problemName: z.string().min(1).default('song'),
    units: z.object({ length: LenUnit.default('m'), time: z.literal('s').default('s') }).default({}),
    ops: z.array(WaveOpSchema).min(1),
    queries: z.array(WaveQuerySchema).min(1),
    asserts: z.array(z.object({ query: WaveQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
    knowledgeTags: z.array(z.string()).default([]),
  })
  .superRefine((plan, ctx) => {
    const issue = (message: string): void => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const names = new Set<string>();
    for (const op of plan.ops) {
      if (names.has(op.name)) issue(`op "${op.name}" khai báo 2 lần`);
      names.add(op.name);
      // Ràng buộc per-op (dời từ op.superRefine — xem GHI CHÚ ở WaveOp): OS-2 chặn suy biến ở đây.
      if (op.op === 'wave') {
        if (op.omega !== undefined && !piRatPositive(op.omega)) issue(`tần số góc ω của "${op.name}" phải dương`);
        if (op.spaceCoeff !== undefined && !piRatPositive(op.spaceCoeff)) issue(`hệ số không gian (2π/λ) của "${op.name}" phải dương`);
      } else {
        const n = [op.power, op.intensity, op.level].filter((x) => x !== undefined).length;
        if (n !== 1) issue(`nguồn âm "${op.name}" cần ĐÚNG MỘT nguồn gốc {power | intensity | level} (đang có ${n})`);
      }
    }
    // Mọi 'of' của query phải trỏ op tồn tại (loại op đúng/sai xử ở normalize §6.2 OS-6).
    for (const q of plan.queries) {
      if ('of' in q && q.of !== undefined && !names.has(q.of)) issue(`query ${q.kind} trỏ op "${q.of}" không tồn tại`);
    }
  });

export type WavePlan = z.infer<typeof WavePlanSchema>;
export type WaveQuery = z.infer<typeof WaveQuerySchema>;
export type WaveOpT = z.infer<typeof WaveOp>;
export type SoundSourceOpT = z.infer<typeof SoundSourceOp>;
