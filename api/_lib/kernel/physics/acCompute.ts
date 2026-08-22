// api/_lib/kernel/physics/acCompute.ts
// Tầng compute: mỗi query → công thức đóng (§8) trên model + derived đã tính, certify bằng float ĐỘC LẬP.
// answers[].unit do ENGINE ghi theo kind (C6); text exact-first ("100√2", "π/6", "1152/5") — thập phân
// kiểu VN là việc bridge/UI. CHUẨN MINUS (VỪA-2): mọi text đáp AC dùng '−' U+2212 (khớp mẫu §11);
// normalizeMinus đổi '-' (U+002D do displayPiScalar/toString phát) → '−' NHẤT QUÁN toàn pack.
import { type Scalar, displayScalar } from '../scalar';
import { type PiScalar, certifyPiScalar, displayPiScalar, approxP, isZeroPi, scalarToPi, mulP, divP, subP, addP, piOf, negP } from './piScalar';
import { rat } from '../scalar';
import { recognizeConstant } from '../analysis/recognize';
import {
  type AcModel,
  type AcDerived,
  SQRT2,
  resonanceFreq,
  resonanceFreqN,
  solveResonance,
  isResonant,
  signOfPi,
} from './acCircuit';
import type { AcQuery } from './acSchema';

export const MINUS = '−'; // U+2212 MINUS SIGN — chuẩn text đáp AC (khớp §11), KHÔNG dùng '-' U+002D.
export const normalizeMinus = (s: string): string => s.replace(/-/g, MINUS);

export type Verdict = 'cong_huong' | 'tinh_cam_khang' | 'tinh_dung_khang';
export type AcExpr = { amp: string; omega: string; phase: string };
export type AcAns = {
  label?: string;
  kind: string;
  text: string;
  approx: number;
  unit: string;
  approximate: boolean;
  verdict?: Verdict;
  expr?: AcExpr;
  queryIndex?: number;
};
export type QueryOutcome = { ok: true; answer: AcAns } | { ok: false; problem: string };

function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// Đáp 3 tầng (§3.5) qua certifyPiScalar + chuẩn minus. text KHÔNG nhúng unit (field riêng).
function mkAns(kind: string, p: PiScalar, floatRef: number, unit: string, label?: string, verdict?: Verdict): AcAns {
  const cert = certifyPiScalar(p, floatRef);
  return { label, kind, text: normalizeMinus(cert.text), approx: cert.approx, unit, approximate: cert.approximate, verdict };
}

// ── Biểu thức tức thời (§8.2) — biên độ (Scalar/PiScalar k=0) + pha PiScalar ────
// Ráp chuỗi: amp cos(ωt [± pha]); pha=0 ⇒ bỏ hẳn số hạng pha. omega/amp/phase qua displayPiScalar.
function writeExpr(symbol: 'i' | 'u', unit: string, amp: PiScalar, ampN: number, omega: PiScalar, phase: PiScalar): AcAns {
  const ampTxt = normalizeMinus(displayPiScalar(amp));
  const omegaTxt = normalizeMinus(displayPiScalar(omega));
  const phaseTxt = normalizeMinus(displayPiScalar(phase));
  let body = `${ampTxt}cos(${omegaTxt}t`;
  if (!isZeroPi(phase)) {
    const sign = signOfPi(phase) < 0 ? MINUS : '+';
    const mag = normalizeMinus(displayPiScalar(signOfPi(phase) < 0 ? negP(phase) : phase));
    body += ` ${sign} ${mag}`;
  }
  body += ')';
  const text = `${symbol} = ${body} (${unit})`;
  return {
    kind: symbol === 'i' ? 'write_current' : 'write_voltage',
    text,
    approx: ampN,
    unit,
    approximate: amp.s.exact === null,
    expr: { amp: ampTxt, omega: omegaTxt, phase: phaseTxt },
  };
}

