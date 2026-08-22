// api/_lib/kernel/physics/gasHeat.ts
// THUẦN (Scalar) — không zod, không I/O. Tầng GIẢI KHÍ LÍ TƯỞNG + VẬT LÍ NHIỆT lớp 12 (spec §5,§7,§8):
//  - đổi đơn vị per-quantity HỮU TỈ EXACT (°C→K là +273 CỘNG hữu tỉ, KHÔNG factor nhân — D34-f);
//  - giải công thức ĐÓNG trên Scalar (đại số HỮU TỈ TUYẾN TÍNH ⇒ nghiệm = một phép chia, exact 100%,
//    radicand LUÔN = 1, KHÔNG dùng căn / giải bậc-2);
//  - TỰ KIỂM thay-ngược (num===0n) + ràng buộc vật lí (T>0 K, p/V>0, t_cb∈(min,max), m>0, chiều gia nhiệt);
//    vi phạm ⇒ violations, KHÔNG bịa đáp.
// Mỗi đại lượng có CẶP FLOAT ĐỘC LẬP (…n) — đường đối chiếu cho certify (mkGHAns).
import { type Scalar, rat, add, sub, mul, div, neg, exactToApprox } from '../scalar';
import { scalarFromNumber } from './kinematics';
import type { GasHeatPlan, StateOpT, ProcessOpT, ThermalBodyOpT } from './gasHeatSchema';

export const EPS_SELF = 1e-6; // ngưỡng thay-ngược khi rơi float (dùng chung trị số v0/circuit/dynamics)

// Violation VẬT LÍ (mô hình không thoả đề) ⇒ KHÔNG serve đáp (§8). Assert-sai KHÔNG thuộc nhóm này.
export const PHYSICAL_VIOLATIONS = new Set([
  'nhiet-do-tuyet-doi-am', 'ap-suat-hoac-the-tich-am', 't-cb-ngoai-khoang',
  'khoi-luong-am', 'chieu-gia-nhiet-nghich', 'dang-qua-trinh-mau-thuan',
]);

export type Check = { kind: string; detail: string; residual: number; pass: boolean };
export type Violation = { id: string; message: string };

// Đại lượng đã về SI: exact + bản float ĐỘC LẬP.
export type QtySI = { s: Scalar; n: number };
const q = (s: Scalar, n: number): QtySI => ({ s, n });
const mulQ = (a: QtySI, b: QtySI): QtySI => ({ s: mul(a.s, b.s), n: a.n * b.n });
const divQ = (a: QtySI, b: QtySI): QtySI => ({ s: div(a.s, b.s), n: a.n / b.n });
const subQ = (a: QtySI, b: QtySI): QtySI => ({ s: sub(a.s, b.s), n: a.n - b.n });
const addQ = (a: QtySI, b: QtySI): QtySI => ({ s: add(a.s, b.s), n: a.n + b.n });
const negQ = (a: QtySI): QtySI => ({ s: neg(a.s), n: -a.n });

// Dấu HỮU TỈ chính xác (exact khi có, ngược lại float).
const isPos = (a: QtySI): boolean => (a.s.exact !== null ? a.s.exact.num > 0n : a.n > 0);
const isZero = (a: QtySI): boolean => (a.s.exact !== null ? a.s.exact.num === 0n : Math.abs(a.n) < EPS_SELF);
// So sánh a-b: exact khi cùng radicand (gồm hữu tỉ).
function cmpQ(a: QtySI, b: QtySI): number {
  const d = subQ(a, b);
  return isZero(d) ? 0 : (d.s.exact !== null ? (d.s.exact.num > 0n ? 1 : -1) : d.n > 0 ? 1 : -1);
}

// ── §5.2 Bảng factor (hữu tỉ EXACT — lũy thừa 10 do factor gánh) ─────────────────
function presToPa(u: string, atmInPa: number): Scalar {
  switch (u) {
    case 'Pa': return rat(1n);
    case 'kPa': return rat(1000n);
    case 'bar': return rat(100000n);
    case 'atm': return rat(BigInt(atmInPa));
    case 'mmHg': return rat(101325n, 760n); // H5: giữ chuẩn mmHg thực (133,322 Pa); note khi trộn với atmInPa=100000
    default: throw new Error(`đơn vị áp suất "${u}" ngoài bảng đổi (Pa, kPa, atm, bar, mmHg)`);
  }
}
const presToPaN = (u: string, atmInPa: number): number =>
  u === 'Pa' ? 1 : u === 'kPa' ? 1000 : u === 'bar' ? 100000 : u === 'atm' ? atmInPa : u === 'mmHg' ? 101325 / 760 : NaN;

