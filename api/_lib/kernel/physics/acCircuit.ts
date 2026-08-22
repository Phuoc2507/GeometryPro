// api/_lib/kernel/physics/acCircuit.ts
// THUẦN (PiScalar + Scalar) — không zod, không I/O. Toán trung tâm của chương DÒNG ĐIỆN XOAY CHIỀU.
//
// Ý chính (§2/§3 spec, phản biện xác nhận số): trở kháng phức đề VN "gài số đẹp" để π TRIỆT TIÊU ở
// Z_L = ωL, Z_C = 1/(ωC) (đề cho L = a/π, C = b·10ⁿ/π). Sau khi π chết, MỌI phép còn lại (dZ, Z, I,
// cosφ, P, U mỗi phần tử) là số học hữu tỉ + MỘT căn thuần — đúng trường Scalar; căn xuất hiện đúng
// một chặng ở Z = √(R²+(Z_L−Z_C)²). π và căn KHÔNG bao giờ cùng sống trong một số. Nhánh C (đề cho L,C
// thập phân thuần) ⇒ addP khác-bậc COLLAPSE ⇒ float trung thực (certify gắn approximate) — KHÔNG bịa.
//
// Điểm toán MỚI duy nhất ngoài piScalar.ts: phaseFromCos (inverse-trig lưới — từ cosφ Scalar → góc π/6…),
// đọc struct Exact (import type từ ../scalar), KHÔNG sửa piScalar.ts.
import { type Scalar, rat, fromExact, makeExact, mul, div, sqrt } from '../scalar';
import {
  type PiScalar,
  scalarToPi,
  piOf,
  TWO_PI,
  mulP,
  divP,
  subP,
  addP,
  sqrtP,
  approxP,
  isZeroPi,
  toPiScalar,
} from './piScalar';
import { scalarFromNumber } from './kinematics';
import type { SurdRatInput, LCValueInput, AcSource, AcPlan } from './acSchema';
import type { PiRatInput } from './piScalar';

export const SQRT2: Scalar = fromExact(makeExact(1n, 1n, 2)); // √2 exact (radicand 2)

// ── Constructor exact từ input (dùng export CÓ SẴN, không sửa scalar/piScalar) ──
export function toSurd(v: SurdRatInput): Scalar {
  if (typeof v === 'number') return scalarFromNumber(v);
  const d = v.d ?? 1;
  const rad = v.rad ?? 1;
  const base = div(scalarFromNumber(v.n), rat(BigInt(d)));
  return rad > 1 ? mul(base, sqrt(rat(BigInt(rad)))) : base;
}

// 10^e chính xác bằng bigint (tránh trần 9-lẻ của scalarFromNumber cho 10⁻⁵, 10⁻⁶…).
function pow10(e: number): Scalar {
  if (e >= 0) return rat(10n ** BigInt(e));
  return rat(1n, 10n ** BigInt(-e));
}

// LCValue → PiScalar. π ở MẪU (overPi) ⇒ k = −1 (để triệt tiêu với ω bậc +1).
export function toLC(v: LCValueInput): PiScalar {
  if (typeof v === 'number') return { s: scalarFromNumber(v), k: 0 };
  const d = v.d ?? 1;
  const s = mul(div(scalarFromNumber(v.n), rat(BigInt(d))), pow10(v.exp ?? 0));
  return { s, k: v.overPi ? -1 : 0 };
}

// ── Float ĐỘC LẬP (đường certify §3.5 — Math.PI/sqrt thuần, KHÔNG đi qua exact) ──
const nSurd = (v: SurdRatInput): number => (typeof v === 'number' ? v : (v.n / (v.d ?? 1)) * Math.sqrt(v.rad ?? 1));
const nLC = (v: LCValueInput): number =>
  typeof v === 'number' ? v : (v.n / (v.d ?? 1)) * 10 ** (v.exp ?? 0) * (v.overPi ? 1 / Math.PI : 1);
const nPiRat = (pr: PiRatInput): number =>
  typeof pr === 'number' ? pr : (pr.n / (pr.d ?? 1)) * (pr.pi ? Math.PI : 1);

// ── Model resolve (§7.1) ────────────────────────────────────────────────────────
export type AcModel = {
  omega: PiScalar; // rad/s
  U: Scalar; // hiệu dụng (V)
  U0: Scalar; // cực đại = U√2
  phiU: PiScalar; // pha nguồn (rad)
  R: Scalar; // Ω (0 nếu khuyết)
  ZL: PiScalar; // ωL (0 nếu khuyết L)
  ZC: PiScalar; // 1/(ωC) (0 nếu khuyết C)
  hasL: boolean;
  hasC: boolean;
  L: LCValueInput | null;
  C: LCValueInput | null;
  // Bản float độc lập (certify + phasor/charts).
  n: { omega: number; R: number; ZL: number; ZC: number; U: number; U0: number; phiU: number };
};

const ZERO_PI: PiScalar = { s: rat(0n), k: 0 };

