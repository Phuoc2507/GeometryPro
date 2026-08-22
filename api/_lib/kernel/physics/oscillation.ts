// api/_lib/kernel/physics/oscillation.ts
// THUẦN (Scalar + PiScalar) — không zod, không I/O. Tầng GIẢI dao động điều hòa lớp 11 (spec §5–§8):
//  - chuẩn hoá op → OscModel: A (units.length), ω (PiScalar rad/s), φ (PiScalar, đã đổi form sin, (−π,π]),
//    m (kg), k (N/m); resolve nhiều nguồn theo ưu tiên + auto-assert dữ kiện dư (§5.2);
//  - công thức ĐÓNG trên (hữu tỉ+căn)·πᵏ: x/v/a, biên/ω/T/f, năng lượng, thời điểm-đầu-tiên (§6–§7);
//  - TỰ KIỂM: thay-ngược + hệ thức độc lập v²+ω²x²=ω²A² + bảo toàn năng lượng + quét minimality first_time (§8);
//  - mỗi đại lượng chạy SONG SONG một bản FLOAT ĐỘC LẬP làm floatRef cho certify (§3.4).
// KHÔNG BAO GIỜ throw (OS-2): refine zod chặn > 0, guard A>0, ω null ⇒ errors; runOscillation try/catch lưới cuối.
import {
  type Scalar, type Exact, num, rat, fromExact, makeExact, add, sub, mul, div, neg, sqrt,
  exactToApprox, displayScalar,
} from '../scalar';
import { scalarFromNumber } from './kinematics';
import { recognizeConstant } from '../analysis/recognize';
import {
  type PiScalar, approxP, isZeroPi, mulP, divP, addP, subP, sqrtP, negP, scalarToPi, TWO_PI, cosP, sinP,
  displayPiScalar, certifyPiScalar, toPiScalar,
} from './piScalar';
import type { OscillatorOpT, OscQuery } from './oscillationSchema';

export const EPS_SELF = 1e-6; // ngưỡng thay-ngược/tự-kiểm khi rơi float (dùng chung trị số v0)
const EPS_T = 1e-9; // t > 0 nghiêm ngặt (§7.4 — trạng thái đầu trùng đích KHÔNG tính là "qua lần đầu")

export type Check = { kind: string; detail: string; residual: number; pass: boolean };
export type Violation = { id: string; message: string };
export type OscAns = { label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean; queryIndex?: number };
export type QueryOutcome = { ok: true; answer: OscAns; checks: Check[]; tSolved?: number } | { ok: false; problem: string };

export type BaseLen = 'cm' | 'm';
export type OscModel = {
  name: string;
  A: Scalar | null; // theo units.length
  omega: PiScalar | null; // rad/s
  phi: PiScalar | null; // rad, đã đổi form sin, đã chuẩn hóa (−π, π]
  massKg: Scalar | null;
  kSpring: Scalar | null;
  op: OscillatorOpT;
};
export type Solved = { model: OscModel; checks: Check[]; violations: Violation[]; errors: { message: string }[] };

export const PHYSICAL_VIOLATIONS = new Set(['bien-do-khong-duong', 'nguon-du-lech', 'li-do-ngoai-bien']);

// ── Tiện ích số ─────────────────────────────────────────────────────────────────
const piToScalar = (p: PiScalar): Scalar => (p.k === 0 ? p.s : num(approxP(p))); // A không mang π: bậc≠0 ⇒ float
const sqPi = (p: PiScalar): PiScalar => mulP(p, p);
const exactEq = (a: Exact, b: Exact): boolean => a.num === b.num && a.den === b.den && a.radicand === b.radicand;

function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// Đáp từ Scalar (exact certify → recognize → thập phân). text KHÔNG kèm unit (như dynamics mkAns).
export function mkAnsS(kind: string, s: Scalar, floatRef: number, unit: string, label?: string): OscAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice };
}
// Đáp từ PiScalar (qua certifyPiScalar).
export function mkAnsP(kind: string, p: PiScalar, floatRef: number, unit: string, label?: string): OscAns {
  const c = certifyPiScalar(p, floatRef);
  return { label, kind, text: c.text, approx: c.approx, unit, approximate: c.approximate };
}