function volToM3(u: string): Scalar {
  switch (u) {
    case 'm3': return rat(1n);
    case 'L': return rat(1n, 1000n);
    case 'mL': case 'cm3': return rat(1n, 1000000n);
    default: throw new Error(`đơn vị thể tích "${u}" ngoài bảng đổi (m3, L, mL, cm3)`);
  }
}
const volToM3N = (u: string): number => (u === 'm3' ? 1 : u === 'L' ? 1e-3 : 1e-6);
const massToKg = (u: string): Scalar => (u === 'g' ? rat(1n, 1000n) : rat(1n));
const massToKgN = (u: string): number => (u === 'g' ? 1e-3 : 1);
const lenToM = (u: string): Scalar => (u === 'cm' ? rat(1n, 100n) : rat(1n));
const lenToMN = (u: string): number => (u === 'cm' ? 1e-2 : 1);

export const qtyPressure = (v: number, u: string, atm: number): QtySI => q(mul(scalarFromNumber(v), presToPa(u, atm)), v * presToPaN(u, atm));
export const qtyVolume = (v: number, u: string): QtySI => q(mul(scalarFromNumber(v), volToM3(u)), v * volToM3N(u));
export const qtyMass = (v: number, u: string): QtySI => q(mul(scalarFromNumber(v), massToKg(u)), v * massToKgN(u));
// °C→K là PHÉP CỘNG +273 EXACT (D34-f), KHÔNG factor nhân. unit='K' giữ nguyên.
export const qtyTemp = (v: number, u: string): QtySI => (u === 'C' ? q(add(scalarFromNumber(v), rat(273n)), v + 273) : q(scalarFromNumber(v), v));
const plain = (v: number): QtySI => q(scalarFromNumber(v), v); // c, n, λ, L, M, ρ — không đổi đơn vị

// ── Trạng thái/vật đã dựng về SI ─────────────────────────────────────────────────
export type StateSI = { name: string; p?: QtySI; V?: QtySI; T?: QtySI; n?: QtySI; mass?: QtySI; molarMass?: QtySI };
export type BodySI = {
  name: string; mass?: QtySI; c?: QtySI; T0?: QtySI;
  cSolid?: QtySI; cLiquid?: QtySI; cGas?: QtySI; meltTemp?: QtySI; boilTemp?: QtySI; latentMelt?: QtySI; latentVapor?: QtySI;
};

export type Entities = {
  states: Map<string, StateSI>;
  bodies: Map<string, BodySI>;
  process?: ProcessOpT;
  R: QtySI; atmInPa: number;
  checks: Check[]; violations: Violation[]; errors: { message: string }[];
};

