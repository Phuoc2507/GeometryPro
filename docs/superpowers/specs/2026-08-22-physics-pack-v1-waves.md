# Physics Pack v1 — SÓNG CƠ & SÓNG ÂM lớp 11 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-22
**Trạng thái:** DỰ THẢO — CHỜ PHẢN BIỆN (sẽ bị phản biện trước khi code, như dao động/động lực học/dc-circuit). Điểm phân vân tập trung ở §16.
**Phạm vi:** Mở rộng engine Vật lý (nền v0 động học — `2026-08-21-physics-pack-design.md`; tái dùng tầng π của `2026-08-21-physics-pack-v1-oscillation.md`) cho chương **Sóng cơ và sóng âm** Vật lí 11. Chỉ THÊM file vào `api/_lib/kernel/physics/**` + test; điểm chạm với v0 gói trong 2 FILE (`planSchema.ts`, `runPhysics.ts`) — kê DIFF trung thực từng dòng ở §13. KHÔNG sửa core kernel, KHÔNG sửa `src/**`, KHÔNG đụng file v0 (kinematics/compute/scene).
**Ràng buộc kế thừa (ĐÃ DUYỆT — không mở lại):**
- Unit per-quantity, engine đổi exact bằng hữu tỉ (F2/D1 — `../reviews/2026-08-21-arch-physics-review-phien1.md`).
- `answers[].unit` do engine ghi (C6); tol hai tầng `EPS_SELF=1e-6` / `TOL_ASSERT=1e-3` (C10/F6); KHÔNG đặt hằng mới.
- **Label scene TRẦN** — KHÔNG nhúng giá trị (đề cho hay engine tính) vào bất kỳ nhãn nào; mọi giá trị ở `answers[]` (F8 / OS-1 / phán quyết chung §15.1 đợt 2 — `../reviews/2026-08-21-wave2-specs-review.md`).
- **Exact-first**, thập phân kiểu VN ("0,4 m") là việc tầng bridge/UI; engine giữ text exact ("2/5 m", "2π/3 rad") (phán quyết chung §15.2 đợt 2).
- **PiScalar** (hữu tỉ + một căn)·πᵏ TÁI DÙNG NGUYÊN từ oscillation §3 — KHÔNG phát minh lại (điểm son phản biện đợt 2 xác nhận PiScalar cần & đủ; recognize KHÔNG nhận π², √b·π, k/π).
- Tag 4 tầng `ly/11/song-co/<skill>` và `ly/11/song-am/<skill>` (C4/F10) — §14.
- Chính tả field query dùng chung theo v0 (`value`/`vUnit`/`component`) (§15.3 đợt 2).
- Pipeline KHÔNG BAO GIỜ throw ra route/bridge (OS-2): suy biến số học bị chặn tại zod-refine hoặc guard, lưới cuối là try/catch trong runPhysics đổi Error → `errors[]` + `ok:false`.

---

## 1. Mục tiêu (một câu)

Bài sóng cơ/sóng âm: **LLM chỉ DỊCH đề → khai dữ kiện vào WaveOp/SoundSourceOp (không tính hộ một phép nào — không đổi km/h, không suy λ từ hệ số πx/12, không lấy log, không nhân v=λf); ENGINE tất định TÍNH bằng công thức đóng (hữu tỉ + một căn cho v/λ/f/T; PiScalar cho pha/li độ/độ-lệch-pha/cường-độ-điểm; đếm nghiệm nguyên bằng bigint cho giao thoa/sóng dừng; log10 tách nhánh exact/số cho dB), TỰ KIỂM bằng thay-ngược + đếm-hai-cách + hệ thức độc lập, và XUẤT scene** (Agent3D + `parametric_path` phần tử dao động ngang, đã xác minh render qua oscillation §2.2) + dữ liệu đồ thị u-x/u-t. Mô hình không khớp đề ⇒ violation, KHÔNG bịa đáp số.

## 2. Nền tảng & tái dùng (đã đọc code thật + kế thừa xác minh của oscillation)

| Cần | Đã có | Dùng lại thế nào |
|---|---|---|
| Số học hữu tỉ + một căn (v, λ, f, T, đếm, tỉ số cường độ) | `scalar.ts` (`Scalar`, `add/sub/mul/div/sqrt`, `displayScalar`) | Mọi đại lượng sóng KHÔNG chứa π là `Scalar` thuần |
| **(hữu tỉ+căn)·πᵏ** (pha, li độ, độ lệch pha, cường độ nguồn điểm I=P/4πr²) | `piScalar.ts` (oscillation v1 §3: `PiScalar`, `mulP/divP/addP/subP/sqrtP/cosP/sinP`, `EXACT_COS` vòng tròn 16 điểm, `displayPiScalar`, `certifyPiScalar`) | Pha sóng = 2π(t/T − x/λ) là PiScalar bậc 1 → cosP qua lưới 16 điểm y HỆT dao động |
| Nhập số mang π & phân số | `PiRat` (oscillation §3.1: `{n,d,pi}`) | ω, hệ số không gian 2π/λ, φ khai bằng PiRat — LLM chép tử/mẫu literal |
| Chứng nhận exact ↔ float | `compute/answer.ts` `certifyScalar`; `piScalar.ts` `certifyPiScalar` | Mọi đáp qua certify — kể cả dB (§10: intLog10 SINH ứng viên exact, certifyScalar THẨM ĐỊNH bằng `Math.log10` độc lập) |
| Nhận dạng căn/π đẹp từ float | `analysis/recognize.ts` | Lưới an toàn tầng 2 khi exact chết (đáp li độ off-grid) |
| Số → Scalar | `kinematics.ts` `scalarFromNumber` (v0; dc-circuit review chốt import từ đây) | A, λ, v, d… thập phân hữu hạn ≤9 lẻ → hữu tỉ exact |
| Quy ước scene/timeline/playback | v0 §8 + oscillation §9 (map (x,0,y), `landing_point` bắt buộc, `t*t` KHÔNG `t^2`, `Math.cos` chạy qua `new Function`, quy tắc k 3–15 s, bảng màu, radius) | §11 kế thừa nguyên, phần tử sóng dao động ngang = SHM có lệch pha |
| Khung PhysicsPlan | v0 §5 (`units`, `asserts`, `charts`, `scene`) | Sóng chỉ THÊM 2 op + query vào 2 union |

**Hai xác minh code MÀ oscillation ĐÃ chạy thật (kế thừa, không lặp lại):** (a) `recognize.ts` KHÔNG nhận π²/√b·π/k/π ⇒ PiScalar là bắt buộc cho pha/cường-độ-điểm; (b) `AnimatedAgent` eval được `Math.cos(...)` qua `new Function` ⇒ phần tử sóng animate được. Bốn ràng buộc cú pháp biểu thức timeline (KHÔNG `^`, KHÔNG dấu phẩy trong biểu thức, KHÔNG chuỗi con `x_start/…/vz`, KHÔNG `=`) giữ nguyên oscillation §2.2.

**Điểm mới DUY NHẤT ngoài trường của oscillation:** hàm **log10** cho mức cường độ âm — vô tỉ, KHÔNG nằm trong (hữu tỉ+căn)·πᵏ. Xử lý ở §10 (tách nhánh: lũy thừa-10-đẹp ⇒ exact; ngược lại ⇒ số + cờ approximate). Đây là lý do chương này cần thiết kế riêng ngoài phần tái dùng.

## 3. Vì sao dựng được gọn

Toàn bộ đại lượng sóng cơ bản **v = λf = λ/T** và **T = 1/f** là số học hữu tỉ THUẦN (π chỉ xuất hiện ở pha, độ lệch pha, và I nguồn điểm). Giao thoa/sóng dừng quy về **đếm nghiệm nguyên trong khoảng hữu tỉ** — tất định bằng bigint, KHÔNG float. Phương trình sóng u = A·cos(ωt − 2πx/λ + φ) là **đúng cỗ máy pha của dao động** (pha = PiScalar bậc 1, cos qua lưới 16 điểm). ⇒ ba mảng (đại lượng · giao thoa/dừng · phương trình) tái dùng gần hết; chỉ dB là mới.

## 4. Dạng bài phủ (v1)

| Nhóm | Dạng | Op | Query |
|---|---|---|---|
| Đại lượng sóng | v↔λ↔f↔T | `wave` | `speed`, `wavelength`, `frequency`, `period` |
| Phương trình sóng | li độ tại (x,t) từ pt cho sẵn | `wave` (mode hệ số pt) | `displacement_at{x,t}` |
| Độ lệch pha | Δφ giữa hai điểm cách d | `wave` | `phase_difference{d}` |
| Giao thoa 2 nguồn cùng pha | đếm cực đại/cực tiểu trên đoạn nối 2 nguồn | `wave` | `interference_count{separation, kind}`; phân loại 1 điểm `interference_point{d1,d2}` |
| Sóng dừng | số bụng/nút, λ, tần số (hai đầu cố định; một đầu tự do) | `wave` | `standing_antinodes`, `standing_nodes`, `standing_wavelength`, `standing_frequency`, `standing_min_frequency` |
| Sóng âm | cường độ ↔ mức cường độ (dB); nguồn điểm; chênh mức theo khoảng cách | `sound_source` | `sound_intensity`, `sound_level`, `sound_level_difference`, `distance_for_level` |

