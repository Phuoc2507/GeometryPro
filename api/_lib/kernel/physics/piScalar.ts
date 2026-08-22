// api/_lib/kernel/physics/piScalar.ts
// Tầng HẠ TẦNG DÙNG CHUNG (dao động · sóng cơ · điện trường): giá trị = (hữu tỉ + một căn)·πᵏ.
// π vô tỉ KHÔNG nằm trong trường `Scalar` (scalar.ts). Đề VN đầy π: ω = 10π, T = 0,2π, φ = π/3,
// v_max = 20π, a_max = 500π², T = 2π√(l/g). Nếu rơi float ngay ⇒ mất dạng đẹp (recognize chỉ vớt
// được thuần-π: kπ/m, p+qπ — KHÔNG nhận π², √b·π, k/π). PiScalar giữ exact TỪ THƯỢNG NGUỒN.
//
// PiScalar = { s: Scalar; k: number } — giá trị = s · πᵏ, |k| ≤ 2 (trường PHÂN BẬC: cộng chỉ đóng
// trong cùng bậc; vượt trần ⇒ collapse về float có kiểm soát, approx luôn đúng). Bậc cao nhất trong
// phạm vi 3 chương là π² (a_max = ω²A) và π⁻² (l/g khi g = π²); không query nào cần π³.
import { type Scalar, type Exact, num, rat, fromExact, makeExact, add, sub, mul, div, neg, sqrt, displayScalar } from '../scalar';
import { scalarFromNumber } from './kinematics';
import { recognizeConstant } from '../analysis/recognize';
import { z } from 'zod';

export type PiScalar = { s: Scalar; k: number };

const K_MAX = 2; // trần bậc π (phán quyết §14.9 — YAGNI, pack sau cần thì nâng)

// giá trị số = s.approx · π^k (đường FLOAT ĐỘC LẬP dùng để certify — không đi qua exact).
export function approxP(p: PiScalar): number {
  return p.s.approx * Math.PI ** p.k;
}

// PiScalar bằng 0 (bất biến theo bậc — 0·πᵏ = 0). exact khi có, ngược lại ngưỡng float.
export function isZeroPi(p: PiScalar): boolean {
  return p.s.exact !== null ? p.s.exact.num === 0n : Math.abs(p.s.approx) < 1e-12;
}

// Rời trường phân-bậc nguyên có kiểm soát: giữ approx đúng, bỏ exact, k về 0.
function collapseP(p: PiScalar): PiScalar {
  return { s: num(approxP(p)), k: 0 };
}
// |k| > trần ⇒ collapse; ngược lại giữ nguyên.
function bandP(p: PiScalar): PiScalar {
  return p.k > K_MAX || p.k < -K_MAX ? collapseP(p) : p;
}

// ── Hằng & constructor ────────────────────────────────────────────────────────
export const scalarToPi = (s: Scalar): PiScalar => ({ s, k: 0 });
export const piOf = (n: bigint, d: bigint = 1n, k: number = 1): PiScalar => ({ s: rat(n, d), k });
export const PI: PiScalar = { s: rat(1n), k: 1 };       // π
export const TWO_PI: PiScalar = { s: rat(2n), k: 1 };   // 2π
export const negP = (p: PiScalar): PiScalar => ({ s: neg(p.s), k: p.k });

// ── Phép toán phân bậc ─────────────────────────────────────────────────────────
export function mulP(a: PiScalar, b: PiScalar): PiScalar {
  return bandP({ s: mul(a.s, b.s), k: a.k + b.k });
}
export function divP(a: PiScalar, b: PiScalar): PiScalar {
  return bandP({ s: div(a.s, b.s), k: a.k - b.k });
}
// Cộng CHỈ đóng trong cùng bậc (mirror addExact-null); vế 0 ⇒ vế kia (0 band-agnostic); khác bậc ⇒ collapse.
export function addP(a: PiScalar, b: PiScalar): PiScalar {
  if (isZeroPi(a)) return b;
  if (isZeroPi(b)) return a;
  if (a.k === b.k) return { s: add(a.s, b.s), k: a.k };
  return { s: num(approxP(a) + approxP(b)), k: 0 };
}
export function subP(a: PiScalar, b: PiScalar): PiScalar {
  return addP(a, negP(b));
}
// √(s·πᵏ) = √s·π^(k/2). k chẵn ⇒ đóng (sqrt tự lo exact của s, có thể null); k lẻ ⇒ collapse (π^(k/2) rời trường).
export function sqrtP(a: PiScalar): PiScalar {
  if (a.k % 2 === 0) return bandP({ s: sqrt(a.s), k: a.k / 2 });
  return { s: num(Math.sqrt(approxP(a))), k: 0 };
}

