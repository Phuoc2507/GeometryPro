# Cẩm nang soạn bài VSGeo-Bench (dành cho Em 1)

> Mục tiêu: mỗi bài em soạn ra vừa **đúng toán học**, vừa **hợp schema** (máy soi `validate.ts` báo xanh), vừa **an toàn bản quyền** (§3.2, §12 của `docs/design.md`). Tài liệu này là quy trình cầm-tay-chỉ-việc + biểu mẫu + tiêu chí nghiệm thu.

## 0. Toàn cảnh: một bài đi qua 6 bước

1. **Chọn nguồn** (đề THPT QG / đề thi thử / SGK / tự sinh).
2. **Chuẩn hoá lời văn** (viết lại bằng lời của mình, KHÔNG chép nguyên văn) + ghi nguồn.
3. **Dán tag** (topic, answer_form, difficulty, requires_auxiliary_construction).
4. **Tính đáp án** và viết ở dạng `canonical` đúng chuẩn để máy chấm hiểu.
5. **Đáp án chuẩn kép** (§3.5): tự tính một lần, đối chiếu lần hai (engine hoặc cách khác); lệch → cờ đỏ.
6. **Chạy máy soi** `validate.ts`; xanh thì lưu, đỏ thì sửa.

## 1. Chọn nguồn (§3.2)

- **Lõi (~60%):** đề THPT QG, đề thi thử tỉnh/trường, SGK/SBT. Đây là bài "thật", giúp benchmark có giá trị thực tế.
- **Mở rộng (~40%):** bài **tự sinh** (thay số, đổi cấu hình) mà em tự bảo chứng đáp án. An toàn bản quyền, dễ công bố, kiểm soát được độ khó.
- Ghi vào `source.type`: `"exam"` (đề thi) · `"textbook"` (SGK/SBT) · `"synthetic"` (tự sinh).
- `source.ref`: ghi **đủ để truy vết**, ví dụ `"THPTQG 2019 - mã 101 - câu 43"` hoặc `"SGK Hình học 12 - trang 25 - bài 3"` hoặc `"tự sinh từ vsgeo-0007 (thay a=2)"`.

## 2. Chuẩn hoá lời văn (chống bản quyền + chống nhiễm dữ liệu)

**Nguyên tắc vàng: KHÔNG chép nguyên văn.** Đọc đề gốc, hiểu, rồi **viết lại bằng lời của em**. Vừa tránh rắc rối bản quyền (§12), vừa giảm rủi ro "model đã học thuộc đề gốc" (data contamination).

Checklist chuẩn hoá:
- [ ] Đổi cách diễn đạt câu chữ (không giữ nguyên mệnh đề).
- [ ] Giữ nguyên **bản chất toán học** (các giả thiết, số liệu quan trọng không đổi).
- [ ] Thống nhất ký hiệu: cạnh `a`, `AB`, mặt phẳng `(SBD)`, viết dấu nhân là `·` hoặc bỏ.
- [ ] Bỏ phần "Chọn đáp án A/B/C/D" nếu chuyển bài trắc nghiệm thành bài hỏi trực tiếp (khuyến khích, để đo đáp án mở).
- [ ] Ghi `source.ref` trỏ về đề gốc.

## 3. Dán tag (§3.4)

| Trường | Ý nghĩa | Giá trị hợp lệ |
|--------|---------|----------------|
| `tags.topic` | Chủ đề (nhiều nhãn) | mảng chuỗi, ví dụ `["the_tich"]`, `["khoang_cach","vuong_goc"]` |
| `tags.answer_form` | Dạng đáp án | đúng một `AnswerType` (xem §4) |
| `tags.difficulty` | Độ khó | `1` (nhận biết) → `4` (vận dụng cao) |
| `tags.requires_auxiliary_construction` | Có phải dựng hình phụ? | `true`/`false` |

**Bảng nhãn chủ đề chuẩn (dùng đúng các slug này để thống kê gộp được):**

| Slug | Chủ đề |
|------|--------|
| `the_tich` | Thể tích & khối đa diện |
| `song_song` | Quan hệ song song |
| `vuong_goc` | Quan hệ vuông góc |
| `khoang_cach` | Khoảng cách (điểm–mặt, đường–đường chéo) |
| `goc` | Góc (đường–mặt, mặt–mặt) |
| `mat_cau_non_tru` | Mặt cầu / nón / trụ |
| `toa_do_oxyz` | Phương pháp toạ độ Oxyz |

