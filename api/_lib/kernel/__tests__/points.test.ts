// api/_lib/kernel/__tests__/points.test.ts
import { describe, it, expect } from 'vitest';
import {
  midpoint, centroidPoint, ratioPoint, reflectPoint,
  perpPointFromPlane, footOnPlane, footOnLine,
  intersectLineLine, intersectLinePlane,
} from '../ops/points';
import { vec3, distance } from '../vecMath';

describe('midpoint / centroidPoint / ratioPoint / reflectPoint', () => {
  it('midpoint is the average of two points', () => {
    expect(midpoint(vec3(0, 0, 0), vec3(4, 6, 8))).toEqual(vec3(2, 3, 4));
  });

  it('centroidPoint averages any number of points', () => {
    expect(centroidPoint([vec3(0, 0, 0), vec3(3, 0, 0), vec3(0, 3, 0)])).toEqual(vec3(1, 1, 0));
  });

  it('ratioPoint(from, to, t) divides the segment at parameter t', () => {
    expect(ratioPoint(vec3(0, 0, 0), vec3(10, 0, 0), 0.25)).toEqual(vec3(2.5, 0, 0));
    expect(ratioPoint(vec3(0, 0, 0), vec3(10, 0, 0), 0)).toEqual(vec3(0, 0, 0));
    expect(ratioPoint(vec3(0, 0, 0), vec3(10, 0, 0), 1)).toEqual(vec3(10, 0, 0));
  });

  it('reflectPoint mirrors a point through a center', () => {
    expect(reflectPoint(vec3(1, 1, 1), vec3(0, 0, 0))).toEqual(vec3(-1, -1, -1));
    expect(reflectPoint(vec3(0, 0, 0), vec3(2, 3, 4))).toEqual(vec3(4, 6, 8));
  });
});

describe('perpPointFromPlane — the S.ABCD "SA perp base" case', () => {
  it('places the new point directly above `from`, at `length` along the plane normal', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)]; // z=0 base plane
    const S = perpPointFromPlane(vec3(0, 0, 0), base, Math.sqrt(2));
    expect(S.x).toBeCloseTo(0, 10);
    expect(S.y).toBeCloseTo(0, 10);
    expect(S.z).toBeCloseTo(Math.sqrt(2), 10);
    expect(distance(S, vec3(0, 0, 0))).toBeCloseTo(Math.sqrt(2), 10);
  });
});

describe('footOnPlane / footOnLine', () => {
  it('footOnPlane projects a point straight onto the z=0 base plane', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)];
    const foot = footOnPlane(vec3(0.5, 0.5, 3), base);
    expect(foot).toEqual(vec3(0.5, 0.5, 0));
  });

  it('footOnLine projects a point onto a line segment', () => {
    const foot = footOnLine(vec3(3, 5, 0), vec3(0, 0, 0), vec3(1, 0, 0));
    expect(foot.x).toBeCloseTo(3, 10);
    expect(foot.y).toBeCloseTo(0, 10);
  });
});

describe('intersectLineLine', () => {
  it('finds the intersection of two coplanar, non-parallel lines', () => {
    const p = intersectLineLine(vec3(0, 0, 0), vec3(4, 4, 0), vec3(0, 4, 0), vec3(4, 0, 0));
    expect(p.x).toBeCloseTo(2, 8);
    expect(p.y).toBeCloseTo(2, 8);
  });

  it('throws for parallel lines', () => {
    expect(() =>
      intersectLineLine(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(1, 1, 0))
    ).toThrow();
  });

  it('throws for skew (non-coplanar) lines', () => {
    expect(() =>
      intersectLineLine(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 1), vec3(1, 1, 1))
    ).toThrow();
  });

  it('does not false-positive-reject two genuinely coplanar lines at large coordinate magnitude (~1000)', () => {
    // Two lines through a common point P0=(1000,-500,800) along orthogonal directions
    // u=(1,2,2) and v=(2,-2,1) (u.v=0). Sharing a point makes them trivially coplanar
    // (never skew), so this must not throw even though every coordinate involved is
    // ~O(1000) — regression test for the scaleRef-relative tolerance in the skew check.
    const A1 = vec3(700, -1100, 200); // P0 - 300*u
    const A2 = vec3(1300, 100, 1400); // P0 + 300*u
    const B1 = vec3(600, -100, 600); // P0 - 200*v
    const B2 = vec3(1400, -900, 1000); // P0 + 200*v
    const p = intersectLineLine(A1, A2, B1, B2);
    expect(p.x).toBeCloseTo(1000, 6);
    expect(p.y).toBeCloseTo(-500, 6);
    expect(p.z).toBeCloseTo(800, 6);
  });
});

describe('intersectLinePlane', () => {
  it('finds where a line crosses the z=0 plane', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)];
    const p = intersectLinePlane(vec3(0, 0, 5), vec3(2, 2, -5), base);
    expect(p.z).toBeCloseTo(0, 8);
    expect(p.x).toBeCloseTo(1, 8);
    expect(p.y).toBeCloseTo(1, 8);
  });

  it('throws when the line is parallel to the plane', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)];
    expect(() => intersectLinePlane(vec3(0, 0, 5), vec3(1, 1, 5), base)).toThrow();
  });
});
