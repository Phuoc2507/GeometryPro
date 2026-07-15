// api/_lib/kernel/__tests__/vecMath.test.ts
import { describe, it, expect } from 'vitest';
import {
  vec3, add, sub, scale, dot, cross, length, normalize, lerp,
  centroidOf, distance, planeNormal, distancePointToPlane,
  projectPointOntoPlane, distancePointToLine, projectPointOntoLine,
  angleBetween, scalarTriple, areCollinear, arePointsCoplanar,
  tetrahedronVolume, EPS,
} from '../vecMath';

describe('basic vector ops', () => {
  it('add/sub/scale/dot/cross/length are correct', () => {
    const a = vec3(1, 2, 3);
    const b = vec3(4, 5, 6);
    expect(add(a, b)).toEqual({ x: 5, y: 7, z: 9 });
    expect(sub(b, a)).toEqual({ x: 3, y: 3, z: 3 });
    expect(scale(a, 2)).toEqual({ x: 2, y: 4, z: 6 });
    expect(dot(a, b)).toBe(32);
    expect(cross(a, b)).toEqual({ x: -3, y: 6, z: -3 });
    expect(length(vec3(3, 4, 0))).toBeCloseTo(5, 10);
  });

  it('normalize throws on zero vector, otherwise returns unit length', () => {
    expect(() => normalize(vec3(0, 0, 0))).toThrow();
    const n = normalize(vec3(3, 4, 0));
    expect(length(n)).toBeCloseTo(1, 10);
    expect(n).toEqual({ x: 0.6, y: 0.8, z: 0 });
  });

  it('lerp interpolates linearly, centroidOf averages', () => {
    expect(lerp(vec3(0, 0, 0), vec3(10, 0, 0), 0.5)).toEqual({ x: 5, y: 0, z: 0 });
    expect(centroidOf([vec3(0, 0, 0), vec3(6, 0, 0), vec3(0, 6, 0)])).toEqual({ x: 2, y: 2, z: 0 });
    expect(() => centroidOf([])).toThrow();
  });

  it('distance is Euclidean', () => {
    expect(distance(vec3(0, 0, 0), vec3(3, 4, 0))).toBeCloseTo(5, 10);
  });
});

describe('plane geometry — hand-verified against plane x+y+z=3 through (3,0,0),(0,3,0),(0,0,3)', () => {
  const p1 = vec3(3, 0, 0);
  const p2 = vec3(0, 3, 0);
  const p3 = vec3(0, 0, 3);

  it('planeNormal returns the unit normal (1,1,1)/sqrt(3), oriented toward +z', () => {
    const n = planeNormal(p1, p2, p3);
    const expected = 1 / Math.sqrt(3);
    expect(n.x).toBeCloseTo(expected, 10);
    expect(n.y).toBeCloseTo(expected, 10);
    expect(n.z).toBeCloseTo(expected, 10);
  });

  it('distancePointToPlane(origin, this plane) = sqrt(3) (hand-verified: |0+0+0-3|/sqrt(3))', () => {
    const n = planeNormal(p1, p2, p3);
    expect(distancePointToPlane(vec3(0, 0, 0), p1, n)).toBeCloseTo(Math.sqrt(3), 8);
  });

  it('projectPointOntoPlane(origin) lands on the plane (x+y+z=3) and is closer than the origin', () => {
    const n = planeNormal(p1, p2, p3);
    const proj = projectPointOntoPlane(vec3(0, 0, 0), p1, n);
    expect(proj.x + proj.y + proj.z).toBeCloseTo(3, 8);
    expect(distancePointToPlane(proj, p1, n)).toBeCloseTo(0, 8);
  });

  it('throws when the three points are collinear', () => {
    expect(() => planeNormal(vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0))).toThrow();
  });
});

describe('planeNormal — near-vertical plane (z-component exactly 0) is not flipped', () => {
  it('normal of the plane through (0,0,0),(1,0,0),(0,0,1) is (0,-1,0), unaffected by the +z-flip rule', () => {
    // Hand-verified: cross((1,0,0)-(0,0,0), (0,0,1)-(0,0,0)) = cross((1,0,0),(0,0,1)) = (0,-1,0).
    // Its z-component is exactly 0, which is not < -EPS, so planeNormal must leave it as-is
    // rather than flipping toward +z.
    const n = planeNormal(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 0, 1));
    expect(n.x).toBeCloseTo(0, 10);
    expect(n.y).toBeCloseTo(-1, 10);
    expect(n.z).toBeCloseTo(0, 10);
  });
});

describe('line geometry', () => {
  it('distancePointToLine: point (0,5,0) to the x-axis is 5', () => {
    expect(distancePointToLine(vec3(0, 5, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toBeCloseTo(5, 10);
  });

  it('projectPointOntoLine: (3,5,0) onto the x-axis is (3,0,0)', () => {
    const proj = projectPointOntoLine(vec3(3, 5, 0), vec3(0, 0, 0), vec3(1, 0, 0));
    expect(proj.x).toBeCloseTo(3, 10);
    expect(proj.y).toBeCloseTo(0, 10);
    expect(proj.z).toBeCloseTo(0, 10);
  });
});

describe('angleBetween', () => {
  it('perpendicular vectors -> 90 degrees', () => {
    expect(angleBetween(vec3(1, 0, 0), vec3(0, 1, 0))).toBeCloseTo(90, 8);
  });
  it('parallel same-direction vectors -> 0 degrees', () => {
    expect(angleBetween(vec3(2, 0, 0), vec3(5, 0, 0))).toBeCloseTo(0, 8);
  });
  it('opposite vectors -> 180 degrees', () => {
    expect(angleBetween(vec3(1, 0, 0), vec3(-3, 0, 0))).toBeCloseTo(180, 8);
  });
});

describe('degeneracy helpers', () => {
  it('areCollinear detects collinear triples and rejects a real triangle', () => {
    expect(areCollinear(vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0))).toBe(true);
    expect(areCollinear(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0))).toBe(false);
  });

  it('arePointsCoplanar: 4 points on x+y+z=3 are coplanar; a 5th off-plane point is not', () => {
    const onPlane = [vec3(3, 0, 0), vec3(0, 3, 0), vec3(0, 0, 3), vec3(1, 1, 1)];
    expect(arePointsCoplanar(onPlane)).toBe(true);
    expect(arePointsCoplanar([...onPlane, vec3(0, 0, 0)])).toBe(false);
  });

  it('tetrahedronVolume: unit right-tetrahedron at origin has volume 1/6', () => {
    const v = tetrahedronVolume(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1));
    expect(v).toBeCloseTo(1 / 6, 10);
  });

  it('scalarTriple is zero for coplanar vectors', () => {
    expect(scalarTriple(vec3(1, 0, 0), vec3(0, 1, 0), vec3(1, 1, 0))).toBeCloseTo(0, 10);
  });
});

describe('EPS', () => {
  it('is a small positive tolerance', () => {
    expect(EPS).toBeGreaterThan(0);
    expect(EPS).toBeLessThan(1e-3);
  });
});