// ── Đổi đơn vị độ dài (per-quantity, hữu tỉ exact) ───────────────────────────────
function lenFactor(from: BaseLen, to: BaseLen): Scalar {
  if (from === to) return rat(1n);
  return from === 'cm' && to === 'm' ? rat(1n, 100n) : rat(100n); // cm→m ×1/100; m→cm ×100
}
const cmToM = (from: BaseLen): Scalar => lenFactor(from, 'm'); // đưa về SI cho năng lượng/con lắc
// vận tốc đầu vào (VUnit) → units.length/s.
function velToBase(v: number, unit: string | undefined, base: BaseLen): Scalar {
  const from: BaseLen = unit === 'm/s' ? 'm' : unit === 'cm/s' ? 'cm' : base; // vắng ⇒ hệ nền
  return mul(scalarFromNumber(v), lenFactor(from, base));
}
// đơn vị đầu RA cho v/a: query.unit override; vắng ⇒ hệ nền. Trả {factor (nhân vào giá trị hệ-nền), unit}.
function outVel(base: BaseLen, unit: string | undefined): { factor: Scalar; unit: string } {
  const nat = `${base}/s`;
  if (!unit || unit === nat) return { factor: rat(1n), unit: nat };
  const to: BaseLen = unit === 'm/s' ? 'm' : 'cm';
  return { factor: lenFactor(base, to), unit };
}
function outAcc(base: BaseLen, unit: string | undefined): { factor: Scalar; unit: string } {
  const nat = `${base}/s2`;
  if (!unit || unit === nat) return { factor: rat(1n), unit: nat };
  const to: BaseLen = unit === 'm/s2' ? 'm' : 'cm';
  return { factor: lenFactor(base, to), unit };
}

// ── Nguồn tốc độ góc ω (§5.2) — ưu tiên omega > T > f > count > spring+mass > pendulum ──
function pendulumOmega(pend: NonNullable<OscillatorOpT['pendulum']>): PiScalar {
  const lM = pend.lUnit === 'cm' ? mul(scalarFromNumber(pend.l), rat(1n, 100n)) : scalarFromNumber(pend.l);
  const gP: PiScalar = pend.gAsPiSquared ? { s: rat(1n), k: 2 } : scalarToPi(scalarFromNumber(pend.g as number)); // g = π² hoặc số
  return sqrtP(divP(gP, scalarToPi(lM))); // ω = √(g/l)
}
function rateSources(op: OscillatorOpT): { name: string; w: PiScalar }[] {
  const out: { name: string; w: PiScalar }[] = [];
  if (op.omega !== undefined) out.push({ name: 'omega', w: toPiScalar(op.omega) });
  if (op.T !== undefined) out.push({ name: 'T', w: divP(TWO_PI, toPiScalar(op.T)) });
  if (op.f !== undefined) out.push({ name: 'f', w: mulP(TWO_PI, toPiScalar(op.f)) });
  if (op.count !== undefined) out.push({ name: 'count', w: mulP(TWO_PI, divP(scalarToPi(scalarFromNumber(op.count.n)), toPiScalar(op.count.dt))) });
  if (op.spring && op.mass !== undefined) {
    const kS = scalarFromNumber(op.spring.k);
    const mS = op.massUnit === 'g' ? mul(scalarFromNumber(op.mass), rat(1n, 1000n)) : scalarFromNumber(op.mass);
    out.push({ name: 'spring', w: sqrtP(scalarToPi(div(kS, mS))) }); // √(k/m)
  }
  if (op.pendulum) out.push({ name: 'pendulum', w: pendulumOmega(op.pendulum) });
  return out;
}

// ── Nguồn biên độ A (§5.2) — A > L/2 > pathPerPeriod/4 > fromState > vmaxGiven > initial ──
function amplFromStateP(x: Scalar, v: Scalar, omega: PiScalar): PiScalar {
  // A = √(x² + (v/ω)²) — PiScalar (exact khi ω bậc 0; ω bậc 1 ⇒ khác bậc ⇒ collapse float trung thực)
  const vOverW = divP(scalarToPi(v), omega);
  return sqrtP(addP(scalarToPi(mul(x, x)), sqPi(vOverW)));
}
function amplSources(op: OscillatorOpT, omega: PiScalar | null, base: BaseLen): { name: string; A: Scalar }[] {
  const out: { name: string; A: Scalar }[] = [];
  if (op.A !== undefined) out.push({ name: 'A', A: scalarFromNumber(op.A) });
  if (op.L !== undefined) out.push({ name: 'L', A: mul(scalarFromNumber(op.L), rat(1n, 2n)) });
  if (op.pathPerPeriod !== undefined) out.push({ name: 'path', A: mul(scalarFromNumber(op.pathPerPeriod), rat(1n, 4n)) });
  if (op.fromState && omega) {
    const A = piToScalar(amplFromStateP(scalarFromNumber(op.fromState.x), velToBase(op.fromState.v, op.fromState.unit, base), omega));
    out.push({ name: 'fromState', A });
  }
  if (op.vmaxGiven && omega) {
    const A = piToScalar(divP(scalarToPi(velToBase(op.vmaxGiven.v, op.vmaxGiven.unit, base)), omega));
    out.push({ name: 'vmax', A });
  }
  if (op.initial && omega) {
    const A = piToScalar(amplFromStateP(scalarFromNumber(op.initial.x0), velToBase(op.initial.v0 ?? 0, op.initial.unit, base), omega));
    out.push({ name: 'initial', A });
  }
  return out;
}

