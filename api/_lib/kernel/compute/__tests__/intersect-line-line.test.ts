// Giao ĐƯỜNG×ĐƯỜNG (exact): cắt (2D & 3D đồng phẳng) → point; song song → parallel; trùng → coincident;
// chéo (3D không đồng phẳng) → none. KHÔNG bao giờ bịa điểm cho 3 trường hợp suy biến.
import { describe, it, expect } from 'vitest';
import { computeIntersection } from '../intersect';
import { lineFromPointDir } from '../../entities';
import { ratVec, toApproxVec } from '../../vec3s';

describe('computeIntersection: đường×đường', () => {
  it('2D cắt nhau → point (1,1,0)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 1n, 0n));
    const l2 = lineFromPointDir(ratVec(2n, 0n, 0n), ratVec(-1n, 1n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('point');
      expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 1, y: 1, z: 0 });
    }
  });

  it('3D đồng phẳng cắt nhau → point (2,2,2)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 1n, 1n));
    const l2 = lineFromPointDir(ratVec(2n, 2n, 2n), ratVec(1n, -1n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('point');
      expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 2, y: 2, z: 2 });
    }
  });

  it('song song → parallel (không có point)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(0n, 1n, 0n), ratVec(2n, 0n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('parallel');
      expect(r.answer.point).toBeUndefined();
    }
  });

  it('trùng nhau → coincident (không có point)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(3n, 0n, 0n), ratVec(2n, 0n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('coincident');
      expect(r.answer.point).toBeUndefined();
    }
  });

  it('chéo nhau (3D) → none (không có point)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(0n, 0n, 1n), ratVec(0n, 1n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('none');
      expect(r.answer.point).toBeUndefined();
    }
  });
});
