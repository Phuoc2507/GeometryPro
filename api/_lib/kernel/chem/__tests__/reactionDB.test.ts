// Task 4 — Reaction DB 58 record + guard điều kiện (plan Task 4, đã áp review:
// F1/F2 (G2 viết lại), F6 (domain), F9 (tầng ion), F12 (matching), F14 (tags 4 tầng),
// F17 (type riêng R29/R30), F18 (+8 record R51–R58), F19 (thụ động hóa khi nguội), F25 (bỏ đpnc).
import { describe, it, expect } from 'vitest';
import {
  REACTIONS,
  ACTIVITY_SERIES,
  IONS,
  CATION_WHITELIST,
  ANION_WHITELIST,
  findReactions,
  explainNoReaction,
  classifyNoMatch,
} from '../reactionDB';
import { balance } from '../balance';
import { molarMass } from '../formula';
import { rat, addR, mulR, cmpR, ratToString } from '../rat';

describe('Reaction DB — tự kiểm bằng balancer (CHỐT AN TOÀN)', () => {
  it('đúng 58 record (50 spec + 8 review F18), id R01…R58 không trùng', () => {
    expect(REACTIONS).toHaveLength(58);
    expect(new Set(REACTIONS.map((r) => r.id)).size).toBe(58);
    for (let i = 1; i <= 58; i++) {
      const id = `R${String(i).padStart(2, '0')}`;
      expect(REACTIONS.some((r) => r.id === id), id).toBe(true);
    }
  });
  it('TỪNG record: balancer tái cân bằng phải ra ĐÚNG hệ số đã lưu', () => {
    for (const r of REACTIONS) {
      const b = balance(r.reactants.map((x) => x.formula), r.products.map((x) => x.formula));
      expect(b, r.id).toEqual({
        ok: true,
        coefficients: [...r.reactants.map((x) => x.coeff), ...r.products.map((x) => x.coeff)],
      });
    }
  });
  it('TỪNG record: bảo toàn khối lượng EXACT (Σ coeff·M hai vế bằng nhau, cmpR = 0)', () => {
    for (const rec of REACTIONS) {
      let lhs = rat(0n);
      for (const x of rec.reactants) lhs = addR(lhs, mulR(rat(BigInt(x.coeff)), molarMass(x.formula)));
      let rhs = rat(0n);
      for (const x of rec.products) rhs = addR(rhs, mulR(rat(BigInt(x.coeff)), molarMass(x.formula)));
      expect(cmpR(lhs, rhs), `${rec.id}: ${ratToString(lhs)} vs ${ratToString(rhs)}`).toBe(0);
    }
  });
  it('mỗi record có phenomena tiếng Việt và ≥1 tag ĐÚNG FORMAT 4 tầng hoa/<lop>/<chuong>/<skill> (F14)', () => {
    for (const r of REACTIONS) {
      expect(r.phenomena.length, r.id).toBeGreaterThan(0);
      expect(r.tags.length, r.id).toBeGreaterThan(0);
      for (const t of r.tags) {
        expect(t, `${r.id} tag "${t}"`).toMatch(/^hoa\/[0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/);
      }
    }
  });
  it('F25: không record nào dùng điều kiện đpnc; conditions chỉ gồm t°/xúc tác', () => {
    for (const r of REACTIONS) {
      for (const c of r.conditions) expect(['t°', 'xúc tác']).toContain(c);
    }
  });
  it('F17: R29 type = oxit-axit + bazơ; R30 type = oxit lưỡng tính + kiềm', () => {
    expect(REACTIONS.find((r) => r.id === 'R29')!.type).toBe('oxit-axit + bazơ');
    expect(REACTIONS.find((r) => r.id === 'R30')!.type).toBe('oxit lưỡng tính + kiềm');
  });
  it('F6: domain guard máy-đọc nằm đúng 4 record R19/R23/R29/R39', () => {
    const dom = (id: string) => REACTIONS.find((r) => r.id === id)!.domain;
    expect(dom('R19')?.requireExcess).toEqual(['HNO3']);
    expect(dom('R23')?.mustBeLimiting).toEqual(['AgNO3']);
    expect(dom('R29')?.mustBeLimiting).toEqual(['CO2']);
    expect(dom('R39')?.mustBeLimiting).toEqual(['Na2CO3']);
    for (const r of REACTIONS) {
      if (!['R19', 'R23', 'R29', 'R39'].includes(r.id)) expect(r.domain, r.id).toBeUndefined();
    }
  });
  it('F18: 8 record bổ sung đúng chất', () => {
    const eq = (id: string) => {
      const r = REACTIONS.find((x) => x.id === id)!;
      return `${r.reactants.map((x) => x.formula).join('+')}->${r.products.map((x) => x.formula).join('+')}`;
    };
    expect(eq('R51')).toBe('K+H2O->KOH+H2');
    expect(eq('R52')).toBe('Mg+CuSO4->MgSO4+Cu');
    expect(eq('R53')).toBe('BaCl2+H2SO4->BaSO4+HCl');
    expect(eq('R54')).toBe('AgNO3+HCl->AgCl+HNO3');
    expect(eq('R55')).toBe('Ba(OH)2+Na2SO4->BaSO4+NaOH');
    expect(eq('R56')).toBe('NaHCO3+HCl->NaCl+H2O+CO2');
    expect(eq('R57')).toBe('NaHCO3+NaOH->Na2CO3+H2O');
    expect(eq('R58')).toBe('Ca(OH)2+Na2CO3->CaCO3+NaOH');
  });
});

describe('findReactions — tra theo tập chất + điều kiện', () => {
  it('Fe + CuSO4 → đúng 1 record R20', () => {
    const rs = findReactions([{ formula: 'Fe' }, { formula: 'CuSO4' }], { heated: false });
    expect(rs.map((r) => r.id)).toEqual(['R20']);
  });
  it('CaCO3 một mình + heated → R43 (nhiệt phân); KHÔNG heated → []', () => {
    expect(findReactions([{ formula: 'CaCO3' }], { heated: true }).map((r) => r.id)).toEqual(['R43']);
    expect(findReactions([{ formula: 'CaCO3' }], { heated: false })).toEqual([]);
  });
  it('H2SO4 mặc định loãng: Cu + H2SO4 (không variant) KHÔNG khớp R17 (đặc)', () => {
    expect(findReactions([{ formula: 'Cu' }, { formula: 'H2SO4' }], { heated: true })).toEqual([]);
  });
  it('F12: CaCO3 + HCl + heated → CHỈ R40 thắng (record nhiệt phân 1-chất không khớp mix 2 chất)', () => {
    const rs = findReactions([{ formula: 'CaCO3' }, { formula: 'HCl' }], { heated: true });
    expect(rs.map((r) => r.id)).toEqual(['R40']);
  });
  it('F12: NaHCO3 + NaOH (không đun) → chỉ R57; NaHCO3 + heated một mình → R47', () => {
    expect(findReactions([{ formula: 'NaHCO3' }, { formula: 'NaOH' }], { heated: false }).map((r) => r.id)).toEqual(['R57']);
    expect(findReactions([{ formula: 'NaHCO3' }], { heated: true }).map((r) => r.id)).toEqual(['R47']);
  });
});

describe('explainNoReaction — guard dãy hoạt động & trao đổi (đã sửa F1/F2)', () => {
  it('Cu + HCl: "Cu đứng sau H"', () => {
    expect(explainNoReaction([{ formula: 'Cu' }, { formula: 'HCl' }])).toMatch(/sau.*H/i);
  });
  it('Cu + FeSO4: kim loại yếu hơn không đẩy được (muối Fe²⁺ — hóa trị thấp, ĐƯỢC phán)', () => {
    expect(explainNoReaction([{ formula: 'Cu' }, { formula: 'FeSO4' }])).toMatch(/đứng sau|yếu hơn/i);
  });
  it('NaCl + KNO3: trao đổi không tạo kết tủa/khí/nước', () => {
    expect(explainNoReaction([{ formula: 'NaCl' }, { formula: 'KNO3' }])).toMatch(/kết tủa|khí|nước/i);
  });
  it('chất lạ hoàn toàn → null (để runChem trả "ngoài phạm vi DB v0")', () => {
    expect(explainNoReaction([{ formula: 'KMnO4' }, { formula: 'HCl' }])).toBeNull();
  });
  it('F1: muối Fe³⁺ + kim loại → KHÔNG được phán "không phản ứng" (Cu+FeCl3, Fe+FeCl3 là phản ứng thật)', () => {
    expect(explainNoReaction([{ formula: 'Cu' }, { formula: 'FeCl3' }])).toBeNull();
    expect(explainNoReaction([{ formula: 'Fe' }, { formula: 'FeCl3' }])).toBeNull();
    expect(classifyNoMatch([{ formula: 'Cu' }, { formula: 'FeCl3' }], { heated: false })).toMatchObject({
      verdict: 'out_of_scope',
    });
  });
  it('F2: K + dd CuSO4 → out_of_scope "phản ứng với nước trước", không phải noReaction', () => {
    expect(explainNoReaction([{ formula: 'K' }, { formula: 'CuSO4' }])).toBeNull();
    const c = classifyNoMatch([{ formula: 'K' }, { formula: 'CuSO4' }], { heated: false });
    expect(c?.verdict).toBe('out_of_scope');
    expect(c?.reason).toMatch(/nước trước/);
  });
  it('F19: Al + HNO3 đặc NGUỘI → noReaction thụ động hóa; ĐUN NÓNG → out_of_scope', () => {
    const cold = classifyNoMatch([{ formula: 'Al' }, { formula: 'HNO3', variant: 'đặc' }], { heated: false });
    expect(cold?.verdict).toBe('no_reaction');
    expect(cold?.reason).toMatch(/thụ động/);
    const hot = classifyNoMatch([{ formula: 'Al' }, { formula: 'HNO3', variant: 'đặc' }], { heated: true });
    expect(hot?.verdict).toBe('out_of_scope');
  });
  it('F11: sản phẩm trao đổi duy nhất ÍT TAN (CaCl2 + Na2SO4 → CaSO4) → null, không phán', () => {
    expect(explainNoReaction([{ formula: 'CaCl2' }, { formula: 'Na2SO4' }])).toBeNull();
  });
  it('F9: NH4⁺ + OH⁻ là KHÍ NH3, không bao giờ là "kết tủa NH4OH" — (NH4)2SO4 + KOH ngoài DB → null', () => {
    expect(explainNoReaction([{ formula: '(NH4)2SO4' }, { formula: 'KOH' }])).toBeNull();
  });
  it('ACTIVITY_SERIES đúng thứ tự SGK: K trước Na, Fe trước H, H trước Cu', () => {
    const i = (s: string) => ACTIVITY_SERIES.indexOf(s);
    expect(i('K')).toBeLessThan(i('Na'));
    expect(i('Fe')).toBeLessThan(i('H'));
    expect(i('H')).toBeLessThan(i('Cu'));
  });
});

describe('F9 — từ điển ion đóng IONS + whitelist', () => {
  it('mọi entry IONS chỉ dùng cation/anion trong whitelist', () => {
    for (const [f, ions] of Object.entries(IONS)) {
      expect(CATION_WHITELIST, `${f} cation ${ions.cation}`).toContain(ions.cation);
      expect(ANION_WHITELIST, `${f} anion ${ions.anion}`).toContain(ions.anion);
    }
  });
  it('tra đúng vài hợp chất chốt: CuSO4, FeCl3 (Fe3), FeCl2 (Fe2), NH4Cl, HCl (H⁺)', () => {
    expect(IONS['CuSO4']).toEqual({ cation: 'Cu', anion: 'SO4' });
    expect(IONS['FeCl3']).toEqual({ cation: 'Fe3', anion: 'Cl' });
    expect(IONS['FeCl2']).toEqual({ cation: 'Fe2', anion: 'Cl' });
    expect(IONS['NH4Cl']).toEqual({ cation: 'NH4', anion: 'Cl' });
    expect(IONS['HCl']).toEqual({ cation: 'H', anion: 'Cl' });
  });
  it('ngoài whitelist thì KHÔNG có mặt: KMnO4 (MnO4⁻), NaHCO3 (HCO3⁻), NaAlO2 (AlO2⁻)', () => {
    expect(IONS['KMnO4']).toBeUndefined();
    expect(IONS['NaHCO3']).toBeUndefined();
    expect(IONS['NaAlO2']).toBeUndefined();
  });
});
