# Bộ đề vàng (Golden Problems) — 3 chương Physics Pack (dòng điện · động lực học · dao động)

**Ngày:** 2026-08-22
**Trạng thái:** Kho bài chuẩn, đáp số tính tay, dùng làm **contract test BỔ SUNG** khi thi công 3 chương physics. KHÔNG phải spec kiến trúc — chỉ là bài + plan + đáp, bê thẳng vào `*-contract.test.ts` cạnh các bài gốc.
**Phạm vi:** 18 bài MỚI — 6 mạch điện (DC01–DC06) + 6 động lực học (DL01–DL06) + 6 dao động (DD01–DD06). Kiểu SGK/đề kiểm tra VN, số liệu cho đáp "đẹp".
**Nguồn ràng buộc (đọc trước khi dùng):**
- `2026-08-21-physics-pack-v1-dc-circuit.md` — schema mạch, 10 bài gốc C1–C10 (bộ này KHÔNG lặp).
- `2026-08-21-physics-pack-v1-dynamics.md` — schema động lực, 11 bài gốc B01–B11 (KHÔNG lặp).
- `2026-08-21-physics-pack-v1-oscillation.md` — schema dao động, 10 bài gốc O1–O10 (KHÔNG lặp).
- `../reviews/2026-08-21-wave2-specs-review.md` — chuẩn đã chốt: unit per-quantity engine tự đổi, **exact-first (text engine giữ dạng hữu tỉ/căn/π; thập phân là việc bridge)**, EXACT_TRIG/EXACT_COS vòng tròn, PiScalar cho dao động, tên query `resistance(of?)`, `time_when_velocity{value,vUnit}`.

### Luật của bộ này (tự áp)

1. **Không vượt phạm vi:** mỗi bài CHỈ dùng ops/queries khai trong 3 spec trên. Ý tưởng hay nhưng vượt phạm vi → mục **Phụ lục "để dành v-sau"** (tối đa 4), KHÔNG nhét vào 18 bài.
2. **Exact-first:** cột "Đáp số kỳ vọng" ghi **text engine** (dạng exact); số thập phân trong ngoặc chỉ để đối chiếu cho người đọc, KHÔNG phải chuỗi engine (phán quyết chung §17/§18/§15 của 3 spec). Mọi bài `approximate:false` trừ chỗ ghi rõ.
3. **Tự kiểm mỗi bài** bằng đúng bất biến của chương: mạch → Kirchhoff K1/K2/K3 (+ K4 khi hỏi hiệu suất, + thay-đáp-ngược cho bài nghịch); động lực → N ≥ 0 và thay-a-ngược vào ΣF trục; dao động → hệ thức độc lập `v² + ω²x² = ω²A²` (+ bảo toàn năng lượng). Toàn bộ 18 đáp đã kiểm bằng script số học độc lập (Math.cos/PI, quét minimality cho first_time, quét crossing cho chiều).
4. **Lớp/tag:** theo taxonomy THẬT của từng spec (không theo chữ "11–12" chung của đề bài): mạch `ly/11/dong-dien/*`, động lực `ly/10/dong-luc-hoc/*`, dao động `ly/11/dao-dong/*`.

---

## A. MẠCH ĐIỆN — DC01–DC06 (schema `CircuitPlan`)

Bắt buộc có: **≥1 bài hỗn hợp lồng** (DC01), **≥1 bài đèn sáng bình thường** (DC04), **≥1 bài nghịch tìm R** (DC05, ẩn nằm trong nhánh song song → khoá quy tắc Möbius parallel, khác C10 ẩn nối tiếp).

---

### [DC01] Hỗn hợp lồng: song song của hai nhánh nối tiếp, rồi nối tiếp R5 (r ≠ 0)

- **Đề:** "Cho nguồn E = 20 V, điện trở trong r = 1 Ω. Mạch ngoài: một đoạn mạch P gồm hai nhánh mắc song song — nhánh thứ nhất là R1 = 2 Ω nối tiếp R2 = 4 Ω, nhánh thứ hai là R3 = 3 Ω nối tiếp R4 = 3 Ω — sau đó P mắc nối tiếp với R5 = 1 Ω. a) Tính điện trở tương đương mạch ngoài. b) Cường độ dòng điện qua R1. c) Hiệu điện thế giữa hai đầu đoạn mạch P. d) Công suất tỏa nhiệt trên R5."
- **Tags:** `ly/11/dong-dien/dien-tro-tuong-duong` (+ `dinh-luat-om-toan-mach`)
- **Plan phác:**
```json
{ "problemName": "hon-hop-long-ss-hai-nhanh-nt",
  "source": { "emf": 20, "r": 1 },
  "circuit": { "kind": "series", "items": [
      { "kind": "parallel", "name": "P", "items": [
          { "kind": "series", "items": [
              { "kind": "resistor", "name": "R1", "ohms": 2 },
              { "kind": "resistor", "name": "R2", "ohms": 4 } ] },
          { "kind": "series", "items": [
              { "kind": "resistor", "name": "R3", "ohms": 3 },
              { "kind": "resistor", "name": "R4", "ohms": 3 } ] } ] },
      { "kind": "resistor", "name": "R5", "ohms": 1 } ] },
  "queries": [ { "kind": "resistance", "label": "a" },
               { "kind": "current", "of": "R1", "label": "b" },
               { "kind": "voltage", "of": "P", "label": "c" },
               { "kind": "power", "of": "R5", "label": "d" } ] }
```
- **Giải tay:** Nhánh 1 = 2 + 4 = 6 Ω; nhánh 2 = 3 + 3 = 6 Ω. R_P = (6·6)/(6+6) = 36/12 = **3 Ω**. R_ngoài = R_P + R5 = 3 + 1 = **4 Ω**. I = E/(R_ngoài + r) = 20/(4+1) = **4 A** = dòng qua R5 (nối tiếp). U_P = I·R_P = 4·3 = **12 V**; hai nhánh 6 Ω đều nhận 12 V ⇒ I nhánh = 12/6 = 2 A ⇒ **I qua R1 = 2 A**. P_R5 = I²·R5 = 4²·1 = **16 W**.
  *Tự kiểm:* K1: U_P + U_R5 = 12 + 4 = 16 = E − I·r = 20 − 4 ✓. K2 tại P: 2 + 2 = 4 = I ✓; nhánh 1: U_R1 + U_R2 = 2·2 + 2·4 = 12 = U_P ✓. K3: ΣP_lá + I²r = (8+16+12+12+16) + 16 = 64 + 16 = 80 = E·I = 80 ✓ (mỗi nhánh dòng 2 A: R1 8, R2 16, R3 12, R4 12; R5 16).
- **Đáp số kỳ vọng:** a) `"4"` Ω; b) `"2"` A; c) `"12"` V; d) `"16"` W — exact hữu tỉ, `approximate:false` cả bốn.

---

### [DC02] Công suất nguồn đủ ba phần (total/internal/external) + hiệu suất

