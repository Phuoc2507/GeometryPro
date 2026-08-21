# Khung nhập ĐỀ THẬT — điền vào là xong

Thư mục này là **khung có sẵn** để bạn nhập đề thật (SGK/đề thi) vào benchmark. Mỗi file đã đặt sẵn `kind` và `difficulty`, bạn **chỉ cần thay 3 chỗ** trong mỗi mục:
- `text` — dán đề tiếng Việt (đầy đủ dữ kiện).
- `expected` — đáp **bạn tự giải tay** (dạng căn/π/phân số, xem ví dụ mỗi dạng bên dưới).
- `source` — nguồn thật (sách, trang, năm / mã đề, câu).

> Quy trình đầy đủ + nguyên tắc liêm chính: xem `../../../docs/nghien-cuu/huong-dan-nhap-de-that.md`.

## Các file theo dạng
| File | Dạng (`kind`) | Ví dụ đáp |
|---|---|---|
| `01-khoang-cach.json` | `distance` | `a√3/3`, `6√5/5`, `12/5` |
| `02-goc.json` | `angle` | `30°`, `45°`, `60°` |
| `03-the-tich.json` | `volume` | `a³√2/12`, `64/3`, `12π` |
| `04-mat-cau.json` | `sphere_metric` (đổi `area`/`volume` nếu cần) | `2√3`, `36π`, `4√3π` |
| `05-thiet-dien.json` | `area` | `4`, `3√3`, `√3/2` |

Mỗi file có sẵn **6 chỗ trống**. Cần thêm thì copy một mục. Xoá mục chưa dùng cũng được.

## Chạy (2 cách)
```bash
# CÓ API key (khuyến nghị — chỉ cần text+expected, LLM tự dịch đề→plan):
VILAO_API_KEY=xxx npm run label -- --in bench/worklists/de-that/01-khoang-cach.json --llm

# KHÔNG API key: phải tự thêm trường "plan" (xem huong-dan-nhap-de-that.md §1 Cách B).
```
Rồi soát rổ ✅, và chốt:
```bash
node scripts/label/label.mjs --promote
npm run bench:gate          # phải PASS
git add bench/golden/ && git commit -m "benchmark: +N đề thật <nguồn>, tự giải xác minh"
```

---

## ✅ Bảng theo dõi tiến độ (in ra, tick tay)

Mục tiêu tối thiểu để bảo vệ được: **≥ 50 đề thật**, phủ đủ dạng.

```
KHOẢNG CÁCH   [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   ___/10
GÓC           [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   ___/10
THỂ TÍCH      [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   ___/10
MẶT CẦU       [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   ___/10
THIẾT DIỆN    [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   ___/10
                                        TỔNG    ___/50
```
Mỗi đề nhớ ghi vào sổ: **nguồn · đáp tự giải · ngày · người xác minh** (để trả lời hội đồng "ai kiểm đáp?").

---

## Ví dụ mẫu đã giải cho từng dạng (để đối chiếu cách viết `expected`)

**1. Khoảng cách.** *"Chóp S.ABC, SA ⊥ đáy, SA = 6; ABC vuông tại B, AB = 3, BC = 4. Tính d(A, (SBC))."*
→ Đặt B(0;0;0), A(3;0;0), C(0;4;0), S(3;0;6). Mặt (SBC): `-2x + z = 0`. `d = |−6|/√5 = 6√5/5`. → `expected: ["6√5/5"]`

**2. Góc.** *"Cho a có VTCP (1;0;0), b có VTCP (1;1;0). Tính góc giữa a và b."*
→ `cos = |1|/(1·√2) = 1/√2` → `45°`. → `expected: ["45°"]`

**3. Thể tích.** *"Tứ diện đều ABCD cạnh a. Tính thể tích."*
→ `V = a³/(6√2) = a³√2/12`. Đề cho cạnh chữ `a` ⇒ nếu tự viết plan, toạ-độ-hoá cạnh = 1 và thêm `"scaleSymbol":"a"`. → `expected: ["a³√2/12"]`

**4. Mặt cầu ngoại tiếp.** *"Tứ diện OABC, O(0;0;0), A(2;0;0), B(0;2;0), C(0;0;2). Tính bán kính mặt cầu ngoại tiếp."*
→ Tâm (1;1;1), `R = √3`. → `kind:"sphere_metric"`, `expected: ["√3"]`. (Hỏi diện tích → `kind:"area"`, đáp `12π`.)

**5. Thiết diện.** *"Chóp S.ABCD đáy vuông cạnh 4, SA ⊥ đáy, SA = 4. (P) // đáy qua trung điểm SA cắt các cạnh bên tại M,N,P,Q. Tính diện tích MNPQ."*
→ Thiết diện đồng dạng đáy tỉ số 1/2 ⇒ hình vuông cạnh 2, `S = 4`. → `expected: ["4"]`

*(4 ví dụ này đều đã có trong benchmark — xem `docs/nghien-cuu/vi-du-kiem-hai-chieu.md` để thấy lời giải tay ↔ engine.)*

---

## Quy ước viết đáp (để engine so khớp)
- Căn: `√2`, `2√3/3`, `a√6/3`. π: `12π`, `8√2π/3`. Phân số: `64/3`, `12/5`. Góc: `60°`.
- Nhiều đáp trong một bài: `["√3", "12π"]`.
- Kích thước bằng chữ `a`: đáp dạng `a³√2/12`, `a√3/3` (chỉ khi bạn tự viết plan có `scaleSymbol`; nếu dùng `--llm` thì đề số cụ thể dễ hơn).