**NGOÀI phạm vi v1 (ghi rõ, có chủ đích — §15):** giao thoa nhiều hơn 2 nguồn; sóng điện từ; hiệu ứng Doppler; hiện tượng phách (giao thoa theo thời gian). Cùng: đếm cực đại/tiểu trên đoạn MN BẤT KỲ (không phải đoạn nối nguồn); quãng đường/số lần trong Δt; cộng mức cường độ nhiều nguồn khi n không phải lũy thừa 10 đẹp (số, để v-next); sóng dừng có đầu tự do phối hợp phức tạp / ống sáo cột khí (mô hình cùng công thức nhưng khai riêng — chỉ hỗ trợ dây một-đầu-tự-do).

## 5. Schema (zod) — `waveSchema.ts`, nối vào PhysicsPlanSchema v0

Sóng THÊM 2 op (`wave`, `sound_source`) và các query vào 2 `discriminatedUnion` của v0. Khung plan (`units`/`asserts`/`charts`/`scene`) giữ nguyên. Ba ràng buộc CẤP PLAN (sống trong `planSchema.ts` v0 — DIFF 1 §13):

1. `units.time` = `'s'` khi plan có op sóng (đề phổ thông không dùng phút/giờ cho sóng).
2. `units.length` ∈ {`'m'`,`'cm'`} (đề VN trộn cm cho sóng cơ, m cho sóng âm — translator khai theo đề).
3. **superRefine CẤM TRỘN op sóng (`wave`/`sound_source`) với op CHƯƠNG KHÁC (`mover1d`/`free_fall`/`projectile`/`oscillator`)** trong cùng plan — như OS-4: plan trộn + `units.length='cm'` làm `qty*` của kinematics THROW; đề hỗn hợp (hiếm) ⇒ bridge tách plan. **`wave` + `sound_source` ĐƯỢC trộn** (cùng chương — bài "âm f, v: bước sóng? mức cường độ?" là một sóng âm duy nhất).

```ts
// api/_lib/kernel/physics/waveSchema.ts
import { z } from 'zod';
const Num = z.number().finite();
const Obj = z.string().min(1);
// PiRat tái dùng NGUYÊN từ oscSchema (oscillation §3.1): 5 | {n,d?,pi?} — (n/d)·π^(pi?1:0)
import { PiRat } from './oscSchema';

const LenUnit  = z.enum(['m', 'cm']);
const SpeedUnit = z.enum(['m/s', 'cm/s']);

// Sci — SỐ KHOA HỌC EXACT: giá trị = n·10^exp (÷ d). Vì 10⁻¹² (I₀) có 12 chữ số lẻ,
// VƯỢT trần ≤9 của scalarFromNumber (rơi float, phá exact) — phải khai lũy thừa 10 tường minh,
// engine dựng hữu tỉ bằng BIGINT 10^|exp|. LLM chép "10⁻⁵" → {n:1, exp:-5}; "2·10⁻⁵" → {n:2, exp:-5}.
const Sci = z.union([
  Num,
  z.object({ n: Num, d: z.number().int().positive().default(1), exp: z.number().int().default(0) }),
]);

// ── OP 1: WAVE — sóng cơ/âm truyền một chiều trên môi trường ──
export const WaveOp = z.object({
  op: z.literal('wave'), name: Obj,
  A: Num.positive().optional(),                 // biên độ (units.length) — cần cho displacement/scene animate
  // NGUỒN TẦN SỐ (0..n; ≥2 ⇒ ưu tiên + auto-assert §6.2). f/T π-tự-do; omega mang π.
  f: Num.positive().optional(),                 // Hz
  T: Num.positive().optional(),                 // s
  omega: PiRat.optional(),                       // rad/s — dùng khi đề cho pt "…cos(20πt−…)"
  // NGUỒN BƯỚC SÓNG / TỐC ĐỘ (cần 1, cùng với 1 nguồn tần số ⇒ đủ; hoặc lambda+speed ⇒ suy f)
  lambda: Num.positive().optional(),            // bước sóng (units.length)
  speed: Num.positive().optional(),             // tốc độ truyền sóng
  speedUnit: SpeedUnit.optional(),              // đơn vị speed (vắng = units.length/s) — bài "v=2 m/s, λ cm" khai đây
  spaceCoeff: PiRat.optional(),                 // HỆ SỐ KHÔNG GIAN của pt = 2π/λ (vd πx/12 → {n:1,d:12,pi:true}); engine suy λ=2π/spaceCoeff
  // PHA & CHIỀU (cho displacement/scene)
  phi: PiRat.optional(),                         // pha ban đầu φ (rad)
  direction: z.enum(['+x', '-x']).default('+x'),// pt u=Acos(ωt − 2πx/λ + φ) ⇒ '+x'; dấu '+' trong pt ⇒ '-x'.
                                                 // LLM ĐỌC DẤU của số hạng x (không tính) → chọn enum.
});

// ── OP 2: SOUND_SOURCE — nguồn âm (điểm hoặc cường độ cho trực tiếp) ──
export const SoundSourceOp = z.object({
  op: z.literal('sound_source'), name: Obj,
  I0: Sci.default({ n: 1, exp: -12 }),           // cường độ âm chuẩn (W/m²) — mặc định 10⁻¹²
  power: Sci.optional(),                          // công suất P (W) ⇒ nguồn điểm đẳng hướng, I(r)=P/(4πr²)
  intensity: z.object({ I: Sci, atDistance: Num.positive().optional(), rUnit: LenUnit.optional() }).optional(),
                                                 // cường độ I cho trước (W/m²), kèm khoảng cách nếu là nguồn điểm
  level: z.object({ L: Num, atDistance: Num.positive().optional(), rUnit: LenUnit.optional() }).optional(),
                                                 // mức cường độ L (dB) cho trước ⇒ I = I0·10^(L/10)
  // refine: cần ĐÚNG MỘT trong {power, intensity, level} làm nguồn gốc; atDistance bắt buộc khi là nguồn điểm
});

export const WaveQuerySchema = z.discriminatedUnion('kind', [
  // — đại lượng sóng —
  z.object({ kind: z.literal('speed'), of: Obj, unit: SpeedUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('wavelength'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('frequency'), of: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('period'), of: Obj, label: z.string().optional() }),
  // — phương trình sóng —
  z.object({ kind: z.literal('displacement_at'), of: Obj, x: Num, t: PiRat, label: z.string().optional() }),
  // — độ lệch pha (d ≥ 0, units.length) —
  z.object({ kind: z.literal('phase_difference'), of: Obj, d: Num.nonnegative(), label: z.string().optional() }),
  // — giao thoa 2 nguồn cùng pha —
  z.object({ kind: z.literal('interference_count'), of: Obj, separation: Num.positive(),
             kind2: z.enum(['max', 'min']), label: z.string().optional() }),   // kind2 vì 'kind' đã dành cho discriminant
  z.object({ kind: z.literal('interference_point'), of: Obj, d1: Num.nonnegative(), d2: Num.nonnegative(), label: z.string().optional() }),
  // — sóng dừng (boundary: hai đầu cố định | một đầu tự do) —
  z.object({ kind: z.literal('standing_antinodes'), of: Obj, length: Num.positive(),
             boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'),
             loops: z.number().int().positive().optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('standing_nodes'), of: Obj, length: Num.positive(),
             boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'),
             loops: z.number().int().positive().optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('standing_wavelength'), of: Obj, length: Num.positive(),
             boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'),
             loops: z.number().int().positive(), label: z.string().optional() }),   // loops BẮT BUỘC ở đây
  z.object({ kind: z.literal('standing_frequency'), of: Obj, length: Num.positive(),
             boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'),
             loops: z.number().int().positive(), label: z.string().optional() }),
  z.object({ kind: z.literal('standing_min_frequency'), of: Obj, length: Num.positive(),
             boundary: z.enum(['two-fixed', 'one-free']).default('two-fixed'), label: z.string().optional() }),
  // — sóng âm —
  z.object({ kind: z.literal('sound_intensity'), of: Obj, atDistance: Num.positive().optional(), rUnit: LenUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('sound_level'), of: Obj, atDistance: Num.positive().optional(), rUnit: LenUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('sound_level_difference'), of: Obj, fromDistance: Num.positive(), toDistance: Num.positive(), rUnit: LenUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('distance_for_level'), of: Obj, level: Num, rUnit: LenUnit.optional(), label: z.string().optional() }),
]);
```