- **Đề:** "Cho nguồn E = 16 V, điện trở trong r = 2 Ω. Mạch ngoài gồm R1 = 2 Ω nối tiếp với đoạn R2 = 6 Ω song song R3 = 12 Ω. a) Tính công suất của nguồn. b) Công suất hao phí bên trong nguồn. c) Công suất tiêu thụ ở mạch ngoài. d) Hiệu suất của nguồn."
- **Tags:** `ly/11/dong-dien/hieu-suat-nguon` (+ `cong-suat-dien-nang`)
- **Plan phác:**
```json
{ "problemName": "cong-suat-nguon-ba-phan-hieu-suat",
  "source": { "emf": 16, "r": 2 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 2 },
      { "kind": "parallel", "name": "P", "items": [
          { "kind": "resistor", "name": "R2", "ohms": 6 },
          { "kind": "resistor", "name": "R3", "ohms": 12 } ] } ] },
  "queries": [ { "kind": "power_source", "part": "total", "label": "a" },
               { "kind": "power_source", "part": "internal", "label": "b" },
               { "kind": "power_source", "part": "external", "label": "c" },
               { "kind": "efficiency", "label": "d" } ] }
```
- **Giải tay:** R_P = (6·12)/(6+12) = 72/18 = 4 Ω; R_ngoài = 2 + 4 = 6 Ω. I = 16/(6+2) = 2 A. U_N = I·R_ngoài = 12 V (= E − I·r = 16 − 4 ✓). a) P_nguồn = E·I = 16·2 = **32 W**. b) P_hp = I²·r = 4·2 = **8 W**. c) P_ngoài = U_N·I = 12·2 = **24 W**. d) H = U_N/E·100 = 12/16·100 = **75 %**.
  *Tự kiểm:* bảo toàn công suất: total = internal + external ⇒ 32 = 8 + 24 ✓. K3 chi tiết: P_R1 = 2²·2 = 8; U_P = I·4 = 8 V ⇒ P_R2 = 8²/6 = 32/3, P_R3 = 8²/12 = 16/3, tổng = 16; ΣP_lá = 8 + 16 = 24 = external ✓. K4 hai đường hiệu suất: U_N/E = 12/16 = 3/4 = R_ngoài/(R_ngoài+r) = 6/8 = 3/4 ✓.
- **Đáp số kỳ vọng:** a) `"32"` W; b) `"8"` W; c) `"24"` W; d) `"75"` % — exact.

---

### [DC03] Điện năng: bếp điện + điện trở đường dây, đổi đơn vị h / Wh / kWh

- **Đề:** "Một bếp điện có điện trở R1 = 40 Ω mắc nối tiếp với điện trở đường dây R2 = 4 Ω rồi mắc vào mạng điện hiệu điện thế không đổi U = 220 V. a) Tính công suất tiêu thụ của bếp. b) Tính điện năng bếp tiêu thụ trong 2 giờ (theo Wh). c) Cũng điện năng đó theo kWh. d) Tính công của nguồn điện (điện năng toàn mạch tiêu thụ) trong 2 giờ theo kWh."
- **Tags:** `ly/11/dong-dien/cong-suat-dien-nang`
- **Plan phác:**
```json
{ "problemName": "bep-dien-day-dan-wh-kwh",
  "source": { "emf": 220 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "bep", "ohms": 40 },
      { "kind": "resistor", "name": "day", "ohms": 4 } ] },
  "queries": [ { "kind": "power", "of": "bep", "label": "a" },
               { "kind": "energy", "of": "bep", "t": 2, "tUnit": "h", "unit": "Wh", "label": "b" },
               { "kind": "energy", "of": "bep", "t": 2, "tUnit": "h", "unit": "kWh", "label": "c" },
               { "kind": "energy_source", "t": 2, "tUnit": "h", "unit": "kWh", "label": "d" } ] }
```
- **Giải tay:** ("mắc vào U không đổi" ⇒ emf = 220, r = 0.) I = 220/(40+4) = 220/44 = 5 A. a) P_bếp = I²·R1 = 25·40 = **1000 W** (U_bếp = 5·40 = 200 V; P = 200·5 = 1000 ✓). b) A_bếp = P·t, t = 2 h = 7200 s; = 1000·7200 = 7 200 000 J → ÷3600 = **2000 Wh**. c) = 7 200 000/3 600 000 = **2 kWh**. d) A_nguồn = E·I·t = 220·5·7200 = 7 920 000 J → ÷3 600 000 = 22/10 = **11/5 kWh** (≈ 2,2 kWh).
  *Tự kiểm:* U_bếp + U_dây = 200 + 20 = 220 = E ✓. K3: P_bếp + P_dây = 1000 + 25·4 = 1100 = E·I = 220·5 = 1100 ✓. Bảo toàn điện năng: A_nguồn (2200 Wh) = A_bếp (2000) + A_dây (P_dây·t = 100·2 = 200 Wh) = 2200 ✓.
- **Đáp số kỳ vọng:** a) `"1000"` W; b) `"2000"` Wh; c) `"2"` kWh; d) `"11/5"` kWh (≈ 2,2) — exact.

---

### [DC04] Đèn sáng bình thường: hai đèn giống nhau nối tiếp (verdict = sang_binh_thuong)

- **Đề:** "Hai bóng đèn giống nhau cùng loại ghi 6 V – 3 W được mắc nối tiếp rồi mắc vào nguồn E = 12 V có điện trở trong không đáng kể. Coi điện trở của đèn không đổi. a) Tính điện trở của mỗi đèn. b) Cường độ dòng điện chạy trong mạch. c) Công suất tiêu thụ của mỗi đèn. d) Các đèn có sáng bình thường không?"
- **Tags:** `ly/11/dong-dien/den-sang-binh-thuong`
- **Plan phác:**
```json
{ "problemName": "hai-den-noi-tiep-sang-binh-thuong",
  "source": { "emf": 12 },
  "circuit": { "kind": "series", "items": [
      { "kind": "lamp", "name": "den1", "ratedVolts": 6, "ratedWatts": 3 },
      { "kind": "lamp", "name": "den2", "ratedVolts": 6, "ratedWatts": 3 } ] },
  "queries": [ { "kind": "resistance", "of": "den1", "label": "a" },
               { "kind": "current", "label": "b" },
               { "kind": "power", "of": "den1", "label": "c" },
               { "kind": "lamp_check", "of": "den1", "label": "d" } ] }
```
- **Giải tay:** R_đèn = U_đm²/P_đm = 6²/3 = **12 Ω** (engine tự suy từ 6 và 3). R_ngoài = 12 + 12 = 24 Ω. I = 12/24 = **1/2 A** (0,5 A). U mỗi đèn = I·12 = 6 V ⇒ P_đèn = U·I = 6·(1/2) = **3 W** (đúng P_đm). I_đm = P_đm/U_đm = 3/6 = 1/2 A ⇒ ratio = I/I_đm = (1/2)/(1/2) = **1** ⇒ verdict `sang_binh_thuong`.
  *Tự kiểm:* K1: U_đèn1 + U_đèn2 = 6 + 6 = 12 = E ✓. K3: 3 + 3 = 6 = E·I = 12·(1/2) ✓. P_đèn = P_đm ⇔ ratio = 1 (nhất quán "sáng bình thường").
- **Đáp số kỳ vọng:** a) `"12"` Ω; b) `"1/2"` A; c) `"3"` W; d) `answers[3]` = { text `"1"`, approx 1, unit `""`, verdict `"sang_binh_thuong"` } — exact.

---

### [DC05] Bài nghịch tìm R: ẩn nằm trong nhánh SONG SONG (Möbius parallel) + thay-đáp-ngược

