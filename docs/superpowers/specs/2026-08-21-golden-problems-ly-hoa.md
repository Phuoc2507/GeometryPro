# Bộ đề vàng (Golden Problems) — Lý & Hóa v0 — 24 bài contract test

**Ngày:** 2026-08-21
**Trạng thái:** Chờ đối chiếu khi thi công 2 engine (physics pack v0, chem pack v0)
**Vai trò:** Kho bài chuẩn CÓ ĐÁP SỐ TÍNH TAY, bổ sung cho 10 bài P1–P10 của
`2026-08-21-physics-pack-design.md` (§10) và 11 bài của `2026-08-21-chem-pack-design.md` (§13).
Agent thi công bê thẳng từng bài vào `physics-contract.test.ts` / `runChem-contract.test.ts`
(chỉ CỘNG test — không đổi test cũ, không sửa file có sẵn).

## Quy ước chung

- **Đánh số:** Lý `L01`–`L12`, Hóa `H01`–`H12` — tách hẳn khỏi P1–P10 (Lý) và Bài 1–11 (Hóa) trong spec; KHÔNG bài nào lặp lại bài của spec.
- **Lý:** plan theo `PhysicsPlanSchema` (spec Lý §5). `g` LUÔN chép từ đề (10 hoặc 9,8 — không default). Góc luôn bằng ĐỘ. Đơn vị nhất quán mỗi plan (`units`); đề trộn đơn vị thì LLM chỉ đổi LƯỢNG NHỎ (45 phút → 0.75 h; 54 km/h → 15 m/s khi hệ là m–s) — đúng quy ước spec Lý §5.
- **Hóa:** plan theo `ChemPlanSchema` (spec Hóa §10). CHỈ dùng phản ứng R01–R50 của DB §8.4. NTK theo bảng SGK §6. Số thập phân VN viết dạng chuỗi (`"5,4"`) để đi qua `parseDecimal`. `molarVolume`: đề nói **đktc → 22.4** (ghi tường minh), đề nói **đkc → 24.79** (default, có thể bỏ trống); mỗi đề ghi rõ chế độ.
- **Tự kiểm:** mỗi bài có bước "Thử lại" — thay đáp ngược vào phương trình chuyển động (Lý) / bảo toàn khối lượng phần phản ứng (Hóa). Test nên so `text`/`exact`, không chỉ so float.
- **Độ phủ:** mỗi query-type của cả hai schema xuất hiện ≥ 2 lần trên toàn bộ (bảng phủ cuối mỗi phần).

---

## PHẦN A — 12 BÀI VẬT LÝ (động học lớp 10)

### [L01] Xe đạp thẳng đều — phút trong bài km/h
- Đề: "Một người đi xe đạp chuyển động thẳng đều với tốc độ 12 km/h, khởi hành từ A lúc 6 giờ. a) Lúc 6 giờ 45 phút người đó cách A bao nhiêu km? b) Người đó tới B cách A 15 km lúc mấy giờ?"
- Tags: ly/10/dong-hoc/thang-deu
- Plan phác:
  ```json
  { "problemName": "xe-dap-thang-deu", "units": { "length": "km", "time": "h" },
    "ops": [ { "op": "mover1d", "name": "xe", "x0": 0, "v0": 12 } ],
    "queries": [ { "kind": "position_at", "of": "xe", "t": 0.75, "label": "a" },
                 { "kind": "time_when", "of": "xe", "position": 15, "label": "b" } ] }
  ```
- Giải tay:
  1. Đổi đơn vị (phép đổi duy nhất LLM được làm): 45 phút = 3/4 h. x(t) = 12t (km).
  2. a) x(3/4) = 12·3/4 = **9 km** (0.75 → 3/4 exact).
  3. b) 12t = 15 ⇒ t = 15/12 = **5/4 h = 1,25 h** ⇒ 6h + 1h15' = **7h15** (cộng mốc giờ là phần trình bày lời giải, engine trả 5/4 h).
  4. Thử lại: x(5/4) = 12·5/4 = 15 ✓ residual 0.
- Đáp số kỳ vọng: a) 9 km (exact 9); b) 5/4 h = 1,25 h (tới B lúc 7h15), approximate:false cả hai.

### [L02] Ô tô hãm phanh (chậm dần đều) — 54 km/h đổi ra m/s + nghiệm ma t=6
- Đề: "Một ô tô đang chạy với tốc độ 54 km/h thì hãm phanh, chuyển động thẳng chậm dần đều với gia tốc có độ lớn 3 m/s². Biết ô tô dừng hẳn sau 5 s kể từ lúc hãm. a) Tính vận tốc của ô tô sau khi hãm 3 s. b) Tính quãng đường ô tô đi được từ lúc hãm đến khi dừng. c) Kể từ lúc hãm, sau bao lâu ô tô đi được quãng đường 36 m?"
- Tags: ly/10/dong-hoc/cham-dan-deu
- Plan phác:
  ```json
  { "problemName": "oto-ham-phanh",
    "ops": [ { "op": "mover1d", "name": "oto", "x0": 0, "v0": 15, "a": -3 } ],
    "queries": [ { "kind": "velocity_at", "of": "oto", "t": 3, "component": "x", "label": "a" },
                 { "kind": "position_at", "of": "oto", "t": 5, "label": "b" },
                 { "kind": "time_when", "of": "oto", "position": 36, "label": "c" } ],
    "asserts": [ { "query": { "kind": "velocity_at", "of": "oto", "t": 5, "component": "x" }, "equals": 0 } ] }
  ```
- Giải tay:
  1. Hệ nhất quán m–s (vì a cho bằng m/s²) ⇒ LLM đổi 54 km/h = 15 m/s. x-Quad {0, 15, −3/2}; v(t) = 15 − 3t.
  2. Assert dữ kiện dư "dừng sau 5 s": v(5) = 15 − 15 = 0 ✓ (mô hình khớp đề).
  3. a) v(3) = 15 − 9 = **6 m/s**.
  4. b) x(5) = 15·5 − (3/2)·25 = 75 − 75/2 = **75/2 m = 37,5 m**.
  5. c) 15t − (3/2)t² = 36 ⇔ t² − 10t + 24 = 0 ⇒ t ∈ {4; 6}. Engine lấy nghiệm nhỏ nhất ⇒ **4 s** — đúng nghiệm vật lý; t = 6 là nghiệm "ma" (parabol mô hình quay đầu sau khi xe đã dừng ở t = 5).
  6. Thử lại: x(4) = 60 − 24 = 36 ✓.
- Đáp số kỳ vọng: a) 6 m/s; b) 75/2 m = 37,5 m; c) 4 s (loại nghiệm 6 s). Tất cả exact, approximate:false.

### [L03] Rơi tự do g = 9,8 — quãng đường giây cuối
- Đề: "Thả một vật rơi tự do (không vận tốc đầu) từ độ cao 78,4 m. Lấy g = 9,8 m/s². a) Tính thời gian rơi. b) Tính vận tốc của vật khi chạm đất. c) Tính quãng đường vật rơi được trong giây cuối cùng trước khi chạm đất."
- Tags: ly/10/dong-hoc/roi-tu-do
- Plan phác:
  ```json
  { "problemName": "roi-tu-do-78-4",
    "ops": [ { "op": "free_fall", "name": "vat", "h0": 78.4, "g": 9.8 } ],
    "queries": [ { "kind": "time_to_ground", "of": "vat", "label": "a" },
                 { "kind": "impact_velocity", "of": "vat", "label": "b" },
                 { "kind": "position_at", "of": "vat", "t": 3, "label": "c" } ] }
  ```
