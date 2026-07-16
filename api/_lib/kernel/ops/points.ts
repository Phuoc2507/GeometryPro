import {
  type Vec3, add, sub, scale, dot, cross, length, planeNormal,
  projectPointOntoPlane, projectPointOntoLine, EPS,
} from '../vecMath';

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

export function centroidPoint(points: Vec3[]): Vec3 {
  const sum = points.reduce((acc, p) => add(acc, p), { x: 0, y: 0, z: 0 });
  return scale(sum, 1 / points.length);
}

export function ratioPoint(from: Vec3, to: Vec3, t: number): Vec3 {
  return add(from, scale(sub(to, from), t));
}

export function reflectPoint(point: Vec3, about: Vec3): Vec3 {
  return sub(scale(about, 2), point);
}

/** perp_point: the new point is `fromPos` moved `length` along the normal of `planePositions`. */
export function perpPointFromPlane(fromPos: Vec3, planePositions: Vec3[], length_: number): Vec3 {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  return add(fromPos, scale(n, length_));
}

export function footOnPlane(fromPos: Vec3, planePositions: Vec3[]): Vec3 {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  return projectPointOntoPlane(fromPos, p1, n);
}

export function footOnLine(fromPos: Vec3, a: Vec3, b: Vec3): Vec3 {
  return projectPointOntoLine(fromPos, a, b);
}

export function intersectLineLine(a1: Vec3, a2: Vec3, b1: Vec3, b2: Vec3): Vec3 {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const r = sub(b1, a1);
  const l1 = length(d1);
  const l2 = length(d2);
  if (l1 < EPS || l2 < EPS) {
    throw new Error('Degenerate line: a direction is zero-length (its two points coincide)');
  }
  const cross12 = cross(d1, d2);
  const denom = dot(cross12, cross12);
  // Parallel test on sin(angle) = |d1×d2|/(|d1||d2|), a dimensionless quantity, so the test
  // is scale-invariant (the raw |d1×d2|² has units of length⁴).
  if (length(cross12) / (l1 * l2) < EPS) {
    throw new Error('Lines are parallel; no unique intersection point exists');
  }
  const rlen = length(r);
  // Skew test on the normalized scalar triple |r·(d1×d2)|/(|r||d1||d2|) — a dimensionless
  // volume ratio. Skip when b1 coincides with a1 (the lines already share a point).
  if (rlen > EPS && Math.abs(dot(r, cross12)) / (rlen * l1 * l2) > EPS) {
    throw new Error('Lines are skew (not coplanar); no intersection point exists');
  }
  const t = dot(cross(r, d2), cross12) / denom;
  return add(a1, scale(d1, t));
}

export function intersectLinePlane(a: Vec3, b: Vec3, planePositions: Vec3[]): Vec3 {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  const d = sub(b, a);
  const dlen = length(d);
  if (dlen < EPS) {
    throw new Error('Degenerate line: its two points coincide (zero-length direction)');
  }
  const denom = dot(n, d);
  // n is a unit normal, so |denom|/|d| = |cos(angle between the line and the normal)| — a
  // dimensionless parallelism test independent of the line segment's length.
  if (Math.abs(denom) / dlen < EPS) {
    throw new Error('Line is parallel to the plane; no unique intersection point exists');
  }
  const t = dot(n, sub(p1, a)) / denom;
  return add(a, scale(d, t));
}
