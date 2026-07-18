# Nâng độ phủ engine cho bài Oxyz "dựng hình" — Design Spec

**Ngày:** 2026-07-18
**Trạng thái:** Đã duyệt thiết kế (chờ viết implementation plan)
**Nhánh làm việc:** `claude/engine-improvements`

---

## 1. Mục tiêu

Nâng **độ phủ** của engine trên các bài hình học toạ độ Oxyz kiểu "vận dụng cao" — loại
**dựng cấu hình thoả nhiều ràng buộc** (tìm mặt phẳng / đường thẳng / điểm thoả điều kiện) rồi
tính một đại lượng. Vẫn theo mô hình hiện tại: **LLM dịch → engine dựng + tính + tự kiểm**; engine
serve figure + đáp số, ít rơi về hơn.

Không đổi triết lý chống ảo giác: engine chỉ serve cái **tự kiểm được bằng assert**.

## 2. Bối cảnh & PHÁT HIỆN CHÍNH (định hướng cả thiết kế)

Đo thực trên PDF "trắc nghiệm Oxyz vận dụng cao" (đọc ảnh vision, chạy engine thật):

- Phần 1 (dựng hình cơ bản): **0/3 phục vụ** — tất cả rơi về.
- Phần 2 (cực trị): 2/3; Phần 3 (mặt cầu): 2/3; Phần 5 (đếm), 6 (quỹ tích): abstain.

**Phát hiện quyết định:** engine ĐÃ CÓ SẴN gần đủ op dựng hình:
`oxyz_foot`, `oxyz_reflect(_across)`, `oxyz_midpoint`, `oxyz_centroid`, `oxyz_circumcenter`,
`oxyz_orthocenter`, `oxyz_ratio`, `perp_point`, `oxyz_line` (two_points / point_dir),
`oxyz_plane` (coeffs / point_normal / three_points), `oxyz_sphere`, `oxyz_intersect`, `tangent_line`,
và cơ chế `solve`/`optimize` theo tham số.

Ví dụ các bài rơi về VẪN biểu diễn được bằng op có sẵn:
- Câu 5 (đường qua A, ⊥ và cắt d) = `oxyz_foot(A,d)` + `oxyz_line(two_points A, foot)`.
- Câu 1 (mp α ∥ P, cắt d1,d2 với MN=√3) = `oxyz_plane(coeffs cùng pháp tuyến P, hệ số d = tham số k)`
  + `oxyz_intersect(α, d1)`, `oxyz_intersect(α, d2)` + `solve k` sao cho `distance(M,N)=√3`.

⇒ **Nút thắt KHÔNG phải thiếu op, mà là translator** (`gemini-3.5-flash-low`) không mô hình nổi
chuỗi dựng nhiều bước. Vì vậy thiết kế **translator-first**, chỉ thêm op khi kiểm chứng cho thấy thật sự thiếu.

## 3. Ngoài phạm vi (scope out — YAGNI)

