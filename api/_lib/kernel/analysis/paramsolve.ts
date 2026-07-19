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

// Giải f(x)=target trên [lo,hi]: quét lưới tìm MỌI ô đổi dấu của g=f−target, chia đôi từng ô.
// Trả TẤT CẢ nghiệm (đã khử trùng lặp gần nhau). Quan trọng khi hàm nhiều nghiệm — trước đây chỉ
// lấy nghiệm đầu tiên nên có thể bỏ sót / chọn nhầm.
export function solveAllParam(
  f: (x: number) => number, target: number, lo: number, hi: number, grid = 800,
): number[] {
  const g = (x: number) => f(x) - target;
  const roots: number[] = [];
  const push = (x: number) => {
    if (roots.length === 0 || Math.abs(x - roots[roots.length - 1]) > 1e-9) roots.push(x);
  };
  let x0 = lo, g0 = g(lo);
  if (g0 === 0) push(lo);
  for (let i = 1; i <= grid; i++) {
    const x1 = lo + ((hi - lo) * i) / grid;
    const g1 = g(x1);
    if (g1 === 0) { push(x1); x0 = x1; g0 = g1; continue; }
    if (g0 * g1 < 0) {
      let a = x0, b = x1, ga = g0;
      for (let k = 0; k < 200; k++) {
        const m = (a + b) / 2, gm = g(m);
        if (ga * gm <= 0) b = m; else { a = m; ga = gm; }
        if (b - a < 1e-13) break;
      }
      push((a + b) / 2);
    }
    x0 = x1; g0 = g1;
  }
  return roots;
}

// Giải f(x)=target: trả nghiệm ĐẦU TIÊN (dùng khi hàm đơn điệu / chỉ cần một nghiệm). null nếu không có.
export function solveParam(
  f: (x: number) => number, target: number, lo: number, hi: number, grid = 800,
): { x: number; residual: number } | null {
  const roots = solveAllParam(f, target, lo, hi, grid);
  if (roots.length === 0) return null;
  const x = roots[0];
  return { x, residual: Math.abs(f(x) - target) };
}

// Nelder–Mead (đơn hình) — tối thiểu hoá g KHÔNG cần đạo hàm; xử lý tốt "thung lũng chéo/cong" mà
// hạ-toạ-độ (coordinate descent) hay KẸT (vd hệ giao tuyến của solve_multi). Dùng để ĐÁNH BÓNG nghiệm
// sau lưới. Giữ trong hộp [los,his] bằng cách kẹp mọi điểm trước khi đánh giá.
function nelderMead(
  g: (xs: number[]) => number, x0: number[], los: number[], his: number[],
  step: number[], maxIter: number, overDeadline: () => boolean,
): number[] {
  const n = x0.length;
  const clamp = (xs: number[]): number[] => xs.map((x, d) => Math.max(los[d], Math.min(his[d], x)));
  const ev = (xs: number[]): number => g(clamp(xs));
  const simplex: { xs: number[]; v: number }[] = [];
  const p0 = clamp(x0.slice());
  simplex.push({ xs: p0, v: ev(p0) });
  for (let d = 0; d < n; d++) {
    const p = p0.slice(); p[d] += step[d] || 1e-3;
    const pc = clamp(p); simplex.push({ xs: pc, v: ev(pc) });
  }
  const alpha = 1, gamma = 2, rho = 0.5, sigma = 0.5;
  for (let it = 0; it < maxIter; it++) {
    if (overDeadline()) break;
    simplex.sort((A, B) => A.v - B.v);
    // hội tụ: đơn hình đủ nhỏ (đường kính theo toạ độ)
    let dia = 0;
    for (let d = 0; d < n; d++) {
      let mn = Infinity, mx = -Infinity;
      for (const s of simplex) { mn = Math.min(mn, s.xs[d]); mx = Math.max(mx, s.xs[d]); }
      dia = Math.max(dia, mx - mn);
    }
    if (dia < 1e-10) break;
    const worst = simplex[n];
    const cen = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let d = 0; d < n; d++) cen[d] += simplex[i].xs[d] / n;
    const reflect = cen.map((c, d) => c + alpha * (c - worst.xs[d]));
    const vr = ev(reflect);
    if (vr < simplex[0].v) {
      const expand = cen.map((c, d) => c + gamma * (c - worst.xs[d]));
      const ve = ev(expand);
      simplex[n] = ve < vr ? { xs: clamp(expand), v: ve } : { xs: clamp(reflect), v: vr };
    } else if (vr < simplex[n - 1].v) {
      simplex[n] = { xs: clamp(reflect), v: vr };
    } else {
      const contract = cen.map((c, d) => c + rho * (worst.xs[d] - c));
      const vc = ev(contract);
      if (vc < worst.v) {
        simplex[n] = { xs: clamp(contract), v: vc };
      } else {
        for (let i = 1; i <= n; i++) {
          const xs = clamp(simplex[0].xs.map((b, d) => b + sigma * (simplex[i].xs[d] - b)));
          simplex[i] = { xs, v: ev(xs) };
        }
      }
    }
  }
  simplex.sort((A, B) => A.v - B.v);
  return simplex[0].xs;
}

