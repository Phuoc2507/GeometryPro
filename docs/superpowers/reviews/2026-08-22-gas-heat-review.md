# Phản biện spec khí lí tưởng + vật lí nhiệt (22/08)

> Kỷ luật "TIN SỐ, KHÔNG TIN LỜI": chạy `scalar.ts` THẬT của repo qua `tsx`, chép
> `scalarFromNumber` y hệt `kinematics.ts:13`, tái dựng engine theo spec §5 (đơn vị
> + R + 273) và §7 (công thức đóng), tính lại TỪ ĐẦU cả 10 bài vàng + dò các vùng
> spec KHÔNG test. Script: `scratchpad/verify.ts`, `scratchpad/adversarial.ts`.

---

## 0. VERDICT

**ĐỦ CHÍN VỀ CỐT LÕI — cần chốt 1 việc CAO + 2 việc VỪA + vài việc THẤP trước khi code.**
Không có lỗi thiết kế nền. Toán đã kiểm 11/11 exact, kiến trúc pack độc lập ĐÚNG chuẩn
nhà (soi gương circuit/dynamics/chem), và — quan trọng nhất cho câu hỏi sống-còn của
task — spec **TRUNG THỰC tuyệt đối về exact/float**: không có "float giả exact". Việc
CAO duy nhất nằm ở `heat` piecewise (§7.2) chưa đặc tả chặt biên đoạn + test quá mỏng.

| Hạng | Số việc | Nội dung |
|---|---|---|
| CAO | 1 | H1: `heat` §7.2 mơ hồ biên đoạn + không có self-check chặn cộng-thừa latent + chỉ test 1 ca full-chain (rủi ro "âm thầm trả sai") |
| VỪA | 2 | H2: `mass_from_heat` property `T0`/`c` có trong schema nhưng §7.1 thiếu công thức + không test · H3: bộ vàng bỏ trống nhiều nhánh abstain/gate |
| THẤP | 3 | H4: lệnh "thêm gasHeat vào tsconfig.kernel.json" (§4) thừa & phạm luật additive · H5: mmHg hardcode 101325/760 lệch quy ước atm=10⁵ · H6: equilibrium_temp check strict `min<Tf<max` từ chối oan ca hai vật cùng nhiệt độ |

---

## 1. Kết quả tính lại (máy — scalar.ts thật): 11/11 KHỚP

Chép `scalarFromNumber` từ `kinematics.ts:13`, dựng `qtyPressure/qtyVolume/qtyTemp(+273)/qtyMass`,
`R=rat(831n,100n)`, giải công thức đóng §7, rồi so `text` (displayScalar) + `approx` +
`exact.radicand` + residual thay-ngược.

| # | Ẩn | text engine | ≈ | radicand | residual thay-ngược | Khớp spec? |
|---|---|---|---|---|---|---|
| G1 đẳng nhiệt nén | V₂ | `12/5` | 2,4 | **1** (hữu tỉ) | `0` exact (num=0n) | ✓ |
| G2 bọt khí (p₀+ρgh) | V₂ | `2` | 2 | 1 | `0` exact | ✓ (p_đáy=200000 đúng) |
| G3 đẳng tích nung | p₂ | `8/3` | 2,6667 | 1 | `0` exact | ✓ (T₁=300,T₂=400 K) |
| G4 đẳng áp đun | V₂ | `18/5` | 3,6 | 1 | `0` exact | ✓ |
| G5 pt trạng thái | V₂ | `6` | 6 | 1 | `0` exact | ✓ |
| G6a Clapeyron | n | `1/3` | 0,3333 | 1 | `0` exact | ✓ (pV=831, RT=2493) |
| G6b Clapeyron | m | `32/3` | 10,6667 | 1 | — | ✓ |
| G7 cân bằng nhiệt | t_cb | `44` | 44 | 1 | `0` exact | ✓ (T_fK=317) |
| G8 thả sắt tìm m | m | `28/23` | 1,2174 | 1 | `0` exact | ✓ |
| G9 chuỗi đá→hơi | Q | `308100` | 308100 | 1 | — (4 đoạn 2100/34000/42000/230000) | ✓ |
| G10 bẫy đơn vị | p₂ | `480000` | 480000 | 1 | `0` exact | ✓ (V₂ đổi 500 L→1/2 m³) |

