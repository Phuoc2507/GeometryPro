// api/_lib/kernel/physics/waves.ts
// THUẦN (Scalar + PiScalar + bigint) — không zod, không I/O. Tầng GIẢI sóng cơ & sóng âm lớp 11 (spec §6–§11.1):
//  - chuẩn hoá op → WaveModel (f/T/λ/v Scalar; ω/spaceK/φ PiScalar) + SoundModel (I0/Iref/power Scalar);
//    resolve nhiều nguồn ưu tiên + auto-assert dữ kiện dư v=λf (§6.2);
//  - đại lượng sóng v=λf, T=1/f (hữu tỉ); pha = ωt − dir·spaceK·x + φ (PiScalar, cos qua lưới 16 điểm §7);
//  - giao thoa/sóng dừng = ĐẾM NGHIỆM NGUYÊN bằng BIGINT (floordiv/ceildiv), đếm HAI CÁCH đối chiếu (§8,§9);
//  - dB tách nhánh exact/số: log10Exact chỉ nhận lũy thừa của √10, ngoài ra số + cờ approximate (§10);
//  - mỗi đáp chạy SONG SONG bản FLOAT ĐỘC LẬP làm floatRef cho certify (§3.4).
// KHÔNG BAO GIỜ throw (OS-2): guard chặn null/chia-0; runWaves try/catch lưới cuối.
//
// GHI CHÚ KIẾN TRÚC (tự quyết): spec §13 tách waves.ts (§6,§8,§9,§10) + waveCompute.ts (§7,§11.1). Ở đây GỘP
// làm một file THUẦN — soi gương ĐÚNG oscillation.ts (vốn gộp resolveModel + computeOscQuery), giữ đúng nguyên
// tắc "logic số học di dời NGUYÊN"; runWaves nhập từ đây như runOscillation nhập oscillation.ts.
import {
  type Scalar, num, rat, fromExact, makeExact, sub, mul, div,
  exactToApprox, displayScalar,
} from '../scalar';
import { scalarFromNumber } from './kinematics';
import { recognizeConstant } from '../analysis/recognize';
import { certifyScalar } from '../compute/answer';
import {
  type PiScalar, approxP, mulP, divP, addP, subP, negP, scalarToPi, TWO_PI, cosP,
  certifyPiScalar, toPiScalar,
} from './piScalar';
import type { WaveOpT, SoundSourceOpT, WaveQuery, SciInput } from './waveSchema';

export const EPS_SELF = 1e-6; // ngưỡng thay-ngược/tự-kiểm (dùng chung trị số v0)
const EPS0 = 1e-12;

export type Check = { kind: string; detail: string; residual: number; pass: boolean };
export type Violation = { id: string; message: string };
export type WaveAns = { label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean; queryIndex?: number };
export type QueryOutcome = { ok: true; answer: WaveAns; checks: Check[]; tSolved?: number } | { ok: false; problem: string };
export type BaseLen = 'cm' | 'm';

export type WaveModel = {
  name: string;
  A: Scalar | null;      // units.length
  f: Scalar | null;      // Hz
  T: Scalar | null;      // s
  lambda: Scalar | null; // units.length
  v: Scalar | null;      // units.length/s
  omega: PiScalar | null;  // rad/s
  spaceK: PiScalar | null; // 2π/λ (bậc 1)
  phi: PiScalar | null;    // rad
  dir: 1 | -1;
  op: WaveOpT;
};
export type SoundModel = {
  name: string;
  I0: Scalar;               // W/m²
  power: Scalar | null;     // W (nguồn điểm ⇒ I=P/4πr²)
  Iref: Scalar | null;      // W/m² tại rRef (hoặc tại điểm khảo sát khi rRef=null)
  rRef: Scalar | null;      // m
  levelRef: Scalar | null;  // dB tại rRef (exact khi suy được) — cho distance_for_level
  op: SoundSourceOpT;
};
export type SolvedWave = { model: WaveModel; checks: Check[]; violations: Violation[]; errors: { message: string }[] };
export type SolvedSound = { model: SoundModel; checks: Check[]; violations: Violation[]; errors: { message: string }[] };

export const PHYSICAL_VIOLATIONS = new Set(['nguon-du-lech', 'khong-song-dung', 'lambda-vo-ti']);

// ── Tiện ích số ─────────────────────────────────────────────────────────────────
// §6.2 (finding W3): PiScalar bậc 0 (π triệt tiêu) ⇒ rút Scalar `p.s`; bậc ≠ 0 ⇒ float trung thực.
const piToScalar = (p: PiScalar): Scalar => (p.k === 0 ? p.s : num(approxP(p)));
const ROOT10 = fromExact(makeExact(1n, 1n, 10)); // √10

