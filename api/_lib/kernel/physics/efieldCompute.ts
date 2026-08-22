// api/_lib/kernel/physics/efieldCompute.ts
// Tầng compute: mỗi query → công thức đóng (§8.1) + mkEAns 3 bậc (certify → recognize → fmtNum) với
// LUẬT HIỂN THỊ §6 (displayEField khoa-học-hoá text cho Lý; exact+approx VẪN lưu). answers[].unit do ENGINE.
import {
  type Scalar, rat, add, sub, mul, div, sqrt, displayExact, exactToApprox,
} from '../scalar';
import { recognizeConstant } from '../analysis/recognize';
import { isZeroS } from '../compute/answer';
import { scalarFromNumber } from './kinematics';
import {
  qtyLength, qtyLengthN, qtyCharge, qtyChargeN, qtyVolt, qtyVoltN, absS, signS, r2S, fieldAt, fieldSymmetric,
  type PointCharge, type UniformField, type ChargedBody, type FieldOut,
} from './efield';
import type { EFieldQuery } from './efieldSchema';

export type EFieldAns = {
  label?: string; kind: string; text: string; approx: number; unit: string;
  approximate: boolean; direction?: string; queryIndex?: number;
};
export type Check = { kind: string; detail: string; residual: number; pass: boolean };
export type QueryOutcome = { ok: true; answer: EFieldAns; checks: Check[] } | { ok: false; problem: string };

export type Entities = {
  points: Map<string, PointCharge>;
  fields: Map<string, UniformField>;
  bodies: Map<string, ChargedBody>;
  kEff: Scalar; kEffN: number; epsilon: number; lengthUnit: string;
};

const EPS_SELF = 1e-6; // dung sai tương đối tự-kiểm (chung v0/circuit)

// ── LUẬT HIỂN THỊ §6 (displayEField) ─────────────────────────────────────────────────────────────
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (n: number): string => String(n).split('').map((c) => SUP[c]).join('');

function factor2and5(den: bigint): { a: number; b: number; rest: bigint } {
  let a = 0, b = 0, d = den;
  while (d % 2n === 0n) { d /= 2n; a++; }
  while (d % 5n === 0n) { d /= 5n; b++; }
  return { a, b, rest: d };
}
// numAbs/10^k, numAbs>0 nguyên → "a·10ⁿ" (a∈[1,10), dấu phẩy VN); a=1 ⇒ "10ⁿ".
function sci(numAbs: bigint, k: number): string {
  const digits = numAbs.toString();
  const d = digits.length;
  let mant = d === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
  if (mant.includes('.')) mant = mant.replace(/0+$/, '').replace(/\.$/, '');
  const exp = d - 1 - k;
  const mantVN = mant.replace('.', ',');
  return mantVN === '1' ? `10${sup(exp)}` : `${mantVN}·10${sup(exp)}`;
}
// numAbs/10^k → thập phân dấu phẩy VN ("0,036", "80").
function decimalStr(numAbs: bigint, k: number): string {
  if (k === 0) return numAbs.toString();
  const s = numAbs.toString().padStart(k + 1, '0');
  const intPart = s.slice(0, s.length - k);
  const frac = s.slice(s.length - k).replace(/0+$/, '');
  return frac ? `${intPart},${frac}` : intPart;
}

// Số thập phân trung thực khi rơi float (đường recognize trượt).
function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// §6: hữu tỉ terminating → khoa học (|v|≥10⁴ hoặc <10⁻²) / thập phân; mẫu có ước ≠{2,5} → giữ phân số;
// radicand>1 → displayExact ("300000√3","2√5/5"); float → recognize/fmtNum (đường an toàn, mkEAns lo).
export function displayEField(s: Scalar): string {
  const e = s.exact;
  if (e === null) { const n = recognizeConstant(s.approx); return n ? n.text : fmtNum(s.approx); }
  if (e.radicand !== 1) return displayExact(e);
  const sign = e.num < 0n ? '-' : '';
  const numAbs = e.num < 0n ? -e.num : e.num;
  const { a, b, rest } = factor2and5(e.den);
  if (rest !== 1n) return displayExact(e);                     // không terminating ⇒ giữ phân số
  const k = Math.max(a, b);
  const M = numAbs * 2n ** BigInt(k - a) * 5n ** BigInt(k - b); // value = M/10^k EXACT
  const v = Math.abs(exactToApprox(e));
  if (v !== 0 && (v >= 1e4 || v < 1e-2)) return sign + sci(M, k);
  return sign + decimalStr(M, k);
}

