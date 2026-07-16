// api/_lib/kernel/compute/equation.ts
import { type Scalar, displayExact } from '../scalar';
import type { PlaneE, SphereE } from '../entities';

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
function blcm(a: bigint, b: bigint): bigint {
  return (a / bgcd(a, b)) * b;
}

// Chỉ hệ số hữu tỷ exact (radicand 1) mới viết được dạng nguyên rút gọn.
function rationalCoeffs(scalars: Scalar[]): { num: bigint; den: bigint }[] | null {
  const out: { num: bigint; den: bigint }[] = [];
  for (const s of scalars) {
    if (s.exact === null || s.exact.radicand !== 1) return null;
    out.push({ num: s.exact.num, den: s.exact.den });
  }
  return out;
}

// "2x - y + 2z - 3 = 0" — bỏ hệ số 0, gộp dấu, ±1 ẩn hệ số, hằng số không có biến.
function formatLinear(a: bigint, b: bigint, c: bigint, d: bigint): string {
  let out = '';
  const term = (k: bigint, v: string) => {
    if (k === 0n) return;
    const neg = k < 0n;
    const abs = neg ? -k : k;
    const mag = v !== '' && abs === 1n ? '' : `${abs}`;
    if (out === '') out += `${neg ? '-' : ''}${mag}${v}`;
    else out += ` ${neg ? '-' : '+'} ${mag}${v}`;
  };
  term(a, 'x');
  term(b, 'y');
  term(c, 'z');
  term(d, '');
  if (out === '') out = '0';
  return `${out} = 0`;
}

export function planeEquationText(pl: PlaneE): string {
  const rats = rationalCoeffs([pl.n.x, pl.n.y, pl.n.z, pl.d]);
  if (!rats) {
    return `${pl.n.x.approx}x + ${pl.n.y.approx}y + ${pl.n.z.approx}z + ${pl.d.approx} = 0`;
  }
  let D = 1n;
  for (const r of rats) D = blcm(D, r.den);
  const ints = rats.map((r) => r.num * (D / r.den));
  let g = 0n;
  for (const k of ints) g = bgcd(g, k);
  if (g === 0n) g = 1n;
  let [a, b, c, d] = ints.map((k) => k / g) as [bigint, bigint, bigint, bigint];
  const lead = [a, b, c].find((k) => k !== 0n);
  if (lead !== undefined && lead < 0n) { a = -a; b = -b; c = -c; d = -d; }
  return formatLinear(a, b, c, d);
}

export function sphereEquationText(s: SphereE): string {
  const parts = [s.center.x, s.center.y, s.center.z];
  if (parts.some((c) => c.exact === null || c.exact.radicand !== 1) || s.r2.exact === null) {
    return `(x, y, z) center ≈ (${parts.map((c) => c.approx).join(', ')}), R² ≈ ${s.r2.approx}`;
  }
  const varPart = (c: Scalar, v: string) => {
    const e = c.exact!;
    if (e.num === 0n) return `${v}²`;
    const neg = e.num < 0n;
    const mag = displayExact({ num: neg ? -e.num : e.num, den: e.den, radicand: 1 });
    return `(${v} ${neg ? '+' : '-'} ${mag})²`;
  };
  return `${varPart(s.center.x, 'x')} + ${varPart(s.center.y, 'y')} + ${varPart(s.center.z, 'z')} = ${displayExact(s.r2.exact)}`;
}
