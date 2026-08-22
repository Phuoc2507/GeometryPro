# Phản biện đối kháng — Spec Physics Pack v1 "Điện xoay chiều RLC lớp 12"

**Ngày:** 2026-08-22
**Người phản biện:** kỹ sư phản biện spec (geo3d)
**Spec soi:** `docs/superpowers/specs/2026-08-22-physics-pack-v1-ac-circuit.md`
**Kỷ luật:** "TIN SỐ, KHÔNG TIN LỜI" — mọi khẳng định về hành vi code đều **import code THẬT** (`scalar.ts`, `piScalar.ts`, `kinematics.ts`, `recognize.ts`), tái dựng công thức engine §7 và chạy bằng node (esbuild bundle). Script kiểm chứng: `scratchpad/verify.ts`, `verify2.ts`, `verify3.ts`.

---

## 0. TÓM TẮT PHÁN QUYẾT

| Mục | Kết quả |
|---|---|
| 10 bài contract A1–A10 tính lại từ đầu | **KHỚP 10/10** (text · approx · exact · approximate) |
| Khẳng định trung tâm "π triệt tiêu trước dấu căn" | **ĐÚNG — điểm son lớn** (dẫn số §2) |
| Tự kiểm K1 (giản đồ vectơ) / K2 (công suất) residual exact-0 | **6/6 bài = exact 0** (`num === 0n`) |
| Nhánh C (π không triệt tiêu) rơi số trung thực, không giả-exact | **7/7 bộ số = `approximate:true`**, recognize KHÔNG bịa |
| Finding CAO (chặn code / giả-exact / breaking) | **0** |
| Finding VỪA | **2** (is_resonance ÷0 khi khuyết C; ký tự minus lệch chuẩn) |
| Finding THẤP | **3** |
| **VERDICT** | **ĐỦ CHÍN ĐỂ CODE** — xử 2 finding VỪA trong lúc code (đều sửa nhỏ) |

---

## 1. Kết quả tính lại 10 bài đề vàng (A1–A10)

Tái dựng đúng `resolve → ω, Z_L, Z_C, dZ, Zsq, Z, I, cosφ, tanφ, P, φ` theo §7.1–7.2 bằng hàm THẬT
(`mulP/divP/addP/subP/sqrtP`, `certifyPiScalar`, `phaseFromCos` so struct `Exact` theo §3.4). Cột "engine" là
`certifyPiScalar(kq, floatRef)` với floatRef tính độc lập bằng `Math.PI/sqrt`.

| # | Đại lượng chốt (spec) | Engine tính lại | Khớp |
|---|---|---|---|
| A1 | Z_L 200 · Z_C 100 · **Z 125** · I 2 | 200 · 100 · 125 · 2 (đều exact hữu tỉ) | ✅ |
| A2 | **Z 100√2**≈141,42 · **I √2**≈1,41 | `100√2` {100/1·√2} · `√2` {1/1·√2} · cosφ √2/2 · φ −π/4 | ✅ |
| A3 | Z 200 · **φ π/6** · cosφ √3/2 | 200 · `π/6` (phaseFromCos khớp mốc {1,2,3}) · √3/2 | ✅ |
| A4 | **P 480** · **cosφ 12/13** | 480 · 12/13 · (Z 130, I 2) | ✅ |
| A5 | **f₀ 50** · ratio 1 (cong_huong) · I 4 · solve C `1/(10000π)` | 50 · 1 · 4 · `1/(10000π)` {1/10000·π⁻¹} | ✅ |
| A6 | **i = 2cos(100πt − π/4)** (I₀ 2, φ_i −π/4) | I₀ 2 · cosφ √2/2 → φ π/4 · dZ>0 → φ_i −π/4 | ✅ |
| A7 | U_R 60 · U_L 160 · U_C 80 · U 100 | 60 · 160 · 80 · 100 (K1 exact-0) | ✅ |
| A8 | U 100 · I 2 · **I₀ 2√2**≈2,83 | 100 · 2 · `2√2` {2/1·√2} | ✅ |
| A9 | Z 50 · I 12/5 · cosφ 4/5 · P 1152/5 · **φ ≈−0,64 approximate** | 50 · 12/5 · 4/5 · 1152/5 (exact) · φ atan2 −0,6435 `approximate:true` | ✅ |
| A10 | ratio 1 · Z 100 · I 1 · P 100 · cosφ 1 · **i = √2cos(100πt)** | 1 · 100 · 1 · 100 · 1 · I₀ √2 → i `√2cos(100πt)` | ✅ |