> Nếu cần một chủ đề mới, thêm vào bảng này **trước** rồi mới dùng — để cả nhóm dùng chung một bộ slug, tránh chỗ ghi `khoang_cach` chỗ ghi `khoangcach`.

**Cách quyết `requires_auxiliary_construction`:** hỏi "để giải, có bắt buộc **vẽ thêm** một đường/điểm/mặt phụ không có sẵn trong đề không?" (ví dụ kẻ chân đường cao, dựng hình chiếu). Nếu có ⇒ `true`. Đây là **biến then chốt** của giả thuyết H1, nên dán cẩn thận.

**Thang độ khó gợi ý:**
- `1` — áp thẳng một công thức (thể tích khối cơ bản).
- `2` — hai bước, không cần dựng hình phụ.
- `3` — cần dựng hình phụ hoặc phối hợp 2–3 định lý.
- `4` — vận dụng cao, nhiều bước, dễ sai.

## 4. Viết `answer.canonical` đúng chuẩn (để máy chấm hiểu)

Máy chấm (kế hoạch 02) sẽ so đáp án của model với `answer.canonical`. Vì vậy em phải viết `canonical` theo **đúng quy ước** cho từng `AnswerType`:

| `type` | Ý nghĩa | Ví dụ `canonical` | Ghi chú |
|--------|---------|-------------------|---------|
| `rational` | Số hữu tỉ | `3/2` · `4` · `-5/6` | phân số tối giản, hoặc số nguyên |
| `surd` | Biểu thức căn | `a*sqrt(6)/3` · `2*sqrt(3)` · `sqrt(2)/2` | dùng `sqrt(...)`, nhân là `*`, cạnh ký hiệu là `a` |
| `ratio` | Tỉ số | `1:2` · `2/3` | ghi rõ thứ tự tỉ số |
| `point` | Toạ độ điểm | `(1,2,3)` · `(0,-1,2)` | trong ngoặc, cách nhau bởi dấu phẩy |
| `vector` | Vector | `(1,-2,2)` | như điểm; hướng có thể chuẩn hoá ở máy chấm |
| `plane_eq` | Phương trình mặt phẳng | `x+2y-2z+3=0` | thu gọn hệ số nguyên, vế phải `=0` |
| `line_eq` | Phương trình đường thẳng | `(x-1)/2=(y+1)/1=z/3` | dạng chính tắc |
| `boolean` | Đúng/sai | `true` · `false` | chữ thường |
| `mcq` | Trắc nghiệm | `A` · `B` · `C` · `D` | một chữ in hoa |

**Quy ước gõ (quan trọng — máy chấm dựa vào):**
- Căn bậc hai: viết `sqrt(6)`, KHÔNG viết `√6` trong `canonical` (ký hiệu `√` để dành cho phần hiển thị của engine).
- Nhân: `*`. Chia: `/`. Ví dụ "a nhân căn 6 chia 3" → `a*sqrt(6)/3`.
- Cạnh ký hiệu chữ: dùng `a`. Nếu đáp án co giãn theo `a`, khai thêm `scale_degree` (xem §6).

## 5. Đáp án chuẩn kép (§3.5) — "hai người gác một cửa"

Đây là điểm nhấn độ chặt của cả đề tài. Với **mỗi** bài:

1. **Nguồn 1 — em tự tính:** giải bài, ra đáp án, viết `canonical`.
2. **Nguồn 2 — đối chiếu độc lập:** tính lại bằng **một cách khác** để không lặp lại đúng sai lầm cũ. Chọn một trong:
   - Toạ độ hoá và bấm máy tính khoa học ra số thập phân, so với `canonical` (ví dụ `a*sqrt(3)/3` với `a=1` ≈ `0.5774`).
   - Sau khi **kế hoạch 02 (máy chấm/oracle)** xong, dùng engine ký hiệu để tự giải/đối chiếu và đặt `verified_by_engine: true`.
3. **Nếu hai nguồn khớp** ⇒ yên tâm, ghi `verified_by_engine: true` nếu đã dùng engine (chưa dùng thì để `false` hoặc bỏ trống).
4. **Nếu lệch nhau** ⇒ **CỜ ĐỎ**: dừng lại, tìm bài giải tay cẩn thận, ghi lại vào một dòng trong sổ nhật ký nghiên cứu (logbook) "bài X từng lệch, nguyên nhân Y, đã sửa". Chính những dòng cờ đỏ này là bằng chứng quy trình khoa học khi phản biện.