- Giải tay:
  1. 78,4 = 392/5; g = 9,8 = 49/5 (scalarFromNumber giữ exact). y(t) = 392/5 − (49/10)t².
  2. a) (49/10)t² = 392/5 ⇒ t² = 16 ⇒ **t = 4 s** (loại −4). Kiểm exact: Δ = 4·(49/10)·(392/5) = 38416/25, √Δ = 196/5 hữu tỉ ⇒ nghiệm exact.
  3. b) |v_y(4)| = (49/5)·4 = 196/5 = **39,2 m/s**.
  4. c) Quãng đường giây cuối = độ cao còn lại tại t = 3: y(3) = 392/5 − (49/10)·9 = 784/10 − 441/10 = 343/10 = **34,3 m**.
  5. Thử lại: y(4) = 392/5 − (49/10)·16 = 0 ✓.
- Đáp số kỳ vọng: a) 4 s; b) 196/5 m/s = 39,2 m/s; c) 343/10 m = 34,3 m. Exact hữu tỉ cả ba (bài khoá đường g=9,8 → 49/5).

### [L04] Ném thẳng đứng lên (projectile 90°)
- Đề: "Từ mặt đất, một vật được ném thẳng đứng lên trên với vận tốc đầu 30 m/s. Lấy g = 10 m/s². a) Tính độ cao cực đại vật đạt được. b) Tính thời gian từ lúc ném đến khi vật chạm đất. c) Tính độ lớn vận tốc của vật khi chạm đất."
- Tags: ly/10/dong-hoc/nem-thang-dung
- Plan phác:
  ```json
  { "problemName": "nem-thang-dung-30",
    "ops": [ { "op": "projectile", "name": "vat", "h0": 0, "v0": 30, "angleDeg": 90, "g": 10 } ],
    "queries": [ { "kind": "max_height", "of": "vat", "label": "a" },
                 { "kind": "time_to_ground", "of": "vat", "label": "b" },
                 { "kind": "impact_velocity", "of": "vat", "label": "c" } ] }
  ```
- Giải tay:
  1. cos90 = 0, sin90 = 1 (bảng EXACT_TRIG) ⇒ x-Quad {0,0,0}, y-Quad {0, 30, −5}.
  2. a) τ* = 30/10 = 3 s; H = 30·3 − 5·9 = **45 m**. Kiểm đỉnh: v_y(3) = 30 − 30 = 0 ✓.
  3. b) 30t − 5t² = 0 ⇒ t ∈ {0; 6}; loại τ = 0 (vừa rời đất, h0 = 0) ⇒ **6 s**. Thử y(6) = 180 − 180 = 0 ✓.
  4. c) v_y(6) = 30 − 60 = −30; v_x = 0 ⇒ speed = **30 m/s** (đối xứng: đúng bằng v0).
- Đáp số kỳ vọng: a) 45 m; b) 6 s; c) 30 m/s. Exact cả ba. (Bài khoá nhánh angleDeg=90: cos90 phải là 0 EXACT, không phải float 6,1e-17.)

### [L05] Ném thẳng đứng qua độ cao 15 m — hai nghiệm t, lấy lần đầu
- Đề: "Từ mặt đất, ném một vật thẳng đứng lên trên với vận tốc đầu 20 m/s. Lấy g = 10 m/s². a) Sau bao lâu kể từ lúc ném, vật qua độ cao 15 m lần đầu tiên? b) Tính độ lớn vận tốc của vật tại thời điểm đó. c) Tính độ cao cực đại."
- Tags: ly/10/dong-hoc/nem-thang-dung
- Plan phác:
  ```json
  { "problemName": "nem-thang-dung-qua-15m",
    "ops": [ { "op": "projectile", "name": "vat", "h0": 0, "v0": 20, "angleDeg": 90, "g": 10 } ],
    "queries": [ { "kind": "time_when", "of": "vat", "position": 15, "axis": "y", "label": "a" },
                 { "kind": "velocity_at", "of": "vat", "t": 1, "label": "b" },
                 { "kind": "max_height", "of": "vat", "label": "c" } ] }
  ```
- Giải tay:
  1. y-Quad {0, 20, −5}.
  2. a) 20t − 5t² = 15 ⇔ t² − 4t + 3 = 0 ⇒ t ∈ {1; 3} (một lần đi lên, một lần rơi xuống). Engine trả nghiệm nhỏ nhất ⇒ **1 s** — khớp câu hỏi "lần đầu tiên". Thử y(1) = 20 − 5 = 15 ✓.
  3. b) v_y(1) = 20 − 10 = 10; v_x = 0 ⇒ speed = **10 m/s**.
  4. c) τ* = 20/10 = 2; H = 40 − 20 = **20 m**; v_y(2) = 0 ✓.
- Đáp số kỳ vọng: a) 1 s (hai nghiệm 1 và 3, lấy 1); b) 10 m/s; c) 20 m. Lưu ý thi công: `time_when` cần `axis:"y"` tường minh (mặc định position của projectile là trục x).

### [L06] Máy bay thả hàng (ném ngang) — đáp căn 100√2
- Đề: "Một máy bay bay theo phương ngang với tốc độ không đổi 100 m/s ở độ cao 500 m thì thả một gói hàng cứu trợ. Bỏ qua sức cản không khí, lấy g = 10 m/s². a) Sau bao lâu gói hàng chạm đất? b) Gói hàng rơi cách vị trí thả (theo phương ngang) bao nhiêu mét? c) Tính độ lớn vận tốc của gói hàng khi chạm đất."
- Tags: ly/10/dong-hoc/nem-ngang
- Plan phác:
  ```json
  { "problemName": "may-bay-tha-hang",
    "ops": [ { "op": "projectile", "name": "hang", "h0": 500, "v0": 100, "angleDeg": 0, "g": 10 } ],
    "queries": [ { "kind": "time_to_ground", "of": "hang", "label": "a" },
                 { "kind": "range", "of": "hang", "label": "b" },
                 { "kind": "impact_velocity", "of": "hang", "label": "c" } ] }
  ```
- Giải tay:
  1. cos0 = 1, sin0 = 0 ⇒ x-Quad {0, 100, 0}, y-Quad {500, 0, −5}.
  2. a) 500 − 5t² = 0 ⇒ t² = 100 ⇒ **t = 10 s** (loại −10). Thử y(10) = 0 ✓.
  3. b) range = x(10) − x(0) = 100·10 = **1000 m**.
  4. c) v_x = 100; v_y(10) = −100 ⇒ speed = √(100² + 100²) = √20000 = **100√2 m/s ≈ 141,4214** (sqrtExact: 20000 = 100²·2).
- Đáp số kỳ vọng: a) 10 s; b) 1000 m; c) 100√2 m/s ≈ 141,42 m/s, approximate:false (căn đẹp).

### [L07] Ném ngang từ vách đá — position_at giữa chừng theo trục y
- Đề: "Từ mép một vách đá cao 45 m so với mặt nước, một người ném ngang một hòn đá với vận tốc đầu 15 m/s. Lấy g = 10 m/s². a) Sau bao lâu hòn đá chạm mặt nước? b) Sau khi ném 2 s, hòn đá ở độ cao nào so với mặt nước? c) Hòn đá chạm nước cách chân vách đá bao nhiêu mét?"
- Tags: ly/10/dong-hoc/nem-ngang
- Plan phác:
  ```json
  { "problemName": "nem-ngang-vach-da",
    "ops": [ { "op": "projectile", "name": "da", "h0": 45, "v0": 15, "angleDeg": 0, "g": 10 } ],
    "queries": [ { "kind": "time_to_ground", "of": "da", "label": "a" },
                 { "kind": "position_at", "of": "da", "t": 2, "axis": "y", "label": "b" },
                 { "kind": "range", "of": "da", "label": "c" } ] }
  ```
- Giải tay:
  1. x-Quad {0, 15, 0}, y-Quad {45, 0, −5}.
  2. a) 45 − 5t² = 0 ⇒ t² = 9 ⇒ **t = 3 s**. Thử y(3) = 45 − 45 = 0 ✓.
  3. b) y(2) = 45 − 5·4 = **25 m** (PHẢI khai `axis:"y"` — mặc định position_at của projectile là trục x).
  4. c) range = 15·3 = **45 m** (trùng số 45 của độ cao là ngẫu nhiên có chủ đích — bắt lỗi tráo trục x/y).