// Đáp 3 bậc (spec §8): exact certify với float ĐỘC LẬP → displayEField; chết exact → recognize; trượt → fmtNum.
export function mkEAns(kind: string, s: Scalar, floatRef: number, unit: string, label?: string, direction?: string): EFieldAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol)
    return { label, kind, text: displayEField(s), approx: exactToApprox(s.exact), unit, approximate: false, direction };
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice, direction };
}

// ── Resolver thực thể ───────────────────────────────────────────────────────────────────────────
const getPoint = (ent: Entities, n: string): PointCharge => {
  const p = ent.points.get(n); if (!p) throw new Error(`không tìm thấy điện tích điểm "${n}"`); return p;
};
const getBody = (ent: Entities, n: string): ChargedBody => {
  const b = ent.bodies.get(n); if (!b) throw new Error(`không tìm thấy vật tích điện "${n}"`); return b;
};
function getFieldE(ent: Entities, n: string): { E: Scalar; EN: number } {
  const f = ent.fields.get(n); if (!f) throw new Error(`không tìm thấy điện trường đều "${n}"`);
  if (f.E === null) throw new Error(`điện trường "${n}" chưa khai E (cần cho query đọc trường)`);
  return { E: f.E, EN: f.EN };
}
const ptOf = (p: PointCharge) => ({ x: p.x, y: p.y });
const scale = (x: number) => 1e-6 * Math.max(1, Math.abs(x));

function sourcesOf(ent: Entities, by?: string[]): PointCharge[] {
  if (by && by.length) return by.map((n) => getPoint(ent, n));
  return [...ent.points.values()];
}

function fieldOutFrom(ent: Entities, at: [number, number], by?: string[]): { fo: FieldOut; checks: Check[] } {
  const P = { x: qtyLength(at[0], ent.lengthUnit), y: qtyLength(at[1], ent.lengthUnit) };
  const PN = { x: qtyLengthN(at[0], ent.lengthUnit), y: qtyLengthN(at[1], ent.lengthUnit) };
  const fo = fieldAt(ent.kEff, ent.kEffN, P, PN, sourcesOf(ent, by));
  const checks: Check[] = [];
  if (fo.cls === 'collinear' && fo.perp) // Chứng chỉ ĐỐI XỨNG → phương: thành phần ⊥ trục PHẢI 0 (isZeroS).
    checks.push({ kind: 'symmetry', detail: 'thành phần ⊥ trục hợp lực = 0 (thẳng hàng)', residual: fo.perpN ?? 0, pass: isZeroS(fo.perp) });
  if (fo.cls === 'symmetric_rational')
    checks.push({ kind: 'symmetry', detail: 'cặp đối xứng đẳng cự (r_A²=r_B², |q_A|=|q_B|)', residual: fo.symmResidual ?? 0, pass: (fo.symmResidual ?? 0) <= EPS_SELF });
  return { fo, checks };
}

