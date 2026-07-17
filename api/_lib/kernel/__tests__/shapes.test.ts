// api/_lib/kernel/__tests__/shapes.test.ts
import { describe, it, expect } from 'vitest';
import { buildSquare, buildRectangle, buildRhombus, buildRegPolygon, buildTriangle } from '../ops/shapes';
import { distance } from '../vecMath';

describe('buildSquare', () => {
  it('produces 4 coplanar (z=0) vertices with the given edge length, centered at origin', () => {
    const pts = buildSquare(2);
    expect(pts).toHaveLength(4);
    pts.forEach((p) => expect(p.z).toBe(0));
    expect(distance(pts[0], pts[1])).toBeCloseTo(2, 10);
    expect(distance(pts[1], pts[2])).toBeCloseTo(2, 10);
    const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
    const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
    expect(cx).toBeCloseTo(0, 10);
    expect(cy).toBeCloseTo(0, 10);
  });
});

describe('buildRectangle', () => {
  it('produces 4 vertices with the given width/height', () => {
    const pts = buildRectangle(4, 2);
    expect(distance(pts[0], pts[1])).toBeCloseTo(4, 10);
    expect(distance(pts[1], pts[2])).toBeCloseTo(2, 10);
  });
});

describe('buildRhombus', () => {
  it('produces 4 vertices whose diagonals match diag1/diag2 and all sides equal', () => {
    const pts = buildRhombus(6, 8);
    // diag1 spans pts[0]-pts[2], diag2 spans pts[1]-pts[3]
    expect(distance(pts[0], pts[2])).toBeCloseTo(6, 10);
    expect(distance(pts[1], pts[3])).toBeCloseTo(8, 10);
    const side = distance(pts[0], pts[1]);
    expect(distance(pts[1], pts[2])).toBeCloseTo(side, 10);
    expect(distance(pts[2], pts[3])).toBeCloseTo(side, 10);
    expect(distance(pts[3], pts[0])).toBeCloseTo(side, 10);
    expect(side).toBeCloseTo(5, 10); // 3-4-5 right triangle halves
  });
});

describe('buildRegPolygon', () => {
  it('produces n vertices with the given edge length, equidistant from centroid', () => {
    const pts = buildRegPolygon(6, 3);
    expect(pts).toHaveLength(6);
    expect(distance(pts[0], pts[1])).toBeCloseTo(3, 8);
    const R = distance(pts[0], { x: 0, y: 0, z: 0 });
    pts.forEach((p) => expect(distance(p, { x: 0, y: 0, z: 0 })).toBeCloseTo(R, 8));
  });

  it('throws for n < 3', () => {
    expect(() => buildRegPolygon(2, 1)).toThrow();
  });
});

describe('buildTriangle', () => {
  it('equilateral: all 3 sides equal the given edge', () => {
    const pts = buildTriangle({ triangleType: 'equilateral', edge: 4 });
    expect(distance(pts[0], pts[1])).toBeCloseTo(4, 8);
    expect(distance(pts[1], pts[2])).toBeCloseTo(4, 8);
    expect(distance(pts[2], pts[0])).toBeCloseTo(4, 8);
  });

  it('right: legs meet at pts[0] with a true 90 degree angle', () => {
    const pts = buildTriangle({ triangleType: 'right', leg1: 3, leg2: 4 });
    expect(distance(pts[0], pts[1])).toBeCloseTo(3, 8);
    expect(distance(pts[0], pts[2])).toBeCloseTo(4, 8);
    expect(distance(pts[1], pts[2])).toBeCloseTo(5, 8); // 3-4-5 hypotenuse
  });

  it('isosceles: two legs equal legLength, base equals base', () => {
    const pts = buildTriangle({ triangleType: 'isosceles', base: 6, legLength: 5 });
    expect(distance(pts[1], pts[2])).toBeCloseTo(6, 8); // base
    expect(distance(pts[0], pts[1])).toBeCloseTo(5, 8);
    expect(distance(pts[0], pts[2])).toBeCloseTo(5, 8);
  });

  it('isosceles: throws when legLength is too short for the base', () => {
    expect(() => buildTriangle({ triangleType: 'isosceles', base: 10, legLength: 2 })).toThrow();
  });

  it('sss: reproduces all three given side lengths exactly', () => {
    const pts = buildTriangle({ triangleType: 'sss', p1p2: 5, p1p3: 6, p2p3: 7 });
    expect(distance(pts[0], pts[1])).toBeCloseTo(5, 8);
    expect(distance(pts[0], pts[2])).toBeCloseTo(6, 8);
    expect(distance(pts[1], pts[2])).toBeCloseTo(7, 8);
  });

  it('sss: throws on triangle-inequality violation', () => {
    expect(() => buildTriangle({ triangleType: 'sss', p1p2: 1, p1p3: 1, p2p3: 10 })).toThrow();
  });
});