// ── Pha từ điều kiện đầu (§5.3): cos φ = x₀/A, sin φ = −v₀/(ωA) ─────────────────
// Lưới 16 điểm trong (−π, π], khớp bằng EQUALITY STRUCT Exact (OS-3: hữu tỉ vs mốc vô tỉ ⇒ mismatch NGAY).
const GEXACT = (n: number, d: number, rad = 1): Exact => makeExact(BigInt(n), BigInt(d), rad);
const FULL_GRID: { n: number; d: number; cos: Exact; sin: Exact }[] = [
  { n: 0, d: 1, cos: GEXACT(1, 1), sin: GEXACT(0, 1) },
  { n: 1, d: 6, cos: GEXACT(1, 2, 3), sin: GEXACT(1, 2) },
  { n: 1, d: 4, cos: GEXACT(1, 2, 2), sin: GEXACT(1, 2, 2) },
  { n: 1, d: 3, cos: GEXACT(1, 2), sin: GEXACT(1, 2, 3) },
  { n: 1, d: 2, cos: GEXACT(0, 1), sin: GEXACT(1, 1) },
  { n: 2, d: 3, cos: GEXACT(-1, 2), sin: GEXACT(1, 2, 3) },
  { n: 3, d: 4, cos: GEXACT(-1, 2, 2), sin: GEXACT(1, 2, 2) },
  { n: 5, d: 6, cos: GEXACT(-1, 2, 3), sin: GEXACT(1, 2) },
  { n: 1, d: 1, cos: GEXACT(-1, 1), sin: GEXACT(0, 1) },
  { n: -1, d: 6, cos: GEXACT(1, 2, 3), sin: GEXACT(-1, 2) },
  { n: -1, d: 4, cos: GEXACT(1, 2, 2), sin: GEXACT(-1, 2, 2) },
  { n: -1, d: 3, cos: GEXACT(1, 2), sin: GEXACT(-1, 2, 3) },
  { n: -1, d: 2, cos: GEXACT(0, 1), sin: GEXACT(-1, 1) },
  { n: -2, d: 3, cos: GEXACT(-1, 2), sin: GEXACT(-1, 2, 3) },
  { n: -3, d: 4, cos: GEXACT(-1, 2, 2), sin: GEXACT(-1, 2, 2) },
  { n: -5, d: 6, cos: GEXACT(-1, 2, 3), sin: GEXACT(-1, 2) },
];
// θ₀ = arccos(c) ∈ [0, π] (9 điểm lưới) cho first_time.
const ARCCOS_GRID: { n: number; d: number; cos: Exact }[] = FULL_GRID.filter((g) => g.n >= 0 && g.n <= g.d);

function gridPhaseFrom(cosV: Scalar, sinV: Scalar): PiScalar | null {
  if (cosV.exact === null || sinV.exact === null) return null; // hữu tỉ/căn khớp; float ⇒ off-grid
  for (const g of FULL_GRID) if (exactEq(cosV.exact, g.cos) && exactEq(sinV.exact, g.sin)) {
    return g.n === 0 ? { s: rat(0n), k: 0 } : { s: rat(BigInt(g.n), BigInt(g.d)), k: 1 };
  }
  return null;
}
function gridArccos(c: Scalar): PiScalar | null {
  if (c.exact === null) return null;
  for (const g of ARCCOS_GRID) if (exactEq(c.exact, g.cos)) {
    return g.n === 0 ? { s: rat(0n), k: 0 } : { s: rat(BigInt(g.n), BigInt(g.d)), k: 1 };
  }
  return null;
}
// Chuẩn hóa PiScalar-pha (bậc 1 hữu tỉ) về (−π, π]. Ngoài dạng đó ⇒ trả nguyên (float đã ở gần miền).
function normalizePhase(phi: PiScalar): PiScalar {
  if (isZeroPi(phi)) return { s: rat(0n), k: 0 };
  if (phi.k !== 1 || phi.s.exact === null || phi.s.exact.radicand !== 1) return phi;
  let p = phi.s.exact.num;
  const q = phi.s.exact.den;
  // đưa p/q vào (−1, 1]: p' = p − 2q·round((p/q)/2) rồi tinh chỉnh biên
  const two = 2n * q;
  p = ((p % two) + two) % two; // [0, 2q)
  if (p > q) p -= two; // (−q, q]
  return p === 0n ? { s: rat(0n), k: 0 } : { s: rat(p, q), k: 1 };
}

