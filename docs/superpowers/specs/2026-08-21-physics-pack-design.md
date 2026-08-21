# Physics Pack v0 — Động học lớp 10 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-21
**Trạng thái:** ĐÃ QUA PHẢN BIỆN PHIÊN 1 (21/08/2026) — các finding/phán quyết liên quan (F2, F3, F7, F8, F9, F11, F12, F16, F18, D1–D6) đã áp vào spec; báo cáo: `docs/superpowers/reviews/2026-08-21-arch-physics-review-phien1.md`.
**Phạm vi:** Engine Vật lý v0 — ĐỘNG HỌC chất điểm lớp 10. Chỉ thêm `api/_lib/kernel/physics/**` + test + `tsconfig.kernel.json` (gate typecheck kernel — F9). KHÔNG sửa bất kỳ file có sẵn nào.

---

## 1. Mục tiêu (một câu)

Giữ nguyên nguyên tắc geo3d cho bài Vật lý động học: **LLM chỉ DỊCH đề → PhysicsPlan JSON (khai báo vật + câu hỏi); ENGINE tất định TÍNH bằng công thức đóng, TỰ KIỂM bằng thay-ngược, và XUẤT scene animate** (Agent3D + timeline `parametric_path` mà frontend đã render được từ module kinematic) + dữ liệu đồ thị x-t/v-t. Không bịa đáp số: mô hình không khớp đề ⇒ violation.

## 2. Vì sao dựng được gọn (tái dùng gần hết)

| Cần | Đã có sẵn | Dùng lại thế nào |
|---|---|---|
| Số học "đáp đẹp" (2√2, 20√5, 3/2) | `api/_lib/kernel/scalar.ts` (`Scalar` = hữu tỉ + một căn) | Mọi hệ số chuyển động là `Scalar`; g=9,8 → 49/5 chính xác |
| Giải phương trình bậc ≤ 2 | `api/_lib/kernel/analysis/solver1d.ts` (`solveQuadratic` trên Scalar) | Mọi query động học quy về nghiệm đa thức bậc ≤ 2 |
| Nhận dạng căn đẹp từ float | `api/_lib/kernel/analysis/recognize.ts` | Fallback khi rời trường exact (vd nghiệm (1+√13)/2) |
| Chứng nhận exact ↔ float | `api/_lib/kernel/compute/answer.ts` (`certifyScalar`) | Đáp exact luôn đối chiếu bản tính float độc lập |
| Canvas animate vật chuyển động | `Agent3D` + `AnimationTimeline` track `parametric_path` (`src/types/geometry.ts`, `AnimatedAgent.tsx`) — module kinematic đã chứng minh render sạch | Physics xuất đúng format đó, thêm quy ước scale thời gian |
| Vẽ quỹ đạo parabol | `Curve3D {type:'expr', plane:'xz', samples}` (`AnimatedCurve.tsx` render samples không cần parser) | Quỹ đạo ném xiên/ném ngang |

**Nhận xét then chốt:** toàn bộ động học lớp 10 (đều, biến đổi đều, rơi tự do, ném ngang, ném xiên) là **đa thức bậc ≤ 2 theo t trên mỗi trục**. ⇒ Một kiểu nội bộ duy nhất `Quad {k0,k1,k2}` (Scalar) + `solveQuadratic` phủ MỌI query bằng công thức đóng — không cần quét lưới/tối ưu số như analysis.

## 3. Dạng bài phủ (v0)

| Dạng bài | Op | Query dùng |
|---|---|---|
| Thẳng đều | `mover1d` (a=0) | `position_at`, `time_when` |
| Thẳng biến đổi đều (v0, a) | `mover1d` (a≠0) | `position_at`, `velocity_at`, `time_when` |
| Rơi tự do | `free_fall` | `time_to_ground`, `impact_velocity`, `position_at` |
| Ném ngang | `projectile` (angleDeg=0, h0>0) | `time_to_ground`, `range`, `impact_velocity` |
| Ném xiên (từ đất hoặc từ độ cao) | `projectile` (angleDeg>0) | `time_to_ground`, `range`, `max_height`, `velocity_at`, `impact_velocity` |
| Hai xe gặp nhau / đuổi nhau (kể cả xuất phát lệch giờ, kể cả 1 xe có gia tốc) | 2 × `mover1d` (`startAt`) | `meet_time`, `meet_position`, `distance_between_at` |
| Hãm phanh / dừng lại / đạt vận tốc cho trước (F3) | `mover1d` (a ngược dấu v0) | `time_when_velocity`, `position_when_velocity` |
| Đồ thị x-t / v-t | trường `charts` trong plan | dữ liệu mẫu số cho frontend vẽ (v0 KHÔNG dựng chart UI) |
| Ném thẳng đứng lên | `projectile` (angleDeg=90) | như ném xiên |
| Ném thẳng đứng xuống (F11) | `projectile` (angleDeg=−90) | `time_to_ground`, `impact_velocity`, `position_at` |

## 4. Kiến trúc & ranh giới

Soi gương đúng pattern `runAnalysis.ts`: **một lớp bọc ngoài, schema riêng, compute riêng, KHÔNG đụng run()/core.** Khác `runAnalysis` một điểm: physics KHÔNG cần gọi `run()` (không có hình học dựng) — nó tự tính bằng `Quad` rồi tự dựng `GeometryData`.

```
api/_lib/kernel/physics/
  planSchema.ts    — PhysicsPlanSchema (zod): units, ops, queries, asserts, charts, scene
  kinematics.ts    — THUẦN: Quad/Motion trên Scalar — normalize op→Motion, eval/deriv/expandAbs/sub, nghiệm
  compute.ts       — từng query → công thức đóng + certify + recognize + TỰ KIỂM thay-ngược
  scene.ts         — Motion[] + đáp → GeometryData (points/lines/curves/agents/timeline) + charts data
  runPhysics.ts    — entry runPhysics(raw): parse → normalize → queries → asserts → scene → PhysicsResult
  __tests__/
    kinematics.test.ts  compute.test.ts  runPhysics.test.ts  scene.test.ts  physics-contract.test.ts
```

**Import được phép:** `../scalar`, `../analysis/solver1d`, `../analysis/recognize`, `../compute/answer` (certifyScalar), `zod`, và `import type` từ `../../../../src/types/geometry` (type-only, bị erase — tiền lệ: `index.ts` kernel đã làm vậy).

**Ranh giới CỨNG (v0 hoàn toàn additive):**
- KHÔNG sửa `run.ts`, `planSchema.ts` (gốc), `index.ts`, `package.json`, `vitest.config.ts` (glob `api/_lib/kernel/**/*.test.ts` ĐÃ phủ test mới), `runAnalysis.ts`, `src/**`.
- Vì `index.ts` không đổi ⇒ physics **chưa vào `kernel-dist`** ở v0 — test import trực tiếp `../runPhysics`. Nối dây (export 1 dòng ở index.ts, bridge `solvePhysicsProblem`, few-shot translator, route, frontend chart UI) là **v1**, ngoài phạm vi.
- Baseline hiện tại: **1072 test xanh** — v0 chỉ được CỘNG test, không đổi số cũ.

## 5. PhysicsPlanSchema (zod)