**10/10 bài (11/11 ý) khớp text + approx + exact-hữu-tỉ + residual-0-exact.** Không bài nào
rời ℚ, không chạm `sqrt`/`solver1d`/trần radicand. Tuyên bố §12 "đã chạy máy 10/10" và §15
tiêu chí 1–4 là THẬT, không thổi phồng.

---

## 2. CÂU HỎI SỐNG-CÒN — exact hay float giả? → SPEC HOÀN TOÀN TRUNG THỰC

Task lo: "8,31 và 24,79 là số thập phân → đáp có exact được không, hay buộc float? Spec có
khẳng định exact ở chỗ thực chất là float không?"

**Trả lời dứt khoát (đã kiểm máy):** số thập phân HỮU HẠN là số HỮU TỈ chính xác, KHÔNG phải
số vô tỉ. Chỉ vô tỉ (√, π) mới ép float. `scalarFromNumber` biến mọi mantissa ≤9 chữ lẻ thành
phân số exact:

```
scalarFromNumber(8.31)  → 831/100    (radicand=1)   ← G6: pV = 10⁵·831/100000 = 831 exact
scalarFromNumber(24.79) → 2479/100   (radicand=1)
scalarFromNumber(8.314) → 4157/500   (radicand=1)
scalarFromNumber(273.15)→ 5463/20    (radicand=1)
scalarFromNumber(0.1)   → 1/10       (radicand=1)   ← G9: m=0,1 kg exact
```

Spec §2 chẩn đoán ĐÚNG bản chất: "hai chương này là **đại số HỮU TỈ TUYẾN TÍNH** — không căn,
không bậc 2 ⇒ nghiệm là một phép chia hữu tỉ, exact 100%". Cơ chế `certifyScalar`/`mkGHAns`
(so exact với float ĐỘC LẬP) còn là lưới chống "exact giả": nếu số học exact sai, nó bị hạ
`approximate:true`, không phục vụ phân số sai. Đây là **điểm son lớn nhất** — đúng thứ dự án
thề làm, và spec không nói dối một chữ nào về exact.

> Ghi chú 24,79: task nhắc "thể tích mol 24,79 (đã chốt D-decision)" — nhưng hằng này thuộc
> **pack HOÁ** (`chem/stoich.ts:14` `rat(2479n,100n)`), KHÔNG phải pack lý này. Spec khí-nhiệt
> dùng R=8,31 + Clapeyron `pV=nRT` trực tiếp (đường vật lí đúng cho GDPT 2018 lớp 12), KHÔNG
> đụng 24,79. Đây là **tách môn đúng**, không phải thiếu sót. Cả hai hằng đều exact như nhau.

---

## 3. KIẾN TRÚC — pack độc lập ĐÚNG CHUẨN (điểm son)

- Spec §4 khai **chỉ tạo mới** `gasHeatSchema.ts` + `gasHeat.ts` + `gasHeatCompute.ts` +
  `runGasHeat.ts` + `__tests__/`, entry riêng `runGasHeat`, **KHÔNG đụng** `planSchema.ts`/
  `runPhysics.ts`/`kinematics.ts`/`circuit*`/`dynamics*`/`oscillation*`/`efield*`/`index.ts`.
  Đây ĐÚNG lỗi mà review sóng-cơ (W1) vừa bắt: chương kia nhét op vào `planSchema.ts`+`runPhysics.ts`
  gây breaking 1072 test. **Spec khí-nhiệt KHÔNG lặp lỗi đó** — tách sạch từ đầu.
- Đã đối chiếu: `runDynamics.ts` có contract `{ok, answers, checks, violations, errors,
  geometry, charts, meta}`, import `PHYSICAL_VIOLATIONS` từ module pack, `EPS_SELF=1e-6`,
  `TOL_ASSERT=1e-3`, `mkAns(kind,s,floatRef,unit,label?)` — spec §7–§9 sao khuôn **chính xác**
  (GasHeatResult bỏ `charts`, hợp lí vì nhiệt không có chuỗi thời gian).
- Tiền lệ đã có trong repo: **pack `chem/`** (`planSchema.ts`+`stoich.ts`+`runChem.ts`) đã ship
  và test contract khẳng định `rat(1n,10n)`, `.text` chứa "24,79" — chứng minh mô hình
  "thập phân → hữu tỉ exact + pack độc lập" đã chạy production. Spec đi đúng vết này.

