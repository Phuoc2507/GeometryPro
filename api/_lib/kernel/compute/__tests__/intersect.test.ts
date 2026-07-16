// api/_lib/kernel/compute/__tests__/intersect.test.ts
import { describe, it, expect } from 'vitest';
import { computeIntersection } from '../intersect';
import { lineFromPointDir, planeFromCoeffs, sphereFromCenterRadius2 } from '../../entities';
import { ratVec, toApproxVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

describe('computeIntersection — đường ∩ mặt', () => {
  it('cho giao điểm (0,0,0)', () => {
    const l = lineFromPointDir(ratVec(0n, 0n, 5n), ratVec(0n, 0n, 1n));
    const pl = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n)); // z=0
    const r = computeIntersection(l, pl);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.result).toBe('point'); expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 0, y: 0, z: 0 }); }
  });
});

describe('computeIntersection — mặt ∩ mặt (giao tuyến)', () => {
  it('z=0 ∩ y=0 = trục Ox', () => {
    const p1 = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n)); // z=0
    const p2 = planeFromCoeffs(rat(0n), rat(1n), rat(0n), rat(0n)); // y=0
    const r = computeIntersection(p1, p2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('line');
      const dir = toApproxVec(r.answer.line!.dir);
      // chỉ phương ‖ Ox
      expect(dir.y).toBeCloseTo(0, 9);
      expect(dir.z).toBeCloseTo(0, 9);
      expect(Math.abs(dir.x)).toBeGreaterThan(0);
      expect(toApproxVec(r.answer.line!.p)).toEqual({ x: 0, y: 0, z: 0 });
    }
  });
});

describe('computeIntersection — cầu ∩ mặt', () => {
  const sphere = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n)); // R²=4
  it('cắt → đường tròn tâm (0,0,1), R²=3 (mặt z=1)', () => {
    const r = computeIntersection(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-1n)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('circle');
      expect(toApproxVec(r.answer.circle!.center.p)).toEqual({ x: 0, y: 0, z: 1 });
      expect(r.answer.circle!.r2.exact).toEqual(makeExact(3n, 1n, 1));
    }
  });
  it('tiếp xúc → tiếp điểm (mặt z=2)', () => {
    const r = computeIntersection(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-2n)));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.result).toBe('tangent-point'); expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 0, y: 0, z: 2 }); }
  });
  it('rời → none (mặt z=3)', () => {
    const r = computeIntersection(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-3n)));
    expect(r.ok && r.answer.result).toBe('none');
  });
});
