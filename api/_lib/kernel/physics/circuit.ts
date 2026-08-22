// api/_lib/kernel/physics/circuit.ts
// THUẦN (Scalar) — không zod, không I/O. Tầng giải mạch điện một chiều lớp 11 (spec §7):
//  - thu gọn R_tđ đệ quy: series = Σ R; parallel = 1/Σ(1/R) — ĐÓNG trong ℚ, radicand luôn 1 ⇒ exact 100%;
//  - phân bố U/I/P xuống cây thành BẢNG phần tử (mỗi lá + mỗi khối có tên + hàng mạch ngoài);
//  - bài nghịch: thu gọn Möbius R(x) = (a·x + b)/(c·x + d), nghiệm đóng MỘT phép chia.
// Mỗi hàm có CẶP FLOAT ĐỘC LẬP (…N, số học `number` thường) — đường đối chiếu cho certifyScalar (§7.2).
import { type Scalar, rat, add, sub, mul, div } from '../scalar';
import { scalarFromNumber } from './kinematics';
import type { CircuitNode } from './circuitSchema';

// EPS_SELF: ngưỡng thay-ngược/tự-kiểm khi rơi float (dùng chung TRỊ SỐ 1e-6 của v0 — CI-4:
// KHÔNG đặt hằng riêng EPS_LAMP). Mạch DC toàn hữu tỉ nên residual thực tế luôn exact-0;
// EPS_SELF chỉ dùng khi đề cho số lẻ không biểu diễn được hữu tỉ.
export const EPS_SELF = 1e-6;

// Nguồn: khai lỏng (emf?) cho khớp z.infer<CircuitPlanSchema>['source'] dưới strictNullChecks:false
// (theo đúng quy ước v0 — mọi hàm nhận thẳng kiểu z.infer lỏng). emf luôn có thật lúc chạy (schema positive).
export type CircuitSource = { emf?: number; r?: number };

// Giá trị một nút trong bảng phân bố: {R, I, U, P} exact + bản float độc lập.
export type NodeVals = {
  kind: 'resistor' | 'lamp' | 'unknown_resistor' | 'group_series' | 'group_parallel';
  R: Scalar; I: Scalar; U: Scalar; P: Scalar;
  Rn: number; In: number; Un: number; Pn: number;
};

export type Solved = {
  emf: Scalar; r: Scalar; emfN: number; rN: number;
  rTotal: Scalar; rTotalN: number;
  iMain: Scalar; iMainN: number;
  uExternal: Scalar; uExternalN: number;
  root: CircuitNode;
  vals: Map<CircuitNode, NodeVals>;          // MỌI nút (kể cả nhóm không tên) — cho Kirchhoff duyệt cây
  byName: Map<string, CircuitNode>;          // lá + nhóm CÓ TÊN — cho query trỏ theo tên
  lampInfo: Map<string, { iRated: Scalar; iRatedN: number }>; // I_đm = P_đm/U_đm cho lamp_check
};

// Thay thế lá ẩn bằng giá trị Scalar (bài nghịch, sau khi giải x) — giữ nguyên exact.
export type UnknownSub = { name: string; R: Scalar; Rn: number };

const ONE = rat(1n);
const ZERO = rat(0n);

// ── §7.1 Chuẩn hóa lá → R (Scalar) ───────────────────────────────────────────
export function leafR(node: CircuitNode, sub?: UnknownSub): Scalar {
  if (node.kind === 'resistor') {
    const base = scalarFromNumber(node.ohms);
    return node.unit === 'kohm' ? mul(base, rat(1000n)) : base;
  }
  if (node.kind === 'lamp') {
    const U = scalarFromNumber(node.ratedVolts);
    return div(mul(U, U), scalarFromNumber(node.ratedWatts)); // R = U_đm²/P_đm (coi hằng)
  }
  // unknown_resistor: chỉ có R khi đã thế nghiệm (bài nghịch); ngoài ra chỉ hợp lệ trên đường Möbius.
  if (sub && sub.name === node.name) return sub.R;
  throw new Error(`unknown_resistor "${node.name}" chưa có giá trị — chỉ hợp lệ trên đường Möbius (§7.5)`);
}
export function leafRN(node: CircuitNode, sub?: UnknownSub): number {
  if (node.kind === 'resistor') return node.ohms * (node.unit === 'kohm' ? 1000 : 1);
  if (node.kind === 'lamp') return (node.ratedVolts * node.ratedVolts) / node.ratedWatts;
  if (sub && sub.name === node.name) return sub.Rn;
  throw new Error(`unknown_resistor "${node.name}" chưa có giá trị`);
}

