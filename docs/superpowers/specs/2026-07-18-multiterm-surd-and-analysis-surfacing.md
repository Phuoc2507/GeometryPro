# Spec (CHỜ DUYỆT) — Số đa-căn (#2-full) & Hiển thị đáp giải tích trong route vẽ

**Ngày:** 2026-07-18 · **Trạng thái:** SPEC — CHƯA cài đặt, chờ người dùng duyệt (đều là thay đổi rủi ro).

Hai việc lớn còn lại, cả hai đụng lõi/kiến trúc nên KHÔNG làm tự động qua đêm. Ghi rõ để duyệt.

---

## A. Số đa-căn (#2-full) — nâng `Scalar` từ MỘT căn lên TỔNG các căn

### Hiện trạng
`Exact = { num, den, radicand }` = một hạng tử `(num/den)·√radicand`. KHÔNG biểu diễn được:
- Nhị thức `10−2√7`, `3+2√5` → rời trường → rơi về số (rồi recognizer đoán lại — heuristic, có thể sai).
- Hai căn khác nhau `√2+√3`.
Nghĩa là "căn đẹp" của các đáp nhị thức hiện **do recognizer dựng lại**, không phải exact thật.

### Đề xuất
Kiểu số đa-hạng-tử: `Exact = Term[]` với `Term = { num: bigint, den: bigint, radicand: number }`,
biểu diễn `Σ (num_i/den_i)·√radicand_i` (radicand square-free; gộp hạng tử cùng radicand; sắp xếp chuẩn).
- `add/sub`: gộp theo radicand (dễ).
- `mul`: phân phối; `√ra·√rb = √(ra·rb)` rồi extractSquare (số hạng tăng, cần thu gọn).
- `div`: hữu-tỉ-hoá mẫu (nhân liên hợp) — phần khó nhất; với mẫu nhiều căn cần liên hợp tổng quát.
- `sqrt`: chỉ đóng khi toán hạng là một hạng tử chính phương; ngoài ra `null` (rời trường — chấp nhận).
- `display`: `10 - 2√7`, `√2 + √3`…

### Phạm vi ảnh hưởng (vì sao rủi ro)
Đụng `scalar.ts` (mọi phép) + MỌI nơi đọc `Exact` (equation.ts, answer.ts self-cert, recognize, oxyz…).
Là refactor lõi — 400+ test phải giữ xanh, và có nhiều ca biên (div liên hợp, overflow bigint).
**Ước lượng: nhiều buổi, cần review kỹ.** Lợi: `10−2√7` thành exact THẬT (bỏ phụ thuộc recognizer),
và mở khoá thêm đáp nhị thức chính xác.

### KHÔNG bao gồm
Căn lồng `√(1+√2)` (cần trường số đại số — gần như không đáng), số có π (giữ ở recognizer).

### Phương án rẻ hơn (nếu không muốn refactor lõi)
Giữ single-surd + recognizer đã ++ (đã làm đêm nay). Nhược: `10−2√7` vẫn là "nhận dạng", và
recognizer có đánh đổi độ-chính-xác/khớp-giả (xem báo cáo).

---

## B. Hiển thị đáp GIẢI TÍCH trong route vẽ (phát hiện đêm 2026-07-18)

### Vấn đề (quan trọng)
Route vẽ `/api/analyze-geometry` chỉ NHẬN kết quả engine khi có `geometry.points.length > 0`.
Nhưng bài GIẢI TÍCH (đống rơm, đèn lồng, quả cầu 3 cột, nón∩trụ, hồ bơi, bóng tấm pin — Câu 1,4,5,8,9,10)
đi qua `runAnalysis`, và `solvePlan` trả `geometry: null` cho nhánh analysis (runAnalysis chỉ tính SỐ,
vứt bỏ hình). ⇒ **các đáp giải tích LUÔN rơi về luồng LLM cũ — chưa bao giờ đến người dùng qua route vẽ.**

Nói cách khác: engine giải tích đã xây + 400 test, nhưng **route sản phẩm hiện chỉ hưởng phần HÌNH HỌC**
(Câu 3, 6, và chóp/lập phương/mặt cầu chuẩn). Phần giải tích là "để dành".

### Đề xuất (cần duyệt vì đổi kiến trúc)
1. `runAnalysis` trả THÊM hình tại nghiệm: sau khi tìm được tham số tối ưu/nghiệm, chạy `run()` lần cuối
   giữ lại `entityTableToGeometryData` → trả cả `geometry` LẪN `answer`. Khi đó route vẽ hiện được
   parabol + tiếp tuyến (đống rơm) kèm đáp số.
2. Hoặc: route hiện đáp số dưới dạng CHỮ (calculation_log) kèm hình luồng cũ — nhẹ hơn nhưng nửa vời.

### Kèm theo — CHỌN NGHIỆM (ca #1 bắt được đêm nay)
"Quả cầu 3 cột" gõ tự nhiên ra `10+2√7 ≈ 15,29` (SAI; đúng `10−2√7`). `solveParam` lấy nghiệm ĐẦU,
mà bài này có nghiệm vật lý (cầu tựa TRÊN, tâm phía trên). Cần: `solve` chọn nghiệm theo ràng buộc
vật lý (vd điểm tiếp xúc dưới tâm), hoặc trả mọi nghiệm để tầng trên/đề lọc. Đây là biểu hiện của #1
(engine không tự biết nghiệm nào "vật lý" nếu đề không nói) — cần thiết kế, không sửa mù.

---

## Vì sao để duyệt, không tự làm
A = refactor lõi (rủi ro cao). B = đổi kiến trúc route + hành vi runAnalysis (đang chạy production).
Cả hai nên có mắt người trước khi đụng nhánh production. Recognizer++/log/answerCompare (an toàn) đã làm.
