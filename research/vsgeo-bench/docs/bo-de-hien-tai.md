# Bộ đề VSGeo-Bench — bản đọc

> Danh mục toàn bộ **32 bài** trong `data/seeds/`, cập nhật 2026-08-01.
> File này chỉ để **đọc**; dữ liệu thật nằm ở các file `data/seeds/vsgeo-XXXX.json`.

## Nguồn gốc & nguyên tắc

- **31 bài trích từ đề thi chính thức** (Bộ GD&ĐT: THPTQG 2019, Tốt nghiệp THPT 2023–2026) + **1 bài SGK Hình học 12**. Không có bài nào do AI tự bịa.
- Mỗi bài **đối chiếu đáp án chính thức** trong file PDF gốc. Các bài khó (bậc 3–4) còn được **giải mù độc lập 2 lần** rồi so khớp 100%.
- **Đáp án lưu GIÁ TRỊ toán học**, không lưu chữ cái A/B/C/D — vì 24 mã đề chỉ hoán vị vị trí đáp án, lưu chữ cái sẽ sai khi đổi mã.
- Lời văn "đã chuẩn hoá" = viết lại cho gọn (bỏ 4 phương án trắc nghiệm, giữ nguyên số liệu + yêu cầu). Nguồn ghi rõ năm + mã đề + số câu để truy ngược.
- **Ký hiệu đáp án:** `sqrt(x)` = √x · `pi` = π · `^` = luỹ thừa · `a` = cạnh tham số · điểm/vectơ viết `(x,y,z)` · mặt phẳng `ax+by+cz+d=0`.

## Thống kê

| Chiều | Phân bố |
|---|---|
| **Tổng** | 32 bài (31 đề thi + 1 SGK) |
| **Độ khó** | d1: 11 · d2: 7 · d3: 8 · d4: 6 — (bậc khó d3–4 = **44%**) |
| **Chủ đề** | thể tích 11 · toạ độ Oxyz 10 · nón/trụ/cầu 9 · khoảng cách 7 · vuông góc 5 · góc 3 · song song 1 |
| **Dạng đáp án** | số vô tỉ (surd) 13 · hữu tỉ 10 · vectơ 2 · pt mặt phẳng 2 · tỉ số 1 · điểm 1 · pt đường thẳng 1 · trắc nghiệm 1 · Đúng/Sai 1 |

---

# BẬC DỄ (d1–d2) — 19 bài

Các bài áp công thức trực tiếp, 1–2 bước. Đây là tầng vừa được thay mới: 17 bài đề thật (0003–0019) thế chỗ 26 bài tổng hợp cũ.

## Thể tích khối đa diện

**vsgeo-0002** · *SGK Hình học 12 (biến thể thay số)* · d1
> Chóp S.ABCD đáy hình vuông cạnh 2, SA⊥đáy, SA=3. Tính thể tích khối chóp S.ABCD.
> **Đáp án:** `4`

**vsgeo-0003** · *TN THPT 2025 — mã 0101 — phần I câu 12* · d2 · [thể tích, vuông góc]
> Chóp S.ABC có SA⊥(ABC); tam giác ABC vuông tại A với AB=4, AC=5 và SA=3. Tính thể tích khối chóp S.ABC.
> **Đáp án:** `10`  *(S_đáy = ½·4·5 = 10; V = ⅓·10·3 = 10)*

**vsgeo-0004** · *TN THPT 2024 — mã 101 — câu 8* · d1
> Khối lăng trụ tam giác có diện tích đáy B=6, chiều cao h=3. Tính thể tích.
> **Đáp án:** `18`  *(V = B·h)*

**vsgeo-0005** · *TN THPT 2023 — mã 101 — câu 16* · d1
> Khối chóp S.ABCD chiều cao 4, diện tích đáy 3. Tính thể tích.
> **Đáp án:** `4`  *(V = ⅓·B·h)*

**vsgeo-0006** · *TN THPT 2024 — mã 101 — câu 26* · d2 · *(có tham số chữ)*
> Khối chóp tứ giác có thể tích V=3a³, diện tích đáy B=a². Tính chiều cao theo a.
> **Đáp án:** `9*a`  *(h = 3V/B = 9a³/a² = 9a)*

**vsgeo-0007** · *TN THPT 2023 — mã 101 — câu 9* · d2
> Lăng trụ ABC.A′B′C′ thể tích V. Tính thể tích khối chóp A′.ABC theo V.
> **Đáp án:** `V/3`  *(chóp bằng ⅓ lăng trụ)*

## Nón — trụ — cầu

**vsgeo-0008** · *TN THPT 2024 — mã 101 — câu 4* · d2
> Hình trụ có diện tích xung quanh Sₓq=36π, chiều cao h=6. Tính bán kính đáy.
> **Đáp án:** `3`  *(Sₓq = 2πrh)*

**vsgeo-0009** · *TN THPT 2024 — mã 101 — câu 22* · d1
> Hình nón bán kính đáy r=3, đường sinh l=5. Tính chiều cao.
> **Đáp án:** `4`  *(h = √(l²−r²))*

