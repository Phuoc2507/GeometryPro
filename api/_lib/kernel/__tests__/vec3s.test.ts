// api/_lib/kernel/__tests__/vec3s.test.ts
import { describe, it, expect } from 'vitest';
import { ratVec, addV, subV, scaleV, dotV, crossV, lenSqV, toApproxVec } from '../vec3s';
import { makeExact, rat } from '../scalar';

describe('Vec3S', () => {
  it('ratVec dựng vector hữu tỷ, toApproxVec cho gương float', () => {
    const v = ratVec(1n, 2n, 3n);
    expect(toApproxVec(v)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('dot giữ exact: (1,2,2)·(2,-2,1) = 0', () => {
    const a = ratVec(1n, 2n, 2n);
    const b = ratVec(2n, -2n, 1n);
    const d = dotV(a, b);
    expect(d.exact).toEqual(makeExact(0n, 1n, 1));
    expect(d.approx).toBeCloseTo(0, 12);
  });

  it('cross giữ exact: (1,0,0)×(0,1,0) = (0,0,1)', () => {
    const c = crossV(ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(toApproxVec(c)).toEqual({ x: 0, y: 0, z: 1 });
    expect(c.z.exact).toEqual(makeExact(1n, 1n, 1));
  });

  it('lenSqV cho bình phương độ dài chính xác (hữu tỷ)', () => {
    // |(1,2,2)|² = 9
    expect(lenSqV(ratVec(1n, 2n, 2n)).exact).toEqual(makeExact(9n, 1n, 1));
  });

  it('add/sub/scale hoạt động trên gương float', () => {
    const s = addV(ratVec(1n, 1n, 1n), ratVec(2n, 3n, 4n));
    expect(toApproxVec(s)).toEqual({ x: 3, y: 4, z: 5 });
    const d = subV(ratVec(5n, 5n, 5n), ratVec(1n, 2n, 3n));
    expect(toApproxVec(d)).toEqual({ x: 4, y: 3, z: 2 });
    const sc = scaleV(ratVec(1n, 2n, 3n), rat(2n));
    expect(toApproxVec(sc)).toEqual({ x: 2, y: 4, z: 6 });
  });
});
