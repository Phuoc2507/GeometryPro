# Physics Pack v1 — DÒNG ĐIỆN XOAY CHIỀU lớp 12 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-22
**Trạng thái:** DỰ THẢO — CHỜ PHẢN BIỆN (sẽ bị phản biện trước khi code, như dao động / sóng cơ / dc-circuit). Điểm phân vân gom ở §15; điểm khó nhất — **trộn π với căn** — phân tích riêng ở §3.
**Phạm vi:** Mở rộng physics pack sang chương **DÒNG ĐIỆN XOAY CHIỀU** (Vật lí 12, GDPT 2018) — mạch **RLC nối tiếp**. Chỉ CỘNG file mới trong `api/_lib/kernel/physics/` + test. KHÔNG sửa bất kỳ file có sẵn nào (kể cả file v0 động học, file dao động, `piScalar.ts`, `scalar.ts`, `planSchema.ts` gốc, `src/**`).
**Quan hệ:** Xây trên nền `2026-08-21-physics-pack-design.md` (v0 — khung PhysicsResult, scene, charts, 3 tầng mkAnswer); **TÁI DÙNG NGUYÊN tầng `piScalar.ts`** do pack dao động tạo (`2026-08-21-physics-pack-v1-oscillation.md` §3 — PiScalar, `EXACT_COS`, `PiRat`, `certifyPiScalar`); tái dùng khái niệm "mạch + nguồn + phần tử + tự kiểm bảo toàn" của `2026-08-21-physics-pack-v1-dc-circuit.md` NHƯNG **AC khác hẳn DC: trở kháng là số phức, có π (ω = 2πf) và có căn (Z = √(R²+(Z_L−Z_C)²))**. Tuân các quy ước ĐÃ DUYỆT ở `../reviews/2026-08-21-wave2-specs-review.md`.

**Ràng buộc kế thừa (ĐÃ DUYỆT — không mở lại):**
- Unit **per-quantity, engine đổi exact** bằng hữu tỉ (F2/D1).
- `answers[].unit` do **engine** ghi theo kind (C6); tol hai tầng `EPS_SELF = 1e-6` / `TOL_ASSERT = 1e-3` (C10/F6) — KHÔNG đặt hằng mới.
- **Label scene TRẦN** — KHÔNG nhúng giá trị (đề cho hay engine tính) vào bất kỳ nhãn nào; mọi giá trị ở `answers[]` (F8 / phán quyết chung §15.1 đợt 2).
- **Exact-first**, thập phân kiểu VN ("141,42 Ω", "0,55") là việc tầng **bridge/UI**; engine giữ text exact ("100√2 Ω", "√3/2", "π/6 rad") (phán quyết chung §15.2 đợt 2). Chú thích "≈" trong lời tính tay §11 chỉ là đối chiếu cho người đọc, KHÔNG phải text engine.
- **PiScalar** (hữu tỉ + một căn)·πᵏ TÁI DÙNG NGUYÊN từ oscillation §3 — KHÔNG phát minh lại (điểm son phản biện đợt 2: PiScalar cần & đủ; recognize KHÔNG nhận π², √b·π, k/π).
- Chính tả field query dùng chung theo v0 (`value`/`vUnit`/`component`) khi hợp nhất field ở bridge (§15.3 đợt 2).
- **Pipeline KHÔNG BAO GIỜ throw** ra route/bridge (OS-2): suy biến số học bị chặn ở zod-refine hoặc guard; lưới cuối là try/catch trong `runAcCircuit` đổi Error → `errors[]` + `ok:false`.
- Tag 4 tầng `ly/12/dien-xoay-chieu/<skill>` (C4/F10) — §3.6 bảng dạng bài.

---

## 1. Mục tiêu (một câu)

Giải bài mạch **RLC nối tiếp** xoay chiều theo đúng nguyên tắc geo3d: **LLM chỉ DỊCH đề → AcPlan JSON (chép nguồn u = U₀cos(ωt+φ) hoặc U hiệu dụng + f; chép R, L, C mỗi phần tử — TUYỆT ĐỐI không tính hộ một phép nào, kể cả 2πf, ωL, 1/(ωC), U/√2, √(R²+(Z_L−Z_C)²)); ENGINE tất định TÍNH bằng công thức đóng trên `PiScalar` (π sống ở ω/Z_L/Z_C, tự triệt tiêu khi đề cho L, C dạng a/π), giữ căn exact ở tầng `Scalar` (Z = √…), TỰ KIỂM bằng ba bất biến (giản đồ vectơ U_R²+(U_L−U_C)² = U², công suất P = I²R = UIcosφ, cộng hưởng Z_L = Z_C ⇔ Z = R), và XUẤT dữ liệu đồ thị u–t / i–t + giản đồ Fre-nen (dữ-liệu-chờ-UI)** — mô hình không khớp đề ⇒ violation, KHÔNG bịa đáp số.

## 2. Nền tảng & tái dùng (đã đọc code thật)

| Cần | Đã có | Dùng lại thế nào |
|---|---|---|
| **(hữu tỉ+căn)·πᵏ** cho ω, Z_L, Z_C, φ | `physics/piScalar.ts` (osc v1 §3): `PiScalar`, `mulP/divP/addP/subP/sqrtP`, `cosP/sinP`, `EXACT_COS` vòng tròn 16 điểm, `displayPiScalar`, `certifyPiScalar`, `PiRat`, `toPiScalar`, `TWO_PI`, `scalarToPi` | ω = 2πf là PiScalar bậc 1; Z_L = ωL, Z_C = 1/(ωC) qua `mulP/divP`; **π tự triệt tiêu khi L = a/π, C = b/π** (§3) |
| Số học **hữu tỉ + MỘT CĂN** cho Z, I, cosφ, U₀ | `scalar.ts` (`Scalar`, `add/sub/mul/div/sqrt`, `sqrtExact`, `displayScalar`, `makeExact`) | Z = √(R²+(Z_L−Z_C)²): sau khi π triệt tiêu, đối số dưới căn là **hữu tỉ (k=0)** ⇒ `sqrtP` degenerate về `sqrt` Scalar — `√5000 = 50√2` (radicand 2), `√40000 = 200`; U₀ = U√2 là căn radicand 2 |
| Nhập số mang π **và** phân số | `PiRat` (`{n,d,pi}`, osc §3.1) | ω khai từ pt "cos(100πt)" → `{n:100,pi:true}`; φ = π/3 → `{n:1,d:3,pi:true}` — LLM chép tử/mẫu literal |
| Chứng nhận exact ↔ float | `piScalar.ts` `certifyPiScalar` (mirror `certifyScalar`) | Mọi đáp qua `certifyPiScalar(kq, floatRef)`; `floatRef` tính bằng **pipeline float độc lập** (§3.5) |
| Nhận dạng số/căn/π đẹp từ float | `analysis/recognize.ts` | Lưới an toàn tầng 2 khi exact chết (φ off-grid, nhánh π-không-triệt-tiêu) |
| Số thập phân đề → hữu tỉ | `kinematics.ts` `scalarFromNumber` (v0; dc-circuit review chốt import từ đây) | R, U, L, C, f thập phân hữu hạn ≤ 9 lẻ → hữu tỉ exact (0,5 → 1/2; 2,5 → 5/2) |
| Khung kết quả + charts | v0 `PhysicsResult` §9 + charts §8.3 | `AcResult` cùng hình dạng {ok, answers(+unit), checks, violations, errors, geometry, meta} + `table`, `phasor`, `charts` |
| Pattern bọc-ngoài, entry riêng | `runAnalysis.ts` / `runCircuit.ts` (dc-circuit §15.6) | Entry RIÊNG `runAcCircuit` — schema riêng, compute riêng, KHÔNG đụng core/run/planSchema v0 |

**Hai xác minh code KẾ THỪA từ oscillation (không lặp lại):** (a) `recognize.ts` KHÔNG nhận π²/√b·π/k/π ⇒ PiScalar là bắt buộc cho ω/Z_L/Z_C khi π chưa triệt tiêu; (b) `certifyPiScalar` 3 tầng đã kiểm. **Điểm mới DUY NHẤT ngoài trường của oscillation:** ở dao động, cos/sin đi TỪ pha → giá trị (forward `EXACT_COS`). AC cần chiều NGƯỢC: từ cosφ (Scalar) → φ (góc lưới) để đọc độ lệch pha "đẹp" — hàm `phaseFromCos` mới ở §3.4, KHÔNG sửa `piScalar.ts` (chỉ đọc `EXACT_COS`/so struct `Exact`).

**Nhận xét then chốt (lý do chương này gọn mà đúng):** trở kháng phức trong đề VN được "gài số đẹp" để **π triệt tiêu ở Z_L, Z_C** (đề luôn cho L = a/π H, C = b·10ⁿ/π F). Sau khi π triệt tiêu, Z_L, Z_C là **hữu tỉ**, và MỌI phép còn lại (Z, I, cosφ, tanφ, P, U mỗi phần tử) là số học **hữu tỉ + một căn thuần** — đúng trường `Scalar`. π và căn **hầu như không cùng sống trong một số**: π chết TRƯỚC dấu căn (§3). Đây là lý do pack này tái dùng gần hết, phần toán mới ~200 dòng.

## 3. TRỌN PHÂN TÍCH: trộn π với căn — chỗ khó nhất (ĐỌC KỸ)

Đây là câu hỏi cốt lõi tác giả spec phải trả lời trước phản biện. Trả lời gọn: **`piScalar.ts` cho phép NHÂN/CHIA/BÌNH-PHƯƠNG hai PiScalar bất kỳ (gộp bậc π); nhưng CỘNG/TRỪ chỉ đóng khi CÙNG bậc — khác bậc thì `addP` tự `collapse` về float. Cơ chế collapse đó CHÍNH LÀ "quy π về số khi cần trộn", tự động, và tự đánh dấu `approximate`. Ta KHÔNG cần thêm cơ chế mới cho số học; chỉ cần một hàm inverse-trig (§3.4).** Bốn nhánh dưới đây phủ mọi ca.

### 3.0. Bề mặt thật của `piScalar.ts` (đọc trực tiếp, không đoán)

| Phép | Hành vi thật (đã đọc code) | Hệ quả cho AC |
|---|---|---|
| `mulP(a,b)` | `{mul(s), kₐ+k_b}`, `bandP` collapse nếu \|k\|>2 | Z_L = ωL, ω²… luôn dùng được; bậc cộng dồn |
| `divP(a,b)` | `{div(s), kₐ−k_b}` | Z_C = 1/(ωC): π mũ −1; f = ω/2π: bậc 1−1=0 |
| `addP/subP(a,b)` | vế 0 ⇒ vế kia; **cùng k ⇒ `{add(s),k}`; KHÁC k ⇒ `{s:num(approxP a + approxP b), k:0}` (collapse float)** | R² + (Z_L−Z_C)²: **đóng exact CHỈ KHI cùng bậc**; π-triệt-tiêu đưa cả hai về k=0 |
| `sqrtP(a)` | **k chẵn ⇒ `{sqrt(s), k/2}`** (sqrt Scalar tự lo exact, có thể null); **k lẻ ⇒ collapse float** | Z = √(k=0) ⇒ sqrt Scalar thuần — đúng trường một-căn |
| `cosP/sinP(pha)` | pha=0 ⇒ 1/0; k=1 & s hữu tỉ ⇒ `EXACT_COS` (Scalar exact) hoặc null; ngoài ⇒ float | Chỉ dùng khi VIẾT u,i (forward). φ đọc ngược = §3.4 |