**Refine của op (chặn suy biến từ zod — OS-2 kỷ luật không-throw):**
- `wave`: phải suy được **ít nhất một cặp độc lập** trong {f/T/omega ; lambda/spaceCoeff ; speed} để có λ,f — nếu không, query đụng tới trả `errors` (KHÔNG chặn ở zod vì tùy query cần gì; guard ở normalize §6). `f`,`T`,`speed`,`lambda`,`A` > 0 (đã `.positive()`); `omega`,`spaceCoeff`: `n > 0` sau PiRat (T=0/ω=0 làm divP THROW). `direction` mặc định `'+x'`.
- `sound_source`: superRefine "đúng một nguồn gốc {power|intensity|level}"; nếu `power` hoặc (`intensity`/`level` có ý nghĩa theo r) thì nguồn điểm ⇒ query dùng `atDistance` phải khớp có `atDistance` gốc (§6.3). `I0` > 0.
- Discriminant field vẫn là `kind`; field thứ-loại của giao thoa đặt tên **`kind2`** để không đụng discriminant (max/min).

**Vì sao KHÔNG cho LLM tính (chống R1):** schema chỉ nhận **dữ kiện literal** — `spaceCoeff` là hệ số πx nguyên văn (KHÔNG nhận λ đã suy); `omega` là 20π nguyên văn (KHÔNG nhận f); `intensity` là `{n,exp}` (KHÔNG nhận log). Engine suy MỌI thứ. Không có ô nào để LLM nộp số đã tính.

## 6. Chuẩn hóa op → WaveModel / SoundModel (`waves.ts` — thuần)

```ts
type WaveModel = {
  name: string;
  A: Scalar | null;          // units.length
  f: Scalar | null;          // Hz (π-tự-do)
  T: Scalar | null;          // s = 1/f
  lambda: Scalar | null;     // units.length
  v: Scalar | null;          // units.length/s
  omega: PiScalar | null;    // 2π·f (bậc 1) — chỉ dựng khi cần pha
  spaceK: PiScalar | null;   // 2π/λ (bậc 1) — hệ số không gian của pha
  phi: PiScalar | null;      // rad
  dir: 1 | -1;               // +x: pha = ωt − spaceK·x ; -x: pha = ωt + spaceK·x
  op: WaveOp;
};
type SoundModel = {
  name: string;
  I0: Scalar;                // W/m² (exact qua Sci)
  // MỘT trong hai đường:
  Ppower: Scalar | null;     // W (nguồn điểm) ⇒ I(r) = P/(4π r²) = PiScalar bậc −1
  Iref: Scalar | null; rRef: Scalar | null;  // cường độ đã biết tại rRef (nghịch đảo bình phương); rRef=null ⇒ I tại điểm khảo sát
  op: SoundSourceOp;
};
```

### 6.1. Đơn vị — per-quantity, engine đổi exact (F2/D1)

| Đổi | Hệ số exact | Dùng ở |
|---|---|---|
| m/s ↔ cm/s (speed) | ×100 / ×1/100 | speed khai lệch units.length |
| cm ↔ m (r sound) | ×1/100 / ×100 | `rUnit` lệch (sound dùng r nội bộ theo m — SI của I) |
| Sci n·10^exp → hữu tỉ | bigint 10^\|exp\| | I, I₀, P |

Trong một op sóng cơ, λ/A/x/d/separation/length CÙNG `units.length` (đề không trộn). `speed` được phép lệch (`speedUnit`) → engine đổi về `units.length`/s exact. Sound: I,I₀ theo W/m² (SI); r theo m (đổi cm→m nếu `rUnit='cm'`) vì công thức dB định nghĩa trong SI.

### 6.2. Resolution WaveModel — ưu tiên + auto-assert (dữ kiện dư thành tự kiểm)

- **Tần số:** ưu tiên `f > T(→1/T) > omega(→omega/2π)`. Nếu chỉ có `lambda`+`speed` ⇒ f = v/λ.
- **Bước sóng/tốc độ:** `lambda` trực tiếp; `spaceCoeff` ⇒ λ = divP(2π, spaceCoeff) (bậc 1−1=0 ⇒ Scalar, π triệt tiêu); `speed` trực tiếp. Có f + một trong {λ, v} ⇒ suy nốt cái còn lại bằng v = λf.
- **omega/spaceK dựng khi cần pha:** ω = mulP(2π, f) (bậc 1); spaceK = divP(2π, lambda) (bậc 1). Nếu op khai omega/spaceCoeff trực tiếp → dùng nguyên (khỏi dựng lại), và f/λ suy ngược để phủ query đại lượng.
- **Nguồn DƯ ⇒ auto-assert:** khai cả (f, λ, v) mà v ≠ λf ⇒ check "nguồn dư khớp" lệch ⇒ `violations` (dịch sai đề), ok:false. Exact khi cùng trường, ngược lại |Δ| ≤ EPS_SELF·scale.
- **Thiếu nguồn ⇒ null;** query đụng tới ⇒ `errors: "cần <đại lượng> — đề thiếu dữ kiện hoặc dịch thiếu"`, KHÔNG bịa.
- **Query trỏ nhầm loại op (OS-6):** query sóng có `of` trỏ op không phải `wave`/`sound_source` phù hợp ⇒ error tường minh "query <kind> trỏ '<name>' — sai loại op", không rơi thành lỗi mù.

### 6.3. Resolution SoundModel

- `level{L, atDistance?}` ⇒ Iref = I0·10^(L/10) (§10 — exact khi L ≡ 0 mod 5), rRef = atDistance (hoặc null ⇒ I tại điểm khảo sát, hằng).
- `intensity{I, atDistance?}` ⇒ Iref = I (Sci→Scalar), rRef = atDistance.
- `power{P}` ⇒ Ppower = P; nguồn điểm; I(r) = divP(P, mulP(4π, r²)) = PiScalar bậc −1 (display "P/(4πr²)"). **Hệ quả:** mức tuyệt đối từ P là SỐ (log của tỉ số chứa π); nhưng CHÊNH mức / tỉ số hai khoảng cách ⇒ π TRIỆT TIÊU ⇒ exact (§10.3). Ghi rõ để phản biện soát (§16.5 — có nên giữ `power` khi phần lớn ra số?).
- Nguồn điểm (Ppower hoặc rRef≠null): I(r) = Iref·(rRef/r)² (nghịch đảo bình phương) — π đã ước trong tỉ số nên đường này Scalar thuần.

## 7. Công thức đóng — đại lượng sóng, phương trình, độ lệch pha (`waveCompute.ts`)

Mọi query chạy SONG SONG một bản float độc lập làm `floatRef` cho certify.

| Query | Công thức | Đường exact điển hình |
|---|---|---|
| `speed` | v = λ·f (hoặc model.v) | 20·10 = 200 (hữu tỉ); unit override m/s ×1/100 |
| `wavelength` | λ (model) | 340/500 = 17/25 (hữu tỉ); từ spaceCoeff: 2π/(π/12)=24 |
| `frequency` | f (model) | 1/T, v/λ — hữu tỉ |
| `period` | T = 1/f | 1/10 s |
| `displacement_at{x,t}` | u = A·cosP(pha(x,t)); pha = ωt − dir·spaceK·x + φ | ωt, spaceK·x, φ CÙNG bậc 1 ⇒ pha bậc 1; rút gọn mod 2 ⇒ lưới 16 ⇒ cos exact |
| `phase_difference{d}` | Δφ = mulP(spaceK, d) = 2π·d/λ (bậc 1) | d/λ hữu tỉ ⇒ `2π/3` exact; trả GIÁ TRỊ ĐẦY ĐỦ (không rút mod 2π — "độ lệch pha" theo nghĩa đen); phân loại cùng/ngược/vuông pha là việc lời giải |

**Pha PiScalar:** `pha(x,t) = addP(subP(mulP(ω, toPiScalar(t)), mulP(spaceK, scalarToPi(x))·dir), φ)`. Vì ω, spaceK bậc 1 và t, x hữu tỉ ⇒ mỗi hạng bậc 1 ⇒ addP/subP CÙNG bậc ⇒ pha bậc 1 exact. cosP: rút s mod 2 bằng số học hữu tỉ (bigint) rồi tra `EXACT_COS` (q ∈ {1,2,3,4,6} ⇒ exact; q khác ⇒ float, `approximate:true` — như O10b oscillation). Certify qua `certifyPiScalar` (floatRef = A·Math.cos(approxPha)).

**Off-grid trung thực:** nếu ωt là bậc 0 (đề "u=5cos(2t−…)", ω không π) cộng φ bậc 1 ⇒ addP collapse ⇒ float; cos số; recognize thường trượt ⇒ `approximate:true`. Bài này KHÔNG nằm trong 10 contract (phủ ở unit test) nhưng là hành vi hợp lệ.

## 8. Đếm nghiệm nguyên — giao thoa (`waves.ts`)

Hai nguồn kết hợp CÙNG PHA cách nhau `separation` = L; điểm M trên đoạn nối hai nguồn có hiệu đường đi δ = d₂ − d₁ ∈ (−L, L). Cực đại: δ = kλ; cực tiểu: δ = (k+½)λ, k ∈ ℤ. Đặt **a = L/λ** (Scalar hữu tỉ = P/Q, bigint, đã đổi cùng đơn vị).

