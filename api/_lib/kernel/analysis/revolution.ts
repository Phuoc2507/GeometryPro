// api/_lib/kernel/analysis/revolution.ts
// Lõi tất định cho khối tròn xoay quanh Ox (phương pháp đĩa):
//   V = π ∫_a^b [r(x)]² dx  — tích phân bằng Simpson (integrate) + tự-kiểm sai số.
import type { ProfileFn, RevolutionSolid, Verified } from '../../../../src/types/geometry';
import { integrate } from './quadrature';

export function evalProfile(f: ProfileFn, x: number): number {
  switch (f.kind) {
    case 'poly': return f.coeffs.reduce((acc, c, i) => acc + c * x ** i, 0);
    case 'sqrt': return f.a * Math.sqrt(x) + f.b;
    case 'const': return f.c;
  }
}

export function revolutionVolumeDisk(
  outer: ProfileFn,
  domain: [number, number],
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const f = (x: number): number => {
    const r = evalProfile(outer, x);
    return Math.PI * r * r;
  };
  return integrate(f, a, b);
}