Điểm mấu chốt: **`addP` khác-bậc KHÔNG null như `addExact` — nó collapse về `{k:0, s.exact:null}`** (giữ approx đúng, mất exact). Vậy khi ta cộng một đại lượng còn mang π (k≠0) với một hữu tỉ (k=0), kết quả **tự động rơi numeric và `certifyPiScalar` tự gắn `approximate:true`** — đúng thứ ta cần cho nhánh "π không triệt tiêu".

### 3.1. Nhánh A — ĐỀ SỐ ĐẸP (π triệt tiêu ở Z_L, Z_C ⇒ căn thuần Scalar) — 99% đề thi

Đề VN cho **L = a/π (H)** và **C = b·10ⁿ/π (F)** *chính là để* π triệt tiêu. Với ω = 2πf = `{s:2f, k:1}`:

```
Z_L = mulP(ω, L)      L = a/π = {s:a, k:−1}   ⇒ {s: 2f·a, k: 1+(−1)=0}   = HỮU TỈ
Z_C = divP(1, mulP(ω,C))   C = b/π = {s:b, k:−1}   ωC = {s:2f·b, k:0}   Z_C = {s: 1/(2f·b), k:0} = HỮU TỈ
```

Ví dụ f=50 (ω=100π), L=1/π ⇒ Z_L = 100π·(1/π) = **100** (k:0); C=10⁻⁴/π ⇒ ωC = 100π·10⁻⁴/π = 10⁻² (k:0) ⇒ Z_C = **100** (k:0). **π đã chết.** Từ đây:

```
ΔZ = subP(Z_L, Z_C)              cùng bậc k=0  ⇒ HỮU TỈ exact
Zsq = addP(mulP(R,R), mulP(ΔZ,ΔZ))   cùng bậc k=0  ⇒ HỮU TỈ exact
Z   = sqrtP(Zsq)                 k=0 chẵn ⇒ sqrt(Scalar): exact khi Zsq chính phương·squarefree
```

- `Zsq` = 5000 ⇒ `Z = √5000 = 50√2` (`makeExact` tách 5000 = 50²·2 ⇒ radicand 2). **Đây là chỗ DUY NHẤT căn xuất hiện — và nó là căn thuần Scalar, KHÔNG dính π.**
- `Zsq` = 15625 ⇒ `Z = 125` (chính phương). `Zsq` = 40000 ⇒ `Z = 200`.
- I = U/Z, cosφ = R/Z, tanφ = ΔZ/R, P = I²R, U_R/U_L/U_C — tất cả `divP/mulP` trên k=0 ⇒ hữu tỉ hoặc hữu tỉ/√2 (đã rút căn về mẫu qua `divExact`).

**Kết luận nhánh A: `approximate:false` toàn bộ.** π sống đúng một chặng (ω, và trong lúc tính Z_L, Z_C) rồi triệt tiêu bằng số học bậc π; căn sống đúng một chặng (Z) ở tầng Scalar. **Chúng KHÔNG gặp nhau.**

### 3.2. Nhánh B — CỘNG HƯỞNG (ΔZ = 0) và tần số cộng hưởng (π triệt tiêu LẦN NỮA)

- Z_L = Z_C ⇒ ΔZ = `subP` = `{s:0,k:0}` (isZeroPi) ⇒ Zsq = R² ⇒ **Z = R** (không căn, hữu tỉ). φ=0, cosφ=1, I = U/R (max).
- **f₀ = 1/(2π√(LC))** với L = a/π, C = b/π:

```
LC   = mulP({s:a,k:−1}, {s:b,k:−1}) = {s: ab, k:−2}
√LC  = sqrtP(...)  k=−2 chẵn ⇒ {s: √(ab), k:−1}
2π√LC = mulP(TWO_PI={s:2,k:1}, {s:√ab,k:−1}) = {s: 2√(ab), k:0}      ← π triệt tiêu!
f₀   = divP(1, ...) = {s: 1/(2√ab), k:0}   = HỮU TỈ (khi ab chính phương)
```

Ví dụ L=1/π, C=10⁻⁴/π ⇒ ab = 10⁻⁴ ⇒ 2√(ab) = 2·10⁻² = 1/50 ⇒ **f₀ = 50 Hz** exact. π triệt tiêu qua `sqrtP(k=−2)` rồi `mulP` với 2π. **Không rơi float.**

### 3.3. Nhánh C — π KHÔNG triệt tiêu (đề cho L, C dạng thập phân thuần) — HIẾM, xử lý trung thực

Đề hiếm khi cho "L = 0,5 H, C = 10⁻⁴ F" (không có 1/π). Khi đó:

```
Z_L = mulP({s:100,k:1}, {s:0.5,k:0}) = {s:50, k:1} = 50π    (còn mang π!)
Z_C = divP(1, mulP(ω, {s:1e-4,k:0})) = {s: 100/π ..., k:−1} = 100/π   (π mũ −1)
ΔZ  = subP({k:1}, {k:−1})   KHÁC BẬC ⇒ addP COLLAPSE ⇒ {s:num(157.08−31.83), k:0, exact:null}
Z   = sqrtP(√(R²+float²)) ⇒ float
```

`ΔZ.s.exact === null` ⇒ certify không thấy exact ⇒ `recognizeConstant` (thường trượt vì trị dính π vô tỉ) ⇒ **thập phân + `approximate:true`**. Đây là hành vi ĐÚNG và TRUNG THỰC: đáp thật sự là số vô tỉ dính π, đề thi tránh ra kiểu này. **Không cần cơ chế đặc biệt** — `collapse` của `addP` lo sạch, `certifyPiScalar` gắn cờ.

### 3.4. Góc đẹp cho tanφ/cosφ — inverse-trig trên lưới (hàm MỚI `phaseFromCos`)

Vì `piScalar.ts` chỉ có forward `EXACT_COS` (pha → cos/sin), AC cần chiều ngược để trả **φ dạng π/6, π/4…** thay vì số. Với mạch RLC nối tiếp, **φ ∈ (−π/2, π/2)** (R>0 ⇒ tanφ hữu hạn) ⇒ cosφ > 0, và **dấu φ = dấu (Z_L−Z_C)** (cảm kháng φ>0, dung kháng φ<0). Vậy chỉ cần dò |cosφ| trên **nửa lưới góc nhọn**:

```
phaseFromCos(cosφ: Scalar, signDZ: −1|0|1): PiScalar | null
  bảng mốc cosθ (θ ∈ [0, π/2], theo struct Exact, ĐỐI CHIẾU EQUALITY num/den/radicand — luật §3.2 osc/OS-3):
    cos0=1 (1,1,1) → θ=0 ;  cos(π/6)=√3/2 (1,2,3) → π/6 ;  cos(π/4)=√2/2 (1,2,2) → π/4 ;
    cos(π/3)=1/2 (1,2,1) → π/3 ;  cos(π/2)=0 (0,1,1) → π/2
  khớp struct ⇒ φ = signDZ · θ (PiScalar bậc 1, hoặc 0);  không khớp ⇒ null ⇒ caller rơi số (atan2 float, approximate)
```

- **So EQUALITY struct `Exact`**, KHÔNG dùng `cmpScalar` (OS-3: nhánh khác-radicand của `cmpScalar` là so float EPS 1e-9 — snap trá hình). Hữu tỉ (cosφ = 4/5) so mốc vô tỉ (√3/2) ⇒ mismatch NGAY ⇒ rơi số trung thực.
- **Phát hiện quan trọng — góc nào THẬT SỰ đạt được (điểm phân vân §15.2):** vì ở nhánh A **tanφ = (Z_L−Z_C)/R là HỮU TỈ** (cả tử lẫn mẫu hữu tỉ), góc lưới đạt được qua tanφ chỉ có **φ ∈ {0, ±π/4}** (tanφ ∈ {0, ±1}). Muốn **φ = ±π/6** phải cho **R dạng căn** (R = 100√3 ⇒ cosφ = R/Z = √3/2): đây chính là mẹo ra đề kinh điển. **φ = ±π/3** đòi R = 100√3/3 (ít gặp). Vì thế `phaseFromCos` dò trên cosφ = R/Z (bền hơn tanφ) và **R phải nhận được dạng căn** (SurdRat §6.1). Ngoài các mốc này ⇒ số + `approximate:true`.

### 3.5. Đường certify — pipeline float ĐỘC LẬP

Mirror `reduceN`/`evalQuadN` của v0/dc: mọi đại lượng có **bản float tính song song** bằng `Math.PI`/`Math.sqrt` thuần (ωf = 2π·f; ZLf = ωf·Lf; ZCf = 1/(ωf·Cf); Zf = √(Rf²+(ZLf−ZCf)²); …). `certifyPiScalar(kq, floatRef)`: `kq.s.exact ≠ null && |approxP(kq) − floatRef| ≤ 1e-6·max(1,|floatRef|)` ⇒ exact `displayPiScalar`; exact chết ⇒ `recognizeConstant(floatRef)`; trượt ⇒ `toFixed`, `approximate:true`. Với kq bậc 0, `approxP = kq.s.approx` ⇒ hành vi trùng `certifyScalar`.

### 3.6. Bảng dạng bài phủ + tag taxonomy

| Dạng bài | Query dùng | Tag đề xuất (`ly/12/dien-xoay-chieu/<skill>`) |
|---|---|---|
| Tổng trở, cảm kháng, dung kháng | `impedance{of?}` | `ly/12/dien-xoay-chieu/tong-tro` |
| ω = 2πf | `omega` | `ly/12/dien-xoay-chieu/tan-so-goc` |
| Cường độ dòng điện I = U/Z | `current` | `ly/12/dien-xoay-chieu/dinh-luat-om` |
| U hai đầu mỗi phần tử / nguồn | `voltage{of}` | `ly/12/dien-xoay-chieu/dien-ap-phan-tu` |
| Công suất P = UIcosφ = I²R | `power` | `ly/12/dien-xoay-chieu/cong-suat` |
| Hệ số công suất cosφ = R/Z | `power_factor` | `ly/12/dien-xoay-chieu/he-so-cong-suat` |
| Độ lệch pha tanφ = (Z_L−Z_C)/R | `phase_diff` | `ly/12/dien-xoay-chieu/do-lech-pha` |
| Cộng hưởng (Z_L=Z_C ⇒ Z=R, I max) | `is_resonance`, `resonance_frequency`, `solve_resonance` | `ly/12/dien-xoay-chieu/cong-huong` |
| Hiệu dụng ↔ cực đại (U₀ = U√2) | `current{peak}`, `voltage{peak}` | `ly/12/dien-xoay-chieu/hieu-dung-cuc-dai` |
| Viết u, i tức thời | `write_current`, `write_voltage` | `ly/12/dien-xoay-chieu/bieu-thuc-tuc-thoi` |

