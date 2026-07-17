// api/_lib/kernel/__tests__/extrude.test.ts
import { describe, it, expect } from 'vitest';
import { extrudePrism, extrudePyramidApex } from '../ops/extrude';
import { buildSquare } from '../ops/shapes';

describe('extrudePrism', () => {
  it('translates every base vertex by height along +z, preserving x/y', () => {
    const base = buildSquare(2);
    const top = extrudePrism(base, 5);
    top.forEach((p, i) => {
      expect(p.x).toBeCloseTo(base[i].x, 10);
      expect(p.y).toBeCloseTo(base[i].y, 10);
      expect(p.z).toBeCloseTo(5, 10);
    });
  });
});

describe('extrudePyramidApex', () => {
  it('places the apex directly above the centroid of the base, at the given height', () => {
    const base = buildSquare(2); // centroid (0,0,0)
    const apex = extrudePyramidApex(base, 3);
    expect(apex.x).toBeCloseTo(0, 10);
    expect(apex.y).toBeCloseTo(0, 10);
    expect(apex.z).toBeCloseTo(3, 10);
  });

  it('follows an off-center base centroid too (e.g. a translated triangle)', () => {
    const base = [
      { x: 1, y: 1, z: 0 },
      { x: 4, y: 1, z: 0 },
      { x: 1, y: 5, z: 0 },
    ];
    const apex = extrudePyramidApex(base, 2);
    expect(apex.x).toBeCloseTo(2, 10); // (1+4+1)/3
    expect(apex.y).toBeCloseTo(7 / 3, 10); // (1+1+5)/3
    expect(apex.z).toBeCloseTo(2, 10);
  });
});
