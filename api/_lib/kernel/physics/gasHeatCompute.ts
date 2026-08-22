// api/_lib/kernel/physics/gasHeatCompute.ts
// Tầng compute: mỗi query MỘT công thức đóng (gọi solver gasHeat.ts) → đổi SI về đơn-vị-đáp (HỮU TỈ EXACT,
// round-trip) → mkGHAns 3 bậc + certify float ĐỘC LẬP. answers[].unit do ENGINE ghi theo kind (C6/§7.1).
//
// LUẬT HIỂN THỊ D34-b ("khoa-học-hoá lũy thừa 10", đồng bộ efield §14.1): displayGasHeat GIỮ phân số trần
// cho mọi phân số (reviewer §14.1: "8/3, 28/23, 32/3 ĐẸP, tự nhiên cho chương này"); CHỈ số NGUYÊN có
// |v|≥10⁴ mới khoa-học-hoá dấu-phẩy-VN. approx+exact luôn giữ. (Chỉ G9/G10 đổi so §12 — đúng "lũy thừa 10".)
import { type Scalar, rat, mul, div, sub, add, displayExact, exactToApprox } from '../scalar';
import { recognizeConstant } from '../analysis/recognize';
import { scalarFromNumber } from './kinematics';
import {
  type Entities, type QtySI, type Check, type Violation, type PhaseName,
  qtyTemp, solveClapeyron, solveEquilibrium, solveMassFromHeat, solveHeat,
} from './gasHeat';
import type { GasHeatQuery } from './gasHeatSchema';

export type GHAns = { label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean; note?: string; queryIndex?: number };
export type QueryOutcome = { ok: true; answer: GHAns; checks: Check[]; violations: Violation[] } | { ok: false; problem: string };

// ── §5.2 factor đảo (SI → đơn vị đáp), HỮU TỈ EXACT ──────────────────────────────
const PRES_FROM_PA = (u: string, atm: number): Scalar => (u === 'Pa' ? rat(1n) : u === 'kPa' ? rat(1000n) : u === 'bar' ? rat(100000n) : u === 'atm' ? rat(BigInt(atm)) : rat(101325n, 760n));
const PRES_FROM_PA_N = (u: string, atm: number): number => (u === 'Pa' ? 1 : u === 'kPa' ? 1000 : u === 'bar' ? 100000 : u === 'atm' ? atm : 101325 / 760);
const VOL_FROM_M3 = (u: string): Scalar => (u === 'm3' ? rat(1n) : u === 'L' ? rat(1n, 1000n) : rat(1n, 1000000n));
const VOL_FROM_M3_N = (u: string): number => (u === 'm3' ? 1 : u === 'L' ? 1e-3 : 1e-6);

const divBy = (si: QtySI, factS: Scalar, factN: number): QtySI => ({ s: div(si.s, factS), n: si.n / factN });
const mulBy = (si: QtySI, factS: Scalar, factN: number): QtySI => ({ s: mul(si.s, factS), n: si.n * factN });
// K → đơn vị: 'C' trừ 273 EXACT, 'K' giữ.
const outTemp = (K: QtySI, u: string): QtySI => (u === 'C' ? { s: sub(K.s, rat(273n)), n: K.n - 273 } : K);

// ── LUẬT HIỂN THỊ D34-b ──────────────────────────────────────────────────────────
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (n: number): string => String(n).split('').map((c) => SUP[c]).join('');
// numAbs (nguyên) → "a·10ⁿ" (a∈[1,10) dấu phẩy VN); a=1 ⇒ "10ⁿ".
function sci(numAbs: bigint): string {
  const digits = numAbs.toString();
  const d = digits.length;
  let mant = d === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
  if (mant.includes('.')) mant = mant.replace(/0+$/, '').replace(/\.$/, '');
  const exp = d - 1;
  const mantVN = mant.replace('.', ',');
  return mantVN === '1' ? `10${sup(exp)}` : `${mantVN}·10${sup(exp)}`;
}
function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
export function displayGasHeat(s: Scalar): string {
  const e = s.exact;
  if (e === null) { const n = recognizeConstant(s.approx); return n ? n.text : fmtNum(s.approx); }
  if (e.radicand !== 1) return displayExact(e); // an toàn — thực tế chương này radicand luôn 1
  if (e.den !== 1n) return displayExact(e); // phân số ⇒ TRẦN "8/3", "12/5", "28/23"
  const sign = e.num < 0n ? '-' : '';
  const numAbs = e.num < 0n ? -e.num : e.num;
  if (Math.abs(exactToApprox(e)) >= 1e4) return sign + sci(numAbs); // số nguyên lớn ⇒ khoa-học-hoá
  return sign + numAbs.toString(); // số nguyên nhỏ ⇒ trần "6", "44"
}

// Đáp 3 bậc: exact certify với float ĐỘC LẬP → displayGasHeat; chết exact → recognize; trượt → fmtNum. text KHÔNG kèm unit.
export function mkGHAns(kind: string, s: Scalar, floatRef: number, unit: string, label?: string, note?: string): GHAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol)
    return { label, kind, text: displayGasHeat(s), approx: exactToApprox(s.exact), unit, approximate: false, note };
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice, note };
}