```ts
// api/_lib/kernel/physics/planSchema.ts
import { z } from 'zod';
const Num = z.number().finite();
const Obj = z.string().min(1);

// F2/D1 (phản biện phiên 1): UNIT PER-QUANTITY — LLM chỉ CHÉP số + unit từ đề; ENGINE đổi về hệ nền
// `units` của plan bằng HỮU TỈ EXACT (bảng factor unit→SI: km/h→m/s ×5/18; km→m ×1000; min→s ×60;
// h→s ×3600). Không khai unit ⇒ số hiểu theo hệ nền (tương thích P1–P10 cũ). Cấm LLM tự chia 3,6.
const VelUnit = z.enum(['m/s', 'km/h']);
const LenUnit = z.enum(['m', 'km']);
const TimeUnit = z.enum(['s', 'min', 'h']);

const Mover1dOp = z.object({
  op: z.literal('mover1d'), name: Obj,
  x0: Num,                          // toạ độ đầu trên trục chuyển động
  xUnit: LenUnit.optional(),        // đơn vị của x0 (vắng = units.length)
  v0: Num,                          // vận tốc đầu, ĐẠI SỐ: âm = ngược chiều dương
  v0Unit: VelUnit.optional(),       // đơn vị của v0 (vắng = units.length/units.time) — bài "54 km/h, a=3 m/s²" khai đây
  a: Num.default(0),                // gia tốc (0 = thẳng đều) — LUÔN theo hệ nền (đề có a hầu như luôn SI; aUnit → v1)
  startAt: Num.default(0),          // thời điểm xuất phát t0 — "xe B đi sau 30 phút" ⇒ startAt: 30, tUnit: 'min'
  tUnit: TimeUnit.optional(),       // đơn vị của startAt (vắng = units.time)
  axis: z.enum(['x', 'y']).default('x'), // 'y' = chuyển động thẳng đứng (thang máy…)
});
const FreeFallOp = z.object({
  op: z.literal('free_fall'), name: Obj,
  h0: Num.positive(),               // độ cao thả
  xUnit: LenUnit.optional(),        // đơn vị của h0 VÀ x0 (một unit cho cả hai — đề không trộn m/km trong một vật)
  g: Num.positive(),                // BẮT BUỘC — LLM truyền 9.8 hoặc 10 THEO ĐỀ, theo hệ nền (m/s²). Engine KHÔNG hard-code g.
  x0: Num.default(0),
});
const ProjectileOp = z.object({
  op: z.literal('projectile'), name: Obj,
  x0: Num.default(0),
  h0: Num.min(0),                   // 0 = ném từ mặt đất
  xUnit: LenUnit.optional(),        // đơn vị của x0/h0
  v0: Num.positive(),               // ĐỘ LỚN (>0) — chiều nằm ở angleDeg
  v0Unit: VelUnit.optional(),
  angleDeg: Num,                    // LUÔN là ĐỘ. 0 = ném ngang; 90 = thẳng đứng LÊN; −90 = thẳng đứng XUỐNG (F11). Độ→radian là việc NỘI BỘ engine.
  g: Num.positive(),                // BẮT BUỘC, như free_fall
});
export const PhysicsOpSchema = z.discriminatedUnion('op', [Mover1dOp, FreeFallOp, ProjectileOp]);

export const PhysicsQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('position_at'), of: Obj, t: Num, tUnit: TimeUnit.optional(), axis: z.enum(['x','y']).optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('velocity_at'), of: Obj, t: Num, tUnit: TimeUnit.optional(), component: z.enum(['x','y','speed']).default('speed'), label: z.string().optional() }),
  z.object({ kind: z.literal('time_to_ground'), of: Obj, label: z.string().optional() }),   // min t>t0: y(t)=0
  z.object({ kind: z.literal('range'), of: Obj, label: z.string().optional() }),            // x(t_đất) − x(t0) — tầm xa
  z.object({ kind: z.literal('max_height'), of: Obj, label: z.string().optional() }),       // y tại đỉnh v_y=0
  z.object({ kind: z.literal('impact_velocity'), of: Obj, component: z.enum(['x','y','speed']).default('speed'), label: z.string().optional() }),
  z.object({ kind: z.literal('meet_time'), a: Obj, b: Obj, label: z.string().optional() }),      // min t≥max(t0a,t0b): pos_a=pos_b
  z.object({ kind: z.literal('meet_position'), a: Obj, b: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('distance_between_at'), a: Obj, b: Obj, t: Num, tUnit: TimeUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('time_when'), of: Obj, position: Num, xUnit: LenUnit.optional(), axis: z.enum(['x','y']).optional(), label: z.string().optional() }), // min t≥t0: coord=position
  // F3 (phản biện phiên 1): cặp query cho lớp bài "hãm phanh/dừng lại/đạt vận tốc cho trước".
  // v(t) TUYẾN TÍNH ⇒ nghiệm exact. `value` là giá trị ĐẠI SỐ theo component (dừng lại: value 0).
  // Tách-một-số như meet_time/meet_position (triết lý §14.4): time_… trả t, position_… trả toạ độ tại t đó.
  z.object({ kind: z.literal('time_when_velocity'), of: Obj, value: Num, vUnit: VelUnit.optional(), component: z.enum(['x','y']).optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('position_when_velocity'), of: Obj, value: Num, vUnit: VelUnit.optional(), component: z.enum(['x','y']).optional(), label: z.string().optional() }),
]);

export const PhysicsPlanSchema = z.object({
  problemName: z.string().min(1),
  // Hệ đơn vị NHẤT QUÁN của cả plan — chỉ để GẮN NHÃN đáp + scale timeline, KHÔNG đổi công thức
  // (công thức động học bất biến theo hệ đơn vị nhất quán: km + h + km/h chạy y hệt m + s + m/s).
  units: z.object({ length: z.string().default('m'), time: z.string().default('s') }).default({}),
  ops: z.array(PhysicsOpSchema).min(1),
  queries: z.array(PhysicsQuerySchema).min(1),
  // Assert = DỮ KIỆN DƯ của đề dùng đối chiếu mô hình (vd đề cho sẵn "sau 2 s vật đi được 30 m").
  // KHÔNG phải nơi LLM nộp đáp số. tol mặc định TOL_ASSERT (xem §7).
  asserts: z.array(z.object({ query: PhysicsQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
  charts: z.array(z.object({ kind: z.enum(['x_t', 'v_t']), of: z.array(Obj).min(1) })).default([]),
  scene: z.object({
    durationSec: Num.positive().optional(),          // ép thời lượng playback; bỏ trống = quy tắc §8.2
    labels: z.record(z.string(), z.string()).optional(), // name → nhãn hiển thị ("Xe A", "Quả bóng"…)
  }).default({}),
});
export type PhysicsPlan = z.infer<typeof PhysicsPlanSchema>;
```

Quy ước cho translator (v1, ghi sẵn để few-shot sau — cập nhật theo F2/D1, F18):

- Mọi SỐ trong plan chép thẳng từ đề; `units` khai hệ đơn vị NỀN của bài (đề thuần km+h ⇒ `{length:'km', time:'h'}`).
- Đề trộn đơn vị ⇒ **khai unit per-quantity** (`v0Unit`/`xUnit`/`tUnit`) và để ENGINE đổi — **LLM KHÔNG tự đổi bất kỳ đơn vị nào** (không chia 3,6 cho km/h, không đổi "30 phút" → 0.5 h; quy ước cũ "LLM đổi lượng nhỏ" BÃI BỎ).
- Hệ nền engine hiểu để đổi: length `m|km`, time `s|min|h`, vận tốc `m/s|km/h`; nền/unit ngoài bảng ⇒ engine trả error có cấu trúc (không đoán). `a`/`g` luôn theo hệ nền (aUnit/gUnit → v1).
- Asserts (dữ kiện dư): query bên trong assert vẫn dùng được `tUnit`/`xUnit`; riêng `equals` hiểu theo đơn vị đáp của query đó (hệ nền) — dữ kiện dư ở đơn vị lệch hệ nền thì v0 prompt BỎ QUA assert đó (không đổi hộ; `equalsUnit` → v1).
- Góc LUÔN bằng độ; ném thẳng đứng XUỐNG khai `angleDeg: -90` với `v0` là độ lớn (F11) — không khai vận tốc âm cho projectile.
- g LUÔN lấy từ đề (đề không nói ⇒ prompt bảo lấy 10).
- Trình bày vận tốc thành phần âm (F18, việc của prompt lời giải v1): answers giữ số ĐẠI SỐ (vd `impact_velocity component:'y'` = −35); lời giải diễn đạt "35 m/s, hướng xuống" — engine không đổi dấu.