// Tối ưu NHIỀU biến trên hộp [los,his]: quét lưới thô, rồi HẠ TOẠ ĐỘ (golden-section từng chiều)
// từ K Ô TỐT NHẤT (đa-điểm-xuất-phát), rồi ĐÁNH BÓNG bằng Nelder–Mead (chống kẹt thung lũng chéo).
// Đa-điểm-xuất-phát chống kẹt cực trị địa phương khi ô lưới tốt nhất không nằm trong "lòng chảo".
// (Lưu ý: cực trị NHỌN hẹp hơn bước lưới vẫn có thể lọt — cần tăng gridPerDim.)
export function optimizeMulti(
  f: (xs: number[]) => number, los: number[], his: number[], sense: 'max' | 'min',
  gridPerDim = 40, rounds = 60, restarts = 5, deadlineMs?: number,
): { xs: number[]; value: number } {
  const n = los.length;
  const sign = sense === 'max' ? 1 : -1;
  const gr = (Math.sqrt(5) - 1) / 2;
  // Cắt thời gian: objective có thể gọi run() (dựng hình) mỗi eval ⇒ rất đắt. Khi quá hạn, DỪNG SỚM và
  // trả nghiệm tốt-nhất-đến-giờ. Bên gọi (solve_multi) kiểm residual: chưa hội tụ ⇒ rơi về (chống timeout).
  const overDeadline = (): boolean => deadlineMs !== undefined && Date.now() > deadlineMs;

  // Quét lưới, thu mọi ô kèm giá trị.
  const cells: { xs: number[]; v: number }[] = [];
  const total = Math.pow(gridPerDim + 1, n);
  for (let t = 0; t < total; t++) {
    if (overDeadline()) break;
    let rem = t;
    const xs: number[] = [];
    for (let d = 0; d < n; d++) {
      const i = rem % (gridPerDim + 1);
      rem = Math.floor(rem / (gridPerDim + 1));
      xs.push(los[d] + ((his[d] - los[d]) * i) / gridPerDim);
    }
    cells.push({ xs, v: sign * f(xs) });
  }
  if (cells.length === 0) { const xs = los.slice(); return { xs, value: f(xs) }; } // quá hạn trước ô đầu
  cells.sort((A, B) => B.v - A.v); // tốt nhất (theo sign) lên đầu
  const starts = cells.slice(0, Math.max(1, restarts));

  // Hạ toạ độ từ một điểm xuất phát.
  const refine = (start: number[]): { xs: number[]; value: number } => {
    const xs = start.slice();
    for (let r = 0; r < rounds; r++) {
      if (overDeadline()) break;
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
          if (b - a < 1e-9) break; // 1e-9 đủ chính xác (đáp cần ~6 chữ số), nhanh hơn 1e-13
        }
        xs[d] = (a + b) / 2;
      }
    }
    return { xs, value: f(xs) };
  };

  let best = refine(starts[0].xs);
  for (let s = 1; s < starts.length; s++) {
    if (overDeadline()) break;
    const cand = refine(starts[s].xs);
    if (sign * cand.value > sign * best.value) best = cand;
  }

  // ĐÁNH BÓNG bằng Nelder–Mead từ nghiệm tốt nhất + vài ô lưới đầu — nhả khỏi thung lũng chéo mà
  // hạ-toạ-độ kẹt (cần cho solve_multi giao tuyến). g = −sign·f (tối thiểu g == tối đa sign·f).
  const g = (xs: number[]): number => -sign * f(xs);
  const nmStep = los.map((lo, d) => (his[d] - lo) / gridPerDim);
  const nmStarts = [best.xs, ...starts.slice(0, 3).map((s) => s.xs)];
  for (const st of nmStarts) {
    if (overDeadline()) break;
    const nmXs = nelderMead(g, st, los, his, nmStep, 200, overDeadline);
    const fv = f(nmXs);
    if (sign * fv > sign * best.value) best = { xs: nmXs, value: fv };
  }
  return best;
}
