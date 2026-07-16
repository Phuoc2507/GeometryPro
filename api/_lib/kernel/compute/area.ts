// api/_lib/kernel/compute/area.ts
import { type Scalar, mul, sqrt, rat } from '../scalar';
import { subV, crossV, lenSqV, addV, ratVec, toApproxVec } from '../vec3s';
import type { PointE } from '../entities';
import { sub, cross, length, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type ScalarAnswer, certifyScalar, coplanarityProblem } from './answer';

const av = toApproxVec;

// S = (1/2)|u×v| ⇒ S² = (1/4)|u×v|² (ở trong trường: |·|² hữu tỷ → sqrt → căn).
export function triangleAreaScalar(a: PointE, b: PointE, c: PointE): Scalar {
  const cr = crossV(subV(b.p, a.p), subV(c.p, a.p));
  return sqrt(mul(rat(1n, 4n), lenSqV(cr)));
}

// Vector-area đa giác phẳng: 2·S·n̂ = Σ Vi × V(i+1) (khép kín ⇒ độc lập gốc). S²=(1/4)|Σ|².
export function polygonAreaScalar(pts: PointE[]): Scalar {
  const n = pts.length;
  let sum = ratVec(0n, 0n, 0n);
  for (let i = 0; i < n; i++) sum = addV(sum, crossV(pts[i].p, pts[(i + 1) % n].p));
  return sqrt(mul(rat(1n, 4n), lenSqV(sum)));
}

function fTriangle(a: Vec3, b: Vec3, c: Vec3): number {
  return length(cross(sub(b, a), sub(c, a))) / 2;
}
function fPolygon(pts: Vec3[]): number {
  const n = pts.length;
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < n; i++) {
    const cr = cross(pts[i], pts[(i + 1) % n]);
    sx += cr.x; sy += cr.y; sz += cr.z;
  }
  return length({ x: sx, y: sy, z: sz }) / 2;
}

export function computeTriangleArea(a: PointE, b: PointE, c: PointE): ComputeOutcome<ScalarAnswer> {
  return { ok: true, answer: certifyScalar('area', triangleAreaScalar(a, b, c), fTriangle(av(a.p), av(b.p), av(c.p))) };
}
export function computePolygonArea(pts: PointE[]): ComputeOutcome<ScalarAnswer> {
  if (pts.length < 3) return { ok: false, problem: 'polygon needs at least 3 vertices' };
  // Tiền-điều-kiện: đa giác phải PHẲNG (self-cert không bắt được vì float ref cùng công thức).
  const cp = coplanarityProblem(pts.map((p) => p.p), 'polygon');
  if (cp) return { ok: false, problem: cp };
  return { ok: true, answer: certifyScalar('area', polygonAreaScalar(pts), fPolygon(pts.map((p) => av(p.p)))) };
}