## 6. Tầng compute — công thức đóng, exact trước

### 6.1. Kiểu nội bộ (kinematics.ts)

```ts
type Quad = { k0: Scalar; k1: Scalar; k2: Scalar };      // f(τ) = k0 + k1·τ + k2·τ², τ = t − t0
type Motion = { name: string; t0: Scalar; x: Quad; y: Quad; op: PhysicsOp };
```

Chuẩn hoá op → Motion (trục y là PHƯƠNG THẲNG ĐỨNG hướng lên, gốc y=0 là mặt đất):

| Op | x-Quad | y-Quad | t0 |
|---|---|---|---|
| `mover1d` axis x | {x0, v0, a/2} | {0,0,0} | startAt |
| `mover1d` axis y | {0,0,0} | {x0, v0, a/2} | startAt |
| `free_fall` | {x0, 0, 0} | {h0, 0, −g/2} | 0 |
| `projectile` | {x0, v0·cosθ, 0} | {h0, v0·sinθ, −g/2} | 0 |

- **Số → Scalar:** `scalarFromNumber(x)` — thập phân hữu hạn (≤9 chữ số lẻ) thành hữu tỉ chính xác (9.8 → 49/5; 0.5 → 1/2), ngoài ra rơi về float. ⇒ đầu vào JSON số thập phân KHÔNG phá exact.
- **Đơn vị per-quantity → hệ nền, EXACT (F2/D1):** `qty(value, unit?, base)` — bảng `UNIT_TO_SI` hữu tỉ {m:1, km:1000, s:1, min:60, h:3600, 'm/s':1, 'km/h':5/18}; đổi `value × factor(unit) ÷ factor(base)` toàn trên Rational (54 km/h nền m/s → 54·(5/18) = **15 exact**; 30 min nền h → 30·60/3600 = **1/2 exact**). Không khai unit ⇒ giữ nguyên theo hệ nền. Unit/nền ngoài bảng ⇒ throw có thông điệp — runPhysics bắt thành `errors` (không ném ra ngoài).
- **Độ → radian NỘI BỘ, exact khi đẹp (C8/F11):** bảng `EXACT_TRIG` cho angleDeg ∈ **{0, ±30, ±45, ±60, ±90}** — góc âm qua quy tắc đối xứng **sin(−θ) = −sin θ, cos(−θ) = cos θ** trên bảng góc dương: cos/sin là Scalar exact (cos45 = (1/2)√2, sin60 = (1/2)√3, sin(−90) = −1…). Góc khác (37°, 53°…) → `Math.cos(deg·π/180)` float, đáp cuối qua recognize — KHÔNG dựng CAS.
- Toolkit: `evalQuadS(q,τ)` (Scalar), `evalQuadN(q,τ)` (float độc lập — đường certify), `derivQuad(q)` = {k1, 2k2, 0}, `expandAbs(q,t0)` (đổi về t tuyệt đối: k0−k1t0+k2t0², k1−2k2t0, k2 — cần khi trừ hai vật khác t0), `subQuad(a,b)`, `rootsFor(q, value)` = `solveQuadratic(k2, k1, k0−value)` (mảng Scalar, sort theo approx).

### 6.2. Công thức đóng từng query (compute.ts)

Ký hiệu: τ = t − t0 của vật; vật "rơi được" = free_fall/projectile (y bậc 2 mở xuống).

| Query | Công thức | Ghi chú exact |
|---|---|---|
| `position_at(of,t,axis?)` | evalQuad(trục, τ). axis mặc định = trục chuyển động chính (mover1d→axis của nó; free_fall→y; projectile→x). Đòi t ≥ t0. | exact xuyên suốt khi input hữu tỉ/căn đẹp |
| `velocity_at(of,t,comp)` | vx=evalQuad(derivX,τ), vy=evalQuad(derivY,τ); speed=√(vx²+vy²) | speed exact khi vx²+vy² về hữu tỉ (vd 10√2 & −10√2 → √400=20) |
| `time_to_ground(of)` | nghiệm NHỎ NHẤT τ > EPS_T của y(τ)=0 (loại nghiệm τ=0 khi ném từ đất), trả t=t0+τ | (−b±√Δ)/2a qua `solveQuadratic` — exact khi Δ chính phương·squarefree |
| `range(of)` | x(τ_đất) − x(0) | tự chạy time_to_ground trước |
| `max_height(of)` | τ* = −k1/(2k2) (đòi k2<0, τ*≥0, nếu không → error rõ); H = y(τ*) = h0 + v0y²/(2g) | exact thuần (chia hữu tỉ) |
| `impact_velocity(of,comp)` | velocity_at tại t_đất | vd ném ngang 20 m/s, rơi 4 s → √(20²+40²)=20√5 |
| `meet_time(a,b)` | d = subQuad(expandAbs(xa hoặc trục chung), expandAbs(xb)); nghiệm NHỎ NHẤT t ≥ max(t0a,t0b)−EPS_T của d(t)=0. **D3:** nếu còn nghiệm hợp lệ thứ hai (1 xe có gia tốc, gặp 2 lần) ⇒ vẫn trả nghiệm ĐẦU + đẩy 1 dòng check info "còn nghiệm gặp lần 2: t₂ = …" (minh bạch, KHÔNG thêm query mảng) | tuyến tính (2 xe đều) → t = −c/b exact; 1 xe có gia tốc → bậc 2 |
| `meet_position(a,b)` | pos_a(t_gặp) | |
| `distance_between_at(a,b,t)` | 1D: \|Δx\|; nếu có vật 2D: √(Δx²+Δy²) | |
| `time_when(of,position,axis?)` | nghiệm nhỏ nhất t ≥ t0 của coord(t)=position | |
| `time_when_velocity(of,value,comp?)` **(F3)** | v_comp(t) TUYẾN TÍNH (deriv của Quad): nghiệm nhỏ nhất t ≥ t0 của v_comp(t)=value ⇒ τ = (value−k1)/(2k2), trả t = t0+τ. comp mặc định = trục chính. Không nghiệm hợp lệ (v hằng ≠ value, hoặc sai chiều) ⇒ error rõ | nghiệm tuyến tính −c/b ⇒ exact thuần khi hệ số hữu tỉ (hãm phanh 15/3 = 5) |
| `position_when_velocity(of,value,comp?)` **(F3)** | toạ độ trục chính (hoặc comp) tại t vừa giải ở trên — cặp tách-một-số với time_when_velocity (như meet_time/meet_position). Bài hãm phanh x0=0: chính là quãng đường tới lúc dừng | exact thuần |

**Hai vật & mốc thời gian:** mọi vật dùng CHUNG gốc thời gian t=0 của đề; vật có `startAt` đứng yên tại vị trí đầu cho tới t0 (khớp hành vi AnimatedAgent: trước track.start agent đậu ở initialPosition). `meet_time` chỉ xét t ≥ max(t0) — trường hợp "xe A đi ngang chỗ xe B còn đậu" KHÔNG tính là gặp (giới hạn có chủ đích, đề SGK không ra kiểu đó — ghi ở §12).

### 6.3. Dựng đáp (mkAnswer) — 3 tầng, mirror runAnalysis

