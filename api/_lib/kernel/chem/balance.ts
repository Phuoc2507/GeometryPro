// api/_lib/kernel/chem/balance.ts
// Cân bằng PTHH bằng ĐẠI SỐ TUYẾN TÍNH HỮU TỈ (spec chem §7) — tất định tuyệt đối:
// ma trận nguyên tố × chất (chất tham gia dấu +, sản phẩm dấu −), Gauss–Jordan exact,
// yêu cầu dim(nullspace) = 1, hệ số nguyên dương tối giản. KHÔNG xét chiều nhiệt động —
// chặn chiều phản ứng là việc của Reaction DB.
import { parseFormula } from './formula';
import { type Rat, R0, R1, rat, addR, subR, mulR, divR, isZeroR } from './rat';

export type BalanceResult =
  | { ok: true; coefficients: number[] }
  | { ok: false; problem: string };

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}

export function balance(reactants: string[], products: string[]): BalanceResult {
  let parsed: Map<string, number>[];
  try {
    parsed = [...reactants, ...products].map((f) => parseFormula(f));
  } catch (e) {
    return { ok: false, problem: e instanceof Error ? e.message : String(e) };
  }
  const nR = reactants.length;
  const nCols = parsed.length;
  if (nCols < 2) return { ok: false, problem: 'cần ít nhất 2 chất' };

  // Danh sách nguyên tố (thứ tự gặp đầu tiên — tất định).
  const elements: string[] = [];
  for (const counts of parsed) {
    for (const el of counts.keys()) if (!elements.includes(el)) elements.push(el);
  }

  // A[hàng nguyên tố][cột chất]: reactant +, product −.
  const A: Rat[][] = elements.map((el) =>
    parsed.map((counts, j) => {
      const n = BigInt(counts.get(el) ?? 0);
      return rat(j < nR ? n : -n);
    })
  );

  // Gauss–Jordan exact (pivot ≠ 0 exact, không epsilon).
  const pivotColOfRow: number[] = [];
  let row = 0;
  for (let col = 0; col < nCols && row < A.length; col++) {
    let pivot = -1;
    for (let r = row; r < A.length; r++) {
      if (!isZeroR(A[r][col])) {
        pivot = r;
        break;
      }
    }
    if (pivot === -1) continue;
    [A[row], A[pivot]] = [A[pivot], A[row]];
    const pv = A[row][col];
    for (let c = 0; c < nCols; c++) A[row][c] = divR(A[row][c], pv);
    for (let r = 0; r < A.length; r++) {
      if (r === row || isZeroR(A[r][col])) continue;
      const factor = A[r][col];
      for (let c = 0; c < nCols; c++) A[r][c] = subR(A[r][c], mulR(factor, A[row][c]));
    }
    pivotColOfRow.push(col);
    row++;
  }

  const rank = pivotColOfRow.length;
  const nullity = nCols - rank;
  if (nullity === 0) {
    return { ok: false, problem: 'không cân bằng được (đề sai hoặc thiếu chất)' };
  }
  if (nullity >= 2) {
    return { ok: false, problem: 'hệ phản ứng không xác định duy nhất (trộn ≥ 2 phản ứng độc lập)' };
  }

  // Nullspace dim 1: cột tự do duy nhất = cột không phải pivot.
  const freeCol = [...Array(nCols).keys()].find((c) => !pivotColOfRow.includes(c))!;
  const x: Rat[] = Array.from({ length: nCols }, () => R0);
  x[freeCol] = R1;
  pivotColOfRow.forEach((pc, r) => {
    // hàng r sau RREF: x[pc] + A[r][freeCol]·x[freeCol] = 0 ⇒ x[pc] = −A[r][freeCol]
    x[pc] = subR(R0, A[r][freeCol]);
  });

  // Nhân LCM mẫu số → nguyên; chia GCD → tối giản; chỉnh dấu; mọi hệ số phải > 0.
  let lcm = 1n;
  for (const v of x) lcm = (lcm / bgcd(lcm, v.den)) * v.den;
  let ints = x.map((v) => (v.num * lcm) / v.den);
  let gcd = 0n;
  for (const v of ints) gcd = bgcd(gcd, v);
  ints = ints.map((v) => v / gcd);
  if (ints.every((v) => v < 0n)) ints = ints.map((v) => -v);
  if (ints.some((v) => v <= 0n)) {
    return { ok: false, problem: 'hệ số không toàn dương — có chất đặt nhầm vế hoặc không tham gia' };
  }
  return { ok: true, coefficients: ints.map((v) => Number(v)) };
}