- **Cực đại:** đếm k với −a < k < a.
- **Cực tiểu:** đếm k với −a − ½ < k < a − ½ (từ \|(k+½)λ\| < L).

**Hàm lõi `countIntOpen(loN, loD, hiN, hiD): number`** — đếm số nguyên k với loN/loD < k < hiN/hiD (tất cả bigint, loD,hiD>0):
```
smin = floordivBig(loN, loD) + 1      // số nguyên NHỎ NHẤT > lo  (floordiv làm tròn xuống −∞)
smax = ceildivBig(hiN, hiD) - 1       // số nguyên LỚN NHẤT  < hi  (ceildiv làm tròn lên +∞)
return smax >= smin ? Number(smax - smin + 1) : 0
```
- Cực đại: `countIntOpen(−P, Q, P, Q)`.
- Cực tiểu: `countIntOpen(−(2P+Q), 2Q, 2P−Q, 2Q)`.

**ĐẾM HAI CÁCH (yêu cầu tự kiểm — đối chiếu):** *Cách 1* = `countIntOpen` (floor/ceil bigint). *Cách 2* = liệt kê k ∈ [smin−2, smax+2], đếm k thỏa `loN·1 < k·loD ∧ k·hiD < hiN` (so hữu tỉ bằng nhân chéo bigint — KHÔNG float). `checks[]` ghi `"giao thoa: cách1=<n>, cách2=<n>, khớp"`; lệch ⇒ `violations` (bắt bug đếm) + ok:false. Vì cả hai tất định-exact, chúng LUÔN khớp ở code đúng — cách 2 là lưới bắt lỗi cài đặt floor/ceil.

**`interference_point{d1,d2}`:** δ = d₂−d₁; r = δ/λ (Scalar hữu tỉ). r nguyên ⇒ "cực đại bậc \|r\|"; r bán-nguyên (2r lẻ) ⇒ "cực tiểu (giữa bậc …)"; ngược lại ⇒ "không phải vân (bậc lẻ …)". Kiểm nguyên/bán-nguyên bằng bigint (num/den sau rút gọn: den=1 ⇒ nguyên; den=2 ∧ num lẻ ⇒ bán-nguyên). Trả bậc (số nguyên) + phân loại; đơn vị rỗng.

**Ràng buộc λ hữu tỉ:** đếm exact đòi a = L/λ hữu tỉ (radicand 1). λ từ v/f hoặc khai trực tiếp hầu như luôn hữu tỉ; nếu λ mang căn (hiếm) ⇒ a có radicand ⇒ floor/ceil qua so float có kiểm EPS + cờ, ghi `checks[]` "đếm trên λ vô tỉ — dùng số"; đề SGK không ra kiểu này (ghi §16.3).

## 9. Đếm nghiệm nguyên — sóng dừng (`waves.ts`)

Dây dài `length` = l, `boundary`:
- **`two-fixed` (hai đầu cố định):** l = k·λ/2 ⇒ **k = 2l/λ** (số bụng); số nút = k+1. Điều kiện: 2l/λ NGUYÊN DƯƠNG (bigint) ⇒ nếu không nguyên ⇒ `violations` "không có sóng dừng ổn định với λ này" (mô hình/đề lệch), ok:false — KHÔNG làm tròn.
- **`one-free` (một đầu cố định, một đầu tự do):** l = (2k−1)·λ/4 ⇒ **2k−1 = 4l/λ** ⇒ k = (4l/λ + 1)/2; điều kiện 4l/λ NGUYÊN LẺ. Số bụng = số nút = k.

| Query | two-fixed | one-free |
|---|---|---|
| `standing_antinodes` (bụng) | k = 2l/λ | k = (4l/λ+1)/2 |
| `standing_nodes` (nút) | k+1 | k |
| `standing_wavelength{loops:k}` | λ = 2l/k | λ = 4l/(2k−1) |
| `standing_frequency{loops:k}` | f = v/λ = k·v/(2l) | f = (2k−1)·v/(4l) |
| `standing_min_frequency` (cơ bản, k=1) | f₁ = v/(2l) | f₁ = v/(4l) |

- `loops` khai sẵn ⇒ dùng k đó (mode "đề cho số bụng, tính λ/f"); vắng ⇒ suy k từ λ của wave (mode "đề cho λ, đếm bụng/nút"). `standing_wavelength/frequency` bắt buộc `loops` (không có λ thì không đếm được k).
- `standing_frequency`/`standing_min_frequency` cần v của wave ⇒ thiếu v ⇒ error rõ.
- Tất định-exact bằng bigint (chia nguyên có dư ⇒ điều kiện fail ⇒ violation). Số bụng/nút là đáp **số nguyên** — unit rỗng.

## 10. Mức cường độ âm dB — TÁCH NHÁNH exact/số (`waves.ts` + `waveCompute.ts`)

**Vấn đề:** L = 10·log₁₀(I/I₀). log₁₀ VÔ TỈ, ngoài (hữu tỉ+căn)·πᵏ. KHÔNG bịa exact; nhưng khi tỉ số là **lũy thừa 10 (hoặc lũy thừa √10)** thì log₁₀ NGUYÊN/BÁN-NGUYÊN ⇒ L hữu tỉ EXACT. Thiết kế: **hàm sinh ứng viên exact + `certifyScalar` thẩm định bằng `Math.log10` độc lập** (tái dùng nguyên cơ chế 3 tầng — không machinery mới).

### 10.1. `log10Exact(ratio: Scalar): Scalar | null` — chỉ nhận lũy thừa của √10

Đầu vào `ratio` = I/I₀ (Scalar exact, radicand ∈ {1, 10}):
- **radicand 1 (hữu tỉ):** rút gọn num/den. `ratio = 10^n` (n ∈ ℤ) ⇔ (den=1 ∧ num là lũy thừa 10) ∨ (num=1 ∧ den là lũy thừa 10). "Là lũy thừa 10" trên bigint: chia lặp cho 10, phải về 1 không dư. ⇒ log₁₀ = n (nguyên). Ngược lại ⇒ null.
- **radicand 10:** `ratio = a·√10`; nếu a = num/den là 10^n ⇒ log₁₀ = n + ½ (vì √10 = 10^½). ⇒ Scalar bán-nguyên. Ngược lại ⇒ null.
- Ngoài ra (num/den có thừa số nguyên tố ≠ 2,5 kiểu 2·10⁷; radicand ∉{1,10}) ⇒ **null** ⇒ đường số.

### 10.2. `sound_level` — L = 10·log₁₀(I/I₀)

```
ratio = div(I, I0)                       // Scalar exact khi I, I0 exact (Sci ⇒ luôn exact)
cand  = log10Exact(ratio)                // Scalar | null
floatRef = 10 * Math.log10(ratio.approx) // ĐỘC LẬP
if (cand) L = mul(rat(10), cand)         // exact ứng viên
else      L = num(floatRef)              // không exact
answer = certifyScalar('sound_level', L, floatRef)   // exact sống ⇒ text "70"; chết ⇒ "73.0103", approximate:true
unit  = 'dB'
```
- Lũy thừa-10-đẹp ⇒ L nguyên exact (ratio 10⁷ ⇒ **70 dB**); lũy-thừa-√10 ⇒ L bội 5 exact (ratio 10⁶·√10 ⇒ **65 dB**).
- **Không đẹp** (ratio 2·10⁷) ⇒ `certifyScalar` tự rơi số ⇒ text **"73.0103"**, `approximate:true`. `checks[]` ghi phân tách trung thực `"sound_level: I/I₀ = 2·10⁷ (không là lũy thừa 10); L = 70 + 10·log(2), số"` — giữ được dạng biểu tượng "10·log(I/I₀)" theo yêu cầu đề bài (LLM lời giải in "≈ 73 dB" hoặc "70 + 10lg2").
- **Tự kiểm (luôn):** \|10^(L/10) − ratio\| ≤ EPS_SELF·max(1,ratio) (float độc lập, đảo ngược log) ⇒ `checks[]`.

### 10.3. Các query dB còn lại

| Query | Công thức | Exact khi |
|---|---|---|
| `sound_intensity{atDistance?}` | nguồn điểm: I=P/(4πr²) (PiScalar k=−1) HOẶC I=Iref·(rRef/r)² (Scalar); từ level: I=I₀·10^(L/10) | 10^(L/10): L≡0 mod 5 ⇒ Scalar (radicand 1 hoặc 10) exact |
| `sound_level{atDistance?}` | như §10.2, I lấy tại r (nghịch đảo bình phương nếu nguồn điểm) | tỉ số I/I₀ là lũy thừa √10 |
| `sound_level_difference{from,to}` | ΔL = 10·log₁₀(I(to)/I(from)) = 20·log₁₀(r_from/r_to) (π ước sạch) | (r_from/r_to)² là lũy thừa √10 (đôi r ⇒ số; ×10 r ⇒ −20 dB exact) |
| `distance_for_level{level}` | r = rRef·10^((L_ref − L)/20) (đảo nghịch đảo bình phương) | mũ (L_ref−L)/20 ⇒ hữu tỉ/√10 ⇒ r Scalar exact khi đẹp |

