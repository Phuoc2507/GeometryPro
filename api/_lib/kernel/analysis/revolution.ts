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
    // ProfileFn là biên dạng 1 BIẾN theo toạ độ trục. Gán giá trị cho CẢ x lẫn y để biểu thức viết
    // theo y (đường x=g(y) khi quay quanh Oy — vd 'sqrt(y)', '3-y') không văng "Biến chưa gán: y".
    case 'expr': { const g = parseExpr(f.expr); return (x) => g({ x, y: x }); }
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
    // Lấy |ro²−ri²| theo TỪNG điểm để thể tích luôn ≥ 0 và BẰNG nhau dù đường trong/ngoài bị
    // gán nhầm thứ tự (lỗi phân loại hay gặp) — tiết diện tại mỗi x là hình vành khăn giữa 2 bán
    // kính, không phụ thuộc nhãn nào là "ngoài". (Đĩa đặc ri=0 ⇒ abs không đổi gì.)
    return Math.PI * Math.abs(ro * ro - ri * ri);
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

// Quay quanh Oy bằng phương pháp VỎ TRỤ (shell), miền là các dải đứng tại mỗi x∈[a,b] (giả thiết a≥0):
//   - 1 đường (miền tựa trục hoành): {0≤y≤r(x)} ⇒ V = 2π ∫_a^b x·r(x) dx.
//   - 2 đường y=f(x) (miền kẹp giữa outer & inner): chiều cao vỏ = |outer(x)−inner(x)| ⇒
//       V = 2π ∫_a^b x·|outer(x)−inner(x)| dx.
//     Lấy |·| để BỀN với hoán đổi nhãn trên/dưới (lỗi phân loại hay gặp). ĐÂY là vá "lỗ hổng Oy":
//     khi LLM đưa cặp đường y(x) CHƯA nghịch đảo (vd outer=x, inner=x²), trước đây vỏ trụ bỏ inner ⇒
//     tính 2π/3 mà vẫn verified (sai âm thầm); nay trừ inner ⇒ ra đúng π/6 (bằng đĩa/vành khăn theo y).
export function revolutionVolumeShellOy(
  outer: ProfileFn,
  domain: [number, number],
  inner?: ProfileFn,
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  const f = (x: number): number => {
    const h = gi ? Math.abs(go(x) - gi(x)) : go(x);
    return 2 * Math.PI * x * h;
  };
  return integrate(f, a, b);
}

export function buildRevolutionSolidOy(
  id: string,
  outer: ProfileFn,
  domain: [number, number],
  color?: string,
  inner?: ProfileFn,
): RevolutionSolid {
  const { value, estimatedError } = revolutionVolumeShellOy(outer, domain, inner);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = inner
    ? `V=2\\pi\\int_{${domain[0]}}^{${domain[1]}} x\\left(r_{ng}(x)-r_{tr}(x)\\right)\\,dx`
    : `V=2\\pi\\int_{${domain[0]}}^{${domain[1]}} x\\,r(x)\\,dx`;
  const volume: Verified<number> = { value, latex, verified, estimatedError };
  return {
    id, outer, axis: 'Oy', domain, method: 'shell', color, volume,
    ...(inner ? { inner } : {}),
    samples: sampleProfile(outer, domain),
    ...(inner ? { innerSamples: sampleProfile(inner, domain) } : {}),
  };
}

// Quay quanh Oy bằng ĐĨA/VÀNH KHĂN theo y — dùng khi miền cho bởi các đường x=g(y) (biên dạng theo BIẾN
// y, KHÔNG phải y=r(x)). Tiết diện tại mỗi y là vành khăn giữa x_trong(y) và x_ngoài(y):
//   V = π ∫_c^d ([x_ng(y)]² − [x_tr(y)]²) dy   (đĩa đặc ⇒ x_tr=0).
// ProfileFn vốn bất-biến-biến-số nên tái dùng thẳng revolutionVolumeDisk (nó tích phân π|ro²−ri²| trên
// domain — ở đây domain là theo y, ro=x_ng(y), ri=x_tr(y)). Bổ khuyết cho buildRevolutionSolidOy (vỏ trụ,
// chỉ nhận đường y=r(x)). Mẫu {x,r}: x = toạ độ TRỤC (=y), r = bán kính (=x_ng(y)) → frontend lathe quanh Y.
export function buildRevolutionSolidOyDisk(
  id: string,
  outer: ProfileFn,          // x_ngoài(y) — đường XA trục Oy hơn (giá trị x lớn hơn)
  domain: [number, number],  // [c, d] theo BIẾN y
  color?: string,
  inner?: ProfileFn,         // x_trong(y) — đường GẦN trục hơn; BỎ nếu miền tựa trục Oy (đĩa đặc)
): RevolutionSolid {
  const { value, estimatedError } = revolutionVolumeDisk(outer, domain, inner);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = inner
    ? `V=\\pi\\int_{${domain[0]}}^{${domain[1]}}\\left(\\left[x_{ng}(y)\\right]^2-\\left[x_{tr}(y)\\right]^2\\right)\\,dy`
    : `V=\\pi\\int_{${domain[0]}}^{${domain[1]}}\\left[x(y)\\right]^2\\,dy`;
  const volume: Verified<number> = { value, latex, verified, estimatedError };
  return {
    id, outer, axis: 'Oy', domain, method: inner ? 'washer' : 'disk', color, volume,
    ...(inner ? { inner } : {}),
    samples: sampleProfile(outer, domain),
    ...(inner ? { innerSamples: sampleProfile(inner, domain) } : {}),
  };
}