- **Đề:** "Cho nguồn E = 12 V, r = 1 Ω. Mạch ngoài gồm R1 = 2 Ω nối tiếp với đoạn mạch P gồm biến trở R_x mắc song song với R2 = 6 Ω. a) Phải điều chỉnh R_x bằng bao nhiêu để cường độ dòng điện trong mạch chính bằng 2 A? b) Với giá trị R_x đó, tính cường độ dòng điện qua R2. c) Tính hiệu điện thế hai đầu đoạn mạch P."
- **Tags:** `ly/11/dong-dien/bai-toan-nguoc-bien-tro`
- **Plan phác:**
```json
{ "problemName": "nghich-tim-rx-trong-nhanh-song-song",
  "source": { "emf": 12, "r": 1 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 2 },
      { "kind": "parallel", "name": "P", "items": [
          { "kind": "unknown_resistor", "name": "Rx" },
          { "kind": "resistor", "name": "R2", "ohms": 6 } ] } ] },
  "queries": [ { "kind": "solve_resistance", "of": "Rx", "targetCurrent": 2, "label": "a" },
               { "kind": "current", "of": "R2", "label": "b" },
               { "kind": "voltage", "of": "P", "label": "c" } ] }
```
- **Giải tay:** R_cần (R_ngoài) = E/I − r = 12/2 − 1 = 5 Ω. Möbius theo cấu trúc: lá ẩn Rx → (a,b,c,d) = (1,0,0,1); parallel(Rx ∥ C=6) → (C·a, C·b, a+C·c, b+C·d) = (6,0,1,6) ⇒ R_P(x) = 6x/(x+6); series(R1=2 + P) → (a+c·C, b+d·C, c, d) = (8,12,1,6) ⇒ R_ngoài(x) = (8x+12)/(x+6). Giải: x = (d·R_cần − b)/(a − c·R_cần) = (6·5 − 12)/(8 − 1·5) = 18/3 = **6 Ω**. Thay Rx = 6: R_P = (6·6)/(6+6) = 3; R_ngoài = 2 + 3 = 5; I = 12/6 = 2 A ✓. U_P = I·R_P = 2·3 = **6 V**; I_R2 = U_P/R2 = 6/6 = **1 A** (I_Rx = 1 A).
  *Tự kiểm (thay-đáp-ngược trọn vòng):* residual I − I_target = 0 exact. K1: U_R1 + U_P = 4 + 6 = 10 = E − I·r = 12 − 2 ✓. K2 tại P: I_Rx + I_R2 = 1 + 1 = 2 = I ✓. K3: 2²·2 + 1²·6 + 1²·6 + 2²·1 = 8 + 6 + 6 + 4 = 24 = E·I = 24 ✓.
- **Đáp số kỳ vọng:** a) `"6"` Ω, `approximate:false`, `checks` có dòng `solve_backsub` residual 0; b) `"1"` A; c) `"6"` V.

---

### [DC06] Hỗn hợp có điện trở kΩ (khoá đường đổi đơn vị kohm ×1000)

- **Đề:** "Cho mạch điện gồm R1 = 1 kΩ mắc nối tiếp với đoạn mạch P gồm R2 = 2 kΩ song song R3 = 2 kΩ, mắc vào hiệu điện thế không đổi U = 20 V. a) Tính điện trở tương đương mạch ngoài. b) Cường độ dòng điện trong mạch chính. c) Hiệu điện thế hai đầu đoạn P. d) Cường độ dòng điện qua R2."
- **Tags:** `ly/11/dong-dien/dien-tro-tuong-duong`
- **Plan phác:**
```json
{ "problemName": "hon-hop-kohm",
  "source": { "emf": 20 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 1, "unit": "kohm" },
      { "kind": "parallel", "name": "P", "items": [
          { "kind": "resistor", "name": "R2", "ohms": 2, "unit": "kohm" },
          { "kind": "resistor", "name": "R3", "ohms": 2, "unit": "kohm" } ] } ] },
  "queries": [ { "kind": "resistance", "label": "a" },
               { "kind": "current", "label": "b" },
               { "kind": "voltage", "of": "P", "label": "c" },
               { "kind": "current", "of": "R2", "label": "d" } ] }
```
- **Giải tay:** Engine đổi kΩ ×1000: R1 = 1000 Ω, R2 = R3 = 2000 Ω. R_P = (2000·2000)/4000 = 1000 Ω; R_ngoài = 1000 + 1000 = **2000 Ω** (engine trả đơn vị Ω). I = 20/2000 = **1/100 A** (0,01 A). U_P = I·1000 = **10 V**; I_R2 = U_P/2000 = 10/2000 = **1/200 A** (0,005 A).
  *Tự kiểm:* U_R1 + U_P = 10 + 10 = 20 = E ✓. K2: I_R2 + I_R3 = 1/200 + 1/200 = 1/100 = I ✓. K3: E·I = 20·(1/100) = 0,2 W; ΣP_lá = (1/100)²·1000 + 2·(1/200)²·2000 = 0,1 + 0,1 = 0,2 ✓.
- **Đáp số kỳ vọng:** a) `"2000"` Ω; b) `"1/100"` A (≈ 0,01); c) `"10"` V; d) `"1/200"` A (≈ 0,005) — exact.

---

## B. ĐỘNG LỰC HỌC — DL01–DL06 (schema `DynamicsPlan`, lớp 10)

Bắt buộc có: **1 mặt phẳng nghiêng có ma sát, đáp căn** (DL04, θ = 45°, chuỗi một-căn √2 xuyên suốt — subExact cùng radicand, exact tuyệt đối) + **1 hệ ròng rọc** (DL05, bàn nhẵn + treo). Gia tốc trả ĐẠI SỐ (có dấu) theo chiều chuyển động.

---

### [DL01] Ma sát ngang, kéo dọc trục: trọng lượng · phản lực · ma sát · gia tốc · vận tốc sau t

- **Đề:** "Một vật khối lượng 2 kg đặt trên sàn nằm ngang, hệ số ma sát trượt giữa vật và sàn là 0,3. Tác dụng lên vật một lực kéo 10 N theo phương ngang. Lấy g = 10 m/s². a) Tính trọng lượng của vật. b) Tính phản lực của sàn. c) Tính lực ma sát trượt. d) Tính gia tốc của vật. e) Tính vận tốc của vật sau 4 s (vật xuất phát từ nghỉ)."
- **Tags:** `ly/10/dong-luc-hoc/ma-sat-truot`
- **Plan phác:**
```json
{ "problemName": "ma-sat-ngang-keo-doc-truc", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "mass": 2, "mu": 0.3 },
           { "op": "force", "on": "vat", "value": 10 } ],
  "queries": [ { "kind": "force_value", "force": "weight", "on": "vat", "label": "a" },
               { "kind": "normal_force", "on": "vat", "label": "b" },
               { "kind": "force_value", "force": "friction", "on": "vat", "label": "c" },
               { "kind": "acceleration", "of": "vat", "label": "d" },
               { "kind": "velocity_at", "of": "vat", "t": 4, "label": "e" } ] }
```
- **Giải tay:** P = mg = 2·10 = **20 N**. Trục pháp (không lực đứng khác): N = mg = **20 N**. F_ms = μN = (3/10)·20 = **6 N** (0,3 → 3/10 exact). a = (F − F_ms)/m = (10 − 6)/2 = **2 m/s²**. Handoff v(t) = 0 + a·t ⇒ v(4) = 2·4 = **8 m/s**.
  *Tự kiểm:* v0 = 0 ⇒ `static_threshold`: driving F = 10 > μN = 6 ⇒ trượt ✓. Thay-a-ngược trục x: 10 − 6 − 2·2 = 0 exact ✓; trục pháp: N − mg = 20 − 20 = 0 ✓; N ≥ 0 ✓.