- `intensity_from_level` (đảo): I = I₀·10^(L/10). L≡0 mod 10 ⇒ I lũy thừa 10 (radicand 1); L≡5 mod 10 ⇒ I = (…)·√10 (radicand 10) — **Scalar biểu diễn được**, exact (vd L=65 ⇒ I = 10⁻⁶·√10 W/m²). Dựng bằng bigint 10^k × (√10 nếu lẻ).
- Mọi đáp qua `certifyScalar`/`certifyPiScalar`; đường số luôn kèm `approximate:true` + `checks[]` giải thích.

**Đây là câu trả lời cho "log/dB không exact":** exact CHỈ khi tỉ số là lũy thừa nguyên/bán-nguyên của 10 (rất phổ biến trong đề: I=10⁻⁵, tăng 100 lần, r ×10…); mọi trường hợp khác ⇒ số trung thực + cờ approximate + giữ dạng biểu tượng trong `checks[]`. Không có vùng "exact giả".

## 11. Tự kiểm (`waveCompute.ts`) + Scene (`waveScene.ts`)

### 11.1. Auto self-check (luôn chạy, ghi `checks[]`)

| Đáp | Kiểm thay-ngược / bất biến |
|---|---|
| speed/wavelength/frequency/period | v = λf, T = 1/f exact (mul/div) residual 0; nguồn dư khớp (§6.2) |
| displacement_at | \|u\| ≤ A·(1+1e-9); pha thay lại: cos(pha)·A = u (float độc lập) ≤ EPS_SELF·A |
| phase_difference | Δφ − 2π·d/λ = 0 exact (PiScalar) |
| interference_count | **đếm HAI CÁCH khớp** (§8); a = L/λ dựng lại từ đếm khớp cận |
| interference_point | δ − (d₂−d₁) = 0; bậc·λ = δ (cực đại) / (bậc+½)λ = δ (cực tiểu) exact |
| standing_* | k·λ/2 = l (two-fixed) / (2k−1)λ/4 = l (one-free) exact; k nguyên (bigint dư 0); nút/bụng khớp k |
| sound_level | 10^(L/10) = I/I₀ (float đảo) ≤ EPS_SELF; log10Exact đối chiếu Math.log10 (đã ở certify) |
| sound_intensity/difference/distance | đảo ngược (level↔intensity, r↔ΔL) khớp ≤ EPS_SELF |

### 11.2. Asserts khai báo & ngưỡng

Như v0 §7.2: `assert.query` chạy như query thường, \|got − equals\| ≤ tol·max(1,\|equals\|), fail ⇒ `violations` + ok:false. Dùng CHUNG `EPS_SELF=1e-6`, `TOL_ASSERT=1e-3` (C10) — không hằng mới. Đề "lấy tròn"/dB số ⇒ prompt override tol.

### 11.3. Kỷ luật lỗi (OS-2)

Pipeline sóng KHÔNG throw: refine zod chặn ω/T=0; guard chặn A=null/λ=null/chia-0 trước phép chia; `runPhysics` bọc try/catch quanh nhánh sóng (DIFF 2 §13) đổi Error còn lọt → `errors[]` + ok:false, message tiếng Việt. Không Error nào tới route/bridge.

### 11.4. Scene — phần tử dao động ngang (tái dùng animation dao động)

Map (x_ngang, u_dọc) → geo3d (x, 0, u) như v0. **LABEL TRẦN toàn bộ** (không giá trị trong nhãn — F8/OS-1).

- **Sóng truyền (có A, f/ω, λ, φ):** ANIMATE. Đường sóng tĩnh t=0: `Curve3D{type:'expr', plane:'xz', style:'solid', params:{}, samples: 65 điểm u(x,0) trên x∈[0, 2λ]}`. Phần tử: 9 Agent tại x_j = j·λ/8 (j=0..8, phủ 1λ), mỗi Agent dao động DỌC: track `parametric_path`, `equations.z = "<A>*Math.cos(<ω·k>*t + <−dir·2π·x_j/λ + φ>)"` (bake số ≥9 chữ số có nghĩa, `x`,`y` = "<x_j>","0"), `landing_point=[x_j,0,u_j(T_phys)]`, `timeScale=k`. `t*t` không dùng (cos đã đủ). Tuân 4 ràng buộc cú pháp §2.2.
- **Sóng dừng:** TĨNH. Line dây `[0,l]` trục x; điểm nút `N_m` tại x=m·λ/2 (two-fixed) / (2m−1)λ/4 (one-free); điểm bụng `B_m` tại trung điểm hai nút. Nhãn trần ("nút"/"bụng" — KHÔNG kèm số thứ tự-giá-trị). Animate phần tử (biên độ 2A·sin(2πx/λ)) để **v-next** (§16.6).
- **Giao thoa:** TĨNH. Hai điểm nguồn `S1`(0,0,0), `S2`(L,0,0) trục x + Line đoạn nối. (Vân hypebol = v-next.) Nhãn trần.
- **Sóng âm:** TĨNH. Nguồn `O`(0,0,0) + điểm khảo sát `M`,`N` tại (r,0,0) trục x. Nhãn trần.

- **Timeline:** T_phys = max(2T, mọi t trong queries, mọi đáp thời gian, 1); playback k như v0 §8.2 (3–15 s ⇒ k=1; ngoài ⇒ D_pb=10, k=T_phys/10). Tags `['physics','song','timeScale:<k>']` (+ taxonomy bridge P2 append).

### 11.5. Ví dụ scene JSON — sóng truyền W7 (A=4, ω=20π, λ=24, φ=0, +x; units cm)

T_phys = max(2·0,1 ; 0,1 ; 1) = 1 s ∉ [3,15] ⇒ D_pb=10, k=0,1 (chậm ×10; 10 s playback = 1 s vật lý = 10 chu kỳ). ω·k = 20π·0,1 = 2π ≈ 6,283185. Phần tử x_j=3j (j=0..8), pha tĩnh −2π·3j/24 = −πj/4.

```jsonc
{
  "name": "song-truyen-W7", "axisUnit": "cm", "tags": ["physics","song","timeScale:0.1"],
  "points": [ { "id":"O","label":"","x":0,"y":0,"z":0 } ],
  "lines": [],
  "curves": [
    { "id":"waveform","type":"expr","plane":"xz","style":"solid","color":"#38BDF8","params":{},
      "samples":[ {"x":0,"y":4}, /* … 65 mẫu u(x,0)=4cos(−πx/12) trên x∈[0,48] … */ {"x":48,"y":4} ] }
  ],
  "agents": [
    { "id":"p0","label":"","initialPosition":[0,0,4],"color":"#FFA500","radius":0.96 },
    { "id":"p1","label":"","initialPosition":[3,0,2.828427],"color":"#FFA500","radius":0.96 }
    /* … p2..p8 tại x=6,9,…,24 … */
  ],
  "timeline": {
    "duration": 10,
    "tracks": [
      { "id":"mv_p0","start":0,"end":10,"type":"parametric_path","targetId":"p0",
        "params":{ "equations":{"x":"0","y":"0","z":"4*Math.cos(6.283185*t + 0)"},
                   "path":"x(t) = 0, y(t) = 0, z(t) = 4*Math.cos(6.283185*t + 0)",
                   "landing_point":[0,0,4], "timeScale":0.1 } },
      { "id":"mv_p1","start":0,"end":10,"type":"parametric_path","targetId":"p1",
        "params":{ "equations":{"x":"3","y":"0","z":"4*Math.cos(6.283185*t + -0.785398)"},
                   "path":"x(t) = 3, y(t) = 0, z(t) = 4*Math.cos(6.283185*t + -0.785398)",
                   "landing_point":[3,0,2.828427], "timeScale":0.1 } }
      /* … mv_p2..mv_p8 … */
    ]
  }
}
```
(Kiểm parser AnimatedAgent: p0 t=0 → z=4 (biên); p1 t=0 → z=4cos(−π/4)=2,8284; chuỗi không `^`/`,`-trong-biểu-thức/`=`/`x_start`. `+ -0.785398` là JS hợp lệ — quirk kinematic đã kiểm.)

### 11.6. Charts (kênh `PhysicsResult.charts`, không đụng GeometryData)

- `u_x` (dạng sóng theo không gian, t=0 mặc định): 129 mẫu u(x,0) trên [0, 2λ].
- `u_t` (li độ phần tử theo thời gian, x=0 mặc định): 129 mẫu u(0,t) trên [0, 2T].
- `events`: các t trong queries. Mất charts khi lưu lịch sử — nguyên trạng phán quyết D6.

