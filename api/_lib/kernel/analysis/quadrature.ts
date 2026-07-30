// api/_lib/kernel/analysis/quadrature.ts
// Tích phân xác định bằng Simpson kép có TỰ KIỂM: tính ở n rồi 2n khoảng, ước lượng sai số theo
// Richardson |I₂ₙ − Iₙ|/15. Engine dùng để KHÔNG "trả bừa" khi chưa hội tụ.

function simpson(f: (x: number) => number, a: number, b: number, n: number): number {
  const m = n % 2 === 0 ? n : n + 1; // Simpson cần số khoảng CHẴN
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}

// Tăng đôi lưới tới khi sai số ước lượng đủ nhỏ (tương đối) hoặc chạm trần lưới.
export function integrate(
  f: (x: number) => number, a: number, b: number, tol = 1e-9, maxN = 1 << 18,
): { value: number; estimatedError: number } {
  let n = 8;
  let prev = simpson(f, a, b, n);
  for (;;) {
    n *= 2;
    const cur = simpson(f, a, b, n);
    const err = Math.abs(cur - prev) / 15;
    if (err <= tol * Math.max(1, Math.abs(cur)) || n >= maxN) return { value: cur, estimatedError: err };
    prev = cur;
  }
}

// Tìm nghiệm của h(x)=0 GẦN gợi ý x0 nhất, trong cửa sổ [x0−w, x0+w]. Quét lưới tìm khoảng ĐỔI DẤU
// (bỏ mẫu không hữu hạn — biên miền sqrt), rồi chia đôi tới ~1e-12; chọn nghiệm gần x0 nhất. Trả null nếu
// không có nghiệm cắt trong cửa sổ (ví dụ cận CHO SẴN không phải giao điểm ⇒ giữ nguyên, không tinh chỉnh).
function nearestRoot(h: (x: number) => number, x0: number, w: number): number | null {
  const N = 80;
  const lo = x0 - w, hi = x0 + w;
  let best: number | null = null;
  let bestDist = Infinity;
  const consider = (root: number): void => {
    const d = Math.abs(root - x0);
    if (d < bestDist) { bestDist = d; best = root; }
  };
  let px = lo, py = h(lo);
  for (let i = 1; i <= N; i++) {
    const x = lo + ((hi - lo) * i) / N;
    const y = h(x);
    if (Number.isFinite(py) && py === 0) consider(px);
    if (Number.isFinite(py) && Number.isFinite(y) && py * y < 0) {
      // Chia đôi trong [px, x].
      let a1 = px, b1 = x, fa = py;
      for (let k = 0; k < 60; k++) {
        const m = (a1 + b1) / 2;
        const fm = h(m);
        if (!Number.isFinite(fm)) break;
        if (fa * fm <= 0) b1 = m; else { a1 = m; fa = fm; }
      }
      consider((a1 + b1) / 2);
    }
    px = x; py = y;
  }
  if (Number.isFinite(py) && py === 0) consider(px);
  return best;
}

// Tinh chỉnh cận tích phân [a,b] về nghiệm CHÍNH XÁC của h (giao 2 đường / cắt trục). LLM chỉ cần đưa cận
// gần đúng (kể cả số vô tỉ làm tròn) — engine snap về nghiệm thật ⇒ đáp số & hiển thị chính xác, không còn
// "verified nhưng cận lệch". FAIL-SAFE: chỉ dời đầu mút khi có nghiệm cắt trong ±25% độ rộng khoảng; nếu
// không (cận cho sẵn như x=4) thì GIỮ nguyên. Đảo/chập ⇒ trả về nguyên bản.
export function refineBounds(
  h: (x: number) => number, domain: [number, number],
): [number, number] {
  const [a, b] = domain;
  const span = b - a;
  if (!(span > 1e-12) || !Number.isFinite(span)) return [a, b];
  const w = 0.25 * span;
  const na = nearestRoot(h, a, w);
  const nb = nearestRoot(h, b, w);
  const ra = na != null ? na : a;
  const rb = nb != null ? nb : b;
  if (!(rb > ra) || !Number.isFinite(ra) || !Number.isFinite(rb)) return [a, b];
  return [ra, rb];
}

// Định dạng CẬN cho LaTeX: số nguyên giữ nguyên; số thập phân (thường là cận vô tỉ đã tinh chỉnh) làm tròn
// 3 chữ số để hiển thị gọn (giá trị TÍNH TOÁN vẫn dùng đủ độ chính xác, đây chỉ là chuỗi hiển thị).
export function fmtBound(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}
