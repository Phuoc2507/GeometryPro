// research/vsgeo-bench/perturbations/distractor.ts
// Chèn một câu dữ kiện THỪA (không dùng để giải). Đáp án KHÔNG đổi.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

// Ngân hàng câu nhiễu trung tính (không thêm ràng buộc dùng được cho lời giải).
export const DISTRACTOR_BANK: string[] = [
  "Ngoài ra, gọi K là một điểm tuỳ ý trong không gian (K không liên quan đến yêu cầu của bài).",
  "Biết thêm rằng bài toán này được dùng cho mục đích ôn tập (thông tin không dùng khi tính).",
  "Cho biết thêm: người ta sơn màu xanh cho một mặt bất kì của hình (dữ kiện không ảnh hưởng kết quả).",
];

export function distractor(seed: Seed, sentence?: string): Variant {
  const extra = sentence ?? DISTRACTOR_BANK[0];
  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "distractor");
  v.statement_vi = `${seed.statement_vi.trim()} ${extra}`;
  // answer KHÔNG đổi.
  v.variant = { kind: "distractor", parentSeedId: seed.id };
  return v;
}