const chkTempViol = (name: string, T: QtySI, violations: Violation[]): void => {
  if (!(T.s.exact ? T.s.exact.num > 0n : T.n > 0)) violations.push({ id: 'nhiet-do-tuyet-doi-am', message: `${name}: ${T.n} K ≤ 0 (phi vật lí)` });
};

// entities.states đã được runGasHeat điền ẩn của quá trình TRƯỚC khi gọi compute.
export function computeGasHeatQuery(ent: Entities, query: GasHeatQuery, qi: number): QueryOutcome {
  try {
    const checks: Check[] = [], violations: Violation[] = [];
    switch (query.kind) {
      case 'state_value': {
        const st = ent.states.get(query.of);
        if (!st) return { ok: false, problem: `state_value: trạng thái "${query.of}" không tồn tại` };
        const val = st[query.quantity];
        if (!val) return { ok: false, problem: `state_value: chưa giải được ${query.of}.${query.quantity}` };
        let out: QtySI, unit: string;
        if (query.quantity === 'p') { unit = query.unit ?? 'Pa'; out = divBy(val, PRES_FROM_PA(unit, ent.atmInPa), PRES_FROM_PA_N(unit, ent.atmInPa)); }
        else if (query.quantity === 'V') { unit = query.unit ?? 'm3'; out = divBy(val, VOL_FROM_M3(unit), VOL_FROM_M3_N(unit)); }
        else { unit = query.unit ?? 'K'; out = outTemp(val, unit); }
        return { ok: true, answer: { ...mkGHAns('state_value', out.s, out.n, unit, query.label), queryIndex: qi }, checks, violations };
      }
      case 'clapeyron': {
        const st = ent.states.get(query.of);
        if (!st) return { ok: false, problem: `clapeyron: trạng thái "${query.of}" không tồn tại` };
        const r = solveClapeyron(st, query.solveFor, ent.R);
        checks.push(...r.checks); violations.push(...r.violations);
        let out = r.value, unit: string;
        if (query.solveFor === 'amount') unit = query.unit ?? 'mol';
        else if (query.solveFor === 'mass') { unit = query.unit ?? 'g'; if (unit === 'kg') out = mulBy(out, rat(1n, 1000n), 1e-3); } // value là GAM
        else if (query.solveFor === 'p') { unit = query.unit ?? 'Pa'; out = divBy(out, PRES_FROM_PA(unit, ent.atmInPa), PRES_FROM_PA_N(unit, ent.atmInPa)); }
        else if (query.solveFor === 'V') { unit = query.unit ?? 'm3'; out = divBy(out, VOL_FROM_M3(unit), VOL_FROM_M3_N(unit)); }
        else { unit = query.unit ?? 'K'; out = outTemp(out, unit); }
        return { ok: true, answer: { ...mkGHAns('clapeyron', out.s, out.n, unit, query.label), queryIndex: qi }, checks, violations };
      }
      case 'heat': {
        const b = ent.bodies.get(query.of);
        if (!b) return { ok: false, problem: `heat: vật "${query.of}" không tồn tại` };
        const fromK = qtyTemp(query.from.temp.value, query.from.temp.unit);
        const toK = qtyTemp(query.to.temp.value, query.to.temp.unit);
        chkTempViol(`heat ${query.of} (from)`, fromK, violations);
        chkTempViol(`heat ${query.of} (to)`, toK, violations);
        const r = solveHeat(b, { phase: query.from.phase as PhaseName, T: fromK }, { phase: query.to.phase as PhaseName, T: toK });
        checks.push(...r.checks); violations.push(...r.violations);
        return { ok: true, answer: { ...mkGHAns('heat', r.value.s, r.value.n, 'J', query.label), queryIndex: qi }, checks, violations };
      }
      case 'equilibrium_temp': {
        const bodies = [...ent.bodies.values()];
        const r = solveEquilibrium(bodies);
        checks.push(...r.checks); violations.push(...r.violations);
        const out = outTemp(r.value, query.unit);
        return { ok: true, answer: { ...mkGHAns('equilibrium_temp', out.s, out.n, query.unit, query.label), queryIndex: qi }, checks, violations };
      }
      case 'mass_from_heat': {
        const bodies = [...ent.bodies.values()];
        if (!ent.bodies.get(query.of)) return { ok: false, problem: `mass_from_heat: vật "${query.of}" không tồn tại` };
        const Tf = qtyTemp(query.Tf.value, query.Tf.unit);
        chkTempViol(`mass_from_heat Tf`, Tf, violations);
        const r = solveMassFromHeat(bodies, query.of, query.property, Tf);
        checks.push(...r.checks); violations.push(...r.violations);
        let out = r.value, unit: string;
        if (query.property === 'mass') { unit = query.unit ?? 'kg'; if (unit === 'g') out = mulBy(out, rat(1000n), 1000); } // value là KG
        else if (query.property === 'c') { unit = 'J/(kg·K)'; }
        else { unit = query.unit ?? 'C'; out = outTemp(out, unit); }
        return { ok: true, answer: { ...mkGHAns('mass_from_heat', out.s, out.n, unit, query.label), queryIndex: qi }, checks, violations };
      }
      default: {
        query satisfies never;
        return { ok: false, problem: `query kind không hỗ trợ: ${(query as { kind: string }).kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