**Không có một lệch nào.** Đặc biệt A9 tái hiện đúng cam kết khó nhất: Z/I/cosφ/P **exact đồng thời** với φ **số trung thực** (`approximate:true`) — góc off-grid KHÔNG bị snap.

---

## 2. PHÁN QUYẾT DỨT KHOÁT về "π TRIỆT TIÊU trước khi vào căn"

### Khẳng định của spec (§3, §15.1): ĐÚNG. Dẫn số cụ thể.

Với bộ số kinh điển **L = 1/π H, C = 10⁻⁴/π F, f = 50 Hz** (chạy code thật):

```
ω = 2π·50      : k=1  {num:100,den:1,rad:1}   = 100π   (π SỐNG — đúng, ω có π)
Z_L = ωL       : k=0  {num:100,den:1,rad:1}   = 100    => π TRIỆT TIÊU (hữu tỉ exact)
Z_C = 1/(ωC)   : k=0  {num:100,den:1,rad:1}   = 100    => π TRIỆT TIÊU (hữu tỉ exact)
```

Cơ chế: `L = a/π` khai `{overPi:true}` ⇒ PiScalar `k = −1`; `mulP(ω{k:1}, L{k:−1})` cộng bậc `1+(−1)=0`
⇒ **π mũ 0 = biến mất**, để lại số hữu tỉ trong trường `Scalar`. Từ đó `dZ, Zsq, Z, I, cosφ, P` **toàn bộ k=0**,
căn (nếu có) là **căn thuần Scalar** (Z = √20000 = 100√2, radicand 2) — **π và căn KHÔNG bao giờ cùng sống trong một số**.

**Cộng hưởng f₀ = 1/(2π√(LC)) cũng triệt tiêu (dẫn số):**
```
LC        : k=−2  {1/10000}         √(LC) : k=−1  {1/100}
2π√(LC)   : k=0   {1/50}      => π TRIỆT TIÊU qua sqrtP(k=−2)→k=−1 rồi mulP(2π, k=−1)→k=0
f₀=1/(…)  : k=0   {num:50}    = 50 Hz exact
```

### Kiểm chứng NGHIÊM NGẶT hơn cả spec: π triệt tiêu KHÔNG phụ thuộc f "đẹp"

Spec chỉ nêu ví dụ f=50. Tôi thử **f = 60, 40, 25, 100** với cùng L=1/π, C=10⁻⁴/π:

```
f=60 : Z_L=120 (exact)   Z_C=250/3 (exact)  => π triệt tiêu CÓ
f=40 : Z_L=80  (exact)   Z_C=125   (exact)  => π triệt tiêu CÓ
f=25 : Z_L=50  (exact)   Z_C=200   (exact)  => π triệt tiêu CÓ
f=100: Z_L=200 (exact)   Z_C=50    (exact)  => π triệt tiêu CÓ
```

Kết luận mạnh hơn spec: **triệt tiêu chỉ phụ thuộc L, C khai dạng `a/π`, KHÔNG phụ thuộc f**. f xấu chỉ làm số hữu tỉ xấu hơn (250/3), vẫn exact.

### Có ca đề thi nào π SỐNG dưới căn mà spec vẫn khẳng định exact (giả-exact)? — KHÔNG. Có HAI lớp phòng vệ.

1. **Chặn từ SCHEMA:** `LCValue.overPi` là `boolean` ⇒ bậc π chỉ ∈ {0, −1}. **Không có cách nhập `1/π²`** (k=−2) — mà đó là điều kiện cần để Z_L hoặc Z_C giữ bậc π ≠ 0 sau khi nhân/chia với ω. Người ra đề **không thể** tạo "π dưới căn" qua schema.
2. **Chặn từ SỐ HỌC (kể cả ép tay):** giả sử L thập phân thuần (Z_L k=1) + C = a/π (Z_C k=0):
   ```
   dZ = subP(Z_L{k:1}, Z_C{k:0})  → KHÁC BẬC → addP COLLAPSE → {exact:null, k:0}  (float trung thực)
   Zsq= addP(R²{k:0}, dZ²)         → dZ đã null → Z exact=null → approximate:true
   ```
   Và R **không bao giờ mang π** (SurdRat → Scalar thuần). Vậy `R²` luôn k=0, còn `dZ²` nếu mang π sẽ có bậc chẵn ≥2 ⇒ `addP(k=0, k≥2)` **khác bậc → collapse float**. **Không tồn tại đường nào để √(R²+…) giữ exact với π còn sống dưới căn.**