// ── Chuẩn hoá op → OscModel (+ auto-assert nguồn dư, guard A>0) ────────────────────
export function resolveModel(op: OscillatorOpT, base: BaseLen): Solved {
  const checks: Check[] = [];
  const violations: Violation[] = [];
  const errors: { message: string }[] = [];

  const rates = rateSources(op);
  const omega = rates.length ? rates[0].w : null;
  // auto-assert nguồn rate dư (§5.2): nguồn còn lại phải khớp nguồn ưu tiên.
  for (let i = 1; i < rates.length; i++) {
    const d = Math.abs(approxP(rates[i].w) - approxP(omega as PiScalar));
    const pass = d <= EPS_SELF * Math.max(1, Math.abs(approxP(omega as PiScalar)));
    checks.push({ kind: 'rate_redundant', detail: `nguồn ω dư "${rates[i].name}" khớp "${rates[0].name}"`, residual: d, pass });
    if (!pass) violations.push({ id: 'nguon-du-lech', message: `nguồn ω "${rates[i].name}" (${approxP(rates[i].w).toFixed(4)}) lệch "${rates[0].name}" (${approxP(omega as PiScalar).toFixed(4)}) — dịch sai đề` });
  }

  const ampls = amplSources(op, omega, base);
  let A = ampls.length ? ampls[0].A : null;
  for (let i = 1; i < ampls.length; i++) {
    const d = Math.abs(ampls[i].A.approx - (A as Scalar).approx);
    const pass = d <= EPS_SELF * Math.max(1, Math.abs((A as Scalar).approx));
    checks.push({ kind: 'ampl_redundant', detail: `nguồn A dư "${ampls[i].name}" khớp "${ampls[0].name}"`, residual: d, pass });
    if (!pass) violations.push({ id: 'nguon-du-lech', message: `nguồn A "${ampls[i].name}" (${ampls[i].A.approx.toFixed(4)}) lệch "${ampls[0].name}" (${(A as Scalar).approx.toFixed(4)}) — dịch sai đề` });
  }

  // Guard A > 0 (OS-5) — trước mọi phép tính pha.
  if (A !== null && A.approx <= EPS_T) {
    violations.push({ id: 'bien-do-khong-duong', message: `vật "${op.name}" không dao động (A = ${A.approx} ≤ 0)` });
    A = null;
  }

  // Pha: op.phi (đổi form sin) ưu tiên; nếu không có, initial suy φ.
  let phi: PiScalar | null = null;
  if (op.phi !== undefined) {
    let p = toPiScalar(op.phi);
    if (op.form === 'sin') p = subP(p, { s: rat(1n, 2n), k: 1 }); // φ := φₛ − π/2 (ENGINE đổi — chống R1)
    phi = normalizePhase(p);
  } else if (op.initial && omega && A) {
    const cosV = div(scalarFromNumber(op.initial.x0), A);
    // sin φ = −v₀/(ωA)
    const v0 = velToBase(op.initial.v0 ?? 0, op.initial.unit, base);
    const wA = mulP(omega, scalarToPi(A));
    const sinP0 = piToScalar(divP(scalarToPi(neg(v0)), wA));
    const g = gridPhaseFrom(cosV, sinP0);
    phi = g ? normalizePhase(g) : { s: num(Math.atan2(-v0.approx / approxP(omega), op.initial.x0 / A.approx)), k: 0 };
  }

  // k lò xo (energy khi chỉ có k); m (kg) cho energy qua m.
  const kSpring = op.spring ? scalarFromNumber(op.spring.k) : null;
  const massKg = op.mass !== undefined ? (op.massUnit === 'g' ? mul(scalarFromNumber(op.mass), rat(1n, 1000n)) : scalarFromNumber(op.mass)) : null;

  return { model: { name: op.name, A, omega, phi, massKg, kSpring, op }, checks, violations, errors };
}

// ── Pha(t) + eval float độc lập ─────────────────────────────────────────────────
function phaseAt(model: OscModel, t: PiScalar): PiScalar {
  return addP(mulP(model.omega as PiScalar, t), model.phi as PiScalar);
}
const evalXn = (An: number, wn: number, phin: number, tn: number): number => An * Math.cos(wn * tn + phin);
const evalVn = (An: number, wn: number, phin: number, tn: number): number => -An * wn * Math.sin(wn * tn + phin);