// Dựng SI + tính pFromDepth (engine nhân ρgh) + kiểm miền vật lí đầu vào (T>0 K).
export function buildEntities(plan: GasHeatPlan): Entities {
  const checks: Check[] = [], violations: Violation[] = [], errors: { message: string }[] = [];
  const states = new Map<string, StateSI>(), bodies = new Map<string, BodySI>();
  const atm = plan.atmInPa;
  const R: QtySI = plan.R ? plain(plan.R.value) : q(rat(831n, 100n), 8.31);
  let process: ProcessOpT | undefined;

  const chkTempPos = (name: string, T: QtySI): void => {
    if (!isPos(T)) violations.push({ id: 'nhiet-do-tuyet-doi-am', message: `${name}: nhiệt độ tuyệt đối ${T.n} K ≤ 0 (phi vật lí)` });
  };

  try {
    for (const op of plan.ops) {
      if (op.op === 'process') { process = op; continue; }
      if (op.op === 'state') {
        const s = op as StateOpT;
        const st: StateSI = { name: s.name };
        if (s.p) st.p = qtyPressure(s.p.value, s.p.unit, atm);
        if (s.pFromDepth) {
          const hd = s.pFromDepth;
          const p0 = qtyPressure(hd.atmosphere.value, hd.atmosphere.unit, atm);
          const depth = q(mul(scalarFromNumber(hd.depth.value), lenToM(hd.depth.unit)), hd.depth.value * lenToMN(hd.depth.unit));
          const rho = plain(hd.density.value), g = plain(hd.g);
          const pBottom = addQ(p0, mulQ(mulQ(rho, g), depth)); // p = p₀ + ρgh
          st.p = pBottom;
          checks.push({ kind: 'hydrostatic', detail: `${s.name}: p_đáy = p₀ + ρgh = ${pBottom.n} Pa (engine tính, LLM không tự nhân)`, residual: pBottom.n, pass: isPos(pBottom) });
        }
        if (s.V) st.V = qtyVolume(s.V.value, s.V.unit);
        if (s.T) { st.T = qtyTemp(s.T.value, s.T.unit); chkTempPos(`trạng thái ${s.name}`, st.T); }
        if (s.n) st.n = plain(s.n.value);
        if (s.mass) st.mass = qtyMass(s.mass.value, s.mass.unit);
        if (s.molarMass) st.molarMass = plain(s.molarMass.value);
        states.set(s.name, st);
      } else {
        const b = op as ThermalBodyOpT;
        const bd: BodySI = { name: b.name };
        if (b.mass) bd.mass = qtyMass(b.mass.value, b.mass.unit);
        if (b.c) bd.c = plain(b.c.value);
        if (b.T0) { bd.T0 = qtyTemp(b.T0.value, b.T0.unit); chkTempPos(`vật ${b.name}`, bd.T0); }
        if (b.cSolid) bd.cSolid = plain(b.cSolid.value);
        if (b.cLiquid) bd.cLiquid = plain(b.cLiquid.value);
        if (b.cGas) bd.cGas = plain(b.cGas.value);
        if (b.meltTemp) { bd.meltTemp = qtyTemp(b.meltTemp.value, b.meltTemp.unit); chkTempPos(`vật ${b.name} (mốc nóng chảy)`, bd.meltTemp); }
        if (b.boilTemp) { bd.boilTemp = qtyTemp(b.boilTemp.value, b.boilTemp.unit); chkTempPos(`vật ${b.name} (mốc sôi)`, bd.boilTemp); }
        if (b.latentMelt) bd.latentMelt = plain(b.latentMelt.value);
        if (b.latentVapor) bd.latentVapor = plain(b.latentVapor.value);
        bodies.set(b.name, bd);
      }
    }
  } catch (e) {
    errors.push({ message: (e as Error).message });
  }
  return { states, bodies, process, R, atmInPa: atm, checks, violations, errors };
}

// ── §7.1 Giải QUÁ TRÌNH (nhân chéo tích/thương bằng nhau) ──────────────────────────
type Fac = { q: 'p' | 'V' | 'T'; st: 0 | 1 };
const CROSS: Record<ProcessOpT['kind'], { A: Fac[]; B: Fac[]; ign: 'p' | 'V' | 'T' | null }> = {
  isothermal: { A: [{ q: 'p', st: 0 }, { q: 'V', st: 0 }], B: [{ q: 'p', st: 1 }, { q: 'V', st: 1 }], ign: 'T' },
  isochoric: { A: [{ q: 'p', st: 0 }, { q: 'T', st: 1 }], B: [{ q: 'p', st: 1 }, { q: 'T', st: 0 }], ign: 'V' },
  isobaric: { A: [{ q: 'V', st: 0 }, { q: 'T', st: 1 }], B: [{ q: 'V', st: 1 }, { q: 'T', st: 0 }], ign: 'p' },
  general: { A: [{ q: 'p', st: 0 }, { q: 'V', st: 0 }, { q: 'T', st: 1 }], B: [{ q: 'p', st: 1 }, { q: 'V', st: 1 }, { q: 'T', st: 0 }], ign: null },
};

export type ProcessSolved = { quantity: 'p' | 'V' | 'T'; ofState: string; value: QtySI; checks: Check[]; violations: Violation[] };