Nhánh C (§3.3) đã kiểm 7 bộ số thập phân thuần — **tất cả `approximate:true`, `exact=null`**, và `recognizeConstant` **không bịa** dạng đẹp nào (Z ≈ 160,27 / 149,76 / 101,47 … đều rơi số). Đây là hành vi **trung thực đúng thiết kế**.

> **Điểm son:** khẳng định trung tâm không những đúng mà còn được bảo vệ **hai tầng độc lập** (schema + collapse của `addP`). Đây là lý do chính khiến pack tái dùng gần hết `piScalar.ts`/`scalar.ts` và không cần cơ chế "lift Scalar tại k=0".

---

## 3. Tự kiểm K1/K2 — residual EXACT-0 (kiểm số)

`verify3.ts` tính residual trực tiếp từ đáp (chiều ngược §9):

```
        K1 = U_R² + (U_L−U_C)² − U²        K2 = I²R − U·I·cosφ
A1      exact {0/1·√1}  EXACT-0 ✓          exact {0/1·√1}  EXACT-0 ✓
A2      exact {0/1·√1}  EXACT-0 ✓          exact {0/1·√1}  EXACT-0 ✓
A4/A7   exact {0/1·√1}  EXACT-0 ✓          exact {0/1·√1}  EXACT-0 ✓
A9      exact {0/1·√1}  EXACT-0 ✓          exact {0/1·√1}  EXACT-0 ✓
A3(R√3) exact {0/1·√1}  EXACT-0 ✓          exact {0/1·√1}  EXACT-0 ✓
```

`residual.s.exact.num === 0n` **thật** (không phải "sát 0 theo EPS"). Cột `approx` đôi lúc ~1e-11 do đường float độc lập,
nhưng **struct exact là 0** ⇒ check pass exact-0 như spec §9 cam kết. `phaseFromCos` 5 mốc + off-grid cũng đúng:

```
cos 1 → 0 · cos √3/2 → π/6 · cos √2/2 → π/4 · cos 1/2 → π/3 · cos 0 → π/2
cos 4/5 → null (=> atan2 số, approximate:true) · cos 3/5 → null
```

---

## 4. FINDINGS xếp hạng

### CAO — (không có)

Không tìm thấy lỗi chặn code, giả-exact, hay breaking. Khẳng định trung tâm vững; 10/10 bài khớp; tự kiểm exact-0.

### VỪA-1 — `is_resonance` chia 0 khi mạch KHUYẾT C (RL), bất đối xứng

`ratio = divP(Z_L, Z_C)`. Khi mạch **RL** (khuyết C ⇒ Z_C = 0):
```
ratio = Z_L / 0 = Infinity  →  certifyPiScalar → text "(lỗi)", approx=Infinity, approximate:true
```
`ok = answers.every(Number.isFinite(approx))` ⇒ **toàn result `ok:false`**, thông điệp `(lỗi)` không tường minh.
Bất đối xứng: mạch **RC** (khuyết L ⇒ Z_L=0) cho `ratio = 0/100 = 0` **hữu hạn, không lỗi**.

`§6.3` superRefine mục 2 **chỉ** bắt `resonance_frequency`/`solve_resonance` đòi cả L và C — **KHÔNG bắt `is_resonance`**.
Đề "mạch RL có cộng hưởng không?" vô nghĩa vật lý nhưng qua được schema.

**Sửa (chọn 1):**
- (a) Thêm `is_resonance` vào danh sách `§6.3` đòi **cả L và C** (nhất quán, thông điệp rõ "cần cả L và C để xét cộng hưởng"); HOẶC
- (b) Định nghĩa `is_resonance` khi khuyết một phần tử ⇒ `verdict` theo dấu dZ (RL → `tinh_cam_khang`, RC → `tinh_dung_khang`) và `ratio`/`approx` trả **số hữu hạn** (ví dụ dùng `|Z_L−Z_C|` hoặc gán ratio=∞→"không cộng hưởng" nhưng approx hữu hạn để không lật `ok`).
- Khuyến nghị **(a)** — đơn giản, khớp triết lý abstain.

### VỪA-2 — Ký tự minus lệch chuẩn ⇒ contract test sẽ ĐỎ

