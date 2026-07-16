// api/_lib/kernel/compute/__tests__/distance.test.ts
import { describe, it, expect } from 'vitest';
import { computeDistance } from '../distance';
import { pointFromCoords, lineFromPointDir, planeFromCoeffs } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeDistance', () => {
  it('điểm–điểm: |(0,0,0)-(2,1,2)| = 3', () => {
    const r = computeDistance(P(0n, 0n, 0n), P(2n, 1n, 2n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(3n, 1n, 1)); expect(r.answer.text).toBe('3'); }
  });

  it('điểm–mặt: (1,1,1) tới x+y+z=0 = √3', () => {
    const plane = planeFromCoeffs(rat(1n), rat(1n), rat(1n), rat(0n));
    const r = computeDistance(P(1n, 1n, 1n), plane);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 1n, 3)); expect(r.answer.text).toBe('√3'); }
  });

  it('điểm–đường: (0,2,0) tới trục Ox = 2', () => {
    const line = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const r = computeDistance(P(0n, 2n, 0n), line);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(2n, 1n, 1));
  });

  it('2 đường chéo nhau: Ox tại z=0 và (Oy dời lên z=1) = 1', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(0n, 0n, 1n), ratVec(0n, 1n, 0n));
    const r = computeDistance(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 1n, 1)); expect(r.answer.text).toBe('1'); }
  });

  it('mặt suy biến ⇒ {ok:false} có cấu trúc, không ném', () => {
    const bad = planeFromCoeffs(rat(0n), rat(0n), rat(0n), rat(5n));
    const r = computeDistance(P(1n, 1n, 1n), bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/plane/i);
  });
});