// Giải đúng-một-ẩn của quá trình + thay-ngược (residual exact 0) + ràng buộc miền + đẳng-quá-trình nhất quán.
export function solveProcess(from: StateSI, to: StateSI, kind: ProcessOpT['kind']): ProcessSolved {
  const checks: Check[] = [], violations: Violation[] = [];
  const pick = (f: Fac): QtySI | undefined => (f.st === 0 ? from : to)[f.q];
  const nameOf = (f: Fac): string => (f.st === 0 ? from.name : to.name);
  const { A, B, ign } = CROSS[kind];

  // đẳng-quá-trình nhất quán: đại lượng "hằng" khai cả hai mà lệch ⇒ mâu thuẫn.
  if (ign) {
    const fromIgn = from[ign], toIgn = to[ign];
    if (fromIgn && toIgn && cmpQ(fromIgn, toIgn) !== 0)
      violations.push({ id: 'dang-qua-trinh-mau-thuan', message: `quá trình ${kind} nhưng ${ign} đổi (${fromIgn.n} → ${toIgn.n})` });
  }

  const all = [...A.map((f) => ({ f, side: 'A' as const })), ...B.map((f) => ({ f, side: 'B' as const }))];
  const blanks = all.filter((x) => pick(x.f) === undefined);
  if (blanks.length !== 1) throw new Error(`quá trình ${kind} cần đúng một ẩn, engine thấy ${blanks.length}`);
  const blank = blanks[0];

  const prod = (facs: Fac[], skip?: Fac): QtySI => {
    let acc = q(rat(1n), 1);
    for (const f of facs) { if (skip && f === skip) continue; const v = pick(f); if (v === undefined) throw new Error('thiếu đại lượng khi nhân'); acc = mulQ(acc, v); }
    return acc;
  };
  // blank ở A ⇒ blank = prod(B)/prod(A\blank); blank ở B ⇒ blank = prod(A)/prod(B\blank).
  const value = blank.side === 'A' ? divQ(prod(B), prod(A, blank.f)) : divQ(prod(A), prod(B, blank.f));

  // Ràng buộc miền: p, V > 0; nếu ẩn là T thì > 0 K.
  if (blank.f.q === 'T' && !isPos(value)) violations.push({ id: 'nhiet-do-tuyet-doi-am', message: `${nameOf(blank.f)}.T = ${value.n} K ≤ 0 (phi vật lí)` });
  if ((blank.f.q === 'p' || blank.f.q === 'V') && !isPos(value)) violations.push({ id: 'ap-suat-hoac-the-tich-am', message: `${nameOf(blank.f)}.${blank.f.q} = ${value.n} ≤ 0 (mô hình sai đề)` });

  // Thay-ngược: prod(A) − prod(B) = 0 EXACT (điền ẩn vào).
  const filledFrom = { ...from }, filledTo = { ...to };
  (blank.f.st === 0 ? filledFrom : filledTo)[blank.f.q] = value;
  const pf = (f: Fac): QtySI => ((f.st === 0 ? filledFrom : filledTo)[f.q] as QtySI);
  const prodFilled = (facs: Fac[]): QtySI => facs.reduce((acc, f) => mulQ(acc, pf(f)), q(rat(1n), 1));
  const resid = subQ(prodFilled(A), prodFilled(B));
  checks.push(resCheck('backsub-process', `thay-ngược ${kind}: ∏A − ∏B`, resid));

  return { quantity: blank.f.q, ofState: nameOf(blank.f), value, checks, violations };
}

// residual exact-0 ⇒ pass (num===0n); rơi float ⇒ ngưỡng tương đối EPS_SELF. residual number lấy GIÁ TRỊ EXACT khi có.
export function resCheck(kind: string, detail: string, resid: QtySI): Check {
  const e = resid.s.exact;
  const residual = e !== null ? exactToApprox(e) : resid.n;
  const pass = e !== null ? e.num === 0n : Math.abs(resid.n) <= EPS_SELF * Math.max(1, Math.abs(resid.n));
  return { kind, detail, residual, pass };
}