```
1. certifyScalar(kind, scalarKQ, floatKQ)   // floatKQ tính ĐỘC LẬP bằng số học thường (evalQuadN /
                                            // công thức nghiệm float) — exact lệch float >1e-6·scale ⇒ bỏ exact
2. exact còn sống → text = displayScalar    // "2√2", "3/2", "20√5"
   exact chết    → recognizeConstant(float) // "1/2 + √13/2" (nghiệm nhị thức căn tự rơi về float — đúng
                                            // thiết kế solver1d — recognize dựng lại dạng đẹp)
   recognize trượt → fmtNum 4 chữ số        // "19.9426", approximate: true
3. Gắn đơn vị theo query: position_at/range/max_height/meet_position/distance_between_at/
   position_when_velocity → units.length; velocity_at/impact_velocity → `${length}/${time}`;
   time_to_ground/time_when/time_when_velocity/meet_time → units.time.
   (unitOf so khớp CHUỖI KIND ĐẦY ĐỦ — nhớ liệt kê 'time_when_velocity' tường minh ở nhánh
   thời gian, vì so `kind === 'time_when'` KHÔNG bắt được nó.)
```

## 7. Tự kiểm (asserts) — thay đáp ngược, eps CÓ CHỦ ĐÍCH

**7.1. Auto self-check (LUÔN chạy, không cần khai báo)** — mỗi đáp "nghiệm phương trình" được thay ngược vào phương trình chuyển động, ghi vào `checks[]`:

| Đáp | Kiểm thay-ngược |
|---|---|
| t_đất (time_to_ground, range, impact) | \|y(t_đất)\| ≤ EPS_SELF·scale |
| t_gặp, x_gặp | \|pos_a(t_gặp) − pos_b(t_gặp)\| ≤ EPS_SELF·scale — "x gặp của 2 xe bằng nhau" |
| t (time_when) | \|coord(t) − position\| ≤ EPS_SELF·scale |
| t (time_when_velocity), x (position_when_velocity) | \|v_comp(t) − value\| ≤ EPS_SELF·scale (F3) |
| max_height | \|v_y(τ*)\| ≤ EPS_SELF·scale VÀ y(τ*) ≥ y(τ*±h) (đúng là đỉnh) |
| miền nghiệm | t ≥ t0 (không serve nghiệm âm/trước xuất phát); không có nghiệm hợp lệ ⇒ error, KHÔNG serve |

**7.2. Asserts khai báo** (dữ kiện DƯ của đề): chạy `assert.query` như query thường, so `|got − equals| ≤ tol·max(1,|equals|)`. Fail ⇒ push `violations` (mô hình dịch sai đề) ⇒ `ok:false`, không serve đáp.

**7.3. Hai ngưỡng, lý do chọn:**

| Hằng | Giá trị | Vì sao |
|---|---|---|
| `EPS_SELF = 1e-6` (tương đối, scale = max(1, \|hệ số lớn nhất\|)) | Nghiệm đóng có residual ~1e-12 (nhiễu double); công thức SAI lệch cỡ O(1). 1e-6 cách cả hai 6 bậc — không false-positive, không lọt lỗi thật. |
| `TOL_ASSERT = 1e-3` (tương đối, mặc định của asserts khai báo) | Dữ kiện đề thường làm tròn 2–3 chữ số có nghĩa (vd "≈ 44,7 m/s"); 1e-3 dung nạp làm tròn của ĐỀ nhưng vẫn bắt dịch sai (nhầm 9,8↔10 lệch 2% > 1e-3). LLM được override `tol` khi đề nói "lấy tròn". |

## 8. Scene xuất (scene.ts)

### 8.1. Hệ trục & phần tĩnh

Physics tính trong mặt phẳng (x ngang, y đứng). Map sang geo3d: **điểm (x_p, y_p) → (x, 0, y_p)** — vì frontend map geo3d z lên trục đứng của Three (`AnimatedAgent`: `currentPos.set(x, z, y)`). Đơn vị trục = `units.length` → `GeometryData.axisUnit`.

- **Mặt đất:** 2 điểm `G0`,`G1` (label rỗng) tại z=0, x = [xMin−5%span, xMax+5%span] + `Line3D` solid xám.
- **Mốc — mức v0 (chốt F8, hạ xuống đúng mức plan Task 4):** điểm xuất phát mỗi vật `<name>0` (label `"<label> (xuất phát)"`); điểm chạm đất `<name>_dat` cho vật rơi được (label **text trần** `"Chạm đất"` — KHÔNG nhúng giá trị đã tính vào nhãn).
- **Để dành v1 (tường minh — KHÔNG làm ở v0, F8):** điểm đỉnh `<name>_dinh` (khi query max_height); điểm gặp `M_<a>_<b>` (khi query meet); giá trị đã tính trong nhãn mốc (vd "Chạm đất (20√3 m)"). Giá trị số vẫn đến tay người dùng qua `answers[]` — scene v0 chỉ là minh hoạ.
- **Quỹ đạo** (chỉ vật rơi được): `Curve3D {type:'expr', plane:'xz', style:'dashed', params: {}, samples: 33 điểm {x:x(τ), y:y(τ)}, τ đều trên [0, τ_đất]}` — `plane:'xz'` render (x, cao, 0) đúng mặt phẳng chuyển động, samples có sẵn nên frontend KHÔNG cần parser. **`params: {}` BẮT BUỘC phát** (F9 — field `params` là required của type `Curve3D`; thiếu là lỗi typecheck khi gate tsconfig.kernel.json bật).

### 8.2. Timeline — quy ước scale thời gian (ghi rõ vì playback là THỜI GIAN THỰC)

> Chốt D2 (phản biện phiên 1): quy tắc playback dưới đây GIỮ NGUYÊN (kể cả ngưỡng 3–15 s); bước thử trên canvas thật được thêm vào rollout P2 — chỉ chỉnh ngưỡng nếu cảm quan canvas bác bỏ.

`AnimationContext` chạy đồng hồ thật (không có timeScale) ⇒ bài 1,5 giờ không thể phát 1,5 giờ:

- **T_phys** (chân trời vật lý, đơn vị `units.time`) = max của: mọi `t` trong queries; mọi đáp thời gian (t_đất, t_gặp, time_when); tối thiểu 1.
- **Playback:** nếu `units.time === 's'` và 3 ≤ T_phys ≤ 15 → phát THỜI GIAN THẬT: `D_pb = T_phys`, `k = 1`. Ngược lại `D_pb = 10 s`, `k = T_phys / 10` (k = [đơn vị thời gian đề]/giây playback; k<1 = slow-motion). `scene.durationSec` trong plan ép D_pb nếu có.
- Track mỗi vật: `start = t0/k`, `end = T_end/k` (T_end = t_đất của vật rơi được, ngược lại T_phys). Biến `t` trong `path` là **GIÂY PLAYBACK kể từ track.start** (dt của AnimatedAgent) ⇒ engine NHÂN SẴN hệ số: bậc 1 nhân k, bậc 2 nhân k².

```
x(t) = x0 + (v0x·k)*t                    // với τ0=0 tại track.start
z(t) = h0 + (v0y·k)*t + (−g/2·k²)*t*t
```

