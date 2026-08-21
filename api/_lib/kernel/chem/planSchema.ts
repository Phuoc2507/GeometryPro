// api/_lib/kernel/chem/planSchema.ts
// ChemPlanSchema (zod) — chép theo spec chem §10, đã áp review:
//   F10 — asserts đối chiếu dữ kiện ĐỀ có tol TƯƠNG ĐỐI (default 1e-3); bảo toàn nội bộ vẫn exact
//   F22 — Qty chặn ≤ 0 và chặn chuỗi phân cách nghìn kiểu "1.000" ngay tại schema
// v0 chấp nhận đúng MỘT op mix (0 mix ⇒ chỉ đổi đơn vị từng chất). v1 sẽ thêm trộn
// tuần tự (mix.of + nhiều mix) — thấy of/nhiều mix thì runChem trả lỗi "v1".
import { z } from 'zod';
import { R0, cmpR, parseDecimal } from './rat';

// "5,6" | 5.6 | 50 → parseDecimal (§4). Từ chối ngay tại schema nếu không đọc được
// hoặc ≤ 0 — mọi lượng đề cho trong Hóa THPT đều dương.
const Qty = z.union([z.number(), z.string()]).superRefine((v, ctx) => {
  try {
    const r = parseDecimal(v);
    if (cmpR(r, R0) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `lượng chất phải > 0 (nhận "${v}")` });
    }
  } catch (e) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: e instanceof Error ? e.message : String(e) });
  }
});

export const AmountSchema = z.union([
  z.object({ grams: Qty }),
  z.object({ mol: Qty }),
  z.object({ liters_gas: Qty }),
  z.object({ solution: z.object({ molarity: Qty, liters: Qty }) }),
  z.object({ solution_percent: z.object({ massGrams: Qty, percent: Qty }) }),
  z.object({ excess: z.literal(true) }),
]);

export const SpeciesOpSchema = z.object({
  op: z.literal('species'),
  formula: z.string().min(1),
  amount: AmountSchema.optional(), // bỏ trống = định tính (bài hỏi hiện tượng)
  // vắng ⇒ suy theo bảng luật F20 (kim loại/oxit → solid; muối tan + amount solution
  // → solution; muối không tan → solid; khí danh sách đóng → gas; mơ hồ → bắt khai).
  state: z.enum(['solid', 'solution', 'gas', 'liquid']).optional(),
  variant: z.enum(['loãng', 'đặc']).optional(), // cho H2SO4/HNO3; vắng ⇒ 'loãng'
});

export const MixOpSchema = z.object({
  op: z.literal('mix'),
  of: z.array(z.string()).optional(), // v0: PHẢI vắng mặt (trộn tất cả); v1: trộn tuần tự
  heated: z.boolean().default(false), // true ⇔ record cần 't°' được phép khớp
});

export const ChemQuerySchema = z.union([
  z.object({ kind: z.literal('mass'), of: z.string() }),
  z.object({ kind: z.literal('mol'), of: z.string() }),
  z.object({ kind: z.literal('volume_gas'), of: z.string() }),
  z.object({ kind: z.literal('concentration'), of: z.string(), as: z.enum(['CM', 'C%']) }),
  z.object({ kind: z.literal('remaining'), of: z.string() }), // chất dư còn lại (mol + gam)
  z.object({ kind: z.literal('phenomena') }),
  z.object({ kind: z.literal('equation') }),
]);

// tol: dung sai TƯƠNG ĐỐI khi đối chiếu dữ kiện đề (F10) — default 1e-3 tại runChem.
// THẤP-8: tol nhận CẢ number LẪN chuỗi ("0,001") như Qty (đề VN dùng dấu phẩy) — runChem
// parseDecimal đằng nào cũng nhận chuỗi; Qty chặn ≤ 0 sẵn nên tol luôn dương.
export const ChemAssertSchema = z.union([
  z.object({ kind: z.literal('given_mass'), of: z.string(), grams: Qty, tol: Qty.optional() }),
  z.object({ kind: z.literal('given_mol'), of: z.string(), mol: Qty, tol: Qty.optional() }),
]);

export const ChemPlanSchema = z.object({
  ops: z.array(z.union([SpeciesOpSchema, MixOpSchema])).min(1),
  // LLM đọc từ đề: "đktc" (0°C, 1 atm — chương trình cũ) → 22.4; "đkc" (25°C, 1 bar —
  // GDPT 2018) → 24.79. Default = 24,79 (chương trình hiện hành).
  molarVolume: z.union([z.literal(22.4), z.literal(24.79)]).default(24.79),
  queries: z.array(ChemQuerySchema).min(1),
  asserts: z.array(ChemAssertSchema).default([]),
});

export type ChemPlan = z.infer<typeof ChemPlanSchema>;
export type SpeciesOp = z.infer<typeof SpeciesOpSchema>;
export type MixOp = z.infer<typeof MixOpSchema>;
export type ChemQuery = z.infer<typeof ChemQuerySchema>;
export type ChemAssert = z.infer<typeof ChemAssertSchema>;
