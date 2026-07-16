// api/_lib/kernel/compute/intersect.ts
import { type Scalar, add, sub, mul, neg, div } from '../scalar';
import { type Vec3S, subV, addV, dotV, crossV, lenSqV, scaleV } from '../vec3s';
import { type PointE, type LineE, pointFromCoords } from '../entities';
import type { Entity, PlaneE, SphereE } from '../entities';
import { type ComputeOutcome, firstDegenerate, isZeroS, cmpScalar } from './answer';

export type IntersectionAnswer = {
  kind: 'intersection';
  result: 'point' | 'line' | 'circle' | 'tangent-point' | 'none' | 'coincident' | 'parallel';
  point?: PointE;
  line?: LineE;
  circle?: { center: PointE; r2: Scalar };
};

function planeSigned(pl: PlaneE, p: Vec3S) { return add(dotV(pl.n, p), pl.d); }
function pointOnPlane(pl: PlaneE): Vec3S { return scaleV(pl.n, div(neg(pl.d), lenSqV(pl.n))); }

function iLinePlane(l: LineE, pl: PlaneE): IntersectionAnswer {
  const dn = dotV(l.dir, pl.n);
  if (isZeroS(dn)) {
    return isZeroS(planeSigned(pl, l.p))
      ? { kind: 'intersection', result: 'coincident' }
      : { kind: 'intersection', result: 'parallel' };
  }
  const t = neg(div(planeSigned(pl, l.p), dn)); // t = −(n·A+d)/(n·dir)
  return { kind: 'intersection', result: 'point', point: pointFromCoords(addV(l.p, scaleV(l.dir, t))) };
}

function iPlanePlane(p1: PlaneE, p2: PlaneE): IntersectionAnswer {
  const u = crossV(p1.n, p2.n);
  if (isZeroS(lenSqV(u))) {
    return isZeroS(planeSigned(p2, pointOnPlane(p1)))
      ? { kind: 'intersection', result: 'coincident' }
      : { kind: 'intersection', result: 'parallel' };
  }
  // Điểm p = α·n1 + β·n2 thoả n1·p=−d1, n2·p=−d2. det = |n1|²|n2|² − (n1·n2)² = |u|².
  const n1n1 = lenSqV(p1.n), n2n2 = lenSqV(p2.n), n1n2 = dotV(p1.n, p2.n), det = lenSqV(u);
  const alpha = div(add(neg(mul(p1.d, n2n2)), mul(p2.d, n1n2)), det);
  const beta = div(add(neg(mul(p2.d, n1n1)), mul(p1.d, n1n2)), det);
  const p = addV(scaleV(p1.n, alpha), scaleV(p2.n, beta));
  return { kind: 'intersection', result: 'line', line: { kind: 'line', p, dir: u } };
}

function iSpherePlane(s: SphereE, pl: PlaneE): IntersectionAnswer {
  const signed = planeSigned(pl, s.center);
  const dSq = div(mul(signed, signed), lenSqV(pl.n));
  const c = cmpScalar(dSq, s.r2);
  if (c > 0) return { kind: 'intersection', result: 'none' };
  const foot = subV(s.center, scaleV(pl.n, div(signed, lenSqV(pl.n)))); // chân đường vuông góc từ tâm
  if (c === 0) return { kind: 'intersection', result: 'tangent-point', point: pointFromCoords(foot) };
  return { kind: 'intersection', result: 'circle', circle: { center: pointFromCoords(foot), r2: sub(s.r2, dSq) } };
}

export function computeIntersection(a: Entity, b: Entity): ComputeOutcome<IntersectionAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'line-plane': return { ok: true, answer: iLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: iLinePlane(b as LineE, a as PlaneE) };
    case 'plane-plane': return { ok: true, answer: iPlanePlane(a as PlaneE, b as PlaneE) };
    case 'sphere-plane': return { ok: true, answer: iSpherePlane(a as SphereE, b as PlaneE) };
    case 'plane-sphere': return { ok: true, answer: iSpherePlane(b as SphereE, a as PlaneE) };
    default: return { ok: false, problem: `intersection not supported for ${key}` };
  }
}