- **Phát CẢ `params.equations = {x,y,z}` (object) LẪN `params.path` (chuỗi):** `AnimatedAgent` ưu tiên `equations` (không qua bước split dấu phẩy — an toàn hơn, theo khuyến nghị spec kiến trúc đa môn §6.1); `path` giữ làm dự phòng + debug (format module kinematic đã chứng minh render). `equations` chỉ chứa VẾ PHẢI (`"0 + 10*t"`), `path` là chuỗi đầy đủ `x(t) = …, y(t) = …, z(t) = …`.
- **Bắt buộc `t*t`, KHÔNG `t^2`:** `AnimatedAgent` chỉ `.replace('t^2', ...)` MỘT lần xuất hiện đầu — phát `t*t` từ engine là an toàn tuyệt đối. Quirk `+ -5*t*t` là JS hợp lệ (kinematic đã kiểm).
- **Bắt buộc `landing_point` trên MỌI track** = vị trí geo3d tại T_end (`[x_end, 0, y_end]`): AnimatedAgent sau track.end nếu thiếu landing_point sẽ NHẢY VỀ initialPosition.
- Ghi `params.timeScale = k` + `GeometryData.tags = ['physics', 'timeScale:<k>']` để UI sau này hiển thị "tốc độ phát ×k" (v0 chỉ ghi dữ liệu).
- Agent: `{id: name, label: scene.labels?.[name] ?? name, initialPosition: [x(t0),0,y(t0)], color: bảng màu cố định theo thứ tự ops ['#FFA500','#38BDF8','#F472B6','#4ADE80'], radius: max(0.12, 0.02·span)}`.

### 8.3. Đồ thị x-t / v-t — CHỈ dữ liệu (không chart engine)

Trường `charts` của **PhysicsResult** (KHÔNG nhét vào GeometryData — không đụng canvas):

```jsonc
{
  "kind": "x_t", "tUnit": "h", "vUnit": "km",
  "series": [
    { "name": "xe1", "samples": [[0, 0], [0.0234, 0.9375], /* 65 mẫu đều trên [t0, T_phys] */ [1.5, 60]] },
    { "name": "xe2", "samples": [[0.5, 120], [1.5, 60]] }   // tuyến tính ⇒ 2 mẫu/đoạn là đủ
  ],
  "events": [ { "t": 1.5, "label": "gặp nhau", "value": 60 } ]
}
```

- `x_t`: 65 mẫu đều trên [t0, T_phys] mỗi vật (bậc 2 cần mật độ); vật thẳng đều chỉ 2 mẫu.
- `v_t`: v(t) tuyến tính từng vật ⇒ 2 mẫu [t0, v(t0)], [T_phys, v(T_phys)].
- `events`: mọi đáp thời gian (gặp nhau, chạm đất) để frontend đánh dấu. Frontend UI vẽ chart là việc v1.
- **Chốt D6 (phản biện phiên 1):** v0 GIỮ `charts` trong PhysicsResult (không đụng GeometryData); hướng v1 là thêm field optional `charts?` trên `GeometryData` (thay đổi cộng thêm) — **KHÔNG nhét charts vào `tags`**. Hệ quả v0 phải ghi rõ: lưu lịch sử/saved geometries chỉ persist `geometry` ⇒ **charts KHÔNG persist, mất khi xem lại bài cũ** — chấp nhận ở v0.

### 8.4. Ví dụ scene JSON HOÀN CHỈNH — bài ném xiên P6 (v0=20 m/s, 60°, g=10)

(Đã hạ về đúng mức scene v0 theo F8 — plan kèm `scene.labels = { "bong": "Quả bóng" }`.)

T_phys = 2√3 ≈ 3.4641 s ∈ [3,15] ⇒ k=1, D_pb=3.4641. Đỉnh quỹ đạo (10√3, 15) chỉ dùng để tính span/yTop (KHÔNG phát điểm — v1); chạm đất (20√3, 0); span ≈ 34.64 ⇒ radius 0.69, margin đất 1.73.

```jsonc
{
  "name": "nem-xien-60",
  "axisUnit": "m",
  "tags": ["physics", "timeScale:1"],
  "points": [
    { "id": "G0", "label": "", "x": -1.73, "y": 0, "z": 0 },
    { "id": "G1", "label": "", "x": 36.37, "y": 0, "z": 0 },
    { "id": "bong0",    "label": "Quả bóng (xuất phát)", "x": 0,      "y": 0, "z": 0 },
    { "id": "bong_dat", "label": "Chạm đất",             "x": 34.641, "y": 0, "z": 0 }
  ],
  "lines": [ { "id": "ground", "from": "G0", "to": "G1", "style": "solid", "color": "#8B8B8B" } ],
  "curves": [
    { "id": "traj_bong", "type": "expr", "plane": "xz", "style": "dashed", "color": "#FFA500",
      "params": {},
      "samples": [ { "x": 0, "y": 0 }, { "x": 1.0825, "y": 1.8164 },
                   /* … 33 mẫu đều theo τ ∈ [0, 2√3], mẫu i: x=10τᵢ, y=10√3·τᵢ−5τᵢ² … */
                   { "x": 33.5585, "y": 1.8164 }, { "x": 34.641, "y": 0 } ] }
  ],
  "agents": [
    { "id": "bong", "label": "Quả bóng", "initialPosition": [0, 0, 0], "color": "#FFA500", "radius": 0.69 }
  ],
  "timeline": {
    "duration": 3.4641,
    "tracks": [
      { "id": "mv_bong", "start": 0, "end": 3.4641, "type": "parametric_path", "targetId": "bong",
        "params": {
          "equations": { "x": "0 + 10*t", "y": "0", "z": "0 + 17.320508*t + -5*t*t" },
          "path": "x(t) = 0 + 10*t, y(t) = 0, z(t) = 0 + 17.320508*t + -5*t*t",
          "landing_point": [34.641016, 0, 0],
          "timeScale": 1
        } }
    ]
  }
}
```

(Kiểm nhanh bằng chính parser AnimatedAgent: t=0 → (0,0,0); t=√3≈1.732 → x=17.32, z=17.320508·1.732−5·3=29.99−15≈15 = đỉnh; t=2√3 → z≈0, x≈34.64 = chạm đất; t>end → đậu tại landing_point.)

## 9. PhysicsResult

```ts
type PhysicsResult = {
  ok: boolean;                       // violations=0 && errors=0 && mọi đáp hữu hạn
  answers: { label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean }[],
                                     // THEO THỨ TỰ queries — như run().answers
  checks: { kind: string; detail: string; residual: number; pass: boolean }[],   // tự kiểm thay-ngược (minh bạch)
  violations: { assert: string; expected: number; got: number; delta: number }[],
  errors: { message: string }[],
  geometry: GeometryData | null,     // §8 — points/lines/curves + agents + timeline
  charts: PhysicsChart[],            // §8.3
  meta: { tPhys: number; playback: { durationSec: number; timeScale: number }; units: { length: string; time: string } },
};
```

**Đối chiếu contract chung route đa môn (chốt F7, phản biện phiên 1):** PhysicsResult KHÔNG đổi shape để ép khớp contract `{ok, answers, violations, errors, trace, scene}` — việc khớp là của **bridge P2**: alias `scene = result.geometry`; `trace` tổng hợp từ `checks[].detail` + `errors`; `checks`/`charts`/`meta` là **mở rộng hợp lệ** của nhánh physics (consumer chung bỏ qua được). Xem spec kiến trúc §5.

## 10. MƯỜI HAI BÀI MẪU (P1–P12) — contract test (đáp tính tay từng bước)

Mỗi bài: đề kiểu SGK/đề thi VN (số liệu tự đặt chuẩn), plan kỳ vọng, đáp tính TAY để test assert. File test: `physics-contract.test.ts`. (P11–P12 thêm sau phản biện phiên 1 — F3, F11.)

---

### P1 — Thẳng đều (position_at + time_when)

**Đề:** "Một ô tô chuyển động thẳng đều với tốc độ 60 km/h, xuất phát từ cột mốc Km 0. a) Sau 1,5 giờ ô tô ở vị trí nào? b) Ô tô tới cột mốc Km 150 lúc nào?"