- **Lớp so đáp trắc nghiệm A/B/C/D** — mục tiêu là "phủ" (vẽ + tính), không phải chọn đáp án.
- **Bài đếm** (số mặt phẳng / mặt cầu) và **quỹ tích** — miền riêng, engine giữ nguyên hành vi **abstain**.
- Không refactor lõi số (#2 nhị thức là spec riêng, độc lập).

## 4. Kiến trúc & thành phần

Bốn thành phần, ranh giới rõ, làm được độc lập:

### 4.1. Cổng kiểm chứng (VALIDATION GATE — làm ĐẦU TIÊN)
Viết TAY plan JSON cho **3 bài rơi về** (Câu 1, Câu 5, Câu 6 Phần 1) chỉ dùng op CÓ SẴN, chạy qua
`runAny`/`run`. Kết quả quyết định hướng đầu tư:
- Cả 3 giải được ⇒ xác nhận "nút thắt là translator" ⇒ dồn vào 4.2 + 4.4 (rẻ, không thêm op).
- Bài nào KHÔNG biểu diễn được ⇒ ghi lại **chính xác** op còn thiếu ⇒ đưa vào 4.3 (danh sách op tối thiểu).

Đây là cổng chống "đầu tư mù": không viết few-shot / thêm op trước khi biết cái gì thật sự cần.

### 4.2. Few-shot dựng hình cho translator (đòn bẩy chính)
Thêm 3–4 ví dụ đầy đủ vào `api/_lib/kernel-bridge/translatorPrompt.js`, mỗi ví dụ là một
**pattern dựng** phổ biến, kèm assert:
- mp ∥ (P) với hệ số tự do = tham số, giải bằng ràng buộc metric (MN, khoảng cách…).
- đường thẳng qua điểm, dùng `oxyz_foot` để ⊥ / cắt.
- điểm/khoảng cách qua `oxyz_intersect` (giao đường-mặt) + offset tham số.
- (nếu Phần 3 vào phạm vi) cầu tiếp xúc / thiết diện.
Mỗi ví dụ PHẢI có khối `asserts` kiểm lại ràng buộc đề tại nghiệm.

### 4.3. Vài op tiện lợi (CHỈ nếu 4.1 cho thấy cần)
Danh sách chờ, chỉ thêm cái cổng kiểm chứng chứng minh là thiếu. Ứng viên:
- `oxyz_plane` thêm form `parallel` (∥ mặt phẳng cho trước, offset là số hoặc tham số).
- `oxyz_line` thêm form `meet_two` (qua 1 điểm, cắt 2 đường cho trước — giải tham số nội bộ).
- mặt cầu: query `section_radius` (bán kính đường tròn = mp ∩ cầu), `tangent_length` (độ dài tiếp tuyến từ điểm ngoài).
Mỗi op mới: schema (zod) + hàm dựng + assert tự nhiên + test đơn vị. Op cao cấp vừa thêm phủ vừa
**giảm số bước LLM phải ghép** (1 op thay cho 5) ⇒ tăng độ tin của bước dịch.

### 4.4. Bắt buộc assert cho bài dựng (giữ chống ảo giác)
Prompt yêu cầu: bài dựng phải phát `asserts` kiểm lại điều kiện đề tại nghiệm (vd `dist(M,N)=√3`,
`perp(u, dir_d)`). Route giữ nguyên gate: có violation ⇒ `ok=false` ⇒ rơi về. Đây là hàng rào tránh
bẫy "Câu 2 gấp giấy" (0 assert = tin mù LLM).

### 4.5. (Tuỳ chọn) Route model mạnh hơn cho bài dựng
Nếu 4.2 chưa đủ ổn định với flash-low: khi phát hiện đề "dựng hình" (heuristic từ khoá:
"mặt phẳng… song song/vuông góc", "đường thẳng… cắt/tiếp xúc"), dịch bằng model khá hơn qua
`VILAO_TRANSLATOR_MODEL` (cơ chế override đã có). Cân nhắc chi phí; để sau 4.2 nếu cần.

## 5. Luồng dữ liệu (không đổi khung hiện tại)

đề → translator (prompt có few-shot dựng hình) → plan JSON (ops dựng + asserts + analyze) →
`runAny`/`run` (dựng entities, giải tham số nếu có, kiểm asserts tại nghiệm) →
nếu `ok && geometry.points>0 && 0 violation` ⇒ serve figure + đáp; ngược lại ⇒ rơi về luồng LLM cũ.

## 6. Kiểm thử

- **Đơn vị:** mỗi op mới (nếu có ở 4.3) có test riêng trong `api/_lib/kernel/__tests__/`.
- **Tích phân (hand-plan):** 3 bài của cổng kiểm chứng thành test cố định (plan tay → đáp đúng).
- **End-to-end (LLM thật):** đo lại **mẫu Phần 1** (≥6 bài, đọc từ ảnh PDF) qua translator → đếm
  phục vụ/đúng/rơi về. Chạy nhiều lần để đo độ ổn định (như đã làm cho Câu 5).
- **Chống hồi quy:** toàn bộ suite hiện tại (417 test) phải xanh; 10 bài benchmark cũ không đổi kết quả.

## 7. Tiêu chí thành công

- Mẫu **Phần 1: 0/3 → ≥50% phục vụ**, mỗi câu phục vụ kèm assert kiểm (không serve mù).
- Không hồi quy: 417 test xanh, 10 benchmark giữ nguyên, tỉ lệ abstain đúng-chỗ (đếm/quỹ tích) không giảm.
- Không có ca **phục vụ SAI mới** (đáp sai mà vẫn serve) trên mẫu đo.

## 8. Rủi ro & giảm thiểu

- **R1: flash-low vẫn không mô hình nổi dù có few-shot.** ⇒ 4.5 (model mạnh hơn cho bài dựng),
  hoặc chấp nhận phủ thấp hơn và rơi về an toàn.
- **R2: bài dựng serve mà thiếu assert ⇒ tin mù (bẫy Câu-2).** ⇒ 4.4 bắt buộc assert; test kiểm
  rằng bài dựng không assert thì KHÔNG được tính là "phục vụ".
- **R3: thêm op làm phình schema, LLM lẫn.** ⇒ chỉ thêm op cổng-kiểm-chứng chứng minh cần; giữ tối thiểu.
- **R4: trắc nghiệm — đáp là điểm/vectơ/pt, engine ra số.** ⇒ nằm ngoài phạm vi; những câu này vẫn
  rơi về, chấp nhận (mục tiêu là "phủ đại lượng tính được", không phải chọn đáp án).

## 9. Ghi chú triển khai

- Làm trên `claude/engine-improvements`, mỗi thành phần một commit, engine tự kiểm; **hỏi trước khi gộp main** (main auto-deploy prod).
- Thứ tự: **4.1 cổng kiểm chứng → 4.2 few-shot + 4.4 assert → (đo) → 4.3 op nếu cần → 4.5 nếu cần.**