- Đáp số kỳ vọng: a) 3 s; b) 25 m; c) 45 m. Exact cả ba.

### [L08] Ném xiên 30° từ mặt đất — tầm xa 80√3
- Đề: "Từ mặt đất, một quả bóng được ném với vận tốc đầu 40 m/s hợp với phương ngang góc 30°. Lấy g = 10 m/s². a) Tính thời gian bay. b) Tính độ cao cực đại. c) Tính tầm xa của quả bóng."
- Tags: ly/10/dong-hoc/nem-xien
- Plan phác:
  ```json
  { "problemName": "nem-xien-30-tu-dat",
    "ops": [ { "op": "projectile", "name": "bong", "h0": 0, "v0": 40, "angleDeg": 30, "g": 10 } ],
    "queries": [ { "kind": "time_to_ground", "of": "bong", "label": "a" },
                 { "kind": "max_height", "of": "bong", "label": "b" },
                 { "kind": "range", "of": "bong", "label": "c" } ] }
  ```
- Giải tay:
  1. cos30 = (1/2)√3, sin30 = 1/2 (EXACT_TRIG) ⇒ v0x = 20√3, v0y = 20. y-Quad {0, 20, −5}.
  2. a) 20t − 5t² = 0 ⇒ t ∈ {0; 4}, loại 0 ⇒ **4 s**. Thử y(4) = 80 − 80 = 0 ✓.
  3. b) τ* = 20/10 = 2; H = 20·2 − 5·4 = **20 m**; v_y(2) = 0 ✓.
  4. c) range = v0x·t_bay = 20√3·4 = **80√3 m ≈ 138,5641** (Scalar một-căn, exact). Đối chiếu công thức: R = v0²·sin2θ/g = 1600·(√3/2)/10 = 80√3 ✓.
- Đáp số kỳ vọng: a) 4 s; b) 20 m; c) 80√3 m ≈ 138,56 m, approximate:false (căn đẹp).

### [L09] Ô tô xuất phát đuổi xe máy — meet bậc 2, loại nghiệm âm
- Đề: "Một xe máy chuyển động thẳng đều với tốc độ 10 m/s vừa đi qua vị trí cách ô tô 24 m về phía trước thì ô tô bắt đầu xuất phát (từ trạng thái nghỉ), chuyển động nhanh dần đều với gia tốc 2 m/s², cùng chiều với xe máy. Chọn gốc toạ độ tại ô tô, gốc thời gian lúc ô tô xuất phát. a) Sau bao lâu ô tô đuổi kịp xe máy? b) Vị trí gặp cách nơi ô tô xuất phát bao nhiêu mét? c) Vận tốc của ô tô lúc đuổi kịp."
- Tags: ly/10/dong-hoc/hai-vat-duoi-nhau
- Plan phác:
  ```json
  { "problemName": "oto-duoi-xe-may",
    "ops": [ { "op": "mover1d", "name": "oto", "x0": 0, "v0": 0, "a": 2 },
             { "op": "mover1d", "name": "xemay", "x0": 24, "v0": 10 } ],
    "queries": [ { "kind": "meet_time", "a": "oto", "b": "xemay", "label": "a" },
                 { "kind": "meet_position", "a": "oto", "b": "xemay", "label": "b" },
                 { "kind": "velocity_at", "of": "oto", "t": 12, "component": "x", "label": "c" } ],
    "scene": { "labels": { "oto": "Ô tô", "xemay": "Xe máy" } } }
  ```
- Giải tay:
  1. Ô tô: x-Quad {0, 0, 1} (k2 = a/2); xe máy: {24, 10, 0}. d(t) = t² − 10t − 24.
  2. a) d = 0: Δ = 100 + 96 = 196, √196 = 14 ⇒ t ∈ {12; −2} ⇒ loại nghiệm âm, **t = 12 s**.
  3. b) x_gặp = 12² = **144 m**. Thử: xe máy 24 + 10·12 = 144 ✓ (hai toạ độ bằng nhau — auto self-check).
  4. c) v_ôtô(12) = 2·12 = **24 m/s**.
- Đáp số kỳ vọng: a) 12 s; b) 144 m; c) 24 m/s. Exact cả ba. (Bài phủ nhánh meet BẬC HAI + loại nghiệm âm; lưu ý spec §12-R3: hai vật KHÔNG cùng vị trí xuất phát để tránh nghiệm t=0.)

### [L10] Xe tải và ô tô con cùng chiều, lệch giờ — km/h + startAt
- Đề: "Lúc 8 giờ, một xe tải rời bến A chạy thẳng đều với tốc độ 36 km/h. Lúc 8 giờ 30 phút, một ô tô con cũng rời A đuổi theo với tốc độ 48 km/h. Chọn gốc toạ độ tại A, gốc thời gian lúc 8 giờ, chiều dương là chiều chuyển động. a) Ô tô con đuổi kịp xe tải lúc mấy giờ? b) Vị trí gặp nhau cách A bao nhiêu km? c) Lúc 9 giờ hai xe cách nhau bao nhiêu km?"
- Tags: ly/10/dong-hoc/hai-vat-duoi-nhau
- Plan phác:
  ```json
  { "problemName": "xe-tai-oto-con-lech-gio", "units": { "length": "km", "time": "h" },
    "ops": [ { "op": "mover1d", "name": "tai", "x0": 0, "v0": 36 },
             { "op": "mover1d", "name": "con", "x0": 0, "v0": 48, "startAt": 0.5 } ],
    "queries": [ { "kind": "meet_time", "a": "tai", "b": "con", "label": "a" },
                 { "kind": "meet_position", "a": "tai", "b": "con", "label": "b" },
                 { "kind": "distance_between_at", "a": "tai", "b": "con", "t": 1, "label": "c" } ] }
  ```
- Giải tay:
  1. Xe tải: x = 36t. Ô tô con (t0 = 1/2, expandAbs): x = 48(t − 1/2) = 48t − 24, hiệu lực t ≥ 1/2.
  2. a) 36t = 48t − 24 ⇒ 12t = 24 ⇒ **t = 2 h** ≥ 1/2 ✓ ⇒ gặp lúc **10 giờ** (8h + 2h; cộng mốc là phần trình bày).
  3. b) x = 36·2 = **72 km**. Thử: 48·2 − 24 = 72 ✓.
  4. c) t = 1: tải 36 km; con 48·(1 − 1/2) = 24 km ⇒ |36 − 24| = **12 km**.
  5. Lưu ý mốc t=0: hai nghiệm "gặp" trước 1/2 h không tồn tại vì d(t) tuyến tính; ô tô con trước t0 đứng yên tại 0 (đúng quy ước AnimatedAgent).
- Đáp số kỳ vọng: a) 2 h (lúc 10h); b) 72 km; c) 12 km. Exact. (Cùng chiều + lệch giờ — khác P7 (cùng giờ) và P8 (ngược chiều); 0.5 → 1/2 exact.)

### [L11] Vật ném lên gặp vật thả rơi (cùng đường thẳng đứng) — meet trên trục y
- Đề: "Từ mặt đất, vật A được ném thẳng đứng lên trên với vận tốc đầu 25 m/s. Cùng lúc đó, từ điểm ngay phía trên vị trí ném, ở độ cao 25 m, vật B được thả rơi tự do. Lấy g = 10 m/s². a) Sau bao lâu hai vật gặp nhau? b) Vị trí gặp nhau ở độ cao nào? c) Lúc gặp nhau, vật A đang chuyển động với tốc độ bao nhiêu? d) Trước đó, tại thời điểm t = 0,5 s hai vật cách nhau bao nhiêu mét?"
- Tags: ly/10/dong-hoc/hai-vat-gap-nhau
- Plan phác:
  ```json
  { "problemName": "nem-len-gap-tha-roi",
    "ops": [ { "op": "projectile", "name": "A", "h0": 0, "v0": 25, "angleDeg": 90, "g": 10 },
             { "op": "free_fall", "name": "B", "h0": 25, "g": 10 } ],
    "queries": [ { "kind": "meet_time", "a": "A", "b": "B", "label": "a" },
                 { "kind": "meet_position", "a": "A", "b": "B", "label": "b" },
                 { "kind": "velocity_at", "of": "A", "t": 1, "label": "c" },
                 { "kind": "distance_between_at", "a": "A", "b": "B", "t": 0.5, "label": "d" } ] }
  ```