- **Đáp số kỳ vọng:** `"20 N"`; `"20 N"`; `"6 N"`; `"2 m/s²"`; `"8 m/s"` — `approximate:false`.

---

### [DL02] Hai lực ngang trên mặt nhẵn: hợp lực · gia tốc · quãng đường · thời điểm đạt vị trí

- **Đề:** "Một vật khối lượng 3 kg nằm yên trên mặt phẳng ngang nhẵn thì chịu đồng thời hai lực cùng phương ngang: lực kéo F₁ = 20 N và lực cản F₂ = 8 N ngược chiều F₁. a) Tính hợp lực tác dụng lên vật. b) Tính gia tốc. c) Tính quãng đường vật đi được sau 3 s. d) Sau bao lâu vật đi được quãng đường 8 m?"
- **Tags:** `ly/10/dong-luc-hoc/dinh-luat-ii`
- **Plan phác:**
```json
{ "problemName": "hai-luc-ngang-nhan",
  "ops": [ { "op": "body", "name": "vat", "mass": 3 },
           { "op": "force", "on": "vat", "value": 20 },
           { "op": "force", "on": "vat", "value": 8, "direction": "backward" } ],
  "queries": [ { "kind": "force_value", "force": "net", "on": "vat", "label": "a" },
               { "kind": "acceleration", "of": "vat", "label": "b" },
               { "kind": "position_at", "of": "vat", "t": 3, "label": "c" },
               { "kind": "time_when", "of": "vat", "position": 8, "label": "d" } ] }
```
- **Giải tay:** ΣF = 20 − 8 = **12 N** (hợp lực). a = 12/3 = **4 m/s²**. Quad x = {0, 0, a/2 = 2}: x(3) = 2·9 = **18 m**. time_when(8): 2t² = 8 ⇒ t² = 4 ⇒ t = **2 s** (nghiệm dương nhỏ nhất).
  *Tự kiểm:* thay-ngược: 20 − 8 − 3·4 = 0 exact ✓; v0 = 0, không μ ⇒ driving 12 > 0 ⇒ chuyển động ✓ (không cần g — mặt nhẵn, không query N). x(2) = 2·4 = 8 = position ✓.
- **Đáp số kỳ vọng:** `"12 N"`; `"4 m/s²"`; `"18 m"`; `"2 s"` — exact; plan KHÔNG có `g` vẫn chạy.

---

### [DL03] Hãm phanh do ma sát (đổi km/h): gia tốc ÂM · quãng đường dừng · thời gian dừng

- **Đề:** "Một xe khối lượng 1000 kg đang chạy với tốc độ 36 km/h trên đường ngang thì hãm phanh, bánh xe trượt trên mặt đường. Hệ số ma sát trượt giữa lốp và mặt đường là 0,5. Lấy g = 10 m/s². a) Tính gia tốc của xe. b) Tính quãng đường xe trượt đến khi dừng. c) Sau bao lâu kể từ lúc hãm thì xe dừng?"
- **Tags:** `ly/10/dong-luc-hoc/ma-sat-truot` (+ nối động học `ly/10/dong-hoc/bien-doi-deu`)
- **Plan phác:**
```json
{ "problemName": "ham-phanh-ma-sat-36kmh", "g": 10,
  "ops": [ { "op": "body", "name": "xe", "mass": 1000, "mu": 0.5, "v0": 36, "v0Unit": "km/h" } ],
  "queries": [ { "kind": "acceleration", "of": "xe", "label": "a" },
               { "kind": "distance_to_stop", "of": "xe", "label": "b" },
               { "kind": "time_when_velocity", "of": "xe", "value": 0, "label": "c" } ] }
```
- **Giải tay:** Engine đổi v0 = 36·5/18 = **10 m/s exact**. Không lực kéo, chỉ ma sát ⇒ a = −μg = −(1/2)·10 = **−5 m/s²** (đại số, ngược chiều chuyển động; khối lượng KHÔNG ảnh hưởng a của bài hãm, m chỉ là dữ kiện dressing). b) s_dừng = v0²/(2·|a|) = 100/(2·5) = **10 m**. c) t = (0 − v0)/a = (0 − 10)/(−5) = **2 s**.
  *Tự kiểm:* thay-ngược: −μmg − m·a = −0,5·1000·10 − 1000·(−5) = −5000 + 5000 = 0 exact ✓; v(2) = 10 − 5·2 = 0 ✓; x(2) = 10·2 − (5/2)·4 = 20 − 10 = 10 = s_dừng ✓; sau dừng driving = 0 ≤ μN ⇒ đứng yên vĩnh viễn, miền hợp lệ ✓.
- **Đáp số kỳ vọng:** `"-5 m/s²"` (đại số — khoá quy ước dấu); `"10 m"`; `"2 s"` — exact.

---

### [DL04] Mặt phẳng nghiêng 45° CÓ ma sát — chuỗi một-căn √2 exact xuyên suốt

- **Đề:** "Một vật khối lượng 2 kg trượt xuống một mặt phẳng nghiêng góc 45° so với phương ngang. Hệ số ma sát trượt giữa vật và mặt nghiêng là 0,25. Lấy g = 10 m/s². a) Tính phản lực của mặt nghiêng lên vật. b) Tính lực ma sát trượt. c) Tính gia tốc của vật."
- **Tags:** `ly/10/dong-luc-hoc/mat-phang-nghieng`
- **Plan phác:**
```json
{ "problemName": "nghieng-45-ma-sat-025", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "mass": 2, "on": "incline",
             "inclineDeg": 45, "mu": 0.25, "motion": "down" } ],
  "queries": [ { "kind": "normal_force", "on": "vat", "label": "a" },
               { "kind": "force_value", "force": "friction", "on": "vat", "label": "b" },
               { "kind": "acceleration", "of": "vat", "label": "c" } ] }
```
- **Giải tay:** cos45 = sin45 = (1/2)√2. a) N = mg·cos45 = 20·(1/2)√2 = **10√2 N** (≈ 14,1421). b) F_ms = μN = (1/4)·10√2 = **5√2/2 N** (≈ 3,5355). c) a = (mg·sin45 − F_ms)/m = (10√2 − 5√2/2)/2. Cùng radicand 2: 10√2 = 20√2/2 ⇒ 20√2/2 − 5√2/2 = 15√2/2; chia 2 ⇒ a = **15√2/4 m/s²** (≈ 5,3033).
  *Tự kiểm:* trượt: driving = mg·sin45 = 10√2 > μN = 5√2/2 — so EXACT cùng radicand ✓ (tan45 = 1 > 0,25). Thay-a-ngược dọc dốc: 10√2 − 5√2/2 − 2·(15√2/4) = 20√2/2 − 5√2/2 − 15√2/2 = 0 exact ✓; trục pháp: N − mg·cos45 = 0 ✓; N ≥ 0 ✓.
- **Đáp số kỳ vọng:** `"10√2 N"`; `"5√2/2 N"`; `"15√2/4 m/s²"` — `approximate:false` CẢ BA (chuỗi `subExact` cùng radicand 2, KHÔNG cần recognize — khác B09/lối 30° phải recognize; đáp số liệu khác B06 vốn m = 4, μ = 0,5).

