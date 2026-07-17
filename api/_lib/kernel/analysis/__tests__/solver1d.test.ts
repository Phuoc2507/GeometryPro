import { describe, it, expect } from 'vitest';
import { solveQuadratic } from '../solver1d';
import { rat, displayScalar } from '../../scalar';

describe('solveQuadratic', () => {
  it('tuyến tính 2x−6=0 → x=3 (exact)', () => {
    const r = solveQuadratic(rat(0n), rat(2n), rat(-6n));
    expect(r).toHaveLength(1);
    expect(displayScalar(r[0])).toBe('3');
  });

  it('x²−7=0 → ±√7 (exact, căn thuần)', () => {
    const r = solveQuadratic(rat(1n), rat(0n), rat(-7n));
    const texts = r.map(displayScalar).sort();
    expect(texts).toEqual(['-√7', '√7']);
  });

  it('vô nghiệm thực (Δ<0) → []', () => {
    expect(solveQuadratic(rat(1n), rat(0n), rat(1n))).toHaveLength(0);
  });

  it('Câu 9: 9s²+60s−152=0 → nghiệm nhị thức căn (số, exact=null)', () => {
    const r = solveQuadratic(rat(9n), rat(60n), rat(-152n));
    expect(r).toHaveLength(2);
    const approx = r.map((s) => s.approx).sort((a, b) => a - b);
    expect(approx[0]).toBeCloseTo(-8.6249, 3);
    expect(approx[1]).toBeCloseTo(1.9582, 3);
    // nghiệm (−10±6√7)/3 là nhị thức ⇒ rời trường một-căn ⇒ exact=null
    expect(r[0].exact).toBeNull();
  });
});