// ── §7.2 Thu gọn R_tđ đệ quy (exact + float độc lập) ─────────────────────────
export function reduceR(node: CircuitNode, sub?: UnknownSub): Scalar {
  if (node.kind === 'series') return node.items.map((i) => reduceR(i, sub)).reduce((a, b) => add(a, b), ZERO);
  if (node.kind === 'parallel') {
    const invSum = node.items.map((i) => div(ONE, reduceR(i, sub))).reduce((a, b) => add(a, b), ZERO);
    return div(ONE, invSum);
  }
  return leafR(node, sub);
}
export function reduceRN(node: CircuitNode, sub?: UnknownSub): number {
  if (node.kind === 'series') return node.items.reduce((s, i) => s + reduceRN(i, sub), 0);
  if (node.kind === 'parallel') return 1 / node.items.reduce((s, i) => s + 1 / reduceRN(i, sub), 0);
  return leafRN(node, sub);
}

// ── §7.3 Giải phân bố U/I/P → bảng ───────────────────────────────────────────
type Drive = { mode: 'I' | 'U'; valS: Scalar; valN: number };

function distribute(
  node: CircuitNode, drive: Drive, sub: UnknownSub | undefined,
  vals: Map<CircuitNode, NodeVals>, byName: Map<string, CircuitNode>,
  lampInfo: Map<string, { iRated: Scalar; iRatedN: number }>,
): void {
  const R = reduceR(node, sub), Rn = reduceRN(node, sub);
  let I: Scalar, U: Scalar, In: number, Un: number;
  if (drive.mode === 'I') { I = drive.valS; In = drive.valN; U = mul(I, R); Un = In * Rn; }
  else { U = drive.valS; Un = drive.valN; I = div(U, R); In = Un / Rn; }
  const kind: NodeVals['kind'] =
    node.kind === 'series' ? 'group_series' : node.kind === 'parallel' ? 'group_parallel' : node.kind;
  vals.set(node, { kind, R, I, U, P: mul(U, I), Rn, In, Un, Pn: Un * In });

  if (node.kind === 'series') {
    if (node.name) byName.set(node.name, node);
    for (const it of node.items) distribute(it, { mode: 'I', valS: I, valN: In }, sub, vals, byName, lampInfo); // cùng I
  } else if (node.kind === 'parallel') {
    if (node.name) byName.set(node.name, node);
    for (const it of node.items) distribute(it, { mode: 'U', valS: U, valN: Un }, sub, vals, byName, lampInfo); // cùng U
  } else {
    byName.set(node.name, node);
    if (node.kind === 'lamp') {
      const iRated = div(scalarFromNumber(node.ratedWatts), scalarFromNumber(node.ratedVolts)); // I_đm = P_đm/U_đm
      lampInfo.set(node.name, { iRated, iRatedN: node.ratedWatts / node.ratedVolts });
    }
  }
}

// Định luật Ôm toàn mạch + phân bố từ gốc với I_chính. sub: thế nghiệm bài nghịch (nếu có).
export function solveCircuit(source: CircuitSource, root: CircuitNode, sub?: UnknownSub): Solved {
  const emfN = source.emf, rN = source.r ?? 0;
  const emf = scalarFromNumber(emfN), r = scalarFromNumber(rN);
  const rTotal = reduceR(root, sub), rTotalN = reduceRN(root, sub);
  const iMain = div(emf, add(rTotal, r)), iMainN = emfN / (rTotalN + rN);         // I = E/(R_tđ + r)
  const uExternal = mul(iMain, rTotal), uExternalN = iMainN * rTotalN;             // U_N = I·R_tđ (= E − I·r, kiểm K1)

  const vals = new Map<CircuitNode, NodeVals>();
  const byName = new Map<string, CircuitNode>();
  const lampInfo = new Map<string, { iRated: Scalar; iRatedN: number }>();
  distribute(root, { mode: 'I', valS: iMain, valN: iMainN }, sub, vals, byName, lampInfo);

  return { emf, r, emfN, rN, rTotal, rTotalN, iMain, iMainN, uExternal, uExternalN, root, vals, byName, lampInfo };
}