export function computeAcQuery(m: AcModel, d: AcDerived, query: AcQuery): QueryOutcome {
  try {
    const Rp = scalarToPi(m.R);
    switch (query.kind) {
      case 'omega':
        return { ok: true, answer: mkAns('omega', m.omega, m.n.omega, 'rad/s', query.label) };

      case 'impedance': {
        if (query.of === 'L') return { ok: true, answer: mkAns('impedance', m.ZL, m.n.ZL, 'Ω', query.label) };
        if (query.of === 'C') return { ok: true, answer: mkAns('impedance', m.ZC, m.n.ZC, 'Ω', query.label) };
        return { ok: true, answer: mkAns('impedance', d.Z, d.n.Z, 'Ω', query.label) };
      }

      case 'current': {
        if (query.peak) return { ok: true, answer: mkAns('current', d.I0, d.n.I0, 'A', query.label) };
        return { ok: true, answer: mkAns('current', d.I, d.n.I, 'A', query.label) };
      }

      case 'voltage': {
        const scale = query.peak ? scalarToPi(SQRT2) : scalarToPi(rat(1n));
        const sc = query.peak ? Math.SQRT2 : 1;
        if (query.of === 'source') {
          const base = query.peak ? m.U0 : m.U;
          const baseN = query.peak ? m.n.U0 : m.n.U;
          return { ok: true, answer: mkAns('voltage', scalarToPi(base), baseN, 'V', query.label) };
        }
        const zEl = query.of === 'R' ? Rp : query.of === 'L' ? m.ZL : m.ZC;
        const zElN = query.of === 'R' ? m.n.R : query.of === 'L' ? m.n.ZL : m.n.ZC;
        const u = mulP(mulP(d.I, zEl), scale);
        const uN = d.n.I * zElN * sc;
        return { ok: true, answer: mkAns('voltage', u, uN, 'V', query.label) };
      }

      case 'power':
        return { ok: true, answer: mkAns('power', d.P, d.n.P, 'W', query.label) };

      case 'power_factor':
        return { ok: true, answer: mkAns('power_factor', d.cosphi, d.n.cosphi, '', query.label) };

      case 'phase_diff': {
        // Nice (lưới) ⇒ certify exact; off-grid ⇒ SỐ THÔ + approximate:true (KHÔNG recognizeConstant).
        if (d.phiNice) {
          const cert = certifyPiScalar(d.phi, d.phiN);
          return { ok: true, answer: { label: query.label, kind: 'phase_diff', text: normalizeMinus(cert.text), approx: cert.approx, unit: 'rad', approximate: cert.approximate } };
        }
        return { ok: true, answer: { label: query.label, kind: 'phase_diff', text: normalizeMinus(fmtNum(d.phiN)), approx: d.phiN, unit: 'rad', approximate: true } };
      }

      case 'resonance_frequency':
        return { ok: true, answer: mkAns('resonance_frequency', resonanceFreq(m), resonanceFreqN(m), 'Hz', query.label) };

      case 'is_resonance': {
        const ratio = divP(m.ZL, m.ZC);
        const ratioN = m.n.ZL / m.n.ZC;
        const verdict: Verdict = isResonant(d) ? 'cong_huong' : d.signDZ > 0 ? 'tinh_cam_khang' : 'tinh_dung_khang';
        return { ok: true, answer: mkAns('is_resonance', ratio, ratioN, '', query.label, verdict) };
      }

      case 'solve_resonance': {
        const unit = query.target === 'C' ? 'F' : query.target === 'L' ? 'H' : 'Hz';
        const sol = solveResonance(m, query.target);
        return { ok: true, answer: mkAns('solve_resonance', sol.pi, sol.n, unit, query.label) };
      }

      case 'write_current': {
        // i = I₀ cos(ωt + φ_i), φ_i = φ_u − φ.
        const ans = writeExpr('i', 'A', d.I0, d.n.I0, m.omega, d.phiI);
        return { ok: true, answer: { ...ans, label: query.label } };
      }

      case 'write_voltage': {
        // u_R cùng pha i; u_L sớm π/2 so i; u_C trễ π/2; u_source pha φ_u.
        if (query.of === 'source') {
          const ans = writeExpr('u', 'V', scalarToPi(m.U0), m.n.U0, m.omega, m.phiU);
          return { ok: true, answer: { ...ans, label: query.label } };
        }
        const zEl = query.of === 'R' ? Rp : query.of === 'L' ? m.ZL : m.ZC;
        const zElN = query.of === 'R' ? m.n.R : query.of === 'L' ? m.n.ZL : m.n.ZC;
        const amp = mulP(mulP(d.I0, zEl), scalarToPi(rat(1n))); // U₀_X = I₀·Z_X
        const ampN = d.n.I0 * zElN;
        const half = piOf(1n, 2n); // π/2
        const phase = query.of === 'R' ? d.phiI : query.of === 'L' ? addP(d.phiI, half) : subP(d.phiI, half);
        const ans = writeExpr('u', 'V', amp, ampN, m.omega, phase);
        return { ok: true, answer: { ...ans, label: query.label } };
      }

      default: {
        query satisfies never; // exhaustive
        return { ok: false, problem: `query kind không hỗ trợ: ${(query as { kind: string }).kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}

// Dùng cho bảng phần tử (§10.1) — trả AcAns thô từ một Scalar (đã k=0).
export function scalarAns(kind: string, s: Scalar, floatRef: number, unit: string): AcAns {
  return mkAns(kind, scalarToPi(s), floatRef, unit);
}

// Re-export tiện cho test/layout.
export { displayScalar, recognizeConstant, approxP };
