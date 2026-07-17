import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis — slopeAt + optimize_multi', () => {
  it('khớp hàm có f\'(2)=0 rồi tối ưu 2 biến', () => {
    const r = runAnalysis({
      solidName: 'c5',
      functions: [{ name: 'f', form: 'poly', degree: 3, through: [[0, 0], [2, 4], [3, 0]], slopeAt: [[2, 0]] }],
      parameters: [{ name: 'a', domain: [2, 3] }, { name: 'b', domain: [2.05, 7] }],
      analyze: {
        kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min',
        objective: { kind: 'expr', expr: 'sqrt((a-b)^2 + (f(a)-(b+1)/(b-2))^2)' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(0.7485, 3);
  });
});
