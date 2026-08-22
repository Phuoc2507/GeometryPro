// api/_lib/kernel/physics/acLayout.ts
// Trình bày (KHÔNG ảnh hưởng đáp — §10.3): giản đồ Fre-nen (phasor) + mẫu u–t/i–t (charts) + bảng phần
// tử. Tất cả là DỮ-LIỆU-CHỜ-UI (chưa consumer — ghi thẳng để không ngộ nhận "đã vẽ giản đồ"). Cùng số
// phận D6 (mất khi lưu lịch sử). phasor.valueText CHỈ mang SỐ ĐỀ CHO (giản đồ đề bài) — TUYỆT ĐỐI không
// nhét giá trị engine TÍNH (label trần §15.1); toạ độ vectơ là số vẽ, không phải nhãn.
import { type PiScalar, certifyPiScalar, scalarToPi, mulP } from './piScalar';
import { rat } from '../scalar';
import { type AcModel, type AcDerived } from './acCircuit';
import { normalizeMinus, type AcAns } from './acCompute';

export type PhasorVec = { name: 'U_R' | 'U_L' | 'U_C' | 'U'; x: number; y: number };
export type PhasorLayout = { vectors: PhasorVec[]; valueText: { name: string; text: string }[] };
export type AcChart = { kind: 'u_t' | 'i_t'; tUnit: string; vUnit: string; series: { name: string; samples: [number, number][] }[] };
export type TableRow = { name: 'R' | 'L' | 'C' | 'source' | 'total'; Z?: AcAns; U: AcAns; I: AcAns; P?: AcAns };

const CHART_SAMPLES = 129; // như osc §9.3 — 129 mẫu đều

function ans(kind: string, p: PiScalar, floatRef: number, unit: string): AcAns {
  const cert = certifyPiScalar(p, floatRef);
  return { kind, text: normalizeMinus(cert.text), approx: cert.approx, unit, approximate: cert.approximate };
}

// Giản đồ Fre-nen: U_R(+x), U_L(+y), U_C(−y), U(tổng = (U_R, U_L−U_C)). Bất biến (test §10.3):
// (1) đủ 4 vectơ; (2) U = hợp U_R ⊥ (U_L−U_C); (3) |U|² = U_R² + (U_L−U_C)² (khớp K1).
export function buildPhasor(m: AcModel, d: AcDerived): PhasorLayout {
  const URn = d.n.I * m.n.R;
  const ULn = d.n.I * m.n.ZL;
  const UCn = d.n.I * m.n.ZC;
  const vectors: PhasorVec[] = [
    { name: 'U_R', x: URn, y: 0 },
    { name: 'U_L', x: 0, y: ULn },
    { name: 'U_C', x: 0, y: -UCn },
    { name: 'U', x: URn, y: ULn - UCn },
  ];
  // valueText: chỉ SỐ ĐỀ CHO (điện áp nguồn khai ở đề). KHÔNG đưa U_R/U_L… (engine tính).
  const valueText = [{ name: 'U_source', text: normalizeMinus(certifyPiScalar(scalarToPi(m.U), m.n.U).text) }];
  return { vectors, valueText };
}

// u(t) = U₀cos(ωt+φ_u), i(t) = I₀cos(ωt+φ_i) — 129 mẫu đều trên [0, 2T], T = 2π/ω (mảng SỐ).
export function buildCharts(m: AcModel, d: AcDerived): AcChart[] {
  const w = m.n.omega;
  const phiU = m.n.phiU;
  const phiI = phiU - d.phiN; // pha dòng = φ_u − φ
  const U0 = m.n.U0;
  const I0 = d.n.I0;
  if (!Number.isFinite(w) || w <= 0) return [];
  const T = (2 * Math.PI) / w;
  const tEnd = 2 * T;
  const uSamples: [number, number][] = [];
  const iSamples: [number, number][] = [];
  for (let k = 0; k < CHART_SAMPLES; k++) {
    const t = (tEnd * k) / (CHART_SAMPLES - 1);
    uSamples.push([t, U0 * Math.cos(w * t + phiU)]);
    iSamples.push([t, I0 * Math.cos(w * t + phiI)]);
  }
  return [
    { kind: 'u_t', tUnit: 's', vUnit: 'V', series: [{ name: 'u', samples: uSamples }] },
    { kind: 'i_t', tUnit: 's', vUnit: 'A', series: [{ name: 'i', samples: iSamples }] },
  ];
}

// Bảng phần tử answer-hoá (chỉ phần tử có mặt + nguồn + tổng). I chung toàn mạch nối tiếp.
export function buildTable(m: AcModel, d: AcDerived): TableRow[] {
  const one = scalarToPi(rat(1n));
  const rows: TableRow[] = [];
  const Ians = ans('current', d.I, d.n.I, 'A');
  if (m.hasL || m.hasC || m.n.R > 0) {
    if (m.n.R > 0) {
      const Rp = scalarToPi(m.R);
      rows.push({
        name: 'R', Z: ans('impedance', Rp, m.n.R, 'Ω'),
        U: ans('voltage', mulP(d.I, Rp), d.n.I * m.n.R, 'V'), I: Ians,
        P: ans('power', mulP(mulP(d.I, d.I), Rp), d.n.P, 'W'),
      });
    }
    if (m.hasL) rows.push({ name: 'L', Z: ans('impedance', m.ZL, m.n.ZL, 'Ω'), U: ans('voltage', mulP(d.I, m.ZL), d.n.I * m.n.ZL, 'V'), I: Ians });
    if (m.hasC) rows.push({ name: 'C', Z: ans('impedance', m.ZC, m.n.ZC, 'Ω'), U: ans('voltage', mulP(d.I, m.ZC), d.n.I * m.n.ZC, 'V'), I: Ians });
  }
  rows.push({ name: 'source', U: ans('voltage', scalarToPi(m.U), m.n.U, 'V'), I: Ians });
  rows.push({
    name: 'total', Z: ans('impedance', d.Z, d.n.Z, 'Ω'),
    U: ans('voltage', mulP(scalarToPi(m.U), one), m.n.U, 'V'), I: Ians,
    P: ans('power', d.P, d.n.P, 'W'),
  });
  return rows;
}