Kết luận kiến trúc: **không có finding breaking.** Ranh giới cứng khai đúng, đủ để nhiều agent
chạy song song.

---

## 4. CỔNG "TỪ CHỐI THAY VÌ BỊA" — mạnh ở khí, còn lỗ ở nhiệt

Mặt mạnh (§6.3 + §8): gate "đúng-một-ẩn" cho quá trình (0 hoặc >1 blank ⇒ abstain), chặn
trộn chuyển-thể-vào-cân-bằng (R3 phi tuyến), `PHYSICAL_VIOLATIONS` (T≤0 K, p/V≤0, t_cb ngoài
khoảng, m≤0) ⇒ không serve. Miền vật lí khai tường minh. Đó là khung abstain tốt.

**Lỗ cần vá — xem H1/H2/H3.** Chỗ engine CÓ THỂ âm thầm trả sai nằm ở `heat` piecewise, vì
các self-check hiện có (residual, "mỗi đoạn ≥0") **KHÔNG** bắt được lỗi cộng THỪA một đoạn
latent (cộng thừa λm vẫn cho Q>0, vẫn "mỗi đoạn ≥0").

---

## 5. FINDINGS

### [H1 — CAO] `heat` §7.2: biên đoạn đặc tả mơ hồ + không self-check chặn cộng-thừa + test mỏng

