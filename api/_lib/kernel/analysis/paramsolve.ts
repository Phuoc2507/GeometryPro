// api/_lib/kernel/analysis/paramsolve.ts
// Tối ưu & giải nghiệm MỘT biến trên [lo,hi] bằng số (lưới thô + tinh chỉnh) — không cần đạo hàm.
// Dùng cho engine giải tích: quét một tham số hình học, đánh giá lại hình ở mỗi giá trị.

// Tối ưu: lưới thô tìm ô tốt nhất rồi golden-section trong ô lân cận.
export function optimizeParam(
  f: (x: number) => number, lo: number, hi: number, sense: 'max' | 'min', grid = 400,
): { x: number; value: number } {
  const sign = sense === 'max' ? 1 : -1;
  let bx = lo, bv = sign * f(lo);
  for (let i = 1; i <= grid; i++) {
    const x = lo + ((hi - lo) * i) / grid;
    const v = sign * f(x);
    if (v > bv) { bv = v; bx = x; }
  }
  const h = (hi - lo) / grid;
  let a = Math.max(lo, bx - h), b = Math.min(hi, bx + h);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a);
  for (let k = 0; k < 200; k++) {
    if (sign * f(c) > sign * f(d)) b = d; else a = c;
    c = b - gr * (b - a); d = a + gr * (b - a);
    if (b - a < 1e-12) break;
  }
  const x = (a + b) / 2;
  return { x, value: f(x) };
}

// Giải f(x)=target trên [lo,hi]: tìm ô đổi dấu của g=f−target rồi chia đôi. null nếu không có.
export function solveParam(
  f: (x: number) => number, target: number, lo: number, hi: number, grid = 800,
): { x: number; residual: number } | null {
  const g = (x: number) => f(x) - target;
  let x0 = lo, g0 = g(lo);
  if (g0 === 0) return { x: lo, residual: 0 };
  for (let i = 1; i <= grid; i++) {
    const x1 = lo + ((hi - lo) * i) / grid;
    const g1 = g(x1);
    if (g1 === 0) return { x: x1, residual: 0 };
    if (g0 * g1 < 0) {
      let a = x0, b = x1, ga = g0;
      for (let k = 0; k < 200; k++) {
        const m = (a + b) / 2, gm = g(m);
        if (ga * gm <= 0) b = m; else { a = m; ga = gm; }
        if (b - a < 1e-13) break;
      }
      const x = (a + b) / 2;
      return { x, residual: Math.abs(g(x)) };
    }
    x0 = x1; g0 = g1;
  }
  return null;
}

// Tối ưu NHIỀU biến trên hộp [los,his]: lưới thô tìm ô tốt nhất, rồi HẠ TOẠ ĐỘ — lặp golden-section
// theo từng chiều (cửa sổ ±h quanh điểm hiện tại, nên điểm có thể "đi bộ" ra khỏi ô ban đầu).
export function optimizeMulti(
  f: (xs: number[]) => number, los: number[], his: number[], sense: 'max' | 'min',
  gridPerDim = 40, rounds = 60,
): { xs: number[]; value: number } {
  const n = los.length;
  const sign = sense === 'max' ? 1 : -1;
  let best = { xs: los.slice(), v: -Infinity };
  const total = Math.pow(gridPerDim + 1, n);
  for (let t = 0; t < total; t++) {
    let rem = t;
    const xs: number[] = [];
    for (let d = 0; d < n; d++) {
      const i = rem % (gridPerDim + 1);
      rem = Math.floor(rem / (gridPerDim + 1));
      xs.push(los[d] + ((his[d] - los[d]) * i) / gridPerDim);
    }
    const v = sign * f(xs);
    if (v > best.v) best = { xs, v };
  }
  const xs = best.xs.slice();
  const gr = (Math.sqrt(5) - 1) / 2;
  for (let r = 0; r < rounds; r++) {
    for (let d = 0; d < n; d++) {
      const h = (his[d] - los[d]) / gridPerDim;
      let a = Math.max(los[d], xs[d] - h);
      let b = Math.min(his[d], xs[d] + h);
      let c = b - gr * (b - a);
      let e = a + gr * (b - a);
      for (let k = 0; k < 80; k++) {
        const xc = xs.slice(); xc[d] = c;
        const xe = xs.slice(); xe[d] = e;
        if (sign * f(xc) > sign * f(xe)) b = e; else a = c;
        c = b - gr * (b - a); e = a + gr * (b - a);
        if (b - a < 1e-13) break;
      }
      xs[d] = (a + b) / 2;
    }
  }
  return { xs, value: f(xs) };
}
