// api/_lib/kernel/chem/organicSchema.ts
// Schema 4 op HÓA HỮU CƠ tầng 1 (spec §8): organic_unknown / combustion / measure /
// ester_hydrolysis + OrganicQueries, nối vào ChemPlanSchema v0 (DIFF §12).
//
// QUYẾT ĐỊNH TỰ QUYẾT (cycle-safety): spec DIFF 1(a) muốn organicSchema IMPORT `Qty` +
// `AmountSchema` từ planSchema. NHƯNG planSchema cũng phải import 4 op ở đây ⇒ VÒNG LẶP
// module. Vì cả hai dùng export của nhau NGAY LÚC EVAL (zod z.object/z.union đọc giá trị
// ngay), vòng lặp này gây TDZ ReferenceError ("Cannot access 'Qty' before initialization")
// khi nạp planSchema. ⇒ organicSchema TỰ CHỨA `Qty`/`AmountSchema` (logic Y HỆT v0), phụ
// thuộc một chiều planSchema→organicSchema. planSchema VẪN export Qty+AmountSchema (DIFF 1a)
// cho bề mặt công khai. Hành vi parse hoàn toàn khớp v0 (cùng parseDecimal + chặn ≤ 0).
import { z } from 'zod';
import { R0, cmpR, parseDecimal } from './rat';

// Qty — bản sao cách-ly-vòng của planSchema.Qty (F22): parseDecimal + chặn ≤ 0.
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

// AmountSchema — bản sao cách-ly-vòng của planSchema.AmountSchema (dùng cho ester amounts).
const AmountSchema = z.union([
  z.object({ grams: Qty }),
  z.object({ mol: Qty }),
  z.object({ liters_gas: Qty }),
  z.object({ solution: z.object({ molarity: Qty, liters: Qty }) }),
  z.object({ solution_percent: z.object({ massGrams: Qty, percent: Qty }) }),
  z.object({ excess: z.literal(true) }),
]);

// Sản phẩm đốt: HẸP hơn AmountSchema — chỉ grams|mol|liters_gas (KHÔNG solution/excess).
const ProductAmount = z.union([
  z.object({ grams: Qty }),
  z.object({ mol: Qty }),
  z.object({ liters_gas: Qty }),
]);

export const ElementSet = z.enum(['C', 'H', 'O', 'N']);
export const OrganicClass = z.enum([
  'ankan', 'anken', 'ankin', 'ancol-no-don', 'axit-no-don', 'este-no-don', 'amin-no-don', 'none',
]);
export type OrganicClassT = z.infer<typeof OrganicClass>;

export const OrganicUnknownOp = z.object({
  op: z.literal('organic_unknown'),
  name: z.string().min(1),                 // 'A'
  sample: ProductAmount.optional(),        // khối lượng/mol mẫu đem đốt (route O qua m; M qua m/n)
  contains: z.array(ElementSet).optional(),// tập nguyên tố ĐỀ khẳng định (vd ['C','H','O']); vắng ⇒ suy
  class: OrganicClass.default('none'),      // gợi ý dãy đồng đẳng (ràng buộc k, O, N)
});

export const CombustionOp = z.object({
  op: z.literal('combustion'),
  of: z.string().min(1),                   // tên chất bị đốt (khớp organic_unknown.name)
  co2: ProductAmount.optional(),
  h2o: z.union([z.object({ grams: Qty }), z.object({ mol: Qty })]).optional(), // KHÔNG liters_gas (§15.1)
  n2: ProductAmount.optional(),
  o2: ProductAmount.optional(),            // O2 TIÊU THỤ (tùy chọn — route O (b) + tự kiểm khối lượng)
});

export const MeasureOp = z.object({
  op: z.literal('measure'),
  of: z.string().min(1),
  kind: z.enum(['vapor_density', 'molar_mass']),
  ref: z.union([z.literal('H2'), z.literal('air'), z.string()]).optional(), // so H2/kk/khí khác
  value: Qty,                              // d hoặc M — SỐ ĐO đề cho
  tol: Qty.optional(),                     // F10: có tol ⇒ dữ kiện làm tròn (tol tương đối); vắng ⇒ exact
});

export const EsterHydrolysisOp = z.object({
  op: z.literal('ester_hydrolysis'),
  ester: z.string().min(1),                // 'CH3COOC2H5' — công thức cô đặc (đọc, KHÔNG tính)
  alcohol: z.string().min(1),              // 'C2H5OH' — nửa ancol tách ra R′OH
  acid: z.string().min(1).optional(),      // H2: nửa axit RCOOH — bật GUARD ĐỘC LẬP este hóa (§15.7b)
  base: z.literal('NaOH').default('NaOH'), // v1 chỉ NaOH
  esterAmount: AmountSchema.optional(),
  baseAmount: AmountSchema.optional(),
});

// Query hữu cơ (spread vào ChemQuerySchema v0).
export const OrganicQueries = [
  z.object({ kind: z.literal('molecular_formula'), of: z.string() }),
  z.object({ kind: z.literal('empirical_formula'), of: z.string() }),
  z.object({ kind: z.literal('degree_unsaturation'), of: z.string() }),
  z.object({ kind: z.literal('oxygen_needed'), of: z.string(), as: z.enum(['mol', 'liters_gas']).default('mol') }),
] as const;

export type OrganicUnknownOpT = z.infer<typeof OrganicUnknownOp>;
export type CombustionOpT = z.infer<typeof CombustionOp>;
export type MeasureOpT = z.infer<typeof MeasureOp>;
export type EsterHydrolysisOpT = z.infer<typeof EsterHydrolysisOp>;

// Tên op hữu cơ (runChem dùng để dispatch sớm — DIFF 2a).
export const ORGANIC_OP_NAMES = new Set(['organic_unknown', 'combustion', 'measure', 'ester_hydrolysis']);

// ── Registry tag hữu cơ (§13) ────────────────────────────────────────────────
// QUYẾT ĐỊNH TỰ QUYẾT: spec §12/§13 trỏ `taxonomy/tags.ts` (P0). File đó CHƯA tồn tại và
// reactionDB.ts ghi rõ dựng nó "KHÔNG làm trong đợt vá này" (P0 tích hợp). Để tag hữu cơ
// KHÔNG bị `isKnownTag` drop lặng lẽ khi P0 wire, ta ĐĂNG KÝ TẬP TRUNG chúng ngay trong
// pack chem (nguồn sự thật để P0 seed registry), kèm test membership + format 4 tầng.
export const ORGANIC_TAGS = [
  'hoa/11/dai-cuong-huu-co/lap-cong-thuc-phan-tu',
  'hoa/11/hidrocacbon/ankan',
  'hoa/11/hidrocacbon/anken',
  'hoa/11/hidrocacbon/ankin',
  'hoa/11/ancol/dot-chay-tim-ctpt',
  'hoa/11/axit-cacboxylic/dot-chay',
  'hoa/12/este-lipit/dot-chay-este',
  'hoa/12/este-lipit/thuy-phan-este',
  'hoa/12/amin/dot-chay-tim-ctpt',
] as const;

// Regex tag 4 tầng (spec §13; đồng bộ reactionDB F14).
export const TAG_4TIER = /^[a-z0-9-]+(\/[a-z0-9-]+){3}$/;
