// api/_lib/kernel/analysis/recognize.ts
// Nhận dạng một số thực về dạng "căn đẹp": hữu tỉ, a√b/c, p+q√r, hoặc dạng π (kπ/m, p+qπ).
// CHỈ chấp nhận khi dựng-lại khớp x tới EPS (chặn khớp giả). Ưu tiên dạng đơn giản trước.
const EPS = 1e-10;

// Sinh bảng radicand square-free (2..N) bằng hàm thay vì mảng cứng.
function isSquareFree(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) {
    if (n % (d * d) === 0) return false;
  }
  return true;
}
function squareFreeUpTo(n: number): number[] {
  const out: number[] = [];
  for (let k = 2; k <= n; k++) if (isSquareFree(k)) out.push(k);
  return out;
}
const SQUAREFREE = squareFreeUpTo(400);
const MAX_DEN = 200;

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

// Định dạng số hạng π (num/den)·π với num>0 giả định; caller lo dấu.
function fmtPiTerm(num: number, den: number): string {
  const coeff = num === 1 ? 'π' : `${num}π`;
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

  // 4) kπ/m  (x = (p/q)·π, den ≤ 64)
  const rp = asRational(x / Math.PI, 64);
  if (rp && rp.p !== 0) {
    const val = (rp.p / rp.q) * Math.PI;
    if (Math.abs(val - x) < EPS) {
      const sign = rp.p < 0 ? '-' : '';
      return { text: sign + fmtPiTerm(Math.abs(rp.p), rp.q), value: val };
    }
  }

  // 5) p + qπ  (quét q hữu tỉ nhỏ; suy p rồi kiểm p hữu tỉ den ≤ 16)
  for (let qd = 1; qd <= 8; qd++) {
    for (let qn = -8; qn <= 8; qn++) {
      if (qn === 0) continue;
      const qv = qn / qd;
      const p = asRational(x - qv * Math.PI, 16);
      if (!p || p.p === 0) continue; // p=0 ⇒ đã bắt ở nhánh kπ/m
      const val = p.p / p.q + qv * Math.PI;
      if (Math.abs(val - x) < EPS) {
        const qAbsNum = Math.abs(qn);
        const g = gcd(qAbsNum, qd);
        const piTerm = fmtPiTerm(qAbsNum / g, qd / g);
        const op = qn < 0 ? '-' : '+';
        return { text: `${fmtRational(p.p, p.q)} ${op} ${piTerm}`, value: val };
      }
    }
  }

  return null;
}