// ── EXACT_COS — vòng tròn 16 điểm (mở rộng C8 HỢP LỆ, phán quyết §3.2) ──────────
// Lưới = bội π/6 (12 điểm) ∪ bội π/4 (16 điểm hợp: thêm π/4, 3π/4, 5π/4, 7π/4). Ngoài lưới (π/5, π/12…)
// ⇒ null ⇒ float (cos π/12 = (√6+√2)/4 hai căn, vốn ngoài trường Scalar — đúng thiết kế).
const E = (n: number, d: number, rad = 1): Exact => makeExact(BigInt(n), BigInt(d), rad);
// k·π/6, k = 0..11 (trọn vòng). cos/sin đã áp dấu theo cung phần tư.
const SIXTH: { cos: Exact; sin: Exact }[] = [
  { cos: E(1, 1), sin: E(0, 1) },        // 0
  { cos: E(1, 2, 3), sin: E(1, 2) },     // π/6
  { cos: E(1, 2), sin: E(1, 2, 3) },     // π/3
  { cos: E(0, 1), sin: E(1, 1) },        // π/2
  { cos: E(-1, 2), sin: E(1, 2, 3) },    // 2π/3
  { cos: E(-1, 2, 3), sin: E(1, 2) },    // 5π/6
  { cos: E(-1, 1), sin: E(0, 1) },       // π
  { cos: E(-1, 2, 3), sin: E(-1, 2) },   // 7π/6
  { cos: E(-1, 2), sin: E(-1, 2, 3) },   // 4π/3
  { cos: E(0, 1), sin: E(-1, 1) },       // 3π/2
  { cos: E(1, 2), sin: E(-1, 2, 3) },    // 5π/3
  { cos: E(1, 2, 3), sin: E(-1, 2) },    // 11π/6
];
// k·π/4, k = 0..7.
const FOURTH: { cos: Exact; sin: Exact }[] = [
  { cos: E(1, 1), sin: E(0, 1) },        // 0
  { cos: E(1, 2, 2), sin: E(1, 2, 2) },  // π/4
  { cos: E(0, 1), sin: E(1, 1) },        // π/2
  { cos: E(-1, 2, 2), sin: E(1, 2, 2) }, // 3π/4
  { cos: E(-1, 1), sin: E(0, 1) },       // π
  { cos: E(-1, 2, 2), sin: E(-1, 2, 2) },// 5π/4
  { cos: E(0, 1), sin: E(-1, 1) },       // 3π/2
  { cos: E(1, 2, 2), sin: E(-1, 2, 2) }, // 7π/4
];
const bmod = (a: bigint, m: bigint): bigint => ((a % m) + m) % m;

// cos/sin EXACT của pha = (p/q)·π (bậc 1, hệ số HỮU TỈ). q ∈ {1,2,3,6} ⇒ lưới π/6; q = 4 ⇒ lưới π/4;
// q khác (5, 12…) ⇒ null. Trả cặp Scalar exact hoặc null (ngoài lưới ⇒ caller rơi float).
export function EXACT_COS(pha: PiScalar): { cos: Scalar; sin: Scalar } | null {
  if (pha.k !== 1) return null;
  const e = pha.s.exact;
  if (e === null || e.radicand !== 1) return null; // cần hữu tỉ (√·π ngoài lưới)
  const p = e.num, q = e.den; // makeExact đã rút gọn, q > 0
  if (6n % q === 0n) {
    const g = SIXTH[Number(bmod(p * (6n / q), 12n))];
    return { cos: fromExact(g.cos), sin: fromExact(g.sin) };
  }
  if (4n % q === 0n) {
    const g = FOURTH[Number(bmod(p * (4n / q), 8n))];
    return { cos: fromExact(g.cos), sin: fromExact(g.sin) };
  }
  return null;
}