// ── §7.1 Clapeyron pV = nRT ────────────────────────────────────────────────────────
export type ScalarSolved = { value: QtySI; checks: Check[]; violations: Violation[] };
export function solveClapeyron(st: StateSI, solveFor: 'p' | 'V' | 'T' | 'amount' | 'mass', R: QtySI): ScalarSolved {
  const checks: Check[] = [], violations: Violation[] = [];
  const nFromState = (): QtySI => {
    if (st.n) return st.n;
    if (st.mass && st.molarMass) return q(mul(mul(st.mass.s, rat(1000n)), div(rat(1n), st.molarMass.s)), (st.mass.n * 1000) / st.molarMass.n); // n = m(g)/M
    throw new Error('Clapeyron: thiếu n (hoặc mass+molarMass)');
  };
  let value: QtySI;
  if (solveFor === 'amount') { value = divQ(mulQ(st.p!, st.V!), mulQ(R, st.T!)); } // n = pV/(RT)
  else if (solveFor === 'mass') { const n = divQ(mulQ(st.p!, st.V!), mulQ(R, st.T!)); value = mulQ(n, st.molarMass!); } // m(g)=nM
  else if (solveFor === 'p') { value = divQ(mulQ(nFromState(), mulQ(R, st.T!)), st.V!); } // p=nRT/V
  else if (solveFor === 'V') { value = divQ(mulQ(nFromState(), mulQ(R, st.T!)), st.p!); } // V=nRT/p
  else { value = divQ(mulQ(st.p!, st.V!), mulQ(nFromState(), R)); } // T=pV/(nR)

  if ((solveFor === 'p' || solveFor === 'V') && !isPos(value)) violations.push({ id: 'ap-suat-hoac-the-tich-am', message: `Clapeyron: ${solveFor} = ${value.n} ≤ 0` });
  if (solveFor === 'T' && !isPos(value)) violations.push({ id: 'nhiet-do-tuyet-doi-am', message: `Clapeyron: T = ${value.n} K ≤ 0` });

  // Thay-ngược pV − nRT = 0 với n/p/V/T vừa giải.
  const nCheck = solveFor === 'amount' ? value : solveFor === 'mass' ? divQ(value, st.molarMass!) : nFromState();
  const pC = solveFor === 'p' ? value : st.p!, vC = solveFor === 'V' ? value : st.V!, tC = solveFor === 'T' ? value : st.T!;
  const resid = subQ(mulQ(pC, vC), mulQ(nCheck, mulQ(R, tC)));
  checks.push(resCheck('backsub-clapeyron', 'thay-ngược pV − nRT', resid));
  return { value, checks, violations };
}

// ── §7.1 Cân bằng nhiệt: t_cb = Σ(mᵢcᵢT0ᵢ)/Σ(mᵢcᵢ) ────────────────────────────────
export function solveEquilibrium(bodies: BodySI[]): ScalarSolved {
  const checks: Check[] = [], violations: Violation[] = [];
  let numer = q(rat(0n), 0), denom = q(rat(0n), 0);
  for (const b of bodies) { const mc = mulQ(b.mass!, b.c!); numer = addQ(numer, mulQ(mc, b.T0!)); denom = addQ(denom, mc); }
  const Tf = divQ(numer, denom); // K
  // t_cb ∈ (min,max) nghiêm ngặt; degenerate min==max (mọi vật cùng T0) ⇒ chấp nhận + note (H6).
  const T0s = bodies.map((b) => b.T0!);
  const minT = T0s.reduce((a, b) => (cmpQ(b, a) < 0 ? b : a));
  const maxT = T0s.reduce((a, b) => (cmpQ(b, a) > 0 ? b : a));
  const degenerate = cmpQ(minT, maxT) === 0;
  if (!degenerate && !(cmpQ(Tf, minT) > 0 && cmpQ(Tf, maxT) < 0))
    violations.push({ id: 't-cb-ngoai-khoang', message: `t_cb = ${Tf.n} K ngoài (${minT.n}, ${maxT.n}) — hai vật cùng phía / đề mâu thuẫn` });
  checks.push(resCheck('backsub-balance', 'thay-ngược Σmᵢcᵢ(Tf−T0ᵢ)', backsubBalance(bodies, Tf)));
  if (degenerate) checks.push({ kind: 'degenerate-tcb', detail: 'mọi vật cùng nhiệt độ đầu ⇒ t_cb = nhiệt độ đó (chấp nhận có chủ đích, H6)', residual: 0, pass: true });
  return { value: Tf, checks, violations };
}
const backsubBalance = (bodies: BodySI[], Tf: QtySI): QtySI =>
  bodies.reduce((acc, b) => addQ(acc, mulQ(mulQ(b.mass!, b.c!), subQ(Tf, b.T0!))), q(rat(0n), 0));

