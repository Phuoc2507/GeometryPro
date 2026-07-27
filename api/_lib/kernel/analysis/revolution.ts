// api/_lib/kernel/analysis/revolution.ts
// Lõi tất định cho khối tròn xoay quanh Ox (phương pháp đĩa):
//   V = π ∫_a^b [r(x)]² dx  — tích phân bằng Simpson (integrate) + tự-kiểm sai số.
import type { ProfileFn, RevolutionSolid, Verified } from '../../../../src/types/geometry';
import { integrate } from './quadrature';
import { parseExpr } from './expr';

// Biên dịch biên dạng r(x) MỘT LẦN thành hàm số nhanh — dùng cho vòng lặp nóng (integrate lấy mẫu
// 2^k điểm). Riêng 'expr' parse 1 lần rồi tái dùng, tránh parse lại mỗi lần gọi.
export function compileProfile(f: ProfileFn): (x: number) => number {
  switch (f.kind) {
    case 'poly': return (x) => f.coeffs.reduce((acc, c, i) => acc + c * x ** i, 0);
    case 'sqrt': return (x) => f.a * Math.sqrt(x) + f.b;
    case 'const': return () => f.c;
    case 'expr': { const g = parseExpr(f.expr); return (x) => g({ x }); }
  }
}

export function evalProfile(f: ProfileFn, x: number): number {
  return compileProfile(f)(x);
}

// Mẫu biên dạng ngoài để frontend dựng LatheGeometry mà KHÔNG cần parser (engine là nguồn sự thật).
export function sampleProfile(
  outer: ProfileFn,
  domain: [number, number],
  n = 64,
): { x: number; r: number }[] {
  const [a, b] = domain;
  const g = compileProfile(outer);
  const out: { x: number; r: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const r = g(x);
    out.push({ x, r: Number.isFinite(r) ? Math.max(0, r) : 0 });
  }
  return out;
}

export function revolutionVolumeDisk(
  outer: ProfileFn,
  domain: [number, number],
  inner?: ProfileFn,
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  const f = (x: number): number => {
    const ro = go(x);
    const ri = gi ? gi(x) : 0;
    // Vành khăn (washer): V=π∫([r_ngoài]²−[r_trong]²)dx. Đĩa đặc: r_trong=0.
    return Math.PI * (ro * ro - ri * ri);
  };
  return integrate(f, a, b);
}

export function buildRevolutionSolidOx(
  id: string,
  outer: ProfileFn,
  domain: [number, number],
  color?: string,
  inner?: ProfileFn,
): RevolutionSolid {
  const { value, estimatedError } = revolutionVolumeDisk(outer, domain, inner);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = inner
    ? `V=\\pi\\int_{${domain[0]}}^{${domain[1]}}\\left(\\left[r_{ng}(x)\\right]^2-\\left[r_{tr}(x)\\right]^2\\right)\\,dx`
    : `V=\\pi\\int_{${domain[0]}}^{${domain[1]}}\\left[r(x)\\right]^2\\,dx`;
  const volume: Verified<number> = { value, latex, verified, estimatedError };
  return {
    id, outer, axis: 'Ox', domain, method: inner ? 'washer' : 'disk', color, volume,
    ...(inner ? { inner } : {}),
    samples: sampleProfile(outer, domain),
    ...(inner ? { innerSamples: sampleProfile(inner, domain) } : {}),
  };
}

// Quay quanh Oy bằng phương pháp VỎ TRỤ (shell): miền {a≤x≤b, 0≤y≤r(x)} (giả thiết a≥0)
//   V = 2π ∫_a^b x·r(x) dx.
export function revolutionVolumeShellOy(
  outer: ProfileFn,
  domain: [number, number],
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const g = compileProfile(outer);
  const f = (x: number): number => 2 * Math.PI * x * g(x);
  return integrate(f, a, b);
}

export function buildRevolutionSolidOy(
  id: string,
  outer: ProfileFn,
  domain: [number, number],
  color?: string,
): RevolutionSolid {
  const { value, estimatedError } = revolutionVolumeShellOy(outer, domain);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = `V=2\\pi\\int_{${domain[0]}}^{${domain[1]}} x\\,r(x)\\,dx`;
  const volume: Verified<number> = { value, latex, verified, estimatedError };
  return {
    id, outer, axis: 'Oy', domain, method: 'shell', color, volume,
    samples: sampleProfile(outer, domain),
  };
}
