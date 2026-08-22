// api/_lib/kernel/physics/efield.ts
// THUẦN (Scalar exact-first) cho chương ĐIỆN TRƯỜNG lớp 11 — soi gương circuit.ts (pack phụ độc lập).
// LLM chỉ DỊCH đề → EFieldPlan; TẦNG NÀY tính bằng công thức đóng trên số học hữu tỉ + một căn.
// KHÔNG sửa scalar.ts/kinematics.ts — chỉ import. Bảng LEN_TO_SI tự định nghĩa cục bộ (finding E2:
// kinematics LEN_TO_SI chỉ có {m,km}, thiếu cm/mm ⇒ mượn sẽ lệch 10⁴). Mọi hàm có CẶP FLOAT ĐỘC LẬP
// (…N, số học number) làm đường certify — bắt cả lỗi tầng số-học exact lẫn lỗi chép công thức.
import {
  type Scalar, type Exact, rat, num, add, sub, mul, div, neg, sqrt, exactToApprox,
} from '../scalar';
import { isZeroS, cmpScalar } from '../compute/answer';
import { scalarFromNumber, trigOf } from './kinematics';

// ── Bảng đổi đơn vị per-quantity → SI, HỮU TỈ EXACT (§5.3). Lũy thừa 10 do FACTOR gánh. ──────────
const CHARGE_TO_SI: Record<string, Scalar> = {
  C: rat(1n), mC: rat(1n, 1000n), uC: rat(1n, 1000000n), nC: rat(1n, 1000000000n), pC: rat(1n, 1000000000000n),
};
const FIELD_TO_SI: Record<string, Scalar> = { 'V/m': rat(1n), 'N/C': rat(1n), 'V/cm': rat(100n) };
const VOLT_TO_SI: Record<string, Scalar> = { V: rat(1n), kV: rat(1000n) };
const MASS_TO_SI: Record<string, Scalar> = { kg: rat(1n), g: rat(1n, 1000n) };
// Độ dài: efield TỰ định nghĩa (kinematics LEN_TO_SI thiếu cm/mm — finding E2). r²=Δx²+Δy² giữ HỮU TỈ.
const LEN_TO_SI: Record<string, Scalar> = { m: rat(1n), cm: rat(1n, 100n), mm: rat(1n, 1000n) };

const CHARGE_N: Record<string, number> = { C: 1, mC: 1e-3, uC: 1e-6, nC: 1e-9, pC: 1e-12 };
const FIELD_N: Record<string, number> = { 'V/m': 1, 'N/C': 1, 'V/cm': 100 };
const VOLT_N: Record<string, number> = { V: 1, kV: 1000 };
const MASS_N: Record<string, number> = { kg: 1, g: 1e-3 };
const LEN_N: Record<string, number> = { m: 1, cm: 1e-2, mm: 1e-3 };

const need = <T>(tbl: Record<string, T>, u: string, dim: string): T => {
  const f = tbl[u];
  if (f === undefined) throw new Error(`đơn vị ${dim} "${u}" ngoài bảng đổi`);
  return f;
};

export const qtyCharge = (v: number, u: string): Scalar => mul(scalarFromNumber(v), need(CHARGE_TO_SI, u, 'điện tích'));
export const qtyField = (v: number, u: string): Scalar => mul(scalarFromNumber(v), need(FIELD_TO_SI, u, 'cường độ trường'));
export const qtyVolt = (v: number, u: string): Scalar => mul(scalarFromNumber(v), need(VOLT_TO_SI, u, 'hiệu điện thế'));
export const qtyMass = (v: number, u: string): Scalar => mul(scalarFromNumber(v), need(MASS_TO_SI, u, 'khối lượng'));
export const qtyLength = (v: number, u: string): Scalar => mul(scalarFromNumber(v), need(LEN_TO_SI, u, 'độ dài'));