function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// Đáp từ Scalar (exact certify → recognize → thập phân). text KHÔNG kèm unit.
export function mkAnsS(kind: string, s: Scalar, floatRef: number, unit: string, label?: string): WaveAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice };
}
// Đáp từ Scalar QUA certifyScalar THUẦN (KHÔNG recognize) — cho dB (§10.2: nhánh số ⇒ toFixed(4)).
function mkAnsCert(kind: string, s: Scalar, floatRef: number, unit: string, label?: string): WaveAns {
  const c = certifyScalar(kind, s, floatRef);
  return { label, kind, text: c.text, approx: c.approx, unit, approximate: c.approximate };
}
// Đáp từ PiScalar (qua certifyPiScalar).
function mkAnsP(kind: string, p: PiScalar, floatRef: number, unit: string, label?: string): WaveAns {
  const c = certifyPiScalar(p, floatRef);
  return { label, kind, text: c.text, approx: c.approx, unit, approximate: c.approximate };
}
// Đáp SỐ NGUYÊN (đếm bụng/nút/vân) — unit rỗng, luôn exact.
function mkAnsInt(kind: string, n: number, label?: string): WaveAns {
  return { label, kind, text: String(n), approx: n, unit: '', approximate: false };
}

// ── Đổi đơn vị độ dài (per-quantity, hữu tỉ exact) ───────────────────────────────
function lenFactor(from: BaseLen, to: BaseLen): Scalar {
  if (from === to) return rat(1n);
  return from === 'cm' && to === 'm' ? rat(1n, 100n) : rat(100n);
}
// speed (SpeedUnit) → units.length/s.
function speedToBase(v: number, unit: string | undefined, base: BaseLen): Scalar {
  const from: BaseLen = unit === 'm/s' ? 'm' : unit === 'cm/s' ? 'cm' : base;
  return mul(scalarFromNumber(v), lenFactor(from, base));
}
// r (rUnit hoặc units.length) → mét (SI của I, dB).
function metersOf(value: number, rUnit: string | undefined, base: BaseLen): Scalar {
  const from: BaseLen = (rUnit as BaseLen) ?? base;
  return from === 'cm' ? mul(scalarFromNumber(value), rat(1n, 100n)) : scalarFromNumber(value);
}

// ── Sci → Scalar EXACT (bigint 10^|exp|) ─────────────────────────────────────────
export function sciToScalar(sci: SciInput): Scalar {
  if (typeof sci === 'number') return scalarFromNumber(sci);
  const d = sci.d ?? 1;
  const exp = sci.exp ?? 0;
  const base = scalarFromNumber(sci.n);
  const p10 = pow10Scalar(exp);
  return div(mul(base, p10), rat(BigInt(d)));
}
// 10^e exact (e ∈ ℤ): e≥0 ⇒ hữu tỉ 10^e; e<0 ⇒ 1/10^|e|.
function pow10Scalar(e: number): Scalar {
  const p = 10n ** BigInt(Math.abs(e));
  return e >= 0 ? fromExact(makeExact(p, 1n)) : fromExact(makeExact(1n, p));
}

// ── log10 tách nhánh exact/số (§10.1) ────────────────────────────────────────────
// x = 10^n (n ≥ 0)? trả n; ngược lại null. (chia lặp cho 10 phải về 1 không dư)
function pow10Exp(x: bigint): bigint | null {
  if (x <= 0n) return null;
  let n = 0n; let v = x;
  while (v % 10n === 0n) { v /= 10n; n++; }
  return v === 1n ? n : null;
}
// log₁₀(ratio) EXACT chỉ khi ratio là lũy thừa của √10 (radicand ∈ {1,10}); ngoài ra null ⇒ đường số.
export function log10Exact(ratio: Scalar): Scalar | null {
  const e = ratio.exact;
  if (e === null) return null;
  if (e.radicand === 1) {
    if (e.den === 1n) { const n = pow10Exp(e.num); return n === null ? null : fromExact(makeExact(n, 1n)); }
    if (e.num === 1n) { const n = pow10Exp(e.den); return n === null ? null : fromExact(makeExact(-n, 1n)); }
    return null;
  }
  if (e.radicand === 10) { // ratio = (num/den)·√10 = 10^n · 10^½ ⇒ log₁₀ = n + ½ = (2n+1)/2
    if (e.den === 1n) { const n = pow10Exp(e.num); return n === null ? null : fromExact(makeExact(2n * n + 1n, 2n)); }
    if (e.num === 1n) { const n = pow10Exp(e.den); return n === null ? null : fromExact(makeExact(-2n * n + 1n, 2n)); }
    return null;
  }
  return null;
}
// I = I0·10^(L/10): exact khi L ≡ 0 mod 5 (lũy thừa 10 ⇒ radicand 1; lũy thừa √10 ⇒ radicand 10).
export function intensityFromLevel(L: number, I0: Scalar): { I: Scalar; exact: boolean } {
  const tenth = L / 10;
  if (Number.isInteger(tenth)) return { I: mul(I0, pow10Scalar(tenth)), exact: true };
  if (Number.isInteger(L / 5)) { // L ≡ 5 mod 10 ⇒ 10^(m+½) = 10^m·√10
    const m = (L - 5) / 10;
    return { I: mul(mul(I0, pow10Scalar(m)), ROOT10), exact: true };
  }
  return { I: num(I0.approx * Math.pow(10, tenth)), exact: false };
}
// r·10^(exp) với exp = Scalar: exact khi exp hữu tỉ mẫu ∈ {1,2} (√10); ngoài ra số.
function scaleByPow10(rScal: Scalar, exp: Scalar, floatExp: number): { v: Scalar; exact: boolean } {
  const e = exp.exact;
  if (e !== null && e.radicand === 1) {
    if (e.den === 1n) return { v: mul(rScal, pow10BigScalar(e.num)), exact: true };
    if (e.den === 2n) { // 10^(num/2) = 10^((num-1)/2)·√10 (num lẻ vì đã rút gọn)
      const half = (e.num - 1n) / 2n;
      return { v: mul(mul(rScal, pow10BigScalar(half)), ROOT10), exact: true };
    }
  }
  return { v: num(rScal.approx * Math.pow(10, floatExp)), exact: false };
}
function pow10BigScalar(e: bigint): Scalar {
  const p = 10n ** (e < 0n ? -e : e);
  return e >= 0n ? fromExact(makeExact(p, 1n)) : fromExact(makeExact(1n, p));
}

