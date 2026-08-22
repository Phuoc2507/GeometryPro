// api/_lib/kernel/physics/circuitKirchhoff.ts
// Tự kiểm tất định (§9): residual tính TỪ BẢNG §7.3, chiều NGƯỢC với bộ giải (giải phân bổ top-down
// từng nhánh; check gộp bottom-up) — bắt bug thu gọn/phân bố. Mạch DC thuần hữu tỉ ⇒ residual exact-0.
// Minh bạch ngữ nghĩa: K1..K4 kiểm "engine tự nhất quán"; KHỚP ĐỀ là việc của asserts + validation
// nghiệm (§7.5) — residual-0 KHÔNG có nghĩa là dịch đúng đề.
import { type Scalar, rat, add, sub, mul, div, exactToApprox } from '../scalar';
import { type Solved, type NodeVals, EPS_SELF } from './circuit';
import type { CircuitNode } from './circuitSchema';

export type Check = { kind: string; detail: string; residual: number; pass: boolean };

const ZERO = rat(0n);

// residual exact-0 ⇒ pass (num === 0n); rơi float ⇒ ngưỡng tương đối EPS_SELF (§9). residual number
// lấy GIÁ TRỊ EXACT khi có (0 đúng nghĩa, không phải bóng float ~1e-16).
function resCheck(kind: string, detail: string, resid: Scalar, scaleN: number): Check {
  const e = resid.exact;
  const residual = e !== null ? exactToApprox(e) : resid.approx;
  const pass = e !== null ? e.num === 0n : Math.abs(resid.approx) <= EPS_SELF * Math.max(1, scaleN);
  return { kind, detail, residual, pass };
}

export function selfChecks(
  solved: Solved,
  opts: { efficiency?: boolean; backsub?: { targetI: Scalar; targetIN: number } },
): Check[] {
  const { vals, root, emf, r, iMain, uExternal, rTotal } = solved;
  const scaleN = Math.max(1, Math.abs(solved.emfN), Math.abs(solved.uExternalN), Math.abs(solved.iMainN));
  const checks: Check[] = [];
  const V = (n: CircuitNode): NodeVals => vals.get(n) as NodeVals;

  // K1(a): U mạch ngoài = E − I·r.
  checks.push(resCheck('K1', 'U_N = E − I·r', sub(uExternal, sub(emf, mul(iMain, r))), scaleN));

  // K1(b) mỗi khối series: Σ U(item) = U(khối); K2 mỗi khối parallel: Σ I(item) = I(khối) + U đồng nhất.
  const visit = (node: CircuitNode): void => {
    if (node.kind === 'series') {
      const sumU = node.items.reduce((s, it) => add(s, V(it).U), ZERO);
      checks.push(resCheck('K1', `Σ U(item) = U(${node.name ?? 'series'})`, sub(sumU, V(node).U), scaleN));
      node.items.forEach(visit);
    } else if (node.kind === 'parallel') {
      const sumI = node.items.reduce((s, it) => add(s, V(it).I), ZERO);
      checks.push(resCheck('K2', `Σ I(item) = I(${node.name ?? 'parallel'})`, sub(sumI, V(node).I), scaleN));
      for (const it of node.items) {
        checks.push(resCheck('K2', `U nhánh = U(${node.name ?? 'parallel'})`, sub(V(it).U, V(node).U), scaleN));
        visit(it);
      }
    }
  };
  visit(root);

  // K3 bảo toàn công suất: Σ P(mọi LÁ) + I²·r = E·I.
  const leafP = (node: CircuitNode): Scalar =>
    node.kind === 'series' || node.kind === 'parallel'
      ? node.items.reduce((s, it) => add(s, leafP(it)), ZERO)
      : V(node).P;
  const k3 = sub(add(leafP(root), mul(mul(iMain, iMain), r)), mul(emf, iMain));
  checks.push(resCheck('K3', 'Σ P_lá + I²·r = E·I', k3, scaleN));

  // K4 hiệu suất 2 đường (chỉ khi có query efficiency): U_N/E = R_tđ/(R_tđ + r).
  if (opts.efficiency) {
    checks.push(resCheck('K4', 'U_N/E = R_tđ/(R_tđ + r)', sub(div(uExternal, emf), div(rTotal, add(rTotal, r))), scaleN));
  }

  // Thay-đáp-ngược bài nghịch: I_chính (trên mạch đã thế) = I_target (exact 0).
  if (opts.backsub) {
    checks.push(resCheck('solve_backsub', 'I_chính(mạch đã thế) = I_target', sub(iMain, opts.backsub.targetI), scaleN));
  }
  return checks;
}