## 12. MƯỜI BÀI CONTRACT — tính tay từng bước (test `wave-contract.test.ts`)

Số đã kiểm bằng số học tay + đối chiếu float. Plan theo schema §5; `units` ghi tại mỗi bài. Text engine giữ exact-first (chú thích "= 0,x" chỉ để người đọc đối chiếu, KHÔNG phải text engine).

---

### W1 — Đại lượng sóng: v, T (từ f, λ)
**Đề:** "Một sóng cơ truyền trên mặt nước có tần số f = 10 Hz, bước sóng λ = 20 cm. a) Tốc độ truyền sóng? b) Chu kỳ sóng?"
```json
{ "problemName":"song-dai-luong-1", "units":{"length":"cm","time":"s"},
  "ops":[ {"op":"wave","name":"s","f":10,"lambda":20} ],
  "queries":[ {"kind":"speed","of":"s","label":"a"}, {"kind":"period","of":"s","label":"b"} ] }
```
**Tính tay:** v = λf = 20·10 = **200 cm/s** (hữu tỉ). T = 1/f = **1/10 s = 0,1 s**. Tự kiểm v=λf, T·f=1 exact.
**Kỳ vọng:** "200 cm/s"; "1/10 s"; approximate:false cả hai.

---

### W2 — Đại lượng sóng: f, λ (từ v, T)
**Đề:** "Một sóng âm truyền trong không khí với tốc độ v = 340 m/s, chu kỳ T = 0,002 s. a) Tần số? b) Bước sóng (khoảng cách gần nhất giữa hai điểm dao động cùng pha)?"
```json
{ "problemName":"song-dai-luong-2", "units":{"length":"m","time":"s"},
  "ops":[ {"op":"wave","name":"s","speed":340,"speedUnit":"m/s","T":0.002} ],
  "queries":[ {"kind":"frequency","of":"s","label":"a"}, {"kind":"wavelength","of":"s","label":"b"} ] }
```
**Tính tay:** 0,002 → 1/500 exact. f = 1/T = **500 Hz**. λ = v/f = 340/500 = **17/25 m = 0,68 m**. Tự kiểm λf = 340 = v exact.
**Kỳ vọng:** "500 Hz"; "17/25 m" approx≈0.68, approximate:false.

---

### W3 — Giao thoa: đếm CỰC ĐẠI (a nguyên — loại mút)
**Đề:** "Hai nguồn kết hợp A, B cùng pha, AB = 20 cm. Tốc độ truyền sóng v = 40 cm/s, tần số f = 10 Hz. Số điểm dao động biên độ cực đại trên đoạn AB?"
```json
{ "problemName":"giao-thoa-cuc-dai", "units":{"length":"cm","time":"s"},
  "ops":[ {"op":"wave","name":"s","f":10,"speed":40} ],
  "queries":[ {"kind":"interference_count","of":"s","separation":20,"kind2":"max"} ] }
```
**Tính tay:** λ = v/f = 40/10 = 4. a = L/λ = 20/4 = 5 (P=5,Q=1). Cực đại: −5<k<5 ⇒ smin=floor(−5)+1=−4, smax=ceil(5)−1=4 ⇒ **9** (k=−4..4; k=±5 tại nguồn, loại). Cách 2 liệt kê k∈[−6,6]: 9 ✓ khớp.
**Kỳ vọng:** "9"; checks có "cách1=9, cách2=9".

---

### W4 — Giao thoa: đếm CỰC TIỂU (a phân số)
**Đề:** "Hai nguồn kết hợp cùng pha S₁, S₂ cách nhau 16 cm, bước sóng λ = 3 cm. Số điểm dao động biên độ cực tiểu trên đoạn S₁S₂?"
```json
{ "problemName":"giao-thoa-cuc-tieu", "units":{"length":"cm","time":"s"},
  "ops":[ {"op":"wave","name":"s","lambda":3} ],
  "queries":[ {"kind":"interference_count","of":"s","separation":16,"kind2":"min"} ] }
```
**Tính tay:** a = 16/3 (P=16,Q=3). Cực tiểu: lo=−(2·16+3)/6=−35/6≈−5,833; hi=(2·16−3)/6=29/6≈4,833 ⇒ smin=floor(−35/6)+1=−6+1=−5, smax=ceil(29/6)−1=5−1=4 ⇒ **10** (k=−5..4). Cách 2 khớp.
**Kỳ vọng:** "10".

---

### W5 — Độ lệch pha
**Đề:** "Sóng cơ truyền theo Ox có bước sóng λ = 24 cm. Hai điểm M, N trên phương truyền cách nhau d = 8 cm. Độ lệch pha dao động giữa M và N?"
```json
{ "problemName":"do-lech-pha", "units":{"length":"cm","time":"s"},
  "ops":[ {"op":"wave","name":"s","lambda":24} ],
  "queries":[ {"kind":"phase_difference","of":"s","d":8} ] }
```
**Tính tay:** Δφ = 2πd/λ = 2π·8/24 = **2π/3 rad ≈ 2,0944** (PiScalar {2/3,1}, exact — recognize cũng bắt được kπ/m nhưng PiScalar giữ từ thượng nguồn). Tự kiểm Δφ−2π·(1/3)=0.
**Kỳ vọng:** "2π/3 rad" approx≈2.0944, approximate:false.

---

### W6 — Sóng dừng: số bụng, số nút (hai đầu cố định)
**Đề:** "Sợi dây đàn hồi dài l = 60 cm, hai đầu cố định, có sóng dừng với bước sóng λ = 24 cm. Số bụng sóng và số nút sóng?"
```json
{ "problemName":"song-dung-bung-nut", "units":{"length":"cm","time":"s"},
  "ops":[ {"op":"wave","name":"s","lambda":24} ],
  "queries":[ {"kind":"standing_antinodes","of":"s","length":60,"boundary":"two-fixed","label":"bung"},
              {"kind":"standing_nodes","of":"s","length":60,"boundary":"two-fixed","label":"nut"} ] }
```
**Tính tay:** k = 2l/λ = 120/24 = 5 (bigint dư 0 ✓). Số bụng = **5**; số nút = k+1 = **6**. Tự kiểm k·λ/2 = 5·12 = 60 = l ✓.
**Kỳ vọng:** "5"; "6".

---

### W7 — Phương trình sóng: λ, v, li độ tại (x,t)
**Đề:** "Sóng cơ truyền theo chiều dương Ox: u = 4cos(20πt − πx/12) (cm), x tính bằng cm, t bằng s. a) Bước sóng? b) Tốc độ truyền? c) Li độ phần tử tại x = 4 cm lúc t = 0,1 s?"
```json
{ "problemName":"phuong-trinh-song", "units":{"length":"cm","time":"s"},
  "ops":[ {"op":"wave","name":"s","A":4,"omega":{"n":20,"pi":true},
           "spaceCoeff":{"n":1,"d":12,"pi":true},"direction":"+x","phi":{"n":0}} ],
  "queries":[ {"kind":"wavelength","of":"s","label":"a"}, {"kind":"speed","of":"s","label":"b"},
              {"kind":"displacement_at","of":"s","x":4,"t":0.1,"label":"c"} ] }
```
**Tính tay:** f = ω/2π = 20π/2π = 10 Hz. λ = 2π/spaceCoeff = 2π/(π/12) = **24 cm** (divP bậc 1−1=0, π triệt tiêu). v = λf = 24·10 = **240 cm/s**. Pha(4; 0,1) = 20π·(1/10) − (π/12)·4 = 2π − π/3 = 5π/3 (bậc 1, addP cùng bậc). Rút 5/3 mod 2 = 5/3 (q=3 ⇒ lưới): cos(5π/3)=1/2 ⇒ u = 4·1/2 = **2 cm** (exact). Tự kiểm \|u\|=2≤4 ✓.
**Kỳ vọng:** "24 cm"; "240 cm/s"; "2 cm"; approximate:false cả ba.

---

### W8 — Mức cường độ âm dB (nhánh EXACT + nhánh SỐ)
**Đề:** "Cường độ âm chuẩn I₀ = 10⁻¹² W/m². a) Tại điểm có I = 10⁻⁵ W/m², mức cường độ âm? b) Tại điểm khác có I' = 2·10⁻⁵ W/m², mức cường độ âm?"
```json
{ "problemName":"muc-cuong-do-am", "units":{"length":"m","time":"s"},
  "ops":[ {"op":"sound_source","name":"a","intensity":{"I":{"n":1,"exp":-5}}},
          {"op":"sound_source","name":"b","intensity":{"I":{"n":2,"exp":-5}}} ],
  "queries":[ {"kind":"sound_level","of":"a","label":"a"}, {"kind":"sound_level","of":"b","label":"b"} ] }
```
**Tính tay:** a) ratio = 10⁻⁵/10⁻¹² = 10⁷ ⇒ log10Exact = 7 ⇒ L = **70 dB** (exact; certify floatRef=10·log10(1e7)=70 ✓). b) ratio = 2·10⁷ ⇒ log10Exact **null** (2·10⁷ không lũy thừa 10) ⇒ L = 10·log10(2·10⁷) = 70 + 10·log10 2 = **73,0103 dB**, approximate:true; checks "L = 70 + 10·log(2), số". Tự kiểm 10^(L/10) ≈ ratio ✓ cả hai.
**Kỳ vọng:** "70" dB approximate:false; "73.0103" dB approximate:true.