**vsgeo-0010** · *TN THPT 2023 — mã 101 — câu 13* · d1
> Hình trụ chiều cao h=3, bán kính đáy r=4. Tính diện tích xung quanh.
> **Đáp án:** `24*pi`  *(Sₓq = 2πrh)*

**vsgeo-0011** · *TN THPT 2023 — mã 101 — câu 14* · d1
> Khối nón thể tích 12, diện tích đáy 9. Tính chiều cao.
> **Đáp án:** `4`  *(h = 3V/B)*

## Toạ độ Oxyz

**vsgeo-0012** · *TN THPT 2026 — mã 0101 — phần I câu 5* · d1
> Cho A(1;5;1), B(3;3;1). Tìm toạ độ vectơ AB.
> **Đáp án:** `(2,-2,0)`

**vsgeo-0013** · *TN THPT 2025 — mã 0101 — phần I câu 4* · d1
> Đường thẳng d: (x−3)/4 = (y+2)/(−5) = (z−1)/2. Tìm một vectơ chỉ phương.
> **Đáp án:** `(4,-5,2)`  *(mọi bội khác 0 đều chấp nhận)*

**vsgeo-0014** · *TN THPT 2024 — mã 101 — câu 17* · d1 · [toạ độ, mặt cầu]
> Cho A(1;−2;3), B(3;0;1). (S) là mặt cầu nhận AB làm đường kính. Tìm tâm (S).
> **Đáp án:** `(2,-1,2)`  *(tâm = trung điểm AB)*

**vsgeo-0015** · *TN THPT 2024 — mã 101 — câu 34* · d2
> Cho A(1;2;3), B(3;2;5), M thoả vectơ MB = 3·vectơ MA. Tính độ dài OM.
> **Đáp án:** `2*sqrt(2)`  *(M = (3A−B)/2 = (0,2,2))*

**vsgeo-0016** · *TN THPT 2025 — mã 0101 — phần I câu 9* · d1
> Viết phương trình mặt phẳng qua A(2;1;−4), nhận n=(3;2;−1) làm vectơ pháp tuyến.
> **Đáp án:** `3x+2y-z-12=0`

**vsgeo-0017** · *TN THPT 2024 — mã 101 — câu 25* · d1
> Viết phương trình mặt phẳng qua M(3;4;−2), vuông góc trục Oz.
> **Đáp án:** `z+2=0`  *(VTPT = (0,0,1))*

**vsgeo-0018** · *TN THPT 2024 — mã 101 — câu 30* · d2
> Cho A(1;2;−1), mặt phẳng (P): 2x−z+1=0. Viết phương trình tham số đường thẳng qua A, ⊥(P).
> **Đáp án:** `x=1+2t, y=2, z=-1-t`  *(VTCP = VTPT của (P) = (2,0,−1))*

## Song song

**vsgeo-0019** · *TN THPT 2025 — mã 0101 — phần I câu 2* · d2
> Hình hộp ABCD.A′B′C′D′. Trong các mặt (CC′A′A), (BB′C′C), (A′B′C′D′), (AA′D′D), đường thẳng AB song song với mặt nào?
> **Đáp án:** `(A'B'C'D')`  *(AB thuộc đáy dưới, song song đáy trên)*

---

# BẬC KHÓ (d3–d4) — 13 bài

Các bài nhiều bước, cần dựng hình phụ hoặc quy về toạ độ. Mỗi bài đã **giải mù độc lập 2 lần** + khớp đáp án chính thức.

## Khoảng cách & vuông góc

**vsgeo-0001** · *THPTQG 2019 — mã 101 — câu 43* · d3 · [khoảng cách, vuông góc]
> Chóp S.ABCD đáy hình vuông cạnh a, SA⊥đáy, SA=a. Tính khoảng cách từ A đến mặt phẳng (SBD).
> **Đáp án:** `a*sqrt(3)/3`

**vsgeo-0029** · *TN THPT 2024 — mã 101 — câu 29* · d3 · [khoảng cách, vuông góc]
> Chóp S.ABCD đáy hình vuông cạnh a, SA⊥đáy, SA=a√2. Tính khoảng cách từ C đến (SBD).
> **Đáp án:** `a*sqrt(10)/5`  *(bằng khoảng cách từ A do đối xứng qua BD)*

**vsgeo-0034** · *TN THPT 2023 — mã 101 — câu 34* · d3 · [khoảng cách, toạ độ]
> Hình hộp chữ nhật ABCD.A′B′C′D′ có AB=1, BC=2, AA′=2. Tính khoảng cách giữa hai đường thẳng AD′ và DC′.
> **Đáp án:** `sqrt(6)/3`

## Góc

**vsgeo-0030** · *TN THPT 2024 — mã 101 — câu 35* · d3 · [góc, vuông góc]
> Chóp S.ABC đáy vuông cân tại A, BC=2a, SA⊥đáy, SA=a√3. Tính góc giữa (SBC) và (ABC).
> **Đáp án:** `60`  *(đơn vị: độ)*

## Thể tích (nâng cao)