function resolveSource(src: AcSource): { omega: PiScalar; omegaN: number; U: Scalar; U0: Scalar; UN: number; U0N: number; phiU: PiScalar; phiUN: number } {
  // Tần số → ω.
  let omega: PiScalar;
  let omegaN: number;
  if (src.f !== undefined) {
    omega = mulP(TWO_PI, scalarToPi(scalarFromNumber(src.f)));
    omegaN = 2 * Math.PI * src.f;
  } else {
    omega = toPiScalar(src.omega as PiRatInput);
    omegaN = nPiRat(src.omega as PiRatInput);
  }
  // Điện áp: khai U ⇒ U0 = U√2; khai U0 ⇒ U = U0/√2 (rút căn về khi U0 dạng a√2).
  let U: Scalar;
  let U0: Scalar;
  let UN: number;
  let U0N: number;
  if (src.U !== undefined) {
    U = toSurd(src.U);
    U0 = mul(U, SQRT2);
    UN = nSurd(src.U);
    U0N = UN * Math.SQRT2;
  } else {
    U0 = toSurd(src.U0 as SurdRatInput);
    U = div(U0, SQRT2);
    U0N = nSurd(src.U0 as SurdRatInput);
    UN = U0N / Math.SQRT2;
  }
  const phiU = src.phiU !== undefined ? toPiScalar(src.phiU) : ZERO_PI;
  const phiUN = src.phiU !== undefined ? nPiRat(src.phiU) : 0;
  return { omega, omegaN, U, U0, UN, U0N, phiU, phiUN };
}

export function resolveModel(plan: AcPlan): AcModel {
  const { omega, omegaN, U, U0, UN, U0N, phiU, phiUN } = resolveSource(plan.source);
  const hasL = plan.L !== undefined;
  const hasC = plan.C !== undefined;
  const R = plan.R !== undefined ? toSurd(plan.R) : rat(0n);
  const RN = plan.R !== undefined ? nSurd(plan.R) : 0;

  const ZL = hasL ? mulP(omega, toLC(plan.L as LCValueInput)) : ZERO_PI;
  const ZC = hasC ? divP(scalarToPi(rat(1n)), mulP(omega, toLC(plan.C as LCValueInput))) : ZERO_PI;
  const ZLN = hasL ? omegaN * nLC(plan.L as LCValueInput) : 0;
  const ZCN = hasC ? 1 / (omegaN * nLC(plan.C as LCValueInput)) : 0;

  return {
    omega, U, U0, phiU, R, ZL, ZC, hasL, hasC,
    L: hasL ? (plan.L as LCValueInput) : null,
    C: hasC ? (plan.C as LCValueInput) : null,
    n: { omega: omegaN, R: RN, ZL: ZLN, ZC: ZCN, U: UN, U0: U0N, phiU: phiUN },
  };
}

// ── Dấu của PiScalar (π > 0 ⇒ dấu = dấu s; mirror osc §7 — KHÔNG so cấu trúc chéo radicand) ──
export function signOfPi(p: PiScalar): -1 | 0 | 1 {
  if (p.s.exact !== null) return p.s.exact.num < 0n ? -1 : p.s.exact.num > 0n ? 1 : 0;
  const a = p.s.approx;
  return a < 0 ? -1 : a > 0 ? 1 : 0;
}

// ── phaseFromCos (§3.4) — inverse-trig LƯỚI, SO EQUALITY struct Exact (KHÔNG cmpScalar snap) ──
// Mạch RLC nối tiếp: φ ∈ (−π/2, π/2] (R≥0), cosφ ≥ 0 & dấu φ = dấu (Z_L−Z_C). Chỉ dò nửa lưới góc nhọn.
type CosMark = { num: bigint; den: bigint; radicand: number; theta: () => PiScalar };
const COS_MARKS: CosMark[] = [
  { num: 1n, den: 1n, radicand: 1, theta: () => ZERO_PI }, // cos0 = 1        → 0
  { num: 1n, den: 2n, radicand: 3, theta: () => piOf(1n, 6n) }, // cos π/6 = √3/2 → π/6
  { num: 1n, den: 2n, radicand: 2, theta: () => piOf(1n, 4n) }, // cos π/4 = √2/2 → π/4
  { num: 1n, den: 2n, radicand: 1, theta: () => piOf(1n, 3n) }, // cos π/3 = 1/2  → π/3
  { num: 0n, den: 1n, radicand: 1, theta: () => piOf(1n, 2n) }, // cos π/2 = 0    → π/2
];

export function phaseFromCos(cosphi: Scalar, signDZ: -1 | 0 | 1): PiScalar | null {
  const e = cosphi.exact;
  if (e === null) return null; // hữu tỉ dính căn không nhận ra / nhánh C ⇒ caller rơi số
  const mark = COS_MARKS.find((m) => m.num === e.num && m.den === e.den && m.radicand === e.radicand);
  if (!mark) return null;
  const theta = mark.theta();
  if (signDZ === 0 || isZeroPi(theta)) return ZERO_PI; // φ = 0 (dZ=0 hoặc góc 0)
  return signDZ > 0 ? theta : { s: { approx: -theta.s.approx, exact: theta.s.exact ? { num: -theta.s.exact.num, den: theta.s.exact.den, radicand: theta.s.exact.radicand } : null }, k: theta.k };
}