```json
{ "problemName": "oto-thang-deu", "units": { "length": "km", "time": "h" },
  "ops": [ { "op": "mover1d", "name": "oto", "x0": 0, "v0": 60, "v0Unit": "km/h" } ],
  "queries": [ { "kind": "position_at", "of": "oto", "t": 1.5, "label": "a" },
               { "kind": "time_when", "of": "oto", "position": 150, "label": "b" } ] }
```

**Tính tay:** F2 — LLM chép "60 km/h" thành `v0: 60, v0Unit: 'km/h'`; hệ nền km/h ⇒ engine đổi qua SI rồi về nền = factor 1 exact (khai unit để nhất quán "chép số + unit", đáp không đổi). x(t)=60t. a) x(1,5)=60·3/2=**90 km** (exact: 1.5→3/2). b) 60t=150 ⇒ t=150/60=**5/2 h = 2,5 h** (nghiệm tuyến tính −c/b exact). Thay ngược: x(5/2)=150 ✓ residual 0.
**Kỳ vọng test:** answers[0] ≈ 90, text "90 km"; answers[1] ≈ 2.5, text "5/2 h", approximate:false.

---

### P2 — Thẳng biến đổi đều (velocity_at + position_at)

**Đề:** "Một ô tô đang chạy với vận tốc 10 m/s thì tăng tốc, chuyển động nhanh dần đều với gia tốc 2 m/s². a) Tính vận tốc sau 5 s. b) Quãng đường đi được trong 5 s đó."

```json
{ "problemName": "oto-nhanh-dan-deu",
  "ops": [ { "op": "mover1d", "name": "oto", "x0": 0, "v0": 10, "a": 2 } ],
  "queries": [ { "kind": "velocity_at", "of": "oto", "t": 5, "component": "x", "label": "a" },
               { "kind": "position_at", "of": "oto", "t": 5, "label": "b" } ] }
```

**Tính tay:** x-Quad {0, 10, 1} (k2=a/2=1). a) v(5)=10+2·5=**20 m/s**. b) x(5)=10·5+1·25=50+25=**75 m**. Cả hai hữu tỉ exact.
**Kỳ vọng:** "20 m/s"; "75 m"; approximate:false cả hai.

---

### P3 — Rơi tự do

**Đề:** "Thả rơi tự do một hòn đá từ độ cao 45 m. Lấy g = 10 m/s². a) Tính thời gian rơi. b) Vận tốc khi chạm đất."

```json
{ "problemName": "roi-tu-do-45m",
  "ops": [ { "op": "free_fall", "name": "da", "h0": 45, "g": 10 } ],
  "queries": [ { "kind": "time_to_ground", "of": "da", "label": "a" },
               { "kind": "impact_velocity", "of": "da", "label": "b" } ] }
```

**Tính tay:** y(t)=45−5t². a) 45−5t²=0: solveQuadratic(−5, 0, 45): Δ=0−4·(−5)·45=900, √900=30, t=(0±30)/(−10)={−3, 3} → chọn **t=3 s** (loại nghiệm âm). Thay ngược y(3)=45−45=0 ✓. b) v_y(3)=−g·t=−30 ⇒ speed=**30 m/s** (exact).
**Kỳ vọng:** "3 s"; "30 m/s".

---

### P4 — Ném ngang (đáp căn 20√5)

**Đề:** "Từ đỉnh tháp cao 80 m, ném một vật theo phương ngang với vận tốc đầu 20 m/s. Lấy g = 10 m/s². a) Thời gian chạm đất. b) Tầm xa. c) Độ lớn vận tốc khi chạm đất."

```json
{ "problemName": "nem-ngang-thap-80m",
  "ops": [ { "op": "projectile", "name": "vat", "h0": 80, "v0": 20, "angleDeg": 0, "g": 10 } ],
  "queries": [ { "kind": "time_to_ground", "of": "vat", "label": "a" },
               { "kind": "range", "of": "vat", "label": "b" },
               { "kind": "impact_velocity", "of": "vat", "label": "c" } ] }
```

**Tính tay:** cos0=1, sin0=0 ⇒ x-Quad {0,20,0}, y-Quad {80,0,−5}. a) 80−5t²=0: Δ=1600, √=40, t=(0±40)/(−10) → **4 s**. b) x(4)=20·4=**80 m**. c) vx=20, vy=−10·4=−40; speed=√(400+1600)=√2000=√(400·5)=**20√5 m/s ≈ 44,7214** (sqrtExact: 2000=20²·5). Thay ngược y(4)=0 ✓.
**Kỳ vọng:** "4 s"; "80 m"; "20√5 m/s", approx≈44.7214, approximate:false.

---

### P5 — Ném xiên 45° (đáp thời gian DẠNG CĂN)

**Đề:** "Từ mặt đất, ném một quả bóng với vận tốc đầu 20 m/s hợp với phương ngang góc 45°. Lấy g = 10 m/s². a) Thời gian bay. b) Tầm xa."

```json
{ "problemName": "nem-xien-45",
  "ops": [ { "op": "projectile", "name": "bong", "h0": 0, "v0": 20, "angleDeg": 45, "g": 10 } ],
  "queries": [ { "kind": "time_to_ground", "of": "bong", "label": "a" },
               { "kind": "range", "of": "bong", "label": "b" } ] }
```

**Tính tay:** cos45=sin45=(1/2)√2 exact ⇒ v0x=v0y=20·(1/2)√2=10√2. y-Quad {0, 10√2, −5}. a) −5t²+10√2·t=0: Δ=(10√2)²=200, √200=10√2 (CÙNG radicand với b ⇒ trừ được exact): t=(−10√2−10√2)/(−10)=**2√2 s ≈ 2,8284**; nghiệm t=0 bị LOẠI (vừa rời đất — quy ước τ>EPS_T khi h0=0). b) x(2√2)=10√2·2√2=20·2=**40 m** (mulExact: radicand 2·2=4 → hữu tỉ). Thay ngược y(2√2)=10√2·2√2−5·8=40−40=0 ✓.
**Kỳ vọng:** "2√2 s", approx≈2.8284, approximate:false; "40 m".

---

### P6 — Ném xiên 60° KẾT HỢP (max_height + range + velocity_at) — bài của scene §8.4

**Đề:** "Từ mặt đất, ném quả bóng với vận tốc đầu 20 m/s hợp với phương ngang góc 60°. Lấy g = 10 m/s². a) Độ cao cực đại. b) Tầm xa. c) Độ lớn vận tốc tại thời điểm t = 1 s."

```json
{ "problemName": "nem-xien-60-ket-hop",
  "ops": [ { "op": "projectile", "name": "bong", "h0": 0, "v0": 20, "angleDeg": 60, "g": 10 } ],
  "queries": [ { "kind": "max_height", "of": "bong", "label": "a" },
               { "kind": "range", "of": "bong", "label": "b" },
               { "kind": "velocity_at", "of": "bong", "t": 1, "label": "c" } ] }
```

**Tính tay:** cos60=1/2, sin60=(1/2)√3 ⇒ v0x=10, v0y=10√3. y-Quad {0, 10√3, −5}. a) τ*=−k1/(2k2)=10√3/10=√3; H=10√3·√3−5·3=30−15=**15 m** (exact); kiểm v_y(√3)=10√3−10√3=0 ✓. b) t_đất: Δ=(10√3)²=300, √300=10√3, t=2√3; range=10·2√3=**20√3 m ≈ 34,6410**. c) vx=10; vy(1)=10√3−10≈7,3205; speed=√(100+(10√3−10)²)=10√(5−2√3) — căn LỒNG NHAU, ngoài trường một-căn ⇒ exact chết ĐÚNG THIẾT KẾ, float **≈ 12,3931 m/s**, recognize trượt ⇒ approximate:true. (Đây là contract cho nhánh fallback trung thực.)
**Kỳ vọng:** "15 m"; "20√3 m" ≈34.6410; answers[2].approx ≈ 12.3931 (±1e-3), approximate:true.