// ── §7.1 mass_from_heat: ẩn mass / c / T0 của một vật, từ cân bằng nhiệt cảm-nhiệt thuần ─────────────
export function solveMassFromHeat(bodies: BodySI[], ofName: string, property: 'mass' | 'c' | 'T0', Tf: QtySI): ScalarSolved {
  const checks: Check[] = [], violations: Violation[] = [];
  const kBody = bodies.find((b) => b.name === ofName)!;
  const others = bodies.filter((b) => b.name !== ofName);
  // Σ_{i≠k} mᵢcᵢ(Tf−T0ᵢ)
  const S = others.reduce((acc, b) => addQ(acc, mulQ(mulQ(b.mass!, b.c!), subQ(Tf, b.T0!))), q(rat(0n), 0));

  let value: QtySI;
  if (property === 'T0') {
    // T0_k = Tf + S/(m_k c_k)   (H2)
    value = addQ(Tf, divQ(S, mulQ(kBody.mass!, kBody.c!)));
  } else {
    const dT = subQ(Tf, kBody.T0!); // Tf − T0_k
    if (isZero(dT)) throw new Error('mass_from_heat: Tf trùng T0 của vật ẩn ⇒ không xác định (chia 0)');
    if (property === 'mass') value = negQ(divQ(S, mulQ(kBody.c!, dT))); // m_k = −S/(c_k(Tf−T0_k))
    else value = negQ(divQ(S, mulQ(kBody.mass!, dT))); // c_k = −S/(m_k(Tf−T0_k))
  }

  // Ràng buộc: m>0, c>0; Tf∈(min,max) các T0 ĐÃ BIẾT (property=T0 dùng nghiệm để lập miền).
  if (property === 'mass' && !isPos(value)) violations.push({ id: 'khoi-luong-am', message: `mass_from_heat: m = ${value.n} ≤ 0 (Tf mâu thuẫn dữ kiện)` });
  if (property === 'c' && !isPos(value)) violations.push({ id: 'khoi-luong-am', message: `mass_from_heat: c = ${value.n} ≤ 0 (Tf mâu thuẫn dữ kiện)` });
  const knownT0 = (property === 'T0' ? [...others.map((b) => b.T0!), value] : bodies.map((b) => b.T0!));
  const minT = knownT0.reduce((a, b) => (cmpQ(b, a) < 0 ? b : a));
  const maxT = knownT0.reduce((a, b) => (cmpQ(b, a) > 0 ? b : a));
  if (!(cmpQ(Tf, minT) > 0 && cmpQ(Tf, maxT) < 0))
    violations.push({ id: 't-cb-ngoai-khoang', message: `Tf = ${Tf.n} K ngoài khoảng (${minT.n}, ${maxT.n}) T0` });

  // Thay-ngược Σ mᵢcᵢ(Tf−T0ᵢ) = 0 với nghiệm điền vào.
  const filled = bodies.map((b) => (b.name === ofName ? withSolved(b, property, value) : b));
  checks.push(resCheck('backsub-massheat', 'thay-ngược Σmᵢcᵢ(Tf−T0ᵢ)', backsubBalance(filled, Tf)));
  return { value, checks, violations };
}
const withSolved = (b: BodySI, property: 'mass' | 'c' | 'T0', v: QtySI): BodySI =>
  property === 'mass' ? { ...b, mass: v } : property === 'c' ? { ...b, c: v } : { ...b, T0: v };

// ── §7.2 heat — tổng đoạn enthalpy piecewise (vị-từ pha+ngưỡng TƯỜNG MINH; self-check chống over-count) ─
export type PhaseName = 'solid' | 'liquid' | 'gas';
const RANK: Record<PhaseName, number> = { solid: 0, liquid: 1, gas: 2 };
export type HeatSolved = { value: QtySI; checks: Check[]; violations: Violation[] };