- Giải tay:
  1. A: y_A = 25t − 5t²; B: y_B = 25 − 5t². Cả hai x-Quad hằng 0 (cùng đường thẳng đứng).
  2. a) d_y(t) = y_A − y_B = 25t − 25 (số hạng bậc 2 TRIỆT TIÊU — hai vật cùng g) ⇒ **t = 1 s**.
  3. b) y_gặp = 25·1 − 5 = **20 m**. Thử: y_B(1) = 25 − 5 = 20 ✓ (hai độ cao bằng nhau).
  4. c) v_A(1): v_y = 25 − 10 = 15, v_x = 0 ⇒ **15 m/s** (đang đi lên; B lúc đó có tốc độ 10 m/s).
  5. d) t = 1/2: y_A = 25/2 − 5/4 = 45/4; y_B = 25 − 5/4 = 95/4 ⇒ |Δ| = 50/4 = **12,5 m** (đúng công thức |25 − 25t| = 12,5 ✓).
- Đáp số kỳ vọng: a) 1 s; b) 20 m; c) 15 m/s; d) 25/2 m = 12,5 m. Exact cả bốn. **CẢNH BÁO THI CÔNG:** meet giữa 2 vật thẳng đứng — "trục chung" (§6.2 spec Lý) phải là trục y; nếu engine trừ theo trục x sẽ được d ≡ 0 (vô số nghiệm). Bài này ép định nghĩa trục chung = trục hai vật thực sự chuyển động.

### [L12] Trượt dốc nhanh dần đều từ nghỉ — đáp thời gian 5√2 + assert dữ kiện dư
- Đề: "Một vật bắt đầu trượt từ trạng thái nghỉ xuống một dốc thẳng, chuyển động nhanh dần đều với gia tốc 2 m/s². Biết sau 2 s vật đi được 4 m. a) Sau bao lâu kể từ lúc xuất phát vật đi được quãng đường 50 m? b) Tính vận tốc của vật sau 6 s."
- Tags: ly/10/dong-hoc/nhanh-dan-deu
- Plan phác:
  ```json
  { "problemName": "truot-doc-50m",
    "ops": [ { "op": "mover1d", "name": "vat", "x0": 0, "v0": 0, "a": 2 } ],
    "queries": [ { "kind": "time_when", "of": "vat", "position": 50, "label": "a" },
                 { "kind": "velocity_at", "of": "vat", "t": 6, "component": "x", "label": "b" } ],
    "asserts": [ { "query": { "kind": "position_at", "of": "vat", "t": 2 }, "equals": 4 } ] }
  ```
- Giải tay:
  1. x-Quad {0, 0, 1} (k2 = a/2 = 1) ⇒ x(t) = t². Assert dữ kiện dư: x(2) = 4 ✓ (đề tự nhất quán).
  2. a) t² = 50: solveQuadratic(1, 0, −50): Δ = 200, √200 = 10√2 ⇒ t = ±5√2 ⇒ loại âm, **t = 5√2 s ≈ 7,0711**. Thử x(5√2) = 50 ✓.
  3. b) v(6) = 2·6 = **12 m/s**.
- Đáp số kỳ vọng: a) 5√2 s ≈ 7,07 s, approximate:false (căn đẹp qua solveQuadratic); b) 12 m/s.

### Bảng phủ query — phần Lý (mỗi kind ≥ 2 ✓)

| Query kind | Xuất hiện tại | Đếm |
|---|---|---|
| `position_at` | L01a, L02b, L03c, L07b (+ assert L12) | 4 |
| `velocity_at` | L02a, L05b, L09c, L11c, L12b (+ assert L02) | 5 |
| `time_to_ground` | L03a, L04b, L06a, L07a, L08a | 5 |
| `range` | L06b, L07c, L08c | 3 |
| `max_height` | L04a, L05c, L08b | 3 |
| `impact_velocity` | L03b, L04c, L06c | 3 |
| `meet_time` | L09a, L10a, L11a | 3 |
| `meet_position` | L09b, L10b, L11b | 3 |
| `distance_between_at` | L10c, L11d | 2 |
| `time_when` | L01b, L02c, L05a, L12a | 4 |

Phủ thêm theo yêu cầu đề bài: km/h + đổi đơn vị (L01 phút→h, L02 km/h→m/s, L10 km/h+startAt); đáp căn đẹp (L06 100√2, L08 80√3, L12 5√2); 2 nghiệm thời gian phải chọn (L02c 4|6, L05a 1|3, L09a 12|−2); g = 9,8 (L03), g = 10 (còn lại); asserts dữ kiện dư (L02, L12); mọi op (`mover1d` a=0/a≠0/startAt, `free_fall`, `projectile` 0°/30°/90°).

---

## PHẦN B — 12 BÀI HÓA VÔ CƠ (chỉ dùng R01–R50 của DB v0)

### [H01] Nhôm + HCl — thể tích khí đktc (22,4) + khối lượng muối (R12)
- Đề: "Hòa tan hoàn toàn 5,4 g nhôm trong dung dịch HCl dư. a) Viết phương trình hóa học. b) Tính thể tích khí H2 thoát ra ở điều kiện tiêu chuẩn (đktc). c) Tính khối lượng muối thu được. (Cho Al = 27; Cl = 35,5; H = 1. Đề dùng chế độ **đktc, 22,4 L/mol**.)"
- Tags: hoa/thpt/vo-co/kim-loai-axit
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "Al", "amount": { "grams": "5,4" } },
             { "op": "species", "formula": "HCl", "amount": { "excess": true }, "state": "solution" },
             { "op": "mix" } ],
    "molarVolume": 22.4,
    "queries": [ { "kind": "equation" },
                 { "kind": "volume_gas", "of": "H2" },
                 { "kind": "mass", "of": "AlCl3" } ] }
  ```
- Giải tay:
  1. n(Al) = 27/5 ÷ 27 = **1/5 mol**. Khớp R12: 2Al + 6HCl → 2AlCl3 + 3H2↑ (Al trước H trong dãy hoạt động — guard G1 pass). HCl dư ⇒ Al hết, ξ = (1/5)/2 = 1/10.
  2. n(H2) = 3ξ = 3/10 ⇒ V = 3/10 × 112/5 = 336/50 = **6,72 lít (đktc)**.
  3. M(AlCl3) = 27 + 3×71/2 = 267/2. n(AlCl3) = 2ξ = 1/5 ⇒ m = 1/5 × 267/2 = 267/10 = **26,7 g**.
  4. Thử lại (bảo toàn khối lượng phần phản ứng): 5,4 + 6ξ×36,5 (= 3/5×73/2 = 21,9) = 26,7 + 3/10×2 (= 0,6) ⇒ 27,3 = 27,3 ✓.
- Đáp số kỳ vọng: a) `2Al + 6HCl → 2AlCl3 + 3H2↑` (hệ số [2,6,2,3]); b) 336/50 L = 6,72 lít (đktc); c) 267/10 g = 26,7 g.

### [H02] Sắt + H2SO4 loãng — mol + thể tích khí đkc (24,79) (R15)
- Đề: "Cho 11,2 g sắt tác dụng hết với dung dịch H2SO4 loãng dư. a) Tính số mol H2 sinh ra. b) Tính thể tích H2 ở điều kiện chuẩn (25 °C, 1 bar). c) Tính khối lượng muối FeSO4 tạo thành. (Fe = 56; S = 32; O = 16. Đề dùng chế độ **đkc, 24,79 L/mol** — GDPT 2018.)"
- Tags: hoa/thpt/vo-co/kim-loai-axit
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "Fe", "amount": { "grams": "11,2" } },
             { "op": "species", "formula": "H2SO4", "amount": { "excess": true }, "state": "solution", "variant": "loãng" },
             { "op": "mix" } ],
    "queries": [ { "kind": "mol", "of": "H2" },
                 { "kind": "volume_gas", "of": "H2" },
                 { "kind": "mass", "of": "FeSO4" } ] }
  ```
  (`molarVolume` vắng mặt ⇒ default 24,79 — chính là chế độ đề khai.)