---

### [DL05] Hệ ròng rọc: vật trên bàn NHẴN + vật treo qua ròng rọc mép bàn

- **Đề:** "Vật m₁ = 3 kg đặt trên mặt bàn nằm ngang nhẵn, nối với vật m₂ = 2 kg treo thẳng đứng bằng dây nhẹ không giãn vắt qua ròng rọc cố định ở mép bàn. Bỏ qua khối lượng ròng rọc và ma sát. Lấy g = 10 m/s². Hệ bắt đầu chuyển động từ nghỉ. a) Tính gia tốc của hệ. b) Tính lực căng dây. c) Tính tốc độ của vật sau khi mỗi vật đã đi được 1 m."
- **Tags:** `ly/10/dong-luc-hoc/he-vat-rong-roc`
- **Plan phác:**
```json
{ "problemName": "rong-roc-ban-nhan-treo", "g": 10,
  "ops": [ { "op": "body", "name": "m1", "mass": 3 },
           { "op": "body", "name": "m2", "mass": 2, "on": "hanging" },
           { "op": "string", "between": ["m1", "m2"] } ],
  "queries": [ { "kind": "acceleration", "label": "a" },
               { "kind": "force_value", "force": "tension", "on": "m2", "label": "b" },
               { "kind": "velocity_after_distance", "of": "m2", "distance": 1, "label": "c" } ] }
```
- **Giải tay:** Cấu hình {horizontal (nhẵn), hanging}. Lực phát động D = m₂g = 20 N; ngưỡng ma sát = 0 (bàn nhẵn) ⇒ hệ chuyển động, m₂ đi xuống. a = (m₂ − μm₁)g/(m₁+m₂) với μ = 0 ⇒ a = m₂g/(m₁+m₂) = 20/5 = **4 m/s²**. T = m₁m₂(1+μ)g/(m₁+m₂) = 3·2·10/5 = **12 N**. c) v = √(v0² + 2as) = √(0 + 2·4·1) = √8 = **2√2 m/s** (≈ 2,8284; sqrtExact 8 = 4·2).
  *Tự kiểm:* `tension_match`: từ m₂ (đi xuống) T = m₂(g − a) = 2·(10−4) = 12; từ m₁ T = m₁a = 3·4 = 12 — khớp exact ✓. Thay-ngược: m₂: 20 − 12 = 8 = 2·4 ✓; m₁: 12 = 3·4 ✓. T > 0 (dây căng) ✓; N₁ = m₁g = 30 ≥ 0 ✓. Kiểm động học: v² − 2as = 8 − 8 = 0 ✓. (Query tension với `on:"m1"` phải trả CÙNG 12 N.)
- **Đáp số kỳ vọng:** `"4 m/s²"`; `"12 N"`; `"2√2 m/s"` — exact; `checks` chứa `tension_match` pass.

---

### [DL06] Lực kéo tối thiểu để vật bắt đầu trượt (α = 0)

- **Đề:** "Một vật khối lượng 4 kg đặt trên sàn ngang, hệ số ma sát giữa vật và sàn là 0,5 (coi ma sát nghỉ cực đại bằng ma sát trượt). Lấy g = 10 m/s². a) Tính trọng lượng của vật. b) Tính phản lực của sàn. c) Tìm độ lớn nhỏ nhất của lực kéo theo phương ngang để vật bắt đầu trượt."
- **Tags:** `ly/10/dong-luc-hoc/ma-sat-truot`
- **Plan phác:**
```json
{ "problemName": "luc-toi-thieu-truot-4kg", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "mass": 4, "mu": 0.5 } ],
  "queries": [ { "kind": "force_value", "force": "weight", "on": "vat", "label": "a" },
               { "kind": "normal_force", "on": "vat", "label": "b" },
               { "kind": "min_force_to_move", "on": "vat", "label": "c" } ] }
```
- **Giải tay:** P = mg = **40 N**. N = mg = **40 N**. F_min = μmg/(cos0 + μ·sin0) = μmg = (1/2)·4·10 = **20 N** (α = 0 — v1 chỉ nhận góc 0, `z.literal(0)`).
  *Tự kiểm:* tại F = F_min: driving = μN = 20 đúng ngưỡng (residual 0 exact); quy ước SGK: đáp là giá trị ngưỡng. Bài KHÔNG khai op `force` (lực là ẩn của query).
- **Đáp số kỳ vọng:** `"40 N"`; `"40 N"`; `"20 N"` — exact.

---

## C. DAO ĐỘNG ĐIỀU HÒA — DD01–DD06 (schema `PhysicsPlan` + op `oscillator`, lớp 11)

`units: {length:'cm', time:'s'}` cho mọi bài trừ ghi khác. Bắt buộc có: **1 bài ω = 10π** (DD01, và DD06), **1 con lắc đơn** (DD04), **1 bài năng lượng** (DD05). Text engine giữ dạng π/căn (PiScalar) — recognize KHÔNG cứu được `căn·π`, `π²`.

---

### [DD01] Đọc phương trình ω = 10π: chu kỳ · tần số · x, v, a tại t (a đổi ra m/s²)

- **Đề:** "Một vật dao động điều hòa với phương trình x = 6cos(10πt + π/6) (cm, t tính bằng giây). a) Tính chu kỳ và tần số dao động. b) Tính li độ tại thời điểm t = 1/60 s. c) Tính vận tốc tại t = 1/60 s. d) Tính gia tốc tại t = 1/60 s (theo m/s²)."
- **Tags:** `ly/11/dao-dong/li-do-van-toc-gia-toc` (+ `doc-phuong-trinh`)
- **Plan phác:**
```json
{ "units": { "length": "cm", "time": "s" },
  "ops": [ { "op": "oscillator", "name": "vat", "A": 6,
             "omega": { "n": 10, "pi": true }, "phi": { "n": 1, "d": 6, "pi": true } } ],
  "queries": [ { "kind": "period", "of": "vat", "label": "a1" },
               { "kind": "frequency", "of": "vat", "label": "a2" },
               { "kind": "x_at", "of": "vat", "t": { "n": 1, "d": 60 }, "label": "b" },
               { "kind": "v_at", "of": "vat", "t": { "n": 1, "d": 60 }, "label": "c" },
               { "kind": "a_at", "of": "vat", "t": { "n": 1, "d": 60 }, "unit": "m/s2", "label": "d" } ] }
```
- **Giải tay:** T = 2π/ω = 2π/(10π) = **1/5 s** (0,2 s — divP bậc 1−1 = 0, π triệt tiêu). f = ω/2π = **5 Hz**. Pha(1/60) = 10π·(1/60) + π/6 = π/6 + π/6 = π/3 (addP cùng bậc, exact). Lưới: cos(π/3) = 1/2 ⇒ x = 6·(1/2) = **3 cm**. sin(π/3) = √3/2 ⇒ v = −Aω·sin = −6·10π·(√3/2) = **−30π√3 cm/s** (≈ −163,24; {s:−30√3, k:1} — exact NHỜ PiScalar, recognize không cứu dạng căn·π). a = −ω²x = −(10π)²·3 = −300π² cm/s² → m/s² (×1/100) = **−3π² m/s²** (≈ −29,61; k = 2).
  *Tự kiểm:* v² + ω²x² = (30π√3)² + (10π)²·3² = 2700π² + 900π² = 3600π² = (10π·6)² = ω²A² ✓ exact. a = −ω²x ✓. |x| = 3 ≤ A = 6 ✓.
