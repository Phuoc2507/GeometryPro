// api/_lib/kernel/__tests__/entities.test.ts
import { describe, it, expect } from 'vitest';
import {
  pointFromCoords, lineFromTwoPoints, lineFromPointDir,
  planeFromThreePoints, planeFromPointNormal, planeFromCoeffs,
  sphereFromCenterRadius2, sphereFromCenterPoint,
} from '../entities';
import { ratVec, toApproxVec } from '../vec3s';
import { makeExact, rat } from '../scalar';

describe('builder điểm/đường', () => {
  it('pointFromCoords', () => {
    const p = pointFromCoords(ratVec(1n, 2n, 3n));
    expect(p.kind).toBe('point');
    expect(toApproxVec(p.p)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('lineFromTwoPoints lấy chỉ phương B−A', () => {
    const l = lineFromTwoPoints(ratVec(0n, 0n, 0n), ratVec(1n, 2n, 2n));
    expect(l.kind).toBe('line');
    expect(toApproxVec(l.dir)).toEqual({ x: 1, y: 2, z: 2 });
  });

  it('lineFromPointDir', () => {
    const l = lineFromPointDir(ratVec(1n, 0n, 0n), ratVec(0n, 0n, 1n));
    expect(toApproxVec(l.p)).toEqual({ x: 1, y: 0, z: 0 });
    expect(toApproxVec(l.dir)).toEqual({ x: 0, y: 0, z: 1 });
  });
});

describe('builder mặt phẳng', () => {
  it('planeFromThreePoints: mặt z=0 có pháp tuyến ‖ (0,0,1) và d=0', () => {
    const pl = planeFromThreePoints(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(pl.kind).toBe('plane');
    // pháp tuyến = AB×AC = (1,0,0)×(0,1,0) = (0,0,1)
    expect(toApproxVec(pl.n)).toEqual({ x: 0, y: 0, z: 1 });
    expect(pl.d.exact).toEqual(makeExact(0n, 1n, 1));
  });

  it('planeFromPointNormal: n·x + d = 0 với d = −n·A', () => {
    // điểm (1,1,1), pháp tuyến (2,-1,2) ⇒ d = -(2-1+2) = -3
    const pl = planeFromPointNormal(ratVec(1n, 1n, 1n), ratVec(2n, -1n, 2n));
    expect(pl.d.exact).toEqual(makeExact(-3n, 1n, 1));
  });

  it('planeFromCoeffs giữ đúng hệ số', () => {
    const pl = planeFromCoeffs(rat(2n), rat(-1n), rat(2n), rat(-3n));
    expect(toApproxVec(pl.n)).toEqual({ x: 2, y: -1, z: 2 });
    expect(pl.d.exact).toEqual(makeExact(-3n, 1n, 1));
  });
});

describe('builder mặt cầu', () => {
  it('sphereFromCenterRadius2 giữ tâm và R²', () => {
    const s = sphereFromCenterRadius2(ratVec(1n, 0n, 0n), rat(9n));
    expect(s.kind).toBe('sphere');
    expect(toApproxVec(s.center)).toEqual({ x: 1, y: 0, z: 0 });
    expect(s.r2.exact).toEqual(makeExact(9n, 1n, 1));
  });

  it('sphereFromCenterPoint tính R² = |P−tâm|²', () => {
    // tâm (0,0,0), điểm (1,2,2) ⇒ R² = 9
    const s = sphereFromCenterPoint(ratVec(0n, 0n, 0n), ratVec(1n, 2n, 2n));
    expect(s.r2.exact).toEqual(makeExact(9n, 1n, 1));
  });
});

import { sphereFromEquation } from '../entities';

describe('sphereFromEquation (x²+y²+z² + a·x + b·y + c·z + d = 0)', () => {
  it('x²+y²+z² −2x −4y −6z +5 = 0 ⇒ tâm (1,2,3), R²=9', () => {
    const s = sphereFromEquation(rat(-2n), rat(-4n), rat(-6n), rat(5n));
    expect(toApproxVec(s.center)).toEqual({ x: 1, y: 2, z: 3 });
    expect(s.r2.exact).toEqual(makeExact(9n, 1n, 1));
  });
});