// ── Đại lượng dẫn xuất (§7.2) — mọi phép trên PiScalar; bậc tự lo exact/float (§3) ──
export type AcDerived = {
  dZ: PiScalar; // Z_L − Z_C (có dấu)
  Z: PiScalar; // √(R²+(Z_L−Z_C)²)
  I: PiScalar; // U/Z (hiệu dụng)
  I0: PiScalar; // I√2 (cực đại)
  cosphi: PiScalar; // R/Z
  sinphi: PiScalar; // (Z_L−Z_C)/Z
  P: PiScalar; // I²R
  signDZ: -1 | 0 | 1;
  phi: PiScalar; // độ lệch pha u–i (nice PiScalar khi lưới, ngược lại {k:0,num} float)
  phiNice: boolean; // phaseFromCos khớp lưới?
  phiN: number; // φ float (atan2 hoặc approxP nếu nice)
  phiI: PiScalar; // pha dòng = φ_u − φ
  // float độc lập.
  n: { dZ: number; Z: number; I: number; I0: number; cosphi: number; sinphi: number; P: number };
};

export function deriveAc(m: AcModel): AcDerived {
  const Rp = scalarToPi(m.R);
  const dZ = subP(m.ZL, m.ZC);
  const Zsq = addP(mulP(Rp, Rp), mulP(dZ, dZ));
  const Z = sqrtP(Zsq);
  const I = divP(scalarToPi(m.U), Z);
  const I0 = mulP(I, scalarToPi(SQRT2));
  const cosphi = divP(Rp, Z);
  const sinphi = divP(dZ, Z);
  const P = mulP(mulP(I, I), Rp);
  const signDZ = signOfPi(dZ);

  // float độc lập (§3.5).
  const dZN = m.n.ZL - m.n.ZC;
  const ZN = Math.sqrt(m.n.R * m.n.R + dZN * dZN);
  const IN = m.n.U / ZN;
  const nD = {
    dZ: dZN, Z: ZN, I: IN, I0: IN * Math.SQRT2,
    cosphi: m.n.R / ZN, sinphi: dZN / ZN, P: IN * IN * m.n.R,
  };

  // φ: ưu tiên lưới qua cosφ (bền hơn tanφ; R=0 ⇒ tanφ=∞ nên KHÔNG dùng tanφ — THẤP-1);
  // off-grid ⇒ atan2 SỐ THÔ (KHÔNG qua recognizeConstant — THẤP-2), approximate:true trung thực.
  const phiPi = phaseFromCos(cosphi.s, signDZ);
  const phiNice = phiPi !== null;
  const phi = phiPi ?? { s: { approx: Math.atan2(dZN, m.n.R), exact: null }, k: 0 };
  const phiN = phiNice ? approxP(phi) : Math.atan2(dZN, m.n.R);
  const phiI = subP(m.phiU, phi);

  return { dZ, Z, I, I0, cosphi, sinphi, P, signDZ, phi, phiNice, phiN, phiI, n: nD };
}

// ── Cộng hưởng (§7.3) ───────────────────────────────────────────────────────────
export const isResonant = (d: AcDerived): boolean => isZeroPi(d.dZ);

// f₀ = 1/(2π√(LC)) — π triệt tiêu qua sqrtP(k=−2) rồi mulP(2π). Đòi L, C (superRefine bảo đảm).
export function resonanceFreq(m: AcModel): PiScalar {
  const LC = mulP(toLC(m.L as LCValueInput), toLC(m.C as LCValueInput));
  const denom = mulP(TWO_PI, sqrtP(LC));
  return divP(scalarToPi(rat(1n)), denom);
}
export function resonanceFreqN(m: AcModel): number {
  return 1 / (2 * Math.PI * Math.sqrt(nLC(m.L as LCValueInput) * nLC(m.C as LCValueInput)));
}

// solve_resonance: tìm phần tử để Z_L = Z_C. target f ⇒ f₀; C ⇒ 1/(ω²L); L ⇒ 1/(ω²C).
export function solveResonance(m: AcModel, target: 'C' | 'L' | 'f'): { pi: PiScalar; n: number } {
  if (target === 'f') return { pi: resonanceFreq(m), n: resonanceFreqN(m) };
  const w2 = mulP(m.omega, m.omega);
  if (target === 'C') {
    const pi = divP(scalarToPi(rat(1n)), mulP(w2, toLC(m.L as LCValueInput)));
    return { pi, n: 1 / (m.n.omega * m.n.omega * nLC(m.L as LCValueInput)) };
  }
  const pi = divP(scalarToPi(rat(1n)), mulP(w2, toLC(m.C as LCValueInput)));
  return { pi, n: 1 / (m.n.omega * m.n.omega * nLC(m.C as LCValueInput)) };
}