v1 scene tự gắn `['physics','ac-circuit']`; 10 tag trên là **đề xuất seed cho registry** (việc P0/bridge, spec này KHÔNG sửa `taxonomy/tags.ts`).

## 4. Phạm vi & NGOÀI phạm vi (thà ít mà đúng — ghi tường minh)

**TRONG phạm vi v1:**
- Mạch **RLC nối tiếp** MỘT nhánh (R, L, C mắc nối tiếp; cho phép khuyết bớt: chỉ RL, RC, RLC, hoặc thuần R — ít nhất một phần tử; L hoặc C khuyết ⇒ Z_L hoặc Z_C = 0).
- Nguồn xoay chiều MỘT tần số: khai `u = U₀cos(ωt+φ_u)` (đỉnh) HOẶC `U` hiệu dụng + `f`. ω khai qua `f` (Hz) hoặc `omega` (PiRat, từ hệ số `100πt`).
- Các đại lượng §3.6; cộng hưởng; giá trị hiệu dụng ↔ cực đại; viết biểu thức tức thời u, i.
- L, C khai dạng **a/π, b·10ⁿ/π** (π triệt tiêu) hoặc thập phân thuần (rơi số trung thực §3.3). R (và U₀) khai dạng **SurdRat** (100√3, 200√2) để giữ exact góc đẹp và biểu thức đỉnh.