---

### W9 — TỔNG HỢP: sóng dừng đầy đủ (λ, nút, tần số — có v)
**Đề:** "Dây AB dài l = 1,2 m, hai đầu cố định, có sóng dừng với 4 bụng sóng. Tốc độ truyền sóng trên dây v = 20 m/s. a) Bước sóng? b) Số nút sóng? c) Tần số sóng?"
```json
{ "problemName":"song-dung-tong-hop", "units":{"length":"m","time":"s"},
  "ops":[ {"op":"wave","name":"s","speed":20,"speedUnit":"m/s"} ],
  "queries":[ {"kind":"standing_wavelength","of":"s","length":1.2,"loops":4,"boundary":"two-fixed","label":"a"},
              {"kind":"standing_nodes","of":"s","length":1.2,"loops":4,"boundary":"two-fixed","label":"b"},
              {"kind":"standing_frequency","of":"s","length":1.2,"loops":4,"boundary":"two-fixed","label":"c"} ] }
```
**Tính tay:** λ = 2l/k = 2·1,2/4 = 2,4/4 = **3/5 m = 0,6 m** (hữu tỉ). Số nút = k+1 = **5**. f = v/λ = 20/0,6 = 200/6 = **100/3 Hz ≈ 33,3333**. Tự kiểm k·λ/2 = 4·0,3 = 1,2 = l ✓; f·λ = 100/3·3/5 = 20 = v ✓.
**Kỳ vọng:** "3/5 m" approx≈0.6; "5"; "100/3 Hz" approx≈33.3333, approximate:false cả ba.

---

### W10 — TỔNG HỢP: nguồn âm điểm — I từ L, mức tại r khác (nghịch đảo bình phương, lũy thừa 10 exact) + bước sóng
**Đề:** "Nguồn âm điểm đẳng hướng. Tại M cách nguồn r₁ = 1 m đo được mức cường độ âm L₁ = 80 dB. Cho I₀ = 10⁻¹² W/m². a) Cường độ âm tại M? b) Mức cường độ âm tại N cách nguồn r₂ = 10 m? c) Âm có f = 850 Hz, tốc độ truyền v = 340 m/s: bước sóng?"
```json
{ "problemName":"nguon-am-diem-tong-hop", "units":{"length":"m","time":"s"},
  "ops":[ {"op":"sound_source","name":"ng","level":{"L":80,"atDistance":1}},
          {"op":"wave","name":"s","f":850,"speed":340,"speedUnit":"m/s"} ],
  "queries":[ {"kind":"sound_intensity","of":"ng","atDistance":1,"label":"a"},
              {"kind":"sound_level","of":"ng","atDistance":10,"label":"b"},
              {"kind":"wavelength","of":"s","label":"c"} ] }
```
**Tính tay:** a) I₁ = I₀·10^(80/10) = 10⁻¹²·10⁸ = **10⁻⁴ W/m² = 1/10000** (exact, radicand 1). b) nghịch đảo bình phương: I₂ = I₁·(r₁/r₂)² = 10⁻⁴·(1/10)² = 10⁻⁶; ratio = 10⁻⁶/10⁻¹² = 10⁶ ⇒ L₂ = **60 dB** (π ước sạch trong tỉ số; = 80 − 20·log10(10) = 80 − 20). c) λ = v/f = 340/850 = **2/5 m = 0,4 m**. Tự kiểm 10^(L₂/10)=10⁶=I₂/I₀ ✓; λf=340=v ✓.
**Kỳ vọng:** "1/10000 W/m²" approx≈0.0001; "60" dB; "2/5 m" approx≈0.4; approximate:false cả ba.

---

### Bảng tổng hợp 10 bài
| # | Dạng | Đáp chốt (text engine · approx) |
|---|---|---|
| W1 | Đại lượng: v, T | 200 cm/s; 1/10 s |
| W2 | Đại lượng: f, λ | 500 Hz; 17/25 m ≈ 0,68 |
| W3 | Giao thoa cực đại (a=5 nguyên) | **9** (loại 2 mút nguồn) |
| W4 | Giao thoa cực tiểu (a=16/3) | **10** |
| W5 | Độ lệch pha | **2π/3 rad** ≈ 2,0944 (PiScalar) |
| W6 | Sóng dừng bụng/nút | 5 bụng; 6 nút |
| W7 | Phương trình sóng | 24 cm; 240 cm/s; **2 cm** (cos 5π/3 lưới) |
| W8 | Mức cường độ dB | **70 dB** (exact); **73,0103 dB** (số, approximate) |
| W9 | Sóng dừng tổng hợp | 3/5 m; 5 nút; **100/3 Hz** ≈ 33,33 |
| W10 | Nguồn âm điểm + sóng | 10⁻⁴ W/m²; **60 dB** (lũy thừa 10 exact); 2/5 m |

**Phủ query:** speed(W1,W7,W10 nội), wavelength(W2,W7,W10), frequency(W2), period(W1), displacement_at(W7), phase_difference(W5), interference_count max(W3)+min(W4), standing_antinodes(W6), standing_nodes(W6,W9), standing_wavelength(W9), standing_frequency(W9), sound_intensity(W10a), sound_level(W8a/b,W10b). Phủ nhánh exact {hữu tỉ, PiScalar π, cos lưới, lũy thừa 10, lũy thừa √10} + nhánh SỐ trung thực (W8b). Phủ đếm-hai-cách (W3,W4). `interference_point`, `standing_min_frequency`, `sound_level_difference`, `distance_for_level`, `power` (I=P/4πr² PiScalar k=−1), displacement off-grid, phân loại pha, một-đầu-tự-do: phủ ở UNIT TEST (cùng đường normalize/compute), không tốn bài contract.

## 13. Cấu trúc file & ranh giới

```
api/_lib/kernel/physics/
  planSchema.ts   (v0) ← DIFF 1 — kê TRUNG THỰC (bài học OS-4, KHÔNG viết "2 dòng"):
                    (a) import WaveOp, SoundSourceOp, WaveQuerySchema từ './waveSchema';
                    (b) thêm WaveOp, SoundSourceOp vào union op + các query sóng vào union query;
                    (c) refine CẤP PLAN: có op sóng ⇒ units.time = 's';
                    (d) refine CẤP PLAN: có op sóng ⇒ units.length ∈ {'m','cm'};
                    (e) superRefine CẤM TRỘN op sóng với op chương khác (mover1d/free_fall/projectile/oscillator);
                        CHO PHÉP wave + sound_source;
                    ⇒ (c)–(e) là LOGIC MỚI (~15–20 dòng) + test planSchema v0 chạy kèm.
  runPhysics.ts   (v0) ← DIFF 2: dispatch op 'wave'/'sound_source' → wave pipeline; T_phys góp "2T" khi có wave animate;
                    try/catch quanh nhánh sóng đổi Error → errors[] (§11.3); query sóng trỏ op sai loại ⇒ error rõ (§6.2).
  kinematics.ts  compute.ts  scene.ts   (v0 — KHÔNG đụng)
  waveSchema.ts   MỚI — §5
  waves.ts        MỚI — §6,§8,§9,§10 THUẦN: normalize op→WaveModel/SoundModel; evalU(x,t); phaseOf; countIntOpen
                    + đếm giao thoa/sóng dừng (bigint floordiv/ceildiv); log10Exact; intensity/level (đảo & nghịch-đảo-bình-phương)
  waveCompute.ts  MỚI — §7,§10,§11.1: query → công thức đóng + certify + tự kiểm
  waveScene.ts    MỚI — §11.4–§11.6
  __tests__/waves.test.ts  waveCompute.test.ts  waveScene.test.ts  wave-contract.test.ts
```