// ── Đếm nghiệm nguyên bằng bigint (§8) ───────────────────────────────────────────
function floordivBig(a: bigint, b: bigint): bigint { // b > 0
  const q = a / b, r = a % b;
  return r !== 0n && a < 0n ? q - 1n : q;
}
function ceildivBig(a: bigint, b: bigint): bigint { // b > 0
  const q = a / b, r = a % b;
  return r !== 0n && a > 0n ? q + 1n : q;
}
// Đếm số nguyên k với loN/loD < k < hiN/hiD (loD,hiD > 0).
export function countIntOpen(loN: bigint, loD: bigint, hiN: bigint, hiD: bigint): number {
  const smin = floordivBig(loN, loD) + 1n;
  const smax = ceildivBig(hiN, hiD) - 1n;
  return smax >= smin ? Number(smax - smin + 1n) : 0;
}
// Cách 2 (đối chiếu): liệt kê k ∈ [smin−2, smax+2], so hữu tỉ bằng nhân chéo bigint.
function countIntOpenBrute(loN: bigint, loD: bigint, hiN: bigint, hiD: bigint): number {
  const smin = floordivBig(loN, loD) + 1n - 2n;
  const smax = ceildivBig(hiN, hiD) - 1n + 2n;
  let c = 0;
  for (let k = smin; k <= smax; k++) if (loN < k * loD && k * hiD < hiN) c++;
  return c;
}
// a = L/λ hữu tỉ ⇒ P/Q bigint; λ vô tỉ ⇒ null (§8 cuối — violation rõ, KHÔNG im lặng).
function ratioBig(numer: Scalar, denom: Scalar): { P: bigint; Q: bigint } | null {
  const r = div(numer, denom).exact;
  if (r === null || r.radicand !== 1) return null;
  return { P: r.num, Q: r.den };
}

