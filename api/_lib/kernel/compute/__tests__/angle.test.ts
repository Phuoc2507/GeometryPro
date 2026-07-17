// api/_lib/kernel/compute/__tests__/angle.test.ts
import { describe, it, expect } from 'vitest';
import { computeAngle } from '../angle';
import { lineFromPointDir, planeFromCoeffs } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

function line(dx: bigint, dy: bigint, dz: bigint) {
  return lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(dx, dy, dz));
}

describe('computeAngle', () => {
  it('đường-đường 60°: dir (1,1,0) và (1,0,1)', () => {
    const r = computeAngle(line(1n, 1n, 0n), line(1n, 0n, 1n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exactDegrees).toBe(60); expect(r.answer.text).toBe('60°'); }
  });

  it('đường-đường 90°: dir (1,0,0) và (0,1,0)', () => {
    const r = computeAngle(line(1n, 0n, 0n), line(0n, 1n, 0n));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exactDegrees).toBe(90);
  });

  it('nhị diện 45°: mặt z=0 và mặt y+z=0', () => {
    const p1 = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    const p2 = planeFromCoeffs(rat(0n), rat(1n), rat(1n), rat(0n));
    const r = computeAngle(p1, p2);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exactDegrees).toBe(45); expect(r.answer.exactCos).toEqual(makeExact(1n, 2n, 2)); }
  });

  it('đường-mặt 90°: đường ‖ Oz vuông góc mặt z=0', () => {
    const l = line(0n, 0n, 1n);
    const plane = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    const r = computeAngle(l, plane);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exactDegrees).toBe(90);
  });

  it('góc không đẹp ⇒ approximate với độ thập phân', () => {
    const r = computeAngle(line(1n, 1n, 1n), line(1n, 0n, 0n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.approximate).toBe(true); expect(r.answer.text).toMatch(/≈/); }
  });

  it('đường suy biến ⇒ {ok:false}', () => {
    const r = computeAngle(line(0n, 0n, 0n), line(1n, 0n, 0n));
    expect(r.ok).toBe(false);
  });
});
