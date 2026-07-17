export type Vec3 = { x: number; y: number; z: number };

export const EPS = 1e-6;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (len < EPS) throw new Error('Cannot normalize a zero-length vector');
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return add(a, scale(sub(b, a), t));
}

export function centroidOf(points: Vec3[]): Vec3 {
  if (points.length === 0) throw new Error('Cannot compute centroid of an empty point list');
  const sum = points.reduce((acc, p) => add(acc, p), vec3(0, 0, 0));
  return scale(sum, 1 / points.length);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

/**
 * Unit normal of the plane through p1,p2,p3, flipped toward +z when the
 * plane isn't (near-)vertical. This disambiguates "which side" for
 * perp_point on the common z=0 base-plane case; for planes where z ~ 0
 * (vertical planes) the sign is not semantically meaningful anyway, since
 * dot-product-based perp/parallel checks are sign-invariant.
 */
export function planeNormal(p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {
  const n = cross(sub(p2, p1), sub(p3, p1));
  const len = length(n);
  if (len < EPS) throw new Error('Cannot compute a plane normal: the three points are collinear');
  let unit = scale(n, 1 / len);
  if (unit.z < -EPS) unit = scale(unit, -1);
  return unit;
}

export function distancePointToPlane(p: Vec3, planePoint: Vec3, normal: Vec3): number {
  return Math.abs(dot(sub(p, planePoint), normal));
}

export function projectPointOntoPlane(p: Vec3, planePoint: Vec3, normal: Vec3): Vec3 {
  const d = dot(sub(p, planePoint), normal);
  return sub(p, scale(normal, d));
}

export function distancePointToLine(p: Vec3, a: Vec3, b: Vec3): number {
  const d = normalize(sub(b, a));
  const ap = sub(p, a);
  const proj = scale(d, dot(ap, d));
  return length(sub(ap, proj));
}

export function projectPointOntoLine(p: Vec3, a: Vec3, b: Vec3): Vec3 {
  const d = normalize(sub(b, a));
  const t = dot(sub(p, a), d);
  return add(a, scale(d, t));
}

/** Angle in degrees between two vectors, result in [0,180]. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const la = length(a);
  const lb = length(b);
  if (la < EPS || lb < EPS) {
    throw new Error('Cannot measure an angle with a zero-length (degenerate) vector');
  }
  const cosT = dot(a, b) / (la * lb);
  const clamped = Math.max(-1, Math.min(1, cosT));
  return (Math.acos(clamped) * 180) / Math.PI;
}

export function scalarTriple(a: Vec3, b: Vec3, c: Vec3): number {
  return dot(a, cross(b, c));
}

export function areCollinear(a: Vec3, b: Vec3, c: Vec3, eps = EPS): boolean {
  const u = sub(b, a);
  const v = sub(c, a);
  const lu = length(u);
  const lv = length(v);
  // A coincident point makes the triple degenerate ⇒ treat as collinear.
  if (lu < EPS || lv < EPS) return true;
  // Compare sin(angle) = |u×v|/(|u||v|), a dimensionless quantity, against the tolerance —
  // the raw cross-product magnitude has units of area and is not scale-invariant.
  return length(cross(u, v)) / (lu * lv) < eps;
}

export function arePointsCoplanar(points: Vec3[], eps = EPS): boolean {
  if (points.length <= 3) return true;
  const p0 = points[0];
  // Build the reference plane from the FIRST non-collinear triple, not blindly from
  // indices 0,1,2 — the caller may list points that share an edge/line first, which
  // would make planeNormal(p0,p1,p2) throw even though the whole set is coplanar.
  let normal: Vec3 | null = null;
  for (let i = 1; i < points.length - 1 && !normal; i++) {
    for (let j = i + 1; j < points.length; j++) {
      try {
        normal = planeNormal(p0, points[i], points[j]);
        break;
      } catch {
        // collinear triple — keep searching
      }
    }
  }
  // No non-collinear triple exists ⇒ every point lies on a single line ⇒ trivially coplanar.
  if (!normal) return true;
  return points.every((p) => distancePointToPlane(p, p0, normal!) < eps);
}

export function tetrahedronVolume(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  return Math.abs(scalarTriple(sub(b, a), sub(c, a), sub(d, a))) / 6;
}
