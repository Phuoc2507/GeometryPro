// api/_lib/kernel/chem/reactionDB.ts
// Reaction DB ĐÓNG cho engine Hóa v0: 58 record (50 record spec §8.4 + 8 record review F18),
// dãy hoạt động hóa học, TẦNG ION đóng (review F9), bảng tính tan mini (§8.3) và các guard
// "điều kiện xảy ra" G1/G2/G4 + guard trao đổi — ĐÃ ÁP các finding phản biện phiên 1:
//   F1  — muối Fe³⁺ + kim loại: KHÔNG phán "không phản ứng" (Cu+FeCl3, Fe+FeCl3 là phản ứng thật)
//   F2  — {K, Na, Ca, Ba} + dd muối: error "phản ứng với nước trước", không dùng khuôn noReaction
//   F6  — trường domain máy-đọc (requireExcess/mustBeLimiting/maxRatio) cho R19/R23/R29/R39
//   F9  — từ điển IONS đóng + whitelist ion; luật riêng NH4⁺ + OH⁻ → NH3↑ + H2O (không có "kết tủa NH4OH")
//   F11 — sản phẩm trao đổi duy nhất ÍT TAN → null (không phán)
//   F12 — record nhiệt phân 1-chất chỉ khớp mix đúng 1 chất; ưu tiên record khớp trọn tập
//   F14 — tags theo taxonomy 4 tầng hoa/<lop>/<chuong>/<skill>
//   F17 — R29/R30 mang type riêng ('oxit-axit + bazơ' / 'oxit lưỡng tính + kiềm')
//   F19 — thụ động hóa (Al/Fe + axit đặc) CHỈ khi heated=false; đun nóng → ngoài phạm vi
//   F25 — bỏ 'đpnc' khỏi enum conditions (không record nào dùng)
//   §16 — R06 "khói màu vàng nâu"; NaAlO2; R38 giữ t°; R05 "khói màu nâu đỏ"
//
// TODO (VỪA-3 — chốt khi dựng taxonomy/tags.ts, thuộc P0 tích hợp, KHÔNG làm trong đợt vá này):
//   tags của DB dùng đúng FORMAT 4 tầng `hoa/<lop>/<chuong>/<skill>` (vd 'hoa/9/kim-loai/tac-dung-muoi').
//   Khi dựng taxonomy/tags.ts, seed REGISTRY PHẢI lấy nguồn sự thật từ CHÍNH tập tags dùng ở đây
//   (không seed 'hoa/9-10/...' lệch), để isKnownTag(tag)=true cho mọi tag của 58 record — nếu không
//   bridge lọc theo seed sẽ làm 58 record MẤT taxonomy lặng lẽ. Kèm test membership cross-module.

export type SpeciesState = 'solid' | 'gas' | 'solution' | 'liquid';
export type Variant = 'loãng' | 'đặc';

export type ReactionType =
  | 'hóa hợp'
  | 'phân hủy'
  | 'thế'
  | 'trao đổi'
  | 'oxi hóa – khử'
  | 'oxit-axit + bazơ'
  | 'oxit lưỡng tính + kiềm';

// Miền áp dụng máy-đọc (review F6) — stoich.ts enforce TRƯỚC khi trả đáp:
//   requireExcess:   các chất PHẢI được khai { excess: true } (vd R19: HNO3 dư)
//   mustBeLimiting:  chất phải HẾT TRƯỚC theo tỉ lệ hệ số — n(X)/coeff(X) ≤ n(R)/coeff(R) ∀R
//   maxRatio:        n(of) ≤ ratio × n(per) (dự phòng, tổng quát hơn mustBeLimiting)
//   reason:          lý do HÓA HỌC in kèm error "ngoài phạm vi v0"
export type ReactionDomain = {
  requireExcess?: string[];
  mustBeLimiting?: string[];
  maxRatio?: { of: string; per: string; ratio: number };
  reason: string;
};

export type ReactionRecord = {
  id: string;
  reactants: { formula: string; coeff: number; variant?: Variant }[];
  products: { formula: string; coeff: number; state: SpeciesState }[];
  conditions: ('t°' | 'xúc tác')[]; // F25: KHÔNG có 'đpnc'
  medium: 'dd' | 'khan'; // 'dd' → sản phẩm rắn hiển thị ↓, khí ↑; nền cho scene
  type: ReactionType;
  redox: boolean;
  phenomena: string[];
  tags: string[]; // F14: 4 tầng hoa/<lop>/<chuong>/<skill>
  domain?: ReactionDomain;
  note?: string;
};

const r = (formula: string, coeff: number, variant?: Variant) =>
  variant ? { formula, coeff, variant } : { formula, coeff };
const p = (formula: string, coeff: number, state: SpeciesState) => ({ formula, coeff, state });

