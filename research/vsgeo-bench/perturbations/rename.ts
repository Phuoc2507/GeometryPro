// research/vsgeo-bench/perturbations/rename.ts
// Đổi tên đỉnh (S.ABCD -> ...). Đáp án KHÔNG đổi vì đỉnh là chữ HOA còn đáp án dùng chữ thường + căn.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

// "Là nhãn đỉnh" = chữ HOA KHÔNG theo sau bởi một chữ thường (kể cả chữ thường có dấu).
// Nhờ vậy 'C' trong "Cho" (theo sau 'h') bị loại, còn 'C' trong "ABCD" được nhận.
const AFTER_LABEL_NEG = "(?![a-zà-ỹ])";

export function extractVertexLabels(text: string): string[] {
  const re = new RegExp(`[A-Z]${AFTER_LABEL_NEG}`, "g");
  const seen: string[] = [];
  for (const m of text.matchAll(re)) {
    if (!seen.includes(m[0])) seen.push(m[0]);
  }
  return seen;
}

// Bể chữ đích. Lọc bỏ chữ đang dùng để không tạo "thay dây chuyền" (A->M, rồi M vô tình bị thay tiếp).
const TARGET_POOL = ["M", "N", "P", "Q", "R", "T", "U", "V", "X", "Y", "Z", "E", "F", "G", "H", "I", "J", "K", "L"];

// F3 `exclude` = TẤT CẢ nhãn không được chọn làm đích: gồm cả nhãn chỉ xuất hiện trong
// LỜI VĂN (trung điểm M, mặt phẳng (P), tâm I...) chứ không nằm trong figure.points.
// Nếu bỏ sót, rename có thể chọn 'M' làm đích cho 'A' trong khi 'M' đã là điểm khác => hai
// điểm khác nhau cùng tên 'M' (dữ liệu sai im lặng). Mặc định exclude=labels giữ tương thích.
export function defaultRenameMap(
  labels: string[],
  exclude: Iterable<string> = labels
): Map<string, string> {
  const used = new Set<string>([...labels, ...exclude]);
  const targets = TARGET_POOL.filter((c) => !used.has(c));
  const map = new Map<string, string>();
  labels.forEach((l, i) => {
    if (i >= targets.length) throw new Error("Hết chữ đích để đổi tên đỉnh");
    map.set(l, targets[i]);
  });
  return map;
}

export function renameInText(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [from, to] of map) {
    out = out.replace(new RegExp(`${from}${AFTER_LABEL_NEG}`, "g"), to);
  }
  return out;
}

export function rename(seed: Seed, map?: Map<string, string>): Variant {
  // Ưu tiên lấy nhãn từ figure.points; nếu không có thì quét lời văn.
  const labels =
    seed.figure?.points && seed.figure.points.length > 0
      ? seed.figure.points.map((p) => p.id)
      : extractVertexLabels(seed.statement_vi);
  // F3: loại khỏi bể đích cả nhãn chỉ có trong lời văn (không nằm trong figure.points).
  const exclude = new Set<string>([...labels, ...extractVertexLabels(seed.statement_vi)]);
  const renameMap = map ?? defaultRenameMap(labels, exclude);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "rename");
  v.statement_vi = renameInText(seed.statement_vi, renameMap);
  if (v.figure?.points) {
    v.figure.points = v.figure.points.map((p) => ({ ...p, id: renameMap.get(p.id) ?? p.id }));
  }
  // answer KHÔNG đổi.
  v.variant = { kind: "rename", parentSeedId: seed.id };
  return v;
}
