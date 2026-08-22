# Phản biện CODE — 4 chương Lý mới (commit d62e101)

> Kỷ luật: TIN SỐ KHÔNG TIN LỜI. Rebuild kernel-dist TỪ SOURCE ĐÃ COMMIT
> (`node scripts/build-kernel.mjs`, 660 KB), import `runWaves/runEfield/
> runAcCircuit/runGasHeat` từ bundle, **tính lại tay ĐỘC LẬP** ~130 phép
> (Math + phân số) rồi đối chiếu `text/approx/approximate`. KHÔNG tin test
> có sẵn. Script kiểm ở scratchpad (`w*.mjs, e*.mjs, ac*.mjs, g*.mjs`).
>
> **Kết luận sớm: KHÔNG có CAO.** Lõi toán 4 chương VỮNG — không sai công
> thức/dấu/đơn vị; exact/approximate trung thực; abstain gate + violation vật
> lí bắn đúng; π triệt tiêu và căn thuần đều exact chuẩn. 1 VỪA (lỗ hổng abstain
> khí-nhiệt) + 3 THẤP (nhãn/self-check tauto).

---

## 1. SÓNG CƠ & SÓNG ÂM — khớp 5/5 vàng (+~25 biến thể), tất cả ĐÚNG

Tính lại tay khớp 100%: v=λf (5), dB exact 60/65 + I=√10/10⁶ (L=65), đếm giao
thoa hai-cách (max 7, min 6, a nguyên→5, a=10⁶→1 999 999), cos-lưới
(u=A, u=0 tại π/2, dấu chiều +x/−x cho u=±2 đúng), sóng dừng (λ=4/5, 4/3;
bụng/nút two-fixed vs one-free), Δφ=π/2, vân (cực đại bậc 6 / cực tiểu giữa 5–6),
nguồn điểm P → I=1/(4π) PiScalar, ΔL=−20 exact vs −6,02 float, r=10 exact.

**Điểm son (KHÔNG sửa):**
- **Nguồn dư auto-assert** `v=λf`: khai lệch (v=6, λf=5) → `nguon-du-lech`, KHÔNG
  serve; khớp → serve. Redundant f/T cũng bắt (T=0,2 lệch f=10).
- **Abstain λ vô tỉ**: `spaceCoeff:3` → λ=2π/3 float → `interference_count` trả
  `lambda-vo-ti`, KHÔNG đếm bừa.
- **recognizeConstant khôi phục exact TỪ float ĐÚNG**: cos(π/5) off-lưới →
  `1/4 + √5/4` (= (1+√5)/4, khớp 1e-10) đánh exact — không phải exact-giả.
- dB tách nhánh: lũy thừa √10 → exact; ngoài → float `approximate:true`.

Không tìm được lỗi. Đường phase = ωt − dir·kx + φ dấu đúng cả hai chiều.

## 2. ĐIỆN TRƯỜNG — khớp 6/6 vàng (+~15 biến thể), tất cả ĐÚNG

Tính lại tay khớp 100%: Coulomb 0,2 N hút; E đơn 10⁵; đối xứng 3-4-5 → 5,76·10⁴
(+Oy); thẳng hàng 1,8·10⁶ (+Ox) & triệt tiêu E=0; công/hiệu điện thế/thế năng
đúng dấu đại số (A=−4·10⁵ nhận công, W=−10⁻⁴ giảm); cân bằng 2·10⁴; speed_after
2, a=1, F=10⁻³; V/cm & toạ-độ-cm (F=10 N tại 3cm); potential_at 4500; field_symmetric
60° → 10⁷√3 (đúng với r=0,03 m — cơ chế "300000√3" chuẩn: radicand 3 sống).

**Điểm son (KHÔNG sửa):**
- **Gate chồng chất CHẶN exact-giả**: tam giác thường → schema reject; **cặp
  đẳng cự nhưng r vô tỉ** (P(0,5;0,5) với A(0,0)/B(1,0), r=√0,5) → abstain
  `none` (đúng — `isSymmetricRational` đòi radicand 1, loại tam giác đều).
- `field_symmetric` |q_A|≠|q_B| → reject; opposite-charge đẳng cự vẫn tính
  đúng vector ngang 4,32·10⁴ (+Ox).
- Đổi đơn vị hữu tỉ EXACT mọi đường (µC/nC/pC, V/cm, kV, cm/mm toạ độ).

