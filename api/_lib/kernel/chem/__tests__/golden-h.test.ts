// 12 bài vàng H01–H12 (specs/2026-08-21-golden-problems-ly-hoa.md Phần B) — contract bổ sung.
// Ghi chú thi công đã áp: CM chỉ chia V các species dạng solution (H04);
// query đụng chất excess → error rõ ràng (H10); asserts given_mass (H10, H11) so tol tương đối.
import { describe, it, expect } from 'vitest';
import { runChem } from '../runChem';

const a = (r: ReturnType<typeof runChem>, i = 0) => r.answers[i];

describe('golden Hóa H01–H12', () => {
  it('[H01] 5,4g Al + HCl dư (R12, đktc): PTHH [2,6,2,3]; V(H2)=6,72 L; m(AlCl3)=26,7 g', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Al', amount: { grams: '5,4' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'equation' }, { kind: 'volume_gas', of: 'H2' }, { kind: 'mass', of: 'AlCl3' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R12');
    expect(r.reactions[0].coefficients).toEqual([2, 6, 2, 3]);
    expect(a(r, 0).text).toMatch(/2Al \+ 6HCl/);
    expect(a(r, 0).text).toContain('3H2↑');
    expect(a(r, 1).exact).toBe('168/25'); // 6,72
    expect(a(r, 1).text).toContain('6,72');
    expect(a(r, 2).exact).toBe('267/10');
    expect(a(r, 2).text).toContain('26,7');
  });
  it('[H02] 11,2g Fe + H2SO4 loãng dư (R15, đkc default): 0,2 mol; 4,958 L; 30,4 g', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '11,2' } },
        { op: 'species', formula: 'H2SO4', amount: { excess: true }, state: 'solution', variant: 'loãng' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mol', of: 'H2' }, { kind: 'volume_gas', of: 'H2' }, { kind: 'mass', of: 'FeSO4' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R15');
    expect(a(r, 0).exact).toBe('1/5');
    expect(a(r, 1).exact).toBe('2479/500');
    expect(a(r, 1).text).toContain('4,958');
    expect(a(r, 1).text).toContain('24,79');
    expect(a(r, 2).exact).toBe('152/5');
    expect(a(r, 2).text).toContain('30,4');
  });
  it('[H03] 6,5g Zn + 200ml CuSO4 0,4M (R21): Zn dư 1/50 mol = 1,3 g; Cu = 5,12 g', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Zn', amount: { grams: '6,5' } },
        { op: 'species', formula: 'CuSO4', amount: { solution: { molarity: '0,4', liters: '0,2' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'remaining', of: 'Zn' }, { kind: 'mass', of: 'Cu' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R21');
    expect(a(r, 0).exact).toBe('1/50');
    expect(a(r, 0).text).toContain('1,3');
    expect(a(r, 1).exact).toBe('128/25');
    expect(a(r, 1).text).toContain('5,12');
  });
  it('[H04] 6,4g Cu + 100ml AgNO3 1M (R22): Ag 10,8 g; Cu dư 3,2 g; CM Cu(NO3)2 = 0,5M (V chỉ tính dd)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Cu', amount: { grams: '6,4' } },
        { op: 'species', formula: 'AgNO3', amount: { solution: { molarity: 1, liters: '0,1' } } },
        { op: 'mix' },
      ],
      queries: [
        { kind: 'mass', of: 'Ag' },
        { kind: 'remaining', of: 'Cu' },
        { kind: 'concentration', of: 'Cu(NO3)2', as: 'CM' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R22');
    expect(a(r, 0).exact).toBe('54/5'); // 10,8
    expect(a(r, 0).text).toContain('10,8');
    expect(a(r, 1).exact).toBe('1/20');
    expect(a(r, 1).text).toContain('3,2');
    expect(a(r, 2).exact).toBe('1/2'); // Cu rắn KHÔNG góp thể tích — V = 0,1 L
    expect(a(r, 2).approx).toBeCloseTo(0.5, 12);
  });
  it('[H05] 300ml H2SO4 0,5M + 200ml NaOH 2M (R32): NaOH dư 0,1 mol; CM 0,3M & 0,2M', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'H2SO4', amount: { solution: { molarity: '0,5', liters: '0,3' } }, variant: 'loãng' },
        { op: 'species', formula: 'NaOH', amount: { solution: { molarity: 2, liters: '0,2' } } },
        { op: 'mix' },
      ],
      queries: [
        { kind: 'remaining', of: 'NaOH' },
        { kind: 'concentration', of: 'Na2SO4', as: 'CM' },
        { kind: 'concentration', of: 'NaOH', as: 'CM' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R32');
    expect(a(r, 0).exact).toBe('1/10');
    expect(a(r, 1).exact).toBe('3/10');
    expect(a(r, 2).exact).toBe('1/5');
  });
  it('[H06] 200g NaOH 10% + 200g HCl 7,3% (R31): 0,4 mol NaCl; C% = 5,85% và 1%', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NaOH', amount: { solution_percent: { massGrams: 200, percent: 10 } } },
        { op: 'species', formula: 'HCl', amount: { solution_percent: { massGrams: 200, percent: '7,3' } } },
        { op: 'mix' },
      ],
      queries: [
        { kind: 'mol', of: 'NaCl' },
        { kind: 'concentration', of: 'NaCl', as: 'C%' },
        { kind: 'concentration', of: 'NaOH', as: 'C%' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R31');
    expect(a(r, 0).exact).toBe('2/5');
    expect(a(r, 1).exact).toBe('117/20'); // 5,85%
    expect(a(r, 1).text).toContain('5,85');
    expect(a(r, 2).exact).toBe('1');
    expect(a(r, 2).text).toContain('1');
  });
  it('[H07] 200g AgNO3 8,5% + 300g NaCl 5,85% (R41): AgCl 14,35 g; NaCl dư 11,7 g; kết tủa trắng', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'AgNO3', amount: { solution_percent: { massGrams: 200, percent: '8,5' } } },
        { op: 'species', formula: 'NaCl', amount: { solution_percent: { massGrams: 300, percent: '5,85' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'AgCl' }, { kind: 'remaining', of: 'NaCl' }, { kind: 'phenomena' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R41');
    expect(a(r, 0).exact).toBe('287/20');
    expect(a(r, 0).text).toContain('14,35');
    expect(a(r, 1).exact).toBe('1/5');
    expect(a(r, 1).text).toContain('11,7');
    expect(a(r, 2).text).toMatch(/kết tủa trắng/);
  });
  it('[H08] nung 16,8g NaHCO3 (R47, đkc): Na2CO3 10,6 g; CO2 2,479 L', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NaHCO3', amount: { grams: '16,8' } },
        { op: 'mix', heated: true },
      ],
      queries: [{ kind: 'mass', of: 'Na2CO3' }, { kind: 'volume_gas', of: 'CO2' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R47');
    expect(a(r, 0).exact).toBe('53/5');
    expect(a(r, 0).text).toContain('10,6');
    expect(a(r, 1).exact).toBe('2479/1000');
    expect(a(r, 1).text).toContain('2,479');
  });
  it('[H09] nung 31,6g KMnO4 (R44, đktc): PTHH [2,1,1,1]; O2 2,24 L; K2MnO4 19,7 g; MnO2 8,7 g', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'KMnO4', amount: { grams: '31,6' } },
        { op: 'mix', heated: true },
      ],
      molarVolume: 22.4,
      queries: [
        { kind: 'equation' },
        { kind: 'volume_gas', of: 'O2' },
        { kind: 'mass', of: 'K2MnO4' },
        { kind: 'mass', of: 'MnO2' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R44');
    expect(r.reactions[0].coefficients).toEqual([2, 1, 1, 1]);
    expect(a(r, 0).text).toMatch(/2KMnO4/);
    expect(a(r, 1).exact).toBe('56/25'); // 2,24
    expect(a(r, 2).exact).toBe('197/10');
    expect(a(r, 3).exact).toBe('87/10');
  });
  it('[H10] khử 8g Fe2O3 bằng CO dư (R49, đktc) + assert Fe 5,6 g: CO2 3,36 L; hiện tượng', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe2O3', amount: { grams: 8 } },
        { op: 'species', formula: 'CO', amount: { excess: true }, state: 'gas' },
        { op: 'mix', heated: true },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'volume_gas', of: 'CO2' }, { kind: 'phenomena' }],
      asserts: [{ kind: 'given_mass', of: 'Fe', grams: '5,6' }],
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(a(r, 0).exact).toBe('84/25'); // 3,36
    expect(a(r, 0).text).toContain('3,36');
    expect(a(r, 1).text).toMatch(/đục nước vôi/);
  });
  it('[H10 biên] hỏi mol CO (chất excess) → error rõ ràng, không ∞/NaN', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe2O3', amount: { grams: 8 } },
        { op: 'species', formula: 'CO', amount: { excess: true }, state: 'gas' },
        { op: 'mix', heated: true },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'mol', of: 'CO' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/excess|dư/);
  });
  it('[H11] H2 dư + 16g CuO nung nóng (R48) + assert H2O 3,6 g: Cu 12,8 g; hiện tượng', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'CuO', amount: { grams: 16 } },
        { op: 'species', formula: 'H2', amount: { excess: true }, state: 'gas' },
        { op: 'mix', heated: true },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }, { kind: 'phenomena' }],
      asserts: [{ kind: 'given_mass', of: 'H2O', grams: '3,6' }],
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(a(r, 0).exact).toBe('64/5');
    expect(a(r, 0).text).toContain('12,8');
    expect(a(r, 1).text).toMatch(/bột đen chuyển đỏ/);
  });
  it('[H12] FeCl2 + NaOH định tính (R37): kết tủa trắng xanh hóa nâu đỏ; PTHH [1,2,1,2]', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'FeCl2', state: 'solution' },
        { op: 'species', formula: 'NaOH', state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }, { kind: 'equation' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R37');
    expect(r.reactions[0].coefficients).toEqual([1, 2, 1, 2]);
    expect(a(r, 0).text).toMatch(/trắng xanh/);
    expect(a(r, 0).text).toMatch(/nâu đỏ/);
    expect(a(r, 1).text).toMatch(/FeCl2 \+ 2NaOH/);
    expect(a(r, 1).text).toContain('Fe(OH)2↓');
  });
});
