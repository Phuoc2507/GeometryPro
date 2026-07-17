// api/_lib/kernel/compute/angle.ts
import { type Scalar, mul, div, sqrt } from '../scalar';
import { type Vec3S, dotV, lenSqV, toApproxVec } from '../vec3s';
import type { Entity, LineE, PlaneE } from '../entities';
import { dot, length, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type AngleAnswer, firstDegenerate, certifyAngle } from './answer';

const av = toApproxVec;

// |cos θ| giữa hai vector u,v = √( (u·v)² / (|u|²|v|²) ), θ ∈ [0,90]. Ở trong trường (đường
// distSq hữu tỷ → sqrt), là giá trị chứng nhận exact cho cos (đường-đường/nhị diện) hoặc
// sin (đường-mặt).
function absCosOf(u: Vec3S, v: Vec3S): Scalar {
  const d = dotV(u, v);
  return sqrt(div(mul(d, d), mul(lenSqV(u), lenSqV(v))));
}

// |cos| tính ĐỘC LẬP bằng float (để self-certificate cho góc, như certifyDistance).
function fAbsCos(u: Vec3, v: Vec3): number {
  return Math.abs(dot(u, v)) / (length(u) * length(v));
}

function aLineLine(l1: LineE, l2: LineE): AngleAnswer {
  return certifyAngle(absCosOf(l1.dir, l2.dir), fAbsCos(av(l1.dir), av(l2.dir)), false);
}
function aPlanePlane(p1: PlaneE, p2: PlaneE): AngleAnswer {
  // góc nhị diện (nhọn) = góc giữa hai pháp tuyến
  return certifyAngle(absCosOf(p1.n, p2.n), fAbsCos(av(p1.n), av(p2.n)), false);
}
function aLinePlane(l: LineE, pl: PlaneE): AngleAnswer {
  // góc đường–mặt = 90° − góc(dir, pháp tuyến); metric = |cos(dir, n)| = |sin(góc)|.
  return certifyAngle(absCosOf(l.dir, pl.n), fAbsCos(av(l.dir), av(pl.n)), true);
}

export function computeAngle(a: Entity, b: Entity): ComputeOutcome<AngleAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'line-line': return { ok: true, answer: aLineLine(a as LineE, b as LineE) };
    case 'plane-plane': return { ok: true, answer: aPlanePlane(a as PlaneE, b as PlaneE) };
    case 'line-plane': return { ok: true, answer: aLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: aLinePlane(b as LineE, a as PlaneE) };
    default: return { ok: false, problem: `angle not supported for ${key}` };
  }
}
