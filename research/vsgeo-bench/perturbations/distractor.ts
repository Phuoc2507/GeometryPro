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
// DS-2 (Round-7) `extraLabels` = nhãn CHỈ CÓ TRONG HÌNH (figure.points ids) và TRONG ĐÁP ÁN
// (answer.canonical) — những nhãn KHÔNG đánh vần trong lời văn nên extract*(statement) bỏ sót.
// Nếu không gộp, một đỉnh tải trọng 'K' (đặt tên trong hình / chính là đáp án) không bị coi là "đã
// dùng" ⇒ BANK[0] định nghĩa lại K ⇒ mâu thuẫn hình/đáp án (§4.3).
// HARDENING: khi KHÔNG còn phương án an toàn, TRẢ VỀ null (sentinel) — TUYỆT ĐỐI không rơi về một
// câu nhiễu ĐANG ĐỤNG nhãn. Người gọi (distractor) phải NÉM thay vì emit câu tự mâu thuẫn.
// (Thực tế BANK[1]/BANK[2] không mang nhãn HOA nên noLabel luôn tồn tại ⇒ nhánh null bất khả đạt
// với ngân hàng hiện tại; giữ throw + sentinel làm lưới an toàn nếu ngân hàng đổi về sau.)
export function pickSafeDistractor(
  statement: string,
  extraLabels: Iterable<string> = []
): string | null {
  const used = new Set<string>([
    ...extractVertexLabels(statement),
    ...extractRayAnchors(statement),
    ...extraLabels,
  ]);
  const safe = DISTRACTOR_BANK.find((s) => extractVertexLabels(s).every((l) => !used.has(l)));
  if (safe) return safe;
  const noLabel = DISTRACTOR_BANK.find((s) => extractVertexLabels(s).length === 0);
  return noLabel ?? null;
}

export function distractor(seed: Seed, sentence?: string): Variant {
  const figureIds = seed.figure?.points?.map((p) => p.id) ?? [];
  const answerLabels = [
    ...extractVertexLabels(seed.answer.canonical),
    ...extractRayAnchors(seed.answer.canonical),
  ];
  const extra =
    sentence ?? pickSafeDistractor(seed.statement_vi, [...figureIds, ...answerLabels]);
  // HARDENING (§4.3): nếu không có câu tường minh và không còn câu nhiễu AN TOÀN nào ⇒ NÉM (bỏ qua),
  // thà mất một biến thể còn hơn emit câu nhiễu đụng nhãn (định nghĩa lại điểm/mâu thuẫn hình/đáp án).
  if (extra == null) {
    throw new Error(
      `distractor: không còn câu nhiễu AN TOÀN (mọi phương án đều đưa nhãn trùng đề/hình/đáp án) — bỏ qua §4.3 — seed ${seed.id}`
    );
  }
  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "distractor");
  v.statement_vi = `${seed.statement_vi.trim()} ${extra}`;
  // answer KHÔNG đổi.
  v.variant = { kind: "distractor", parentSeedId: seed.id };
  return v;
}
