// research/vsgeo-bench/perturbations/distractor.ts
// Chèn một câu dữ kiện THỪA (không dùng để giải). Đáp án KHÔNG đổi.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";
import { extractVertexLabels, extractRayAnchors } from "./rename";

// Ngân hàng câu nhiễu trung tính (không thêm ràng buộc dùng được cho lời giải).
export const DISTRACTOR_BANK: string[] = [
  "Ngoài ra, gọi K là một điểm tuỳ ý trong không gian (K không liên quan đến yêu cầu của bài).",
  "Biết thêm rằng bài toán này được dùng cho mục đích ôn tập (thông tin không dùng khi tính).",
  "Cho biết thêm: người ta sơn màu xanh cho một mặt bất kì của hình (dữ kiện không ảnh hưởng kết quả).",
];

// F8 Chọn câu nhiễu KHÔNG đưa vào nhãn đã có trong đề. BANK[0] giới thiệu điểm 'K' — nếu
// đề đã có 'K' thì hai điểm khác nhau cùng tên 'K' (hình mơ hồ, dữ liệu sai im lặng).
// BANK[1]/BANK[2] không đưa nhãn HOA nào nên luôn là phương án dự phòng an toàn.
// DS-1 (Round-5) Gộp thêm nhãn NEO TIA ('Kx/Ky/Kz' — đỉnh chung của tia) vào tập "used":
// extractVertexLabels BỎ SÓT 'K' khi theo sau chữ hướng thường ('Kz'), nên nếu đề neo điểm
// tải trọng tại 'K' viết dạng tia thì BANK[0] vẫn bị chọn và ĐỊNH NGHĨA LẠI K thành "tuỳ ý"
// ⇒ statement tự mâu thuẫn (§4.3). extractRayAnchors bắt 'K' để loại BANK[0], rơi về BANK[1].
export function pickSafeDistractor(statement: string): string {
  const used = new Set<string>([
    ...extractVertexLabels(statement),
    ...extractRayAnchors(statement),
  ]);
  const safe = DISTRACTOR_BANK.find((s) => extractVertexLabels(s).every((l) => !used.has(l)));
  if (safe) return safe;
  const noLabel = DISTRACTOR_BANK.find((s) => extractVertexLabels(s).length === 0);
  return noLabel ?? DISTRACTOR_BANK[DISTRACTOR_BANK.length - 1];
}

export function distractor(seed: Seed, sentence?: string): Variant {
  const extra = sentence ?? pickSafeDistractor(seed.statement_vi);
  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "distractor");
  v.statement_vi = `${seed.statement_vi.trim()} ${extra}`;
  // answer KHÔNG đổi.
  v.variant = { kind: "distractor", parentSeedId: seed.id };
  return v;
}