- Giải tay:
  1. n(Fe) = 56/5 ÷ 56 = **1/5 mol**. Khớp R15: Fe + H2SO4(loãng) → FeSO4 + H2↑; H2SO4 dư ⇒ Fe hết, ξ = 1/5.
  2. a) n(H2) = ξ = **1/5 mol = 0,2 mol**.
  3. b) V = 1/5 × 2479/100 = 2479/500 = **4,958 lít (đkc)**.
  4. c) m(FeSO4) = 1/5 × 152 = 152/5 = **30,4 g**.
  5. Thử lại: 11,2 + 1/5×98 (= 19,6) = 30,4 + 1/5×2 (= 0,4) ⇒ 30,8 = 30,8 ✓.
- Đáp số kỳ vọng: a) 1/5 mol (0,2 mol); b) 2479/500 L = 4,958 lít (đkc); c) 152/5 g = 30,4 g.

### [H03] Kẽm + CuSO4 — chất hết/chất dư, kim loại + muối (R21)
- Đề: "Cho 6,5 g kẽm vào 200 ml dung dịch CuSO4 0,4M, khuấy đều đến khi phản ứng xảy ra hoàn toàn. a) Chất nào còn dư sau phản ứng? Dư bao nhiêu gam? b) Tính khối lượng đồng sinh ra. (Zn = 65; Cu = 64.)"
- Tags: hoa/thpt/vo-co/kim-loai-muoi
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "Zn", "amount": { "grams": "6,5" } },
             { "op": "species", "formula": "CuSO4", "amount": { "solution": { "molarity": "0,4", "liters": "0,2" } } },
             { "op": "mix" } ],
    "queries": [ { "kind": "remaining", "of": "Zn" },
                 { "kind": "mass", "of": "Cu" } ] }
  ```
- Giải tay:
  1. n(Zn) = 13/2 ÷ 65 = **1/10**; n(CuSO4) = 2/5 × 1/5 = **2/25**. Khớp R21: Zn + CuSO4 → ZnSO4 + Cu↓ (Zn trước Cu, Zn ∉ {K,Ba,Ca,Na} — guard G2 pass).
  2. Tỉ số: Zn 1/10 ÷ 1 = 1/10; CuSO4 2/25 ÷ 1 = 2/25. So hữu tỉ: 2/25 = 4/50 < 5/50 = 1/10 ⇒ **CuSO4 hết, Zn dư**, ξ = 2/25.
  3. a) Zn dư = 1/10 − 2/25 = 5/50 − 4/50 = **1/50 mol** ⇒ m = 1/50 × 65 = 13/10 = **1,3 g**.
  4. b) n(Cu) = ξ = 2/25 ⇒ m = 2/25 × 64 = 128/25 = **5,12 g**.
  5. Thử lại: Zn pư 2/25×65 (= 5,2) + CuSO4 2/25×160 (= 12,8) = 18; ZnSO4 2/25×161 (= 12,88) + Cu 5,12 = 18 ✓.
- Đáp số kỳ vọng: a) Zn dư 1/50 mol = 1,3 g; b) 128/25 g = 5,12 g. (Hiện tượng kèm scene: lớp đồng đỏ bám lên kẽm, màu xanh lam nhạt dần rồi mất hẳn — CuSO4 hết.)

### [H04] Đồng + AgNO3 — kim loại + muối, CM sau phản ứng (R22)
- Đề: "Cho 6,4 g đồng vào 100 ml dung dịch AgNO3 1M, đến khi phản ứng xảy ra hoàn toàn. a) Tính khối lượng bạc sinh ra. b) Đồng còn dư bao nhiêu gam? c) Tính nồng độ mol của muối đồng trong dung dịch sau phản ứng (coi thể tích dung dịch không đổi). (Cu = 64; Ag = 108.)"
- Tags: hoa/thpt/vo-co/kim-loai-muoi
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "Cu", "amount": { "grams": "6,4" } },
             { "op": "species", "formula": "AgNO3", "amount": { "solution": { "molarity": 1, "liters": "0,1" } } },
             { "op": "mix" } ],
    "queries": [ { "kind": "mass", "of": "Ag" },
                 { "kind": "remaining", "of": "Cu" },
                 { "kind": "concentration", "of": "Cu(NO3)2", "as": "CM" } ] }
  ```
- Giải tay:
  1. n(Cu) = 32/5 ÷ 64 = **1/10**; n(AgNO3) = 1 × 1/10 = **1/10**. Khớp R22: Cu + 2AgNO3 → Cu(NO3)2 + 2Ag↓ (guard G2 pass).
  2. Tỉ số: Cu 1/10 ÷ 1 = 1/10; AgNO3 1/10 ÷ 2 = 1/20 < 1/10 ⇒ **AgNO3 hết, Cu dư**, ξ = 1/20.
  3. a) n(Ag) = 2ξ = 1/10 ⇒ m = 108/10 = **10,8 g**.
  4. b) Cu dư = 1/10 − 1/20 = **1/20 mol** ⇒ m = 64/20 = 16/5 = **3,2 g**.
  5. c) n(Cu(NO3)2) = ξ = 1/20; V dd = 1/10 L (Cu là chất rắn, KHÔNG góp thể tích) ⇒ CM = (1/20)/(1/10) = **0,5M**.
  6. Thử lại: Cu pư 1/20×64 (= 3,2) + AgNO3 1/10×170 (= 17) = 20,2; Cu(NO3)2 1/20×188 (= 9,4) + Ag 10,8 = 20,2 ✓ (M(Cu(NO3)2) = 64 + 2×62 = 188).
- Đáp số kỳ vọng: a) 10,8 g; b) Cu dư 1/20 mol = 3,2 g; c) 0,5M. (Bài khoá quy tắc §9.4: V tổng cho CM chỉ gồm species dạng `solution`.)

### [H05] NaOH + H2SO4 — trung hòa, CM các chất sau phản ứng (R32)
- Đề: "Trộn 300 ml dung dịch H2SO4 0,5M với 200 ml dung dịch NaOH 2M. a) Chất nào còn dư, dư bao nhiêu mol? b) Tính nồng độ mol của muối và của chất dư trong dung dịch sau phản ứng (coi thể tích dung dịch cộng tính)."
- Tags: hoa/thpt/vo-co/axit-bazo-CM
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "H2SO4", "amount": { "solution": { "molarity": "0,5", "liters": "0,3" } }, "variant": "loãng" },
             { "op": "species", "formula": "NaOH", "amount": { "solution": { "molarity": 2, "liters": "0,2" } } },
             { "op": "mix" } ],
    "queries": [ { "kind": "remaining", "of": "NaOH" },
                 { "kind": "concentration", "of": "Na2SO4", "as": "CM" },
                 { "kind": "concentration", "of": "NaOH", "as": "CM" } ] }
  ```
- Giải tay:
  1. n(H2SO4) = 1/2 × 3/10 = **3/20**; n(NaOH) = 2 × 1/5 = **2/5**. Khớp R32: 2NaOH + H2SO4 → Na2SO4 + 2H2O.
  2. Tỉ số: NaOH (2/5)/2 = 1/5; H2SO4 (3/20)/1 = 3/20 < 1/5 (= 4/20) ⇒ **H2SO4 hết**, ξ = 3/20.
  3. a) NaOH tiêu thụ 2ξ = 3/10 ⇒ dư 2/5 − 3/10 = **1/10 mol**.
  4. b) n(Na2SO4) = 3/20. V tổng = 3/10 + 1/5 = **1/2 L**. CM(Na2SO4) = (3/20)/(1/2) = 3/10 = **0,3M**; CM(NaOH dư) = (1/10)/(1/2) = **0,2M**.
  5. Thử lại: NaOH pư 3/10×40 (= 12) + H2SO4 3/20×98 (= 14,7) = 26,7; Na2SO4 3/20×142 (= 21,3) + H2O 3/10×18 (= 5,4) = 26,7 ✓.
- Đáp số kỳ vọng: a) NaOH dư 1/10 mol; b) CM(Na2SO4) = 0,3M; CM(NaOH) = 0,2M. (Khác Bài 4 spec: cặp chất khác — R32 hệ số 2:1, bẫy limiting chia hệ số.)

### [H06] NaOH + HCl theo C% — nồng độ phần trăm sau phản ứng (R31)
- Đề: "Trộn 200 g dung dịch NaOH 10% với 200 g dung dịch HCl 7,3%. a) Tính số mol muối ăn tạo thành. b) Tính nồng độ phần trăm của các chất tan trong dung dịch thu được. (Na = 23; Cl = 35,5.)"
- Tags: hoa/thpt/vo-co/axit-bazo-C%
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "NaOH", "amount": { "solution_percent": { "massGrams": 200, "percent": 10 } } },
             { "op": "species", "formula": "HCl", "amount": { "solution_percent": { "massGrams": 200, "percent": "7,3" } } },
             { "op": "mix" } ],
    "queries": [ { "kind": "mol", "of": "NaCl" },
                 { "kind": "concentration", "of": "NaCl", "as": "C%" },
                 { "kind": "concentration", "of": "NaOH", "as": "C%" } ] }
  ```
