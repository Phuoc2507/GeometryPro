// api/_lib/kernel/entities.ts
import { type Scalar, rat, add, sub, mul, neg } from './scalar';
import { type Vec3S, subV, dotV, crossV, lenSqV } from './vec3s';

export type PointE = { kind: 'point'; p: Vec3S };
// INVARIANT for the compute layer (G2-3): `dir` and `n` are NOT unit vectors and are NOT
// sign/scale-canonical — a true unit vector would leave the rational+surd field (length is a
// surd), which is why vec3s only exposes lenSqV, not lenV. Therefore any metric formula MUST
// use squared-magnitude forms (e.g. distance-to-plane |n·x+d|²/|n|²), and any equality test
// between two lines/planes MUST compare up to a scalar multiple, never field-by-field.
export type LineE = { kind: 'line'; p: Vec3S; dir: Vec3S };
export type PlaneE = { kind: 'plane'; n: Vec3S; d: Scalar };
// `r2` is the squared radius (kept in-field); the radius itself is a surd. R² ≤ 0 (imaginary
// or point sphere) is representable and MUST be validated by the compute layer, not here.
export type SphereE = { kind: 'sphere'; center: Vec3S; r2: Scalar };
export type Entity = PointE | LineE | PlaneE | SphereE;

export function pointFromCoords(p: Vec3S): PointE {
  return { kind: 'point', p };
}

export function lineFromTwoPoints(a: Vec3S, b: Vec3S): LineE {
  return { kind: 'line', p: a, dir: subV(b, a) };
}

export function lineFromPointDir(p: Vec3S, dir: Vec3S): LineE {
  return { kind: 'line', p, dir };
}

// Mặt qua 3 điểm: pháp tuyến = (B−A)×(C−A), d = −n·A.
export function planeFromThreePoints(a: Vec3S, b: Vec3S, c: Vec3S): PlaneE {
  const n = crossV(subV(b, a), subV(c, a));
  const d = neg(dotV(n, a));
  return { kind: 'plane', n, d };
}

export function planeFromPointNormal(point: Vec3S, n: Vec3S): PlaneE {
  return { kind: 'plane', n, d: neg(dotV(n, point)) };
}

export function planeFromCoeffs(a: Scalar, b: Scalar, c: Scalar, d: Scalar): PlaneE {
  return { kind: 'plane', n: { x: a, y: b, z: c }, d };
}

export function sphereFromCenterRadius2(center: Vec3S, r2: Scalar): SphereE {
  return { kind: 'sphere', center, r2 };
}

export function sphereFromCenterPoint(center: Vec3S, onSphere: Vec3S): SphereE {
  return { kind: 'sphere', center, r2: lenSqV(subV(onSphere, center)) };
}

// Mặt cầu từ phương trình x²+y²+z² + a·x + b·y + c·z + d = 0.
// Tâm = (−a/2, −b/2, −c/2); R² = (a²+b²+c²)/4 − d = tâm.x²+tâm.y²+tâm.z² − d.
export function sphereFromEquation(a: Scalar, b: Scalar, c: Scalar, d: Scalar): SphereE {
  const half = rat(1n, 2n);
  const cx = neg(mul(a, half));
  const cy = neg(mul(b, half));
  const cz = neg(mul(c, half));
  const center = { x: cx, y: cy, z: cz };
  const r2 = sub(add(add(mul(cx, cx), mul(cy, cy)), mul(cz, cz)), d);
  return { kind: 'sphere', center, r2 };
}