**NGOÀI phạm vi v1 (LLM prompt v2 phải abstain — few-shot):**
- **Mạch có phần tử MẮC SONG SONG** (RLC song song, L//C…) — cần tổng dẫn phức, để chương nâng cao.
- **MÁY BIẾN ÁP** (U₁/U₂ = N₁/N₂), **TRUYỀN TẢI ĐIỆN** (hao phí ΔP = P²R/(U²cos²φ), hiệu suất truyền tải) — mô hình khác hẳn, pack riêng.
- **BÀI TOÁN CỰC TRỊ** (L, C, f, R biến thiên tìm U_Lmax/U_Cmax/P_max/cosφ liên hệ): ví dụ "điều chỉnh C để U_C cực đại", "L thay đổi để công suất cực đại", "hai giá trị R cho cùng công suất". Cần khảo sát hàm/đạo hàm — **để chương/pack nâng cao riêng** (đây là ranh giới CỨNG, dễ bị LLM "ép" nhất — few-shot abstain BẮT BUỘC).
- **Dòng điện BA PHA**, máy phát/động cơ ba pha.
- **Hộp đen (hộp kín X)** — suy phần tử từ độ lệch pha/số đo (bài ngược đa nghiệm), **mạch cộng hưởng chọn sóng LC** (dao động điện từ — chương khác), **giản đồ vectơ trượt** cho mạch nhiều phần tử cùng loại.
- **Cuộn dây KHÔNG THUẦN CẢM** (cuộn dây có điện trở r ≠ 0): v1 coi L thuần cảm, R là điện trở riêng. Đề "cuộn dây (r, L)" ⇒ abstain (r nối tiếp là mở rộng v-next — về đại số là thêm một R, nhưng đổi ngữ nghĩa "U hai đầu cuộn dây" = √(U_r²+U_L²), dễ dịch sai — hoãn).
- **Nguồn nhiều tần số / không sin** (u chứa nhiều họa tần), **mạch RC/RL lọc tần**.
- **Bài NGƯỢC tìm R, L, C, f từ nhiều số đo** khi nguồn/phần tử là ẩn (trừ `solve_resonance` một ẩn cho cộng hưởng — trong phạm vi): hệ nhiều phương trình ⇒ v2.

**Phòng tuyến MÁY (như dc-circuit CI-2):** MỌI số đo/dữ kiện DƯ (số chỉ ampe kế/vôn kế, "công suất đo được", "cosφ = 0,8") khi nguồn + R,L,C đã đủ ⇒ **`asserts`, KHÔNG BỎ**. Mô hình dịch sai + số đo dư ⇒ assert lệch ⇒ violation, ok:false. Đây là phòng tuyến duy nhất bắt được LLM "ép" bài cực trị/song song về RLC nối tiếp tĩnh.

## 5. Kiến trúc & ranh giới

Entry RIÊNG (`runAcCircuit`), thuần cộng file — KHÔNG đụng union op/query của `planSchema.ts` v0 (khác oscillation/waves; GIỐNG dc-circuit `runCircuit`). File toán thuần trung tâm là **`acCircuit.ts`**.

```
api/_lib/kernel/physics/
  (TÁI DÙNG, KHÔNG SỬA) piScalar.ts  oscSchema.ts(PiRat)  kinematics.ts(scalarFromNumber)
                        planSchema.ts  kinematics.ts  compute.ts  scene.ts  runPhysics.ts  circuit*.ts
  acSchema.ts       — AcPlanSchema (zod): source, R/L/C (SurdRat/LCValue), queries, asserts + superRefine
  acCircuit.ts      — THUẦN (PiScalar+Scalar): resolve op→AcModel; ω, Z_L, Z_C, Z, I, φ, cosφ, P;
                       phaseFromCos (inverse-trig lưới); cộng hưởng + f₀; bộ đôi float độc lập (…N) certify
  acCompute.ts      — từng query → công thức đóng + certifyPiScalar/certifyScalar + gắn unit (C6)
  acCheck.ts        — tự kiểm K1 giản đồ vectơ, K2 công suất hai đường, K3 cộng hưởng (residual từ đáp)
  acLayout.ts       — giản đồ Fre-nen (phasor) + mẫu u–t/i–t → dữ-liệu-chờ-UI (JSON, chưa consumer)
  runAcCircuit.ts   — entry runAcCircuit(raw): parse → resolve → queries → asserts → checks → layout → AcResult
  __tests__/
    acCircuit.test.ts  acCompute.test.ts  acCheck.test.ts  acLayout.test.ts
    runAcCircuit.test.ts  ac-contract.test.ts   (10 bài A1–A10 §11)
```

**Import được phép:** `../scalar` (Scalar + makeExact/fromExact/sqrtExact…), `./piScalar` (PiScalar toolkit + `PiRat`/`toPiScalar`), `./kinematics` (chỉ `scalarFromNumber`), `../compute/answer` (`certifyScalar`, `cmpScalar`), `../analysis/recognize` (`recognizeConstant`), `zod`, `import type` từ `src/types/geometry` (type-only, tiền lệ index.ts). **KHÔNG cần `solver1d`** (không phương trình bậc 2 — Z = √… là một phép `sqrt` đóng).

**Ranh giới CỨNG (v1 hoàn toàn additive):**
- KHÔNG sửa: core kernel (`run.ts`, `planSchema.ts` gốc, `index.ts`, `scalar.ts`), `piScalar.ts`/`oscSchema.ts` (chỉ IMPORT), file v0/dc physics, `package.json`, `vitest.config.ts` (glob `api/_lib/kernel/**/*.test.ts` ĐÃ phủ), `src/**`, taxonomy registry.
- **Phụ thuộc merge:** AC dùng `piScalar.ts` ⇒ **code SAU khi pack dao động merge** (như waves). Nếu thi công chung đợt: cùng cây `physics/`, không diff v0.
- Vì `index.ts` không đổi ⇒ AC **chưa vào `kernel-dist`** — test import trực tiếp `../runAcCircuit`. Nối dây (export index.ts, bridge, few-shot translator, route CÓ QUOTA — F1, UI giản đồ/đồ thị) là bước tích hợp sau, ngoài phạm vi. **Chép nhắc F1:** route nối AC PHẢI có quota — ghi lại để không rơi mất.
- Baseline test lúc thi công (1072 cũ + v0 + dao động + dc) chỉ được CỘNG. Nghi thức kiểm thêm `npx tsc --noEmit -p tsconfig.kernel.json` (F9).

## 6. AcPlanSchema (zod)

### 6.1. Kiểu nhập — chép literal, engine tính

```ts
// api/_lib/kernel/physics/acSchema.ts
import { z } from 'zod';
import { PiRat } from './piScalar';            // {n,d,pi} — osc §3.1 (thực tế export ở piScalar.ts)
const Num = z.number().finite();
const Obj = z.string().min(1);

// SurdRat — số dạng (n/d)·√rad. Cho R = 100√3 (góc đẹp π/6), U₀ = 200√2 (biên độ dạng √2).
// LLM CHÉP: "100√3" → {n:100, rad:3};  "200√2" → {n:200, rad:2};  "50" → 50.
const SurdRat = z.union([
  Num,
  z.object({ n: Num, d: z.number().int().positive().default(1), rad: z.number().int().positive().default(1) }),
]);
// LCValue — L, C dạng (n/d)·10^exp·π^(overPi?−1:0). π ở MẪU ⇒ overPi:true (để π triệt tiêu §3.1).
// L = 1/π → {n:1, overPi:true};  C = 10⁻⁴/π → {n:1, exp:-4, overPi:true};
// C = 10⁻⁴/(2π) → {n:1, d:2, exp:-4, overPi:true};  L = 0,5 (thập phân thuần, nhánh C §3.3) → 0.5
const LCValue = z.union([
  Num,
  z.object({ n: Num, d: z.number().int().positive().default(1),
             exp: z.number().int().default(0), overPi: z.boolean().default(false) }),
]);
```

**Dựng exact bằng export CÓ SẴN (không sửa scalar/piScalar):**
- `SurdRat → Scalar`: `mul(div(scalarFromNumber(n), rat(BigInt(d))), rad>1 ? sqrt(rat(BigInt(rad))) : rat(1))` — `100√3` = `fromExact(makeExact(100,1,3))`.
- `LCValue → PiScalar`: `s = mul(div(scalarFromNumber(n), rat(BigInt(d))), pow10(exp))`, `k = overPi ? −1 : 0`; `pow10(e)` = `rat(10^e)` (e≥0) hoặc `rat(1n, 10^|e|)` (e<0) — bigint exact, tránh trần 9-lẻ của `scalarFromNumber` (10⁻⁴ ok, nhưng exp giữ đường an toàn cho 10⁻⁵…).

### 6.2. Nguồn + phần tử + query

```ts
export const AcSourceSchema = z.object({
  // TẦN SỐ: đúng MỘT trong {f, omega}
  f: Num.positive().optional(),                 // Hz
  omega: PiRat.optional(),                       // rad/s — từ pt "cos(100πt)" → {n:100,pi:true}
  // ĐIỆN ÁP NGUỒN: đúng MỘT trong {U, U0}
  U: SurdRat.optional(),                          // hiệu dụng (V)
  U0: SurdRat.optional(),                         // cực đại (V) — "u = 200√2 cos…" → {n:200, rad:2}
  phiU: PiRat.optional(),                         // pha ban đầu φ_u của u (rad), default 0
});

export const AcQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('omega'), label: z.string().optional() }),
  z.object({ kind: z.literal('impedance'), of: z.enum(['L','C']).optional(), label: z.string().optional() }),
      // bỏ of = Z tổng; of='L' = Z_L; of='C' = Z_C
  z.object({ kind: z.literal('current'), peak: z.boolean().default(false), label: z.string().optional() }),
      // peak=false ⇒ I hiệu dụng; peak=true ⇒ I₀ = I√2
  z.object({ kind: z.literal('voltage'), of: z.enum(['R','L','C','source']),
             peak: z.boolean().default(false), label: z.string().optional() }),
      // U_R/U_L/U_C hiệu dụng (peak ⇒ ×√2); of='source' = U (hoặc U₀) hai cực nguồn
  z.object({ kind: z.literal('power'), label: z.string().optional() }),                 // P = I²R
  z.object({ kind: z.literal('power_factor'), label: z.string().optional() }),          // cosφ = R/Z
  z.object({ kind: z.literal('phase_diff'), label: z.string().optional() }),            // φ = φ_u − φ_i
  z.object({ kind: z.literal('resonance_frequency'), label: z.string().optional() }),   // f₀ = 1/(2π√LC)
  z.object({ kind: z.literal('is_resonance'), label: z.string().optional() }),          // ratio Z_L/Z_C + verdict
  z.object({ kind: z.literal('solve_resonance'), target: z.enum(['C','L','f']),
             label: z.string().optional() }),                                            // tìm phần tử để cộng hưởng
  z.object({ kind: z.literal('write_current'), label: z.string().optional() }),          // i = I₀cos(ωt+φ_i)
  z.object({ kind: z.literal('write_voltage'), of: z.enum(['R','L','C','source']),
             label: z.string().optional() }),                                            // u_X(t)
]);

export const AcPlanSchema = z.object({
  problemName: z.string().min(1),
  source: AcSourceSchema,
  R: SurdRat.optional(),                          // Ω (khuyết ⇒ 0 — nhưng ≥1 phần tử, §6.3)
  L: LCValue.optional(),                          // H
  C: LCValue.optional(),                          // F
  queries: z.array(AcQuerySchema).min(1),
  asserts: z.array(z.object({ query: AcQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
});
export type AcPlan = z.infer<typeof AcPlanSchema>;
```

### 6.3. superRefine (fail parse = lỗi dịch nhìn thấy được)

1. `source`: đúng MỘT trong {f, omega}; đúng MỘT trong {U, U0}. `f`/`omega` phải **> 0 sau quy đổi** (OS-2: `divExact` throw khi ω=0). `U`/`U0` > 0.
2. Ít nhất MỘT trong {R, L, C} có mặt. `resonance_frequency`/`solve_resonance{target:'f'}` đòi CẢ L và C; `solve_resonance{target:'C'}` đòi L (+f); `{target:'L'}` đòi C (+f). Thiếu ⇒ error rõ ("cần cả L và C để tính cộng hưởng").
3. `voltage{of:'L'}` khi khuyết L (hoặc `of:'C'` khuyết C) ⇒ error ("mạch không có phần tử L").
4. `write_*`/`phase_diff` đòi đủ dữ kiện dựng pha (source + phần tử) — thiếu ⇒ error, KHÔNG bịa pha.
5. R/U₀ dạng SurdRat `rad` phải square-free-hoá được (dùng `makeExact` — tự tách; không cần refine thêm).

### 6.4. Đơn vị — per-quantity, engine ghi đáp (C6)

Chuẩn nội bộ SI (Ω, V, A, W, Hz, rad, rad/s, H, F). `answers[].unit` do engine gắn theo kind:

| kind | unit | | kind | unit |
|---|---|---|---|---|
| `omega` | `rad/s` | | `phase_diff` | `rad` |
| `impedance` | `Ω` | | `resonance_frequency` | `Hz` |
| `current` | `A` | | `is_resonance` | `''` (tỉ số + verdict) |
| `voltage` | `V` | | `solve_resonance` | `F`/`H`/`Hz` theo target |
| `power` | `W` | | `write_current` | `A` (text là biểu thức) |
| `power_factor` | `''` | | `write_voltage` | `V` (text là biểu thức) |

`current`/`voltage` không có biến thể unit đầu vào (đề 12 luôn V/A) — YAGNI, mở khi gặp đề thật. `speedUnit`/mV/kV → v-next.

### 6.5. Quy ước translator (few-shot v2)

- Mọi SỐ chép thẳng từ đề. **LLM KHÔNG tính:** không nhân 2πf, không nhân ωL, không chia 1/(ωC), không chia U₀/√2, không khai Z/I/cosφ — schema **không có chỗ nộp** các số đó.
- "u = 200√2 cos(100πt) V" ⇒ `source: {omega:{n:100,pi:true}, U0:{n:200,rad:2}, phiU:{n:0}}`. "U = 220 V, f = 50 Hz" ⇒ `{f:50, U:220}`.
- "L = 1/π H" ⇒ `L:{n:1,overPi:true}`; "C = 10⁻⁴/π F" ⇒ `C:{n:1,exp:-4,overPi:true}`; "R = 100√3 Ω" ⇒ `R:{n:100,rad:3}`.
- Ampe kế/vôn kế **lý tưởng** ⇒ không op: "số chỉ ampe kế" → `current`; "vôn kế hai đầu cuộn cảm" → `voltage{of:'L'}`.
- **Bài NGOÀI phạm vi §4 (song song, máy biến áp, truyền tải, CỰC TRỊ, ba pha, cuộn dây có r) ⇒ ABSTAIN tường minh**, KHÔNG ép về RLC nối tiếp. **Few-shot abstain P2 tối thiểu:** 1 ví dụ cực trị ("điều chỉnh C để U_C max"), 1 máy biến áp, 1 mạch song song, 1 cuộn dây (r,L).
- MỌI số đo/dữ kiện dư ⇒ `asserts` (§4 phòng tuyến máy).

## 7. Tầng giải AC (acCircuit.ts — THUẦN, không zod, không I/O)

### 7.1. resolve op → AcModel

```ts
type AcModel = {
  omega: PiScalar;        // rad/s (từ f hoặc omega)
  U: Scalar;              // hiệu dụng (V) — nếu khai U0 thì U = U0/√2
  U0: Scalar;             // cực đại = U√2
  phiU: PiScalar;         // pha nguồn (rad)
  R: Scalar;              // Ω (0 nếu khuyết)
  ZL: PiScalar;           // ωL (0 nếu khuyết L)
  ZC: PiScalar;           // 1/(ωC) (0 nếu khuyết C)
};
```

- `omega`: `f` cho ⇒ `mulP(TWO_PI, scalarToPi(scalarFromNumber(f)))`; `omega` PiRat cho ⇒ `toPiScalar(omega)`.
- `U/U0`: khai `U` ⇒ `U0 = mul(U, √2)`; khai `U0` ⇒ `U = div(U0, √2)` (√2 = `fromExact(makeExact(1,1,2))`; `divExact` rút căn về — U = U0/√2 exact khi U0 dạng a√2).
- `ZL = mulP(omega, toLC(L))`, `ZC = divP(scalarToPi(rat(1)), mulP(omega, toLC(C)))`; khuyết ⇒ `{s:rat(0),k:0}`.

### 7.2. Đại lượng dẫn xuất (mọi phép trên PiScalar; bậc tự lo exact/float — §3)

```
dZ   = subP(ZL, ZC)                                  // Z_L − Z_C (đại số, có dấu)
Zsq  = addP(mulP(scalarToPi(R), scalarToPi(R)), mulP(dZ, dZ))
Z    = sqrtP(Zsq)                                     // √(R²+(Z_L−Z_C)²)
I    = divP(scalarToPi(U), Z)                         // U/Z (hiệu dụng)
cosφ = divP(scalarToPi(R), Z)                         // R/Z
tanφ = divP(dZ, scalarToPi(R))                        // (Z_L−Z_C)/R  (dùng khi cần, φ ưu tiên qua cosφ)
P    = mulP(mulP(I, I), scalarToPi(R))                // I²R
φ    = phaseFromCos(cosφ.s, signOf(dZ)) ?? {s:num(Math.atan2(dZ.approx, R.approx)), k:0}
```

- `signOf(dZ)`: `dZ.s.exact ? sign(dZ.s.exact.num) : Math.sign(dZ.s.approx)` (π > 0 nên dấu PiScalar = dấu s — không so cấu trúc chéo radicand, mirror osc §7).
- `φ_i = subP(phiU, φ)` (pha dòng); `I0 = mul(I_scalar, √2)` khi cần đỉnh.
- Nhánh A/B (§3.1–3.2): dZ, Zsq, Z, I, cosφ, P đều k=0 exact. Nhánh C (§3.3): dZ collapse ⇒ dây chuyền float, `certify` gắn `approximate`.

### 7.3. phaseFromCos (§3.4) & cộng hưởng

- `phaseFromCos(cosφ.s, signDZ)`: §3.4 — so struct `Exact` với 5 mốc {(1,1,1),(1,2,3),(1,2,2),(1,2,1),(0,1,1)} → θ ∈ {0,π/6,π/4,π/3,π/2}; `φ = mulP(scalarToPi(rat(signDZ)), θ)`; miss ⇒ null.
- **Cộng hưởng:** `isResonance = isZeroPi(dZ)` (Z_L=Z_C exact) — hoặc `|dZ.approx| ≤ EPS_SELF·max(1,|ZL.approx|)` khi float. `ratio = divP(ZL, ZC)` (verdict §8.1).
- **f₀ = divP(scalarToPi(rat(1)), mulP(TWO_PI, sqrtP(mulP(toLC(L), toLC(C)))))** — §3.2, π triệt tiêu.
- **solve_resonance:** `target='f'` ⇒ f₀. `target='C'` (biết L, f) ⇒ `C = divP(1, mulP(mulP(omega,omega), toLC(L)))` = 1/(ω²L). `target='L'` ⇒ `1/(ω²C)`. Thay-ngược bắt buộc: thế nghiệm, `isZeroPi(subP(ZL',ZC'))` phải đúng (residual exact 0).

## 8. Queries — công thức đóng + unit (acCompute.ts)

Mỗi query đúng MỘT SỐ (D5), trừ `write_*` (biểu thức — ngoại lệ có cấu trúc, §8.2). Dựng đáp qua `certifyPiScalar(kq, floatRef)` (§3.5); `answers[]` theo thứ tự queries, phần tử `{label?, kind, text, approx, unit, approximate, verdict?, expr?}`.

| Query | Công thức | Ghi chú exact |
|---|---|---|
| `omega` | ω | `100π` (k=1) exact |
| `impedance` | Z (bỏ of) / ZL / ZC | Z: `125`, `100√2`, `200`… (nhánh A); ZL/ZC hữu tỉ |
| `current{peak}` | I / I₀=I√2 | `2`, `√2`, `2√2` |
| `voltage{of,peak}` | U_R=I·R, U_L=I·Z_L, U_C=I·Z_C, source=U(₀) | `60/160/80`; peak ×√2 |
| `power` | P = I²R (đối chiếu UIcosφ ở K2) | `480`, `1152/5` |
| `power_factor` | cosφ = R/Z | `3/5`, `12/13`, `√3/2`, `√2/2` |
| `phase_diff` | φ (phaseFromCos hoặc atan2) | `π/6`, `π/4`, `0`; off-grid → số, approximate |
| `resonance_frequency` | f₀ = 1/(2π√LC) | `50` (π triệt tiêu) |
| `is_resonance` | ratio = Z_L/Z_C + verdict §8.1 | `1` → cộng hưởng |
| `solve_resonance{target}` | §7.3 | C = `1/(10000π)` (k=−1); f = `50` |
| `write_current` | biểu thức i (§8.2) | text + {I₀, ω, φ_i} |
| `write_voltage{of}` | biểu thức u_X | text + {biên độ, ω, pha} |

### 8.1. `is_resonance` — verdict tất định từ MỘT số

`ratio = Z_L/Z_C` (exact khi cùng bậc). So bằng `isZeroPi(dZ)` (cộng hưởng) hoặc dấu dZ:

| Điều kiện | `verdict` | text mẫu |
|---|---|---|
| Z_L = Z_C | `cong_huong` | "1" |
| Z_L > Z_C | `tinh_cam_khang` | ">1" (ratio) |
| Z_L < Z_C | `tinh_dung_khang` | "<1" (ratio) |

`verdict` là field cấu trúc cho máy (bridge dịch thành câu); `approx` vẫn là một số (ratio) — không phá D5. (Mirror `lamp_check` của dc-circuit — dùng chung `EPS_SELF=1e-6`, KHÔNG hằng riêng.)

### 8.2. `write_current` / `write_voltage` — biểu thức tức thời (ngoại lệ D5 có cấu trúc)

Trả `answers[i]` với `expr` = object `{amp: <text>, omega: <text>, phase: <text>}` VÀ `text` = chuỗi người-đọc ráp sẵn; `approx` = biên độ (I₀ hoặc U₀). Ví dụ:
- `write_current` A6: `{amp:"2", omega:"100π", phase:"−π/4"}`, `text:"i = 2cos(100πt − π/4) (A)"`, `approx:2`, `unit:"A"`.
- `write_voltage{of:'R'}`: biên độ U₀_R = U_R√2, pha cùng pha i (u_R cùng pha i). u_L sớm π/2 so i; u_C trễ π/2.

Ráp chuỗi: `amp + "cos(" + omega + "t" + (phase≥0 ? " + " + |phase| : " − " + |phase|) + ")"`; ω dùng `displayPiScalar` ("100π"), pha `displayPiScalar` bỏ dấu rồi tự chèn `+/−`. **Đây là chuỗi HIỂN THỊ cho người**, KHÔNG phải biểu thức timeline `Math.cos` (v1 geometry rỗng — không có timeline; mẫu số u–t/i–t ở charts §10.3 là mảng số).

## 9. Tự kiểm tất định (acCheck.ts) — residual ≠ 0 ⇒ violation

Residual tính TỪ ĐÁP (chiều ngược bộ giải) — cùng triết lý thay-ngược v0/dc:

| # | Bất biến | Residual (PiScalar, exact khi cùng bậc) | Ý nghĩa |
|---|---|---|---|
| K1 | **Giản đồ vectơ** | U_R² + (U_L − U_C)² − U² | Định lý Pytago điện áp; = I²(R²+(Z_L−Z_C)²) − I²Z² = 0 |
| K2 | **Công suất hai đường** | I²R − U·I·cosφ | P tính hai cách phải khớp (P = UIcosφ = I²R) |
| K3 | **Cộng hưởng** | (khi `is_resonance`/`resonance_frequency`) Z − R (đòi = 0 khi Z_L=Z_C); và Z_L(f₀) − Z_C(f₀) | Z_L = Z_C ⇒ Z = R, φ = 0 |
| K4 | **Định luật Ôm** | U − I·Z; và cosφ² + sinφ² − 1 (sinφ = (Z_L−Z_C)/Z) | nhất quán I=U/Z, cosφ=R/Z |
| K5 | **solve_resonance** | sau thế nghiệm: Z_L' − Z_C' (exact 0) | thay-đáp-ngược trọn vòng |

- Ngưỡng: cùng bậc exact ⇒ **residual exact 0** (`num === 0n`); có vế float ⇒ `|residual| ≤ EPS_SELF·scale` (`scale = max(1,|U|²)` cho K1, `max(1,|P|)` cho K2…). **EPS_SELF = 1e-6** dùng chung (không hằng mới).
- Check FAIL ⇒ `violations` + `ok:false`, KHÔNG serve (K1–K5 đúng theo đại số; fail chỉ là bug engine/tràn số ⇒ thà không trả).
- **Asserts khai báo** (dữ kiện dư đề): chạy `assert.query` như thường, so `|got − equals| ≤ tol·max(1,|equals|)`, `tol` mặc định **TOL_ASSERT = 1e-3**. Fail ⇒ `violations` "mô hình không khớp đề".
- Minh bạch: K1–K5 kiểm "engine tự nhất quán"; KHỚP ĐỀ là việc asserts. Ghi rõ trong doc code để không ngộ nhận residual-0 = dịch đúng.

## 10. AcResult, geometry rỗng, phasor/charts

### 10.1. AcResult

```ts
type AcAns = { label?: string; kind: string; text: string; approx: number; unit: string;
               approximate: boolean;
               verdict?: 'cong_huong'|'tinh_cam_khang'|'tinh_dung_khang';
               expr?: { amp: string; omega: string; phase: string } };
type AcResult = {
  ok: boolean;                          // violations = 0 && errors = 0 && mọi đáp hữu hạn
  answers: AcAns[];                     // THEO THỨ TỰ queries
  checks:  { kind: string; detail: string; residual: number; pass: boolean }[];  // K1–K5
  violations: { assert: string; expected: number; got: number; delta: number }[];
  errors: { message: string }[];
  geometry: GeometryData | null;        // §10.2 — RỖNG hợp lệ (v1 không vẽ 3D)
  table: { name: 'R'|'L'|'C'|'source'|'total'; Z?: AcAns; U: AcAns; I: AcAns; P?: AcAns }[];  // bảng phần tử answer-hóa
  phasor: PhasorLayout;                 // §10.3 — giản đồ Fre-nen dữ-liệu-chờ-UI
  charts: PhysicsChart[];               // §10.3 — u–t, i–t (kênh v0 §8.3)
  meta: { omega:{text,approx}; Z:{text,approx}; I:{text,approx}; cosphi:{text,approx};
          resonance: boolean; unitsNote: 'SI' };
};
```

### 10.2. GeometryData RỖNG — v1 KHÔNG vẽ 3D (mirror dc-circuit §10.2)

```ts
geometry = { name: plan.problemName, points: [], lines: [], tags: ['physics','ac-circuit'] }
```
Hợp lệ theo `GeometryData` (mảng rỗng OK); frontend đã chịu points rỗng (dc-circuit đã kiểm `GeometryCanvas` centroid/gridSize mặc định). Panel đáp đọc `answers[]`. `tags` giữ chỗ bridge append taxonomy. (Nếu wiring lộ quirk: fallback một điểm mồi `O(0,0,0)` label rỗng — như dc.)

### 10.3. phasor + charts — dữ-liệu-chờ-UI (TRUNG THỰC: chưa có consumer)

- **`charts` (u–t, i–t):** kênh `PhysicsResult.charts` như v0 §8.3, **129 mẫu đều** trên [0, 2T] mỗi đường (sin — như osc §9.3): `u(t)=U₀cos(ωt+φ_u)`, `i(t)=I₀cos(ωt+φ_i)` (mảng SỐ, không phải biểu thức timeline). Đây là kênh trực quan CHÍNH của AC (đồ thị hai đường lệch pha). Cùng số phận D6 (mất khi lưu lịch sử).
- **`phasor` (giản đồ Fre-nen):** dữ-liệu-chờ-UI, format DRAFT (chưa component nào đọc — ghi thẳng vào doc để không ngộ nhận "đã vẽ giản đồ"). Tất định từ model: vectơ `U_R`(trục +x, dài U_R), `U_L`(+y), `U_C`(−y), `U`(tổng, góc φ). Test khóa **bất biến** (không tọa độ đẹp/xấu): (1) đủ 4 vectơ; (2) `U` = hợp của `U_R` và `(U_L−U_C)` vuông góc; (3) `|U|² = U_R² + (U_L−U_C)²` (khớp K1). **`phasor.valueText` chỉ mang SỐ ĐỀ CHO** (đúng vai giản đồ đề bài) — TUYỆT ĐỐI không nhét giá trị engine TÍNH vào (label trần §15.1). Animate vectơ quay (hai vectơ quay ω) để v-next.

## 11. MƯỜI BÀI CONTRACT — tính tay từng bước (ac-contract.test.ts)

Số đã kiểm bằng script số học độc lập (Math.PI/sqrt). Mọi bài ω = 100π (f = 50 Hz) trừ khi ghi khác; `units` SI. Đánh số A1–A10, tách khỏi P/O/C/L (các pack khác).

---

### A1 — Tính Z và I (Z NGUYÊN) — Định luật Ôm + tổng trở

**Đề:** "Đặt điện áp xoay chiều u = U₀cos(100πt) V, giá trị hiệu dụng U = 250 V, vào mạch RLC nối tiếp: R = 75 Ω, L = 2/π H, C = 10⁻⁴/π F. a) Tính cảm kháng, dung kháng. b) Tính tổng trở Z. c) Tính cường độ dòng điện hiệu dụng I."

```json
{ "problemName": "rlc-z-i-nguyen",
  "source": { "omega": {"n":100,"pi":true}, "U": 250 },
  "R": 75, "L": {"n":2,"overPi":true}, "C": {"n":1,"exp":-4,"overPi":true},
  "queries": [ { "kind":"impedance","of":"L","label":"a1" },
               { "kind":"impedance","of":"C","label":"a2" },
               { "kind":"impedance","label":"b" },
               { "kind":"current","label":"c" } ] }
```

**Tính tay:** ω = 100π. Z_L = ωL = 100π·(2/π) = **200 Ω** (π triệt tiêu). Z_C = 1/(ωC) = 1/(100π·10⁻⁴/π) = 1/10⁻² = **100 Ω**. ΔZ = 200−100 = 100 (cảm kháng). Z = √(75²+100²) = √(5625+10000) = √15625 = **125 Ω** (chính phương). I = U/Z = 250/125 = **2 A**.
**Tự kiểm:** K1: U_R²+(U_L−U_C)² = (2·75)²+(2·100−2·... ) ... = 150²+(400−200)²... đúng ra I²(R²+ΔZ²)=I²Z² ✓. K4: U = I·Z = 2·125 = 250 ✓.
**Kỳ vọng:** "200" Ω; "100" Ω; "125" Ω; "2" A — exact, `approximate:false`.

---

### A2 — Tính Z và I (Z DẠNG CĂN √2) — trường một-căn

**Đề:** "Mạch RLC nối tiếp: R = 100 Ω, L = 1/π H, C = 10⁻⁴/(2π) F, đặt vào U = 200 V, f = 50 Hz. a) Tính Z. b) Tính I."

```json
{ "problemName": "rlc-z-can-hai",
  "source": { "f": 50, "U": 200 },
  "R": 100, "L": {"n":1,"overPi":true}, "C": {"n":1,"d":2,"exp":-4,"overPi":true},
  "queries": [ { "kind":"impedance","label":"a" }, { "kind":"current","label":"b" } ] }
```

**Tính tay:** Z_L = 100π·(1/π) = 100. Z_C = 1/(100π·10⁻⁴/(2π)) = 1/(10⁻²/2) = **200**. ΔZ = 100−200 = −100 (dung kháng). Z = √(100²+100²) = √20000 = **100√2 Ω** (`makeExact`: 20000 = 100²·2 → radicand 2) ≈ 141,4214. I = U/Z = 200/(100√2) = 2/√2 = **√2 A** (`divExact` rút căn) ≈ 1,4142.
**Tự kiểm:** K4: U = I·Z = √2·100√2 = 200 ✓ (radicand 2·2 → hữu tỉ). cosφ² + sinφ² = (√2/2)²+(√2/2)² = 1/2+1/2 = 1 ✓.
**Kỳ vọng:** "100√2" Ω approx 141.4214, `approximate:false`; "√2" A approx 1.4142, `approximate:false`. (KHÓA hành vi một-căn radicand 2 của scalar.)

---

### A3 — Độ lệch pha GÓC ĐẸP (φ = π/6, R DẠNG CĂN) — inverse-trig lưới

**Đề:** "Mạch RLC nối tiếp: R = 100√3 Ω, L = 2/π H, C = 10⁻⁴/π F, u = 200cos(100πt) V (U = 200 V... đề cho hiệu dụng). a) Tính tổng trở. b) Tính độ lệch pha φ giữa u và i. c) Tính hệ số công suất."

```json
{ "problemName": "rlc-pha-pi-6",
  "source": { "omega": {"n":100,"pi":true}, "U": 200 },
  "R": {"n":100,"rad":3}, "L": {"n":2,"overPi":true}, "C": {"n":1,"exp":-4,"overPi":true},
  "queries": [ { "kind":"impedance","label":"a" },
               { "kind":"phase_diff","label":"b" },
               { "kind":"power_factor","label":"c" } ] }
```

**Tính tay:** Z_L = 200, Z_C = 100, ΔZ = 100 (cảm ⇒ φ > 0). R = 100√3. Z = √((100√3)²+100²) = √(30000+10000) = √40000 = **200 Ω** (chính phương — căn trong R triệt vào bình phương). cosφ = R/Z = 100√3/200 = **√3/2** ⇒ `phaseFromCos(√3/2, +)` khớp mốc (1,2,3) → θ = π/6, dấu + ⇒ φ = **π/6 rad** ≈ 0,5236 (= 30°). tanφ = 100/(100√3) = 1/√3 = √3/3 (đối chiếu ✓).
**Tự kiểm:** K4: cosφ²+sinφ² = 3/4 + (100/200)² = 3/4 + 1/4 = 1 ✓ (sinφ = ΔZ/Z = 100/200 = 1/2).
**Kỳ vọng:** "200" Ω; "π/6" rad approx 0.5236, `approximate:false`; "√3/2" approx 0.8660. (KHÓA SurdRat-R + inverse-trig π/6.)

---

### A4 — CÔNG SUẤT + hệ số công suất

**Đề:** "Mạch RLC nối tiếp: R = 120 Ω, L = 1/π H, C = 2·10⁻⁴/π F, đặt U = 260 V, f = 50 Hz. a) Tính công suất tiêu thụ. b) Tính hệ số công suất."

```json
{ "problemName": "rlc-cong-suat-cosphi",
  "source": { "f": 50, "U": 260 },
  "R": 120, "L": {"n":1,"overPi":true}, "C": {"n":2,"exp":-4,"overPi":true},
  "queries": [ { "kind":"power","label":"a" }, { "kind":"power_factor","label":"b" } ] }
```

**Tính tay:** Z_L = 100π·(1/π) = 100. Z_C = 1/(100π·2·10⁻⁴/π) = 1/(2·10⁻²) = **50**. ΔZ = 50. Z = √(120²+50²) = √(14400+2500) = √16900 = **130 Ω**. I = 260/130 = 2 A. a) P = I²R = 4·120 = **480 W**. b) cosφ = R/Z = 120/130 = **12/13** ≈ 0,9231.
**Tự kiểm:** K2: I²R = 480 = U·I·cosφ = 260·2·(12/13) = 520·12/13 = 480 ✓ (residual exact 0).
**Kỳ vọng:** "480" W; "12/13" approx 0.9231 — exact.