export const qtyChargeN = (v: number, u: string): number => v * need(CHARGE_N, u, 'điện tích');
export const qtyFieldN = (v: number, u: string): number => v * need(FIELD_N, u, 'cường độ trường');
export const qtyVoltN = (v: number, u: string): number => v * need(VOLT_N, u, 'hiệu điện thế');
export const qtyMassN = (v: number, u: string): number => v * need(MASS_N, u, 'khối lượng');
export const qtyLengthN = (v: number, u: string): number => v * need(LEN_N, u, 'độ dài');

// Hằng Coulomb k = 9·10⁹ — BigInt của Exact gánh trọn (num < 2⁵³, khớp bit). ε chia vào k.
export const K = rat(9000000000n);
export const K_N = 9e9;

// |Scalar| và dấu — scalar.ts KHÔNG có absExact; dựng cục bộ (neg giữ exact).
export const absS = (s: Scalar): Scalar => ((s.exact ? s.exact.num < 0n : s.approx < 0) ? neg(s) : s);
export const signS = (s: Scalar): number =>
  s.exact ? (s.exact.num < 0n ? -1 : s.exact.num > 0n ? 1 : 0) : s.approx < 0 ? -1 : s.approx > 0 ? 1 : 0;

// ── Vec2 Scalar hữu ích cho r², dot, cross (§8.1) ────────────────────────────────────────────────
export type PtS = { x: Scalar; y: Scalar };
export const r2S = (p: PtS, s: PtS): Scalar => {
  const dx = sub(p.x, s.x), dy = sub(p.y, s.y);
  return add(mul(dx, dx), mul(dy, dy));
};

// ── Thực thể ─────────────────────────────────────────────────────────────────────────────────────
export type PointCharge = { name: string; q: Scalar; qN: number; x: Scalar; y: Scalar; xN: number; yN: number };
export type UniformField = { name: string; E: Scalar | null; EN: number; direction: string };
export type ChargedBody = { name: string; q: Scalar; qN: number; mass: Scalar | null; massN: number };

// ── GATE §7.3: phân loại cấu hình chồng chất. Kiểm EXACT trên toạ độ (không nhận "gần đối xứng" float). ─
export type SuperClass = 'single' | 'collinear' | 'symmetric_rational' | 'none';
export type SrcXYQ = { x: Scalar; y: Scalar; q: Scalar };

// Thẳng hàng: cross((P−S₀),(Sᵢ−S₀)) = 0 EXACT với mọi i. w=P−S₀ ≠ 0 (đảm bảo bởi P≠Sᵢ ở tầng compute).
function isCollinear(P: PtS, srcs: SrcXYQ[]): boolean {
  const s0 = srcs[0];
  const wx = sub(P.x, s0.x), wy = sub(P.y, s0.y);
  for (let i = 1; i < srcs.length; i++) {
    const ax = sub(srcs[i].x, s0.x), ay = sub(srcs[i].y, s0.y);
    if (!isZeroS(sub(mul(wx, ay), mul(wy, ax)))) return false;
  }
  return true;
}

// Cặp đối xứng đẳng cự TOẠ-ĐỘ-HỮU-TỈ (2 nguồn): |q_A|=|q_B|, P cách đều (r_A²=r_B²) EXACT, VÀ r hữu tỉ
// (√(r²) ∈ ℚ, radicand 1). Bao 3-4-5, vuông cân chân-cao hữu tỉ; LOẠI tam giác đều (đỉnh 3√3/2 vô tỉ).
function isSymmetricRational(P: PtS, srcs: SrcXYQ[]): boolean {
  if (srcs.length !== 2) return false;
  const [A, B] = srcs;
  if (cmpScalar(absS(A.q), absS(B.q)) !== 0) return false;
  const rA2 = r2S(P, A), rB2 = r2S(P, B);
  if (cmpScalar(rA2, rB2) !== 0) return false;
  const rA = sqrt(rA2); // hữu tỉ ⇔ exact & radicand 1
  return rA.exact !== null && rA.exact.radicand === 1;
}