// ── Năng lượng (§6): trả PiScalar (qua k ⇒ bậc 0; qua m,ω ⇒ bậc 2) ────────────────
function energyAt(model: OscModel, xMeters: Scalar, base: BaseLen): { E: PiScalar; En: number } | null {
  // ½·k·x²  (ưu tiên k) hoặc ½·m·ω²·x²
  const half = rat(1n, 2n);
  if (model.kSpring) {
    const E = scalarToPi(mul(half, mul(model.kSpring, mul(xMeters, xMeters))));
    return { E, En: approxP(E) };
  }
  if (model.massKg && model.omega) {
    const E = mulP(mulP(scalarToPi(mul(half, model.massKg)), sqPi(model.omega)), scalarToPi(mul(xMeters, xMeters)));
    return { E, En: approxP(E) };
  }
  return null;
}

// ── first_time_at_x (§7) — nghiệm lượng giác, lưới-trước số-sau ────────────────────
function firstTimeAtX(model: OscModel, xTarget: number, direction: 'positive' | 'negative' | 'any', label?: string): QueryOutcome {
  const A = model.A as Scalar, omega = model.omega as PiScalar, phi = model.phi as PiScalar;
  const An = A.approx, wn = approxP(omega), phin = approxP(phi);
  const cN = xTarget / An;
  if (Math.abs(cN) > 1 + 1e-9) return { ok: false, problem: `x₀ = ${xTarget} ngoài đoạn [−A, A] (A = ${fmtNum(An)})` };
  const T = divP(TWO_PI, omega);
  const TN = approxP(T);
  const boundary = Math.abs(cN) >= 1 - 1e-9;
  if (boundary && direction !== 'any') return { ok: false, problem: `x = ${xTarget} là biên (v = 0) — không có chiều qua, dùng direction:'any'` };

  const c = div(scalarFromNumber(xTarget), A);
  const theta0 = gridArccos(c); // PiScalar bậc 1 (hoặc {0,k0}) khi trên lưới; null ⇒ off-grid
  const grid = theta0 !== null;

  // giải một nhánh (thetaSigned = +θ₀ hoặc −θ₀) → t nhỏ nhất > EPS_T
  const solveBranch = (thetaSigned: PiScalar, thetaSignedN: number): PiScalar => {
    const base = divP(subP(thetaSigned, phi), omega);
    const baseN = approxP(base);
    let m = Math.round((EPS_T - baseN) / TN);
    while (baseN + m * TN <= EPS_T) m++;
    while (baseN + (m - 1) * TN > EPS_T) m--;
    return addP(base, mulP(scalarToPi(scalarFromNumber(m)), T));
  };
  const solveBranchN = (thetaSignedN: number): number => {
    const baseN = (thetaSignedN - phin) / wn;
    let m = Math.round((EPS_T - baseN) / TN);
    while (baseN + m * TN <= EPS_T) m++;
    while (baseN + (m - 1) * TN > EPS_T) m--;
    return baseN + m * TN;
  };

  const theta0N = Math.acos(Math.max(-1, Math.min(1, cN)));
  // nhánh +θ₀ ⇒ v ≤ 0 (chiều ÂM); nhánh −θ₀ ⇒ v ≥ 0 (chiều DƯƠNG)
  const wantBranches: { theta: PiScalar; thetaN: number }[] = [];
  if (grid) {
    const negTheta = theta0 as PiScalar;
    const posThetaN = -theta0N, negThetaN = theta0N;
    if (direction === 'negative' || direction === 'any') wantBranches.push({ theta: negTheta, thetaN: negThetaN });
    if (direction === 'positive' || direction === 'any') wantBranches.push({ theta: negP(negTheta), thetaN: posThetaN });
  }

  let tPi: PiScalar;
  if (grid && wantBranches.length) {
    const cand = wantBranches.map((b) => solveBranch(b.theta, b.thetaN));
    tPi = cand.reduce((best, cur) => (approxP(cur) < approxP(best) ? cur : best));
  } else {
    // đường SỐ (off-grid, trung thực): cùng phép trên float; đáp qua recognize (thường thập phân)
    const cands: number[] = [];
    if (direction === 'negative' || direction === 'any') cands.push(solveBranchN(theta0N));
    if (direction === 'positive' || direction === 'any') cands.push(solveBranchN(-theta0N));
    tPi = { s: num(Math.min(...cands)), k: 0 };
  }

  const tN = approxP(tPi);
  const answer = mkAnsP('first_time_at_x', tPi, tN, 's', label);
  const checks: Check[] = [];
  checks.push({ kind: 'first_time_mode', detail: grid ? 'first_time: đường lưới (exact)' : 'first_time: off-grid, đường số', residual: 0, pass: true });
  // thay-ngược: x(t*) = x₀
  const xBack = evalXn(An, wn, phin, tN);
  checks.push({ kind: 'first_time_x', detail: `x(t*) = x₀ = ${xTarget}`, residual: Math.abs(xBack - xTarget), pass: Math.abs(xBack - xTarget) <= EPS_SELF * Math.max(1, An) });
  // dấu vận tốc đúng chiều (bỏ khi biên)
  if (!boundary && direction !== 'any') {
    const vBack = evalVn(An, wn, phin, tN);
    const ok = direction === 'positive' ? vBack > 0 : vBack < 0;
    checks.push({ kind: 'first_time_dir', detail: `chiều ${direction} tại t*`, residual: ok ? 0 : Math.abs(vBack), pass: ok });
  }
  // quét minimality: 2048 mẫu trên (EPS_T, t*), không crossing (x−x₀) đúng chiều sớm hơn (caveat tiếp tuyến ⇒ advisory)
  if (!boundary) {
    const N = 2048;
    let earliest = Infinity;
    let prev = evalXn(An, wn, phin, EPS_T) - xTarget;
    for (let i = 1; i <= N; i++) {
      const tau = EPS_T + ((tN - EPS_T) * i) / N;
      const cur = evalXn(An, wn, phin, tau) - xTarget;
      if (prev === 0 || (prev < 0) !== (cur < 0)) {
        const vmid = evalVn(An, wn, phin, tau - (tN - EPS_T) / (2 * N));
        const dirOk = direction === 'any' || (direction === 'positive' ? vmid > 0 : vmid < 0);
        if (dirOk && tau < tN - 1e-7) { earliest = Math.min(earliest, tau); break; }
      }
      prev = cur;
    }
    checks.push({ kind: 'first_time_minimal', detail: 'không nghiệm hợp lệ sớm hơn t*', residual: Number.isFinite(earliest) ? earliest : 0, pass: !Number.isFinite(earliest) });
  }
  return { ok: true, answer, checks, tSolved: tN };
}

