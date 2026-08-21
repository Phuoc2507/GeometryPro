// api/_lib/kernel/compute/volume.ts
import { type Scalar, div, neg, rat, add, mul, sqrt } from '../scalar';
import { type Vec3S, subV, dotV, crossV, toApproxVec } from '../vec3s';
import type { PointE, SphereE } from '../entities';
import { sub, scalarTriple, tetrahedronVolume, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type ScalarAnswer, certifyScalar, coplanarityProblem, isZeroS, piScalarAnswer } from './answer';

const av = toApproxVec;

// ×6 thể tích có dấu của tứ diện (a,b,c,d) = tích hỗn tạp (b−a, c−a, d−a).
function tripleScalar(a: Vec3S, b: Vec3S, c: Vec3S, d: Vec3S): Scalar {
  return dotV(subV(b, a), crossV(subV(c, a), subV(d, a)));
}
// Lấy dấu từ EXACT khi có (float có thể làm tròn ngược dấu ở ca gần suy biến).
function absS(s: Scalar): Scalar {
  return s.exact !== null ? (s.exact.num < 0n ? neg(s) : s) : (s.approx < 0 ? neg(s) : s);
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
  // Tiền-điều-kiện: đáy phải PHẲNG (tổng tứ diện có dấu vô nghĩa nếu đáy không phẳng).
  const cp = coplanarityProblem(base.map((p) => p.p), 'pyramid base');
  if (cp) return { ok: false, problem: cp };
  const floatRef = fPyramid(base.map((p) => av(p.p)), av(apex.p));
  return { ok: true, answer: certifyScalar('volume', pyramidVolumeScalar(base, apex), floatRef) };
}

// ×6 tổng thể tích có dấu của lăng trụ: xẻ đáy thành quạt tam giác (b0,bi,bi+1);
// mỗi tam-giác-đáy + tam-giác-nắp tương ứng = lăng trụ tam giác = 3 tứ diện.
export function prismVolumeScalar(base: PointE[], top: PointE[]): Scalar {
  let sum = rat(0n);
  for (let i = 1; i < base.length - 1; i++) {
    const b0 = base[0].p, bi = base[i].p, bj = base[i + 1].p;
    const t0 = top[0].p, ti = top[i].p, tj = top[i + 1].p;
    sum = add(sum, tripleScalar(b0, bi, bj, t0));
    sum = add(sum, tripleScalar(bi, bj, t0, ti));
    sum = add(sum, tripleScalar(bj, t0, ti, tj));
  }
  return div(absS(sum), rat(6n));
}

function fPrism(base: Vec3[], top: Vec3[]): number {
  let s = 0;
  for (let i = 1; i < base.length - 1; i++) {
    s += scalarTriple(sub(base[i], base[0]), sub(base[i + 1], base[0]), sub(top[0], base[0]));
    s += scalarTriple(sub(base[i + 1], base[i]), sub(top[0], base[i]), sub(top[i], base[i]));
    s += scalarTriple(sub(top[0], base[i + 1]), sub(top[i], base[i + 1]), sub(top[i + 1], base[i + 1]));
  }
  return Math.abs(s) / 6;
}

// Nắp phải là đáy TỊNH TIẾN: mọi top[i]−base[i] phải bằng nhau. Nếu không (chóp cụt…) → không phải lăng trụ.
function translationMismatch(base: PointE[], top: PointE[]): string | null {
  const v0 = subV(top[0].p, base[0].p);
  for (let i = 1; i < base.length; i++) {
    const d = subV(subV(top[i].p, base[i].p), v0);
    if (!(isZeroS(d.x) && isZeroS(d.y) && isZeroS(d.z)))
      return 'prism: top face is not a parallel translate of the base (not a prism)';
  }
  return null;
}

export function computePrismVolume(base: PointE[], top: PointE[]): ComputeOutcome<ScalarAnswer> {
  if (base.length < 3) return { ok: false, problem: 'prism base needs at least 3 vertices' };
  if (top.length !== base.length) return { ok: false, problem: 'prism: base and top must have the same number of vertices' };
  const cpB = coplanarityProblem(base.map((p) => p.p), 'prism base');
  if (cpB) return { ok: false, problem: cpB };
  const cpT = coplanarityProblem(top.map((p) => p.p), 'prism top');
  if (cpT) return { ok: false, problem: cpT };
  const mism = translationMismatch(base, top);
  if (mism) return { ok: false, problem: mism };
  const floatRef = fPrism(base.map((p) => av(p.p)), top.map((p) => av(p.p)));
  return { ok: true, answer: certifyScalar('volume', prismVolumeScalar(base, top), floatRef) };
}

export function computeSphereVolume(s: SphereE): ScalarAnswer {
  // V = (4/3)·π·R³, với R³ = R²·√(R²) = r2·√r2. Hệ số (4/3)·r2·√r2 nằm trong trường (rational×căn) khi
  // √r2 biểu diễn được (thường gặp: r2 hữu tỉ) ⇒ đáp DẠNG π chính xác (vd r2=9 → 36π; r2=2 → 8√2π/3).
  const R = Math.sqrt(s.r2.approx);
  const floatRef = (4 / 3) * Math.PI * R * R * R;
  const coeff = mul(rat(4n, 3n), mul(s.r2, sqrt(s.r2)));
  return piScalarAnswer('volume', coeff, floatRef);
}

export function volumeRatio(a: Scalar, b: Scalar): ComputeOutcome<ScalarAnswer> {
  if (isZeroS(b)) return { ok: false, problem: 'volume ratio: denominator volume is zero' };
  return { ok: true, answer: certifyScalar('ratio', div(a, b), a.approx / b.approx) };
}