---

### P7 — Hai xe ĐUỔI NHAU (meet_time + meet_position)

**Đề:** "Lúc 7 giờ, một ô tô qua điểm A với tốc độ không đổi 60 km/h, đuổi theo một xe khách vừa qua điểm B cách A 30 km với tốc độ không đổi 40 km/h. Hai xe chuyển động thẳng đều cùng chiều. Hỏi sau bao lâu ô tô đuổi kịp xe khách và vị trí gặp cách A bao nhiêu km?"

```json
{ "problemName": "hai-xe-duoi-nhau", "units": { "length": "km", "time": "h" },
  "ops": [ { "op": "mover1d", "name": "oto", "x0": 0, "v0": 60 },
           { "op": "mover1d", "name": "khach", "x0": 30, "v0": 40 } ],
  "queries": [ { "kind": "meet_time", "a": "oto", "b": "khach", "label": "a" },
               { "kind": "meet_position", "a": "oto", "b": "khach", "label": "b" } ],
  "scene": { "labels": { "oto": "Ô tô", "khach": "Xe khách" } } }
```

**Tính tay:** d(t)=60t−(30+40t)=20t−30. d=0 ⇒ t=30/20=**3/2 h = 1,5 h** (sau 1 giờ 30 phút, lúc 8h30). x_gặp=60·3/2=**90 km**. Thay ngược: x_oto(3/2)=90 = x_khach(3/2)=30+60=90 ✓ "x gặp của 2 xe bằng nhau".
**Kỳ vọng:** "3/2 h" ≈1.5; "90 km".

---

### P8 — Hai xe NGƯỢC CHIỀU, xuất phát LỆCH GIỜ (startAt) + distance_between_at

**Đề:** "Hai địa điểm A, B cách nhau 120 km. Lúc 6 giờ, xe thứ nhất khởi hành từ A về B với tốc độ 40 km/h. Lúc 6 giờ 30 phút, xe thứ hai khởi hành từ B về A với tốc độ 60 km/h. a) Hai xe gặp nhau lúc mấy giờ? b) Vị trí gặp cách A bao nhiêu km? c) Lúc 7 giờ hai xe cách nhau bao nhiêu km? (Gốc thời gian 6h, gốc toạ độ A, chiều dương A→B.)"

```json
{ "problemName": "hai-xe-nguoc-chieu-lech-gio", "units": { "length": "km", "time": "h" },
  "ops": [ { "op": "mover1d", "name": "xe1", "x0": 0, "v0": 40 },
           { "op": "mover1d", "name": "xe2", "x0": 120, "v0": -60, "startAt": 0.5 } ],
  "queries": [ { "kind": "meet_time", "a": "xe1", "b": "xe2", "label": "a" },
               { "kind": "meet_position", "a": "xe1", "b": "xe2", "label": "b" },
               { "kind": "distance_between_at", "a": "xe1", "b": "xe2", "t": 1, "label": "c" } ] }
```

**Tính tay:** x1(t)=40t. x2 expandAbs (t0=1/2): x2(t)=120−60(t−1/2)=150−60t (t≥1/2). a) 40t=150−60t ⇒ 100t=150 ⇒ **t=3/2 h ≥ 1/2 ✓ → gặp lúc 7h30**. b) x=40·3/2=**60 km**; kiểm x2(3/2)=150−90=60 ✓. c) t=1: x1=40, x2=150−60=90 ⇒ |40−90|=**50 km**. Toàn hữu tỉ exact (0.5→1/2).
**Kỳ vọng:** "3/2 h"; "60 km"; "50 km".

---

### P9 — time_when trên biến đổi đều (chọn đúng nghiệm dương)

**Đề:** "Một vật bắt đầu chuyển động nhanh dần đều từ trạng thái nghỉ với gia tốc 0,5 m/s². Hỏi sau bao lâu kể từ lúc xuất phát vật đi được quãng đường 100 m?"

```json
{ "problemName": "ndd-quang-duong-100m",
  "ops": [ { "op": "mover1d", "name": "vat", "x0": 0, "v0": 0, "a": 0.5 } ],
  "queries": [ { "kind": "time_when", "of": "vat", "position": 100 } ] }
```

**Tính tay:** x(t)=(1/4)t² (a/2=1/4 exact từ 0.5). (1/4)t²=100: solveQuadratic(1/4, 0, −100): Δ=0+4·(1/4)·100=100, √100=10, t=±10/(1/2)={−20, 20} → chọn **20 s**. Thay ngược x(20)=(1/4)·400=100 ✓.
**Kỳ vọng:** "20 s", approximate:false.

---

### P10 — Ném xiên TỪ ĐỘ CAO (nghiệm nhị thức căn → recognize) + impact đẹp bất ngờ

**Đề:** "Từ sân thượng cao 15 m, ném một quả bóng với vận tốc đầu 10 m/s hướng lên, hợp với phương ngang góc 30°. Lấy g = 10 m/s². a) Sau bao lâu bóng chạm đất? b) Tầm xa. c) Độ lớn vận tốc khi chạm đất."

```json
{ "problemName": "nem-xien-tu-do-cao",
  "ops": [ { "op": "projectile", "name": "bong", "x0": 0, "h0": 15, "v0": 10, "angleDeg": 30, "g": 10 } ],
  "queries": [ { "kind": "time_to_ground", "of": "bong", "label": "a" },
               { "kind": "range", "of": "bong", "label": "b" },
               { "kind": "impact_velocity", "of": "bong", "label": "c" } ] }
```

**Tính tay:** cos30=(1/2)√3, sin30=1/2 ⇒ v0x=5√3, v0y=5. y-Quad {15, 5, −5}.
a) −5t²+5t+15=0: Δ=25−4·(−5)·15=325=25·13, √325=5√13 exact; t=(−5−5√13)/(−10)=(1+√13)/2. Cộng −5 (hữu tỉ) với 5√13 (radicand 13) KHÁC radicand ⇒ `addExact` trả null ⇒ Scalar rơi về float ≈2.302776 — ĐÚNG thiết kế solver1d; `recognizeConstant(2.302776)` nhánh p+q√r dựng lại **"1/2 + √13/2" ≈ 2,3028 s**, approximate:false. Thay ngược y(2.302776)=15+11.51388−26.51388≈0 ✓ (residual ~1e-15 < EPS_SELF).
b) range=v0x·t=5√3·(1+√13)/2=(5√3+5√39)/2 — HAI căn khác nhau, không biểu diễn được ⇒ float **≈ 19,9426 m**, recognize trượt, approximate:true (trung thực).
c) vx=5√3 (vx²=75 exact); vy=5−10·2.302776≈−18.027756 (float, trị đúng −5√13, vy²≈325.0000); speed=√(75+325)=√400=**20 m/s** — recognize bắt lại số nguyên từ float 20.0000000000 (đối chiếu năng lượng: v²=v0²+2gh=100+300=400 ✓).
**Kỳ vọng:** answers[0] ≈2.3028, text "1/2 + √13/2 s", approximate:false; answers[1] ≈19.9426, approximate:true; answers[2] text "20 m/s", approx≈20.

---

### Bảng tổng hợp 10 bài

