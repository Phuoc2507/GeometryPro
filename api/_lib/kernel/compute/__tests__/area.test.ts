// api/_lib/kernel/compute/__tests__/area.test.ts
import { describe, it, expect } from 'vitest';
import { computeTriangleArea, computePolygonArea } from '../area';
import { pointFromCoords } from '../../entities';
import { ratVec } from '../../vec3s';
import { makeExact } from '../../scalar';

function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeTriangleArea', () => {
  it('tam giác vuông cạnh 1: S = 1/2', () => {
    const r = computeTriangleArea(P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 2n, 1)); expect(r.answer.text).toBe('1/2'); }
  });
});

describe('computePolygonArea', () => {
  it('hình vuông cạnh 2 (dời khỏi gốc): S = 4', () => {
    const sq = [P(1n, 1n, 0n), P(3n, 1n, 0n), P(3n, 3n, 0n), P(1n, 3n, 0n)];
    const r = computePolygonArea(sq);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(4n, 1n, 1)); expect(r.answer.text).toBe('4'); }
  });
});
