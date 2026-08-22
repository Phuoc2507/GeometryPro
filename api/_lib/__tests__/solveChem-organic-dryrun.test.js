import { describe, it, expect } from 'vitest';
import { solveChemPlan } from '../kernel-bridge/solveSubject.js';

// DRY-RUN Hóa HỮU CƠ qua bridge: cấp plan có OP HỮU CƠ → solveChemPlan → runChem DISPATCH sớm sang
// runOrganic → đáp CTPT tất định. Chứng minh nhánh hữu cơ (chương Hóa thứ 2) đã nối qua bridge.
// Tầng dịch LLM (đề chữ → plan) validate riêng ở tầng prompt.

describe('solveChemPlan — dry-run Hóa hữu cơ (dispatch runOrganic)', () => {
  it('O1 đốt HC + d/H2=15 → C2H6 (đáp CTPT, ok:true)', () => {
    const r = solveChemPlan({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.subject).toBe('chem');
    expect(r.ok).toBe(true);
    expect(r.answers[0].exact).toBe('C2H6');
  });

  it('O2 đốt C,H,O + d/kk 2,07 → CTPT C2H4O2, CTĐGN CH2O', () => {
    const r = solveChemPlan({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H', 'O'], sample: { grams: 3 } },
        { op: 'combustion', of: 'A', co2: { grams: '4,4' }, h2o: { grams: '1,8' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'air', value: '2,07', tol: '0,01' },
      ],
      queries: [
        { kind: 'molecular_formula', of: 'A' },
        { kind: 'empirical_formula', of: 'A' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.answers.find((a) => a.query?.kind === 'molecular_formula').exact).toBe('C2H4O2');
    expect(r.answers.find((a) => a.query?.kind === 'empirical_formula').exact).toBe('CH2O');
  });

  it('KHÔNG hồi quy vô cơ: plan species/mix vẫn chạy nhánh vô cơ', () => {
    const r = solveChemPlan({
      ops: [
        { op: 'species', formula: 'Al', amount: { grams: '5,4' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'volume_gas', of: 'H2' }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].exact).toBe('168/25'); // 6,72 L exact — nhánh vô cơ nguyên vẹn
  });
});