- **Đáp số kỳ vọng:** `"1/5 s"`; `"5 Hz"`; `"3 cm"`; `"-30π√3 cm/s"` (≈ −163,2436); `"-3π² m/s²"` (≈ −29,6088) — `approximate:false` toàn bộ.

---

### [DD02] Dạng sin → cos: pha ban đầu · tốc độ cực đại · gia tốc cực đại · li độ tại t

- **Đề:** "Một vật dao động điều hòa với phương trình x = 5sin(4πt) (cm). a) Tìm pha ban đầu (khi viết phương trình dưới dạng cos). b) Tính tốc độ cực đại. c) Tính gia tốc cực đại. d) Tính li độ tại thời điểm t = 0,125 s."
- **Tags:** `ly/11/dao-dong/doc-phuong-trinh` (+ `chu-ky-tan-so`)
- **Plan phác:**
```json
{ "units": { "length": "cm", "time": "s" },
  "ops": [ { "op": "oscillator", "name": "vat", "A": 5,
             "omega": { "n": 4, "pi": true }, "phi": { "n": 0 }, "form": "sin" } ],
  "queries": [ { "kind": "initial_phase", "of": "vat", "label": "a" },
               { "kind": "vmax", "of": "vat", "label": "b" },
               { "kind": "amax", "of": "vat", "label": "c" },
               { "kind": "x_at", "of": "vat", "t": 0.125, "label": "d" } ] }
```
- **Giải tay:** form sin ⇒ engine đổi φ := φ_sin − π/2 = 0 − π/2 = **−π/2 rad** (chuẩn hóa (−π, π] giữ nguyên). vmax = Aω = 5·4π = **20π cm/s** (≈ 62,8319). amax = Aω² = 5·(4π)² = 5·16π² = **80π² cm/s²** (≈ 789,57). Pha(0,125) = 4π·(1/8) − π/2 = π/2 − π/2 = 0 ⇒ x = 5cos0 = **5 cm** (biên dương; 0,125 = 1/8 thập phân hữu hạn ⇒ exact).
  *Tự kiểm:* tại t = 0,125 vật ở biên (x = A) ⇒ v phải = 0: v = −Aω·sin(0) = 0 ✓ nhất quán; |x| = 5 = A ✓.
- **Đáp số kỳ vọng:** `"-π/2 rad"`; `"20π cm/s"`; `"80π² cm/s²"`; `"5 cm"` — exact.

---

### [DD03] Hệ thức độc lập (cho T = π/10 s): tần số góc · biên độ · tốc độ tại x · li độ tại tốc độ

- **Đề:** "Một vật dao động điều hòa với chu kỳ T = π/10 s. Khi vật ở li độ x = 6 cm thì có tốc độ 160 cm/s. a) Tính tần số góc ω. b) Tính biên độ dao động. c) Tính tốc độ của vật khi qua li độ 8 cm. d) Vật có tốc độ 120 cm/s tại li độ nào?"
- **Tags:** `ly/11/dao-dong/he-thuc-doc-lap`
- **Plan phác:**
```json
{ "units": { "length": "cm", "time": "s" },
  "ops": [ { "op": "oscillator", "name": "vat",
             "T": { "n": 1, "d": 10, "pi": true }, "fromState": { "x": 6, "v": 160 } } ],
  "queries": [ { "kind": "omega", "of": "vat", "label": "a" },
               { "kind": "amplitude", "of": "vat", "label": "b" },
               { "kind": "speed_at_x", "of": "vat", "x": 8, "label": "c" },
               { "kind": "x_at_speed", "of": "vat", "v": 120, "label": "d" } ] }
```
- **Giải tay:** ω = 2π/T = 2π/(π/10) = **20 rad/s** (π vào rồi triệt tiêu, bậc 1−1 = 0). A = √(x² + (v/ω)²) = √(6² + (160/20)²) = √(36 + 64) = √100 = **10 cm** (sqrtExact). c) |v|(x=8) = ω√(A²−x²) = 20√(100−64) = 20·6 = **120 cm/s**. d) |x|(v=120) = √(A² − (v/ω)²) = √(100 − 36) = √64 = **8 cm** (soi gương câu c — cùng cặp (6,8,10)).
  *Tự kiểm:* fromState: 6² + 160²/20² = 36 + 64 = 100 = A² exact, residual 0 ✓; câu c/d tự đối chiếu chéo (8↔120) ✓.
- **Đáp số kỳ vọng:** `"20 rad/s"`; `"10 cm"`; `"120 cm/s"`; `"8 cm"` — exact.

---

### [DD04] Con lắc đơn tại nơi g = π²: chu kỳ (π triệt tiêu → hữu tỉ) · tần số

- **Đề:** "a) Một con lắc đơn dài l₁ = 4 m dao động tại nơi có g = π² m/s². Tính chu kỳ dao động. b) Tính tần số của con lắc câu a. c) Cũng tại nơi đó, một con lắc đơn dài l₂ = 0,25 m có chu kỳ bao nhiêu?"
- **Tags:** `ly/11/dao-dong/con-lac-don`
- **Plan phác:**
```json
{ "units": { "length": "cm", "time": "s" },
  "ops": [ { "op": "oscillator", "name": "cl1", "pendulum": { "l": 4, "gAsPiSquared": true } },
           { "op": "oscillator", "name": "cl2", "pendulum": { "l": 0.25, "gAsPiSquared": true } } ],
  "queries": [ { "kind": "period", "of": "cl1", "label": "a" },
               { "kind": "frequency", "of": "cl1", "label": "b" },
               { "kind": "period", "of": "cl2", "label": "c" } ] }
```
- **Giải tay:** gAsPiSquared ⇒ g = PiScalar{s:1, k:2}. cl1: l/g = {4, k:−2} ⇒ sqrtP (k chẵn) = {2, k:−1} ⇒ T = 2π·(2·π⁻¹) = **4 s EXACT** (π triệt tiêu bằng đại số phân bậc §5.4; float ref 2π√(4/9,8696…) = 4,0000 ✓). f = 1/T = **1/4 Hz** (0,25 Hz). cl2: l/g = {1/4, k:−2} ⇒ √ = {1/2, k:−1} ⇒ T = 2π·(1/2·π⁻¹) = **1 s**.
  *Tự kiểm:* T·f = 4·(1/4) = 1 exact ✓; T₂ = 2√l₂ = 2·√0,25 = 2·0,5 = 1 ✓ (công thức rút gọn T = 2√l khi g = π²).
- **Đáp số kỳ vọng:** `"4 s"` (exact, π triệt tiêu — không rơi float); `"1/4 Hz"`; `"1 s"` — exact.

---

### [DD05] Năng lượng con lắc lò xo (qua k, không cần m, không cần ω)