// ── Nguồn tần số / bước sóng / tốc độ — ưu tiên + auto-assert (§6.2) ────────────────
export function resolveWaveModel(op: WaveOpT, base: BaseLen): SolvedWave {
  const checks: Check[] = [];
  const violations: Violation[] = [];
  const errors: { message: string }[] = [];

  // f: f > T(→1/T) > omega(→ω/2π)
  const fSrc: { name: string; f: Scalar }[] = [];
  if (op.f !== undefined) fSrc.push({ name: 'f', f: scalarFromNumber(op.f) });
  if (op.T !== undefined) fSrc.push({ name: 'T', f: div(rat(1n), scalarFromNumber(op.T)) });
  if (op.omega !== undefined) fSrc.push({ name: 'omega', f: piToScalar(divP(toPiScalar(op.omega), TWO_PI)) });
  let f: Scalar | null = fSrc.length ? fSrc[0].f : null;
  for (let i = 1; i < fSrc.length; i++) redundant(checks, violations, 'f', fSrc[i].name, fSrc[0].name, fSrc[i].f.approx, (f as Scalar).approx);

  // λ: lambda > spaceCoeff(→2π/spaceCoeff)
  const lSrc: { name: string; l: Scalar }[] = [];
  if (op.lambda !== undefined) lSrc.push({ name: 'lambda', l: scalarFromNumber(op.lambda) });
  if (op.spaceCoeff !== undefined) lSrc.push({ name: 'spaceCoeff', l: piToScalar(divP(TWO_PI, toPiScalar(op.spaceCoeff))) });
  let lambda: Scalar | null = lSrc.length ? lSrc[0].l : null;
  for (let i = 1; i < lSrc.length; i++) redundant(checks, violations, 'λ', lSrc[i].name, lSrc[0].name, lSrc[i].l.approx, (lambda as Scalar).approx);

  // v: speed (đổi speedUnit → units.length/s)
  let v: Scalar | null = op.speed !== undefined ? speedToBase(op.speed, op.speedUnit, base) : null;

  // Nguồn DƯ (cả f, λ, v) ⇒ auto-assert v = λf; lệch ⇒ violation dịch sai đề (§6.2).
  if (f && lambda && v) {
    const vlf = mul(lambda, f);
    const d = Math.abs(vlf.approx - v.approx);
    const pass = d <= EPS_SELF * Math.max(1, Math.abs(v.approx));
    checks.push({ kind: 'v_redundant', detail: 'nguồn dư v = λf khớp', residual: d, pass });
    if (!pass) violations.push({ id: 'nguon-du-lech', message: `nguồn dư: v (${v.approx}) ≠ λf (${vlf.approx}) — dịch sai đề` });
  }
  // Cross-fill (v = λf) — chỉ điền chỗ THIẾU.
  if (f && lambda && !v) v = mul(lambda, f);
  else if (f && v && !lambda) lambda = div(v, f);
  else if (lambda && v && !f) f = div(v, lambda);

  const T = f ? div(rat(1n), f) : (op.T !== undefined ? scalarFromNumber(op.T) : null);
  const omega: PiScalar | null = op.omega !== undefined ? toPiScalar(op.omega) : (f ? mulP(TWO_PI, scalarToPi(f)) : null);
  const spaceK: PiScalar | null = op.spaceCoeff !== undefined ? toPiScalar(op.spaceCoeff) : (lambda ? divP(TWO_PI, scalarToPi(lambda)) : null);
  const phi: PiScalar | null = op.phi !== undefined ? toPiScalar(op.phi) : null;
  const dir: 1 | -1 = op.direction === '-x' ? -1 : 1;
  const A = op.A !== undefined ? scalarFromNumber(op.A) : null;

  return { model: { name: op.name, A, f, T, lambda, v, omega, spaceK, phi, dir, op }, checks, violations, errors };
}
function redundant(checks: Check[], violations: Violation[], q: string, nb: string, na: string, vb: number, va: number): void {
  const d = Math.abs(vb - va);
  const pass = d <= EPS_SELF * Math.max(1, Math.abs(va));
  checks.push({ kind: 'rate_redundant', detail: `nguồn ${q} dư "${nb}" khớp "${na}"`, residual: d, pass });
  if (!pass) violations.push({ id: 'nguon-du-lech', message: `nguồn ${q} "${nb}" (${vb.toFixed(4)}) lệch "${na}" (${va.toFixed(4)}) — dịch sai đề` });
}

// ── Nguồn âm (§6.3) ──────────────────────────────────────────────────────────────
export function resolveSoundModel(op: SoundSourceOpT, base: BaseLen): SolvedSound {
  const I0 = sciToScalar(op.I0 ?? { n: 1, exp: -12 });
  let power: Scalar | null = null, Iref: Scalar | null = null, rRef: Scalar | null = null, levelRef: Scalar | null = null;
  const errors: { message: string }[] = [];
  const checks: Check[] = [];
  if (op.power !== undefined) {
    power = sciToScalar(op.power);
  } else if (op.intensity !== undefined) {
    Iref = sciToScalar(op.intensity.I);
    rRef = op.intensity.atDistance !== undefined ? metersOf(op.intensity.atDistance, op.intensity.rUnit, base) : null;
    const cand = log10Exact(div(Iref, I0));
    levelRef = cand ? mul(rat(10n), cand) : num(10 * Math.log10(Iref.approx / I0.approx));
  } else if (op.level !== undefined) {
    const r = intensityFromLevel(op.level.L, I0);
    Iref = r.I;
    rRef = op.level.atDistance !== undefined ? metersOf(op.level.atDistance, op.level.rUnit, base) : null;
    levelRef = scalarFromNumber(op.level.L);
  }
  return { model: { name: op.name, I0, power, Iref, rRef, levelRef, op }, checks, violations: [], errors };
}