- Giải tay:
  1. m(NaOH) = 200×10/100 = 20 g ⇒ n = 20/40 = **1/2**; m(HCl) = 200×7,3/100 = 73/5 g ⇒ n = 73/5 ÷ 73/2 = **2/5**. Khớp R31: NaOH + HCl → NaCl + H2O (1:1).
  2. min(1/2, 2/5) = 2/5 ⇒ **HCl hết, NaOH dư**, ξ = 2/5. NaOH dư = 1/2 − 2/5 = 1/10 mol (= 4 g).
  3. a) n(NaCl) = ξ = **2/5 mol = 0,4 mol** ⇒ m = 2/5 × 117/2 = 117/5 = 23,4 g.
  4. b) m_dd sau = 200 + 200 − 0 (không kết tủa, không khí bay ra) = **400 g**. C%(NaCl) = 23,4/400 × 100 = 117/20 = **5,85%**; C%(NaOH dư) = 4/400 × 100 = **1%**.
  5. Thử lại: NaOH pư 2/5×40 (= 16) + HCl 73/5 (= 14,6) = 30,6; NaCl 23,4 + H2O 2/5×18 (= 7,2) = 30,6 ✓.
- Đáp số kỳ vọng: a) 2/5 mol (0,4 mol); b) C%(NaCl) = 5,85%; C%(NaOH) = 1%. (Bài ĐẦU TIÊN khoá công thức C% ĐẦU RA §9.4 — 10 bài mẫu của spec chưa bài nào hỏi C% sau phản ứng.)

### [H07] AgNO3 + NaCl — muối + muối kết tủa, C% đầu vào cả hai (R41)
- Đề: "Trộn 200 g dung dịch AgNO3 8,5% với 300 g dung dịch NaCl 5,85%. a) Tính khối lượng kết tủa thu được. b) Muối nào còn dư, dư bao nhiêu gam? c) Nêu hiện tượng quan sát được. (Ag = 108; N = 14; O = 16; Na = 23; Cl = 35,5.)"
- Tags: hoa/thpt/vo-co/muoi-muoi-ket-tua
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "AgNO3", "amount": { "solution_percent": { "massGrams": 200, "percent": "8,5" } } },
             { "op": "species", "formula": "NaCl", "amount": { "solution_percent": { "massGrams": 300, "percent": "5,85" } } },
             { "op": "mix" } ],
    "queries": [ { "kind": "mass", "of": "AgCl" },
                 { "kind": "remaining", "of": "NaCl" },
                 { "kind": "phenomena" } ] }
  ```
- Giải tay:
  1. m(AgNO3) = 200×8,5/100 = 17 g ⇒ n = 17/170 = **1/10**; m(NaCl) = 300×5,85/100 = 351/20 g ⇒ n = 351/20 ÷ 117/2 = **3/10**. Khớp R41: AgNO3 + NaCl → AgCl↓ + NaNO3 (guard trao đổi: có kết tủa AgCl theo bảng tính tan §8.3).
  2. min(1/10, 3/10) = 1/10 ⇒ **AgNO3 hết, NaCl dư**, ξ = 1/10.
  3. a) m(AgCl) = 1/10 × 287/2 = 287/20 = **14,35 g** (M(AgCl) = 108 + 35,5 = 143,5).
  4. b) NaCl dư = 3/10 − 1/10 = **1/5 mol** ⇒ m = 1/5 × 117/2 = 117/10 = **11,7 g**.
  5. c) Hiện tượng (R41): **kết tủa trắng** xuất hiện, hóa đen dần ngoài ánh sáng.
  6. Thử lại: AgNO3 17 + NaCl pư 1/10×117/2 (= 5,85) = 22,85; AgCl 14,35 + NaNO3 1/10×85 (= 8,5) = 22,85 ✓.
- Đáp số kỳ vọng: a) 287/20 g = 14,35 g; b) NaCl dư 1/5 mol = 11,7 g; c) kết tủa trắng (AgCl), hóa đen ngoài ánh sáng.

### [H08] Nhiệt phân NaHCO3 — đkc 24,79 (R47)
- Đề: "Nung 16,8 g NaHCO3 đến khối lượng không đổi. a) Tính khối lượng chất rắn Na2CO3 thu được. b) Tính thể tích khí CO2 sinh ra ở điều kiện chuẩn (25 °C, 1 bar). (Na = 23; H = 1; C = 12; O = 16. Đề dùng chế độ **đkc, 24,79 L/mol**.)"
- Tags: hoa/thpt/vo-co/nhiet-phan
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "NaHCO3", "amount": { "grams": "16,8" } },
             { "op": "mix", "heated": true } ],
    "queries": [ { "kind": "mass", "of": "Na2CO3" },
                 { "kind": "volume_gas", "of": "CO2" } ] }
  ```
- Giải tay:
  1. n(NaHCO3) = 84/5 ÷ 84 = **1/5**. `heated:true` ⇒ khớp R47: 2NaHCO3 → Na2CO3 + H2O + CO2↑ (guard G3 pass), ξ = 1/10.
  2. a) m(Na2CO3) = 1/10 × 106 = 53/5 = **10,6 g**.
  3. b) n(CO2) = 1/10 ⇒ V = 1/10 × 2479/100 = 2479/1000 = **2,479 lít (đkc)**.
  4. Thử lại: 16,8 = 10,6 + H2O 1/10×18 (= 1,8) + CO2 1/10×44 (= 4,4) ⇒ 16,8 = 16,8 ✓.
- Đáp số kỳ vọng: a) 53/5 g = 10,6 g; b) 2479/1000 L = 2,479 lít (đkc).

