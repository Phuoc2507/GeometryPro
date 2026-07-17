// api/_lib/kernel/compute/distance.ts
import { type Scalar, add, mul, div, neg, sqrt, rat, num } from '../scalar';
import { type Vec3S, subV, dotV, crossV, lenSqV, scaleV, toApproxVec } from '../vec3s';
import type { Entity, PointE, LineE, PlaneE, SphereE } from '../entities';
import { sub, dot, cross, length, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type DistanceAnswer, EPS, firstDegenerate, certifyDistance, isZeroS } from './answer';

const av = toApproxVec;
function pt(p: Vec3S): PointE { return { kind: 'point', p }; }

// ---- công thức exact (đường distSq hữu tỷ → sqrt) ----
function sqPointPoint(a: Vec3S, b: Vec3S): Scalar { return lenSqV(subV(a, b)); }
function sqPointLine(p: Vec3S, l: LineE): Scalar {
  return div(lenSqV(crossV(subV(p, l.p), l.dir)), lenSqV(l.dir));
}
function sqPointPlane(p: Vec3S, pl: PlaneE): Scalar {
  const signed = add(dotV(pl.n, p), pl.d); // n·p + d
  return div(mul(signed, signed), lenSqV(pl.n));
}

// ---- float độc lập (self-certificate) ----
function fPointPoint(a: Vec3, b: Vec3): number { return length(sub(a, b)); }
function fPointLine(p: Vec3, a: Vec3, dir: Vec3): number {
  return length(cross(sub(p, a), dir)) / length(dir);
}
function fPointPlane(p: Vec3, n: Vec3, d: number): number {
  return Math.abs(dot(n, p) + d) / length(n);
}
function fLineLine(a1: Vec3, d1: Vec3, a2: Vec3, d2: Vec3): number {
  const cr = cross(d1, d2);
  const cl = length(cr);
  if (cl < EPS) return fPointLine(a2, a1, d1); // song song
  return Math.abs(dot(sub(a2, a1), cr)) / cl;
}

// ---- dispatcher từng cặp ----
function dPointPoint(a: PointE, b: PointE): DistanceAnswer {
  return certifyDistance(sqrt(sqPointPoint(a.p, b.p)), fPointPoint(av(a.p), av(b.p)));
}
function dPointLine(a: PointE, l: LineE): DistanceAnswer {
  return certifyDistance(sqrt(sqPointLine(a.p, l)), fPointLine(av(a.p), av(l.p), av(l.dir)));
}
function dPointPlane(a: PointE, pl: PlaneE): DistanceAnswer {
  return certifyDistance(sqrt(sqPointPlane(a.p, pl)), fPointPlane(av(a.p), av(pl.n), pl.d.approx));
}
function dLineLine(l1: LineE, l2: LineE): DistanceAnswer {
  const cr = crossV(l1.dir, l2.dir);
  if (isZeroS(lenSqV(cr))) return dPointLine(pt(l1.p), l2); // song song → điểm–đường
  const r = subV(l2.p, l1.p);
  const triple = dotV(r, cr);
  const distSq = div(mul(triple, triple), lenSqV(cr));
  return certifyDistance(sqrt(distSq), fLineLine(av(l1.p), av(l1.dir), av(l2.p), av(l2.dir)));
}
function dLinePlane(l: LineE, pl: PlaneE): DistanceAnswer {
  if (!isZeroS(dotV(l.dir, pl.n))) return certifyDistance(rat(0n), 0); // cắt nhau
  return dPointPlane(pt(l.p), pl); // song song → điểm–mặt
}
function dPlanePlane(p1: PlaneE, p2: PlaneE): DistanceAnswer {
  if (!isZeroS(lenSqV(crossV(p1.n, p2.n)))) return certifyDistance(rat(0n), 0); // cắt nhau
  const pointOnP1 = scaleV(p1.n, div(neg(p1.d), lenSqV(p1.n))); // chân đường vuông góc từ O
  return dPointPlane(pt(pointOnP1), p2);
}
function dPointSphere(p: PointE, s: SphereE): DistanceAnswer {
  const pc = Math.sqrt(lenSqV(subV(p.p, s.center)).approx);
  const R = Math.sqrt(s.r2.approx);
  const d = Math.abs(pc - R);
  return certifyDistance(num(d), d); // exact rời trường ⇒ approximate
}

export function computeDistance(a: Entity, b: Entity): ComputeOutcome<DistanceAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'point-point': return { ok: true, answer: dPointPoint(a as PointE, b as PointE) };
    case 'point-line': return { ok: true, answer: dPointLine(a as PointE, b as LineE) };
    case 'line-point': return { ok: true, answer: dPointLine(b as PointE, a as LineE) };
    case 'point-plane': return { ok: true, answer: dPointPlane(a as PointE, b as PlaneE) };
    case 'plane-point': return { ok: true, answer: dPointPlane(b as PointE, a as PlaneE) };
    case 'line-line': return { ok: true, answer: dLineLine(a as LineE, b as LineE) };
    case 'line-plane': return { ok: true, answer: dLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: dLinePlane(b as LineE, a as PlaneE) };
    case 'plane-plane': return { ok: true, answer: dPlanePlane(a as PlaneE, b as PlaneE) };
    case 'point-sphere': return { ok: true, answer: dPointSphere(a as PointE, b as SphereE) };
    case 'sphere-point': return { ok: true, answer: dPointSphere(b as PointE, a as SphereE) };
    default: return { ok: false, problem: `distance not supported for ${key}` };
  }
}