### [THẤP-1] Nhãn hướng `(dọc trục đối xứng)` cứng, sai cho cặp trái dấu
`fieldAt` nhánh `symmetric_rational` LUÔN nối chuỗi `... (dọc trục đối xứng)`.
Với hai điện tích **trái dấu** đẳng cự (A +1µC, B −1µC, P trên trung trực), hợp
lực là **+Ox** (⊥ trục đối xứng Oy) nhưng vẫn ghi "dọc trục đối xứng".
Tái hiện: `e2.mjs` case "SYMM opposite 3-4-5" → `dir="theo chiều dương trục Ox
(dọc trục đối xứng)"`. **Số ĐÚNG** (43200, +Ox); chỉ cụm chú thích cuối sai.
Cụm `axisPhrase` chính vẫn đúng. Cosmetic.

## 3. ĐIỆN XOAY CHIỀU RLC — khớp 5/5 vàng (+~45 phụ/nghịch), tất cả ĐÚNG

Tính lại tay khớp 100%. **A1** (f=50, R=100√3, L=2/π, C=10⁻⁴/π): ω=100π, Z=200,
Z_L=200, Z_C=100, I=1, I₀=√2, cosφ=√3/2, φ=π/6, P=100√3, U_R=100√3, U_L=200,
U_C=100, U_nguồn=200; `i = √2cos(100πt − π/6)`. **A5** f₀=50 exact; is_resonance
tại f=60 → ratio 36/25 `[tinh_cam_khang]`. Cộng hưởng thật (Z_L=Z_C) → ratio 1
`[cong_huong]`, Z=R, cosφ=1. solve_resonance C=1/(10000π), L=1/π. f₀ dính căn
L=2/π,C=10⁻⁴/π → 25√2. U0-path (U0=200√2→U=200), omega trực tiếp, Z=125 literal
(R=75→cosφ=3/5, φ float off-lưới). write_voltage L/C/R pha ±π/2 đúng
(`200√2cos(…+π/3)`, `100√2cos(…−2π/3)`, `100√6cos(…−π/6)`).

**Điểm son (KHÔNG sửa):**
- **π triệt tiêu** qua `toLC{overPi}`: Z_L=ωL, Z_C=1/(ωC) rụng π → hữu tỉ+căn
  thuần exact; nhánh C (L=0,5 thập phân) → Z_L=50π giữ exact, Z gộp khác-bậc →
  **float trung thực** `approximate:true` (KHÔNG bịa).
- **VỪA-1 phản biện đã áp**: `is_resonance`/`resonance_frequency`/`solve f` thiếu
  L hoặc C → schema reject (chặn ÷0). Đã xác nhận reject.
- **Minus U+2212** nhất quán: `write_current`/`phase_diff` âm dùng `−` (soi byte),
  KHÔNG `-` U+002D.
- φ off-lưới (cosφ=7/25) → **KHÔNG** recognize bừa: φ trả số thô `−1.426`
  `approximate:true`, trong khi cosφ=7√2353/2353 vẫn exact (nhất quán).
- Assert dư sai (P=999) → violation ok:false; đúng (173,2) → ok.

