// api/_lib/kernel/physics/acSchema.ts
// AcPlanSchema (zod) — chép nguyên spec §6 (physics pack v1 — DÒNG ĐIỆN XOAY CHIỀU RLC nối tiếp).
// LLM CHỈ DỊCH đề → nguồn + R/L/C + câu hỏi; KHÔNG có field nào nhận Z/I/cosφ/2πf/ωL/1/(ωC) đã tính hộ.
// Số dư của đề (số chỉ ampe kế/vôn kế, "công suất đo được"…) → asserts, KHÔNG được bỏ (§4 phòng tuyến máy).
// superRefine (§6.3) áp 2 finding VỪA của phản biện:
//   • VỪA-1: is_resonance / resonance_frequency / solve_resonance{f} ĐÒI CẢ L và C (chặn ÷0 khi khuyết C).
//   • (VỪA-2 ký tự minus xử ở tầng compute — acCompute.normalizeMinus → U+2212, khớp §11.)
import { z } from 'zod';
import { PiRat } from './piScalar'; // {n,d,pi} — osc §3.1 (export thực ở piScalar.ts)

const Num = z.number().finite();

// SurdRat — số dạng (n/d)·√rad. Cho R = 100√3 (góc đẹp π/6), U₀ = 200√2 (biên độ dạng √2).
// LLM CHÉP: "100√3" → {n:100, rad:3};  "200√2" → {n:200, rad:2};  "50" → 50.
export const SurdRat = z.union([
  Num,
  z.object({ n: Num, d: z.number().int().positive().default(1), rad: z.number().int().positive().default(1) }),
]);
export type SurdRatInput = z.infer<typeof SurdRat>;

// LCValue — L, C dạng (n/d)·10^exp·π^(overPi?−1:0). π ở MẪU ⇒ overPi:true (để π triệt tiêu §3.1).
// L = 1/π → {n:1, overPi:true};  C = 10⁻⁴/π → {n:1, exp:-4, overPi:true};
// C = 10⁻⁴/(2π) → {n:1, d:2, exp:-4, overPi:true};  L = 0,5 (thập phân thuần, nhánh C §3.3) → 0.5
export const LCValue = z.union([
  Num,
  z.object({
    n: Num,
    d: z.number().int().positive().default(1),
    exp: z.number().int().default(0),
    overPi: z.boolean().default(false),
  }),
]);
export type LCValueInput = z.infer<typeof LCValue>;

// ── Nguồn xoay chiều MỘT tần số ────────────────────────────────────────────────
export const AcSourceSchema = z.object({
  f: Num.positive().optional(), // Hz — đúng MỘT trong {f, omega}
  omega: PiRat.optional(), // rad/s — từ pt "cos(100πt)" → {n:100,pi:true}
  U: SurdRat.optional(), // hiệu dụng (V) — đúng MỘT trong {U, U0}
  U0: SurdRat.optional(), // cực đại (V) — "u = 200√2 cos…" → {n:200, rad:2}
  phiU: PiRat.optional(), // pha ban đầu φ_u của u (rad), default 0
});
export type AcSource = z.infer<typeof AcSourceSchema>;

// ── Queries (§6.2 / §3.6) ──────────────────────────────────────────────────────
export const AcQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('omega'), label: z.string().optional() }),
  // impedance: bỏ of = Z tổng; of='L' = Z_L; of='C' = Z_C
  z.object({ kind: z.literal('impedance'), of: z.enum(['L', 'C']).optional(), label: z.string().optional() }),
  // current: peak=false ⇒ I hiệu dụng; peak=true ⇒ I₀ = I√2
  z.object({ kind: z.literal('current'), peak: z.boolean().default(false), label: z.string().optional() }),
  // voltage: U_R/U_L/U_C hiệu dụng (peak ⇒ ×√2); of='source' = U (hoặc U₀) hai cực nguồn
  z.object({
    kind: z.literal('voltage'),
    of: z.enum(['R', 'L', 'C', 'source']),
    peak: z.boolean().default(false),
    label: z.string().optional(),
  }),
  z.object({ kind: z.literal('power'), label: z.string().optional() }), // P = I²R
  z.object({ kind: z.literal('power_factor'), label: z.string().optional() }), // cosφ = R/Z
  z.object({ kind: z.literal('phase_diff'), label: z.string().optional() }), // φ = φ_u − φ_i
  z.object({ kind: z.literal('resonance_frequency'), label: z.string().optional() }), // f₀ = 1/(2π√LC)
  z.object({ kind: z.literal('is_resonance'), label: z.string().optional() }), // ratio Z_L/Z_C + verdict
  z.object({ kind: z.literal('solve_resonance'), target: z.enum(['C', 'L', 'f']), label: z.string().optional() }),
  z.object({ kind: z.literal('write_current'), label: z.string().optional() }), // i = I₀cos(ωt+φ_i)
  z.object({ kind: z.literal('write_voltage'), of: z.enum(['R', 'L', 'C', 'source']), label: z.string().optional() }),
]);
export type AcQuery = z.infer<typeof AcQuerySchema>;

