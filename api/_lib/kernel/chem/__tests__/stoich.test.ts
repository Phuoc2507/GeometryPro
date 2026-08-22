// Task 5 — stoichiometry hữu tỉ + 2 định luật bảo toàn + domain guard (plan Task 5,
// đã áp review F3/F4/F5/F6/F7 (domain enforce TRƯỚC khi trả đáp), F10 (bảo toàn exact), F23).
import { describe, it, expect } from 'vitest';
import { amountToMol, react, MOLAR_VOLUMES } from '../stoich';
import { rat } from '../rat';
import { REACTIONS } from '../reactionDB';

const R = (id: string) => REACTIONS.find((r) => r.id === id)!;

describe('amountToMol', () => {
  it('grams: 5,6 g Fe → 1/10 mol', () => {
    expect(amountToMol('Fe', { grams: '5,6' }, MOLAR_VOLUMES[24.79])).toEqual(rat(1n, 10n));
  });
  it('liters_gas theo 22,4: 4,48 L → 1/5 mol; theo 24,79: 2,479 L → 1/10 mol', () => {
    expect(amountToMol('H2', { liters_gas: '4,48' }, MOLAR_VOLUMES[22.4])).toEqual(rat(1n, 5n));
    expect(amountToMol('H2', { liters_gas: '2,479' }, MOLAR_VOLUMES[24.79])).toEqual(rat(1n, 10n));
  });
  it('solution CM×V: 1,5M × 0,2 L → 3/10 mol; solution_percent: 200 g 8% CuSO4 → 1/10 mol', () => {
    expect(amountToMol('HCl', { solution: { molarity: '1,5', liters: '0,2' } }, MOLAR_VOLUMES[24.79])).toEqual(rat(3n, 10n));
    expect(amountToMol('CuSO4', { solution_percent: { massGrams: 200, percent: 8 } }, MOLAR_VOLUMES[24.79])).toEqual(rat(1n, 10n));
  });
  it('mol trực tiếp', () => {
    expect(amountToMol('Fe', { mol: '0,25' }, MOLAR_VOLUMES[24.79])).toEqual(rat(1n, 4n));
  });
  it('F22: lượng ≤ 0 → throw rõ ràng', () => {
    expect(() => amountToMol('Fe', { grams: 0 }, MOLAR_VOLUMES[24.79])).toThrow(/> 0/);
    expect(() => amountToMol('Fe', { grams: '-5,6' }, MOLAR_VOLUMES[24.79])).toThrow(/> 0/);
    expect(() => amountToMol('HCl', { solution: { molarity: 0, liters: 1 } }, MOLAR_VOLUMES[24.79])).toThrow(/> 0/);
  });
});

describe('react — limiting + ledger + bảo toàn EXACT', () => {
  it('bài 6: Fe 1/10 + HCl 3/10 qua R14 → Fe hết, HCl dư 1/10, H2 1/10, FeCl2 1/10', () => {
    const out = react(R('R14'), new Map([['Fe', rat(1n, 10n)], ['HCl', rat(3n, 10n)]]), new Set());
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const row = (f: string) => out.ledger.find((l) => l.formula === f)!;
    expect(row('Fe').after).toEqual(rat(0n, 1n));
    expect(row('HCl').after).toEqual(rat(1n, 10n));
    expect(row('H2').produced).toEqual(rat(1n, 10n));
    expect(row('FeCl2').produced).toEqual(rat(1n, 10n));
    expect(out.violations).toEqual([]); // 2 định luật bảo toàn tự chạy, exact (F10: nội bộ KHÔNG dung sai)
  });
  it('excess: bài 1 Fe 1/10 + CuSO4 ∞ qua R20 → Cu 1/10; consumed CuSO4 = 1/10 vẫn ghi sổ', () => {
    const out = react(R('R20'), new Map([['Fe', rat(1n, 10n)]]), new Set(['CuSO4']));
    expect(out.ok).toBe(true);
    if (out.ok) {
      const cu = out.ledger.find((l) => l.formula === 'CuSO4')!;
      expect(cu.consumed).toEqual(rat(1n, 10n));
      expect(cu.before).toBeNull(); // ∞
      expect(cu.after).toBeNull();
      expect(out.ledger.find((l) => l.formula === 'Cu')!.produced).toEqual(rat(1n, 10n));
    }
  });
  it('CHỐNG ẢO GIÁC: record giả cân bằng SAI phải bật violation bảo toàn, không trả kết quả', () => {
    const fake = {
      ...R('R20'),
      products: [
        { formula: 'FeSO4', coeff: 1, state: 'solution' },
        { formula: 'Cu', coeff: 2, state: 'solid' },
      ],
    };
    const out = react(fake as never, new Map([['Fe', rat(1n, 10n)]]), new Set(['CuSO4']));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.violations.some((v) => /bảo toàn/.test(v.law))).toBe(true);
  });
  it('F23: mọi reactant đều excess → lỗi "không có chất hữu hạn" (ξ vô định)', () => {
    const out = react(R('R20'), new Map(), new Set(['Fe', 'CuSO4']));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.outOfScope?.message).toMatch(/không có chất hữu hạn/);
  });
});

