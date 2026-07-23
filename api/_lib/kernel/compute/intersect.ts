// api/_lib/kernel/compute/intersect.ts
import { type Scalar, add, sub, mul, neg, div, rat, sqrt } from '../scalar';
import { type Vec3S, subV, addV, dotV, crossV, lenSqV, scaleV } from '../vec3s';
import { type PointE, type LineE, pointFromCoords } from '../entities';
import type { Entity, PlaneE, SphereE } from '../entities';
import { type ComputeOutcome, firstDegenerate, isZeroS, cmpScalar } from './answer';

export type IntersectionAnswer = {
  kind: 'intersection';
  result: 'point' | 'line' | 'circle' | 'tangent-point' | 'segment' | 'none' | 'coincident' | 'parallel';
  point?: PointE;
  point2?: PointE;
  line?: LineE;
  circle?: { center: PointE; r2: Scalar };
  chord?: Scalar; // độ dài dây cung line∩sphere (exact khi ở trong trường)
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

// Đường P(t)=A+t·dir cắt cầu (tâm C, r²). Thế vào |P−C|²=r²:
//   a·t² + b·t + c = 0, a=|dir|², b=2(w·dir), c=|w|²−r², w=A−C.
// Δ<0 rời · Δ=0 tiếp xúc · Δ>0 cắt (2 điểm). Toạ độ giao điểm nói chung là nhị thức căn
// (rời trường một-căn ⇒ exact=null, số) NHƯNG chord=√(Δ/a) là số dưới một căn ⇒ exact được.
function iLineSphere(l: LineE, s: SphereE): IntersectionAnswer {
  const w = subV(l.p, s.center);
  const a = lenSqV(l.dir);
  const b = mul(rat(2n), dotV(w, l.dir));
  const c = sub(lenSqV(w), s.r2);
  const disc = sub(mul(b, b), mul(mul(rat(4n), a), c));
  const cmp = cmpScalar(disc, rat(0n));
  if (cmp < 0) return { kind: 'intersection', result: 'none' };
  const twoA = mul(rat(2n), a);
  if (cmp === 0) {
    const t = neg(div(b, twoA));
    return { kind: 'intersection', result: 'tangent-point', point: pointFromCoords(addV(l.p, scaleV(l.dir, t))) };
  }
  const sq = sqrt(disc);
  const t1 = div(sub(neg(b), sq), twoA);
  const t2 = div(add(neg(b), sq), twoA);
  return {
    kind: 'intersection', result: 'segment',
    point: pointFromCoords(addV(l.p, scaleV(l.dir, t1))),
    point2: pointFromCoords(addV(l.p, scaleV(l.dir, t2))),
    chord: sqrt(div(disc, a)),
  };
}

// Đường×đường (exact): cross = dir1×dir2. |cross|²=0 ⇒ song song/trùng — phân biệt bằng (p2−p1)×dir1.
// Ngược lại xét đồng phẳng qua tích hỗn tạp (p2−p1)·cross: ≠0 ⇒ CHÉO (none); =0 ⇒ CẮT tại
// t = ((p2−p1)×dir2)·cross / |cross|², điểm = p1 + t·dir1. Toàn bộ trên số hữu tỉ exact.
function iLineLine(l1: LineE, l2: LineE): IntersectionAnswer {
  const cross = crossV(l1.dir, l2.dir);
  const w = subV(l2.p, l1.p); // p2 − p1
  if (isZeroS(lenSqV(cross))) {
    return isZeroS(lenSqV(crossV(w, l1.dir)))
      ? { kind: 'intersection', result: 'coincident' }
      : { kind: 'intersection', result: 'parallel' };
  }
  if (!isZeroS(dotV(w, cross))) return { kind: 'intersection', result: 'none' }; // chéo nhau (3D)
  const t = div(dotV(crossV(w, l2.dir), cross), lenSqV(cross));
  return { kind: 'intersection', result: 'point', point: pointFromCoords(addV(l1.p, scaleV(l1.dir, t))) };
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
    case 'line-sphere': return { ok: true, answer: iLineSphere(a as LineE, b as SphereE) };
    case 'sphere-line': return { ok: true, answer: iLineSphere(b as LineE, a as SphereE) };
    case 'line-line': return { ok: true, answer: iLineLine(a as LineE, b as LineE) };
    default: return { ok: false, problem: `intersection not supported for ${key}` };
  }
}
