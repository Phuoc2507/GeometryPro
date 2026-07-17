import { describe, it, expect } from 'vitest';
import { fitPoly, evalPoly, derivPoly, extremumOfPoly } from '../polyfit';

describe('polyfit', () => {
  it('khớp có GHIM hệ số đầu: bậc 2 qua (0,0),(8,0), a=-1/3 → f(x)=-x²/3+8x/3', () => {
    const c = fitPoly(2, [[0, 0], [8, 0]], -1 / 3); // [c0,c1,c2]
    expect(c[0]).toBeCloseTo(0, 10);
    expect(c[1]).toBeCloseTo(8 / 3, 10);
    expect(c[2]).toBeCloseTo(-1 / 3, 10);
  });

  it('khớp ĐỦ điểm: bậc 2 qua (0,10),(20,14),(40,10) → r(z)=-z²/100+0.4z+10', () => {
    const c = fitPoly(2, [[0, 10], [20, 14], [40, 10]]);
    expect(c[0]).toBeCloseTo(10, 10);
    expect(c[1]).toBeCloseTo(0.4, 10);
    expect(c[2]).toBeCloseTo(-0.01, 10);
  });

  it('evalPoly + derivPoly', () => {
    const c = [0, 8 / 3, -1 / 3];
    expect(evalPoly(c, 6)).toBeCloseTo(4, 10);   // f(6)=4
    expect(evalPoly(c, 0)).toBeCloseTo(0, 10);
    const d = derivPoly(c);                       // f'(x) = 8/3 - 2x/3
    expect(evalPoly(d, 6)).toBeCloseTo(-4 / 3, 10);
  });

  it('extremumOfPoly: đỉnh parabol tại x=4, y=16/3', () => {
    const r = extremumOfPoly([0, 8 / 3, -1 / 3], 0, 8);
    expect(r).not.toBeNull();
    expect(r!.x).toBeCloseTo(4, 6);
    expect(r!.y).toBeCloseTo(16 / 3, 6);
  });

  it('sai số điểm → ném', () => {
    expect(() => fitPoly(2, [[0, 0]], -1 / 3)).toThrow();
  });
});