export function solveHeat(
  b: BodySI, from: { phase: PhaseName; T: QtySI }, to: { phase: PhaseName; T: QtySI },
): HeatSolved {
  const checks: Check[] = [], violations: Violation[] = [];
  const rf = RANK[from.phase], rt = RANK[to.phase];
  const m = b.mass!;
  // Chiều gia nhiệt: (rank,temp) TĂNG nghiêm ngặt; else violation (from-enthalpy ≥ to-enthalpy).
  const forward = rt > rf || (rt === rf && cmpQ(to.T, from.T) > 0);
  if (!forward) {
    violations.push({ id: 'chieu-gia-nhiet-nghich', message: `heat: từ (${from.phase},${from.T.n}K) đến (${to.phase},${to.T.n}K) không tăng enthalpy` });
    return { value: q(rat(0n), 0), checks, violations };
  }
  const cap = (ph: PhaseName): QtySI => {
    const cp = ph === 'solid' ? b.cSolid : ph === 'liquid' ? b.cLiquid : b.cGas;
    const v = cp ?? b.c;
    if (!v) throw new Error(`heat: thiếu nhiệt dung riêng pha ${ph} (khai c hoặc c${ph[0].toUpperCase()}${ph.slice(1)})`);
    return v;
  };
  const reqTm = (): QtySI => { if (!b.meltTemp) throw new Error('heat: thiếu meltTemp (mốc nóng chảy)'); return b.meltTemp; };
  const reqTs = (): QtySI => { if (!b.boilTemp) throw new Error('heat: thiếu boilTemp (mốc sôi)'); return b.boilTemp; };
  const reqLm = (): QtySI => { if (!b.latentMelt) throw new Error('heat: thiếu latentMelt (λ)'); return b.latentMelt; };
  const reqLv = (): QtySI => { if (!b.latentVapor) throw new Error('heat: thiếu latentVapor (L)'); return b.latentVapor; };

  let Q = q(rat(0n), 0);
  let latentAdded = 0;
  const segs: { name: string; val: QtySI }[] = [];
  const addSens = (name: string, cph: PhaseName, lo: QtySI, hi: QtySI): void => {
    if (cmpQ(hi, lo) > 0) { const val = mulQ(mulQ(m, cap(cph)), subQ(hi, lo)); Q = addQ(Q, val); segs.push({ name, val }); }
  };

  // 1) rắn cảm nhiệt: từ from tới min(to, T_nc)
  if (rf === 0) { const upper = rt === 0 ? to.T : reqTm(); addSens('rắn', 'solid', from.T, upper); }
  // 2) nóng chảy: iff from ở rắn && to ≥ lỏng
  if (rf === 0 && rt >= 1) { reqTm(); const val = mulQ(m, reqLm()); Q = addQ(Q, val); segs.push({ name: 'nóng chảy', val }); latentAdded++; }
  // 3) lỏng cảm nhiệt: iff from ≤ lỏng && to ≥ lỏng; khoảng [max(from,T_nc), min(to,T_s)]
  if (rf <= 1 && rt >= 1) { const lo = rf === 0 ? reqTm() : from.T; const hi = rt >= 2 ? reqTs() : to.T; addSens('lỏng', 'liquid', lo, hi); }
  // 4) hoá hơi: iff from ≤ lỏng && to ≥ hơi
  if (rf <= 1 && rt >= 2) { reqTs(); const val = mulQ(m, reqLv()); Q = addQ(Q, val); segs.push({ name: 'hoá hơi', val }); latentAdded++; }
  // 5) hơi cảm nhiệt: iff to ở hơi; từ max(from,T_s) tới to
  if (rt === 2) { const lo = rf === 2 ? from.T : reqTs(); addSens('hơi', 'gas', lo, to.T); }

  // Self-check CHỐNG OVER-COUNT latent: số mốc cộng vào = số mốc đoạn THỰC SỰ băng qua (đếm theo pha đầu/cuối).
  const crossings = (rf < 1 && rt >= 1 ? 1 : 0) + (rf < 2 && rt >= 2 ? 1 : 0);
  checks.push({ kind: 'latent-count', detail: `mốc chuyển thể cộng vào ${latentAdded} = số mốc băng qua ${crossings}`, residual: latentAdded, pass: latentAdded === crossings });
  // Mỗi đoạn ≥ 0 (đã đảm bảo bởi khoảng giao; kiểm minh bạch).
  const nonneg = segs.every((s) => !( (s.val.s.exact ? s.val.s.exact.num < 0n : s.val.n < 0) ));
  checks.push({ kind: 'heat-forward', detail: `mỗi đoạn ≥ 0 (${segs.map((s) => `${s.name}=${s.val.n}`).join(', ') || 'không đoạn'})`, residual: segs.length, pass: nonneg });
  return { value: Q, checks, violations };
}