export function classify(P: PtS, srcs: SrcXYQ[]): SuperClass {
  if (srcs.length <= 1) return 'single';
  if (isCollinear(P, srcs)) return 'collinear';
  if (isSymmetricRational(P, srcs)) return 'symmetric_rational';
  return 'none';
}

// ── Kết quả một tính trường (mag + phương + chứng chỉ) ────────────────────────────────────────────
export type FieldOut = {
  mag: Scalar; magN: number; direction: string;
  cls: SuperClass;
  perp?: Scalar; perpN?: number;      // collinear: Σ((P−Sᵢ)·n)²  (chứng chỉ ⊥ trục)
  symmResidual?: number;              // symmetric_rational: |r_A²−r_B²| (đã 0 khi qua gate)
};

const axisPhrase = (vx: number, vy: number): string => {
  const ax = Math.abs(vx), ay = Math.abs(vy);
  if (ax < 1e-12 && ay < 1e-12) return 'triệt tiêu (E = 0)';
  if (ay < 1e-9 * Math.max(1, ax)) return vx > 0 ? 'theo chiều dương trục Ox' : 'theo chiều âm trục Ox';
  if (ax < 1e-9 * Math.max(1, ay)) return vy > 0 ? 'theo chiều dương trục Oy' : 'theo chiều âm trục Oy';
  return 'xiên (không dọc trục toạ độ)';
};

// |E| = kEff·|Q|/r² tại điểm khảo sát (single/thẳng-hàng dùng r² HỮU TỈ ⇒ exact dù r vô tỉ — E3).
export function fieldAt(kEff: Scalar, kEffN: number, P: PtS, PN: { x: number; y: number }, srcs: PointCharge[]): FieldOut {
  // Miền hợp lệ: điểm khảo sát KHÔNG trùng nguồn.
  for (const s of srcs) if (isZeroS(r2S(P, s))) throw new Error(`điểm khảo sát trùng vị trí điện tích "${s.name}" (r = 0)`);
  const cls = classify(P, srcs);

  if (cls === 'single') {
    const s = srcs[0];
    const r2 = r2S(P, s);
    const r2n = (PN.x - s.xN) ** 2 + (PN.y - s.yN) ** 2;
    const mag = div(mul(kEff, absS(s.q)), r2);
    const magN = (kEffN * Math.abs(s.qN)) / r2n;
    const dir = signS(s.q) >= 0 ? `hướng ra xa điện tích ${s.name}` : `hướng về phía điện tích ${s.name}`;
    return { mag, magN, direction: dir, cls };
  }

  if (cls === 'collinear') {
    // |E| = |Σ ± kEff·q_i / r_i²| (tổng ĐẠI SỐ hữu tỉ). Dấu s_i = sign((P−S_i)·w), w=P−S₀.
    const s0 = srcs[0];
    const wx = sub(P.x, s0.x), wy = sub(P.y, s0.y);
    const wxN = PN.x - s0.xN, wyN = PN.y - s0.yN;
    const nx = neg(wy), ny = wx;                          // n ⊥ w (chứng chỉ đối xứng)
    const nxN = -wyN, nyN = wxN;
    let net = rat(0n), netN = 0, perp = rat(0n), perpN = 0;
    for (const s of srcs) {
      const dx = sub(P.x, s.x), dy = sub(P.y, s.y);
      const dxN = PN.x - s.xN, dyN = PN.y - s.yN;
      const r2 = add(mul(dx, dx), mul(dy, dy));
      const r2n = dxN * dxN + dyN * dyN;
      const dotw = add(mul(dx, wx), mul(dy, wy));
      const sg = signS(dotw);                             // ±1 (=0 chỉ khi P=S ⇒ đã chặn r=0)
      net = add(net, mul(div(mul(kEff, s.q), r2), rat(BigInt(sg))));
      netN += (kEffN * s.qN * sg) / r2n;
      const dotn = add(mul(dx, nx), mul(dy, ny));         // (P−S)·n = 0 EXACT khi thẳng hàng
      const dotnN = dxN * nxN + dyN * nyN;
      perp = add(perp, mul(dotn, dotn));
      perpN += dotnN * dotnN;
    }
    const mag = absS(net), magN = Math.abs(netN);
    const sg = netN >= 0 ? 1 : -1;
    const dir = isZeroS(mag) ? 'triệt tiêu (E = 0)' : `${axisPhrase(sg * wxN, sg * wyN)} (dọc trục nối các điện tích)`;
    return { mag, magN, direction: dir, cls, perp, perpN };
  }

  if (cls === 'symmetric_rational') {
    // Cặp đối xứng toạ-độ-hữu-tỉ ⇒ VECTOR hữu tỉ (r_i ∈ ℚ ⇒ (P−S_i)/r_i³ hữu tỉ). |E|=√(Ex²+Ey²).
    let Ex = rat(0n), Ey = rat(0n), ExN = 0, EyN = 0;
    for (const s of srcs) {
      const dx = sub(P.x, s.x), dy = sub(P.y, s.y);
      const dxN = PN.x - s.xN, dyN = PN.y - s.yN;
      const r2 = add(mul(dx, dx), mul(dy, dy));
      const r = sqrt(r2), r3 = mul(r2, r);
      const r2n = dxN * dxN + dyN * dyN, r3n = r2n * Math.sqrt(r2n);
      const coef = div(mul(kEff, s.q), r3), coefN = (kEffN * s.qN) / r3n;
      Ex = add(Ex, mul(coef, dx)); Ey = add(Ey, mul(coef, dy));
      ExN += coefN * dxN; EyN += coefN * dyN;
    }
    const mag = sqrt(add(mul(Ex, Ex), mul(Ey, Ey)));
    const magN = Math.hypot(ExN, EyN);
    const rA2 = r2S(P, srcs[0]), rB2 = r2S(P, srcs[1]);
    const symmResidual = Math.abs(exactToApprox(rA2.exact as Exact) - exactToApprox(rB2.exact as Exact));
    return { mag, magN, direction: `${axisPhrase(ExN, EyN)} (dọc trục đối xứng)`, cls, symmResidual };
  }

  // Ngoài lớp exact-được: gate §7.3 đã CHẶN ở schema. Tới đây là phòng thủ ⇒ báo lỗi, KHÔNG serve.
  throw new Error(
    'cấu hình chồng chất không thuộc lớp exact-được (chỉ hỗ trợ thẳng hàng, cặp đối xứng đẳng cự ' +
      'toạ-độ-hữu-tỉ, hoặc field_symmetric góc đẹp) — v1 abstain (§14.2)',
  );
}

