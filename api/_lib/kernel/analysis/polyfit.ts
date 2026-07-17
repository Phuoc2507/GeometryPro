// api/_lib/kernel/analysis/polyfit.ts
// Tầng HÀM SỐ cho engine giải tích: khớp đa thức qua điểm (có thể ghim hệ số bậc cao nhất = tham số
// tự do), tính giá trị, đạo hàm, và tìm cực trị. Tất cả bằng SỐ — engine làm, LLM không phải đạo hàm.
// Hệ số luôn theo thứ tự [c0, c1, ..., cn] ứng với c0 + c1·x + ... + cn·xⁿ.
import { solveParam } from './paramsolve';

// Khử Gauss có chọn trụ (hệ nhỏ, n ≤ 6). Ném nếu suy biến.
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) throw new Error('Khớp đa thức: hệ suy biến (điểm trùng/không xác định)');
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// Khớp đa thức bậc `degree` qua `through` VÀ các ràng buộc đạo hàm `slopeAt` ([x, f'(x)]).
// Nếu `leading` cho trước ⇒ hệ số bậc cao nhất bị GHIM, chỉ khớp `degree` hệ số còn lại.
// Tổng số ràng buộc (through + slopeAt) phải BẰNG số ẩn.
export function fitPoly(
  degree: number, through: [number, number][], leading?: number, slopeAt: [number, number][] = [],
): number[] {
  const nUnknown = leading === undefined ? degree + 1 : degree;
  const nGiven = through.length + slopeAt.length;
  if (nGiven !== nUnknown) {
    throw new Error(`fitPoly: cần ${nUnknown} ràng buộc cho bậc ${degree}${leading === undefined ? '' : ' (đã ghim hệ số đầu)'}, nhận ${nGiven}`);
  }
  const A: number[][] = [];
  const b: number[] = [];
  // Ràng buộc giá trị: c0 + c1·x + ... = y (trừ phần hệ số đã ghim).
  for (const [x, y] of through) {
    const row: number[] = [];
    for (let k = 0; k < nUnknown; k++) row.push(Math.pow(x, k));
    A.push(row);
    b.push(leading === undefined ? y : y - leading * Math.pow(x, degree));
  }
  // Ràng buộc đạo hàm: Σ k·c_k·x^(k−1) = s (trừ phần hệ số đã ghim).
  for (const [x, s] of slopeAt) {
    const row: number[] = [];
    for (let k = 0; k < nUnknown; k++) row.push(k === 0 ? 0 : k * Math.pow(x, k - 1));
    A.push(row);
    b.push(leading === undefined ? s : s - degree * leading * Math.pow(x, degree - 1));
  }
  const sol = solveLinear(A, b);
  return leading === undefined ? sol : [...sol, leading];
}

// Horner.
export function evalPoly(c: number[], x: number): number {
  let s = 0;
  for (let k = c.length - 1; k >= 0; k--) s = s * x + c[k];
  return s;
}

export function derivPoly(c: number[]): number[] {
  const d: number[] = [];
  for (let k = 1; k < c.length; k++) d.push(k * c[k]);
  return d.length ? d : [0];
}

// Cực trị = nghiệm f'(x)=0 trong [lo,hi] (dùng bộ giải số sẵn có). null nếu không có.
export function extremumOfPoly(c: number[], lo: number, hi: number): { x: number; y: number } | null {
  const d = derivPoly(c);
  const r = solveParam((x) => evalPoly(d, x), 0, lo, hi);
  if (!r) return null;
  return { x: r.x, y: evalPoly(c, r.x) };
}