---

### A5 — CỘNG HƯỞNG: tìm f₀ (và tìm C) — π triệt tiêu qua √(LC)

**Đề:** "Mạch RLC nối tiếp: R = 50 Ω, L = 1/π H, C = 10⁻⁴/π F, đặt U = 200 V. a) Tính tần số để mạch xảy ra cộng hưởng. b) Khi mắc nguồn f = 50 Hz, mạch có cộng hưởng không? c) Khi đó cường độ dòng điện hiệu dụng bằng bao nhiêu?"

```json
{ "problemName": "rlc-cong-huong",
  "source": { "f": 50, "U": 200 },
  "R": 50, "L": {"n":1,"overPi":true}, "C": {"n":1,"exp":-4,"overPi":true},
  "queries": [ { "kind":"resonance_frequency","label":"a" },
               { "kind":"is_resonance","label":"b" },
               { "kind":"current","label":"c" } ] }
```

**Tính tay:** a) f₀ = 1/(2π√(LC)); LC = (1/π)(10⁻⁴/π) = 10⁻⁴/π² ⇒ √(LC) = 10⁻²/π ⇒ 2π√(LC) = 2·10⁻² = 1/50 ⇒ f₀ = **50 Hz** (π triệt tiêu, exact). b) f = 50 = f₀ ⇒ Z_L = Z_C = 100 ⇒ ΔZ = 0 ⇒ `is_resonance` ratio = **1**, verdict `cong_huong`. c) Z = R = 50 ⇒ I = 200/50 = **4 A** (cực đại).
**Tự kiểm:** K3: Z − R = 50 − 50 = 0 ✓; Z_L(f₀) − Z_C(f₀) = 0 ✓.
**Kỳ vọng:** "50" Hz; "1" verdict cong_huong; "4" A. (Biến thể unit test: `solve_resonance{target:'C'}` với L=1/π, f=50 ⇒ C = 1/(ω²L) = 1/(10⁴π) = "1/(10000π)" F ≈ 3,18·10⁻⁵, `approximate:false`.)