// Chồng chất ĐỐI XỨNG qua GÓC (E1-A): E_res=√(2E²(1+cosθ)), cosθ=trigOf(∠).cos. KHÔNG toạ độ đỉnh vô tỉ.
export function fieldSymmetric(
  kEff: Scalar, kEffN: number, absQ: Scalar, absQN: number, r2: Scalar, r2n: number, angleDeg: number, qSign: number,
): FieldOut {
  if (isZeroS(r2)) throw new Error('r = 0 cho field_symmetric (nguồn trùng điểm khảo sát)');
  const E = div(mul(kEff, absQ), r2), EN = (kEffN * absQN) / r2n;
  const { cos } = trigOf(angleDeg);
  const cosN = Math.cos((angleDeg * Math.PI) / 180);
  const inside = mul(mul(rat(2n), mul(E, E)), add(rat(1n), cos));   // 2E²(1+cosθ)
  const insideN = 2 * EN * EN * (1 + cosN);
  const mag = sqrt(inside), magN = Math.sqrt(insideN);
  const dir = qSign >= 0
    ? 'dọc trục đối xứng (trung trực nguồn–nguồn), hướng ra xa'
    : 'dọc trục đối xứng (trung trực nguồn–nguồn), hướng về nguồn';
  return { mag, magN, direction: dir, cls: 'symmetric_rational' };
}