| # | Dạng | Đáp chốt |
|---|---|---|
| P1 | Thẳng đều | 90 km; 5/2 h |
| P2 | Biến đổi đều | 20 m/s; 75 m |
| P3 | Rơi tự do | 3 s; 30 m/s |
| P4 | Ném ngang | 4 s; 80 m; 20√5 m/s ≈ 44,7214 |
| P5 | Ném xiên 45° (căn) | 2√2 s ≈ 2,8284; 40 m |
| P6 | Ném xiên 60° kết hợp | 15 m; 20√3 m ≈ 34,6410; ≈ 12,3931 m/s (float trung thực) |
| P7 | Hai xe đuổi nhau | 3/2 h; 90 km |
| P8 | Hai xe ngược chiều + trễ 0,5 h | 3/2 h (7h30); 60 km; 50 km |
| P9 | time_when NDĐ | 20 s |
| P10 | Ném xiên từ 15 m | (1+√13)/2 s ≈ 2,3028 (recognize); ≈ 19,9426 m; 20 m/s |

## 11. Ngoài phạm vi v0 (YAGNI)

- Động lực học (lực, ma sát, Newton II), chuyển động tròn, ném xiên có cản, va chạm/tương tác giữa vật.
- `startAt` cho free_fall/projectile (đề lớp 10 hiếm khi cần); quỹ đạo 3D; nhiều hơn 4 vật/plan.
- Chart UI frontend (v0 chỉ xuất dữ liệu); wiring index.ts/bridge/route/prompt (v1); đổi đơn vị tự động trong engine.
- Đồ thị cho-trước-hỏi-ngược ("nhìn đồ thị suy ra v") — cần op khai báo từ đồ thị, để sau.

## 12. Rủi ro & giảm thiểu

- **R1 — LLM tự tính toán hộ engine** (đổi km/h→m/s, tự tính v0x=v0·cosθ): prompt v1 phải cấm; schema chỉ nhận v0+angleDeg (không nhận v0x/v0y) nên LLM không có chỗ nộp số đã tính.
- **R2 — format path/agent lệch frontend:** đã đọc thẳng code `AnimatedAgent.tsx` để chốt 3 quy ước (t*t, landing_point bắt buộc, map (x,0,y)); test scene khoá đúng các chuỗi này.
- **R3 — meet_time với vật chưa xuất phát:** quy ước "đứng yên tại x0 trước t0" + chỉ nhận nghiệm t ≥ max(t0) (khớp cả AnimatedAgent). Bài "A ngang qua chỗ B đang đậu" nằm ngoài định nghĩa gặp-nhau v0 — nêu rõ trong doc.
- **R4 — exact giả** (bug số học exact cho ra dạng đẹp SAI): mọi đáp qua `certifyScalar` đối chiếu bản float ĐỘC LẬP (evalQuadN/công thức nghiệm float) + auto thay-ngược EPS_SELF.
- **R5 — recognize khớp giả trên float:** recognize tự kiểm dựng-lại trong EPS 1e-10 (sẵn có); contract P6c/P10b khoá nhánh "trượt recognize → thập phân trung thực".

## 13. Tiêu chí thành công

1. 10 bài contract §10 chạy qua `runPhysics` ra ĐÚNG đáp tính tay (text + approx), exact/căn đúng chỗ, approximate:true đúng chỗ (P6c, P10b).
2. Mọi đáp nghiệm có `checks[]` thay-ngược pass; assert dữ kiện-dư sai ⇒ `violations` + ok:false (không serve).
3. Scene P6 khớp §8.4 (agent, path `t*t`, landing_point, curve quỹ đạo, k=1); P8 có k=0.15, track xe2 start=3.333s.
4. Toàn suite: 1072 test cũ XANH nguyên + test physics mới xanh; KHÔNG file có sẵn nào đổi (git status chỉ thấy `physics/**`).

## 14. Đối chiếu với spec kiến trúc đa môn (viết SONG SONG cùng ngày)

`docs/superpowers/specs/2026-08-21-engine-pack-architecture-design.md` (§7) phác pack physics ở tầng kiến trúc; spec này là bản CHI TIẾT. Hai bản THỐNG NHẤT về: pattern bọc-ngoài không đụng core, tái dùng scalar/solver1d/recognize, quy ước `t*t` + `landing_point` + trục z đứng, answers mang `unit`, contract `{ok, answers, violations, errors}`, LLM không được tính vx/vy hộ engine. Các điểm LỆCH cần phiên phản biện chốt một bản:

| # | Điểm lệch | Spec kiến trúc §7 | Spec này | Đề nghị |
|---|---|---|---|---|
| 1 | Tên file | `schema.ts`, `motion.ts`, thêm `physics/index.ts` | `planSchema.ts`, `kinematics.ts`, không index pack | Theo spec này khi thi công v0 (đã ăn khớp plan); thêm `physics/index.ts` 3 dòng ở bước tích hợp P2 để giữ quy ước export của kiến trúc |
| 2 | Hình dạng plan | `bodies:[{id, motion:{kind, from:[x,y,z], speed, angleDeg}}]`, `g` cấp plan, default 10 | ops phẳng `mover1d/free_fall/projectile`, `g` BẮT BUỘC theo từng op, KHÔNG default (chống hard-code) | Giữ ops phẳng + g bắt buộc (đề bài VN luôn cho g; thiếu g phải là lỗi dịch nhìn thấy được, không phải default im lặng) — cần chốt lại với tác giả spec kiến trúc |
| 3 | Thời gian animation | "t là GIÂY THẬT của bài" | Quy tắc playback §8.2 (k=1 khi 3–15 s; nén/kéo về 10 s ngoài khoảng) | Giữ quy tắc §8.2 — "giây thật" chết với bài hai xe 1,5 GIỜ (AnimationContext không có timeScale); k=1 chính là "giây thật" cho ném/rơi |
| 4 | Queries | `state_at{what}`, `flight_time`, `meet` (1 query 2 đáp) | `position_at`/`velocity_at` tách, `time_to_ground`, `meet_time`+`meet_position` tách (mỗi query MỘT số — dễ assert, khớp answers[] phẳng) | Giữ tách-một-số; map tên khi viết prompt P2 |
| 5 | Taxonomy tags | plan mang `knowledgeTags` (`ly/10/dong-hoc/nem-xien`), bridge lọc rồi merge vào `scene.tags` (P0/P2) | v0 scene tự gắn `['physics', 'timeScale:…']` | Không xung đột: taxonomy là việc bridge P2 (ngoài v0); v0 giữ chỗ `tags` sẵn — bridge chỉ append |

## 15. Điểm mở cần phản biện (trước khi thi công)

1. **Đơn vị trộn:** quy ước hiện tại cho LLM đổi lượng nhỏ (30 phút → 0.5 h) — có nên thêm trường `given:{value,unit}` để engine tự đổi, triệt để chống LLM tính hộ?
2. **Quy tắc playback** (3–15 s thật, ngoài đó nén về 10 s): ngưỡng lấy theo cảm quan — cần user thử trên canvas thật rồi chỉnh?
3. **`meet_time` khi một xe có gia tốc và 2 nghiệm hợp lệ** (gặp 2 lần): v0 trả nghiệm ĐẦU — có cần query `meet_times` (mảng) không?
4. **Nhãn thời gian tuyệt đối** ("gặp lúc 7h30"): engine trả 3/2 h từ gốc; việc cộng mốc 6h là trình bày — để LLM lời giải hay thêm `timeOrigin` vào plan?
5. **`position_at` trả 1 số theo trục:** bài hỏi "toạ độ (x,y)" của vật ném xiên phải tách 2 query — chấp nhận hay thêm query `position2d_at`?
6. **charts nằm trong PhysicsResult** (không vào GeometryData): frontend v1 lấy từ đâu khi lưu lịch sử chỉ lưu geometry? Có thể phải nhét `charts` vào `GeometryData.tags`/field mới — cần bàn với advance-frontend.