- **Đề:** "Một con lắc lò xo có độ cứng k = 50 N/m dao động điều hòa với biên độ A = 6 cm. a) Tính cơ năng của con lắc. b) Tính thế năng tại li độ 3 cm. c) Tính động năng tại li độ 3 cm. d) Tại li độ nào thì động năng bằng 3 lần thế năng?"
- **Tags:** `ly/11/dao-dong/nang-luong`
- **Plan phác:**
```json
{ "units": { "length": "cm", "time": "s" },
  "ops": [ { "op": "oscillator", "name": "vat", "spring": { "k": 50 }, "A": 6 } ],
  "queries": [ { "kind": "energy_total", "of": "vat", "label": "a" },
               { "kind": "energy_potential_at", "of": "vat", "at": { "x": 3 }, "label": "b" },
               { "kind": "energy_kinetic_at", "of": "vat", "at": { "x": 3 }, "label": "c" },
               { "kind": "x_where_energy_ratio", "of": "vat", "ratio": 3, "label": "d" } ] }
```
- **Giải tay:** A = 6 cm → 3/50 m (×1/100 exact). W = ½kA² = ½·50·(3/50)² = 25·9/2500 = 225/2500 = **9/100 J** (0,09 J; rate KHÔNG cần, model.omega = null hợp lệ). x = 3 cm → 3/100 m: Wt = ½kx² = 25·(3/100)² = 25·9/10000 = **9/400 J** (0,0225 J). Wđ = W − Wt = 9/100 − 9/400 = 36/400 − 9/400 = **27/400 J** (0,0675 J; subExact). Wđ = 3Wt ⇒ |x| = A/√(1+3) = 6/2 = **3 cm** (trùng khớp câu b/c: Wđ/Wt = 0,0675/0,0225 = 3 ✓).
  *Tự kiểm:* bảo toàn: Wt + Wđ = 9/400 + 27/400 = 36/400 = 9/100 = W ✓ exact; ratio tại x = 3: (27/400)/(9/400) = 3 exact ✓.
- **Đáp số kỳ vọng:** `"9/100 J"` (0,09); `"9/400 J"` (0,0225); `"27/400 J"` (0,0675); `"3 cm"` — exact.

---

### [DD06] Thời điểm ĐẦU TIÊN qua li độ theo chiều (đường lưới, ω = 10π)

- **Đề:** "Một vật dao động điều hòa với phương trình x = 4cos(10πt − π/6) (cm). a) Chu kỳ dao động là bao nhiêu? b) Li độ của vật tại t = 1/60 s? c) Thời điểm đầu tiên vật đi qua li độ x = 2 cm? d) Thời điểm đầu tiên vật đi qua li độ x = 2 cm theo chiều dương?"
- **Tags:** `ly/11/dao-dong/thoi-diem-qua-vi-tri` (+ `chu-ky-tan-so`)
- **Plan phác:**
```json
{ "units": { "length": "cm", "time": "s" },
  "ops": [ { "op": "oscillator", "name": "vat", "A": 4,
             "omega": { "n": 10, "pi": true }, "phi": { "n": -1, "d": 6, "pi": true } } ],
  "queries": [ { "kind": "period", "of": "vat", "label": "a" },
               { "kind": "x_at", "of": "vat", "t": { "n": 1, "d": 60 }, "label": "b" },
               { "kind": "first_time_at_x", "of": "vat", "x": 2, "direction": "any", "label": "c" },
               { "kind": "first_time_at_x", "of": "vat", "x": 2, "direction": "positive", "label": "d" } ] }
```
- **Giải tay:** T = 2π/(10π) = **1/5 s** (0,2 s). Pha(1/60) = 10π/60 − π/6 = π/6 − π/6 = 0 ⇒ x = 4cos0 = **4 cm** (biên dương). first_time: c = x/A = 2/4 = 1/2 (lưới) ⇒ θ₀ = arccos(1/2) = π/3.
  - Nhánh +θ₀ (sin(pha) > 0 ⇒ v < 0, chiều âm): 10πt − π/6 = π/3 + 2kπ ⇒ 10πt = π/2 + 2kπ ⇒ t = 1/20 + k/5 ⇒ min = **1/20 s** (0,05).
  - Nhánh −θ₀ (v > 0, chiều dương): 10πt − π/6 = −π/3 + 2kπ ⇒ 10πt = −π/6 + 2kπ ⇒ t = −1/60 + k/5 ⇒ min dương (k=1) = **11/60 s** (≈ 0,1833).
  - c) any = min(1/20, 11/60) = **1/20 s**; d) positive = **11/60 s**.
  *Tự kiểm:* t = 1/20 ⇒ pha = π/3, cos = 1/2 ⇒ x = 2 ✓, sin = √3/2 > 0 ⇒ v < 0 (đúng "lần đầu qua 2 cm" là lúc đang đi xuống). t = 11/60 ⇒ pha = 10π·11/60 − π/6 = 11π/6 − π/6 = 10π/6 = 5π/3, cos(5π/3) = 1/2 ⇒ x = 2 ✓, sin(5π/3) = −√3/2 < 0 ⇒ v > 0 (chiều dương) ✓. Quét minimality (crossing x = 2): không nghiệm nào sớm hơn 1/20 (bất kỳ chiều) và 11/60 (chiều dương) ✓. Cả ba HỮU TỈ EXACT (ω bậc 1 chia triệt π).
- **Đáp số kỳ vọng:** `"1/5 s"`; `"4 cm"`; `"1/20 s"` (0,05); `"11/60 s"` (≈ 0,1833) — exact.

---

## D. Ma trận phủ query-type (18 bài mới phủ đủ mọi kind của 3 spec)

**Mạch (10 kind):**

| kind | bài |
|---|---|
| resistance | DC01a, DC04a, DC06a |
| current | DC01b, DC04b, DC05b, DC06b, DC06d |
| voltage | DC01c, DC05c, DC06c |
| power | DC01d, DC03a, DC04c |
| power_source (total/internal/external) | DC02a / DC02b / DC02c |
| energy (Wh, kWh) | DC03b, DC03c |
| energy_source | DC03d |
| efficiency | DC02d |
| lamp_check | DC04d |
| solve_resistance | DC05a |

Đơn vị phủ thêm: `kohm` (DC06), `tUnit:h` + `Wh`/`kWh` đầu ra (DC03). (Bộ gốc C1–C10 đã phủ `min`, `J`, `kJ`; `mA` của `solve_resistance` là biến thể đơn vị nhỏ — DC05 dùng `A`, đề VN chuộng "A".)

**Động lực (10 kind + 4 nhánh force_value):**

| kind | bài |
|---|---|
| acceleration | DL01d, DL02b, DL03a, DL04c, DL05a |
| force_value: weight / friction / net / tension | DL01a,DL06a / DL01c,DL04b / DL02a / DL05b |
| normal_force | DL01b, DL04a, DL06b |
| min_force_to_move | DL06c |
| velocity_at | DL01e |
| position_at | DL02c |
| time_when | DL02d |
| time_when_velocity | DL03c |
| velocity_after_distance | DL05c |
| distance_to_stop | DL03b |

Đơn vị/nhánh phủ thêm: `km/h` (DL03), đáp một-căn √2 (DL04), đáp căn qua handoff √8 = 2√2 (DL05), gia tốc âm đại số (DL03), mass/g cần vs không cần (DL02 không g).

**Dao động (17 kind):**

| kind | bài | | kind | bài |
|---|---|---|---|---|
| x_at | DD01b, DD02d, DD06b | | vmax | DD02b |
| v_at | DD01c | | amax | DD02c |
| a_at | DD01d | | speed_at_x | DD03c |
| amplitude | DD03b | | x_at_speed | DD03d |
| omega | DD03a | | energy_total | DD05a |
| period | DD01a, DD04a, DD06a | | energy_kinetic_at | DD05c |
| frequency | DD01a2, DD04b | | energy_potential_at | DD05b |
| initial_phase | DD02a | | x_where_energy_ratio | DD05d |
| first_time_at_x | DD06c, DD06d | | | |

