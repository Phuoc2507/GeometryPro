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
  const cross12 = cross(d1, d2);
  const denom = dot(cross12, cross12);
  if (denom < EPS) {
    throw new Error('Lines are parallel; no unique intersection point exists');
  }
  const scaleRef = Math.max(1, length(d1), length(d2), length(r));
  if (Math.abs(dot(r, cross12)) > EPS * scaleRef) {
    throw new Error('Lines are skew (not coplanar); no intersection point exists');
  }
  const t = dot(cross(r, d2), cross12) / denom;
  return add(a1, scale(d1, t));
}

export function intersectLinePlane(a: Vec3, b: Vec3, planePositions: Vec3[]): Vec3 {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  const d = sub(b, a);
  const denom = dot(n, d);
  if (Math.abs(denom) < EPS) {
    throw new Error('Line is parallel to the plane; no unique intersection point exists');
  }
  const t = dot(n, sub(p1, a)) / denom;
  return add(a, scale(d, t));
}