**Vấn đề.** §7.2 mô tả 5 đoạn bằng văn xuôi: "nóng chảy: λ·m **nếu vượt mốc T_nc**", "hoá hơi:
L·m **nếu vượt mốc T_s**". Điều kiện "nếu vượt mốc" KHÔNG ràng buộc theo PHA. Một người code
hiểu "vượt mốc" = `to.temp > T_nc` (thay vì "đoạn [from,to] BĂNG QUA điểm nóng chảy, tức
from ở rắn") sẽ cộng NHẦM λm cho cả bài **đun nước lỏng thuần** (lỏng 20°C→80°C): đúng phải
`Q=mcΔt=25200 J`, sai thành `25200+34000=59200 J`. Đã dựng máy cả hai ca:
- partial (rắn −10→lỏng 50): công thức §7.2 cho **57100 J đúng** (2100+34000+21000) ✓
- lỏng-only (20→80): công thức đúng cho **25200 J**, nhưng prose "nếu vượt T_nc" dễ làm sai.

**Vì sao CAO.** (a) Đây là NHÁNH duy nhất trong pack có logic không tầm thường; (b) các self-check
§8 (residual thay-ngược, "mỗi đoạn ≥0") **KHÔNG guard** lỗi over-count latent — cộng thừa vẫn
pass hết; (c) bộ vàng CHỈ có G9 (full-chain 4 đoạn) — 0 ca đơn-đoạn-qua-`heat`, 0 ca nóng-chảy-
thuần, 0 ca partial dừng giữa pha, 0 ca chạm đúng mốc boil. Tức đúng chỗ dễ sai nhất lại mỏng
test nhất ⇒ khớp cảnh báo task "engine âm thầm trả sai".

**Sửa cụ thể (trước khi code):**
1. §7.2 đặc tả lại mỗi đoạn bằng VỊ TỪ pha+ngưỡng tường minh (đóng đoạn theo giao khoảng
   enthalpy), ví dụ: đoạn nóng-chảy có mặt **iff** `from.phase==='solid' && to nằm ≥ lỏng`
   (dùng `from.phase`/`to.phase` PhasePoint đã khai + so `T_nc`); đoạn hoá-hơi iff
   `from ≤ lỏng && to nằm ≥ hơi`. Ghi rõ đoạn cảm-nhiệt lỏng chỉ tính trong `[max(from,T_nc), min(to,T_s)]`.
2. Thêm **self-check chống over-count**: ép ràng buộc "số mốc chuyển thể cộng vào = số mốc mà
   đoạn [from,to] THỰC SỰ băng qua" (đếm mốc theo pha đầu/cuối), else violation.
3. Mở rộng bộ vàng: +1 ca `heat` đơn-pha (đun nước, ra `mcΔt`), +1 nóng-chảy-thuần (đá 0°C→
   nước 0°C ra `λm`), +1 partial (đá −10→nước 50), +1 chạm biên boil (nước 100→hơi 100).

### [H2 — VỪA] `mass_from_heat` property `T0`/`c`: schema có, §7.1 thiếu công thức + không test

Schema §6 `property: z.enum(['mass','c','T0'])`. Bảng §7.1 CHỈ cho công thức `property=mass` và
`property=c`; **`T0` KHÔNG có dòng công thức nào.** Đã kiểm máy: ẩn T0 GIẢI ĐƯỢC và exact (đảo
ngược G8: tìm T0 sắt = **`100`°C exact**), công thức `T0_k = T_f + Σ_{i≠k} mᵢcᵢ(T_f−T0ᵢ)/(m_k c_k)`.
Nên đây là **lỗ đặc tả**, không phải bất khả thi. Ngoài ra `property=c` có công thức nhưng cũng
KHÔNG có ca test trong bộ vàng.

**Sửa:** hoặc (A) bổ sung §7.1 dòng công thức `T0` + gate §6.3(6) yêu cầu body ẩn-T0 đủ `mass`,`c`
và mọi body khác đủ 3 trường, + 1 test mỗi property (`c`, `T0`); hoặc (B) thu enum về `['mass','c']`
cho v1, đẩy `T0` sang v2. Đề nghị (A) vì rẻ và giữ trọn khả năng "ẩn t_cb/m/c/T0" task nêu.

### [H3 — VỪA] Bộ vàng bỏ trống nhánh abstain/violation — tiêu chí §15.3 chưa có ca

§15.3 hứa "test 1 ca mỗi loại từ chối" nhưng §12 (10 bài) TOÀN ca hợp lệ, 0 ca abstain thật.
Cần thêm (đúng như §15.3 tự cam kết, nhưng phải nằm trong bộ contract trước khi code):
- >1 ẩn / 0 ẩn cho quá trình ⇒ issue "cần đúng một ẩn".
- body có latent-props trong `equilibrium_temp` ⇒ issue chặn phi tuyến.
- ref sai loại (`heat.of` trỏ `state`) ⇒ issue.
- **ca PHYSICAL_VIOLATION dương tính**: ví dụ t_cb hai vật cùng phía (2 vật cùng nóng) ⇒
  `t-cb-ngoài-khoảng`, và mô hình cho T(K)≤0 ⇒ `nhiệt-độ-tuyệt-đối-âm` ⇒ **không serve**.
Không có các ca này thì cổng abstain là lời hứa CHƯA kiểm.

### [H4 — THẤP] §4 bảo "thêm gasHeat*.ts vào tsconfig.kernel.json" — thừa & phạm luật additive

Đã đọc `tsconfig.kernel.json`: `"include": ["api/_lib/kernel/physics/**/*.ts"]` — glob wildcard
**đã phủ** `physics/gasHeat*.ts`. Tương tự `vitest.config.ts` include `api/_lib/kernel/**/*.test.ts`
đã phủ test mới. Vậy **không cần sửa config nào**. Nhưng §4 lại dặn "thêm gasHeat*.ts vào
tsconfig.kernel.json (F9)" — nếu người code làm theo, họ (a) sửa thừa, (b) **đụng file config
dùng chung** đúng lúc nhiều agent song song ⇒ nguy cơ merge-conflict, mâu thuẫn chính rule
"hoàn toàn additive, KHÔNG sửa file có sẵn" của chính §4. **Sửa lời spec:** "KHÔNG cần chạm
tsconfig.kernel.json / vitest.config.ts — glob `physics/**/*.ts` và `kernel/**/*.test.ts` đã phủ."

### [H5 — THẤP] mmHg factor hardcode 101325/760 lệch quy ước atm=10⁵

§5.2 để `mmHg: rat(101325n, 760n)` cứng, trong khi `atm` dùng biến `atmInPa` (có thể 100000).
1 mmHg = 133,322 Pa (chuẩn) nhưng nếu đề khai `atmInPa:100000` và bài trộn mmHg với atm thì
lệch (760·131,579 = 100000 ≠ 101325). Không bài vàng nào dùng mmHg nên miễn nhiễm; và hardcode
133,322 là ĐÚNG chuẩn mmHg thực. **Đề nghị:** giữ hardcode nhưng ghi `note` cảnh báo khi plan
vừa dùng `mmHg` vừa `atmInPa=100000` (đề hiếm), hoặc thống nhất mmHg = atmInPa/760. Ưu tiên thấp.

### [H6 — THẤP] equilibrium_temp check `min<Tf<max` strict từ chối oan ca suy biến hợp lệ

§8 kiểm nghiêm ngặt `min(T0ᵢ) < T_f < max(T0ᵢ)`. Nếu mọi vật cùng T0 (ví dụ trộn hai khối
nước cùng 50°C) thì min=max=T_f=50 ⇒ strict FALSE ⇒ engine báo `t-cb-ngoài-khoảng` và không
serve, dù kết quả (50°C) đúng và hợp lí. Ca hiếm ở đề phổ thông, và abstain "an toàn". **Đề nghị:**
nới thành `min ≤ T_f ≤ max` + cờ riêng cho ca degenerate min==max (trả 50°C kèm note) HOẶC ghi
rõ trong spec rằng ca cùng-nhiệt-độ bị abstain có chủ đích. Ưu tiên thấp.

---

## 6. ĐIỂM SON (đừng sửa nhầm)

- **Toán 11/11 exact, đã kiểm bằng scalar.ts thật** — không bài nào rời ℚ, residual thay-ngược
  = 0 exact (`num===0n`), đúng như §12/§15 khẳng định.
- **Trung thực exact/float tuyệt đối:** chẩn đoán "hữu tỉ tuyến tính, không căn không bậc 2"
  đúng bản chất; `certifyScalar` chống exact-giả; KHÔNG import `solver1d`, radicand luôn 1.
- **Kiến trúc pack độc lập ĐÚNG** — tách sạch `gasHeat*.ts`, entry `runGasHeat`, không đụng
  `planSchema.ts`/`runPhysics.ts` (tránh đúng lỗi breaking của pack sóng W1). Soi gương
  circuit/dynamics/chem chuẩn xác.
- **+273 là PHÉP CỘNG hữu tỉ (không factor nhân)** — nhận diện đúng điểm khác biệt của nhiệt
  độ; G3/G4/G5/G7/G8/G10 đều ra T(K) nguyên/hữu tỉ exact.
- **Chống "LLM tính hộ" (R1) tốt:** `pFromDepth` khai thô ρ,g,h — engine nhân ρgh (G2 p_đáy=200000
  đúng); đơn vị để engine đổi (G10 500 L→1/2 m³); +273 để engine cộng. Không field nhận đáp-đã-suy.
- **`recognizeConstant` chỉ giữ làm lưới an toàn** — spec thừa nhận đúng rằng nhánh này thực tế
  không kích hoạt (mọi đáp đã exact ở bậc `certify`), và ghi đúng giới hạn của recognize.
- **Bộ điểm phân vân §14 trung thực** — tự nêu geometry cắt-hẳn hay không, hiển thị lũy thừa 10,
  một-hay-nhiều process/plan, ΔU/công khí, `plan.R` override. Đây là hỏi đúng chỗ cần điều phối.

---

## 7. CHECKLIST TRƯỚC KHI CODE

1. [CAO] Viết lại §7.2 theo vị-từ pha+ngưỡng tường minh + thêm self-check chống over-count
   latent + thêm 4 ca `heat` (đơn-pha / nóng-chảy-thuần / partial / chạm boil) vào bộ vàng.
2. [VỪA] Bổ sung công thức `mass_from_heat property=T0` ở §7.1 (hoặc thu enum về `mass,c`),
   + test cho `c` và `T0`.
3. [VỪA] Thêm ca abstain/violation dương tính vào contract (>1 ẩn, latent-trong-cân-bằng,
   ref sai loại, T(K)≤0, t_cb ngoài khoảng) — hiện thực hoá §15.3.
4. [THẤP] Sửa lời §4: KHÔNG chạm `tsconfig.kernel.json`/`vitest.config.ts` (glob đã phủ).
5. [THẤP] Chốt mmHg×atmInPa (H5) và ngưỡng t_cb degenerate (H6) — hoặc ghi rõ "abstain có chủ đích".
6. [phân vân §14] Điều phối chốt: geometry (đề nghị cắt hẳn v1, giữ chỗ tags) · hiển thị lũy
   thừa 10 (theo kết luận efield để đồng bộ) · một process/plan cho v1 · ΔU/công khí để v1.1 ·
   `plan.R` optional (default 831/100), +273 cứng.

Cốt lõi vững — 6 việc trên đa số là **bổ sung đặc tả + test**, không phải đập đi làm lại.
Sau khi vá H1 (việc CAO duy nhất) và H2/H3, spec đủ chín để giao code.