export const REACTIONS: ReactionRecord[] = [
  // ── Nhóm A — Kim loại + phi kim (O2 / Cl2 / S) ─────────────────────────────
  {
    id: 'R01', reactants: [r('Fe', 3), r('O2', 2)], products: [p('Fe3O4', 1, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'hóa hợp', redox: true,
    phenomena: ['sắt cháy sáng, bắn tia lửa; tạo hạt rắn màu nâu đen (oxit sắt từ)'],
    tags: ['hoa/9/kim-loai/tac-dung-phi-kim'],
  },
  {
    id: 'R02', reactants: [r('Al', 4), r('O2', 3)], products: [p('Al2O3', 2, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'hóa hợp', redox: true,
    phenomena: ['cháy sáng chói; tạo chất rắn trắng'],
    tags: ['hoa/9/kim-loai/tac-dung-phi-kim'],
  },
  {
    id: 'R03', reactants: [r('Mg', 2), r('O2', 1)], products: [p('MgO', 2, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'hóa hợp', redox: true,
    phenomena: ['cháy sáng chói lóa; tạo khói trắng MgO'],
    tags: ['hoa/9/kim-loai/tac-dung-phi-kim'],
  },
  {
    id: 'R04', reactants: [r('Cu', 2), r('O2', 1)], products: [p('CuO', 2, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'hóa hợp', redox: true,
    phenomena: ['đồng đỏ chuyển thành lớp rắn màu đen'],
    tags: ['hoa/9/kim-loai/tac-dung-phi-kim'],
  },
  {
    id: 'R05', reactants: [r('Fe', 2), r('Cl2', 3)], products: [p('FeCl3', 2, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'hóa hợp', redox: true,
    phenomena: ['sắt cháy trong clo tạo khói màu nâu đỏ'], // §16.9: đúng nguyên văn SGK
    tags: ['hoa/9/kim-loai/tac-dung-phi-kim'],
  },
  {
    id: 'R06', reactants: [r('Cu', 1), r('Cl2', 1)], products: [p('CuCl2', 1, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'hóa hợp', redox: true,
    phenomena: ['đồng cháy tạo khói màu vàng nâu'], // §16.1: GIỮ "khói màu vàng nâu" (CuCl2 khan)
    tags: ['hoa/9/kim-loai/tac-dung-phi-kim'],
  },
  {
    id: 'R07', reactants: [r('Fe', 1), r('S', 1)], products: [p('FeS', 1, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'hóa hợp', redox: true,
    phenomena: ['hỗn hợp nóng đỏ lan truyền; tạo chất rắn màu xám đen'],
    tags: ['hoa/9/kim-loai/tac-dung-phi-kim'],
  },
  // ── Nhóm B — Kim loại kiềm/kiềm thổ + nước ─────────────────────────────────
  {
    id: 'R08', reactants: [r('Na', 2), r('H2O', 2)], products: [p('NaOH', 2, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['Na nóng chảy thành giọt tròn chạy trên mặt nước, sủi bọt khí, tỏa nhiệt'],
    tags: ['hoa/9/kim-loai/tac-dung-nuoc'],
  },
  {
    id: 'R09', reactants: [r('Ca', 1), r('H2O', 2)], products: [p('Ca(OH)2', 1, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['sủi bọt khí; dung dịch vẩn đục nhẹ (Ca(OH)2 ít tan)'], // §16.5: GIỮ nguyên văn
    tags: ['hoa/9/kim-loai/tac-dung-nuoc'],
  },
  {
    id: 'R10', reactants: [r('Ba', 1), r('H2O', 2)], products: [p('Ba(OH)2', 1, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['tan nhanh, sủi bọt khí mạnh, tỏa nhiệt'],
    tags: ['hoa/9/kim-loai/tac-dung-nuoc'],
  },
  // ── Nhóm C — Kim loại + axit loãng (guard G1) ──────────────────────────────
  {
    id: 'R11', reactants: [r('Mg', 1), r('HCl', 2)], products: [p('MgCl2', 1, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['kim loại tan nhanh, sủi bọt khí không màu'],
    tags: ['hoa/9/kim-loai/tac-dung-axit'],
  },
  {
    id: 'R12', reactants: [r('Al', 2), r('HCl', 6)], products: [p('AlCl3', 2, 'solution'), p('H2', 3, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['kim loại tan, sủi bọt khí không màu'],
    tags: ['hoa/9/kim-loai/tac-dung-axit'],
  },
  {
    id: 'R13', reactants: [r('Zn', 1), r('HCl', 2)], products: [p('ZnCl2', 1, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['viên kẽm tan dần, sủi bọt khí không màu'],
    tags: ['hoa/9/kim-loai/tac-dung-axit'],
  },
  {
    id: 'R14', reactants: [r('Fe', 1), r('HCl', 2)], products: [p('FeCl2', 1, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['sắt tan dần, sủi bọt khí; dung dịch lục rất nhạt (gần như không màu)'],
    tags: ['hoa/9/kim-loai/tac-dung-axit'],
  },
  {
    id: 'R15', reactants: [r('Fe', 1), r('H2SO4', 1, 'loãng')],
    products: [p('FeSO4', 1, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['sắt tan dần, sủi bọt khí; dung dịch lục rất nhạt (gần như không màu)'],
    tags: ['hoa/9/kim-loai/tac-dung-axit'],
  },
  {
    id: 'R16', reactants: [r('Al', 2), r('H2SO4', 3, 'loãng')], products: [p('Al2(SO4)3', 1, 'solution'), p('H2', 3, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['nhôm tan, sủi bọt khí không màu'],
    tags: ['hoa/9/kim-loai/tac-dung-axit'],
  },
  // ── Nhóm D — Kim loại + axit có tính oxi hóa mạnh (guard G4 thụ động hóa) ──
  {
    id: 'R17', reactants: [r('Cu', 1), r('H2SO4', 2, 'đặc')],
    products: [p('CuSO4', 1, 'solution'), p('SO2', 1, 'gas'), p('H2O', 2, 'liquid')],
    conditions: ['t°'], medium: 'dd', type: 'oxi hóa – khử', redox: true,
    phenomena: ['Cu tan, khí không màu mùi hắc; dung dịch chuyển xanh lam'],
    tags: ['hoa/12/dai-cuong-kim-loai/axit-oxi-hoa-manh'],
  },
  {
    id: 'R18', reactants: [r('Cu', 3), r('HNO3', 8, 'loãng')],
    products: [p('Cu(NO3)2', 3, 'solution'), p('NO', 2, 'gas'), p('H2O', 4, 'liquid')],
    conditions: [], medium: 'dd', type: 'oxi hóa – khử', redox: true,
    phenomena: ['Cu tan, khí không màu hóa nâu trong không khí; dung dịch xanh lam'],
    tags: ['hoa/12/dai-cuong-kim-loai/axit-oxi-hoa-manh'],
  },
  {
    id: 'R19', reactants: [r('Fe', 1), r('HNO3', 4, 'loãng')],
    products: [p('Fe(NO3)3', 1, 'solution'), p('NO', 1, 'gas'), p('H2O', 2, 'liquid')],
    conditions: [], medium: 'dd', type: 'oxi hóa – khử', redox: true,
    phenomena: ['sắt tan, khí không màu hóa nâu; dung dịch vàng nâu nhạt'],
    tags: ['hoa/12/dai-cuong-kim-loai/axit-oxi-hoa-manh'],
    // F5: chỉ đúng khi HNO3 DƯ (Fe dư sẽ kéo Fe³⁺ về Fe²⁺: Fe + 2Fe(NO3)3 → 3Fe(NO3)2)
    domain: {
      requireExcess: ['HNO3'],
      reason: 'phương trình Fe + 4HNO3 → Fe(NO3)3 + NO + 2H2O chỉ đúng khi HNO3 DƯ; nếu HNO3 hữu hạn, Fe dư sẽ khử Fe³⁺ về Fe²⁺ (Fe + 2Fe(NO3)3 → 3Fe(NO3)2) — v0 không mô hình hóa',
    },
  },
  // ── Nhóm E — Kim loại + dung dịch muối (guard G2) ──────────────────────────
  {
    id: 'R20', reactants: [r('Fe', 1), r('CuSO4', 1)], products: [p('FeSO4', 1, 'solution'), p('Cu', 1, 'solid')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['lớp đồng đỏ bám lên sắt; màu xanh lam của dung dịch nhạt dần'],
    tags: ['hoa/9/kim-loai/tac-dung-muoi'],
  },
  {
    id: 'R21', reactants: [r('Zn', 1), r('CuSO4', 1)], products: [p('ZnSO4', 1, 'solution'), p('Cu', 1, 'solid')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['lớp đồng đỏ bám lên kẽm; màu xanh lam nhạt dần'],
    tags: ['hoa/9/kim-loai/tac-dung-muoi'],
  },
  {
    id: 'R22', reactants: [r('Cu', 1), r('AgNO3', 2)], products: [p('Cu(NO3)2', 1, 'solution'), p('Ag', 2, 'solid')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['lớp bạc trắng xám bám lên đồng; dung dịch chuyển dần sang xanh lam'],
    tags: ['hoa/9/kim-loai/tac-dung-muoi'],
  },
  {
    id: 'R23', reactants: [r('Fe', 1), r('AgNO3', 2)], products: [p('Fe(NO3)2', 1, 'solution'), p('Ag', 2, 'solid')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['bạc trắng xám bám lên sắt'],
    tags: ['hoa/9/kim-loai/tac-dung-muoi'],
    // F3 (§16.3): AgNO3 dư sẽ oxi hóa tiếp Fe²⁺ → Fe³⁺ — bắt buộc AgNO3 là chất HẾT TRƯỚC
    domain: {
      mustBeLimiting: ['AgNO3'],
      reason: 'khi AgNO3 dư (n(AgNO3) > 2n(Fe)), Ag⁺ dư oxi hóa tiếp Fe²⁺ thành Fe³⁺ (Fe(NO3)2 + AgNO3 → Fe(NO3)3 + Ag) — v0 không mô hình hóa ca dư',
    },
    note: 'AgNO3 dư sẽ oxi hóa tiếp Fe²⁺ → Fe³⁺, v0 KHÔNG mô hình hóa ca dư',
  },
  // ── Nhóm F — Oxit ──────────────────────────────────────────────────────────
  {
    id: 'R24', reactants: [r('CaO', 1), r('H2O', 1)], products: [p('Ca(OH)2', 1, 'solid')],
    conditions: [], medium: 'khan', type: 'hóa hợp', redox: false,
    phenomena: ['tỏa nhiệt mạnh (tôi vôi), chất rắn nhão ra'],
    tags: ['hoa/9/oxit/tac-dung-nuoc'],
  },
  {
    id: 'R25', reactants: [r('Na2O', 1), r('H2O', 1)], products: [p('NaOH', 2, 'solution')],
    conditions: [], medium: 'dd', type: 'hóa hợp', redox: false,
    phenomena: ['tan hết, tỏa nhiệt'],
    tags: ['hoa/9/oxit/tac-dung-nuoc'],
  },
  {
    id: 'R26', reactants: [r('SO3', 1), r('H2O', 1)], products: [p('H2SO4', 1, 'solution')],
    conditions: [], medium: 'dd', type: 'hóa hợp', redox: false,
    phenomena: ['tỏa nhiệt'],
    tags: ['hoa/9/oxit/tac-dung-nuoc'],
  },
  {
    id: 'R27', reactants: [r('CuO', 1), r('HCl', 2)], products: [p('CuCl2', 1, 'solution'), p('H2O', 1, 'liquid')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['bột đen tan, tạo dung dịch màu xanh lam'], // §16.2: dd CuCl2 CHỐT "xanh lam"
    tags: ['hoa/9/oxit/tac-dung-axit'],
  },
  {
    id: 'R28', reactants: [r('Fe2O3', 1), r('HCl', 6)], products: [p('FeCl3', 2, 'solution'), p('H2O', 3, 'liquid')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['bột đỏ nâu tan, tạo dung dịch vàng nâu'],
    tags: ['hoa/9/oxit/tac-dung-axit'],
  },
  {
    id: 'R29', reactants: [r('CO2', 1), r('Ca(OH)2', 1)], products: [p('CaCO3', 1, 'solid'), p('H2O', 1, 'liquid')],
    conditions: [], medium: 'dd', type: 'oxit-axit + bazơ', redox: false, // F17
    phenomena: ['nước vôi trong vẩn đục (kết tủa trắng)'],
    tags: ['hoa/9/oxit/oxit-axit-tac-dung-bazo'],
    // F4: CO2 dư hòa tan kết tủa (CaCO3 + CO2 + H2O → Ca(HCO3)2) — bắt buộc CO2 hết trước
    domain: {
      mustBeLimiting: ['CO2'],
      reason: 'khi CO2 dư (n(CO2) > n(Ca(OH)2)), kết tủa bị hòa tan một phần tạo Ca(HCO3)2 — v0 không mô hình hóa bài toán hai muối',
    },
  },
  {
    id: 'R30', reactants: [r('Al2O3', 1), r('NaOH', 2)], products: [p('NaAlO2', 2, 'solution'), p('H2O', 1, 'liquid')],
    conditions: [], medium: 'dd', type: 'oxit lưỡng tính + kiềm', redox: false, // F17; §16.6: CHỐT NaAlO2
    phenomena: ['chất rắn trắng tan trong kiềm (oxit lưỡng tính)'],
    tags: ['hoa/9/oxit/oxit-luong-tinh'],
  },
  // ── Nhóm G — Axit + bazơ (trung hòa) ───────────────────────────────────────
  {
    id: 'R31', reactants: [r('NaOH', 1), r('HCl', 1)], products: [p('NaCl', 1, 'solution'), p('H2O', 1, 'liquid')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['không hiện tượng nhìn thấy; tỏa nhiệt nhẹ (quỳ/phenolphtalein đổi màu nếu có)'],
    tags: ['hoa/9/axit-bazo-muoi/trung-hoa'],
  },
  {
    id: 'R32', reactants: [r('NaOH', 2), r('H2SO4', 1, 'loãng')], products: [p('Na2SO4', 1, 'solution'), p('H2O', 2, 'liquid')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['không hiện tượng nhìn thấy; tỏa nhiệt nhẹ (quỳ/phenolphtalein đổi màu nếu có)'],
    tags: ['hoa/9/axit-bazo-muoi/trung-hoa'],
  },
  {
    id: 'R33', reactants: [r('Cu(OH)2', 1), r('HCl', 2)], products: [p('CuCl2', 1, 'solution'), p('H2O', 2, 'liquid')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa xanh lam tan, tạo dung dịch xanh lam'],
    tags: ['hoa/9/axit-bazo-muoi/trung-hoa'],
  },
  {
    id: 'R34', reactants: [r('Ba(OH)2', 1), r('H2SO4', 1, 'loãng')], products: [p('BaSO4', 1, 'solid'), p('H2O', 2, 'liquid')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng (không tan trong axit dư)'],
    tags: ['hoa/9/axit-bazo-muoi/trung-hoa'],
  },
  // ── Nhóm H — Muối + bazơ / muối + axit / muối + muối ──────────────────────
  {
    id: 'R35', reactants: [r('CuSO4', 1), r('NaOH', 2)], products: [p('Cu(OH)2', 1, 'solid'), p('Na2SO4', 1, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa xanh lam'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo'],
  },
  {
    id: 'R36', reactants: [r('FeCl3', 1), r('NaOH', 3)], products: [p('Fe(OH)3', 1, 'solid'), p('NaCl', 3, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa nâu đỏ'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo'],
  },
  {
    id: 'R37', reactants: [r('FeCl2', 1), r('NaOH', 2)], products: [p('Fe(OH)2', 1, 'solid'), p('NaCl', 2, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng xanh, hóa nâu đỏ dần trong không khí'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo'],
    note: 'hóa nâu = 4Fe(OH)2 + O2 + 2H2O → 4Fe(OH)3, chỉ ghi hiện tượng, không thành record',
  },
  {
    id: 'R38', reactants: [r('NH4Cl', 1), r('NaOH', 1)],
    products: [p('NaCl', 1, 'solution'), p('NH3', 1, 'gas'), p('H2O', 1, 'liquid')],
    conditions: ['t°'], medium: 'dd', type: 'trao đổi', redox: false, // §16.7: GIỮ t°
    phenomena: ['khí mùi khai bay lên, làm xanh quỳ tím ẩm'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo'],
  },
  {
    id: 'R39', reactants: [r('Na2CO3', 1), r('HCl', 2)],
    products: [p('NaCl', 2, 'solution'), p('H2O', 1, 'liquid'), p('CO2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['sủi bọt khí không màu, làm đục nước vôi'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-axit'],
    // F7: dạng "nhỏ từ từ axit thiếu" đi qua trung gian NaHCO3 — bắt buộc HCl đủ/dư
    domain: {
      mustBeLimiting: ['Na2CO3'],
      reason: 'khi HCl thiếu (n(HCl) < 2n(Na2CO3)), phản ứng dừng ở trung gian NaHCO3 (Na2CO3 + HCl → NaHCO3 + NaCl), lượng CO2 thoát ra ít hơn — v0 không mô hình hóa nhỏ từ từ',
    },
  },
  {
    id: 'R40', reactants: [r('CaCO3', 1), r('HCl', 2)],
    products: [p('CaCl2', 1, 'solution'), p('H2O', 1, 'liquid'), p('CO2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['đá vôi tan, sủi bọt khí không màu'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-axit'],
  },
  {
    id: 'R41', reactants: [r('AgNO3', 1), r('NaCl', 1)], products: [p('AgCl', 1, 'solid'), p('NaNO3', 1, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng, hóa đen dần ngoài ánh sáng'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-muoi'],
  },
  {
    id: 'R42', reactants: [r('BaCl2', 1), r('Na2SO4', 1)], products: [p('BaSO4', 1, 'solid'), p('NaCl', 2, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng, không tan trong axit'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-muoi'],
  },
  // ── Nhóm I — Nhiệt phân (guard G3: cần t°; F12: chỉ khớp mix đúng 1 chất) ──
  {
    id: 'R43', reactants: [r('CaCO3', 1)], products: [p('CaO', 1, 'solid'), p('CO2', 1, 'gas')],
    conditions: ['t°'], medium: 'khan', type: 'phân hủy', redox: false,
    phenomena: ['chất rắn trắng còn lại xốp hơn; khí thoát làm đục nước vôi'],
    tags: ['hoa/9/phan-ung/nhiet-phan'],
  },
  {
    id: 'R44', reactants: [r('KMnO4', 2)],
    products: [p('K2MnO4', 1, 'solid'), p('MnO2', 1, 'solid'), p('O2', 1, 'gas')],
    conditions: ['t°'], medium: 'khan', type: 'phân hủy', redox: true,
    phenomena: ['tinh thể tím rã ra, thu khí O2 (làm bùng tàn đóm đỏ)'],
    tags: ['hoa/9/phan-ung/nhiet-phan', 'hoa/8/oxi-khong-khi/dieu-che-oxi'],
  },
  {
    id: 'R45', reactants: [r('Cu(OH)2', 1)], products: [p('CuO', 1, 'solid'), p('H2O', 1, 'gas')],
    conditions: ['t°'], medium: 'khan', type: 'phân hủy', redox: false,
    phenomena: ['kết tủa xanh lam chuyển thành chất rắn đen'],
    tags: ['hoa/9/phan-ung/nhiet-phan'],
  },
  {
    id: 'R46', reactants: [r('Fe(OH)3', 2)], products: [p('Fe2O3', 1, 'solid'), p('H2O', 3, 'gas')],
    conditions: ['t°'], medium: 'khan', type: 'phân hủy', redox: false,
    phenomena: ['chất rắn nâu đỏ → bột đỏ nâu'],
    tags: ['hoa/9/phan-ung/nhiet-phan'],
  },
  {
    id: 'R47', reactants: [r('NaHCO3', 2)],
    products: [p('Na2CO3', 1, 'solid'), p('H2O', 1, 'gas'), p('CO2', 1, 'gas')],
    conditions: ['t°'], medium: 'khan', type: 'phân hủy', redox: false,
    phenomena: ['khí thoát làm đục nước vôi'],
    tags: ['hoa/9/phan-ung/nhiet-phan'],
  },
  // ── Nhóm K — Khử oxit kim loại / nhiệt nhôm ────────────────────────────────
  {
    id: 'R48', reactants: [r('CuO', 1), r('H2', 1)], products: [p('Cu', 1, 'solid'), p('H2O', 1, 'gas')],
    conditions: ['t°'], medium: 'khan', type: 'oxi hóa – khử', redox: true,
    phenomena: ['bột đen chuyển đỏ (Cu); hơi nước ngưng trên thành ống'],
    tags: ['hoa/9/kim-loai/dieu-che-kim-loai'],
  },
  {
    id: 'R49', reactants: [r('Fe2O3', 1), r('CO', 3)], products: [p('Fe', 2, 'solid'), p('CO2', 3, 'gas')],
    conditions: ['t°'], medium: 'khan', type: 'oxi hóa – khử', redox: true,
    phenomena: ['bột đỏ nâu chuyển xám (Fe); khí ra làm đục nước vôi'],
    tags: ['hoa/9/kim-loai/dieu-che-kim-loai'],
  },
  {
    id: 'R50', reactants: [r('Al', 2), r('Fe2O3', 1)], products: [p('Al2O3', 1, 'solid'), p('Fe', 2, 'solid')],
    conditions: ['t°'], medium: 'khan', type: 'oxi hóa – khử', redox: true,
    phenomena: ['phản ứng cháy sáng chói, tỏa nhiệt mạnh; thu sắt nóng chảy (nhiệt nhôm)'],
    tags: ['hoa/9/kim-loai/dieu-che-kim-loai'],
  },
  // ── R51–R58 — 8 phản ứng canon bổ sung theo review F18 (không mang rủi ro miền) ──
  {
    id: 'R51', reactants: [r('K', 2), r('H2O', 2)], products: [p('KOH', 2, 'solution'), p('H2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['kali nóng chảy thành giọt tròn chạy trên mặt nước, sủi bọt khí mạnh, tỏa nhiệt (khí thoát có thể tự bốc cháy)'],
    tags: ['hoa/9/kim-loai/tac-dung-nuoc'],
  },
  {
    id: 'R52', reactants: [r('Mg', 1), r('CuSO4', 1)], products: [p('MgSO4', 1, 'solution'), p('Cu', 1, 'solid')],
    conditions: [], medium: 'dd', type: 'thế', redox: true,
    phenomena: ['lớp đồng đỏ bám lên magie; màu xanh lam của dung dịch nhạt dần'],
    tags: ['hoa/9/kim-loai/tac-dung-muoi'],
  },
  {
    id: 'R53', reactants: [r('BaCl2', 1), r('H2SO4', 1, 'loãng')], products: [p('BaSO4', 1, 'solid'), p('HCl', 2, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng (BaSO4), không tan trong axit dư'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-axit'],
  },
  {
    id: 'R54', reactants: [r('AgNO3', 1), r('HCl', 1)], products: [p('AgCl', 1, 'solid'), p('HNO3', 1, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng (AgCl), hóa đen dần ngoài ánh sáng'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-axit'],
  },
  {
    id: 'R55', reactants: [r('Ba(OH)2', 1), r('Na2SO4', 1)], products: [p('BaSO4', 1, 'solid'), p('NaOH', 2, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng (BaSO4)'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo'],
  },
  {
    id: 'R56', reactants: [r('NaHCO3', 1), r('HCl', 1)],
    products: [p('NaCl', 1, 'solution'), p('H2O', 1, 'liquid'), p('CO2', 1, 'gas')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['sủi bọt khí không màu, làm đục nước vôi trong'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-axit'],
  },
  {
    id: 'R57', reactants: [r('NaHCO3', 1), r('NaOH', 1)], products: [p('Na2CO3', 1, 'solution'), p('H2O', 1, 'liquid')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['không hiện tượng nhìn thấy (tạo Na2CO3 tan trong dung dịch)'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo'],
  },
  {
    id: 'R58', reactants: [r('Ca(OH)2', 1), r('Na2CO3', 1)], products: [p('CaCO3', 1, 'solid'), p('NaOH', 2, 'solution')],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['kết tủa trắng (CaCO3)'],
    tags: ['hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo'],
  },
];

// ── Dãy hoạt động hóa học (SGK) ──────────────────────────────────────────────
export const ACTIVITY_SERIES: string[] = [
  'K', 'Ba', 'Ca', 'Na', 'Mg', 'Al', 'Zn', 'Fe', 'Ni', 'Sn', 'Pb', 'H', 'Cu', 'Hg', 'Ag', 'Pt', 'Au',
];

export const METALS = new Set(ACTIVITY_SERIES.filter((s) => s !== 'H'));

// Nhóm kim loại gặp dung dịch thì phản ứng với NƯỚC trước (review F2).
export const WATER_FIRST_METALS = new Set(['K', 'Na', 'Ca', 'Ba']);

// ── TẦNG ION đóng (review F9) ────────────────────────────────────────────────
// Whitelist ion — NGOÀI danh sách này guard trao đổi KHÔNG dám phán (trả null).
export const CATION_WHITELIST = ['Na', 'K', 'NH4', 'Mg', 'Ca', 'Ba', 'Al', 'Zn', 'Fe2', 'Fe3', 'Cu', 'Ag', 'Pb', 'H'] as const;
export const ANION_WHITELIST = ['NO3', 'Cl', 'SO4', 'CO3', 'OH'] as const;
export type CationId = (typeof CATION_WHITELIST)[number];
export type AnionId = (typeof ANION_WHITELIST)[number];

// Từ điển ĐÓNG: mọi hợp chất ion (axit/bazơ/muối) mà cả hai ion đều thuộc whitelist.
// Fe²⁺/Fe³⁺ mã hóa 'Fe2'/'Fe3'. KHÔNG có NaHCO3 (HCO3⁻), KMnO4 (MnO4⁻), NaAlO2 (AlO2⁻)…
// — các chất đó nằm ngoài whitelist, guard trao đổi trả null (ngoài phạm vi).
export const IONS: Record<string, { cation: CationId; anion: AnionId }> = {
  // axit (cation H⁺)
  HCl: { cation: 'H', anion: 'Cl' },
  H2SO4: { cation: 'H', anion: 'SO4' },
  HNO3: { cation: 'H', anion: 'NO3' },
  // bazơ
  NaOH: { cation: 'Na', anion: 'OH' },
  KOH: { cation: 'K', anion: 'OH' },
  'Ca(OH)2': { cation: 'Ca', anion: 'OH' },
  'Ba(OH)2': { cation: 'Ba', anion: 'OH' },
  'Mg(OH)2': { cation: 'Mg', anion: 'OH' },
  'Al(OH)3': { cation: 'Al', anion: 'OH' },
  'Zn(OH)2': { cation: 'Zn', anion: 'OH' },
  'Fe(OH)2': { cation: 'Fe2', anion: 'OH' },
  'Fe(OH)3': { cation: 'Fe3', anion: 'OH' },
  'Cu(OH)2': { cation: 'Cu', anion: 'OH' },
  // muối clorua
  NaCl: { cation: 'Na', anion: 'Cl' },
  KCl: { cation: 'K', anion: 'Cl' },
  NH4Cl: { cation: 'NH4', anion: 'Cl' },
  MgCl2: { cation: 'Mg', anion: 'Cl' },
  CaCl2: { cation: 'Ca', anion: 'Cl' },
  BaCl2: { cation: 'Ba', anion: 'Cl' },
  AlCl3: { cation: 'Al', anion: 'Cl' },
  ZnCl2: { cation: 'Zn', anion: 'Cl' },
  FeCl2: { cation: 'Fe2', anion: 'Cl' },
  FeCl3: { cation: 'Fe3', anion: 'Cl' },
  CuCl2: { cation: 'Cu', anion: 'Cl' },
  AgCl: { cation: 'Ag', anion: 'Cl' },
  PbCl2: { cation: 'Pb', anion: 'Cl' },
  // muối sunfat
  Na2SO4: { cation: 'Na', anion: 'SO4' },
  K2SO4: { cation: 'K', anion: 'SO4' },
  '(NH4)2SO4': { cation: 'NH4', anion: 'SO4' },
  MgSO4: { cation: 'Mg', anion: 'SO4' },
  CaSO4: { cation: 'Ca', anion: 'SO4' },
  BaSO4: { cation: 'Ba', anion: 'SO4' },
  'Al2(SO4)3': { cation: 'Al', anion: 'SO4' },
  ZnSO4: { cation: 'Zn', anion: 'SO4' },
  FeSO4: { cation: 'Fe2', anion: 'SO4' },
  'Fe2(SO4)3': { cation: 'Fe3', anion: 'SO4' },
  CuSO4: { cation: 'Cu', anion: 'SO4' },
  Ag2SO4: { cation: 'Ag', anion: 'SO4' },
  PbSO4: { cation: 'Pb', anion: 'SO4' },
  // muối nitrat
  NaNO3: { cation: 'Na', anion: 'NO3' },
  KNO3: { cation: 'K', anion: 'NO3' },
  NH4NO3: { cation: 'NH4', anion: 'NO3' },
  'Mg(NO3)2': { cation: 'Mg', anion: 'NO3' },
  'Ca(NO3)2': { cation: 'Ca', anion: 'NO3' },
  'Ba(NO3)2': { cation: 'Ba', anion: 'NO3' },
  'Al(NO3)3': { cation: 'Al', anion: 'NO3' },
  'Zn(NO3)2': { cation: 'Zn', anion: 'NO3' },
  'Fe(NO3)2': { cation: 'Fe2', anion: 'NO3' },
  'Fe(NO3)3': { cation: 'Fe3', anion: 'NO3' },
  'Cu(NO3)2': { cation: 'Cu', anion: 'NO3' },
  AgNO3: { cation: 'Ag', anion: 'NO3' },
  'Pb(NO3)2': { cation: 'Pb', anion: 'NO3' },
  // muối cacbonat
  Na2CO3: { cation: 'Na', anion: 'CO3' },
  K2CO3: { cation: 'K', anion: 'CO3' },
  '(NH4)2CO3': { cation: 'NH4', anion: 'CO3' },
  MgCO3: { cation: 'Mg', anion: 'CO3' },
  CaCO3: { cation: 'Ca', anion: 'CO3' },
  BaCO3: { cation: 'Ba', anion: 'CO3' },
};

// Cation kim loại → nguyên tố (để so dãy hoạt động); 'Fe3' xử lý RIÊNG (F1).
const CATION_ELEMENT: Partial<Record<CationId, string>> = {
  Na: 'Na', K: 'K', Mg: 'Mg', Ca: 'Ca', Ba: 'Ba', Al: 'Al', Zn: 'Zn',
  Fe2: 'Fe', Fe3: 'Fe', Cu: 'Cu', Ag: 'Ag', Pb: 'Pb',
};

// ── Bảng tính tan mini (§8.3) ────────────────────────────────────────────────
export type Solubility = 'tan' | 'khong_tan' | 'it_tan';

export function solubilityOf(cation: CationId, anion: AnionId): Solubility {
  switch (anion) {
    case 'NO3':
      return 'tan';
    case 'Cl':
      if (cation === 'Ag') return 'khong_tan';
      if (cation === 'Pb') return 'it_tan';
      return 'tan';
    case 'SO4':
      if (cation === 'Ba' || cation === 'Pb') return 'khong_tan';
      if (cation === 'Ca' || cation === 'Ag') return 'it_tan';
      return 'tan';
    case 'CO3':
      if (cation === 'Na' || cation === 'K' || cation === 'NH4') return 'tan';
      return 'khong_tan'; // (cation H → khí CO2, xử lý riêng trong guard)
    case 'OH':
      if (cation === 'Na' || cation === 'K' || cation === 'Ba') return 'tan';
      if (cation === 'Ca') return 'it_tan';
      return 'khong_tan'; // (NH4 + OH → khí NH3, xử lý RIÊNG — không bao giờ là kết tủa)
  }
}

// ── findReactions — tra record theo tập chất + điều kiện (F12) ───────────────
export type SpeciesKey = { formula: string; variant?: Variant; state?: SpeciesState };

const VARIANT_ACIDS = new Set(['H2SO4', 'HNO3']);

function effectiveVariant(s: SpeciesKey): Variant | undefined {
  if (s.variant) return s.variant;
  return VARIANT_ACIDS.has(s.formula) ? 'loãng' : undefined; // thiếu variant coi là loãng
}

function reactantMatches(rr: ReactionRecord['reactants'][number], s: SpeciesKey): boolean {
  if (rr.formula !== s.formula) return false;
  if (!rr.variant) return true;
  return rr.variant === effectiveVariant(s);
}

function recordMatchesSpecies(record: ReactionRecord, species: SpeciesKey[]): boolean {
  // F12: record nhiệt phân 1-chất chỉ khớp khi mix có ĐÚNG 1 chất.
  if (record.reactants.length === 1 && species.length !== 1) return false;
  return record.reactants.every((rr) => species.some((s) => reactantMatches(rr, s)));
}

export function findMatches(
  species: SpeciesKey[],
  opts: { heated: boolean }
): { matches: ReactionRecord[]; heatMisses: ReactionRecord[] } {
  const bySpecies = REACTIONS.filter((rec) => recordMatchesSpecies(rec, species));
  let matches = bySpecies.filter((rec) => !rec.conditions.includes('t°') || opts.heated);
  const heatMisses = bySpecies.filter((rec) => rec.conditions.includes('t°') && !opts.heated);
  // F12: khi nhiều record cùng khớp, ưu tiên record phủ TRỌN tập chất đưa vào.
  if (matches.length > 1) {
    const formulas = new Set(species.map((s) => s.formula));
    const full = matches.filter(
      (rec) => rec.reactants.length === formulas.size && rec.reactants.every((rr) => formulas.has(rr.formula))
    );
    if (full.length >= 1) matches = full;
  }
  return { matches, heatMisses };
}

export function findReactions(species: SpeciesKey[], opts: { heated: boolean }): ReactionRecord[] {
  return findMatches(species, opts).matches;
}

// ── classifyNoMatch — guard "vì sao không có record" (G1/G2/G4 + trao đổi) ───
// Trả về:
//   { verdict: 'no_reaction', reason }  — engine BIẾT CHẮC không phản ứng (được trả lời)
//   { verdict: 'out_of_scope', reason } — CÓ THỂ có phản ứng nhưng ngoài DB v0 (error, không phán)
//   null                                 — không giải thích được → runChem trả "ngoài phạm vi DB v0"
export type NoMatchVerdict = { verdict: 'no_reaction' | 'out_of_scope'; reason: string };

export function classifyNoMatch(species: SpeciesKey[], opts: { heated: boolean }): NoMatchVerdict | null {
  const metals = species.filter((s) => METALS.has(s.formula));
  const ionic = species.filter((s) => IONS[s.formula]);
  const idx = (m: string) => ACTIVITY_SERIES.indexOf(m);

  // G4 (F19): thụ động hóa — Al/Fe + HNO3/H2SO4 ĐẶC, CHỈ khi KHÔNG đun nóng.
  const passiveMetal = metals.find((m) => m.formula === 'Al' || m.formula === 'Fe');
  const strongAcidDac = species.find(
    (s) => (s.formula === 'HNO3' || s.formula === 'H2SO4') && effectiveVariant(s) === 'đặc'
  );
  if (passiveMetal && strongAcidDac) {
    if (!opts.heated) {
      return {
        verdict: 'no_reaction',
        reason: `${passiveMetal.formula} bị thụ động hóa trong ${strongAcidDac.formula} đặc nguội (lớp oxit bền bảo vệ) — không phản ứng`,
      };
    }
    return {
      verdict: 'out_of_scope',
      reason: `${passiveMetal.formula} + ${strongAcidDac.formula} đặc nóng CÓ phản ứng (oxi hóa mạnh) nhưng ngoài phạm vi DB v0`,
    };
  }

  // Muối = hợp chất ion có cation ≠ H và anion ≠ OH.
  const salts = ionic.filter((s) => {
    const io = IONS[s.formula];
    return io.cation !== 'H' && io.anion !== 'OH';
  });

  // F2: {K, Na, Ca, Ba} + dd muối → phản ứng với NƯỚC trước — ngoài phạm vi v0.
  const waterFirst = metals.find((m) => WATER_FIRST_METALS.has(m.formula));
  if (waterFirst && salts.length > 0) {
    return {
      verdict: 'out_of_scope',
      reason: `${waterFirst.formula} là kim loại kiềm/kiềm thổ mạnh: cho vào dung dịch muối sẽ phản ứng với nước trước (tạo bazơ + H2), sau đó bazơ mới tác dụng với muối — ngoài phạm vi v0`,
    };
  }

  // G1: kim loại + HCl/H2SO4 loãng — chỉ kết luận khi kim loại đứng SAU H.
  // (HNO3 là axit oxi hóa mạnh, KHÔNG thuộc G1.)
  const nonOxAcid = species.find(
    (s) => s.formula === 'HCl' || (s.formula === 'H2SO4' && effectiveVariant(s) === 'loãng')
  );
  if (metals.length > 0 && nonOxAcid) {
    const after = metals.find((m) => idx(m.formula) > idx('H'));
    if (after) {
      return {
        verdict: 'no_reaction',
        reason: `${after.formula} đứng sau H trong dãy hoạt động hóa học nên không phản ứng với ${nonOxAcid.formula}${nonOxAcid.formula === 'H2SO4' ? ' loãng' : ''}`,
      };
    }
  }

  // G2 (đã sửa F1): kim loại + dung dịch muối.
  if (metals.length > 0 && salts.length > 0) {
    for (const metal of metals) {
      for (const salt of salts) {
        const io = IONS[salt.formula];
        // F1: cation Fe³⁺ KHÔNG ở hóa trị thấp nhất thông dụng — muối Fe³⁺ oxi hóa được
        // cả kim loại đứng sau (Cu + 2FeCl3 → CuCl2 + 2FeCl2; Fe + 2FeCl3 → 3FeCl2).
        if (io.cation === 'Fe3') {
          return {
            verdict: 'out_of_scope',
            reason: `muối Fe³⁺ (${salt.formula}) có thể oxi hóa kim loại (vd Cu + 2FeCl3 → CuCl2 + 2FeCl2) — phản ứng thật nhưng ngoài phạm vi DB v0`,
          };
        }
        const el = CATION_ELEMENT[io.cation];
        if (!el) continue; // cation NH4… → không phán
        if (idx(metal.formula) >= idx(el)) {
          // Kim loại KHÔNG đứng trước kim loại trong muối (cation hóa trị thấp nhất) ⇒ không đẩy được.
          // THẤP-7: khi TRÙNG kim loại (Fe + FeSO4, el===metal) câu "Fe đứng sau Fe" vô nghĩa →
          // diễn đạt "không đứng trước".
          return {
            verdict: 'no_reaction',
            reason: metal.formula === el
              ? `${metal.formula} không đứng trước ${el} trong dãy hoạt động hóa học (cùng một kim loại) — không tự đẩy mình ra khỏi dung dịch muối`
              : `${metal.formula} đứng sau ${el} trong dãy hoạt động hóa học — kim loại yếu hơn không đẩy được kim loại mạnh hơn ra khỏi dung dịch muối`,
          };
        }
        // Kim loại đứng trước nhưng DB không có record ⇒ phản ứng thật ngoài DB → null (generic).
        return null;
      }
    }
  }

  // Guard TRAO ĐỔI (chỉ với đúng 2 hợp chất ion, không kim loại đơn chất).
  if (metals.length === 0 && species.length === 2 && ionic.length === 2) {
    // CAO-2: nếu BẤT KỲ chất nào là axit ĐẶC (H2SO4/HNO3 đặc) thì đây có thể là phản ứng
    // đặc thù axit đặc + muối rắn (điều chế HCl/HNO3 dễ bay hơi — SGK 10), KHÔNG được kết luận
    // "không phản ứng". Trả null ⇒ runChem báo "ngoài phạm vi DB v0" (không mô hình hóa ở v0).
    if (species.some((s) => effectiveVariant(s) === 'đặc')) return null;
    const [a, b] = ionic.map((s) => IONS[s.formula]);
    let driver = false;
    let itTan = false;
    for (const [cation, anion] of [
      [a.cation, b.anion],
      [b.cation, a.anion],
    ] as [CationId, AnionId][]) {
      if (cation === 'H' && anion === 'OH') { driver = true; continue; } // tạo H2O
      if (cation === 'H' && anion === 'CO3') { driver = true; continue; } // tạo CO2↑
      // F9: NH4⁺ + OH⁻ → NH3↑ + H2O — là KHÍ, TUYỆT ĐỐI không tra bảng tan (không có "kết tủa NH4OH").
      if (cation === 'NH4' && anion === 'OH') { driver = true; continue; }
      const sol = solubilityOf(cation, anion);
      if (sol === 'khong_tan') driver = true;
      else if (sol === 'it_tan') itTan = true;
    }
    if (driver) return null; // có động lực (kết tủa/khí/nước) ⇒ phản ứng thật ngoài DB → generic out-of-scope
    if (itTan) return null; // F11: sản phẩm duy nhất ÍT TAN → không phán
    return {
      verdict: 'no_reaction',
      reason: 'phản ứng trao đổi không xảy ra: không tạo thành kết tủa, chất khí hay nước',
    };
  }

  return null;
}

// API phẳng theo plan Task 4: chỉ trả LÝ DO "không phản ứng" (hoặc null).
// Các verdict out_of_scope trả null — runChem sẽ đi đường "ngoài phạm vi".
export function explainNoReaction(species: SpeciesKey[]): string | null {
  const c = classifyNoMatch(species, { heated: false });
  return c && c.verdict === 'no_reaction' ? c.reason : null;
}