// I(r): nguồn điểm power ⇒ PiScalar k=−1; Iref nghịch-đảo-bình-phương ⇒ Scalar; Iref hằng (rRef=null) ⇒ Scalar.
type IntensityVal = { approx: number; exact: Scalar | null; pi: PiScalar | null };
function intensityAt(m: SoundModel, r: Scalar | null): IntensityVal | { problem: string } {
  if (m.power) {
    if (r === null) return { problem: `cần khoảng cách (atDistance) cho nguồn công suất "${m.name}"` };
    if (Math.abs(r.approx) < EPS0) return { problem: `khoảng cách = 0 cho nguồn "${m.name}"` };
    const fourPi: PiScalar = { s: rat(4n), k: 1 };
    const r2 = mul(r, r);
    const I = divP(scalarToPi(m.power), mulP(fourPi, scalarToPi(r2))); // P/(4πr²), bậc −1
    return { approx: approxP(I), exact: null, pi: I };
  }
  if (m.Iref) {
    if (m.rRef !== null) { // nguồn điểm: I(r) = Iref·(rRef/r)²
      const rr = r ?? m.rRef; // query không nêu r ⇒ tại rRef
      if (Math.abs(rr.approx) < EPS0) return { problem: `khoảng cách = 0 cho nguồn "${m.name}"` };
      const ratioR = div(m.rRef, rr);
      const I = mul(m.Iref, mul(ratioR, ratioR));
      return { approx: I.approx, exact: I, pi: null };
    }
    return { approx: m.Iref.approx, exact: m.Iref, pi: null }; // hằng (I cho tại điểm khảo sát)
  }
  return { problem: `nguồn âm "${m.name}" thiếu dữ kiện cường độ/công suất/mức` };
}

// L = 10·log₁₀(I/I0) — exact khi tỉ số lũy thừa √10 (§10.2); ngược lại số + approximate.
function levelOf(m: SoundModel, iv: IntensityVal, label?: string): QueryOutcome {
  const floatRatio = iv.approx / m.I0.approx;
  const floatRef = 10 * Math.log10(floatRatio);
  const checks: Check[] = [];
  let L: Scalar;
  if (iv.exact !== null) {
    const ratio = div(iv.exact, m.I0);
    const cand = log10Exact(ratio);
    L = cand ? mul(rat(10n), cand) : num(floatRef);
    checks.push({ kind: 'sound_level', detail: cand ? 'I/I₀ lũy thừa √10 ⇒ L exact' : 'I/I₀ không lũy thừa 10 ⇒ L số', residual: 0, pass: true });
  } else {
    L = num(floatRef); // nguồn P (π trong tỉ số) ⇒ số
    checks.push({ kind: 'sound_level', detail: 'nguồn công suất (π trong tỉ số) ⇒ L số', residual: 0, pass: true });
  }
  // Tự kiểm: 10^(L/10) ≈ ratio (float đảo log).
  const back = Math.pow(10, floatRef / 10);
  checks.push({ kind: 'sound_level_inverse', detail: '10^(L/10) = I/I₀', residual: Math.abs(back - floatRatio), pass: Math.abs(back - floatRatio) <= EPS_SELF * Math.max(1, floatRatio) });
  return { ok: true, answer: mkAnsCert('sound_level', L, floatRef, 'dB', label), checks };
}