### [H09] Nhiệt phân KMnO4 điều chế O2 — đktc 22,4, hai chất rắn (R44)
- Đề: "Nung 31,6 g KMnO4 đến khi phản ứng xảy ra hoàn toàn. a) Viết phương trình hóa học. b) Tính thể tích khí O2 thu được ở đktc. c) Tính khối lượng K2MnO4 và MnO2 trong chất rắn còn lại. (K = 39; Mn = 55; O = 16. Đề dùng chế độ **đktc, 22,4 L/mol**.)"
- Tags: hoa/thpt/vo-co/nhiet-phan
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "KMnO4", "amount": { "grams": "31,6" } },
             { "op": "mix", "heated": true } ],
    "molarVolume": 22.4,
    "queries": [ { "kind": "equation" },
                 { "kind": "volume_gas", "of": "O2" },
                 { "kind": "mass", "of": "K2MnO4" },
                 { "kind": "mass", "of": "MnO2" } ] }
  ```
- Giải tay:
  1. n(KMnO4) = 158/5 ÷ 158 = **1/5**. Khớp R44: 2KMnO4 → K2MnO4 + MnO2 + O2↑, ξ = 1/10.
  2. b) n(O2) = 1/10 ⇒ V = 1/10 × 112/5 = 112/50 = **2,24 lít (đktc)**.
  3. c) m(K2MnO4) = 1/10 × 197 = **19,7 g**; m(MnO2) = 1/10 × 87 = **8,7 g** (M: 2×39+55+64 = 197; 55+32 = 87).
  4. Thử lại: 31,6 = 19,7 + 8,7 + O2 1/10×32 (= 3,2) ⇒ 31,6 = 31,6 ✓. (Chất rắn còn lại tổng 28,4 g = 31,6 − 3,2 — phần trình bày lời giải.)
- Đáp số kỳ vọng: a) `2KMnO4 → K2MnO4 + MnO2 + O2↑` (hệ số [2,1,1,1] — ca chốt của balancer §7); b) 2,24 lít (đktc); c) 19,7 g và 8,7 g.

### [H10] Khử Fe2O3 bằng CO — assert dữ kiện dư + hiện tượng (R49)
- Đề: "Khử hoàn toàn 8 g Fe2O3 bằng khí CO dư ở nhiệt độ cao, sau phản ứng thu được 5,6 g sắt. a) Tính thể tích khí CO2 sinh ra ở đktc. b) Dẫn toàn bộ khí sau phản ứng qua bình đựng nước vôi trong dư — nêu hiện tượng tại ống phản ứng và ở bình nước vôi. (Fe = 56; O = 16; C = 12. Đề dùng chế độ **đktc, 22,4 L/mol**.)"
- Tags: hoa/thpt/vo-co/khu-oxit-CO
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "Fe2O3", "amount": { "grams": 8 } },
             { "op": "species", "formula": "CO", "amount": { "excess": true }, "state": "gas" },
             { "op": "mix", "heated": true } ],
    "molarVolume": 22.4,
    "queries": [ { "kind": "volume_gas", "of": "CO2" },
                 { "kind": "phenomena" } ],
    "asserts": [ { "kind": "given_mass", "of": "Fe", "grams": "5,6" } ] }
  ```
- Giải tay:
  1. n(Fe2O3) = 8/160 = **1/20**. Khớp R49: Fe2O3 + 3CO → 2Fe + 3CO2 (heated ✓), CO dư ⇒ ξ = 1/20.
  2. Assert dữ kiện dư: m(Fe) tính = 2×1/20 × 56 = 28/5 = 5,6 g = số đề cho ✓ (mô hình khớp đề; nếu đề bịa 6 g ⇒ violation, không trả đáp).
  3. a) n(CO2) = 3×1/20 = 3/20 ⇒ V = 3/20 × 112/5 = 336/100 = **3,36 lít (đktc)**.
  4. b) Hiện tượng (R49): **bột đỏ nâu chuyển xám** (Fe); **khí ra làm đục nước vôi** (CO2 tạo kết tủa trắng).
  5. Thử lại: Fe2O3 8 + CO 3/20×28 (= 4,2) = 12,2; Fe 5,6 + CO2 3/20×44 (= 6,6) = 12,2 ✓.
- Đáp số kỳ vọng: a) 336/100 L = 3,36 lít (đktc); b) hiện tượng như trên; asserts pass (khác Bài 10 spec: số liệu khác + đường given_mass + phenomena). Lưu ý: KHÔNG hỏi mol CO đã dùng — CO là `excess`, ledger after = ∞, query đụng chất excess phải ra lỗi rõ ràng.

### [H11] Khử CuO bằng H2 — hiện tượng + assert khối lượng nước (R48)
- Đề: "Dẫn khí H2 dư qua ống sứ đựng 16 g CuO nung nóng đến khi phản ứng xảy ra hoàn toàn, thấy tạo thành 3,6 g nước. a) Tính khối lượng chất rắn thu được trong ống. b) Nêu hiện tượng quan sát được. (Cu = 64; O = 16; H = 1.)"
- Tags: hoa/thpt/vo-co/khu-oxit-H2
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "CuO", "amount": { "grams": 16 } },
             { "op": "species", "formula": "H2", "amount": { "excess": true }, "state": "gas" },
             { "op": "mix", "heated": true } ],
    "queries": [ { "kind": "mass", "of": "Cu" },
                 { "kind": "phenomena" } ],
    "asserts": [ { "kind": "given_mass", "of": "H2O", "grams": "3,6" } ] }
  ```
- Giải tay:
  1. n(CuO) = 16/80 = **1/5**. Khớp R48: CuO + H2 → Cu + H2O (heated ✓), H2 dư ⇒ ξ = 1/5.
  2. Assert: m(H2O) tính = 1/5 × 18 = 18/5 = 3,6 g = số đề cho ✓.
  3. a) m(Cu) = 1/5 × 64 = 64/5 = **12,8 g**.
  4. b) Hiện tượng (R48): **bột đen chuyển đỏ** (Cu); **hơi nước ngưng trên thành ống**.
  5. Thử lại: CuO 16 + H2 1/5×2 (= 0,4) = 16,4; Cu 12,8 + H2O 3,6 = 16,4 ✓.
- Đáp số kỳ vọng: a) 64/5 g = 12,8 g; b) hiện tượng như trên; assert given_mass(H2O) = 3,6 pass.

### [H12] FeCl2 + NaOH — bài hiện tượng thuần định tính (R37)
- Đề: "Nhỏ từ từ dung dịch NaOH vào ống nghiệm đựng dung dịch FeCl2, sau đó để ống nghiệm một lúc ngoài không khí. Nêu hiện tượng quan sát được và viết phương trình hóa học của phản ứng."
- Tags: hoa/thpt/vo-co/hien-tuong
- Plan phác:
  ```json
  { "ops": [ { "op": "species", "formula": "FeCl2", "state": "solution" },
             { "op": "species", "formula": "NaOH", "state": "solution" },
             { "op": "mix" } ],
    "queries": [ { "kind": "phenomena" }, { "kind": "equation" } ] }
  ```
- Giải tay:
  1. Hai species KHÔNG có `amount` ⇒ bài định tính (§9.1 spec Hóa) — query định lượng nào đụng vào phải ra lỗi; phenomena/equation thì hợp lệ.
  2. Khớp R37: FeCl2 + 2NaOH → Fe(OH)2↓ + 2NaCl (guard trao đổi: Fe(OH)2 không tan theo bảng §8.3).
  3. Cân bằng đối chiếu (bảo toàn nguyên tố): Fe 1=1; Cl 2=2; Na 2=2; O 2=2; H 2=2 ✓.
- Đáp số kỳ vọng: phenomena = "**kết tủa trắng xanh**, hóa **nâu đỏ** dần trong không khí" (kèm màu dd FeCl2 lục rất nhạt); equation = `FeCl2 + 2NaOH → Fe(OH)2↓ + 2NaCl` (hệ số [1,2,1,2]). Scene: precipitate màu `#D5E8D4` → color_change sang `#8B4513` (đúng note R37: sự hóa nâu chỉ ghi hiện tượng, không thành record).

### Bảng phủ query — phần Hóa (mỗi kind ≥ 2 ✓)

| Query kind | Xuất hiện tại | Đếm |
|---|---|---|
| `mass` | H01, H02, H03, H04, H07, H08, H09 (×2), H11 | 9 |
| `mol` | H02, H06 | 2 |
| `volume_gas` | H01, H02, H08, H09, H10 | 5 |
| `concentration` (CM) | H04, H05 (×2) | 3 |
| `concentration` (C%) | H06 (×2) | 2 |
| `remaining` | H03, H04, H05, H07 | 4 |
| `phenomena` | H07, H10, H11, H12 | 4 |
| `equation` | H01, H09, H12 | 3 |

