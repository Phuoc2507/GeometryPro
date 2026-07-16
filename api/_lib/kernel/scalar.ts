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