export function computeEFieldQuery(ent: Entities, query: EFieldQuery): QueryOutcome {
  try {
    switch (query.kind) {
      case 'coulomb_force': {
        const a = getPoint(ent, query.a), b = getPoint(ent, query.b);
        const r2 = r2S(ptOf(a), ptOf(b));
        if (isZeroS(r2)) return { ok: false, problem: `hai điện tích "${a.name}","${b.name}" trùng vị trí (r = 0)` };
        const r2n = (a.xN - b.xN) ** 2 + (a.yN - b.yN) ** 2;
        const F = div(mul(mul(ent.kEff, absS(a.q)), absS(b.q)), r2);
        const FN = (ent.kEffN * Math.abs(a.qN) * Math.abs(b.qN)) / r2n;
        const attract = signS(a.q) * signS(b.q) < 0;
        const dir = attract ? 'hai điện tích hút nhau' : 'hai điện tích đẩy nhau';
        return { ok: true, answer: mkEAns('coulomb_force', F, FN, 'N', query.label, dir), checks: [] };
      }
      case 'field_at': {
        const { fo, checks } = fieldOutFrom(ent, query.at as [number, number], query.by);
        return { ok: true, answer: mkEAns('field_at', fo.mag, fo.magN, 'V/m', query.label, fo.direction), checks };
      }
      case 'force_on_test': {
        const { fo, checks } = fieldOutFrom(ent, query.at as [number, number], query.by);
        const q = qtyCharge(query.q.value, query.q.unit), qN = qtyChargeN(query.q.value, query.q.unit);
        const F = mul(absS(q), fo.mag), FN = Math.abs(qN) * fo.magN;
        const dir = signS(q) >= 0 ? `cùng chiều E (${fo.direction})` : `ngược chiều E`;
        return { ok: true, answer: mkEAns('force_on_test', F, FN, 'N', query.label, dir), checks };
      }
      case 'field_symmetric': {
        const a = getPoint(ent, query.sources[0]), b = getPoint(ent, query.sources[1]);
        if (signS(a.q) === 0) return { ok: false, problem: 'điện tích nguồn bằng 0' };
        const absQ = absS(a.q), absQN = Math.abs(a.qN);
        const r = qtyLength(query.r.value, query.r.unit), rN = qtyLengthN(query.r.value, query.r.unit);
        const r2 = mul(r, r), r2n = rN * rN;
        const fo = fieldSymmetric(ent.kEff, ent.kEffN, absQ, absQN, r2, r2n, query.angleBetweenDeg, signS(a.q));
        const checks: Check[] = [{ kind: 'symmetry', detail: 'đối xứng qua góc khai tường minh (field_symmetric)', residual: 0, pass: true }];
        void b;
        return { ok: true, answer: mkEAns('field_symmetric', fo.mag, fo.magN, 'V/m', query.label, fo.direction), checks };
      }
      case 'potential_at': {
        // V = Σ kEff·q_i/r_i (vô hướng, cộng đại số). Exact khi mọi r_i cùng radicand; ngoài ra float trung thực.
        const srcs = sourcesOf(ent, query.by);
        const P = { x: qtyLength(query.at[0], ent.lengthUnit), y: qtyLength(query.at[1], ent.lengthUnit) };
        const PN = { x: qtyLengthN(query.at[0], ent.lengthUnit), y: qtyLengthN(query.at[1], ent.lengthUnit) };
        let V = rat(0n), VN = 0;
        for (const s of srcs) {
          const r2 = r2S(P, ptOf(s));
          if (isZeroS(r2)) return { ok: false, problem: `điểm khảo sát trùng "${s.name}" (r=0)` };
          const r = sqrt(r2), rN = Math.sqrt((PN.x - s.xN) ** 2 + (PN.y - s.yN) ** 2);
          V = add(V, div(mul(ent.kEff, s.q), r)); VN += (ent.kEffN * s.qN) / rN;
        }
        return { ok: true, answer: mkEAns('potential_at', V, VN, 'V', query.label), checks: [] };
      }
      case 'electric_force': {
        const body = getBody(ent, query.body), { E, EN } = getFieldE(ent, query.field);
        const F = mul(absS(body.q), E), FN = Math.abs(body.qN) * EN;
        const dir = signS(body.q) >= 0 ? 'cùng chiều đường sức' : 'ngược chiều đường sức';
        return { ok: true, answer: mkEAns('electric_force', F, FN, 'N', query.label, dir), checks: [] };
      }
      case 'work': {
        const body = getBody(ent, query.body), { E, EN } = getFieldE(ent, query.field);
        const d = qtyLength(query.d.value, query.d.unit), dN = qtyLengthN(query.d.value, query.d.unit);
        const A = mul(mul(body.q, E), d), AN = body.qN * EN * dN; // đại số (dấu q, dấu d)
        const dir = AN >= 0 ? 'lực điện sinh công (A > 0)' : 'lực điện nhận công (A < 0)';
        return { ok: true, answer: mkEAns('work', A, AN, 'J', query.label, dir), checks: [] };
      }
      case 'voltage': {
        const { E, EN } = getFieldE(ent, query.field);
        const d = qtyLength(query.d.value, query.d.unit), dN = qtyLengthN(query.d.value, query.d.unit);
        const U = mul(E, d), UN = EN * dN;
        return { ok: true, answer: mkEAns('voltage', U, UN, 'V', query.label), checks: [] };
      }
      case 'potential_energy': {
        const body = getBody(ent, query.body);
        const U = qtyVolt(query.U.value, query.U.unit), UN = qtyVoltN(query.U.value, query.U.unit);
        const W = mul(body.q, U), WN = body.qN * UN;
        const dir = WN >= 0 ? 'thế năng tăng' : 'thế năng giảm';
        return { ok: true, answer: mkEAns('potential_energy', W, WN, 'J', query.label, dir), checks: [] };
      }
      case 'equilibrium_field': {
        const body = getBody(ent, query.body);
        if (body.mass === null) return { ok: false, problem: `vật "${body.name}" thiếu khối lượng cho cân bằng` };
        if (signS(body.q) === 0) return { ok: false, problem: `điện tích "${body.name}" = 0, không giải được E cân bằng` };
        const g = scalarFromNumber(query.g), gN = query.g; // g thập phân ≤9 chữ lẻ vẫn exact (9,8→49/5)
        const E = div(mul(body.mass, g), absS(body.q)); // |q|E = mg ⇒ E = m·g/|q|
        const EN = (body.massN * gN) / Math.abs(body.qN);
        const backResid = Math.abs(Math.abs(body.qN) * EN - body.massN * gN);
        const dir = signS(body.q) >= 0 ? 'thẳng đứng, hướng lên (cân trọng lực)' : 'thẳng đứng, hướng xuống (cân trọng lực)';
        const checks: Check[] = [{ kind: 'equilibrium_backsub', detail: '|q|·E − m·g = 0', residual: backResid, pass: backResid <= scale(body.massN * gN) }];
        return { ok: true, answer: mkEAns('equilibrium_field', E, EN, 'V/m', query.label, dir), checks };
      }
      case 'acceleration': {
        const body = getBody(ent, query.body), { E, EN } = getFieldE(ent, query.field);
        if (body.mass === null) return { ok: false, problem: `vật "${body.name}" thiếu khối lượng cho gia tốc` };
        const a = div(mul(absS(body.q), E), body.mass), aN = (Math.abs(body.qN) * EN) / body.massN;
        return { ok: true, answer: mkEAns('acceleration', a, aN, 'm/s²', query.label, 'dọc đường sức'), checks: [] };
      }
      case 'speed_after': {
        const body = getBody(ent, query.body), { E, EN } = getFieldE(ent, query.field);
        if (body.mass === null) return { ok: false, problem: `vật "${body.name}" thiếu khối lượng cho tốc độ` };
        const d = qtyLength(query.d.value, query.d.unit), dN = qtyLengthN(query.d.value, query.d.unit);
        // ½mv² = |q|E·d ⇒ v = √(2|q|E·d/m)
        const inside = div(mul(mul(rat(2n), absS(body.q)), mul(E, d)), body.mass);
        const insideN = (2 * Math.abs(body.qN) * EN * dN) / body.massN;
        const v = sqrt(inside), vN = Math.sqrt(insideN);
        const backResid = Math.abs(0.5 * body.massN * vN * vN - Math.abs(body.qN) * EN * dN);
        const checks: Check[] = [{ kind: 'kinetic_backsub', detail: '½·m·v² − |q|·E·d = 0', residual: backResid, pass: backResid <= scale(Math.abs(body.qN) * EN * dN) }];
        return { ok: true, answer: mkEAns('speed_after', v, vN, 'm/s', query.label), checks };
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