// cos/sin của một pha PiScalar. pha = 0 (bất kể bậc) ⇒ 1/0 exact; trên lưới ⇒ EXACT_COS; ngoài ⇒ float.
export function cosP(pha: PiScalar): Scalar {
  if (isZeroPi(pha)) return rat(1n);
  const g = EXACT_COS(pha);
  return g ? g.cos : num(Math.cos(approxP(pha)));
}
export function sinP(pha: PiScalar): Scalar {
  if (isZeroPi(pha)) return rat(0n);
  const g = EXACT_COS(pha);
  return g ? g.sin : num(Math.sin(approxP(pha)));
}

// ── Hiển thị (§3.3) — quy ước "π đứng trước căn" ────────────────────────────────
function piPow(ak: number): string {
  return ak === 1 ? 'π' : ak === 2 ? 'π²' : `π^${ak}`;
}
export function displayPiScalar(p: PiScalar): string {
  if (p.k === 0) return displayScalar(p.s);
  if (p.s.exact === null) return approxP(p).toFixed(4); // mất exact ⇒ float toàn giá trị
  if (isZeroPi(p)) return '0';
  const e = p.s.exact;
  const neg = e.num < 0n;
  const n = neg ? -e.num : e.num;
  const d = e.den;
  const rad = e.radicand;
  const sign = neg ? '-' : '';
  const surd = rad > 1 ? `√${rad}` : '';
  const piStr = piPow(Math.abs(p.k));
  if (p.k > 0) {
    const numer = (n !== 1n ? `${n}` : '') + piStr + surd;
    return sign + numer + (d > 1n ? `/${d}` : '');
  }
  // k < 0: tử = n·√rad, mẫu = d·π^|k| (bọc ngoặc khi mẫu nhiều thừa số).
  const numer = n !== 1n ? `${n}${surd}` : rad > 1 ? surd : '1';
  const denParts = (d > 1n ? `${d}` : '') + piStr;
  const denom = d > 1n ? `(${denParts})` : denParts;
  return sign + numer + '/' + denom;
}

function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

export type PiCertificate = { exact: Exact | null; approx: number; text: string; approximate: boolean };

// Chứng nhận 3 tầng (mirror certifyScalar §3.4): exact khớp float ĐỘC LẬP ⇒ displayPiScalar;
// exact chết ⇒ recognizeConstant (vớt kπ/m, p+qπ); trượt nốt ⇒ thập phân, approximate:true.
export function certifyPiScalar(p: PiScalar, floatRef: number): PiCertificate {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (p.s.exact !== null && Math.abs(approxP(p) - floatRef) <= tol) {
    return { exact: p.s.exact, approx: approxP(p), text: displayPiScalar(p), approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { exact: null, approx: floatRef, text: nice ? nice.text : fmtNum(floatRef), approximate: !nice };
}

// ── PiRat — đầu vào JSON có thể mang π VÀ phân số (§3.1) ────────────────────────
// LLM CHÉP tử/mẫu literal từ đề (kể cả "2π/3" → {n:2,d:3,pi:true}) — không phép tính nào để làm sai.
const Num = z.number().finite();
export const PiRat = z.union([
  Num, // 5 ≡ số trần (bậc 0)
  z.object({ n: Num, d: z.number().int().positive().default(1), pi: z.boolean().default(false) }),
]);
export type PiRatInput = z.infer<typeof PiRat>;

export function toPiScalar(pr: PiRatInput): PiScalar {
  if (typeof pr === 'number') return { s: scalarFromNumber(pr), k: 0 };
  const d = pr.d ?? 1; // zod điền default, nhưng bền cả khi gọi trực tiếp với object thô
  const s = div(scalarFromNumber(pr.n), rat(BigInt(d)));
  return { s, k: pr.pi ? 1 : 0 };
}
