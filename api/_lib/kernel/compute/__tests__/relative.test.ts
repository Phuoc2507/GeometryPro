// api/_lib/kernel/compute/__tests__/relative.test.ts
import { describe, it, expect } from 'vitest';
import { computeRelativePosition } from '../relative';
import { pointFromCoords, lineFromPointDir, planeFromCoeffs, sphereFromCenterRadius2 } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat } from '../../scalar';

function line(px: bigint, py: bigint, pz: bigint, dx: bigint, dy: bigint, dz: bigint) {
  return lineFromPointDir(ratVec(px, py, pz), ratVec(dx, dy, dz));
}
function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeRelativePosition — đường-đường', () => {
  it('chéo nhau', () => {
    const r = computeRelativePosition(line(0n, 0n, 0n, 1n, 0n, 0n), line(0n, 0n, 1n, 0n, 1n, 0n));
    expect(r.ok && r.answer.relation).toBe('chéo nhau');
  });
  it('cắt nhau', () => {
    const r = computeRelativePosition(line(0n, 0n, 0n, 1n, 0n, 0n), line(0n, 0n, 0n, 0n, 1n, 0n));
    expect(r.ok && r.answer.relation).toBe('cắt nhau');
  });
  it('song song', () => {
    const r = computeRelativePosition(line(0n, 0n, 0n, 1n, 0n, 0n), line(0n, 1n, 0n, 2n, 0n, 0n));
    expect(r.ok && r.answer.relation).toBe('song song');
  });
});

describe('computeRelativePosition — cầu-mặt (so d² với R² exact)', () => {
  const sphere = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n)); // R²=4, R=2
  it('cắt theo đường tròn (mặt z=0)', () => {
    const r = computeRelativePosition(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n)));
    expect(r.ok && r.answer.relation).toBe('cắt theo đường tròn');
  });
  it('tiếp xúc (mặt z=2)', () => {
    const r = computeRelativePosition(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-2n)));
    expect(r.ok && r.answer.relation).toBe('tiếp xúc');
  });
  it('rời nhau (mặt z=3)', () => {
    const r = computeRelativePosition(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-3n)));
    expect(r.ok && r.answer.relation).toBe('rời nhau');
  });
});

describe('computeRelativePosition — điểm-cầu', () => {
  const sphere = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n));
  it('trong / trên / ngoài', () => {
    type Ok = Extract<ReturnType<typeof computeRelativePosition>, { ok: true }>;
    expect((computeRelativePosition(P(0n, 0n, 0n), sphere) as Ok).answer.relation).toBe('điểm nằm trong');
    expect((computeRelativePosition(P(2n, 0n, 0n), sphere) as Ok).answer.relation).toBe('điểm nằm trên');
    expect((computeRelativePosition(P(3n, 0n, 0n), sphere) as Ok).answer.relation).toBe('điểm nằm ngoài');
  });
});
