// api/_lib/kernel/physics/circuitCompute.ts
// Tầng compute: mỗi query MỘT công thức đóng trên bảng đã giải (§8) + certify bằng bản float ĐỘC LẬP.
// answers[].unit do ENGINE ghi theo kind (C6); text exact-first ("11/20", "63/4") — thập phân là việc bridge.
import { type Scalar, rat, add, mul, div, displayScalar, exactToApprox } from '../scalar';
import { cmpScalar } from '../compute/answer';
import { recognizeConstant } from '../analysis/recognize';
import { scalarFromNumber } from './kinematics';
import { type Solved, rowOf } from './circuit';
import type { CircuitQuery } from './circuitSchema';

export type Verdict = 'sang_binh_thuong' | 'sang_yeu' | 'sang_manh';
export type CircuitAns = {
  label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean;
  verdict?: Verdict; queryIndex?: number;
};
export type QueryOutcome = { ok: true; answer: CircuitAns } | { ok: false; problem: string };

// Đổi đơn vị HỮU TỈ EXACT (§6.4): t → giây; năng lượng J → đơn vị ra.
const TIME_TO_S: Record<string, Scalar> = { s: rat(1n), min: rat(60n), h: rat(3600n) };
const TIME_TO_S_N: Record<string, number> = { s: 1, min: 60, h: 3600 };
const OUT_DIV: Record<string, Scalar> = { J: rat(1n), kJ: rat(1000n), Wh: rat(3600n), kWh: rat(3600000n) };
const OUT_DIV_N: Record<string, number> = { J: 1, kJ: 1000, Wh: 3600, kWh: 3600000 };

// Số thập phân trung thực khi rơi float (nhỏ giữ chữ số có nghĩa; lớn cắt vừa phải).
function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// Đáp 3 tầng (spec §8, y v0 §6.3): exact certify với float ĐỘC LẬP → displayScalar; chết exact →
// recognize; trượt → thập phân + approximate:true. text KHÔNG nhúng unit (unit là field riêng).
export function mkAns(
  kind: string, s: Scalar, floatRef: number, unit: string, label?: string, verdict?: Verdict,
): CircuitAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false, verdict };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice, verdict };
}

export function computeCircuitQuery(solved: Solved, query: CircuitQuery): QueryOutcome {
  try {
    switch (query.kind) {
      case 'resistance': {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns('resistance', row.R, row.Rn, 'Ω', query.label) };
      }
      case 'current': {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns('current', row.I, row.In, 'A', query.label) };
      }
      case 'voltage': {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns('voltage', row.U, row.Un, 'V', query.label) };
      }
      case 'power': {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns('power', row.P, row.Pn, 'W', query.label) };
      }
      case 'power_source': {
        let s: Scalar, n: number;
        if (query.part === 'internal') { s = mul(mul(solved.iMain, solved.iMain), solved.r); n = solved.iMainN * solved.iMainN * solved.rN; }
        else if (query.part === 'external') { s = mul(solved.uExternal, solved.iMain); n = solved.uExternalN * solved.iMainN; }
        else { s = mul(solved.emf, solved.iMain); n = solved.emfN * solved.iMainN; } // total = E·I
        return { ok: true, answer: mkAns('power_source', s, n, 'W', query.label) };
      }
      case 'energy':
      case 'energy_source': {
        const tSec = mul(scalarFromNumber(query.t), TIME_TO_S[query.tUnit ?? 's']);
        const tSecN = query.t * TIME_TO_S_N[query.tUnit ?? 's'];
        let joule: Scalar, jouleN: number;
        if (query.kind === 'energy') {
          const row = rowOf(solved, query.of);
          joule = mul(row.P, tSec); jouleN = row.Pn * tSecN; // A = P·t
        } else {
          joule = mul(mul(solved.emf, solved.iMain), tSec); jouleN = solved.emfN * solved.iMainN * tSecN; // A_ng = E·I·t
        }
        const out = div(joule, OUT_DIV[query.unit ?? 'J']);
        const outN = jouleN / OUT_DIV_N[query.unit ?? 'J'];
        return { ok: true, answer: mkAns(query.kind, out, outN, query.unit ?? 'J', query.label) };
      }
      case 'efficiency': {
        const s = mul(div(solved.uExternal, solved.emf), rat(100n)); // H% = (U_N/E)·100
        const n = (solved.uExternalN / solved.emfN) * 100;
        return { ok: true, answer: mkAns('efficiency', s, n, '%', query.label) };
      }
      case 'lamp_check': {
        const row = rowOf(solved, query.of);
        const li = solved.lampInfo.get(query.of);
        if (!li) return { ok: false, problem: `lamp_check: "${query.of}" không phải đèn` };
        const ratio = div(row.I, li.iRated), ratioN = row.In / li.iRatedN;
        const cmp = cmpScalar(ratio, rat(1n)); // exact khi cả hai exact (§8.1: EPS_SELF chung, không EPS_LAMP)
        const verdict: Verdict = cmp === 0 ? 'sang_binh_thuong' : cmp < 0 ? 'sang_yeu' : 'sang_manh';
        return { ok: true, answer: mkAns('lamp_check', ratio, ratioN, '', query.label, verdict) };
      }
      case 'solve_resistance': {
        // Sau khi thế nghiệm (runCircuit), R của lá ẩn = x — đọc thẳng bảng.
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns('solve_resistance', row.R, row.Rn, 'Ω', query.label) };
      }
      default: {
        query satisfies never; // exhaustive: thêm kind mà quên nhánh ⇒ lỗi compile ngay đây
        return { ok: false, problem: `query kind không hỗ trợ: ${(query as { kind: string }).kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
