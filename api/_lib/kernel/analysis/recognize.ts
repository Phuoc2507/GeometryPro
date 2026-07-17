// api/_lib/kernel/analysis/recognize.ts
// Nhận dạng một số thực về dạng "căn đẹp": hữu tỉ, a√b/c, hoặc p+q√r.
// CHỈ chấp nhận khi dựng-lại khớp x tới EPS (chặn khớp giả). Ưu tiên dạng đơn giản trước.
const EPS = 1e-9;
// Các radicand square-free thường gặp trong đề thi.
const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30, 31, 33, 34, 35, 37, 38, 39, 41, 42, 43, 46, 47];
const MAX_DEN = 64;

export type Recognized = { text: string; value: number };

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

// Xấp xỉ x bằng phân số p/q (|q|≤maxDen) nếu khớp EPS; trả dạng rút gọn.
function asRational(x: number, maxDen: number): { p: number; q: number } | null {
  for (let q = 1; q <= maxDen; q++) {
    const p = Math.round(x * q);
    if (Math.abs(x - p / q) < EPS) {
      const g = gcd(p, q);
      return { p: p / g, q: q / g };
    }
  }
  return null;
}

function fmtRational(p: number, q: number): string {
  return q === 1 ? `${p}` : `${p}/${q}`;
}

// Định dạng số hạng căn (num/den)·√rad với num>0 giả định; caller lo dấu.
function fmtSurdTerm(num: number, den: number, rad: number): string {
  const coeff = num === 1 ? `√${rad}` : `${num}√${rad}`;
  return den === 1 ? coeff : `${coeff}/${den}`;
}

export function recognizeConstant(x: number): Recognized | null {
  // 1) Hữu tỉ
  const q0 = asRational(x, MAX_DEN);
  if (q0) return { text: fmtRational(q0.p, q0.q), value: q0.p / q0.q };

  // 2) a√b/c  (x = (p/q)·√b)
  for (const b of SQUAREFREE) {
    const s = x / Math.sqrt(b);
    const r = asRational(s, MAX_DEN);
    if (r && r.p !== 0) {
      const val = (r.p / r.q) * Math.sqrt(b);
      if (Math.abs(val - x) < EPS) {
        const sign = r.p < 0 ? '-' : '';
        return { text: sign + fmtSurdTerm(Math.abs(r.p), r.q, b), value: val };
      }
    }
  }

  // 3) p + q√r  (nhị thức). Quét r và q hữu tỉ nhỏ; suy p rồi kiểm p hữu tỉ.
  for (const r of SQUAREFREE) {
    const root = Math.sqrt(r);
    for (let qd = 1; qd <= 8; qd++) {
      for (let qn = -8; qn <= 8; qn++) {
        if (qn === 0) continue;
        const qv = qn / qd;
        const p = asRational(x - qv * root, 16);
        if (!p) continue;
        const val = p.p / p.q + qv * root;
        if (Math.abs(val - x) < EPS) {
          const qAbsNum = Math.abs(qn);
          const g = gcd(qAbsNum, qd);
          const surd = fmtSurdTerm(qAbsNum / g, qd / g, r);
          const op = qn < 0 ? '-' : '+';
          return { text: `${fmtRational(p.p, p.q)} ${op} ${surd}`, value: val };
        }
      }
    }
  }

  return null;
}
