// api/_lib/kernel/physics/acCheck.ts
// Tự kiểm tất định (§9): residual tính TỪ ĐÁP (chiều ngược bộ giải). Cùng bậc π ⇒ residual EXACT 0
// (num === 0n); có vế float ⇒ |residual| ≤ EPS_SELF·scale. K1..K5 kiểm "engine TỰ NHẤT QUÁN" (đại số
// luôn đúng ⇒ fail = bug engine/tràn số ⇒ KHÔNG serve). KHỚP ĐỀ là việc asserts (runAcCircuit), KHÔNG
// phải residual — ghi rõ để không ngộ nhận residual-0 = dịch đúng.
import { type PiScalar, scalarToPi, mulP, divP, subP, addP, approxP, isZeroPi, TWO_PI, sqrtP } from './piScalar';
import { rat } from '../scalar';
import { type AcModel, type AcDerived, toLC, isResonant, solveResonance } from './acCircuit';
import type { AcPlan, AcQuery, LCValueInput } from './acSchema';

export const EPS_SELF = 1e-6; // dùng chung (C10/F6) — KHÔNG hằng mới.

export type Check = { kind: string; detail: string; residual: number; pass: boolean };

// residual PiScalar → Check. scale chuẩn hoá theo độ lớn đại lượng (tránh EPS tuyệt đối lệch thang).
function mk(kind: string, detail: string, resid: PiScalar, scale: number): Check {
  const exactZero = isZeroPi(resid);
  const approx = approxP(resid);
  const pass = exactZero || Math.abs(approx) <= EPS_SELF * Math.max(1, scale);
  return { kind, detail, residual: exactZero ? 0 : approx, pass };
}

const hasKind = (plan: AcPlan, k: AcQuery['kind']): boolean =>
  plan.queries.some((q) => q.kind === k) || plan.asserts.some((a) => a.query.kind === k);

export function selfChecks(m: AcModel, d: AcDerived, plan: AcPlan): Check[] {
  const checks: Check[] = [];
  const Rp = scalarToPi(m.R);
  const Up = scalarToPi(m.U);

  // K1 — giản đồ vectơ: U_R² + (U_L − U_C)² − U² = 0.
  const UR = mulP(d.I, Rp);
  const UL = mulP(d.I, m.ZL);
  const UC = mulP(d.I, m.ZC);
  const uSrc = subP(UL, UC);
  const k1 = subP(addP(mulP(UR, UR), mulP(uSrc, uSrc)), mulP(Up, Up));
  checks.push(mk('K1', 'giản đồ vectơ U_R²+(U_L−U_C)²=U²', k1, Math.max(1, m.n.U * m.n.U)));

  // K2 — công suất hai đường: I²R − U·I·cosφ = 0.
  const k2 = subP(mulP(mulP(d.I, d.I), Rp), mulP(mulP(Up, d.I), d.cosphi));
  checks.push(mk('K2', 'công suất P = I²R = U·I·cosφ', k2, Math.max(1, d.n.P)));

  // K4 — định luật Ôm: U − I·Z = 0; và cosφ² + sinφ² − 1 = 0.
  const k4a = subP(Up, mulP(d.I, d.Z));
  checks.push(mk('K4', 'định luật Ôm U = I·Z', k4a, Math.max(1, m.n.U)));
  const k4b = subP(addP(mulP(d.cosphi, d.cosphi), mulP(d.sinphi, d.sinphi)), scalarToPi(rat(1n)));
  checks.push(mk('K4', 'cosφ² + sinφ² = 1', k4b, 1));

  // K3 — cộng hưởng (khi có query is_resonance/resonance_frequency).
  const wantsRes = hasKind(plan, 'is_resonance') || hasKind(plan, 'resonance_frequency');
  if (wantsRes && isResonant(d)) {
    const k3 = subP(d.Z, Rp); // Z = R khi Z_L = Z_C
    checks.push(mk('K3', 'cộng hưởng Z = R', k3, Math.max(1, m.n.R)));
  }
  if (hasKind(plan, 'resonance_frequency') && m.hasL && m.hasC) {
    // Tại f₀: ω₀ = 2π f₀ ⇒ Z_L(f₀) = Z_C(f₀). Thay-ngược trọn vòng.
    const f0 = solveResonance(m, 'f').pi;
    const w0 = mulP(TWO_PI, f0);
    const ZL0 = mulP(w0, toLC(m.L as LCValueInput));
    const ZC0 = divP(scalarToPi(rat(1n)), mulP(w0, toLC(m.C as LCValueInput)));
    checks.push(mk('K3', 'Z_L(f₀) = Z_C(f₀)', subP(ZL0, ZC0), Math.max(1, m.n.ZL)));
  }

  // K5 — solve_resonance: thay đáp NGƯỢC, Z_L' = Z_C' (residual exact 0).
  for (const q of plan.queries) {
    if (q.kind !== 'solve_resonance') continue;
    const sol = solveResonance(m, q.target).pi;
    let resid: PiScalar;
    if (q.target === 'f') {
      const w0 = mulP(TWO_PI, sol);
      resid = subP(mulP(w0, toLC(m.L as LCValueInput)), divP(scalarToPi(rat(1n)), mulP(w0, toLC(m.C as LCValueInput))));
    } else if (q.target === 'C') {
      // C' = sol ⇒ Z_C' = 1/(ωC') phải = Z_L.
      const ZCp = divP(scalarToPi(rat(1n)), mulP(m.omega, sol));
      resid = subP(m.ZL, ZCp);
    } else {
      // L' = sol ⇒ Z_L' = ωL' phải = Z_C.
      const ZLp = mulP(m.omega, sol);
      resid = subP(ZLp, m.ZC);
    }
    checks.push(mk('K5', `solve_resonance{${q.target}} thay-ngược Z_L=Z_C`, resid, Math.max(1, m.n.ZL || 1)));
  }

  return checks;
}