describe('F6 — domain guard enforce TRƯỚC khi trả đáp (3 bài review giải-SAI phải bị chặn)', () => {
  it('R23 (F3): Fe 1/10 + AgNO3 1/4 (dư) → error ngoài phạm vi, KHÔNG trả 21,6 g Ag', () => {
    const out = react(R('R23'), new Map([['Fe', rat(1n, 10n)], ['AgNO3', rat(1n, 4n)]]), new Set());
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.outOfScope?.message).toMatch(/ngoài phạm vi/);
      expect(out.outOfScope?.message).toMatch(/Fe³⁺|Fe3\+|oxi hóa/);
    }
  });
  it('R23: AgNO3 khai excess cũng bị chặn (excess ⇒ chắc chắn dư)', () => {
    const out = react(R('R23'), new Map([['Fe', rat(1n, 10n)]]), new Set(['AgNO3']));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.outOfScope?.message).toMatch(/ngoài phạm vi/);
  });
  it('R23 ca hợp lệ: Fe 1/10 + AgNO3 3/20 (≤ 2n(Fe)) → Ag = 3/20 mol', () => {
    const out = react(R('R23'), new Map([['Fe', rat(1n, 10n)], ['AgNO3', rat(3n, 20n)]]), new Set());
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.ledger.find((l) => l.formula === 'Ag')!.produced).toEqual(rat(3n, 20n));
  });
  it('R29 (F4): CO2 3/10 + Ca(OH)2 1/5 → error ngoài phạm vi (CO2 dư hòa tan kết tủa), KHÔNG trả 20 g', () => {
    const out = react(R('R29'), new Map([['CO2', rat(3n, 10n)], ['Ca(OH)2', rat(1n, 5n)]]), new Set());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.outOfScope?.message).toMatch(/ngoài phạm vi/);
  });
  it('R29 ca hợp lệ: CO2 3/20 + Ca(OH)2 1/5 → CaCO3 3/20', () => {
    const out = react(R('R29'), new Map([['CO2', rat(3n, 20n)], ['Ca(OH)2', rat(1n, 5n)]]), new Set());
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.ledger.find((l) => l.formula === 'CaCO3')!.produced).toEqual(rat(3n, 20n));
  });
  it('R39 (F7): HCl 1/10 + Na2CO3 3/50 (axit thiếu) → error ngoài phạm vi, KHÔNG trả 1,12 L', () => {
    const out = react(R('R39'), new Map([['Na2CO3', rat(3n, 50n)], ['HCl', rat(1n, 10n)]]), new Set());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.outOfScope?.message).toMatch(/ngoài phạm vi/);
  });
  it('R39 ca hợp lệ: Na2CO3 1/20 + HCl 3/25 (≥ 2n muối) → CO2 = 1/20', () => {
    const out = react(R('R39'), new Map([['Na2CO3', rat(1n, 20n)], ['HCl', rat(3n, 25n)]]), new Set());
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.ledger.find((l) => l.formula === 'CO2')!.produced).toEqual(rat(1n, 20n));
  });
  it('R19 (F5): HNO3 hữu hạn (không khai excess) → error ngoài phạm vi', () => {
    const out = react(R('R19'), new Map([['Fe', rat(1n, 10n)], ['HNO3', rat(1n, 2n)]]), new Set());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.outOfScope?.message).toMatch(/ngoài phạm vi/);
  });
  it('R19 ca hợp lệ: Fe 1/10 + HNO3 excess → NO = 1/10, Fe(NO3)3 = 1/10', () => {
    const out = react(R('R19'), new Map([['Fe', rat(1n, 10n)]]), new Set(['HNO3']));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.ledger.find((l) => l.formula === 'NO')!.produced).toEqual(rat(1n, 10n));
      expect(out.ledger.find((l) => l.formula === 'Fe(NO3)3')!.produced).toEqual(rat(1n, 10n));
    }
  });
});