// ── Dispatch query SÓNG CƠ (§7,§8,§9,§11.1) ───────────────────────────────────────
export function computeWaveQuery(solved: SolvedWave, q: WaveQuery, base: BaseLen): QueryOutcome {
  const m = solved.model;
  switch (q.kind) {
    case 'speed': {
      if (m.v === null) return { ok: false, problem: `cần tốc độ v của "${m.name}" — đề thiếu dữ kiện hoặc dịch thiếu` };
      const o = q.unit ? outSpeed(base, q.unit) : { factor: rat(1n), unit: `${base}/s` };
      const v = mul(m.v, o.factor);
      const checks: Check[] = [];
      if (m.lambda && m.f) { const vlf = mul(m.lambda, m.f); checks.push({ kind: 'v_lambda_f', detail: 'v = λf', residual: Math.abs(vlf.approx - m.v.approx), pass: Math.abs(vlf.approx - m.v.approx) <= EPS_SELF * Math.max(1, m.v.approx) }); }
      return { ok: true, answer: mkAnsS('speed', v, v.approx, o.unit, q.label), checks };
    }
    case 'wavelength': {
      if (m.lambda === null) return { ok: false, problem: `cần bước sóng λ của "${m.name}" — đề thiếu dữ kiện hoặc dịch thiếu` };
      const checks: Check[] = [];
      if (m.v && m.f) { const lvf = div(m.v, m.f); checks.push({ kind: 'lambda_v_f', detail: 'λ = v/f', residual: Math.abs(lvf.approx - m.lambda.approx), pass: Math.abs(lvf.approx - m.lambda.approx) <= EPS_SELF * Math.max(1, m.lambda.approx) }); }
      return { ok: true, answer: mkAnsS('wavelength', m.lambda, m.lambda.approx, base, q.label), checks };
    }
    case 'frequency': {
      if (m.f === null) return { ok: false, problem: `cần tần số f của "${m.name}" — đề thiếu dữ kiện hoặc dịch thiếu` };
      return { ok: true, answer: mkAnsS('frequency', m.f, m.f.approx, 'Hz', q.label), checks: [] };
    }
    case 'period': {
      if (m.T === null) return { ok: false, problem: `cần chu kỳ T (hoặc f) của "${m.name}"` };
      const checks: Check[] = [];
      if (m.f) { const p = mul(m.T, m.f); checks.push({ kind: 'period_freq', detail: 'T·f = 1', residual: Math.abs(p.approx - 1), pass: Math.abs(p.approx - 1) <= EPS_SELF }); }
      return { ok: true, answer: mkAnsS('period', m.T, m.T.approx, 's', q.label), checks, tSolved: m.T.approx };
    }
    case 'displacement_at': {
      if (m.A === null) return { ok: false, problem: `cần biên độ A của "${m.name}"` };
      if (m.omega === null || m.spaceK === null) return { ok: false, problem: `cần ω và hệ số không gian (λ) của "${m.name}" để tính li độ` };
      const phi = m.phi ?? { s: rat(0n), k: 0 };
      const tPi = toPiScalar(q.t);
      const pha = phaseOf(m, q.x, tPi, phi);
      const u = mul(m.A, cosP(pha));
      const An = m.A.approx, phaN = approxP(pha);
      const un = An * Math.cos(phaN);
      const checks: Check[] = [{ kind: 'u_bound', detail: '|u| ≤ A', residual: Math.max(0, Math.abs(un) - An), pass: Math.abs(un) <= An * (1 + 1e-9) }];
      return { ok: true, answer: mkAnsS('displacement_at', u, un, base, q.label), checks, tSolved: approxP(tPi) };
    }
    case 'phase_difference': {
      if (m.spaceK === null) return { ok: false, problem: `cần bước sóng λ của "${m.name}" để tính độ lệch pha` };
      const dphi = mulP(m.spaceK, scalarToPi(scalarFromNumber(q.d))); // 2π·d/λ
      const checks: Check[] = [];
      if (m.lambda) { const ref = 2 * Math.PI * q.d / m.lambda.approx; checks.push({ kind: 'phase_diff', detail: 'Δφ = 2πd/λ', residual: Math.abs(approxP(dphi) - ref), pass: Math.abs(approxP(dphi) - ref) <= EPS_SELF * Math.max(1, ref) }); }
      return { ok: true, answer: mkAnsP('phase_difference', dphi, approxP(dphi), 'rad', q.label), checks };
    }
    case 'interference_count': {
      if (m.lambda === null) return { ok: false, problem: `cần bước sóng λ của "${m.name}" để đếm giao thoa` };
      const ab = ratioBig(scalarFromNumber(q.separation), m.lambda);
      if (ab === null) { solved.violations.push({ id: 'lambda-vo-ti', message: `λ vô tỉ — đếm giao thoa cần λ hữu tỉ ("${m.name}")` }); return { ok: false, problem: `λ vô tỉ — không đếm được giao thoa exact` }; }
      const { P, Q } = ab; // a = P/Q = L/λ
      let n1: number, n2: number, kindTxt: string;
      if (q.kind2 === 'max') { // −a < k < a
        n1 = countIntOpen(-P, Q, P, Q); n2 = countIntOpenBrute(-P, Q, P, Q); kindTxt = 'cực đại';
      } else { // −a−½ < k < a−½  ⇔  −(2P+Q)/2Q < k < (2P−Q)/2Q
        n1 = countIntOpen(-(2n * P + Q), 2n * Q, 2n * P - Q, 2n * Q);
        n2 = countIntOpenBrute(-(2n * P + Q), 2n * Q, 2n * P - Q, 2n * Q); kindTxt = 'cực tiểu';
      }
      const pass = n1 === n2;
      const checks: Check[] = [{ kind: 'interference_two_ways', detail: `giao thoa ${kindTxt}: cách1=${n1}, cách2=${n2}${pass ? ', khớp' : ', LỆCH'}`, residual: Math.abs(n1 - n2), pass }];
      if (!pass) { solved.violations.push({ id: 'dem-lech', message: `đếm giao thoa hai cách lệch (${n1} vs ${n2})` }); return { ok: false, problem: `đếm giao thoa hai cách lệch` }; }
      return { ok: true, answer: mkAnsInt('interference_count', n1, q.label), checks };
    }
    case 'interference_point': {
      if (m.lambda === null) return { ok: false, problem: `cần bước sóng λ của "${m.name}"` };
      const delta = sub(scalarFromNumber(q.d2), scalarFromNumber(q.d1)); // δ = d₂ − d₁
      const rr = div(delta, m.lambda).exact; // r = δ/λ
      const rn = delta.approx / m.lambda.approx;
      let text: string;
      if (rr !== null && rr.radicand === 1) {
        const numAbs = rr.num < 0n ? -rr.num : rr.num;
        if (rr.den === 1n) text = `cực đại bậc ${numAbs}`;
        else if (rr.den === 2n && (numAbs % 2n === 1n)) text = `cực tiểu (giữa bậc ${(numAbs - 1n) / 2n} và ${(numAbs + 1n) / 2n})`;
        else text = `không phải vân (r = ${displayScalar(fromExact(rr))})`;
      } else text = `không phải vân (r ≈ ${fmtNum(rn)})`;
      return { ok: true, answer: { label: q.label, kind: 'interference_point', text, approx: Math.abs(rn), unit: '', approximate: rr === null }, checks: [] };
    }
    case 'standing_antinodes':
    case 'standing_nodes': {
      const k = standingK(m, q.length, q.boundary, q.loops, solved);
      if (k === null) return { ok: false, problem: `không xác định được số bó sóng cho "${m.name}" (thiếu λ hoặc λ không tạo sóng dừng ổn định)` };
      const antinodes = k, nodes = q.boundary === 'one-free' ? k : k + 1;
      const val = q.kind === 'standing_antinodes' ? antinodes : nodes;
      return { ok: true, answer: mkAnsInt(q.kind, val, q.label), checks: [{ kind: 'standing_k', detail: `k = ${k} (${q.boundary})`, residual: 0, pass: true }] };
    }
    case 'standing_wavelength': {
      const l = scalarFromNumber(q.length), k = BigInt(q.loops);
      const lam = q.boundary === 'one-free'
        ? div(mul(rat(4n), l), fromExact(makeExact(2n * k - 1n, 1n)))  // λ = 4l/(2k−1)
        : div(mul(rat(2n), l), fromExact(makeExact(k, 1n)));           // λ = 2l/k
      return { ok: true, answer: mkAnsS('standing_wavelength', lam, lam.approx, base, q.label), checks: [] };
    }
    case 'standing_frequency': {
      if (m.v === null) return { ok: false, problem: `cần tốc độ v của "${m.name}" để tính tần số sóng dừng` };
      const l = scalarFromNumber(q.length), k = BigInt(q.loops);
      const lam = q.boundary === 'one-free'
        ? div(mul(rat(4n), l), fromExact(makeExact(2n * k - 1n, 1n)))
        : div(mul(rat(2n), l), fromExact(makeExact(k, 1n)));
      const f = div(m.v, lam);
      return { ok: true, answer: mkAnsS('standing_frequency', f, f.approx, 'Hz', q.label), checks: [{ kind: 'standing_fv', detail: 'f = v/λ', residual: 0, pass: true }] };
    }
    case 'standing_min_frequency': {
      if (m.v === null) return { ok: false, problem: `cần tốc độ v của "${m.name}" để tính tần số cơ bản` };
      const l = scalarFromNumber(q.length);
      const f1 = q.boundary === 'one-free' ? div(m.v, mul(rat(4n), l)) : div(m.v, mul(rat(2n), l)); // v/(4l) | v/(2l)
      return { ok: true, answer: mkAnsS('standing_min_frequency', f1, f1.approx, 'Hz', q.label), checks: [] };
    }
  }
  return { ok: false, problem: `query ${(q as { kind: string }).kind} không áp cho op sóng cơ` };
}

