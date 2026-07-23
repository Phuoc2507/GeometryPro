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
// F5: kèm định danh seed để byKind so đúng cha: seedId (bản ghi GỐC) / parentSeedId (biến thể).
type RecordForGap = {
  verdict: "correct" | "incorrect" | "unsure";
  perturbation?: { kind: string };
  seedId?: string;
  parentSeedId?: string;
};

// F5 acc KÈM SỐ LƯỢNG. Mảng RỖNG -> acc=NaN (KHÔNG phải 0): "không có dữ liệu" ≠ "0% đúng".
// Trả về 0 như cũ khiến gap rỗng đọc nhầm thành "rớt sạch điểm".
function accWithCount(xs: RecordForGap[]): { acc: number; n: number } {
  const n = xs.length;
  if (n === 0) return { acc: NaN, n: 0 };
  return { acc: xs.filter((r) => r.verdict === "correct").length / n, n };
}

// robustnessReport: so bản ghi GỐC (base) với bản ghi BIẾN THỂ (variants).
//   overall      = acc(base) - acc(variants)                       (NaN nếu thiếu dữ liệu)
//   byKind[kind] = acc(base CHỈ các seed cha của kind) - acc(variants kind đó)
//   counts[kind] = { nBase, nVariant } để đọc gap có ý nghĩa thống kê hay không
// Khi biến thể chưa gắn parentSeedId hoặc base chưa gắn seedId thì lùi về base TOÀN CỤC
// (giữ tương thích với người gọi cũ). byKind vẫn là SỐ (gap) như hợp đồng plan 05.
export function robustnessReport(
  base: RecordForGap[],
  variants: RecordForGap[]
): {
  overall: number;
  byKind: Record<string, number>;
  counts: Record<string, { nBase: number; nVariant: number }>;
  nBase: number;
  nVariant: number;
} {
  const baseAll = accWithCount(base);
  const varAll = accWithCount(variants);
  const overall = baseAll.acc - varAll.acc;
  const byKind: Record<string, number> = {};
  const counts: Record<string, { nBase: number; nVariant: number }> = {};
  const kinds = new Set(
    variants.map((r) => r.perturbation?.kind).filter((k): k is string => k !== undefined)
  );
  for (const kind of kinds) {
    const subset = variants.filter((r) => r.perturbation?.kind === kind);
    const parents = new Set(
      subset.map((r) => r.parentSeedId).filter((s): s is string => s !== undefined)
    );
    const canRestrict = parents.size > 0 && base.some((r) => r.seedId !== undefined);
    const baseForKind = canRestrict
      ? base.filter((r) => r.seedId !== undefined && parents.has(r.seedId))
      : base;
    const b = accWithCount(baseForKind);
    const s = accWithCount(subset);
    byKind[kind] = b.acc - s.acc;
    counts[kind] = { nBase: b.n, nVariant: s.n };
  }
  return { overall, byKind, counts, nBase: baseAll.n, nVariant: varAll.n };
}

// Độ nhất quán trong MỘT họ biến thể = tỉ lệ phán quyết trùng phán quyết đa số.
export function consistency(verdicts: Verdict[]): number {
  if (verdicts.length === 0) throw new Error("consistency cần ít nhất 1 phán quyết");
  const counts = new Map<Verdict, number>();
  for (const v of verdicts) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return max / verdicts.length;
}