> **Ranh giới sở hữu (§4.4):** engine ký hiệu là **công cụ có sẵn** (công trình trước của nhóm) — ghi nguồn minh bạch, KHÔNG nhận là em phát minh. Phần em bảo vệ: *logic tương đương đáp án*, quy trình đối chiếu kép, và toàn bộ dữ liệu.

## 6. `scale_degree` — bậc co giãn theo cạnh (phục vụ biến đổi rescale ở kế hoạch 05)

Nếu đáp án phụ thuộc cạnh `a`, ghi `scale_degree` = số mũ của `a` trong đáp án:
- Đáp án là **độ dài / khoảng cách** (tỉ lệ với `a^1`) ⇒ `scale_degree: 1`. Ví dụ `a*sqrt(3)/3`.
- Đáp án là **diện tích** (`a^2`) ⇒ `scale_degree: 2`.
- Đáp án là **thể tích** (`a^3`) ⇒ `scale_degree: 3`.
- Đáp án là **số thuần / tỉ số / góc** (không đổi khi phóng to hình) ⇒ `scale_degree: 0` (hoặc bỏ trống).

Vì sao cần? Biến đổi "đổi tỉ lệ cạnh" (§5) sẽ nhân đáp án theo luỹ thừa này (ví dụ `a → 2a` thì thể tích ×`2^3 = 8`). Có `scale_degree`, máy tự tính đáp án biến thể mà không cần em soạn tay lại.

## 7. Checklist nghiệm thu MỘT bài (tự kiểm trước khi lưu)

- [ ] `id` đúng dạng `vsgeo-XXXX`, và **tên file** đúng bằng `<id>.json`.
- [ ] `source.type` ∈ {exam, textbook, synthetic}; `source.ref` đủ để truy vết nguồn.
- [ ] `statement_vi` là lời **đã chuẩn hoá** (không chép nguyên văn), đọc là hiểu, đủ dữ kiện để giải.
- [ ] `answer.type` khớp `tags.answer_form` (hai chỗ này nên giống nhau).
- [ ] `answer.canonical` viết đúng quy ước §4 (dùng `sqrt`, `*`, `/`, không dùng `√`).
- [ ] `answer.human_note` mô tả ngắn "đáp án là đại lượng gì" (giúp người soát tay).
- [ ] Tag đủ: `topic` ≥ 1 nhãn (dùng slug chuẩn §3), `difficulty` ∈ 1..4, `requires_auxiliary_construction` đã cân nhắc.
- [ ] Nếu đề cho toạ độ: `figure.coords_given = true` và liệt kê `figure.points`.
- [ ] Đã đối chiếu đáp án kép (§5); nếu lệch, đã xử lý cờ đỏ và ghi logbook.
- [ ] `scale_degree` đã đặt nếu đáp án phụ thuộc `a`.
- [ ] Chạy `npx tsx research/vsgeo-bench/data/schema/validate.ts` → bài này báo xanh.

## 8. Mục tiêu số lượng theo mốc (§11.2)

- **Hết T1:** ≥ **50 bài** pilot, tất cả validate sạch, phủ đủ các chủ đề chính.
- **Hết T2:** ~**300 bài**, phân bố hợp lý theo chủ đề × độ khó × dạng đáp án × cờ hình phụ.

> **Ghi chú phạm vi:** con số ~**300 bài** là mục tiêu **MỞ RỘNG** (sau vòng trường, hướng tới vòng thành phố). Bản **LÕI cho vòng trường (3 tháng)** chỉ cần **~120–150 bài** validate sạch, phân bố hợp lý là đủ nộp.

Gợi ý cân đối để dữ liệu "đẹp" cho phân tích: đừng dồn hết vào một chủ đề hay một mức khó; cố gắng mỗi chủ đề có bài ở nhiều mức khó, và có cả bài `requires_auxiliary_construction` true lẫn false (để kiểm định H1).

> **Ghi nhớ:** 3 bài `vsgeo-0001..0003` là mẫu anh/chị soạn để em bắt chước. **Từ `vsgeo-0004` trở đi là của em** — đó là phần em đứng tên và bảo vệ.