// pha(x,t) = ωt − dir·(spaceK·x) + φ  (PiScalar bậc 1 khi ω,spaceK bậc 1).
function phaseOf(m: WaveModel, x: number, tPi: PiScalar, phi: PiScalar): PiScalar {
  const wt = mulP(m.omega as PiScalar, tPi);
  const kx = mulP(m.spaceK as PiScalar, scalarToPi(scalarFromNumber(x)));
  const dirKx = m.dir === 1 ? kx : negP(kx);
  return addP(subP(wt, dirKx), phi);
}
// k (số bó/bụng two-fixed): loops khai sẵn ⇒ dùng; vắng ⇒ suy từ λ (2l/λ two-fixed | (4l/λ+1)/2 one-free).
function standingK(m: WaveModel, length: number, boundary: 'two-fixed' | 'one-free', loops: number | undefined, solved: SolvedWave): number | null {
  if (loops !== undefined) return loops;
  if (m.lambda === null) return null;
  const l = scalarFromNumber(length);
  if (boundary === 'two-fixed') {
    const ratioE = div(mul(rat(2n), l), m.lambda).exact; // 2l/λ nguyên dương
    if (ratioE === null || ratioE.radicand !== 1 || ratioE.den !== 1n || ratioE.num <= 0n) {
      solved.violations.push({ id: 'khong-song-dung', message: `2l/λ không nguyên dương ⇒ không có sóng dừng ổn định ("${m.name}")` });
      return null;
    }
    return Number(ratioE.num);
  }
  const ratioE = div(mul(rat(4n), l), m.lambda).exact; // 4l/λ nguyên LẺ ⇒ k = (4l/λ+1)/2
  if (ratioE === null || ratioE.radicand !== 1 || ratioE.den !== 1n || ratioE.num <= 0n || ratioE.num % 2n !== 1n) {
    solved.violations.push({ id: 'khong-song-dung', message: `4l/λ không nguyên lẻ ⇒ không có sóng dừng một-đầu-tự-do ổn định ("${m.name}")` });
    return null;
  }
  return Number((ratioE.num + 1n) / 2n);
}
function outSpeed(base: BaseLen, unit: string): { factor: Scalar; unit: string } {
  const nat = `${base}/s`;
  if (unit === nat) return { factor: rat(1n), unit: nat };
  const to: BaseLen = unit === 'm/s' ? 'm' : 'cm';
  return { factor: lenFactor(base, to), unit };
}

