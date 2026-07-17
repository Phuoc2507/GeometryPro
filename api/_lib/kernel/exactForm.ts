export type ExactFormResult = { text: string; isExact: boolean; value: number };

const EPS = 1e-4;
// Genuinely square-free radicands only: √8, √12, √20, √24 are excluded so a value like
// 32√2 canonicalizes as "32√2" (via n=2) rather than the non-textbook "16√8".
const SQUAREFREE_RADICANDS = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];
const MAX_DENOM = 12;
const MAX_NUMER = 60;

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function toExactForm(value: number, eps = EPS): ExactFormResult {
  if (Math.abs(value) < eps) return { text: '0', isExact: true, value };
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);

  // Exact integer — handled first and WITHOUT a magnitude cap, so an answer like a cube's
  // volume of 512 reads "512" instead of falling through to a flagged decimal.
  if (Math.abs(v - Math.round(v)) < eps) {
    const p = Math.round(v);
    return { text: sign < 0 ? `-${p}` : `${p}`, isExact: true, value };
  }

  for (let q = 2; q <= MAX_DENOM; q++) {
    const p = Math.round(v * q);
    if (p > 0 && p <= MAX_NUMER * MAX_DENOM && Math.abs(v - p / q) < eps) {
      const g = gcd(p, q);
      const pp = p / g;
      const qq = q / g;
      const text = qq === 1 ? `${pp}` : `${pp}/${qq}`;
      return { text: sign < 0 ? `-${text}` : text, isExact: true, value };
    }
  }

  let best: { p: number; q: number; n: number } | null = null;
  for (const n of SQUAREFREE_RADICANDS) {
    const sq = Math.sqrt(n);
    for (let q = 1; q <= MAX_DENOM; q++) {
      const p = Math.round((v * q) / sq);
      if (p <= 0 || p > MAX_NUMER) continue;
      const candidate = (p * sq) / q;
      if (Math.abs(candidate - v) < eps) {
        if (!best || q < best.q || (q === best.q && n < best.n)) {
          const g = gcd(p, q);
          best = { p: p / g, q: q / g, n };
        }
      }
    }
  }
  if (best) {
    const sqrtPart = `√${best.n}`;
    const numer = best.p === 1 ? sqrtPart : `${best.p}${sqrtPart}`;
    const text = best.q === 1 ? numer : `${numer}/${best.q}`;
    return { text: sign < 0 ? `-${text}` : text, isExact: true, value };
  }

  return { text: (sign * v).toFixed(4), isExact: false, value };
}
