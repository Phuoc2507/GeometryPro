import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

const LANTERN = { name: 'f', form: 'poly', degree: 2, through: [[0, 10], [20, 14], [40, 10]] };

describe('runAnalysis — nguồn số dạng biểu thức + integrate', () => {
  it('integrate: ∫₀⁴⁰ 2 f(z)² dz ≈ 12949,33 (không cần tham số/hình học)', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      analyze: { kind: 'integrate', variable: 'z', from: 0, to: 40, integrand: '2*f(z)^2' },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(12949.33, 1);
  });

  it('optimize với objective là biểu thức: max 2 f(z)² = 392', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      parameters: [{ name: 'z', domain: [0, 40] }],
      analyze: { kind: 'optimize', parameter: 'z', sense: 'max', objective: { kind: 'expr', expr: '2*f(z)^2' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(392, 6);
    expect(r.parameter.value).toBeCloseTo(20, 4);
  });
});