// ── Dispatch query → công thức đóng + tự kiểm (§6, §8.1) ──────────────────────────
export function computeOscQuery(solved: Solved, q: OscQuery, base: BaseLen): QueryOutcome {
  const m = solved.model;
  const reqA = (): Scalar | null => m.A;
  const reqW = (): PiScalar | null => m.omega;
  const needAW = (): string | null => (m.A === null ? `cần biên độ A của "${m.name}" — đề không đủ dữ kiện hoặc dịch thiếu` : m.omega === null ? `cần tần số góc ω của "${m.name}" — đề không đủ dữ kiện hoặc dịch thiếu` : null);
  const needPhase = (): string | null => (m.phi === null ? `cần pha ban đầu của "${m.name}" — đề thiếu φ và điều kiện đầu` : null);

  switch (q.kind) {
    case 'omega': {
      if (m.omega === null) return { ok: false, problem: `cần ω của "${m.name}"` };
      return { ok: true, answer: mkAnsP('omega', m.omega, approxP(m.omega), 'rad/s', q.label), checks: [] };
    }
    case 'period': {
      if (m.omega === null) return { ok: false, problem: `cần ω để tính chu kỳ của "${m.name}"` };
      const T = divP(TWO_PI, m.omega);
      const checks: Check[] = [];
      // T·f = 1 exact
      const f = divP(m.omega, TWO_PI);
      const prod = mulP(T, f);
      checks.push({ kind: 'period_freq', detail: 'T·f = 1', residual: Math.abs(approxP(prod) - 1), pass: Math.abs(approxP(prod) - 1) <= EPS_SELF });
      return { ok: true, answer: mkAnsP('period', T, approxP(T), 's', q.label), checks, tSolved: approxP(T) };
    }
    case 'frequency': {
      if (m.omega === null) return { ok: false, problem: `cần ω để tính tần số của "${m.name}"` };
      const f = divP(m.omega, TWO_PI);
      return { ok: true, answer: mkAnsP('frequency', f, approxP(f), 'Hz', q.label), checks: [] };
    }
    case 'amplitude': {
      if (m.A === null) return { ok: false, problem: `cần biên độ A của "${m.name}"` };
      return { ok: true, answer: mkAnsS('amplitude', m.A, m.A.approx, base, q.label), checks: [] };
    }
    case 'initial_phase': {
      const e = needPhase(); if (e) return { ok: false, problem: e };
      return { ok: true, answer: mkAnsP('initial_phase', m.phi as PiScalar, approxP(m.phi as PiScalar), 'rad', q.label), checks: [] };
    }
    case 'vmax': {
      const e = needAW(); if (e) return { ok: false, problem: e };
      const v = mulP(scalarToPi(m.A as Scalar), m.omega as PiScalar);
      const o = outVel(base, q.unit);
      const vc = mulP(v, scalarToPi(o.factor));
      return { ok: true, answer: mkAnsP('vmax', vc, approxP(vc), o.unit, q.label), checks: [] };
    }
    case 'amax': {
      const e = needAW(); if (e) return { ok: false, problem: e };
      const a = mulP(scalarToPi(m.A as Scalar), sqPi(m.omega as PiScalar));
      const o = outAcc(base, q.unit);
      const ac = mulP(a, scalarToPi(o.factor));
      return { ok: true, answer: mkAnsP('amax', ac, approxP(ac), o.unit, q.label), checks: [] };
    }
    case 'x_at': {
      const e = needAW() || needPhase(); if (e) return { ok: false, problem: e };
      const A = m.A as Scalar, omega = m.omega as PiScalar, phi = m.phi as PiScalar;
      const pha = phaseAt(m, toPiScalar(q.t));
      const x = mul(A, cosP(pha));
      const An = A.approx, wn = approxP(omega), phin = approxP(phi), tn = approxP(toPiScalar(q.t));
      const xn = evalXn(An, wn, phin, tn);
      const checks: Check[] = [];
      checks.push({ kind: 'x_bound', detail: '|x| ≤ A', residual: Math.max(0, Math.abs(xn) - An), pass: Math.abs(xn) <= An * (1 + 1e-9) });
      const vn = evalVn(An, wn, phin, tn);
      const rel = vn * vn + wn * wn * xn * xn - wn * wn * An * An;
      checks.push({ kind: 'indep_relation', detail: 'v² + ω²x² = ω²A²', residual: Math.abs(rel), pass: Math.abs(rel) <= EPS_SELF * Math.max(1, (wn * An) ** 2) });
      return { ok: true, answer: mkAnsS('x_at', x, xn, base, q.label), checks, tSolved: tn };
    }
    case 'v_at': {
      const e = needAW() || needPhase(); if (e) return { ok: false, problem: e };
      const A = m.A as Scalar, omega = m.omega as PiScalar, phi = m.phi as PiScalar;
      const pha = phaseAt(m, toPiScalar(q.t));
      const v = negP(mulP(mulP(scalarToPi(A), omega), scalarToPi(sinP(pha))));
      const o = outVel(base, q.unit);
      const vc = mulP(v, scalarToPi(o.factor));
      const An = A.approx, wn = approxP(omega), phin = approxP(phi), tn = approxP(toPiScalar(q.t));
      const vn = evalVn(An, wn, phin, tn) * o.factor.approx;
      const vmaxN = An * wn * o.factor.approx;
      const checks: Check[] = [{ kind: 'v_bound', detail: '|v| ≤ vmax', residual: Math.max(0, Math.abs(vn) - Math.abs(vmaxN)), pass: Math.abs(vn) <= Math.abs(vmaxN) * (1 + 1e-9) }];
      return { ok: true, answer: mkAnsP('v_at', vc, vn, o.unit, q.label), checks, tSolved: tn };
    }
    case 'a_at': {
      const e = needAW() || needPhase(); if (e) return { ok: false, problem: e };
      const A = m.A as Scalar, omega = m.omega as PiScalar, phi = m.phi as PiScalar;
      const pha = phaseAt(m, toPiScalar(q.t));
      const x = mul(A, cosP(pha));
      const a = negP(mulP(sqPi(omega), scalarToPi(x))); // a = −ω²x
      const o = outAcc(base, q.unit);
      const ac = mulP(a, scalarToPi(o.factor));
      const An = A.approx, wn = approxP(omega), phin = approxP(phi), tn = approxP(toPiScalar(q.t));
      const xn = evalXn(An, wn, phin, tn);
      const an = -wn * wn * xn * o.factor.approx;
      const amaxN = An * wn * wn * o.factor.approx;
      const checks: Check[] = [{ kind: 'a_bound', detail: '|a| ≤ amax; a = −ω²x', residual: Math.max(0, Math.abs(an) - Math.abs(amaxN)), pass: Math.abs(an) <= Math.abs(amaxN) * (1 + 1e-9) }];
      return { ok: true, answer: mkAnsP('a_at', ac, an, o.unit, q.label), checks, tSolved: tn };
    }
    case 'speed_at_x': {
      const e = needAW(); if (e) return { ok: false, problem: e };
      const A = m.A as Scalar, omega = m.omega as PiScalar;
      if (Math.abs(q.x) > A.approx * (1 + 1e-9)) return { ok: false, problem: `|x| = ${Math.abs(q.x)} > A = ${fmtNum(A.approx)} — li độ ngoài biên` };
      const root = sqrt(sub(mul(A, A), mul(scalarFromNumber(q.x), scalarFromNumber(q.x)))); // √(A²−x²)
      const v = mulP(omega, scalarToPi(root)); // ω·√(A²−x²)
      const o = outVel(base, q.unit);
      const vc = mulP(v, scalarToPi(o.factor));
      return { ok: true, answer: mkAnsP('speed_at_x', vc, approxP(vc), o.unit, q.label), checks: [] };
    }
    case 'x_at_speed': {
      const e = needAW(); if (e) return { ok: false, problem: e };
      const A = m.A as Scalar, omega = m.omega as PiScalar;
      const vBase = velToBase(q.v, q.vUnit, base);
      const vmaxN = A.approx * approxP(omega);
      if (vBase.approx > vmaxN * (1 + 1e-9)) return { ok: false, problem: `v = ${vBase.approx} > vmax = ${fmtNum(vmaxN)} — vượt tốc độ cực đại` };
      const vOverW = divP(scalarToPi(vBase), omega);
      const x = piToScalar(sqrtP(subP(scalarToPi(mul(A, A)), sqPi(vOverW)))); // √(A²−v²/ω²)
      return { ok: true, answer: mkAnsS('x_at_speed', x, x.approx, base, q.label), checks: [] };
    }
    case 'x_where_energy_ratio': {
      if (m.A === null) return { ok: false, problem: `cần biên độ A của "${m.name}"` };
      // Wđ = n·Wt ⇒ |x| = A/√(1+n)
      const denom = sqrt(add(rat(1n), scalarFromNumber(q.ratio)));
      const x = div(m.A, denom);
      return { ok: true, answer: mkAnsS('x_where_energy_ratio', x, x.approx, base, q.label), checks: [] };
    }
    case 'energy_total': {
      const A = reqA(); if (A === null) return { ok: false, problem: `cần biên độ A của "${m.name}"` };
      const Am = mul(A, cmToM(base));
      const E = energyAt(m, Am, base);
      if (!E) return { ok: false, problem: `cần độ cứng k HOẶC (khối lượng m và ω) để tính năng lượng của "${m.name}"` };
      return { ok: true, answer: mkAnsP('energy_total', E.E, E.En, 'J', q.label), checks: [] };
    }
    case 'energy_potential_at':
    case 'energy_kinetic_at': {
      const A = reqA(); if (A === null) return { ok: false, problem: `cần biên độ A của "${m.name}"` };
      // li độ x tại điểm khai (x trực tiếp hoặc từ t)
      let xLen: Scalar; let xn: number;
      if ('x' in q.at) { xLen = scalarFromNumber(q.at.x); xn = q.at.x; }
      else {
        const e = needAW() || needPhase(); if (e) return { ok: false, problem: e };
        const pha = phaseAt(m, toPiScalar(q.at.t));
        xLen = mul(A, cosP(pha)); xn = evalXn(A.approx, approxP(m.omega as PiScalar), approxP(m.phi as PiScalar), approxP(toPiScalar(q.at.t)));
      }
      if (Math.abs(xn) > A.approx * (1 + 1e-9)) return { ok: false, problem: `|x| = ${Math.abs(xn)} > A = ${fmtNum(A.approx)}` };
      const Am = mul(A, cmToM(base));
      const xm = mul(xLen, cmToM(base));
      const W = energyAt(m, Am, base);
      const Wt = energyAt(m, xm, base);
      if (!W || !Wt) return { ok: false, problem: `cần k HOẶC (m và ω) để tính năng lượng của "${m.name}"` };
      const checks: Check[] = [];
      if (q.kind === 'energy_potential_at') {
        return { ok: true, answer: mkAnsP('energy_potential_at', Wt.E, Wt.En, 'J', q.label), checks };
      }
      const Wd = subP(W.E, Wt.E); // W − Wt (subP cùng bậc ⇒ exact)
      // bảo toàn: Wđ + Wt = W
      const recon = addP(Wd, Wt.E);
      checks.push({ kind: 'energy_conserve', detail: 'Wđ + Wt = W', residual: Math.abs(approxP(recon) - W.En), pass: Math.abs(approxP(recon) - W.En) <= EPS_SELF * Math.max(1, W.En) });
      return { ok: true, answer: mkAnsP('energy_kinetic_at', Wd, approxP(Wd), 'J', q.label), checks };
    }
    case 'first_time_at_x': {
      const e = needAW() || needPhase(); if (e) return { ok: false, problem: e };
      return firstTimeAtX(m, q.x, q.direction ?? 'any', q.label);
    }
  }
  return { ok: false, problem: `query ${(q as { kind: string }).kind} chưa hỗ trợ` };
}