Nhánh exact phủ: hữu tỉ (T = 1/5), một-căn (√100 = 10), π bậc 1 (20π, 30π√3), π² (80π², 3π²), π triệt tiêu (con lắc g = π² → 4 s; ω từ T = π/10 → 20), năng lượng hữu tỉ (9/100 J).

---

## E. Bảng tổng hợp 18 bài (mã — dạng — đáp số)

| Mã | Dạng | Đáp số chốt |
|---|---|---|
| DC01 | Hỗn hợp lồng (ss 2 nhánh nt) + r | 4 Ω; 2 A; 12 V; 16 W |
| DC02 | Công suất nguồn 3 phần + hiệu suất | 32 W; 8 W; 24 W; 75 % |
| DC03 | Điện năng bếp+dây (h/Wh/kWh) | 1000 W; 2000 Wh; 2 kWh; 11/5 kWh (2,2) |
| DC04 | Hai đèn 6V–3W nối tiếp, sáng bình thường | 12 Ω; 1/2 A; 3 W; ratio 1 → sang_binh_thuong |
| DC05 | Nghịch: tìm Rx trong nhánh song song | Rx = 6 Ω; 1 A; 6 V |
| DC06 | Hỗn hợp kΩ (đổi đơn vị) | 2000 Ω; 1/100 A; 10 V; 1/200 A |
| DL01 | Ma sát ngang, kéo dọc trục | 20 N; 20 N; 6 N; 2 m/s²; 8 m/s |
| DL02 | Hai lực ngang nhẵn (nhẵn, không g) | 12 N; 4 m/s²; 18 m; 2 s |
| DL03 | Hãm phanh ma sát (36 km/h) | −5 m/s²; 10 m; 2 s |
| DL04 | Nghiêng 45° có ma sát (một-căn √2) | **10√2 N**; **5√2/2 N**; **15√2/4 m/s²** |
| DL05 | Ròng rọc bàn nhẵn + treo | 4 m/s²; 12 N; **2√2 m/s** |
| DL06 | Lực tối thiểu để bắt đầu trượt (α = 0) | 40 N; 40 N; 20 N |
| DD01 | Đọc pt ω = 10π; x/v/a tại t | 1/5 s; 5 Hz; 3 cm; **−30π√3 cm/s**; **−3π² m/s²** |
| DD02 | sin → cos; cực đại; pha đầu | −π/2 rad; 20π cm/s; 80π² cm/s²; 5 cm |
| DD03 | Hệ thức độc lập (T = π/10) | 20 rad/s; 10 cm; 120 cm/s; 8 cm |
| DD04 | Con lắc đơn g = π² (π triệt tiêu) | **4 s**; 1/4 Hz; 1 s |
| DD05 | Năng lượng qua k | 9/100 J; 9/400 J; 27/400 J; 3 cm |
| DD06 | Thời điểm đầu tiên qua x theo chiều (10π) | 1/5 s; 4 cm; 1/20 s; **11/60 s** |

Toàn bộ 18 đáp đã tính tay + kiểm bằng script số học độc lập (K1–K3 mạch, N ≥ 0 + thay-a-ngược động lực, `v² + ω²x² = ω²A²` + bảo toàn năng lượng dao động, quét crossing/minimality cho first_time).

---

## F. Phụ lục "để dành v-sau" (bài hay nhưng VƯỢT phạm vi v1 — KHÔNG đưa vào 18 bài)

Bốn dạng cực phổ biến trong đề VN nhưng nằm ngoài phạm vi cả 3 spec — để v2, translator phải **abstain**:

1. **Mạch có khóa K / hai trạng thái** ("K mở I₁ = …, K đóng I₂ = …"): plan v1 chỉ mô tả MỘT trạng thái tĩnh, không có op khóa/trạng thái ⇒ NGOÀI phạm vi (dc-circuit §4, CI-1).
2. **Tìm E, r từ HAI lần đo** (hai cặp (I, U) ⇒ hệ 2 phương trình 2 ẩn): schema chỉ có một `source {emf, r}` số cho trước, không có ẩn nguồn ⇒ NGOÀI phạm vi (dc-circuit §4, CI-1).
3. **Bài ngược động lực "biết chuyển động tìm lực"** ("ô tô 54 km/h dừng sau 25 m, tính lực hãm"): cần op `observed` khai dữ kiện chuyển động quan sát ⇒ để v2 (dynamics §3.2, phán quyết §17.1).
4. **Tổng hợp hai dao động điều hòa cùng phương** / **quãng đường lớn nhất–nhỏ nhất trong Δt** / **vmax + amax → suy ω, A**: cần cộng vectơ quay hoặc mô hình ngoài công thức đóng đơn ⇒ để v2 (oscillation §13, phán quyết §14.8).

---

## G. Bài dễ sai nhất khi thi công

**#1 — DD06 câu d: `first_time_at_x(x = 2, direction = positive)` = 11/60 s.** Đây là nơi gom NHIỀU điểm dễ sai độc lập, mà đáp lại "trông vô hại" nên implement sai vẫn qua mắt kiểm thô:
- **Chọn NHÁNH sai:** chiều dương ⇔ sin(pha) < 0 ⇔ nhánh **−θ₀** (không phải +θ₀); dễ lấy nhầm nhánh +θ₀ (ra 1/20 s) và tưởng đúng vì nó cũng qua x = 2.
- **Chọn k sai / quy ước t > 0 nghiêm ngặt:** nhánh −θ₀ cho t = −1/60 + k/5; phải lấy k = 1 (t = 11/60 > 0), bỏ nghiệm âm — off-by-one là ra 41/60 hoặc âm.
- **Nhầm "any" với "positive":** engine dễ trả cùng 1/20 s cho cả c và d nếu quên lọc dấu vận tốc.
- Bù lại đáp CÓ dạng chốt exact (11/60 s) nên khi đã đúng thì test khoá cứng được; nhưng phải bật quét minimality (2048 mẫu) để chắc không có nghiệm sớm hơn.

**Á quân:**
- **DD01 câu c: `v_at` = −30π√3 cm/s.** Dạng `căn·π` mà `recognize` KHÔNG cứu (đã xác nhận trong spec dao động §2.1) — nếu tầng PiScalar (mulP giữ bậc, sinP tra EXACT_COS) có bug nhỏ, đáp âm-thầm rơi float `approximate:true` thay vì exact `"-30π√3"`. Phải khoá cả text LẪN cờ approximate.
- **DC05: nghịch tìm Rx trong nhánh SONG SONG (Möbius parallel).** Quy tắc hợp thành parallel `(C·a, C·b, a+C·c, b+C·d)` khác hẳn series; dễ áp nhầm công thức series và ra nghiệm sai mà thay-đáp-ngược lại KHÔNG bắt được nếu quên chạy K1–K3 trên mạch đã thế. Bắt buộc có dòng `solve_backsub` residual 0 + K2 tại nút P.
- **DL04: chuỗi một-căn √2 (`subExact` cùng radicand).** Nếu engine không giữ được `10√2 = 20√2/2` khi trừ `5√2/2`, đáp `a` rơi float thay vì `15√2/4`. Đây là bài chứng thực đường exact một-căn xuyên suốt — khoá `approximate:false` cả ba câu.
