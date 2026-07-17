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
