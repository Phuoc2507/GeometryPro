// research/vsgeo-bench/perturbations/metrics.ts
// Chỉ số robustness/consistency — nhóm phân tích (plan 05) sẽ import lại.
import type { Verdict } from "./types";

// Độ chính xác = số "correct" / tổng. Mảng rỗng -> ném.
export function accuracy(verdicts: Verdict[]): number {
  if (verdicts.length === 0) throw new Error("accuracy cần ít nhất 1 phán quyết");
  const correct = verdicts.filter((v) => v === "correct").length;
  return correct / verdicts.length;
}

// Khoảng rớt robustness (scalar) = accuracy(gốc) - accuracy(biến thể).
export function robustnessGap(accGoc: number, accBienThe: number): number {
  return accGoc - accBienThe;
}

// --- HỢP ĐỒNG DÙNG CHUNG với plan 05: báo cáo robustness theo bản ghi (record) + theo loại phép ---
// Một bản ghi tối thiểu cho việc tính gap: phán quyết + (nếu là biến thể) loại phép đã áp.
type RecordForGap = { verdict: "correct" | "incorrect" | "unsure"; perturbation?: { kind: string } };

// acc trên MẢNG BẢN GHI = (số verdict==="correct") / độ dài; mảng RỖNG -> 0 (khác accuracy() ném lỗi).
function accRecords(xs: RecordForGap[]): number {
  if (xs.length === 0) return 0;
  return xs.filter((r) => r.verdict === "correct").length / xs.length;
}

// robustnessReport: so bản ghi GỐC (base) với bản ghi BIẾN THỂ (variants).
//   overall      = acc(base) - acc(variants)
//   byKind[kind] = acc(base) - acc(variants CHỈ thuộc kind đó)
// Đây là hàm plan 05 (analysis/report.ts) import lại — chữ ký: (base, variants) -> {overall, byKind}.
export function robustnessReport(
  base: RecordForGap[],
  variants: RecordForGap[]
): { overall: number; byKind: Record<string, number> } {
  const accBase = accRecords(base);
  const overall = accBase - accRecords(variants);
  const byKind: Record<string, number> = {};
  const kinds = new Set(
    variants.map((r) => r.perturbation?.kind).filter((k): k is string => k !== undefined)
  );
  for (const kind of kinds) {
    const subset = variants.filter((r) => r.perturbation?.kind === kind);
    byKind[kind] = accBase - accRecords(subset);
  }
  return { overall, byKind };
}

// Độ nhất quán trong MỘT họ biến thể = tỉ lệ phán quyết trùng phán quyết đa số.
export function consistency(verdicts: Verdict[]): number {
  if (verdicts.length === 0) throw new Error("consistency cần ít nhất 1 phán quyết");
  const counts = new Map<Verdict, number>();
  for (const v of verdicts) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return max / verdicts.length;
}
