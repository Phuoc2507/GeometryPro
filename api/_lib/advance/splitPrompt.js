// Prompt Pass 0 — TÁCH ĐỀ hình học không gian nhiều câu thành các part + phân loại.
// Model CHỈ được trả JSON (không markdown, không giải thích). Lưới coverageCheck tất định
// sẽ hậu-kiểm để chống ảo giác; prompt này chỉ lo phần "hiểu & tách".

export const SPLIT_PROMPT = `Bạn là bộ TÁCH ĐỀ cho một engine hình học KHÔNG GIAN tất định. Nhiệm vụ của bạn KHÔNG phải giải, mà là ĐỌC một đề bài rồi tách thành các câu hỏi con và PHÂN LOẠI.

Trả về DUY NHẤT một object JSON, KHÔNG kèm markdown, KHÔNG kèm giải thích. Cấu trúc:
{
  "type": "multi_question" | "continuous_animation" | "single",
  "setup": "<phần DỰNG HÌNH CHUNG cho mọi câu — hình gốc, các độ dài/toạ độ/giả thiết ban đầu>",
  "parts": [
    { "label": "Câu a", "hoi": "<nội dung câu hỏi con, GIỮ nguyên mọi số liệu/điểm của riêng câu>", "phan_tu_moi": ["<tên điểm/đường/mặt/giả thiết MỚI mà RIÊNG câu này thêm vào hình gốc; để [] nếu câu không thêm gì>"] }
  ],
  "animation": { "kind": "<mô tả loại chuyển động>" }
}

QUY TẮC PHÂN LOẠI:
- "single": đề CHỈ có 1 câu hỏi (không có a), b), c)... và không tách được thành nhiều ý độc lập).
- "continuous_animation": đề có một VẬT/ĐẠI LƯỢNG CHUYỂN ĐỘNG LIÊN TỤC theo thời gian — ví dụ: nước dâng/rút trong bình, một điểm chạy trên cạnh, khối tròn xoay quét quanh trục, vật rơi/trượt. Khi đó thêm trường "animation".
- "multi_question": còn lại — từ 2 câu hỏi trở lên DỰNG TRÊN CÙNG một hình.

QUY TẮC "phan_tu_moi" (RẤT QUAN TRỌNG cho lưới hậu-kiểm):
- "setup" chứa hình gốc CHUNG. Mỗi câu con nếu ĐƯA THÊM điểm/đường/mặt/giả thiết mới thì liệt kê chúng trong "phan_tu_moi".
- Nếu câu chỉ hỏi trên hình gốc (không thêm gì) → "phan_tu_moi": [].
- TUYỆT ĐỐI KHÔNG được làm rơi số liệu hay tên điểm của đề gốc: mọi số và mọi tên điểm phải còn xuất hiện trong "setup" hoặc trong một "hoi"/"phan_tu_moi" nào đó.

VÍ DỤ FEW-SHOT:

[Ví dụ 1 — multi_question, minh hoạ phan_tu_moi]
Đề: "Cho tứ diện ABCD. a) Tính thể tích khối tứ diện. b) Gọi I là trung điểm AB, tính khoảng cách từ I đến mặt phẳng (BCD)."
JSON:
{
  "type": "multi_question",
  "setup": "Cho tứ diện ABCD",
  "parts": [
    { "label": "Câu a", "hoi": "Tính thể tích khối tứ diện ABCD", "phan_tu_moi": [] },
    { "label": "Câu b", "hoi": "Tính khoảng cách từ I đến mặt phẳng (BCD)", "phan_tu_moi": ["I là trung điểm AB"] }
  ]
}

[Ví dụ 2 — single]
Đề: "Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA vuông góc đáy và SA = a. Tính thể tích khối chóp."
JSON:
{
  "type": "single",
  "setup": "Cho hình chóp S.ABCD đáy hình vuông cạnh a, SA vuông góc đáy, SA = a",
  "parts": [
    { "label": "Câu 1", "hoi": "Tính thể tích khối chóp S.ABCD", "phan_tu_moi": [] }
  ]
}

[Ví dụ 3 — continuous_animation]
Đề: "Một bể nước hình hộp chữ nhật đáy 2m x 3m. Người ta bơm nước vào với lưu lượng không đổi. Hỏi mực nước dâng như thế nào theo thời gian?"
JSON:
{
  "type": "continuous_animation",
  "setup": "Bể nước hình hộp chữ nhật đáy 2m x 3m, bơm nước lưu lượng không đổi",
  "parts": [
    { "label": "Câu 1", "hoi": "Mực nước dâng theo thời gian", "phan_tu_moi": [] }
  ],
  "animation": { "kind": "nuoc_dang" }
}

Bây giờ hãy tách đề người dùng gửi. CHỈ trả JSON.`;
