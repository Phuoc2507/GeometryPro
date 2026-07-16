// api/_lib/kernel/compute/volume.ts
import { type Scalar, div, neg, rat, add } from '../scalar';
import { type Vec3S, subV, dotV, crossV, toApproxVec } from '../vec3s';
import type { PointE } from '../entities';
import { sub, scalarTriple, tetrahedronVolume, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type ScalarAnswer, certifyScalar } from './answer';

const av = toApproxVec;

// ×6 thể tích có dấu của tứ diện (a,b,c,d) = tích hỗn tạp (b−a, c−a, d−a).
function tripleScalar(a: Vec3S, b: Vec3S, c: Vec3S, d: Vec3S): Scalar {
  return dotV(subV(b, a), crossV(subV(c, a), subV(d, a)));
}
function absS(s: Scalar): Scalar {
  return s.approx < 0 ? neg(s) : s;
}

export function tetraVolumeScalar(a: PointE, b: PointE, c: PointE, d: PointE): Scalar {
  return div(absS(tripleScalar(a.p, b.p, c.p, d.p)), rat(6n));
}

export function pyramidVolumeScalar(base: PointE[], apex: PointE): Scalar {
  let sum = rat(0n);
  for (let i = 1; i < base.length - 1; i++) {
    sum = add(sum, tripleScalar(base[0].p, base[i].p, base[i + 1].p, apex.p));
  }
  return div(absS(sum), rat(6n));
}

function fPyramid(base: Vec3[], apex: Vec3): number {
  let s = 0;
  for (let i = 1; i < base.length - 1; i++) {
    s += scalarTriple(sub(base[i], base[0]), sub(base[i + 1], base[0]), sub(apex, base[0]));
  }
  return Math.abs(s) / 6;
}

export function computeTetraVolume(a: PointE, b: PointE, c: PointE, d: PointE): ComputeOutcome<ScalarAnswer> {
  const floatRef = tetrahedronVolume(av(a.p), av(b.p), av(c.p), av(d.p));
  return { ok: true, answer: certifyScalar('volume', tetraVolumeScalar(a, b, c, d), floatRef) };
}

export function computePyramidVolume(base: PointE[], apex: PointE): ComputeOutcome<ScalarAnswer> {
  if (base.length < 3) return { ok: false, problem: 'pyramid base needs at least 3 vertices' };
  const floatRef = fPyramid(base.map((p) => av(p.p)), av(apex.p));
  return { ok: true, answer: certifyScalar('volume', pyramidVolumeScalar(base, apex), floatRef) };
}

export function volumeRatio(a: Scalar, b: Scalar): ComputeOutcome<ScalarAnswer> {
  if (Math.abs(b.approx) < 1e-12) return { ok: false, problem: 'volume ratio: denominator volume is zero' };
  return { ok: true, answer: certifyScalar('ratio', div(a, b), a.approx / b.approx) };
}