// ── Plan đầy đủ + superRefine (§6.3) ───────────────────────────────────────────
export const AcPlanSchema = z
  .object({
    problemName: z.string().min(1),
    source: AcSourceSchema,
    R: SurdRat.optional(), // Ω (khuyết ⇒ 0 — nhưng ≥1 phần tử)
    L: LCValue.optional(), // H
    C: LCValue.optional(), // F
    queries: z.array(AcQuerySchema).min(1),
    asserts: z
      .array(z.object({ query: AcQuerySchema, equals: Num, tol: Num.positive().optional() }))
      .default([]),
  })
  .superRefine((plan, ctx) => {
    const add = (message: string): void => ctx.addIssue({ code: z.ZodIssueCode.custom, message });

    // (1) TẦN SỐ: đúng MỘT trong {f, omega}.
    const hasF = plan.source.f !== undefined;
    const hasOmega = plan.source.omega !== undefined;
    if (hasF === hasOmega) add('nguồn phải khai đúng MỘT trong {f, omega} (tần số)');
    // ĐIỆN ÁP: đúng MỘT trong {U, U0}.
    const hasU = plan.source.U !== undefined;
    const hasU0 = plan.source.U0 !== undefined;
    if (hasU === hasU0) add('nguồn phải khai đúng MỘT trong {U, U0} (điện áp)');
    // U/U0 > 0 (SurdRat có thể là số hoặc object).
    const posSurd = (v: SurdRatInput | undefined, name: string): void => {
      if (v === undefined) return;
      const val = typeof v === 'number' ? v : (v.n / (v.d ?? 1)) * Math.sqrt(v.rad ?? 1);
      if (!(val > 0)) add(`${name} phải > 0`);
    };
    posSurd(plan.source.U, 'U');
    posSurd(plan.source.U0, 'U0');

    // (2) Ít nhất MỘT trong {R, L, C}.
    const hasR = plan.R !== undefined;
    const hasL = plan.L !== undefined;
    const hasC = plan.C !== undefined;
    if (!hasR && !hasL && !hasC) add('mạch phải có ít nhất một phần tử trong {R, L, C}');

    // (VỪA-1) Cộng hưởng đòi ĐỦ cả L và C — kể cả is_resonance (chặn ÷0 khi khuyết C, đối xứng hoá).
    const needsLC = plan.queries.some(
      (q) =>
        q.kind === 'resonance_frequency' ||
        q.kind === 'is_resonance' ||
        (q.kind === 'solve_resonance' && q.target === 'f'),
    );
    if (needsLC && !(hasL && hasC)) add('cần cả L và C để xét/tính cộng hưởng (is_resonance/resonance_frequency/solve f)');
    for (const q of plan.queries) {
      if (q.kind !== 'solve_resonance') continue;
      if (q.target === 'C' && !hasL) add('solve_resonance{target:C} cần biết L (và tần số) để tìm C cộng hưởng');
      if (q.target === 'L' && !hasC) add('solve_resonance{target:L} cần biết C (và tần số) để tìm L cộng hưởng');
    }

    // (3) voltage/write_voltage{of:'L'|'C'} đòi phần tử tương ứng.
    const needElem = (of: string, kind: string): void => {
      if (of === 'L' && !hasL) add(`${kind}{of:L} nhưng mạch không có phần tử L`);
      if (of === 'C' && !hasC) add(`${kind}{of:C} nhưng mạch không có phần tử C`);
    };
    for (const q of plan.queries) {
      if (q.kind === 'voltage' || q.kind === 'write_voltage') needElem(q.of, q.kind);
      if (q.kind === 'impedance' && q.of) needElem(q.of, q.kind);
    }
    for (const a of plan.asserts) {
      const q = a.query;
      if (q.kind === 'voltage' || q.kind === 'write_voltage') needElem(q.of, q.kind);
      if (q.kind === 'impedance' && q.of) needElem(q.of, q.kind);
    }
  });

export type AcPlan = z.infer<typeof AcPlanSchema>;
