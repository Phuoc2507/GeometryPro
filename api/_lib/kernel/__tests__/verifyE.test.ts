// api/_lib/kernel/__tests__/verifyE.test.ts
import { describe, it, expect } from 'vitest';
import { verifyAssertE } from '../verifyE';
import { createEmptyEntityTable } from '../entityTable';
import { pointFromCoords, planeFromCoeffs } from '../entities';
import { ratVec } from '../vec3s';
import { rat } from '../scalar';
import type { AssertOp } from '../planSchema';

function scene() {
  const et = createEmptyEntityTable();
  et.points.set('A', pointFromCoords(ratVec(0n, 0n, 0n)));
  et.points.set('B', pointFromCoords(ratVec(1n, 0n, 0n)));
  et.points.set('S', pointFromCoords(ratVec(0n, 0n, 3n)));
  et.planes.set('P', planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n))); // z=0
  return et;
}

describe('verifyAssertE', () => {
  it('on: A thuộc mặt z=0 → null (không vi phạm)', () => {
    expect(verifyAssertE({ relation: 'on', args: ['A', 'P'] } as AssertOp, scene())).toBeNull();
  });
  it('on: S không thuộc mặt z=0 → vi phạm', () => {
    expect(verifyAssertE({ relation: 'on', args: ['S', 'P'] } as AssertOp, scene())).not.toBeNull();
  });
  it('perp: SA vuông góc mặt z=0 → null', () => {
    expect(verifyAssertE({ relation: 'perp', args: ['SA', 'P'] } as AssertOp, scene())).toBeNull();
  });
  it('dist: dist(S,A)=3 → null; sai giá trị → vi phạm', () => {
    expect(verifyAssertE({ relation: 'dist', args: ['S', 'A'], value: 3 } as AssertOp, scene())).toBeNull();
    expect(verifyAssertE({ relation: 'dist', args: ['S', 'A'], value: 99 } as AssertOp, scene())).not.toBeNull();
  });
  it('coplanar: A,B,S,và điểm phẳng → tuỳ; A,B,(0,1,0) đồng phẳng z=0', () => {
    const et = scene();
    et.points.set('C', pointFromCoords(ratVec(0n, 1n, 0n)));
    et.points.set('D', pointFromCoords(ratVec(1n, 1n, 0n)));
    expect(verifyAssertE({ relation: 'coplanar', args: ['A', 'B', 'C', 'D'] } as AssertOp, et)).toBeNull();
  });
});