---

### A6 — VIẾT i tức thời — biểu thức + inverse-trig π/4

**Đề:** "Đặt u = 200√2·cos(100πt) V vào mạch RLC nối tiếp R = 100 Ω, L = 2/π H, C = 10⁻⁴/π F. Viết biểu thức cường độ dòng điện tức thời i."

```json
{ "problemName": "rlc-viet-i",
  "source": { "omega": {"n":100,"pi":true}, "U0": {"n":200,"rad":2}, "phiU": {"n":0} },
  "R": 100, "L": {"n":2,"overPi":true}, "C": {"n":1,"exp":-4,"overPi":true},
  "queries": [ { "kind":"write_current","label":"a" } ] }
```

**Tính tay:** U₀ = 200√2 ⇒ U = 200. Z_L = 200, Z_C = 100, ΔZ = 100. Z = √(100²+100²) = 100√2. I₀ = U₀/Z = 200√2/(100√2) = **2 A**. cosφ = 100/(100√2) = √2/2 ⇒ φ = π/4 (dấu ΔZ + ⇒ cảm kháng, u sớm pha i) ⇒ φ_i = φ_u − φ = 0 − π/4 = **−π/4**. i = I₀cos(ωt+φ_i) = **2cos(100πt − π/4) A**.
**Tự kiểm:** K4 nhất quán I = I₀/√2 = √2 A, U = I·Z = √2·100√2 = 200 ✓.
**Kỳ vọng:** answers[0] = `{text:"i = 2cos(100πt − π/4) (A)", expr:{amp:"2", omega:"100π", phase:"−π/4"}, approx:2, unit:"A"}`, `approximate:false`.

---

### A7 — U CÁC PHẦN TỬ (U_R, U_L, U_C) + kiểm giản đồ vectơ

**Đề:** "Mạch RLC nối tiếp: R = 30 Ω, L = 0,8/π H, C = 2,5·10⁻⁴/π F, U = 100 V, f = 50 Hz. a) Tính U_R. b) Tính U_L. c) Tính U_C. d) Kiểm chứng U = √(U_R²+(U_L−U_C)²)."

```json
{ "problemName": "rlc-u-phan-tu",
  "source": { "f": 50, "U": 100 },
  "R": 30, "L": {"n":8,"d":10,"overPi":true}, "C": {"n":25,"d":10,"exp":-4,"overPi":true},
  "queries": [ { "kind":"voltage","of":"R","label":"a" },
               { "kind":"voltage","of":"L","label":"b" },
               { "kind":"voltage","of":"C","label":"c" },
               { "kind":"voltage","of":"source","label":"d" } ] }
```

**Tính tay:** Z_L = 100π·(0,8/π) = **80**; Z_C = 1/(100π·2,5·10⁻⁴/π) = 1/(2,5·10⁻²) = **40**. ΔZ = 40. Z = √(30²+40²) = √2500 = 50. I = 100/50 = 2 A. a) U_R = I·R = **60 V**. b) U_L = I·Z_L = **160 V**. c) U_C = I·Z_C = **80 V**. d) √(60²+(160−80)²) = √(3600+6400) = √10000 = **100 V** = U ✓.
**Tự kiểm:** K1: U_R²+(U_L−U_C)² − U² = 10000 − 10000 = 0 exact ✓.
**Kỳ vọng:** "60" V; "160" V; "80" V; "100" V — exact cả bốn (khóa K1 exact-0). (0,8 → 4/5; 2,5 → 5/2 qua scalarFromNumber.)

