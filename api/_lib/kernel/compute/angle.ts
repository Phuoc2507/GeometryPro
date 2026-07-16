// api/_lib/kernel/compute/angle.ts
import { type Scalar, mul, div, sqrt } from '../scalar';
import { type Vec3S, dotV, lenSqV } from '../vec3s';
import type { Entity, LineE, PlaneE } from '../entities';
import { type ComputeOutcome, type AngleAnswer, firstDegenerate, certifyAngle } from './answer';

// |cos θ| giữa hai vector u,v = √( (u·v)² / (|u|²|v|²) ), θ ∈ [0,90]. Ở trong trường (đường
// distSq hữu tỷ → sqrt), là giá trị chứng nhận exact cho cos (đường-đường/nhị diện) hoặc
// sin (đường-mặt).
function absCosOf(u: Vec3S, v: Vec3S): Scalar {
  const d = dotV(u, v);
  return sqrt(div(mul(d, d), mul(lenSqV(u), lenSqV(v))));
}

function degFromMetric(metricApprox: number): number {
  return (Math.acos(Math.min(1, Math.abs(metricApprox))) * 180) / Math.PI;
}

function aLineLine(l1: LineE, l2: LineE): AngleAnswer {
  const cosAbs = absCosOf(l1.dir, l2.dir);
  return certifyAngle(cosAbs, degFromMetric(cosAbs.approx));
}
function aPlanePlane(p1: PlaneE, p2: PlaneE): AngleAnswer {
  const cosAbs = absCosOf(p1.n, p2.n); // góc nhị diện = góc giữa hai pháp tuyến (nhọn)
  return certifyAngle(cosAbs, degFromMetric(cosAbs.approx));
}
function aLinePlane(l: LineE, pl: PlaneE): AngleAnswer {
  // sin(góc đường–mặt) = |cos(dir, pháp tuyến)|; góc = 90° − góc(dir, n).
  const sinAbs = absCosOf(l.dir, pl.n);
  const deg = 90 - degFromMetric(sinAbs.approx);
  return certifyAngle(sinAbs, deg);
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