`displayPiScalar` (và mọi hiển thị số âm) dùng `'-'` = **U+002D** (ASCII hyphen). Spec §11 viết mẫu bằng `'−'` = **U+2212**
(`"i = 2cos(100πt − π/4)"`, `expr.phase:"−π/4"`, `"−0,6435"`). Kiểm số:
```
displayPiScalar(−π/4) = "-π/4"   char codes: 45,960,47,52     (U+002D)
spec mẫu                "−π/4"   char codes: 8722,960,47,52   (U+2212)
```
`ac-contract.test.ts` so `text` engine với chuỗi mẫu ⇒ **A2/A6/A9 (mọi φ/pha âm) fail** nếu bỏ qua.

**Sửa:** chốt MỘT ký tự minus cho toàn pack AC. Hoặc (i) `acCompute` normalize sang U+2212 khi ráp `write_*`/`phase_diff`
(và sửa mẫu §11 cho nhất quán), hoặc (ii) engine giữ U+002D và **sửa mọi chuỗi mẫu §11 sang U+002D**. Ghi rõ trong spec để test khớp ngay.

### THẤP-1 — Mạch KHUYẾT R (thuần L / C / LC) qua schema nhưng ngoài scope §4

`§6.3` mục 2 chỉ đòi "≥1 trong {R,L,C}" ⇒ mạch thuần L **pass schema**, nhưng §4 chỉ liệt kê "RL, RC, RLC, hoặc thuần R".
Kiểm số mạch thuần L: `Z=100 exact · cosφ=R/Z=0 exact · phaseFromCos(0,+1)=π/2` — **đúng vật lý** (φ=+π/2), P=0.
Nhưng `tanφ = dZ/R = 100/0 = Infinity` (exact=null, KHÔNG throw). An toàn **chỉ khi** φ đi qua `cosφ` path như §7.2 quy định.
**Sửa:** (i) làm rõ scope §4 có/không nhận mạch khuyết R; (ii) ghi chú code: `phase_diff`/`write_*` phải lấy φ từ `phaseFromCos(cosφ)` — **không** dùng `tanφ` khi R=0 (tránh Infinity lọt xuống `answers.approx` → lật `ok`).

### THẤP-2 — Fallback φ nên là số THÔ, không qua `recognizeConstant`

`§7.2`: `φ = phaseFromCos(...) ?? {s:num(atan2), k:0}`. Nếu chuỗi `certifyPiScalar` chạy trên PiScalar này thì
`recognizeConstant(atan2)` có thể "cứu" một góc thành `kπ/m` (den ≤ 64). Kiểm số: recognize **bắt** `π/6` (|Δ|=0) nhưng
**trượt** −0,6435 (A9), 0,3948 (A4). Thực tế **nhất quán** — mọi φ=π/m ⟺ cosφ trên lưới ⟺ `phaseFromCos` đã bắt TRƯỚC,
nên fallback chỉ nhận góc xấu → recognize trượt → số. Rủi ro chỉ là **lý thuyết**. Đề nghị (phòng thủ, khớp §3.4/§8 "off-grid → số"):
fallback φ trả **số thô** (`fmtNum` + `approximate:true`), **không** đi qua `recognizeConstant`.

### THẤP-3 — U₀ số nguyên ⇒ U = U₀/√2 không "tròn" (lưu ý translator)

Kiểm số: `U₀=200 → U=100√2` (exact ✓); `U₀=311 → U=311√2/2 ≈ 219,91` (**không** = 220). Đúng toán học, **không phải lỗi engine**.
Nhưng few-shot §6.5 phải dạy: đề "u = 220√2·cos…" khai `U0:{n:220,rad:2}` (⇒ U=220 exact), **tuyệt đối không** khai `U0:311`.
Ghi rõ để tránh dịch "u = 311cos…" thành U hiệu dụng lệch.

---

## 5. Kiến trúc — additive, không breaking (xác nhận)

- Thư mục `api/_lib/kernel/physics/` đã có **dc-circuit** (`runCircuit.ts`, `circuitSchema.ts`, `circuit*.ts`) và **oscillation**
  (`runOscillation.ts`, `oscillationSchema.ts`, …) ship theo đúng pattern **entry riêng**. `piScalar.ts` đã tồn tại (dao động merge rồi)
  ⇒ AC code được ngay, không vướng thứ tự merge.