---

### A8 — HIỆU DỤNG ↔ CỰC ĐẠI (U₀ = U√2, I₀ = I√2)

**Đề:** "Đặt u = 100√2·cos(100πt) V vào mạch RLC nối tiếp R = 30 Ω, L = 0,8/π H, C = 2,5·10⁻⁴/π F. a) Tính điện áp hiệu dụng U hai đầu đoạn mạch. b) Tính cường độ dòng điện hiệu dụng I. c) Tính giá trị cực đại I₀ của cường độ dòng điện."

```json
{ "problemName": "rlc-hieu-dung-cuc-dai",
  "source": { "omega": {"n":100,"pi":true}, "U0": {"n":100,"rad":2} },
  "R": 30, "L": {"n":8,"d":10,"overPi":true}, "C": {"n":25,"d":10,"exp":-4,"overPi":true},
  "queries": [ { "kind":"voltage","of":"source","peak":false,"label":"a" },
               { "kind":"current","peak":false,"label":"b" },
               { "kind":"current","peak":true,"label":"c" } ] }
```

**Tính tay:** U₀ = 100√2 ⇒ a) U = U₀/√2 = **100 V** (radicand 2·... rút về hữu tỉ). Mạch giống A7 ⇒ Z = 50. b) I = U/Z = 100/50 = **2 A**. c) I₀ = I√2 = **2√2 A** ≈ 2,8284 (= U₀/Z = 100√2/50 = 2√2 ✓).
**Tự kiểm:** K4: U = I·Z = 2·50 = 100 ✓; I₀/I = √2 ✓.
**Kỳ vọng:** "100" V; "2" A; "2√2" A approx 2.8284 — exact (khóa U₀=U√2 và I₀=I√2 radicand 2).

---

### A9 — TỔNG HỢP 1: Z, I, cosφ, P exact NHƯNG φ off-grid → SỐ trung thực

**Đề:** "Mạch RLC nối tiếp: R = 40 Ω, L = 0,6/π H, C = (1/9)·10⁻³/π F, U = 120 V, f = 50 Hz. a) Tính tổng trở. b) Tính cường độ dòng điện. c) Tính hệ số công suất. d) Tính công suất tiêu thụ. e) Tính độ lệch pha φ giữa u và i."

```json
{ "problemName": "rlc-tong-hop-phi-so",
  "source": { "f": 50, "U": 120 },
  "R": 40, "L": {"n":6,"d":10,"overPi":true}, "C": {"n":1,"d":9,"exp":-3,"overPi":true},
  "queries": [ { "kind":"impedance","label":"a" }, { "kind":"current","label":"b" },
               { "kind":"power_factor","label":"c" }, { "kind":"power","label":"d" },
               { "kind":"phase_diff","label":"e" } ] }
```

**Tính tay:** Z_L = 100π·(0,6/π) = **60**; Z_C = 1/(100π·(1/9)·10⁻³/π) = 1/((1/9)·10⁻¹) = 1/(0,1/9) = **90**. ΔZ = 60−90 = −30 (dung kháng). Z = √(40²+30²) = √2500 = **50 Ω**. I = 120/50 = **12/5 A** = 2,4. cosφ = 40/50 = **4/5** = 0,8. P = I²R = (144/25)·40 = **1152/5 W** ≈ 230,4. φ: cosφ = 4/5 HỮU TỈ, KHÔNG trên lưới {1,√3/2,√2/2,1/2,0} ⇒ `phaseFromCos` trả null ⇒ φ = atan2(−30, 40) ≈ **−0,6435 rad**, `approximate:true` (dung kháng, φ < 0).
**Tự kiểm:** K1/K2/K4 exact-0 trên phần hữu tỉ; φ là nhánh số trung thực (đối chiếu tanφ = −3/4).
**Kỳ vọng:** "50" Ω; "12/5" A approx 2.4; "4/5" approx 0.8; "1152/5" W approx 230.4 (đều exact); phase_diff approx −0.6435, `approximate:true`. (KHÓA: exact Z/I/cosφ/P đồng thời với nhánh φ số trung thực — góc off-grid không snap.)

---

### A10 — TỔNG HỢP 2: cộng hưởng + đọc toàn mạch + viết i

**Đề:** "Đặt u = 100√2·cos(100πt) V vào mạch RLC nối tiếp R = 100 Ω, L = 1/π H, C = 10⁻⁴/π F. a) Mạch có cộng hưởng không? b) Tính tổng trở. c) Tính I hiệu dụng. d) Tính công suất. e) Tính hệ số công suất. f) Viết biểu thức i."

```json
{ "problemName": "rlc-tong-hop-cong-huong",
  "source": { "omega": {"n":100,"pi":true}, "U0": {"n":100,"rad":2}, "phiU": {"n":0} },
  "R": 100, "L": {"n":1,"overPi":true}, "C": {"n":1,"exp":-4,"overPi":true},
  "queries": [ { "kind":"is_resonance","label":"a" }, { "kind":"impedance","label":"b" },
               { "kind":"current","label":"c" }, { "kind":"power","label":"d" },
               { "kind":"power_factor","label":"e" }, { "kind":"write_current","label":"f" } ] }
```

**Tính tay:** Z_L = 100, Z_C = 100 ⇒ ΔZ = 0 ⇒ a) `is_resonance` = **1**, verdict `cong_huong`. b) Z = R = **100 Ω**. U₀ = 100√2 ⇒ U = 100. c) I = 100/100 = **1 A**. d) P = I²R = 1·100 = **100 W** (= UI vì cosφ = 1). e) cosφ = R/Z = **1**. f) φ = 0 ⇒ φ_i = 0; I₀ = U₀/Z = 100√2/100 = √2 ⇒ i = **√2·cos(100πt) A**.
**Tự kiểm:** K3: Z − R = 0 ✓; K2: I²R = 100 = UIcosφ = 100·1·1 ✓.
**Kỳ vọng:** "1" verdict cong_huong; "100" Ω; "1" A; "100" W; "1" (cosφ); write_current `{text:"i = √2cos(100πt) (A)", expr:{amp:"√2",omega:"100π",phase:"0"}, approx:1.4142}` — exact.

---

### Bảng tổng hợp 10 bài

| # | Dạng (yêu cầu tác giả) | Đáp chốt (text engine · approx) | Điểm khóa |
|---|---|---|---|
| A1 | Z + I (Z nguyên) | Z_L 200; Z_C 100; **Z 125**; I 2 | π triệt tiêu ⇒ hữu tỉ, Z chính phương |
| A2 | Z + I (Z căn √2) | **Z 100√2** ≈141,42; **I √2** ≈1,41 | căn thuần Scalar radicand 2 |
| A3 | Độ lệch pha góc đẹp | Z 200; **φ π/6** ≈0,52; cosφ √3/2 | SurdRat-R + inverse-trig lưới |
| A4 | Công suất + cosφ | **P 480 W**; **cosφ 12/13** | P=I²R=UIcosφ (K2) |
| A5 | Cộng hưởng (tìm f/C) | **f₀ 50 Hz**; ratio 1; I 4 A | π triệt tiêu qua √(LC); solve C=1/(10000π) |
| A6 | Viết i tức thời | **i = 2cos(100πt − π/4)** | biểu thức + inverse-trig π/4 |
| A7 | U các phần tử | U_R 60; U_L 160; U_C 80; U 100 | K1 giản đồ vectơ exact-0 |
| A8 | Hiệu dụng ↔ cực đại | U 100; I 2; **I₀ 2√2** ≈2,83 | U₀=U√2, I₀=I√2 |
| A9 | Tổng hợp (φ off-grid) | Z 50; I 12/5; cosφ 4/5; P 1152/5; **φ ≈−0,64 approximate** | exact ĐỒNG THỜI nhánh φ số trung thực |
| A10 | Tổng hợp (cộng hưởng) | ratio 1; Z 100; I 1; P 100; cosφ 1; **i = √2cos(100πt)** | cộng hưởng đọc trọn mạch |

Phủ query: `omega` (ẩn trong mọi bài, +unit test), `impedance` ×6 (A1×3, A2, A3, A9, A10 → thực đếm A1a1/a2/b, A2a, A3a, A9a, A10b), `current` ×6 (A1, A2, A5, A8×2 peak/rms, A9, A10), `voltage` ×5 (A7×4, A8), `power` ×3 (A4, A9, A10), `power_factor` ×4 (A3, A4, A9, A10), `phase_diff` ×2 (A3 lưới, A9 số), `resonance_frequency` ×1 (A5), `is_resonance` ×2 (A5, A10), `solve_resonance` ×1 (A5 biến thể), `write_current` ×2 (A6, A10). Nhánh: exact hữu tỉ, một-căn √2 (Z, I₀), căn-trong-R (Z 200), π triệt tiêu (Z_L/Z_C/f₀), inverse-trig lưới (π/6, π/4), nhánh số trung thực (φ off-grid A9).

## 12. Test plan (chỉ CỘNG, ước ~45–50 test)

- `acCircuit.test.ts` (~14): resolve f↔ω; Z_L=ωL, Z_C=1/(ωC) π triệt tiêu; Z chính phương / căn √2 / căn-trong-R; nhánh C π-không-triệt-tiêu (L=0,5 ⇒ approximate); `phaseFromCos` cả 5 mốc + off-grid null; f₀ π triệt tiêu; solve_resonance C/L/f + thay-ngược; SurdRat/LCValue dựng đúng.
- `acCompute.test.ts` (~10): từng kind ra đúng text+unit; current/voltage peak ×√2; is_resonance 3 verdict; write_current ráp chuỗi + sign pha; input số lẻ → approximate trung thực.
- `acCheck.test.ts` (~6): K1–K5 residual exact-0 trên mạch mẫu; tiêm đáp hỏng ⇒ violation; assert đúng/sai (A4 + assert `power=480` pass, `=481` violation ok:false).
- `acLayout.test.ts` (~5): 3 bất biến phasor §10.3 trên A1/A2/A7; charts 129 mẫu u–t/i–t đúng lệch pha; geometry rỗng đúng shape.
- `runAcCircuit.test.ts` (~6): parse fail superRefine §6.3 (thiếu f&ω, cả U&U0, thiếu L&C khi hỏi f₀, voltage L khi khuyết L); pipeline không throw (nhánh C, đề suy biến → errors[]).
- `ac-contract.test.ts` (10 bài §11): so `text`+`approx`+`unit`+`approximate`+`verdict`/`expr`; checks pass toàn bộ.

