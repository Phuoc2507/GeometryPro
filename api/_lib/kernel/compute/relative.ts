// api/_lib/kernel/compute/relative.ts
import { add, mul, neg, div } from '../scalar';
import { type Vec3S, subV, dotV, crossV, lenSqV, scaleV } from '../vec3s';
import type { Entity, LineE, PlaneE, SphereE, PointE } from '../entities';
import { type ComputeOutcome, firstDegenerate, isZeroS, cmpScalar } from './answer';

export type RelPosAnswer = { kind: 'relative_position'; relation: string };
const rel = (relation: string): RelPosAnswer => ({ kind: 'relative_position', relation });
const isZeroVec = (v: Vec3S) => isZeroS(lenSqV(v));

function planeSigned(pl: PlaneE, p: Vec3S) { return add(dotV(pl.n, p), pl.d); } // n·p + d
function pointOnPlane(pl: PlaneE): Vec3S { return scaleV(pl.n, div(neg(pl.d), lenSqV(pl.n))); }

function relLineLine(l1: LineE, l2: LineE): RelPosAnswer {
  const cr = crossV(l1.dir, l2.dir);
  if (isZeroVec(cr)) {
    return isZeroVec(crossV(subV(l2.p, l1.p), l1.dir)) ? rel('trùng nhau') : rel('song song');
  }
  return isZeroS(dotV(subV(l2.p, l1.p), cr)) ? rel('cắt nhau') : rel('chéo nhau');
}
function relLinePlane(l: LineE, pl: PlaneE): RelPosAnswer {
  if (!isZeroS(dotV(l.dir, pl.n))) return rel('cắt nhau');
  return isZeroS(planeSigned(pl, l.p)) ? rel('đường nằm trên mặt') : rel('song song');
}
function relPlanePlane(p1: PlaneE, p2: PlaneE): RelPosAnswer {
  if (!isZeroVec(crossV(p1.n, p2.n))) return rel('cắt nhau');
  return isZeroS(planeSigned(p2, pointOnPlane(p1))) ? rel('trùng nhau') : rel('song song');
}
function relSpherePlane(s: SphereE, pl: PlaneE): RelPosAnswer {
  const signed = planeSigned(pl, s.center);
  const dSq = div(mul(signed, signed), lenSqV(pl.n));
  const c = cmpScalar(dSq, s.r2);
  return rel(c < 0 ? 'cắt theo đường tròn' : c === 0 ? 'tiếp xúc' : 'rời nhau');
}
function relPointSphere(pt: PointE, s: SphereE): RelPosAnswer {
  const c = cmpScalar(lenSqV(subV(pt.p, s.center)), s.r2);
  return rel(c < 0 ? 'điểm nằm trong' : c === 0 ? 'điểm nằm trên' : 'điểm nằm ngoài');
}
function relSphereLine(s: SphereE, l: LineE): RelPosAnswer {
  // d(tâm, đường)² so với R²
  const cr = crossV(subV(s.center, l.p), l.dir);
  const dSq = div(lenSqV(cr), lenSqV(l.dir));
  const c = cmpScalar(dSq, s.r2);
  return rel(c < 0 ? 'cắt nhau' : c === 0 ? 'tiếp xúc' : 'rời nhau');
}

export function computeRelativePosition(a: Entity, b: Entity): ComputeOutcome<RelPosAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'line-line': return { ok: true, answer: relLineLine(a as LineE, b as LineE) };
    case 'line-plane': return { ok: true, answer: relLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: relLinePlane(b as LineE, a as PlaneE) };
    case 'plane-plane': return { ok: true, answer: relPlanePlane(a as PlaneE, b as PlaneE) };
    case 'sphere-plane': return { ok: true, answer: relSpherePlane(a as SphereE, b as PlaneE) };
    case 'plane-sphere': return { ok: true, answer: relSpherePlane(b as SphereE, a as PlaneE) };
    case 'point-sphere': return { ok: true, answer: relPointSphere(a as PointE, b as SphereE) };
    case 'sphere-point': return { ok: true, answer: relPointSphere(b as PointE, a as SphereE) };
    case 'sphere-line': return { ok: true, answer: relSphereLine(a as SphereE, b as LineE) };
    case 'line-sphere': return { ok: true, answer: relSphereLine(b as SphereE, a as LineE) };
    default: return { ok: false, problem: `relative position not supported for ${key}` };
  }
}