Phủ thêm theo yêu cầu đề bài: 22,4 (H01, H09, H10) vs 24,79 (H02, H08 — H02 để default chứng minh đường default) — mỗi đề GHI RÕ chế độ; chất dư/hết (H03, H04, H05, H06, H07); asserts `given_mass` (H10, H11); chuỗi thập phân VN `"5,4"`/`"7,3"`/`"5,85"` (H01, H06, H07…); record dùng: R12, R15, R21, R22, R32, R31, R41, R47, R44, R49, R48, R37 — R31/R49 trùng record với bài mẫu spec nhưng bài toán khác hẳn (C% đầu ra / assert + phenomena); mọi guard đi qua: G1 (H01–H02), G2 (H03–H04), trao đổi (H05–H07, H12), G3 heated (H08–H11).

---

## Bảng tổng hợp 24 bài

| Mã | Dạng bài | Đáp số chốt |
|---|---|---|
| L01 | Thẳng đều, phút→giờ | 9 km; 5/4 h (7h15) |
| L02 | Chậm dần đều, 54 km/h→15 m/s | 6 m/s; 37,5 m; 4 s (loại 6 s) |
| L03 | Rơi tự do g=9,8 | 4 s; 39,2 m/s; 34,3 m |
| L04 | Ném thẳng đứng 90° | 45 m; 6 s; 30 m/s |
| L05 | Ném thẳng đứng, 2 nghiệm | 1 s (loại 3 s); 10 m/s; 20 m |
| L06 | Ném ngang (máy bay) | 10 s; 1000 m; 100√2 m/s ≈ 141,42 |
| L07 | Ném ngang, position trục y | 3 s; 25 m; 45 m |
| L08 | Ném xiên 30° | 4 s; 20 m; 80√3 m ≈ 138,56 |
| L09 | Đuổi nhau, 1 xe có gia tốc | 12 s (loại −2); 144 m; 24 m/s |
| L10 | Đuổi nhau lệch giờ, km/h | 2 h (10h); 72 km; 12 km |
| L11 | Ném lên gặp thả rơi (trục y) | 1 s; 20 m; 15 m/s; 12,5 m |
| L12 | NDĐ từ nghỉ, căn + assert | 5√2 s ≈ 7,07; 12 m/s |
| H01 | Al + HCl (R12), đktc | PTHH [2,6,2,3]; 6,72 L; 26,7 g |
| H02 | Fe + H2SO4 loãng (R15), đkc | 0,2 mol; 4,958 L; 30,4 g |
| H03 | Zn + CuSO4 (R21), dư/hết | Zn dư 1,3 g; Cu 5,12 g |
| H04 | Cu + AgNO3 (R22), CM sau pư | Ag 10,8 g; Cu dư 3,2 g; 0,5M |
| H05 | NaOH + H2SO4 (R32), CM | NaOH dư 0,1 mol; 0,3M; 0,2M |
| H06 | NaOH + HCl (R31), C% đầu ra | 0,4 mol; NaCl 5,85%; NaOH 1% |
| H07 | AgNO3 + NaCl (R41), kết tủa | AgCl 14,35 g; NaCl dư 11,7 g; kết tủa trắng |
| H08 | Nhiệt phân NaHCO3 (R47), đkc | 10,6 g; 2,479 L |
| H09 | Nhiệt phân KMnO4 (R44), đktc | PTHH [2,1,1,1]; 2,24 L; 19,7 g + 8,7 g |
| H10 | Khử Fe2O3 bằng CO (R49) + assert | 3,36 L; hiện tượng; assert Fe 5,6 g pass |
| H11 | Khử CuO bằng H2 (R48) + assert | Cu 12,8 g; hiện tượng; assert H2O 3,6 g pass |
| H12 | FeCl2 + NaOH (R37), định tính | Kết tủa trắng xanh hóa nâu đỏ; PTHH [1,2,1,2] |

## Ghi chú thi công — các bài DỄ SAI nhất

1. **L11 (rủi ro cao nhất):** meet giữa projectile(90°) và free_fall — cả hai x-Quad là hằng số. Nếu `meet_time` trừ theo trục x sẽ ra d ≡ 0 (vô số nghiệm/chia 0). Engine phải định nghĩa "trục chung" = trục hai vật thực sự chuyển động (y). Nếu phản biện chốt rằng meet chỉ hỗ trợ mover1d ở v0, chuyển L11 xuống phụ lục v1 và thay bằng một bài 2×mover1d.
2. **L04/L05/L11:** `angleDeg: 90` — cos90 phải là 0 EXACT từ bảng EXACT_TRIG; nếu lỡ đi đường `Math.cos(π/2)` ≈ 6,1e-17 thì speed lệch certify và landing_point trôi theo t.
3. **L02c:** `time_when` trên chậm dần đều — nghiệm 6 s là nghiệm "ma" sau khi xe đã dừng (t=5); quy ước min-root cho đúng 4 s, nhưng test nên khoá thêm: hỏi 37,5 m (nghiệm kép t=5) và 40 m (vô nghiệm ⇒ error, không serve) làm 2 test biên đi kèm.
4. **H04 & H10/H11 (chất excess):** CM chỉ chia cho tổng V của species dạng `solution` (Cu rắn không góp V — H04); query `mol`/`mass` đụng chất `excess` (CO, H2, HCl dư vô hạn) phải trả lỗi rõ ràng chứ không phải ∞/NaN — vì vậy các bài này cố tình KHÔNG hỏi lượng chất dư vô hạn.
5. **H05/H06 (limiting có hệ số):** phải chia cho hệ số trước khi lấy min (NaOH ÷2 ở H05); so sánh hữu tỉ bằng tích chéo, không float. H06 còn khoá công thức m_dd sau = tổng đổ vào − kết tủa − khí (ở đây trừ 0 — bài H07 nếu mở rộng hỏi C% sẽ trừ 14,35 g kết tủa).
6. **Parse "5,4"/"7,3"/"5,85"/"8,5":** chuỗi dấu phẩy VN phải qua `parseDecimal` thành 27/5, 73/10, 117/20, 17/2 — tuyệt đối không nhân 10^k trên double.
7. **L03 (g=9,8):** mọi hệ số là bội của 49/5 — nếu engine lỡ hard-code g=10 thì assert/đáp lệch ~2% > TOL_ASSERT, test phải đỏ (đó chính là mục đích bài này).

## Phụ lục — "Để dành v1" (vượt phạm vi v0, KHÔNG đưa vào contract test bây giờ)

1. **[V1-L1] Gặp nhau 2 lần:** xe A đều 12 m/s, xe B xuất phát sau tại cùng vị trí với a = 2 m/s² — B vượt A rồi A không bao giờ bắt lại (chỉ 1 nghiệm), nhưng biến thể "B chậm dần" cho 2 nghiệm gặp hợp lệ ⇒ cần query `meet_times` (mảng) — điểm mở §15.3 spec Lý.
2. **[V1-L2] Toạ độ 2D một câu hỏi:** "xác định vị trí (x, y) của vật ném xiên tại t = 1 s" — cần `position2d_at` (điểm mở §15.5); v0 phải tách 2 query position_at (axis x, axis y).
3. **[V1-H1] Bài liên hoàn khử oxit + nước vôi:** khử 16 g Fe2O3 bằng CO rồi DẪN toàn bộ CO2 vào nước vôi trong dư, tính m kết tủa CaCO3 (= 0,3 mol × 100 = 30 g) — cần trộn TUẦN TỰ 2 mix (R49 rồi R29), v1 §15 spec Hóa.
4. **[V1-H2] CO2 + NaOH theo tỉ lệ:** sục 0,15 mol CO2 vào 200 ml NaOH 1M (tỉ lệ 1 < n(NaOH)/n(CO2) = 4/3 < 2 ⇒ tạo CẢ 2 muối Na2CO3 0,05 mol + NaHCO3 0,1 mol) — nằm trong danh sách "ứng viên v1" cuối §8.4 spec Hóa, DB v0 chưa có record CO2+NaOH.