## 13. Ngoài phạm vi v1 — để v2+ (YAGNI, đã liệt kê chi tiết §4)

Mạch song song / RLC hỗn hợp; máy biến áp; truyền tải điện; **bài toán cực trị (L/C/f/R biến thiên)**; ba pha; cuộn dây có r; hộp đen; nguồn nhiều tần số/không sin; bài ngược nhiều số đo (trừ solve_resonance một ẩn); animate vectơ quay + UI giản đồ/đồ thị; wiring (index.ts/bridge/route + quota F1/prompt/few-shot); tag registry seed (P0); biến thể unit mV/kV/kHz.

## 14. Đối chiếu quy ước ĐÃ DUYỆT — spec này tuân thế nào

| Quy ước | Áp dụng |
|---|---|
| F2/D1 — unit per-quantity, engine đổi exact | §6.1: LCValue `exp`/`overPi`, SurdRat `rad`; §6.4 answers[].unit engine ghi; LLM không nhân/chia gì |
| C6 — answers[].unit do engine | §6.4 bảng kind → unit cố định |
| D5 — mỗi query MỘT số | §8: kể cả is_resonance (ratio + verdict), write_* (biểu thức + expr cấu trúc, ngoại lệ ghi rõ §8.2) |
| Tag 4 tầng | §3.6: 10 tag `ly/12/dien-xoay-chieu/<skill>` đề xuất seed; v1 tự gắn `['physics','ac-circuit']` |
| EPS hai tầng (1e-6 / 1e-3) | §9 giữ trị số + lý do; residual exact-0 khi cùng bậc |
| Label trần (F8/§15.1) | §10.2 geometry rỗng (không label); §10.3 phasor.valueText chỉ SỐ ĐỀ CHO |
| Exact-first, thập phân ở bridge (§15.2) | §11 text engine exact ("100√2", "π/6", "12/13", "1152/5"); "≈" chỉ đối chiếu |
| Field spelling v0 (§15.3) | field mới (overPi/rad/exp/peak) per-quantity nhất quán mẫu waves `Sci`; field dùng chung để bridge lo |
| PiScalar tái dùng, không phát minh lại | §2/§3 import nguyên `piScalar.ts`; chỉ THÊM `phaseFromCos` (đọc EXACT_COS/so struct, không sửa file) |
| Pipeline không throw (OS-2) | §6.3 refine >0; §9 guard; §5 try/catch runAcCircuit → errors[] |
| F1 route quota | §5 chép nhắc |
| scalarFromNumber import từ kinematics | §5 import list |
| D6 — dữ liệu ngoài GeometryData mất khi lưu lịch sử | §10.3 phasor + charts + table cùng số phận, ghi rõ |

## 15. Điểm phân vân — cho phản biện (CHƯA phán quyết)

1. **π TRỘN CĂN (chỗ khó nhất — §3):** Khẳng định của spec: **π luôn chết TRƯỚC dấu căn** — nhánh A/B (π triệt tiêu ⇒ căn thuần Scalar exact) và nhánh C (π không triệt tiêu ⇒ `addP` collapse ⇒ float trung thực); **exact-với-π-dưới-căn KHÔNG xảy ra** với input đề thật (cần R² và (Z_L−Z_C)² cùng bậc π chẵn ≠ 0 — R không bao giờ mang π). Đề nghị: **giải TRỌN trên PiScalar**, để cơ chế `collapse` của `addP`/`sqrtP` tự phân exact/float, KHÔNG special-case "lift về Scalar tại k=0". Phản biện cần xác nhận: (a) có ca đề thi nào π sống dưới căn exact không? (tôi khẳng định không); (b) `sqrtP(k=0)` = `sqrt(Scalar)` có đúng mọi radicand ≤ MAX_SAFE_RADICAND không (√20000, √40000, √16900 — đã kiểm tay)?

2. **Góc đẹp đạt được (§3.4):** Vì tanφ = (Z_L−Z_C)/R HỮU TỈ ở nhánh A, **chỉ φ ∈ {0, ±π/4} đạt được với R hữu tỉ**; **φ = ±π/6 đòi R = 100√3 (SurdRat)**; **φ = ±π/3 đòi R = 100√3/3 (hiếm)**. Câu hỏi: `phaseFromCos` nên dò TRỌN lưới {0,π/6,π/4,π/3,π/2} (chấp nhận π/3 hiếm) hay chỉ {0,π/4,π/6}? Và **bài NGƯỢC "cho cosφ = 0,5 tìm R/Z"** (cho trước hệ số công suất) — chiều query ngược, NGOÀI phạm vi v1 hay thêm query `solve_from_power_factor`? Đề nghị: dò trọn lưới; bài ngược cosφ để v2.

3. **SurdRat cho R và U₀ (§6.1):** Cần để (a) φ = π/6 (R = 100√3), (b) chép trung thực "u = 200√2 cos" (U₀ = 200√2) không bắt LLM tính /√2. Nhược: schema thêm một union lạ mắt. Thay thế: cho LLM khai số thập phân rồi `recognize` — BÁC (mất exact, √3·100 = 173,2 recognize có thể trượt). Đề nghị: GIỮ SurdRat (LLM chép "100√3" → {n:100,rad:3}).

4. **LCValue `overPi`/`exp` (§6.1):** L = a/π, C = b·10ⁿ/π. Có nên tách `exp` (mirror waves `Sci`) hay ép mọi C vào thập phân? 10⁻⁴ ok với `scalarFromNumber` nhưng 10⁻⁵, 10⁻⁶ cần `exp` bigint để chắc exact. Đề nghị: GIỮ `{n,d,exp,overPi}`.

5. **write_current/write_voltage trả BIỂU THỨC (§8.2):** ngoại lệ D5 (text = chuỗi, `expr` = {amp,omega,phase}, approx = biên độ). Chấp nhận như `verdict` của lamp_check? Hay tách thành 3 query con (amplitude/omega/phase) rồi để bridge ráp? Đề nghị: GIỮ một query `write_*` (đề VN hỏi "viết biểu thức i" là MỘT câu).

6. **Entry riêng `runAcCircuit` (§5):** như dc `runCircuit` (thi công song song, không đụng v0/dc). Hợp nhất một cửa (discriminator subject) là việc wiring. Xác nhận GIỮ entry riêng.

7. **Scene: geometry RỖNG + charts(u–t,i–t) + phasor draft (§10):** đủ cho v1 (dc precedent) hay muốn animate **vectơ quay** (hai vectơ u, i quay ω) ngay v1? Đề nghị: geometry rỗng + charts (kênh trực quan chính) + phasor dữ-liệu-chờ-UI; vectơ quay v-next.

8. **Phụ thuộc merge (§5):** AC dùng `piScalar.ts` ⇒ code SAU dao động. Xác nhận thứ tự merge (dao động → sóng → AC), hoặc thi công chung cây `physics/`.

9. **is_resonance / solve_resonance ngữ nghĩa (§8.1/§7.3):** verdict tam phân (cộng hưởng / tính cảm / tính dung); solve target C/L/f. Cộng hưởng "gần đúng" (float, |dZ| ≤ EPS_SELF) có nên verdict cong_huong hay để số? Đề nghị: exact-0 ⇒ cong_huong; float sát 0 ⇒ verdict theo ngưỡng EPS_SELF + ghi checks.

10. **Cuộn dây thuần cảm (§4):** v1 coi L thuần cảm (không r). Đề "cuộn dây (r, L)" rất phổ biến đề 12 — abstain có làm mất quá nhiều đề không? Về đại số chỉ là thêm một R nối tiếp, nhưng "U hai đầu cuộn dây" = √(U_r²+U_L²) đổi ngữ nghĩa `voltage{of:'L'}`. Đề nghị: v1 abstain, v-next thêm `coil{r,L}` (một mở rộng nhỏ, đáng làm sớm).

## 16. Tiêu chí thành công

1. 10 bài contract §11 chạy qua `runAcCircuit` ra ĐÚNG đáp tính tay: text/approx/unit/approximate khớp từng câu; A3/A6 φ lưới; A9 φ số trung thực (`approximate:true`); A5/A10 verdict cộng hưởng; A6/A10 `expr` đúng.
2. Mọi bài có `checks[]` K1–K5 pass với residual exact-0 (nhánh A/B); assert sai ⇒ violations + ok:false.
3. `approximate:false` trên toàn bộ đại lượng nhánh A/B của 10 bài (trừ đúng φ off-grid A9) — chứng thực cam kết §3.1: **π triệt tiêu, căn thuần Scalar giữ exact**.
4. `geometry` rỗng đúng shape `{name, points:[], lines:[], tags:['physics','ac-circuit']}`; `phasor` qua 3 bất biến; charts 129 mẫu u–t/i–t đúng lệch pha.
5. Toàn suite: test cũ XANH nguyên, chỉ CỘNG test mới; `git status` chỉ thấy file mới trong `api/_lib/kernel/physics/`; `npx tsc --noEmit -p tsconfig.kernel.json` sạch; KHÔNG sửa `piScalar.ts`/`scalar.ts`/file v0/dc.

## 17. Phán quyết chung (kế thừa đợt 2 — áp cho pack này)

Ba luật chung ĐÃ DUYỆT (`../reviews/2026-08-21-wave2-specs-review.md`):
1. **Label trần:** scene KHÔNG nhúng giá trị engine tính. *AC v1 geometry rỗng (§10.2) — không label để vi phạm; ranh giới tương lai: `phasor.valueText` chỉ SỐ ĐỀ CHO, không đưa giá trị engine TÍNH (Z, I, U_L…) vào khi làm UI giản đồ.*
2. **Exact-first, thập phân ở bridge:** engine giữ text exact ("100√2 Ω", "π/6 rad", "1152/5 W"); formatter thập phân VN là việc bridge/UI. *"≈" trong §11 chỉ đối chiếu.*
3. **Chính tả field query theo v0:** field dùng chung (`value`/`vUnit`/`component`) theo v0 khi bridge hợp nhất. *AC không có field vận tốc; field mới (overPi/rad/exp/peak/target) per-quantity nhất quán mẫu waves `Sci`.*

---

*Spec DỰ THẢO — chờ phản biện. Mọi khẳng định về hành vi code có sẵn (`piScalar.ts` addP-collapse/sqrtP/EXACT_COS, `scalar.ts` sqrtExact/makeExact một-căn, `recognize.ts`, `certifyPiScalar`) đã kiểm bằng đọc code thật ngày 22/08/2026; mọi con số trong 10 bài contract A1–A10 đã kiểm bằng script số học độc lập (Math.PI/sqrt) — Z (125, 100√2, 200, 130, 50), I (2, √2, 4, 12/5, 1), cosφ (12/13, √3/2, √2/2, 4/5, 1), P (480, 1152/5, 100), f₀ (50), φ (π/6, π/4, −0,6435) đều khớp.*