### [THẤP-2] K1–K5 là kiểm TỰ-NHẤT-QUÁN, không phải kiểm khớp đề
`acCheck` K1 (U_R²+(U_L−U_C)²=U²), K2, K4 (U=IZ, cos²+sin²=1) **cưỡng bức về 0**
theo định nghĩa Z=√(R²+dZ²), I=U/Z → residual luôn exact 0. Bắt được tràn số /
lệch exact-float, KHÔNG bắt được dịch-sai-đề. Code ĐÃ ghi rõ điều này ("engine TỰ
NHẤT QUÁN … KHỚP ĐỀ là việc asserts") ⇒ không ngộ nhận. Ghi để reviewer sau không
tưởng K1–K5 = chứng thực đúng đề. Guard đúng thật là `certify` (exact vs float độc lập).

## 4. KHÍ LÍ TƯỞNG + NHIỆT — khớp 5/5 vàng (+~20 nghịch), số ĐÚNG 100%

Tính lại tay khớp 100%: **heat đun lỏng 20→80 = 252000 J, KHÔNG cộng latent**
(điểm nóng chính — PASS); băng qua mốc mới cộng: đá −10→nước 20 = 439000, đá
−10→hơi 120 = 3 075 200, nóng chảy 0→0 = 334000, lỏng 50→hơi 120 = 2 510 200.
Cân bằng 2 vật 60°C; 3 vật khác chất → 1300/43 = 30,23°C. Clapeyron p=99720,
n=32000/32409, mass=896000/32409 g. Quá trình đẳng nhiệt (p2=2 atm), đẳng áp
(V2=2 L), đẳng tích (+273: p2=4/3 atm). mass_from_heat m=3, c=6300, T0=20°C.
pFromDepth p=2·10⁵ → T=20000/831 K.

**Violation vật lí bắn ĐÚNG (không serve):** T(K)≤0 (−300°C), chiều gia nhiệt
nghịch (80→20), đẳng-nhiệt mâu thuẫn (T đổi), khối-lượng-âm / t-cb-ngoài (Tf bất khả).
Thiếu latentMelt khi băng qua mốc → **error** (KHÔNG im lặng cộng 0).

**Điểm son (KHÔNG sửa):** +273 (KHÔNG 273,15 — chủ đích SGK D34-f) exact; đổi
đơn vị hữu tỉ; over-count **logic** đúng (crossings khớp mọi ca thật); mmHg 101325/760.

### [VỪA-1] Lỗ abstain: `heat` TIN nhãn pha, KHÔNG đối chiếu mốc nóng chảy/sôi
`solveHeat` xếp đoạn theo RANK(phase) mà **không kiểm nhãn pha có nhất quán với
nhiệt độ** (dùng `meltTemp/boilTemp` — DỮ KIỆN ĐÃ CÓ SẴN). Đề dịch-sai (ngoài
miền vật lí) được **serve đáp im lặng, trông exact**:
- `from={liquid, −10°C}` (nước "lỏng" dưới 0°C) → 20°C: engine cho `1,26·10⁵ J`
  (chỉ 4200·30), bỏ qua đông đặc/latent — **sai, không cảnh báo**. (`g3.mjs` p2)
- `from={solid, 50°C}` (nước "rắn" trên 0°C) → lỏng 60°C: engine **âm thầm bỏ**
  đoạn rắn 50→0 (khoảng âm) rồi +latent+lỏng = `5,86·10⁵ J`, đánh exact. (`g3.mjs` p3)

Đây đúng loại "abstain thủng" (bài NGOÀI miền vẫn serve). Khác các chương: ở đây
CÓ sẵn redundancy (meltTemp/boilTemp) để chặn mà engine bỏ, trong khi vẫn guard
T>0K/chiều/over-count. **Bó hẹp**: bài dịch-ĐÚNG luôn tính đúng — chỉ kích hoạt
khi LLM gán nhãn pha lệch nhiệt độ (GIGO). Đề nghị: thêm check tất định
solid⇒T≤T_nc, gas⇒T≥T_s, liquid⇒T_nc≤T≤T_s (± tol) → violation `nhan-pha-lech`.

### [THẤP-3] Self-check `latent-count` là tautology (không bao giờ fail)
`crossings = (rf<1&&rt≥1)+(rf<2&&rt≥2)` và `latentAdded` tăng ở đúng hai điều
kiện `rf===0&&rt≥1` / `rf≤1&&rt≥2` — **trùng khít** ⇒ `latentAdded===crossings`
theo cấu tạo. Check "chống over-count" pass bằng kiến tạo, không phòng thủ thật.
(Tương tự `equilibrium_backsub`/`kinetic_backsub` efield: thay-ngược trị suy TỪ
chính công thức float ⇒ ~0 by construction.) Không gây sai; chỉ là niềm tin ảo —
guard thật vẫn là `certify` exact-vs-float. Không cần sửa gấp; đừng over-trust.

---

## Bảng bẻ engine (~130 phép tính tay độc lập)

| Chương | Vàng | Nghịch/biến thể | Sai số học | CAO |
|---|---|---|---|---|
| Sóng cơ/âm | 5/5 | ~25 ✓ | 0 | 0 |
| Điện trường | 6/6 | ~15 ✓ | 0 | 0 |
| Điện xoay chiều | 5/5 | ~45 ✓ | 0 | 0 |
| Khí + nhiệt | 5/5 | ~20 ✓ | 0 | 0 |

Không một đáp SỐ nào sai. Mọi exact tôi thử đều là exact THẬT (không float đội
lốt); mọi float đều `approximate:true` trung thực; mọi bài ngoài-miền có redundancy
đều abstain/violation — TRỪ lỗ [VỪA-1] khí-nhiệt.

## VERDICT tổng

- **Sóng cơ**: sạch, ship được.
- **Điện trường**: sạch, ship được (THẤP-1 nhãn tuỳ chọn tỉa sau).
- **Điện xoay chiều**: sạch, ship được (THẤP-2 chỉ là ghi chú self-check).
- **Khí + nhiệt**: ship được cho đề DỊCH ĐÚNG; **cần sửa 1 (VỪA-1)** để bịt lỗ
  abstain nhãn-pha trước khi tin engine tự lọc đề lệch miền. THẤP-3 dọn kèm.

**Tổng: 0 CAO, 1 VỪA (khí-nhiệt nhãn pha), 3 THẤP.** Bốn chương lõi toán vững;
sửa VỪA-1 là đủ tự tin nối route serve.
