# Hướng dẫn nhập ĐỀ THẬT vào benchmark (dành cho học sinh)

> **Mục tiêu:** biến điểm yếu lớn nhất của đề tài — *"benchmark toàn ca máy sinh, chưa có đề thi thật"* — thành điểm mạnh, bằng cách **chính tay bạn** nhập đề từ SGK/đề thi, tự giải xác minh, rồi để công cụ đối chiếu. Đây là phần **giám khảo trọng nhất** và **không thể để AI làm thay** (vì bạn là người bảo chứng đáp và giải thích khi bị vặn).

Toàn bộ quy trình dùng công cụ đã có sẵn: `scripts/label/label.mjs`. Bạn **không cần viết code**.

---

## 0. Nguyên tắc liêm chính (đọc trước, bắt buộc)

1. **Ghi nguồn thật:** mỗi đề phải ghi rõ nguồn ở trường `source` — ví dụ `"SGK Toán 12 Cánh Diều, tr.57, VD3"` hoặc `"Đề thi TN THPT 2023, mã 101, câu 44"`. Không chép nguyên văn cả kho đề (bản quyền) — chỉ lấy từng bài, ghi nguồn, dùng cho mục đích nghiên cứu/đánh giá.
2. **Bạn là trọng tài đáp:** đáp đúng (`expected`) là **do bạn tự giải tay** và tự tin bảo vệ được. Công cụ chỉ *đối chiếu* đáp máy với đáp của bạn — **nó không quyết định đáp nào đúng**.
3. **Chỉ nạp khi khớp:** nếu engine tính ra **khác** đáp của bạn, ca đó **KHÔNG** được nạp. Khi đó phải soát: (a) bạn giải sai? (b) đề nhập thiếu dữ kiện? (c) engine sai (→ ghi lại làm "known-gap")? Tuyệt đối không sửa đáp cho khớp máy.
4. **Ghi ai xác minh, ngày nào** (sổ tay riêng) — để trả lời "ai kiểm đáp?" tại hội đồng.

---

## 1. Hai cách nhập — chọn theo việc bạn có API key hay không

### Cách A — CÓ khoá API (dễ nhất, khuyến nghị)
Bạn chỉ cần cung cấp **đề** + **đáp bạn tự giải**. LLM sẽ tự dịch đề → *plan*, engine tính lại, rồi đối chiếu.

Soạn một file worklist (xem `bench/worklists/REAL-de-that-template.json` làm mẫu), mỗi mục:
```jsonc
{
  "text": "Cho hình chóp S.ABCD, đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a√3. Tính khoảng cách từ A đến mặt phẳng (SBD).",
  "source": "Đề thi TN THPT 2022, mã 103, câu 43",
  "difficulty": "khó",
  "kind": "distance",
  "expected": ["a√21/7"]          // ← ĐÁP BẠN TỰ GIẢI, tự tin đúng
}
```
Chạy:
```bash
VILAO_API_KEY=xxx npm run label -- --in bench/worklists/de-that-cua-toi.json --llm
```

### Cách B — KHÔNG có API key (offline)
Bạn phải tự cung cấp `plan` (mô hình toạ độ của đề). Khó hơn, nhưng **miễn phí và tất định**. Cách toạ-độ-hoá:
- Chọn gốc toạ độ ở một đỉnh thuận tiện (thường chỗ có nhiều đường vuông góc).
- Khai báo từng điểm bằng `oxyz_point` với toạ độ (dùng chuỗi cho căn: `"sqrt(3)"`, `"1/2"`).
- Nếu đề cho "cạnh a", đặt kích thước = 1 rồi thêm `"scaleSymbol":"a"` ở cấp plan → đáp ra dạng chữ (`a³√2/12`).
- Liệt kê `queries` (đại lượng cần tính).

Xem `bench/worklists/REAL-de-that-template.json` (mục có sẵn `plan`) và các ca trong `bench/golden/` làm mẫu. Chạy:
```bash
npm run label -- --in bench/worklists/de-that-cua-toi.json
```

> Mẹo: làm **vài ca Cách B trước để hiểu plan**, rồi khi có API key chuyển sang Cách A cho nhanh.

---

## 2. Đọc kết quả — 3 rổ

Sau khi chạy, công cụ in bảng và ghi `bench/golden-staging/report.md`:

| Rổ | Nghĩa | Bạn làm gì |
|---|---|---|
| ✅ **Nhận** | đáp máy == đáp bạn | đã đóng gói vào `bench/golden-staging/` — soát mắt lần cuối |
| ⚠️ **Cần soát** | đáp máy ≠ đáp bạn | **DỪNG, soát tay**: bạn sai? đề thiếu? hay engine sai? Sửa đúng chỗ, KHÔNG ép khớp |
| 🕳️ **Engine chưa giải** | abstain/lỗi/ok:false | ứng viên "known-gap" — ghi lại, có thể là dạng engine chưa hỗ trợ |

## 3. Chốt vào benchmark
Sau khi **mắt-thường soát** rổ ✅ trong `bench/golden-staging/` (mở vài file, xem `text`/`expected` có đúng đề bạn nhập không):
```bash
node scripts/label/label.mjs --promote     # chép staging → bench/golden/
npm run bench:gate                          # cả rổ phải PASS mới chốt
git add bench/golden/                        # tự tay bạn commit — quan trọng cho liêm chính
git commit -m "benchmark: +N đề thật từ <nguồn>, tự giải xác minh"
```

---

## 4. Mục tiêu số lượng & phủ dạng

- **Tối thiểu để bảo vệ được:** ≥ 50 đề thật có nguồn, tự giải; lý tưởng 100+.
- Ưu tiên phủ dạng mà đề thi hay ra: **khoảng cách điểm–mặt**, **góc (đường–mặt, nhị diện)**, **thể tích chóp/lăng trụ/tròn xoay**, **thiết diện**, **mặt cầu ngoại tiếp**.
- Trộn độ khó (`easy`/`medium`/`hard` hoặc `TB`/`khó`) để báo cáo accuracy theo mức.

## 5. Khi engine "chưa giải" (rổ 🕳️)
Không phải lỗi của bạn — đó là **ranh giới năng lực** engine (xem `nang-luc-va-ranh-gioi.md`). Ghi lại đề đó vào một danh sách "known-gap"; nó vừa là dữ liệu trung thực ("hệ từ chối an toàn thay vì bịa"), vừa là gợi ý dạng cần mở rộng engine sau này. **Đừng** vứt đi — biên giới được ghi nhận là một đóng góp khoa học.

---

## 6. Trả lời khi hội đồng hỏi

- *"Ai xác minh đáp?"* → "Em tự giải tay từng bài; công cụ chỉ đối chiếu đáp máy với đáp em, lệch thì không nạp."
- *"Nguồn đề đâu?"* → mở file golden, chỉ trường `source` ghi rõ sách/đề, trang, năm.
- *"Sao chắc đáp đúng?"* → "Hai chiều: em giải tay ra đáp, engine tất định giải độc lập ra cùng đáp — hai con đường khác nhau gặp nhau ở một kết quả."
- *"Demo được không?"* → bốc một đề mới ngay tại chỗ, chạy `npm run label`, giải thích từng bước.
