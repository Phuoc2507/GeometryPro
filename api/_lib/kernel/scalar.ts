// api/_lib/kernel/scalar.ts

// Giá trị chính xác = (num/den)·√radicand, với radicand nguyên dương square-free.
// radicand === 1 ⇒ số hữu tỷ thuần. den luôn > 0. Phân số luôn rút gọn.
export type Exact = { num: bigint; den: bigint; radicand: number };

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1n;
}

// Tách thừa số chính phương: r = factor² · rad, rad square-free. Trả { rad, factor }.
function extractSquare(r: number): { rad: number; factor: bigint } {
  if (!Number.isInteger(r) || r < 1) {
    throw new Error(`radicand must be a positive integer, got ${r}`);
  }
  let rad = r;
  let factor = 1n;
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) {
      rad /= f * f;
      factor *= BigInt(f);
    }
  }
  return { rad, factor };
}

export function makeExact(num: bigint, den: bigint, radicand: number = 1): Exact {
  if (den === 0n) throw new Error('Exact denominator cannot be zero');
  if (num === 0n) return { num: 0n, den: 1n, radicand: 1 };
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const { rad, factor } = extractSquare(radicand);
  num *= factor;
  const g = bgcd(num, den);
  return { num: num / g, den: den / g, radicand: rad };
}

export function exactToApprox(e: Exact): number {
  return (Number(e.num) / Number(e.den)) * Math.sqrt(e.radicand);
}

export function displayExact(e: Exact): string {
  const sign = e.num < 0n ? '-' : '';
  const n = e.num < 0n ? -e.num : e.num;
  if (e.radicand === 1) {
    return e.den === 1n ? `${sign}${n}` : `${sign}${n}/${e.den}`;
  }
  const radStr = `√${e.radicand}`;
  const numer = n === 1n ? radStr : `${n}${radStr}`;
  return e.den === 1n ? `${sign}${numer}` : `${sign}${numer}/${e.den}`;
}

// append to api/_lib/kernel/scalar.ts

export function negExact(a: Exact): Exact {
  return { num: -a.num, den: a.den, radicand: a.radicand };
}

// a + b — chỉ đóng khi cùng radicand (hoặc một trong hai bằng 0). Ngược lại ⇒ null.
export function addExact(a: Exact, b: Exact): Exact | null {
  if (a.num === 0n) return b;
  if (b.num === 0n) return a;
  if (a.radicand !== b.radicand) return null;
  // a.num/a.den + b.num/b.den, chung radicand
  const num = a.num * b.den + b.num * a.den;
  const den = a.den * b.den;
  return makeExact(num, den, a.radicand);
}

export function subExact(a: Exact, b: Exact): Exact | null {
  return addExact(a, negExact(b));
}

// (a.num/a.den·√ra)·(b.num/b.den·√rb) = (a.num·b.num)/(a.den·b.den)·√(ra·rb)
export function mulExact(a: Exact, b: Exact): Exact {
  return makeExact(a.num * b.num, a.den * b.den, a.radicand * b.radicand);
}

// a / b = (a.num·b.den)/(a.den·b.num) · √ra/√rb = ... · √(ra·rb)/rb
export function divExact(a: Exact, b: Exact): Exact {
  if (b.num === 0n) throw new Error('Exact division by zero');
  const num = a.num * b.den;
  const den = a.den * b.num * BigInt(b.radicand);
  return makeExact(num, den, a.radicand * b.radicand);
}

// √(num/den) khi là hữu tỷ không âm; = √(num·den)/den. Ngoài ra ⇒ null.
export function sqrtExact(a: Exact): Exact | null {
  if (a.radicand !== 1) return null; // √ của một căn: ngoài trường
  if (a.num < 0n) return null;
  if (a.num === 0n) return makeExact(0n, 1n, 1);
  const radicand = Number(a.num * a.den);
  if (!Number.isSafeInteger(radicand)) return null; // quá lớn để làm radicand an toàn
  return makeExact(1n, a.den, radicand);
}

// append to api/_lib/kernel/scalar.ts

// Số lai: approx (float) luôn có; exact khi tính được trong trường hữu tỷ+căn.
export type Scalar = { approx: number; exact: Exact | null };

export function num(n: number): Scalar {
  return { approx: n, exact: null };
}

export function fromExact(e: Exact): Scalar {
  return { approx: exactToApprox(e), exact: e };
}

// Hằng tiện dụng: số nguyên/hữu tỷ chính xác.
export function rat(n: bigint, d: bigint = 1n): Scalar {
  return fromExact(makeExact(n, d, 1));
}

export function add(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact ? addExact(a.exact, b.exact) : null;
  return { approx: a.approx + b.approx, exact };
}

export function sub(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact ? subExact(a.exact, b.exact) : null;
  return { approx: a.approx - b.approx, exact };
}

export function mul(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact ? mulExact(a.exact, b.exact) : null;
  return { approx: a.approx * b.approx, exact };
}

export function div(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact && b.exact.num !== 0n ? divExact(a.exact, b.exact) : null;
  return { approx: a.approx / b.approx, exact };
}

export function neg(a: Scalar): Scalar {
  return { approx: -a.approx, exact: a.exact ? negExact(a.exact) : null };
}

export function sqrt(a: Scalar): Scalar {
  const exact = a.exact ? sqrtExact(a.exact) : null;
  return { approx: Math.sqrt(a.approx), exact };
}

export function displayScalar(s: Scalar): string {
  return s.exact ? displayExact(s.exact) : s.approx.toFixed(4);
}