**vsgeo-0031** · *TN THPT 2024 — mã 101 — câu 44* · d3 · [thể tích, góc]
> Lăng trụ đứng ABC.A′B′C′ đáy vuông cân tại A, AB=a. Góc giữa (A′BC) và (ABC) bằng 30°. Tính thể tích lăng trụ.
> **Đáp án:** `a^3*sqrt(6)/12`

**vsgeo-0035** · *TN THPT 2023 — mã 101 — câu 44* · d4 · [thể tích, góc]
> Chóp S.ABCD đáy hình bình hành, SA=SB=SC=AC=a. Đường SB tạo với (SAC) góc 30°. Tính thể tích khối chóp S.ABCD.
> **Đáp án:** `a^3*sqrt(3)/12`

## Nón — trụ — cầu (nâng cao)

**vsgeo-0032** · *TN THPT 2024 — mã 101 — câu 48* · d4 · [mặt cầu, vuông góc]
> Chóp S.ABC đáy vuông cân tại A, AB=2a. Mặt bên SAB đều và nằm trong mặt phẳng ⊥đáy. Tính diện tích mặt cầu ngoại tiếp.
> **Đáp án:** `28*pi*a^2/3`  *(R² = 7a²/3)*

**vsgeo-0036** · *TN THPT 2023 — mã 101 — câu 48* · d4 · [nón nội tiếp cầu]
> Khối nón (N) có đỉnh và đường tròn đáy cùng nằm trên mặt cầu bán kính 2. Đường sinh của (N) bằng 2√3. Tính thể tích khối nón.
> **Đáp án:** `3*pi`  *(h=3, r²=3)*

## Toạ độ Oxyz (nâng cao)

**vsgeo-0033** · *TN THPT 2024 — mã 101 — câu 49* · d4 · [toạ độ, khoảng cách]
> Cho A(1;6;−1), B(2;−4;−1), mặt cầu (S) tâm I(1;2;−1) qua A. Điểm M(a;b;c), c>0 trên (S) sao cho tam giác IAM tù, diện tích 2√7. Khi khoảng cách giữa BM và IA lớn nhất, tính a+b+c.
> **Đáp án:** `sqrt(6)`  *(M = (2;−1;−1+√6))*

---

# ĐỀ THEO ĐỊNH DẠNG MỚI (GDPT-2018)

Đề 2025–2026 có phần **trả lời ngắn** (đáp số là một **số**, làm tròn) và phần **Đúng/Sai**. Đây là ground-truth máy chấm không nhập nhằng, ít bị nhiễm dữ liệu huấn luyện.

**vsgeo-0037** · *TN THPT 2025 — mã 0101 — phần III câu 4 (trả lời ngắn)* · d3
> Chóp S.ABCD đáy hình thoi góc ABC=60°, AB=2. Hình chiếu của S trên (ABCD) là trọng tâm H của tam giác ABC, SH=√3. Tính khoảng cách giữa AC và SD.
> **Đáp án:** `3*sqrt(3)/5` ≈ 1,04  *(đề yêu cầu làm tròn phần trăm)*

**vsgeo-0038** · *TN THPT 2025 — mã 0101 — phần III câu 6 (trả lời ngắn)* · d4
> Chân đế = chóp cụt tứ giác đều hai cạnh đáy 7,4 cm và 10,4 cm, cao 1,5 cm, khoét bỏ một chỏm cầu (cắt khối cầu bán kính 5,8 cm bởi mặt phẳng có đường tròn giao bán kính 3,5 cm). Tính thể tích còn lại (cm³), làm tròn phần mười.
> **Đáp án:** `96.5`  *(so khớp theo sai số vì đề làm tròn)*

**vsgeo-0039** · *TN THPT 2026 — mã 0101 — phần III câu 1 (trả lời ngắn)* · d3
> Hình lập phương cạnh 6, E là trung điểm AB. Tính khoảng cách từ P đến mặt phẳng (MED).
> **Đáp án:** `3*sqrt(6)` ≈ 7,35  *(làm tròn phần trăm)*

**vsgeo-0040** · *TN THPT 2026 — mã 0101 — phần II câu 4 ý d (Đúng/Sai)* · d3
> Trong Oxyz (1 đơn vị = 10 m), mục tiêu ở gốc O, vành đai là đường tròn tâm O bán kính 7 trong (Oxy). Máy bay bay thẳng từ M(5;10;4) đến N(14;−2;4). Vị trí gần vành đai nhất có toạ độ (8;6;4). Đúng hay sai?
> **Đáp án:** `true` (Đúng)  *(chân vuông góc chiếu xuống (Oxy) tại (8;6), z=4)*

**vsgeo-0041** · *TN THPT 2026 — mã 0101 — phần III câu 3 (trả lời ngắn)* · d4
> Quay nửa trên elip x²/1,5² + y²/1² = 1 quanh Ox (1 đơn vị = 1 cm), rồi khoan lỗ trụ bán kính 0,2 cm dọc trục Ox. Tính thể tích phần còn lại (cm³), làm tròn phần trăm.
> **Đáp án:** `5.91`  *(giá trị chính xác 96√6·π/125 ≈ 5,9096)*