// ── Dispatch query SÓNG ÂM (§10) ──────────────────────────────────────────────────
export function computeSoundQuery(solved: SolvedSound, q: WaveQuery, base: BaseLen): QueryOutcome {
  const m = solved.model;
  switch (q.kind) {
    case 'sound_intensity': {
      const r = q.atDistance !== undefined ? metersOf(q.atDistance, q.rUnit, base) : null;
      const iv = intensityAt(m, r);
      if ('problem' in iv) return { ok: false, problem: iv.problem };
      const checks: Check[] = [];
      if (iv.pi) return { ok: true, answer: mkAnsP('sound_intensity', iv.pi, iv.approx, 'W/m²', q.label), checks };
      return { ok: true, answer: mkAnsS('sound_intensity', iv.exact as Scalar, iv.approx, 'W/m²', q.label), checks };
    }
    case 'sound_level': {
      const r = q.atDistance !== undefined ? metersOf(q.atDistance, q.rUnit, base) : null;
      const iv = intensityAt(m, r);
      if ('problem' in iv) return { ok: false, problem: iv.problem };
      return levelOf(m, iv, q.label);
    }
    case 'sound_level_difference': {
      if (m.power === null && m.rRef === null) return { ok: false, problem: `cần nguồn điểm (power hoặc mức tại khoảng cách) cho "${m.name}"` };
      const rFrom = metersOf(q.fromDistance, q.rUnit, base), rTo = metersOf(q.toDistance, q.rUnit, base);
      const ratioR = div(rFrom, rTo);
      const ratioI = mul(ratioR, ratioR); // I(to)/I(from) = (r_from/r_to)²
      const cand = log10Exact(ratioI);
      const floatRef = 10 * Math.log10(ratioI.approx);
      const dL = cand ? mul(rat(10n), cand) : num(floatRef);
      const checks: Check[] = [{ kind: 'level_diff', detail: 'ΔL = 20·log₁₀(r_from/r_to)', residual: 0, pass: true }];
      return { ok: true, answer: mkAnsCert('sound_level_difference', dL, floatRef, 'dB', q.label), checks };
    }
    case 'distance_for_level': {
      if (m.levelRef === null || m.rRef === null) {
        if (m.power !== null) return distanceFromPower(m, q.level, base, q.label);
        return { ok: false, problem: `cần nguồn điểm có mức tại khoảng cách cho "${m.name}"` };
      }
      // r = rRef·10^((L_ref − L)/20)
      const expScal = div(sub(m.levelRef, scalarFromNumber(q.level)), rat(20n));
      const floatExp = (m.levelRef.approx - q.level) / 20;
      const scaled = scaleByPow10(m.rRef, expScal, floatExp);
      const outFactor = base === 'cm' ? rat(100n) : rat(1n); // m nội bộ → units.length
      const rOut = mul(scaled.v, outFactor);
      const checks: Check[] = [{ kind: 'distance_level', detail: 'r = rRef·10^((L_ref−L)/20)', residual: 0, pass: true }];
      return { ok: true, answer: mkAnsS('distance_for_level', rOut, rOut.approx, base, q.label), checks };
    }
  }
  return { ok: false, problem: `query ${(q as { kind: string }).kind} không áp cho op sóng âm` };
}
// Nguồn công suất: I0·10^(L/10) = P/(4πr²) ⇒ r = √(P/(4π·I0·10^(L/10))) — số (π).
function distanceFromPower(m: SoundModel, L: number, base: BaseLen, label?: string): QueryOutcome {
  const denom = 4 * Math.PI * m.I0.approx * Math.pow(10, L / 10);
  const rMeters = Math.sqrt((m.power as Scalar).approx / denom);
  const rOut = base === 'cm' ? rMeters * 100 : rMeters;
  return { ok: true, answer: { label, kind: 'distance_for_level', text: fmtNum(rOut), approx: rOut, unit: base, approximate: true }, checks: [{ kind: 'distance_power', detail: 'r = √(P/(4π·I₀·10^(L/10)))', residual: 0, pass: true }] };
}

// Kind query thuộc sóng âm (dùng để dispatch đúng loại op).
export const SOUND_KINDS = new Set(['sound_intensity', 'sound_level', 'sound_level_difference', 'distance_for_level']);