- Kế hoạch §5 (thêm `acSchema.ts` + `acCircuit.ts` + `acCompute/acCheck/acLayout/runAcCircuit.ts`) **chỉ CỘNG file**, chỉ **IMPORT**
  `piScalar.ts`/`scalar.ts`/`kinematics.ts` (không sửa). Mirror `runCircuit.ts` (đã đọc): schema riêng, `try/catch` → `errors[]`,
  `ok = violations==0 && errors==0 && answers đủ && mọi approx hữu hạn`. **Không đụng** `planSchema.ts`/`runPhysics.ts` v0. Phù hợp ranh giới CỨNG §5.
- Exports `piScalar.ts` đủ cho AC (`PiScalar, approxP, isZeroPi, scalarToPi, TWO_PI, mulP/divP/addP/subP/sqrtP, displayPiScalar,
  certifyPiScalar, toPiScalar, PiRat, EXACT_COS`); `phaseFromCos` chỉ **đọc** struct `Exact` (import type từ `../scalar`) — **không cần sửa** `piScalar.ts`. ✅

## 6. Cổng abstain (§4) — đánh giá

- Ranh giới **cực trị / song song / máy biến áp / truyền tải / ba pha / cuộn dây (r,L)** liệt kê tường minh + few-shot abstain P2 (§6.5). Hợp lý.
- **Phòng tuyến máy (§4):** số đo dư ⇒ `asserts` (TOL_ASSERT 1e-3), lệch ⇒ violation `ok:false`. Đây là lưới bắt LLM "ép" bài cực trị/song song về RLC tĩnh — mirror dc-circuit CI-2 đã ship. Vững.
- Giản đồ Fre-nen / độ lệch pha off-grid / công suất: **không có chỗ nào bịa float thay cho exact** — φ off-grid `approximate:true` trung thực (A9 kiểm số); `phasor`/`charts` khai rõ "dữ-liệu-chờ-UI" (D6). Đạt.

---

## 7. VERDICT

> ## ĐỦ CHÍN ĐỂ CODE.

Khẳng định sống-còn của spec — **"π triệt tiêu trước dấu căn nên exact được bảo toàn"** — được **số thật xác nhận tuyệt đối**,
và còn được bảo vệ **hai tầng** (schema `overPi:boolean` + `addP` khác-bậc-collapse). 10/10 bài contract khớp từng con số;
tự kiểm K1/K2 residual **exact-0**; nhánh C rơi số **trung thực** (không giả-exact); `phaseFromCos` inverse-trig lưới chuẩn xác;
kiến trúc **additive** mirror dc-circuit, không breaking.

**Trước/trong lúc code, xử 2 finding VỪA (đều sửa nhỏ):**
1. Thêm `is_resonance` vào superRefine §6.3 đòi **cả L và C** (chặn ÷0 khi khuyết C).
2. Chốt **một ký tự minus** (khuyến nghị U+2212 cho text engine + đồng bộ mẫu §11) để contract test khớp ngay.

3 finding THẤP là **làm-rõ/phòng-thủ** (scope mạch khuyết R; fallback φ số-thô; lưu ý translator U₀), không chặn code.

---

### Điểm son ghi nhận

1. **π-triệt-tiêu hai tầng phòng vệ** — không tồn tại đường giả-exact với π dưới căn (schema + số học chặn độc lập).
2. **Triệt tiêu độc lập f** — mạnh hơn spec tuyên bố (kiểm f=60,40,25,100 vẫn hữu tỉ exact).
3. **Tự kiểm K1/K2 residual `num===0n`** — exact-0 thật, không EPS trá hình.
4. **Nhánh C trung thực tuyệt đối** — 7/7 bộ số `approximate:true`, `recognizeConstant` không bịa.
5. **Tái dùng đúng-mức** `piScalar.ts`/`scalar.ts` — phần toán mới ~200 dòng (`phaseFromCos` + resolve + float-certify), không phát minh lại.
6. **A9 chốt hành vi khó nhất** — exact (Z/I/cosφ/P) **đồng thời** φ số-trung-thực off-grid, không snap.

*Mọi số trong báo cáo kiểm bằng `scratchpad/verify{,2,3}.ts` — import trực tiếp code production `api/_lib/kernel/{scalar,physics/piScalar,physics/kinematics,analysis/recognize}.ts`, bundle esbuild, chạy node ngày 2026-08-22. KHÔNG sửa spec, KHÔNG sửa code, KHÔNG chạy full test suite.*