- **PHỤ THUỘC `piScalar.ts` (của oscillation v1):** waves import `PiScalar/mulP/divP/addP/subP/sqrtP/cosP/sinP`, `EXACT_COS`, `displayPiScalar`, `certifyPiScalar`, `PiRat`, `toPiScalar` từ `./piScalar` + `./oscSchema`. ⇒ **ràng buộc thứ tự: waves thi công/merge SAU oscillation** (hoặc piScalar.ts được đưa thành FILE NỀN dùng chung, tạo độc lập). Đây là điểm phân vân §16.1 — KHÔNG tự tạo lại piScalar.ts (vi phạm "chỉ thêm file" nếu hai pack cùng tạo).
- **Import được phép:** `../scalar`, `./piScalar`, `./oscSchema`, `./kinematics` (scalarFromNumber), `../analysis/recognize`, `../compute/answer` (certifyScalar/cmpScalar), `zod`, `import type` geometry — trong danh mục C2.
- Ràng buộc cứng kế thừa v0 §4: KHÔNG sửa `run.ts`/`index.ts` gốc/`src/**`; chưa nối kernel-dist (wiring P2); baseline test chỉ CỘNG (~55–65 test mới ước: waves ≈20, waveCompute ≈15, scene ≈5, contract 10 bài ≈ 25 assert).
- Gate F9: chạy typecheck qua `tsconfig.kernel.json` (scene phát `params:{}` đầy đủ cho Curve3D).
- **Chép nhắc F1 (mirror oscillation §11):** wiring P2 ngoài phạm vi, nhưng route nối sóng PHẢI có quota — ghi tại đây để không rơi mất.
- **Đồng bộ đa-pack:** planSchema.ts/runPhysics.ts cũng bị dynamics/dc-circuit/oscillation DIFF — các DIFF đều THUẦN CỘNG (thêm thành viên union + nhánh dispatch + refine); merge tuần tự, mỗi pack chạy test v0 xanh nguyên. Ai chạm cuối rebase phần union. (Điểm phối hợp — không thuộc nội dung engine.)

## 14. Taxonomy tags đề xuất (registry P0, bridge P2 gắn — v0 §14.5)

Khớp regex `^[a-z0-9-]+(\/[a-z0-9-]+){3}$`, grade 11 GDPT 2018 (C4). Hai tầng-2 (`song-co`, `song-am`):

`ly/11/song-co/dai-luong-song` · `ly/11/song-co/phuong-trinh-song` · `ly/11/song-co/do-lech-pha` · `ly/11/song-co/giao-thoa` · `ly/11/song-co/song-dung` · `ly/11/song-am/cuong-do-am` · `ly/11/song-am/muc-cuong-do-am` · `ly/11/song-am/nguon-diem`

## 15. NGOÀI phạm vi v1 (ghi rõ, có chủ đích)

- **Giao thoa > 2 nguồn**; **sóng điện từ**; **Doppler**; **phách** (đề bài chỉ định "ngoài phạm vi" — schema reject, few-shot abstain).
- Đếm cực đại/tiểu trên đoạn **MN bất kỳ** (không phải đoạn nối nguồn) — cần d₁,d₂ tại hai mút, biên khoảng khác; **cùng cỗ máy `countIntOpen`** nhưng khai `deltaLo/deltaHi` — để v-next sau phản biện.
- **Cộng mức cường độ n nguồn** khi n không lũy thừa 10 (L = L₁ + 10log n — số); ống sáo/cột khí; sóng dừng có họa âm chọn lọc theo dải tần.
- **Con lắc/vật dao động của sóng dừng animate cung/bụng** (biên độ 2A·sin) — scene tĩnh ở v1 (§16.6).
- Đề cho **đồ thị u-x hoặc u-t suy ngược** đại lượng (cần op khai từ đồ thị); giao thoa/sóng dừng **có độ lệch pha nguồn** (nguồn ngược pha, lệch pha bất kỳ) — v1 chỉ **hai nguồn CÙNG PHA** (đổi công thức đếm khi ngược pha: hoán vai max/min — để v-next).
- Chart UI frontend, wiring route/bridge/prompt (P2).

## 16. Điểm phân vân cho phản biện (trước khi code)

1. **Phụ thuộc `piScalar.ts` chéo pack:** waves import piScalar.ts do oscillation v1 tạo ⇒ ràng buộc thứ tự merge. **Đề nghị:** đưa `piScalar.ts` thành FILE NỀN dùng chung (ngang `scalar.ts`), tạo trong bước nền — pack nào merge trước cũng không tạo lại. Có nên tách piScalar khỏi "sở hữu" của oscillation ngay từ phản biện này? (Nếu không, waves BẮT BUỘC sau oscillation.)

2. **Hai op vs. ba op:** gộp giao thoa + sóng dừng thành QUERY trên `wave` (đề nghị hiện tại) — gọn, tái dùng resolution λ/v. Nhưng "giao thoa" ngữ nghĩa là HAI nguồn, không phải một `wave`; có nên tách op `interference` (2 nguồn + separation) cho minh bạch, hay giữ query mang `separation` là đủ? (Rủi ro: few-shot dễ nhầm `separation` là bước sóng.)

3. **λ vô tỉ trong đếm giao thoa/sóng dừng:** `countIntOpen` đòi a = L/λ hữu tỉ. Đề SGK luôn cho λ hữu tỉ (từ v/f đẹp) nên thực tế không gặp; nhưng nếu λ mang căn (v hoặc f căn), đếm phải qua so float + EPS. **Giữ giả định λ hữu tỉ + violation rõ khi không?** hay thêm đường so-float có kiểm?

4. **`spaceCoeff` (2π/λ) và ranh giới "LLM không tính":** đề cho pt "u=4cos(20πt−πx/12)" — LLM chép `omega:{20,pi}` và `spaceCoeff:{1,12,pi}` nguyên văn, engine suy λ,v,f. **Đúng tinh thần chống-R1?** Hay nên có thêm cách khai λ trực tiếp khi đề CHO λ chữ (tránh few-shot lẫn hai mode)? Và `direction` từ dấu số hạng x — LLM "đọc dấu" có phải là "tính hộ" không (đề nghị: không, chỉ là chép cấu trúc)?

5. **Giữ `power` (nguồn điểm I=P/4πr²)?** Phần lớn query từ P ra SỐ (log của tỉ số chứa π); chỉ chênh-mức/tỉ-số hai khoảng cách mới exact. `power` cho phép tính I (PiScalar k=−1) và bài "công suất P" rất phổ biến VN. **Giữ (đủ dùng, minh bạch số) hay bỏ về v-next** (chỉ giữ đường `level`/`intensity` + nghịch-đảo-bình-phương, vốn phủ hết phần exact)? Cân nhắc: bỏ thì mất dạng "nguồn công suất P" kinh điển.

6. **`log10Exact` chỉ nhận lũy thừa của √10** (mũ nguyên + bán-nguyên): đủ cho I=10^k·I₀ và L bội 5. Có đề nào cho tỉ số "10^(k/4)" (mũ phần tư)? Gần như không. **Chốt trần bán-nguyên** (không mở mũ phần tư — YAGNI), đúng chứ? Và text nhánh số: engine trả "73.0103 dB" + checks "70+10log2"; bridge in "≈73 dB". **Có cần field `symbolic` riêng** (kiểu "70 + 10·lg2") trên answer, hay `checks[]` là đủ?

7. **`kind2` cho max/min:** field thứ-loại giao thoa đặt `kind2` vì `kind` là discriminant zod. Hơi lạ mắt. **Chấp nhận `kind2`** hay tách hai kind riêng `interference_count_max`/`interference_count_min` (rõ hơn nhưng dài union)?

8. **Sóng dừng `one-free`:** task nhấn "hai đầu cố định"; tôi thêm `one-free` (một đầu tự do) vì cùng cỗ máy, rất phổ biến. **Giữ cả hai boundary** (đề nghị) hay v1 chỉ `two-fixed` cho kỷ luật "thà ít"? (one-free thêm ~10 dòng, che phủ dây/lò xo một đầu tự do & cột khí một đầu kín.)

9. **Scene sóng truyền 9 phần tử:** v0/oscillation dùng 1 agent; sóng cần nhiều phần tử để "thấy sóng". 9 Agent có nặng render không (cần user thử canvas)? Hay giảm còn 5, hoặc chỉ vẽ `Curve3D` tĩnh + KHÔNG animate (đơn giản, nhưng mất chuyển động đặc trưng của sóng)? Ngưỡng số phần tử để lại chờ thử canvas thật (như D2 playback).

10. **Độ lệch pha trả giá trị đầy đủ hay rút mod 2π:** `phase_difference` trả 2πd/λ nguyên giá trị (đề nghị — đúng nghĩa đen). Với d > λ ra > 2π; đề đôi khi muốn "độ lệch pha (rút gọn về [0,2π) hoặc [−π,π])" để nói cùng/ngược/vuông pha. **Giữ giá trị đầy đủ + phân loại là việc lời giải**, hay thêm query `phase_relation` phân loại (cùng/ngược/vuông/lệch) tất định? (Rẻ, nhưng thêm bề mặt.)

---

*Spec DỰ THẢO — chờ phản biện. Mọi khẳng định về code có sẵn (scalar/certify/recognize/AnimatedAgent, PiScalar/EXACT_COS của oscillation) dựa trên ĐỌC code thật + kế thừa xác minh đã chạy của phản biện đợt 2 (`../reviews/2026-08-21-wave2-specs-review.md`); mọi số trong 10 bài contract W1–W10 đã kiểm tay + đối chiếu float, đếm-hai-cách cho giao thoa. Log/dB là điểm mới duy nhất ngoài trường của oscillation — thiết kế §10 tách nhánh exact (lũy thừa √10) / số (cờ approximate) và tái dùng certifyScalar làm thẩm định, không thêm machinery vô tỉ.*