// Đọc hàng bảng của `of` (undefined = hàng mạch ngoài = root). Ném lỗi có cấu trúc nếu tên lạ.
export function rowOf(solved: Solved, of?: string): NodeVals {
  if (of === undefined) return solved.vals.get(solved.root) as NodeVals;
  const node = solved.byName.get(of);
  if (!node) throw new Error(`không có phần tử tên "${of}" trong bảng`);
  return solved.vals.get(node) as NodeVals;
}

// ── §7.5 Möbius bài nghịch ───────────────────────────────────────────────────
export function containsUnknown(node: CircuitNode): boolean {
  if (node.kind === 'unknown_resistor') return true;
  if (node.kind === 'series' || node.kind === 'parallel') return node.items.some(containsUnknown);
  return false;
}

export type Mobius = { a: Scalar; b: Scalar; c: Scalar; d: Scalar };

// R(x) = (a·x + b)/(c·x + d), quy nạp cấu trúc: ở mỗi nhóm TỐI ĐA MỘT con chứa x (superRefine
// bảo đảm ≤ 1 ẩn), các con còn lại thu gọn thành hằng C bằng §7.2.
export function mobius(node: CircuitNode): Mobius {
  if (node.kind === 'unknown_resistor') return { a: ONE, b: ZERO, c: ZERO, d: ONE }; // R = x
  if (node.kind === 'resistor' || node.kind === 'lamp') return { a: ZERO, b: leafR(node), c: ZERO, d: ONE }; // R = hằng
  const withX = node.items.filter(containsUnknown);
  const without = node.items.filter((i) => !containsUnknown(i));
  if (withX.length === 0) return { a: ZERO, b: reduceR(node), c: ZERO, d: ONE }; // cả khối là hằng
  const M = mobius(withX[0]);
  if (without.length === 0) return M; // không xảy ra (nhóm ≥ 2 item, ≤ 1 ẩn) — an toàn

  if (node.kind === 'series') {
    const C = without.map((i) => reduceR(i)).reduce((a, b) => add(a, b), ZERO); // Σ R con hằng
    // series(M + C): (a + c·C, b + d·C, c, d)
    return { a: add(M.a, mul(M.c, C)), b: add(M.b, mul(M.d, C)), c: M.c, d: M.d };
  }
  // parallel: C = thu gọn song song các con hằng
  const invSum = without.map((i) => div(ONE, reduceR(i))).reduce((a, b) => add(a, b), ZERO);
  const C = div(ONE, invSum);
  // parallel(M ∥ C): (C·a, C·b, a + C·c, b + C·d)
  return { a: mul(C, M.a), b: mul(C, M.b), c: add(M.a, mul(C, M.c)), d: add(M.b, mul(C, M.d)) };
}

export type SolveUnknownResult =
  | { ok: true; x: Scalar; xN: number; Rneed: Scalar; RneedN: number }
  | { ok: false; message: string };

// Tìm x để I MẠCH CHÍNH = target. R_cần = E/I − r; x = (d·R_cần − b)/(a − c·R_cần).
export function solveUnknown(
  source: CircuitSource, root: CircuitNode, _unknownName: string, targetCurrent: number,
): SolveUnknownResult {
  const emfN = source.emf, rN = source.r ?? 0;
  const emf = scalarFromNumber(emfN), r = scalarFromNumber(rN);
  const targetS = scalarFromNumber(targetCurrent);
  const Rneed = sub(div(emf, targetS), r);
  const RneedN = emfN / targetCurrent - rN;
  if (RneedN <= EPS_SELF) {
    return { ok: false, message: `dòng yêu cầu I = ${targetCurrent} A lớn hơn mức nguồn cấp nổi (R cần = ${RneedN.toFixed(4)} ≤ 0)` };
  }
  const { a, b, c, d } = mobius(root);
  const denom = sub(a, mul(c, Rneed));
  const denomN = a.approx - c.approx * RneedN;
  if (Math.abs(denomN) < EPS_SELF) {
    return { ok: false, message: `R_tđ không đạt được giá trị ${RneedN.toFixed(4)} Ω (mẫu Möbius suy biến)` };
  }
  const x = div(sub(mul(d, Rneed), b), denom);
  const xN = (d.approx * RneedN - b.approx) / denomN;
  if (xN <= EPS_SELF) {
    return { ok: false, message: `giá trị điện trở không dương (Rx = ${xN.toFixed(4)} Ω) — mô hình không khớp đề` };
  }
  return { ok: true, x, xN, Rneed, RneedN };
}
