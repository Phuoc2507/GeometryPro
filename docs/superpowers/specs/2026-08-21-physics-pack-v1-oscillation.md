# Physics Pack v1 — DAO ĐỘNG ĐIỀU HÒA lớp 11 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-21 (cập nhật 22/08 — áp phán quyết phản biện đợt 2)
**Trạng thái:** ĐÃ PHẢN BIỆN đợt 2 — mọi finding OS-1..OS-6 + phán quyết EXACT_COS + 10 phán quyết §14 + 3 phán quyết chung (§15) đã áp vào spec (nguồn: `../reviews/2026-08-21-wave2-specs-review.md`); chờ thi công. Changelog sửa đổi: §16.
**Phạm vi:** Mở rộng engine Vật lý (nền v0 động học — `2026-08-21-physics-pack-design.md`) cho chương **Dao động điều hòa** Vật lí 11. Chỉ thêm file vào `api/_lib/kernel/physics/**` + test; điểm chạm với v0 gói trong 2 FILE (`planSchema.ts`, `runPhysics.ts`) với danh sách diff kê **TRUNG THỰC từng dòng** ở §11 (OS-4 — KHÔNG phải "2 diff nhỏ": refine cấp plan + lệnh cấm trộn op là logic mới trong planSchema v0). KHÔNG sửa core kernel, KHÔNG sửa `src/**`.
**Ràng buộc kế thừa:** tuân các phán quyết đã duyệt ở `docs/superpowers/reviews/2026-08-21-arch-physics-review-phien1.md` — unit per-quantity engine tự đổi (F2/D1), EXACT_TRIG {0,±30,±45,±60,±90} mở rộng vòng tròn (C8), tag 4 tầng `ly/11/dao-dong/<skill>` (C4/F10), `answers[].unit` do engine ghi (C6), tol hai tầng EPS_SELF/TOL_ASSERT (C10/F6).

---

## 1. Mục tiêu (một câu)

Bài dao động điều hòa `x = A·cos(ωt + φ)`: **LLM chỉ DỊCH đề → khai dữ kiện vào OscillatorOp (không tính hộ một phép nào, kể cả đổi sin→cos, L→A, x₀v₀→A); ENGINE tất định TÍNH bằng công thức đóng trên trường mở rộng (hữu tỉ + một căn)·πᵏ, TỰ KIỂM bằng thay-ngược + hệ thức độc lập + bảo toàn năng lượng, và XUẤT scene vật-dao-động** (Agent3D + `parametric_path` với biểu thức `Math.cos` — đã xác minh render được, §2.2) + dữ liệu đồ thị x-t/v-t.

## 2. Nền tảng & HAI XÁC MINH CODE (đã chạy code thật, không đoán)

### 2.1. `recognize.ts` có nhận dạng bội π không? — CÓ MỘT PHẦN

Đọc `api/_lib/kernel/analysis/recognize.ts` và **chạy thử `recognizeConstant` thật** (build bằng esbuild, gọi trực tiếp):

| Giá trị thử | Kết quả code thật | Nhận xét |
|---|---|---|
| `40π` (v_max) | `"40π"` ✓ | nhánh 4 `kπ/m` (asRational(x/π, den≤64)) |
| `0,2π` (T) | `"π/5"` ✓ | nhánh 4 |
| `π/12`, `−π/2` | `"π/12"`, `"-π/2"` ✓ | nhánh 4 |
| `20√3·π` (v tại t) | **null** | KHÔNG có nhánh (a√b/c)·π |
| `2√5π/7` (T con lắc g=9,8) | **null** | như trên |
| `π²`, `π²/250`, `200π²` | **null** | KHÔNG có nhánh π² |
| `1/π`, `5/(2π)` | **null** | KHÔNG có nhánh chia π |
| `−4,0752…` (cos off-grid) | null ✓ | trung thực, đúng thiết kế |
| `2,0071` (2√5π/7 làm tròn 4 lẻ) | null ✓ | KHÔNG khớp giả — reconstruct-check 1e-10 làm việc |

**Kết luận:** recognize hiện nhận `kπ/m` và `p+qπ` (nhánh 4–5) — đủ làm lưới an toàn cho các đáp thuần-π khi exact chết. Nó KHÔNG nhận `π²`, `căn·π`, `k/π`. **Thiết kế của spec này KHÔNG dựa vào việc mở rộng recognize**: tầng `PiScalar` (§3) giữ exact ngay từ thượng nguồn cho cả ba dạng đó. Đề xuất mở rộng recognize chỉ là TÙY CHỌN — **ĐÃ PHÁN QUYẾT (§14.3): KHÔNG mở rộng ở v1** (phản biện chạy lại recognize.ts thật, xác nhận PiScalar là cần thiết và đủ).

### 2.2. `AnimatedAgent` eval được `Math.cos` không? — ĐƯỢC, vì dùng `new Function`

Đọc `src/components/3d/AnimatedAgent.tsx:86-97`: `getVal` chạy chuỗi qua 7 lần `.replace` (`'x_start'`, `'y_start'`, `'z_start'`, `'vx'`, `'vy'`, `'vz'`, `'t^2'` — mỗi cái CHỈ lần xuất hiện đầu) rồi **`new Function('t', 'return ' + replaced)`** — tức là MỌI biểu thức JS hợp lệ đều chạy, gồm `Math.cos(...)`. **Đã tái lập nguyên văn chuỗi replace + new Function và chạy thử:** `"0 + 4*Math.cos(3.14159265*t + 1.04719755)"` cho t=0 → 2.000000 (= 4cos π/3 ✓), t=2/3 → −4.000000 (= 4cos π ✓); cos lồng nhau `Math.sin(0.15*Math.cos(3.14*t))` cũng chạy. KHÔNG cần sample bằng Curve3D thay track.

**Bốn ràng buộc cú pháp** engine phải giữ khi phát biểu thức timeline (suy trực tiếp từ code trên):
1. KHÔNG dùng `^` (chỉ `.replace('t^2',…)` một lần — ta không cần lũy thừa: mọi hằng đã bake thành số).
2. KHÔNG chứa dấu phẩy trong biểu thức (fallback `path` split theo `','` — `Math.cos(a + b)` một đối số, an toàn; vẫn phát CẢ `equations` object làm kênh chính như v0 §8.2).
3. KHÔNG chứa các chuỗi con `x_start/y_start/z_start/vx/vy/vz` (dạng phát chuẩn `A*Math.cos(W*t + P)` với A, W, P là số literal ≥ 9 chữ số có nghĩa — tự nhiên tránh; lưu ý `Math` chứa chữ `t` nhưng không trùng target replace nào).
4. Không chứa `=` (fallback path split theo `'='`).

### 2.3. Tái dùng gì từ kernel + v0

| Cần | Đã có | Dùng lại |
|---|---|---|
| Số học hữu tỉ + một căn | `scalar.ts` (`Scalar`, `addExact/mulExact/divExact/sqrtExact`, `displayScalar`) | Thành phần `s` của PiScalar |
| Chứng nhận exact ↔ float | `compute/answer.ts` (`certifyScalar` — mirror thành `certifyPiScalar`) | §3.4 |
| Nhận dạng căn/π đẹp từ float | `analysis/recognize.ts` | Fallback tầng 2 khi exact chết |
| Nghiệm bậc ≤2 | `analysis/solver1d.ts` | KHÔNG cần cho osc (mọi query là công thức đóng trực tiếp hoặc nghiệm lượng giác §7) |
| Quy ước scene/timeline/playback | v0 §8 (map (x,0,y), `landing_point` bắt buộc, quy tắc k 3–15s, bảng màu, radius) | §9 kế thừa nguyên, chỉ thay dạng biểu thức |
| Schema khung PhysicsPlan | v0 §5 (`units`, `asserts`, `charts`, `scene`) | Osc chỉ THÊM nhánh op + queries vào 2 union |

## 3. Tầng PiScalar — (hữu tỉ + một căn)·πᵏ

**Vấn đề:** π vô tỉ, KHÔNG nằm trong trường `Scalar`. Đề VN đầy π: ω = 10π rad/s, T = 0,2π s, φ = π/3, v_max = 20π cm/s, a_max = 500π² cm/s², T = 2π√(m/k). Nếu để rơi float ngay, mất hết dạng đẹp (recognize chỉ vớt được thuần-π, §2.1).

**Giải pháp:** `piScalar.ts` — giá trị = `s · πᵏ`, `s: Scalar`, `k ∈ ℤ, |k| ≤ 2` (trường phân bậc — same philosophy "một căn": cộng chỉ đóng trong cùng bậc).

```ts
type PiScalar = { s: Scalar; k: number };          // giá trị = s.approx · π^k ; exact sống khi s.exact ≠ null
// approxP(p) = p.s.approx * Math.PI ** p.k
```

| Phép | Quy tắc | Ghi chú |
|---|---|---|
| `mulP(a,b)` | `{mul(s), ka+kb}` | \|k\| > 2 ⇒ collapse (dưới) |
| `divP(a,b)` | `{div(s), ka−kb}` | |
| `addP/subP(a,b)` | cùng k ⇒ `{add(s), k}`; vế 0 ⇒ vế kia; khác k ⇒ **collapse** | mirror addExact-null |
| `sqrtP(a)` | k chẵn & `sqrt(s)` exact ⇒ `{sqrt(s), k/2}`; k lẻ ⇒ collapse | |
| collapse | `{s: {approx: approxP, exact: null}, k: 0}` | rời trường có kiểm soát, approx luôn đúng |
| `cosP/sinP(pha)` | k=1 & s hữu tỉ exact ⇒ tra **EXACT_COS vòng tròn** (§3.2) → `Scalar` exact hoặc null; pha=0 ⇒ 1/0; còn lại ⇒ `Math.cos(approxP)` float | đầu ra là Scalar (k=0) |

**Vì sao \|k\| ≤ 2 đủ:** trong phạm vi chương, bậc cao nhất xuất hiện là π² (a_max = ω²A, W = ½mω²A² khi ω = aπ) và π⁻² (l/g khi g = π², §5.4). Không query nào cần π³. Vượt ⇒ collapse, approx vẫn đúng.

**Điểm mấu chốt vs v0:** ba dạng recognize KHÔNG cứu được (§2.1) đều exact trong PiScalar: `20√3·π` = {s: 20√3, k: 1}; `π²/250` = {s: 1/250, k: 2}; `2√5π/7` = {s: 2√5/7, k: 1}. Đây là lý do tồn tại của tầng này.

### 3.1. Đầu vào `PiRat` — số khai báo có thể mang π và mang PHÂN SỐ

JSON không viết được π, và pha kiểu π/3 = 0,333…π KHÔNG phải thập phân hữu hạn (scalarFromNumber sẽ làm chết exact). Chuẩn đầu vào:

```ts
const PiRat = z.union([
  Num,                                                            // 5 ≡ {n:5}
  z.object({ n: Num, d: z.number().int().positive().default(1),
             pi: z.boolean().default(false) }),                   // (n/d)·π^(pi?1:0)
]);
// ω = 10π  → {n:10, pi:true};  φ = −π/6 → {n:-1, d:6, pi:true};  T = 0,2π → {n:0.2, pi:true}
// t = 1/30 s → {n:1, d:30};    ω = 5    → 5
```

`toPiScalar(pr) = { s: div(scalarFromNumber(n), rat(d)), k: pi ? 1 : 0 }`. LLM **chép tử/mẫu literal từ đề** — không có phép tính nào để làm sai (kể cả "2π/3" → n:2, d:3, pi:true). Đây là câu trả lời triệt để cho R1 ở chương này.

### 3.2. EXACT_COS vòng tròn — mở rộng C8 đúng cách

C8 duyệt EXACT_TRIG cho góc {0,±30,±45,±60,±90}. Dao động cần TRỌN vòng tròn (pha 2π/3, 4π/3, …): với pha = (p/q)·π, **rút gọn p/q mod 2 bằng số học hữu tỉ exact (bigint)**; nếu q ∈ {1,2,3,4,6} ⇒ pha nằm trên lưới 16 điểm (bội π/6 ∪ bội π/4) ⇒ cos/sin exact qua góc chiếu + dấu theo cung phần tư (cos(2π/3) = −cos(π/3) = −1/2, sin(4π/3) = −√3/2, …). q ∉ {1,2,3,4,6} (vd π/5, π/12) ⇒ null ⇒ float — π/12 cho cos = (√6+√2)/4 hai căn, vốn ngoài trường Scalar, đúng thiết kế. Bảng này là hàm thuần trong `piScalar.ts`, kiểm bằng test đối chiếu `Math.cos` trên cả 16 điểm.

**ĐÃ PHÁN QUYẾT (phản biện đợt 2, 22/08): EXACT_COS 16 điểm là MỞ RỘNG HỢP LỆ của C8** — cùng triết lý bộ-góc-đóng, chỉ nới từ nửa lưới {0,±30,±45,±60,±90} lên trọn vòng tròn bội π/6 ∪ bội π/4; không cần duyệt lại kiến trúc.

**Luật so-exact trên lưới (OS-3 — SỬA mô tả cũ):** câu cũ "so exact bằng `cmpScalar`, không snap float" KHÔNG đứng — `cmpScalar` khi hai vế KHÁC radicand rơi về so float với EPS 1e-9 (`answer.ts:139-147`), tức vẫn là snap-float trá hình. Quy tắc CHỐT dùng ở §5.3 và §7:
- "Exact-khớp lưới" = **EQUALITY trên struct `Exact`** — đối chiếu đúng từng thành phần (num, den, radicand) sau chuẩn hoá, KHÔNG qua cmpScalar;
- Giá trị **HỮU TỈ** (radicand 1) so với **MỐC VÔ TỈ** của lưới (±√2/2, ±√3/2) ⇒ **mismatch NGAY** — hai cấu trúc khác radicand không bao giờ exact-bằng, không so float để "cứu";
- Không khớp điểm lưới nào ⇒ rơi ĐƯỜNG SỐ trung thực (float + recognize, `approximate:true`) — không có vùng snap.

### 3.3. Hiển thị `displayPiScalar`

Quy ước "π đứng trước căn" (chuẩn SGK "2π√5/7"): `sign + (num≠1 hoặc phần còn lại rỗng ? num : '') + πᵏ + (√rad nếu rad>1) + ('/den' nếu den>1)`; k=1 → `π`, k=2 → `π²`; k<0 → mẫu: `5/(2π)`, `1/π²`.

Ví dụ: {1/5, 1} → `"π/5"`; {−1/2, 1} → `"−π/2"`; {2√5/7, 1} → `"2π√5/7"`; {−20√3, 1} → `"−20π√3"`; {1/250, 2} → `"π²/250"`; {200, 2} → `"200π²"`; {3/1000, 2} → `"3π²/1000"`; k=0 → `displayScalar(s)` nguyên bản.

### 3.4. `certifyPiScalar` — 3 tầng mirror v0 §6.3

```
1. floatRef tính ĐỘC LẬP bằng Math.cos/Math.sqrt/Math.PI (không đi qua PiScalar)
2. p.s.exact ≠ null && |approxP(p) − floatRef| ≤ 1e-6·max(1,|floatRef|)
     → text = displayPiScalar(p), approximate:false
   exact chết → recognizeConstant(floatRef)   // vớt được kπ/m, p+qπ (§2.1)
   recognize trượt → toFixed(4), approximate:true
3. Gắn unit theo bảng unit cuối §6 (engine ghi — C6; dẫn chiếu cũ "§6.3" sai — OS-6)
```

## 4. Schema (zod) — `oscSchema.ts`, nối vào PhysicsPlanSchema v0

Osc THÊM 1 op và 17 query vào 2 discriminatedUnion của v0 (`PhysicsOpSchema`, `PhysicsQuerySchema`). Khung plan (units/asserts/charts/scene) giữ nguyên v0. Ba ràng buộc CẤP PLAN (sống trong `planSchema.ts` v0 — thuộc DIFF 1, kê ở §11): (1) `units.time` phải `'s'` khi plan có op `oscillator` (chu kỳ tính bằng giờ ngoài đề phổ thông); (2) `units.length` ∈ {'m','cm'} (đề VN hầu hết cm ⇒ translator khai `'cm'`); (3) **superRefine CẤM TRỘN op dao động (`oscillator`) với op động học (`mover1d`…) trong CÙNG một plan v1 (OS-4)** — plan trộn không bị cấm sẽ làm `qty*` của kinematics THROW khi units.length = 'cm'; đề hỗn hợp (hiếm) ⇒ bridge tách 2 plan riêng, lỗi tiếng Việt rõ "plan v1 không trộn dao động với động học".

```ts
// api/_lib/kernel/physics/oscSchema.ts
const VUnit = z.enum(['cm/s', 'm/s']);
const AUnit = z.enum(['cm/s2', 'm/s2']);

export const OscillatorOp = z.object({
  op: z.literal('oscillator'), name: Obj,

  // ── NGUỒN TỐC ĐỘ GÓC (0..n nguồn; ≥2 ⇒ nguồn ưu tiên tính, nguồn còn lại thành auto-assert §5.2) ──
  omega: PiRat.optional(),                       // rad/s
  T: PiRat.optional(),                           // s
  f: PiRat.optional(),                           // Hz
  count: z.object({ n: z.number().int().positive(), dt: PiRat }).optional(), // "n dao động trong dt giây"
  spring: z.object({ k: Num.positive() }).optional(),          // N/m — rate khi có mass; energy khi chỉ có k
  pendulum: z.object({
    l: Num.positive(), lUnit: z.enum(['m','cm']).default('m'),
    g: Num.positive().optional(),                // 9.8 / 10 THEO ĐỀ, như v0
    gAsPiSquared: z.boolean().default(false),    // đề "g = π²" hoặc "g = 10 và lấy π² = 10" → true, bỏ g (§5.4)
  }).optional(),                                 // refine: g XOR gAsPiSquared

  mass: Num.positive().optional(),               // cho ω=√(k/m) và W=½mω²A²
  massUnit: z.enum(['kg','g']).default('kg'),

  // ── NGUỒN BIÊN ĐỘ (0..n; ưu tiên + auto-assert như trên; đơn vị units.length) ──
  A: Num.positive().optional(),
  L: Num.positive().optional(),                  // chiều dài quỹ đạo = 2A
  pathPerPeriod: Num.positive().optional(),      // quãng đường 1 chu kỳ = 4A
  vmaxGiven: z.object({ v: Num.positive(), unit: VUnit.optional() }).optional(), // A = vmax/ω (cần rate)
  fromState: z.object({ x: Num, v: Num, unit: VUnit.optional() }).optional(),   // A²=x²+v²/ω² (cần rate)
  initial: z.object({ x0: Num, v0: Num.default(0), unit: VUnit.optional() }).optional(), // t=0 → A VÀ φ (§5.3)

  // ── PHA ──
  phi: PiRat.optional(),                         // rad; thiếu phi và thiếu initial ⇒ query cần pha error rõ
  form: z.enum(['cos','sin']).default('cos'),    // đề "x = A·sin(ωt+φₛ)" → form:'sin', phi = φₛ NGUYÊN VĂN;
                                                 // ENGINE đổi φ := φₛ − π/2 (LLM không tự trừ — chống R1)
});

export const OscQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('x_at'), of: Obj, t: PiRat, label: z.string().optional() }),
  z.object({ kind: z.literal('v_at'), of: Obj, t: PiRat, unit: VUnit.optional(), label: … }), // ĐẠI SỐ, có dấu
  z.object({ kind: z.literal('a_at'), of: Obj, t: PiRat, unit: AUnit.optional(), label: … }), // ĐẠI SỐ
  z.object({ kind: z.literal('amplitude'), of: Obj, label: … }),
  z.object({ kind: z.literal('omega'), of: Obj, label: … }),
  z.object({ kind: z.literal('period'), of: Obj, label: … }),
  z.object({ kind: z.literal('frequency'), of: Obj, label: … }),
  z.object({ kind: z.literal('initial_phase'), of: Obj, label: … }),      // chuẩn hóa (−π, π]
  z.object({ kind: z.literal('vmax'), of: Obj, unit: VUnit.optional(), label: … }),
  z.object({ kind: z.literal('amax'), of: Obj, unit: AUnit.optional(), label: … }),
  z.object({ kind: z.literal('speed_at_x'), of: Obj, x: Num, unit: VUnit.optional(), label: … }),  // |v|
  z.object({ kind: z.literal('x_at_speed'), of: Obj, v: Num.min(0), vUnit: VUnit.optional(), label: … }), // |x|; v ≥ 0 (OS-6: v = 0 hợp lệ — hỏi biên, |x| = A)
  z.object({ kind: z.literal('energy_total'), of: Obj, label: … }),                                // J
  z.object({ kind: z.literal('energy_kinetic_at'), of: Obj, at: z.union([z.object({x: Num}), z.object({t: PiRat})]), label: … }),
  z.object({ kind: z.literal('energy_potential_at'), of: Obj, at: /* như trên */, label: … }),
  z.object({ kind: z.literal('x_where_energy_ratio'), of: Obj, ratio: Num.positive(), label: … }), // Wđ = ratio·Wt → |x|
  z.object({ kind: z.literal('first_time_at_x'), of: Obj, x: Num,
             direction: z.enum(['positive','negative','any']).default('any'), label: … }),
]);
```

**Refine của op `oscillator` (OS-2 — ĐÃ PHÁN QUYẾT, chặn từ zod):**
- `omega`, `T`, `f`, `count.dt` phải **> 0 SAU quy đổi PiRat** (tức `n > 0` — `d` đã là int dương): T = 0 hay f = 0 làm `divExact` THROW xuyên pipeline; ω ÂM cho T/f/vmax âm mà tự kiểm hệ thức v² + ω²x² = ω²A² vẫn pass (bình phương nuốt dấu) — cả hai đường sai đều bị chặn ngay tại parse với lỗi tiếng Việt rõ ("chu kỳ phải dương…").
- `count.n` đã int dương sẵn; `pendulum`: `g` XOR `gAsPiSquared` (đã ghi trong schema).
- `initial` với `x0 = 0` VÀ `v0 = 0` ⇒ từ chối sớm "vật không dao động (A = 0)" — tầng normalize vẫn giữ guard A > 0 (§5.3, OS-5) cho mọi đường còn lại.

Tên query TÁCH khỏi kinematics (`x_at` ≠ `position_at`) có chủ đích: ngữ nghĩa khác (li độ 1D quanh VTCB vs toạ độ), dispatch không nhập nhằng, mirror phán quyết D5 "mỗi query MỘT số". Mọi `label` để khớp `answers[]` theo thứ tự — như v0. Chính tả field: giá trị VÀO kèm đơn vị dùng `vUnit` (theo v0 — phán quyết chung §15.3); `unit` chỉ dành cho đơn vị ĐẦU RA của đáp (v_at/a_at/vmax/amax/speed_at_x).

## 5. Chuẩn hóa op → OscModel (`oscillation.ts` — thuần)

```ts
type OscModel = {
  name: string;
  A: Scalar | null;          // theo units.length (cm hoặc m)
  omega: PiScalar | null;    // rad/s
  phi: PiScalar | null;      // rad, đã đổi form sin, đã chuẩn hóa (−π, π]
  massKg: Scalar | null;     // đã đổi g→kg (×1/1000 exact)
  kSpring: Scalar | null;    // N/m
  op: OscillatorOp;          // giữ nguyên bản khai để trace/assert
};
```

### 5.1. Đơn vị — unit per-quantity, engine đổi exact (thi hành F2/D1)

Nguyên tắc: **giữ đơn vị khai báo của plan xuyên suốt li độ/vận tốc/gia tốc; CHỈ các công thức có khối lượng/năng lượng/con lắc mới cần SI — engine đổi TẠI CHỖ bằng hữu tỉ exact**, không bắt LLM đổi:

| Đổi | Hệ số exact | Dùng ở |
|---|---|---|
| g → kg | ×1/1000 | ω=√(k/m), W=½mω²A² |
| cm → m (A, x) | ×1/100 | riêng công thức năng lượng (J = kg·m²/s²) |
| cm → m (l con lắc) | ×1/100 | T = 2π√(l/g) |
| m/s → cm/s và ngược | ×100 / ×1/100 | fromState/initial.v khi unit lệch units.length; unit đáp v/a theo query |

Khác kinematics v0 ("hệ nhất quán, engine không đổi"): dao động TRỘN đơn vị ngay trong một bài (A cm, k N/m, W J) nên "không đổi" là bất khả — đây là đúng tinh thần phán quyết F2 (engine đổi, LLM chỉ chép). Ghi đối chiếu ở §14.1.

### 5.2. Resolution nhiều nguồn — ưu tiên + auto-assert (dữ kiện dư thành tự kiểm)

- **rate:** ưu tiên `omega > T > f > count > spring(k)+mass > pendulum`. Công thức: ω; 2π/T; 2πf; 2π·n/dt; √(k/m); √(g/l). Các nguồn KHÔNG được chọn không bị vứt: engine tự sinh check "nguồn dư khớp" (exact khi cùng bậc π, ngược lại |Δ| ≤ EPS_SELF·ω) — đề "k=100, m=250 g, chu kỳ T=π/10 s" tự đối chiếu, dịch sai lộ ngay thành violation.
- **ampl:** ưu tiên `A > L (/2) > pathPerPeriod (/4) > fromState (√(x²+v²/ω²)) > vmaxGiven (/ω) > initial`. Dư ⇒ auto-assert như trên.
- Thiếu nguồn ⇒ trường null; query đụng tới ⇒ `errors: "cần <đại lượng> — đề không đủ dữ kiện hoặc dịch thiếu"`, KHÔNG bịa.
- **Query trỏ nhầm LOẠI op (OS-6):** query dao động (17 kind §4) có `of` trỏ tới op KHÔNG phải `oscillator` (vd `mover1d` động học) ⇒ error TƯỜNG MINH `"query <kind> trỏ '<name>' — không phải vật dao động (op oscillator)"`, không để rơi thành lỗi mù "thiếu đại lượng". Chiều ngược (query động học trỏ op oscillator) cùng luật — thuộc nhánh dispatch của runPhysics (DIFF 2, §11). Với lệnh cấm trộn op (§4/OS-4), ca này chỉ còn xảy ra khi `of` gõ sai tên hoặc bridge dispatch nhầm họ — vẫn phải có message đúng.

### 5.3. Pha từ điều kiện đầu (`initial`) + guard A > 0

**Guard A > 0 (OS-5):** trước mọi phép tính pha — nếu A = 0 (initial {x0: 0, v0: 0} lọt tới đây, hay bất kỳ nguồn ampl nào quy về 0) ⇒ `errors: "vật không dao động (A = 0 — x₀ = v₀ = 0)"`, KHÔNG tính φ (tránh chia 0 x₀/A), KHÔNG dựng scene; kết hợp refine §4 chặn sớm từ zod.

A = √(x₀² + (v₀/ω)²) (sqrtP — exact khi biểu thức dưới căn về hữu tỉ). φ: cos φ = x₀/A, sin φ = −v₀/(ωA); nếu CẢ HAI tỉ số exact-khớp một điểm lưới 16 (**theo luật equality-struct §3.2 — OS-3: đối chiếu struct `Exact`, hữu tỉ vs mốc vô tỉ ⇒ mismatch ngay; KHÔNG dùng cmpScalar ở đây vì nhánh khác-radicand của nó là so float EPS 1e-9**) ⇒ φ exact trên lưới, chọn đại diện ∈ (−π, π]; ngoài lưới ⇒ `atan2` float (approximate trung thực). Hai mẫu chuẩn: "kéo ra x₀ rồi thả nhẹ" (v₀=0) → φ = 0 (x₀>0) hoặc π (x₀<0); "truyền v₀ tại VTCB" (x₀=0) → φ = −π/2 (v₀>0) hoặc +π/2.

### 5.4. `gAsPiSquared` — g = π² là số học, không phải mẹo làm tròn

Khai `gAsPiSquared: true` ⇒ engine đặt **g = PiScalar{s:1, k:2}** (approx 9,8696…). Phép rút gọn kinh điển tự rơi ra từ đại số phân bậc: l/g = {s:l, k:−2} → sqrtP (k chẵn) → {√l, k:−1} → ×2π → **T = 2√l, k=0, EXACT** — π triệt tiêu đúng như lời giải SGK, engine KHÔNG hề "coi π²=10". Đường certify float độc lập: 2π√(l/π²) — khớp. Khi đề cho g số (9,8 = 49/5; 10): sqrtP(l/g) exact nếu l/g ra hữu tỉ có căn đẹp ⇒ T dạng (a√b/c)·π (vd `2π√5/7` với l=1, g=9,8). Hệ quả cần ghi: đề "g = 10 VÀ lấy π² = 10" khai `gAsPiSquared:true` (chứ không khai g:10) — vì hai giả thiết đó chỉ nhất quán khi g ≡ π²; asserts kèm theo: **ĐÃ PHÁN QUYẾT §14.5 — prompt P2 hướng dẫn override `tol: 0.02` cho asserts trong plan gAsPiSquared, engine KHÔNG tự nới tol.**

## 6. Công thức đóng từng query (`oscCompute.ts`)

Ký hiệu: pha(t) = addP(mulP(ω, t), φ) — PiScalar; mọi query chạy SONG SONG một bản float độc lập làm floatRef cho certify (§3.4).

| Query | Công thức | Đường exact điển hình |
|---|---|---|
| `x_at` | A·cosP(pha(t)) | ωt và φ cùng bậc π ⇒ pha exact; lưới 16 ⇒ cos exact (vd cos 2π/3 = −1/2) |
| `v_at` | −A·ω·sinP(pha(t)) — đại số | ω bậc 1 ⇒ đáp bậc 1: `−20π√3 cm/s` exact |
| `a_at` | −ω²·x(t) — đại số | ω bậc 1 ⇒ π²: `200π² cm/s²`; unit override đổi ×1/100 exact |
| `amplitude` `omega` `period` `frequency` | từ model; T = divP(2π, ω), f = divP(ω, 2π) | ω = 10π ⇒ T = 1/5 (π triệt tiêu); ω = 2 ⇒ T = π (bậc 1) |
| `initial_phase` | φ chuẩn hóa (−π, π] | `−π/2 rad` |
| `vmax` / `amax` | Aω / Aω² | `50π cm/s`; `500π² cm/s²` |
| `speed_at_x` | ω·√(A²−x²) — đòi \|x\| ≤ A, vượt ⇒ violation | hữu tỉ hoặc một căn |
| `x_at_speed` | √(A²−v²/ω²) — đòi 0 ≤ v ≤ v_max (v = 0 hợp lệ ⇒ \|x\| = A — biên; OS-6) | như trên |
| `energy_total` | ½kA² (ưu tiên khi có k) ∥ ½mω²A² — A, x đổi m; đáp J | ω=aπ ⇒ π²: `π²/250 J`; qua k ⇒ hữu tỉ `2/25 J` |
| `energy_potential_at` | ½mω²x² (∥ ½kx²); biến `t`: x = x_at(t) trước | cos lưới ⇒ cos² hữu tỉ (mulExact gộp radicand) ⇒ exact giữ |
| `energy_kinetic_at` | W − Wt (subP cùng bậc ⇒ exact) | `π²/1000 J` |
| `x_where_energy_ratio` | Wđ = n·Wt ⇒ \|x\| = A/√(1+n) | n=3 ⇒ A/2; n=1 ⇒ A√2/2 |
| `first_time_at_x` | §7 | |

Khi cả hai nguồn năng lượng khả dụng (k VÀ m,ω): tính theo k, tự sinh check `½kA² = ½mω²A²` (tương đương ω²=k/m đã assert ở §5.2 — check rẻ, giữ cho minh bạch).

**Bảng unit đáp (engine ghi — C6; đây là đích của dẫn chiếu §3.4 — OS-6):** `x_at`/`amplitude`/`x_at_speed`/`x_where_energy_ratio` → `units.length` (cm/m); `v_at`/`vmax`/`speed_at_x` → `unit` khai của query, mặc định `units.length`/s; `a_at`/`amax` → tương tự (cm/s² hay m/s²); `period`/`first_time_at_x` → `s`; `frequency` → `Hz`; `omega` → `rad/s`; `initial_phase` → `rad`; `energy_*` → `J`. Text giữ exact-first ("1/5 s", "π/12 s") — thập phân là việc bridge (phán quyết chung §15.2).

## 7. `first_time_at_x` — nghiệm lượng giác cơ bản, lưới-trước số-sau

Bài: thời điểm ĐẦU TIÊN t > 0 vật qua x = x₀ theo chiều cho trước. Cơ chế hai đường, ghi rõ đường nào vào `checks[]`:

1. **Tỉ số c = x₀/A.** |c| > 1 (quá EPS) ⇒ violation "x₀ ngoài đoạn [−A, A]". |c| = 1 ⇒ trường hợp BIÊN: v = 0 tại đó, `direction` phải là `'any'` (khác ⇒ error "tại biên không có chiều qua"); nghiệm là mốc tới biên.
2. **Đường LƯỚI (exact):** nếu c exact-khớp một giá trị cos của lưới 16 (`{0, ±1/2, ±√2/2, ±√3/2, ±1}` — **theo luật equality-struct §3.2 (OS-3): đối chiếu struct `Exact` từng thành phần; c hữu tỉ vs mốc vô tỉ ±√2/2, ±√3/2 ⇒ mismatch ngay, rơi đường số — KHÔNG dùng cmpScalar vì nhánh khác-radicand của nó là so float EPS 1e-9**) ⇒ θ₀ = arccos(c) ∈ [0, π] là bội exact của π/6 hoặc π/4. Nghiệm: pha ≡ ±θ₀ (mod 2π). Lọc chiều bằng dấu sin: v > 0 ⇔ sin(pha) < 0 ⇔ nhánh **−θ₀**; v < 0 ⇔ nhánh **+θ₀**; `'any'` = min hai nhánh. Với mỗi nhánh: t₀ = divP(subP(nhánh, φ), ω) và t = t₀ + m·T, m nguyên nhỏ nhất cho t > EPS_T — m ước lượng bằng float rồi XÁC NHẬN exact bằng DẤU của PiScalar (dấu của s.num — π > 0 nên dấu PiScalar = dấu s; không so cấu trúc chéo radicand): t > 0 và t − T ≤ 0 ∨ không hợp lệ. Số học: nhánh, φ cùng bậc 1 ⇒ hiệu exact; chia ω bậc 1 ⇒ t hữu tỉ (đề 10π); chia ω bậc 0 ⇒ t bậc 1 (`π/12 s`). Cả hai exact.
3. **Đường SỐ (off-grid, trung thực):** θ₀ = `Math.acos(c_float)`; cùng phép liệt kê nhánh trên float; đáp qua recognize (thường trượt ⇒ thập phân, `approximate:true`). `checks[]` ghi `"first_time: off-grid, đường số"` để người đọc thấy cơ chế.
4. **Quy ước t > 0 nghiêm ngặt** (EPS_T = 1e-9 s): trạng thái ĐẦU trùng (x₀, chiều) không tính là "qua lần đầu" — khớp cách hỏi đề VN; ghi ở §14.4 cho phản biện soát.

## 8. Tự kiểm — thay ngược + bất biến vật lý

**8.1. Auto self-check (luôn chạy, ghi `checks[]`):**

| Đáp | Kiểm |
|---|---|
| x_at | \|x\| ≤ A·(1+1e-9); hệ thức: \|v²(t) + ω²x²(t) − ω²A²\| ≤ EPS_SELF·(ωA)² (float độc lập) |
| v_at / a_at | \|v\| ≤ v_max(1+1e-9); \|a\| ≤ a_max(1+1e-9); a(t) = −ω²·x(t) residual ≤ EPS_SELF·a_max |
| A từ fromState/initial | thay lại: x² + v²/ω² − A² = 0 — EXACT khi các hạng exact, ngược lại ≤ EPS_SELF·A² |
| period/frequency/omega | T·f = 1 và ω = 2πf — exact trên PiScalar (divP/mulP), residual 0 |
| energy | **Wđ + Wt = W: exact khi cùng bậc (subP), ngược lại float ≤ EPS_SELF·W**; 0 ≤ Wđ, Wt ≤ W |
| x_where_energy_ratio | thay lại: Wđ(x*)/Wt(x*) = n exact (hữu tỉ) |
| first_time | \|x(t*) − x₀\| ≤ EPS_SELF·A; dấu v(t*) đúng chiều (bỏ khi biên); **quét minimality**: 2048 mẫu trên (EPS_T, t*), không tồn tại cặp mẫu kề đổi-dấu (x−x₀) với chiều đúng — caveat: chạm TIẾP TUYẾN (x₀=±A) quét sign-change không thấy, trường hợp đó dựa đường giải tích (đã exact), quét chỉ advisory — ghi rõ trong code comment |
| nguồn dư (rate/ampl) | §5.2 — lệch ⇒ `violations` (dịch sai đề), ok:false |

**8.2. Asserts khai báo:** như v0 §7.2 nguyên vẹn (query + equals + tol mặc định TOL_ASSERT=1e-3, override được). **8.3. Ngưỡng:** dùng chung EPS_SELF=1e-6, TOL_ASSERT=1e-3 của v0 (C10) — không đặt hằng mới.

**8.4. Kỷ luật lỗi — pipeline KHÔNG BAO GIỜ throw (OS-2, ĐÃ PHÁN QUYẾT):** mọi suy biến số học phải hoặc bị chặn TỪ ZOD (refine > 0 §4 — vì `divExact` THROW khi mẫu 0: T = 0 lọt qua sẽ nổ xuyên pipeline), hoặc bị guard chặn trước phép chia (A > 0 §5.3; ω null §5.2), hoặc — lưới an toàn cuối — được `runPhysics` bắt (try/catch quanh osc pipeline, DIFF 2 §11) và đổi thành `errors[]` + `ok:false` với message tiếng Việt. Không một Error nào được ném ra tới route/bridge.

## 9. Scene (`oscScene.ts`) + charts

### 9.1. Vật dao động trên trục ngang

Dựng ANIMATE khi model đủ **A, ω VÀ φ**. **φ thiếu ⇒ KHÔNG animate — dựng TĨNH** (points + line quỹ đạo như dưới, agent đậu tại VTCB, KHÔNG timeline; bỏ hẳn phương án "minh họa φ=0 + tag `illustrative:phi0`" — **ĐÃ PHÁN QUYẾT §14.7a**): trục x của geo3d, VTCB tại gốc.

- Points: `O`(0,0,0) "VTCB"; `Bp`(A,0,0) nhãn `"Biên +A"`; `Bm`(−A,0,0) nhãn `"Biên −A"`; Line `Bm–Bp` solid xám (đoạn quỹ đạo). Điểm phụ theo query: `X0`(x₀,0,0) khi có first_time, nhãn trần `"x₀"`. **LABEL TRẦN toàn bộ scene (OS-1 — ĐÃ PHÁN QUYẾT, đồng bộ F8 và đồng bộ chéo với dynamics cùng đợt): KHÔNG nhúng bất kỳ giá trị nào — dù đề cho (A = 4 cm) hay engine tính (đáp first_time) — vào label; mọi giá trị nằm ở `answers[]`.**
- Agent: initialPosition [A·cos φ, 0, 0]; màu/radius theo bảng v0 (radius = max(0.12, 0.02·span), span = 2A).
- **Timeline:** T_phys = max(2T, mọi t trong queries, mọi đáp first_time, 1); quy tắc playback k GIỮ NGUYÊN v0 §8.2 (3–15 s thật thì k=1, ngoài đó D_pb=10, k=T_phys/10 — T=0,2 s ⇒ k=0,1: slow-motion ×10, mắt thấy 5 chu kỳ trong 10 s). Track [0, D_pb], biến t là giây playback:

```jsonc
"params": {
  "equations": { "x": "4*Math.cos(3.14159265*t + 1.04719755)", "y": "0", "z": "0" },
  "path": "x(t) = 4*Math.cos(3.14159265*t + 1.04719755), y(t) = 0, z(t) = 0",
  "landing_point": [2, 0, 0],        // = vị trí tại T_phys — BẮT BUỘC (v0 R2)
  "timeScale": 0.1
}
```

Hệ số trong `Math.cos`: **ω·k** (đổi trục thời gian playback) và **φ**, bake số ≥9 chữ số có nghĩa; tuân 4 ràng buộc cú pháp §2.2. Tags: `['physics','oscillation','timeScale:<k>']` (+ taxonomy do bridge P2 append — v0 §14.5).

### 9.2. Con lắc đơn: scene TĨNH

Đề con lắc đơn trong phạm vi chỉ cho l, g (không biên độ) ⇒ KHÔNG animate được trung thực. Dựng tĩnh: điểm treo `P`(0,0,l), dây `P–M` solid, vật `M`(0,0,0) **label trần ("M" hoặc tên vật từ `scene.labels`) — KHÔNG kèm đáp: chuỗi cũ label "T = 2 s" vi phạm F8, giá trị T nằm ở `answers[]` (OS-1)**. Không timeline. Animate cung tròn (cos lồng — §2.2 xác nhận chạy được) để dành v2 — **ĐÃ PHÁN QUYẾT §14.7b**.

### 9.3. Charts

Kênh `PhysicsResult.charts` như v0 §8.3, hai khác biệt do hàm cos: `x_t` VÀ `v_t` đều **129 mẫu đều** trên [0, T_phys] (v0 cho v_t 2 mẫu vì tuyến tính — cos thì không); `events` = các đáp first_time. Phạm vi lưu-lịch-sử mất charts: nguyên trạng phán quyết D6.

## 10. MƯỜI BÀI CONTRACT — tính tay từng bước (test `osc-contract.test.ts`)

Toàn bộ số dưới đây đã kiểm lại bằng script số học độc lập (Math.cos/PI) + quét minimality cho first_time; các chuỗi exact khớp quy tắc display §3.3. Plan viết theo schema §4; `units: {length:'cm', time:'s'}` trừ khi ghi khác.

---

### O1 — Đọc phương trình + x/v/a tại t (ω = 10π — bài 1)

**Đề:** "Một vật dao động điều hòa x = 4cos(10πt + π/3) (cm). a) Chu kỳ, tần số? b) Li độ tại t = 1/30 s? c) Vận tốc tại t = 1/30 s? d) Gia tốc tại t = 1/30 s (m/s²)?"

```json
{ "op":"oscillator", "name":"vat", "A":4, "omega":{"n":10,"pi":true}, "phi":{"n":1,"d":3,"pi":true} }
```
queries: `period`, `frequency`, `x_at{t:{n:1,d:30}}`, `v_at{t:…}`, `a_at{t:…, unit:"m/s2"}`.

**Tính tay:** T = 2π/(10π) = **1/5 = 0,2 s** (divP: bậc 1−1=0, π triệt tiêu). f = **5 Hz**. Pha(1/30) = 10π/30 + π/3 = 2π/3 (addP cùng bậc, exact). Lưới: cos(2π/3) = −1/2 ⇒ x = 4·(−1/2) = **−2 cm**. sin(2π/3) = √3/2 ⇒ v = −4·10π·√3/2 = **−20π√3 cm/s ≈ −108,8280** ({s:−20√3, k:1} — exact NHỜ PiScalar, recognize không cứu được dạng này §2.1). a = −ω²x = −100π²·(−2) = 200π² cm/s² → unit m/s²: ×1/100 = **2π² m/s² ≈ 19,7392** (k=2). Tự kiểm: v²+ω²x² = 1200π²+400π² = 1600π² = (40π)² = (ωA)² ✓ exact; a = −ω²x ✓; |x|=2≤4 ✓.

---

### O2 — Dạng sin → cos, vmax/amax/pha đầu (ω = 10π — bài 2)

**Đề:** "x = 5sin(10πt) (cm). a) Tốc độ cực đại? b) Gia tốc cực đại (m/s²)? c) Pha ban đầu (dạng cos)? d) Li độ tại t = 0,05 s?"

```json
{ "op":"oscillator", "name":"vat", "A":5, "omega":{"n":10,"pi":true}, "phi":{"n":0}, "form":"sin" }
```
queries: `vmax`, `amax{unit:"m/s2"}`, `initial_phase`, `x_at{t:0.05}`.

**Tính tay:** form sin ⇒ engine φ = 0 − π/2 = **−π/2** (đáp c, "−π/2 rad", chuẩn hóa (−π,π] giữ nguyên). vmax = 5·10π = **50π cm/s ≈ 157,0796**. amax = 5·(10π)² = 500π² cm/s² → **5π² m/s² ≈ 49,3480**. Pha(0,05) = 10π·1/20 − π/2 = π/2 − π/2 = 0 ⇒ x = 5cos0 = **5 cm** (đúng biên dương — 0,05 hữu hạn thập phân ⇒ 1/20 exact).

---

### O3 — Con lắc lò xo: m, k + thả nhẹ (initial)

**Đề:** "Lò xo k = 100 N/m gắn vật m = 250 g, dao động điều hòa theo phương ngang. Kéo vật khỏi VTCB 4 cm rồi thả nhẹ. a) ω? b) Chu kỳ? c) Biên độ? d) Tốc độ cực đại?"

```json
{ "op":"oscillator", "name":"vat", "spring":{"k":100}, "mass":250, "massUnit":"g",
  "initial":{"x0":4, "v0":0} }
```
queries: `omega`, `period`, `amplitude`, `vmax`.

**Tính tay:** m = 250/1000 = 1/4 kg (exact). ω = √(k/m) = √400 = **20 rad/s** (sqrtExact 400 → 20, k=0). T = 2π/20 = **π/10 s ≈ 0,3142** ({1/10, k:1}). initial: A = √(4² + 0²) = **4 cm**; φ: cos φ=1, sin φ=0 ⇒ φ=0 (không query, dùng cho scene). vmax = 4·20 = **80 cm/s** (hữu tỉ thuần).

---

### O4 — Con lắc đơn: g = π² VÀ g = 9,8 (hai đường cùng bài) + lUnit

**Đề:** "a) Con lắc đơn l = 1 m tại nơi g = π² m/s²: chu kỳ? b) Cũng nơi đó, con lắc l' = 25 cm: chu kỳ? c) Con lắc l = 1 m tại nơi g = 9,8 m/s²: chu kỳ? d) Tần số của con lắc câu a?"

```json
"ops":[
 { "op":"oscillator","name":"cl1","pendulum":{"l":1,"gAsPiSquared":true} },
 { "op":"oscillator","name":"cl2","pendulum":{"l":25,"lUnit":"cm","gAsPiSquared":true} },
 { "op":"oscillator","name":"cl3","pendulum":{"l":1,"g":9.8} } ]
```
queries: `period{of:cl1}`, `period{of:cl2}`, `period{of:cl3}`, `frequency{of:cl1}`.

**Tính tay:** cl1: g = {1, k:2} ⇒ l/g = {1, k:−2} ⇒ √ = {1, k:−1} ⇒ T = 2π·π⁻¹ = **2 s EXACT** (π triệt tiêu bằng đại số §5.4; float ref 2π√(1/9,8696…) = 2,0000 ✓). cl2: l = 25 cm → 1/4 m ⇒ T = 2√(1/4) = **1 s**. cl3: l/g = 1/(49/5) = 5/49 ⇒ √ = √5/7 ⇒ T = **2π√5/7 s ≈ 2,0071** ({2√5/7, k:1} — exact nhờ PiScalar; recognize trượt dạng này §2.1). f(cl1) = 1/T = **1/2 Hz = 0,5 Hz**. Kiểm T·f = 1 exact ✓.

---

### O5 — ω/f từ đếm dao động + A từ chiều dài quỹ đạo

**Đề:** "Một vật dao động điều hòa: trong 10 s thực hiện đúng 20 dao động toàn phần; chiều dài quỹ đạo 12 cm. a) Tần số? b) ω? c) Biên độ?"

```json
{ "op":"oscillator", "name":"vat", "count":{"n":20,"dt":10}, "L":12 }
```
queries: `frequency`, `omega`, `amplitude`.

**Tính tay:** f = 20/10 = **2 Hz** (exact). ω = 2πf = **4π rad/s ≈ 12,5664** ({4, k:1}). A = L/2 = **6 cm**. (Engine chia — LLM chỉ chép 20, 10, 12.)

---

### O6 — Hệ thức độc lập (đề cho T = 0,2π s — π ở INPUT)

**Đề:** "Một vật dao động điều hòa với chu kỳ T = 0,2π s. Khi vật qua li độ x = 3 cm thì tốc độ 40 cm/s. a) Biên độ? b) Tốc độ khi qua li độ 4 cm? c) Vật có tốc độ 30 cm/s tại li độ nào? d) Tốc độ cực đại?"

```json
{ "op":"oscillator", "name":"vat", "T":{"n":0.2,"pi":true}, "fromState":{"x":3,"v":40} }
```
queries: `amplitude`, `speed_at_x{x:4}`, `x_at_speed{v:30}`, `vmax`.

**Tính tay:** T = {1/5, k:1} ⇒ ω = 2π/T = divP({2,1},{1/5,1}) = **10 rad/s** (bậc 1−1=0 — π vào rồi triệt tiêu). A = √(3² + (40/10)²) = √(9+16) = √25 = **5 cm** (sqrtExact). |v|(x=4) = 10·√(25−16) = **30 cm/s**. |x|(v=30) = √(25 − 9) = **4 cm** (soi gương câu b — cùng cặp (3,4,5), tự đối chiếu chéo). vmax = 5·10 = **50 cm/s**. Tự kiểm fromState: 3² + 40²/10² = 25 = A² exact, residual 0 ✓.

---

### O7 — Năng lượng qua k (không cần m, không cần ω)

**Đề:** "Con lắc lò xo k = 100 N/m dao động điều hòa với biên độ 4 cm. a) Cơ năng? b) Thế năng tại li độ 2 cm? c) Động năng tại li độ 2 cm? d) Tại li độ nào động năng bằng 3 lần thế năng?"

```json
{ "op":"oscillator", "name":"vat", "spring":{"k":100}, "A":4 }
```
queries: `energy_total`, `energy_potential_at{at:{x:2}}`, `energy_kinetic_at{at:{x:2}}`, `x_where_energy_ratio{ratio:3}`.

**Tính tay:** A = 4 cm → 1/25 m (đổi exact ×1/100). W = ½·100·(1/25)² = 50/625 = **2/25 J = 0,08 J** (rate KHÔNG cần — model.omega = null hợp lệ, chỉ query năng lượng). x = 2 cm → 1/50 m: Wt = 50·(1/50)² = **1/50 J = 0,02 J**. Wđ = 2/25 − 1/50 = 4/50 − 1/50 = **3/50 J = 0,06 J** (sub exact). Wđ = 3Wt ⇒ |x| = A/√4 = **2 cm** — trùng khớp câu b/c (Wđ/Wt = 0,06/0,02 = 3 ✓ tự kiểm exact). Bảo toàn: 0,02 + 0,06 = 0,08 = W ✓ exact.

---

### O8 — Năng lượng qua m, ω = 4π (π² sống xuyên suốt) + Wđ tại t

**Đề:** "Vật m = 200 g dao động điều hòa x = 5cos(4πt) (cm). a) Cơ năng? b) Tốc độ cực đại (cm/s)? c) Động năng tại t = 1/24 s?"

```json
{ "op":"oscillator", "name":"vat", "mass":200, "massUnit":"g", "A":5,
  "omega":{"n":4,"pi":true}, "phi":{"n":0} }
```
queries: `energy_total`, `vmax`, `energy_kinetic_at{at:{t:{"n":1,"d":24}}}`.

**Tính tay:** m = 1/5 kg; A = 5 cm → 1/20 m. W = ½·(1/5)·(4π)²·(1/20)² = (1/10)·16π²·(1/400) = **π²/250 J ≈ 0,0395** ({1/250, k:2}). vmax = 5·4π = **20π cm/s ≈ 62,8319** — đúng mẫu "20π cm/s" của quy ước hệ số-π. Pha(1/24) = 4π/24 = π/6 (lưới) ⇒ cos = √3/2 ⇒ x = 5√3/2 cm → √3/40 m; x² = 3/1600 (mulExact gộp radicand 3·3 → hữu tỉ); Wt = (1/10)·16π²·(3/1600) = **3π²/1000 J**; Wđ = π²/250 − 3π²/1000 = 4π²/1000 − 3π²/1000 = **π²/1000 J ≈ 0,0099** (subP CÙNG bậc 2 ⇒ exact). Bảo toàn: Wđ + Wt = 4π²/1000 = W ✓ EXACT trên PiScalar — đây là contract cho "năng lượng bảo toàn exact khi được". (Đề VN hay kèm "lấy π² = 10" để chấm 0,04 J — engine KHÔNG fudge: trả π²/250 và approx 0,0395; **ĐÃ PHÁN QUYẾT §14.6: engine trung thực, trình bày xấp xỉ "≈ 0,04 nếu lấy π² = 10" là việc lời giải LLM.**)

---

### O9 — Thời điểm đầu tiên qua x₀ theo chiều (đường LƯỚI, ω = 10π)

**Đề:** "x = 4cos(10πt + π/3) (cm). a) Thời điểm đầu tiên vật qua x = −2 cm? b) Thời điểm đầu tiên vật qua x = −2 cm theo chiều dương? c) Thời điểm đầu tiên vật qua VTCB?"

```json
queries: [ {"kind":"first_time_at_x","of":"vat","x":-2,"direction":"any"},
           {"kind":"first_time_at_x","of":"vat","x":-2,"direction":"positive"},
           {"kind":"first_time_at_x","of":"vat","x":0,"direction":"any"} ]
```

**Tính tay:** c = −2/4 = −1/2 (lưới) ⇒ θ₀ = 2π/3. Nhánh +θ₀ (chiều âm): 10πt + π/3 = 2π/3 + 2kπ ⇒ t = 1/30 + k/5 ⇒ min **1/30 s ≈ 0,0333** (kiểm: pha = 2π/3, x = −2 ✓, sin > 0 ⇒ v < 0, chiều âm). Nhánh −θ₀ (chiều dương): 10πt + π/3 = −2π/3 + 2kπ ⇒ t = −1/10 + k/5 ⇒ min dương **1/10 s = 0,1 s** (pha = 4π/3, cos = −1/2 ✓, sin = −√3/2 < 0 ⇒ v > 0 ✓). a) any = min(1/30, 1/10) = **1/30 s**; b) **1/10 s**. c) x₀ = 0 ⇒ θ₀ = π/2; nhánh +: t = 1/60 + k/5; nhánh −: t = −1/12 + k/5 ⇒ 7/60; min = **1/60 s ≈ 0,0167** (sanity: từ pha π/3 quay thêm π/6 tới π/2, Δt = (π/6)/(10π) = 1/60 ✓). Cả ba HỮU TỈ EXACT (ω bậc 1 chia triệt π). Quét minimality 2048 mẫu: không nghiệm sớm hơn ✓ (đã chạy thử với 200 000 mẫu khi soạn spec).

---

### O10 — ω không-π: đáp thời gian DẠNG π + nhánh off-grid trung thực

**Đề:** "x = 5cos(2t + π/6) (cm) (t bằng giây). a) Chu kỳ? b) Li độ tại t = 1 s? c) Thời điểm đầu tiên vật qua li độ 2,5 cm?"

```json
{ "op":"oscillator", "name":"vat", "A":5, "omega":2, "phi":{"n":1,"d":6,"pi":true} }
queries: [ {"kind":"period"}, {"kind":"x_at","t":1}, {"kind":"first_time_at_x","x":2.5,"direction":"any"} ]
```

**Tính tay:** a) T = 2π/2 = **π s ≈ 3,1416** ({1, k:1}). b) Pha(1) = 2·1 + π/6 — **bậc 0 cộng bậc 1 ⇒ addP collapse ⇒ float** 2,5236 rad; cos ≈ −0,81504 ⇒ x ≈ **−4,0752 cm**; recognize(−4,0752…) trả null (đã chạy code thật §2.1) ⇒ **approximate:true** — contract cho nhánh fallback trung thực. c) c = 2,5/5 = 1/2 (lưới — 2.5 thập phân hữu hạn ⇒ exact) ⇒ θ₀ = π/3. Nhánh +: 2t = π/3 − π/6 + 2kπ ⇒ t = π/12 + kπ ⇒ **π/12 s ≈ 0,2618** ({1/12, k:1} — ω bậc 0 ⇒ t mang π, hiếm nhưng đề VN có); nhánh −: t = −π/4 + kπ ⇒ 3π/4 > π/12. Kiểm: pha(π/12) = π/6 + π/6 = π/3, cos = 1/2 ⇒ x = 2,5 ✓; quét minimality ✓.

---

### Bảng tổng hợp 10 bài

| # | Dạng | Đáp chốt (text engine · approx) |
|---|---|---|
| O1 | Đọc pt, x/v/a tại t (10π) | 1/5 s; 5 Hz; −2 cm; **−20π√3 cm/s** ≈ −108,8280; **2π² m/s²** ≈ 19,7392 |
| O2 | sin→cos, cực đại (10π) | 50π cm/s ≈ 157,0796; 5π² m/s² ≈ 49,3480; −π/2 rad; 5 cm |
| O3 | Lò xo m,k + thả nhẹ | 20 rad/s; **π/10 s** ≈ 0,3142; 4 cm; 80 cm/s |
| O4 | Con lắc đơn g=π² & g=9,8 | **2 s** (exact, π triệt tiêu); 1 s; **2π√5/7 s** ≈ 2,0071; 0,5 Hz |
| O5 | Đếm dao động + L | 2 Hz; 4π rad/s ≈ 12,5664; 6 cm |
| O6 | Hệ thức độc lập (T=0,2π) | 5 cm; 30 cm/s; 4 cm; 50 cm/s |
| O7 | Năng lượng qua k | 2/25 J; 1/50 J; 3/50 J; 2 cm |
| O8 | Năng lượng qua m, ω=4π | **π²/250 J** ≈ 0,0395; 20π cm/s ≈ 62,8319; **π²/1000 J** ≈ 0,0099 |
| O9 | First-time lưới (10π) | 1/30 s; 1/10 s; 1/60 s (đều hữu tỉ exact) |
| O10 | ω=2: đáp π + off-grid | π s ≈ 3,1416; ≈ −4,0752 cm (approximate:true); π/12 s ≈ 0,2618 |

Phủ queries: 17/17 (mỗi kind xuất hiện ≥1 lần); phủ nguồn rate {omega, T, count, spring+mass, pendulum×2}, nguồn ampl {A, L, fromState, initial}, đơn vị {massUnit g, lUnit cm, unit override m/s², đổi cm→m trong năng lượng}, nhánh exact {hữu tỉ, một căn, π, π·căn, π²} và nhánh float trung thực (O10b). Nguồn `f` trực tiếp và `pathPerPeriod`, `vmaxGiven`: phủ ở unit test (cùng đường normalize), không tốn bài contract.

## 11. Cấu trúc file & ranh giới

```
api/_lib/kernel/physics/
  planSchema.ts      (v0) ← DIFF 1 — kê TRUNG THỰC từng dòng (OS-4, thay câu cũ "2 dòng" kê THIẾU):
                       (a) import OscillatorOp, OscQuerySchema từ './oscSchema';
                       (b) thêm OscillatorOp vào union op + 17 query osc vào union query (2 dòng);
                       (c) refine CẤP PLAN: plan có op 'oscillator' ⇒ units.time = 's';
                       (d) refine CẤP PLAN: plan có op 'oscillator' ⇒ units.length ∈ {'m','cm'};
                       (e) superRefine CẤM TRỘN op 'oscillator' với op động học (mover1d…) trong CÙNG plan v1
                           — không cấm thì plan trộn + units.length='cm' làm qty* của kinematics THROW (OS-4);
                       ⇒ (c)–(e) là LOGIC MỚI trong planSchema v0 (không phải câu refine có sẵn): review diff
                         + test planSchema v0 phải chạy kèm, ước ~15–20 dòng chứ không phải 2.
  runPhysics.ts      (v0) ← DIFF 2: dispatch op 'oscillator' → osc pipeline; T_phys góp thêm "2T" khi có osc;
                       try/catch quanh osc pipeline đổi mọi Error còn lọt thành errors[] — KHÔNG throw ra route (§8.4, OS-2);
                       query osc trỏ op động học (hoặc ngược lại) ⇒ error tường minh "nhầm loại op" (§5.2, OS-6).
  kinematics.ts  compute.ts  scene.ts   (v0 — KHÔNG đụng)
  oscSchema.ts       MỚI — §4
  piScalar.ts        MỚI — §3 (PiScalar + EXACT_COS vòng tròn + displayPiScalar + certifyPiScalar)
  oscillation.ts     MỚI — §5 thuần: toPiScalar, resolve op→OscModel, evalX/V/A, năng lượng, firstTimeAtX
  oscCompute.ts      MỚI — §6–§8: query → công thức đóng + certify + tự kiểm
  oscScene.ts        MỚI — §9
  __tests__/piScalar.test.ts  oscillation.test.ts  oscCompute.test.ts  oscScene.test.ts  osc-contract.test.ts
```

- **Import được phép:** `../scalar`, `../analysis/recognize`, `../compute/answer` (certifyScalar/cmpScalar), `zod`, `import type` geometry — đúng danh mục C2; KHÔNG cần solver1d.
- **Nếu v0 thi công TRƯỚC:** hai DIFF trên là toàn bộ điểm chạm (thuần cộng nhánh + refine mới kê ở DIFF 1, không đổi hành vi kinematics với plan thuần động học — test v0 phải xanh nguyên). **Nếu thi công CHUNG đợt:** union + refine viết thẳng một lần, không có diff.
- **Chép nhắc điều kiện F1 (OS-6, mirror spec dc-circuit §14):** wiring P2 (bridge/route/prompt/few-shot) ngoài phạm vi spec này, nhưng **route nối osc PHẢI có quota** — ghi lại tại đây để điều kiện không rơi mất khi tích hợp.
- Ràng buộc cứng kế thừa v0 §4 nguyên vẹn: không sửa `run.ts`/`index.ts` gốc/`src/**`; chưa nối kernel-dist (wiring là P2); baseline test hiện có chỉ được CỘNG (~55–60 test mới ước tính: piScalar ≈15, oscillation ≈20, oscCompute ≈12, scene ≈5, contract 10 bài ≈ 25–30 assert).
- Nghi thức kiểm F9: chạy thêm typecheck qua `tsconfig.kernel.json` (đang được vòng sửa v0 bổ sung).

## 12. Taxonomy tags đề xuất (cho registry P0, bridge P2 gắn — v0 §14.5)

8 tag 4 tầng, khớp regex `^[a-z0-9-]+(\/[a-z0-9-]+){3}$`, grade 11 theo GDPT 2018 (C4):

`ly/11/dao-dong/doc-phuong-trinh` · `ly/11/dao-dong/li-do-van-toc-gia-toc` · `ly/11/dao-dong/chu-ky-tan-so` · `ly/11/dao-dong/con-lac-lo-xo` · `ly/11/dao-dong/con-lac-don` · `ly/11/dao-dong/he-thuc-doc-lap` · `ly/11/dao-dong/nang-luong` · `ly/11/dao-dong/thoi-diem-qua-vi-tri`

## 13. NGOÀI phạm vi v1 (ghi rõ, có chủ đích)

- **Tổng hợp hai dao động** (cần cộng vectơ quay/biên độ tổng — chương riêng), **đồ thị pha / vòng tròn lượng giác như công cụ giải** (engine giải đại số trực tiếp), **quãng đường lớn nhất–nhỏ nhất trong Δt**, quãng đường đi được trong Δt bất kỳ, số lần qua vị trí trong Δt.
- **Con lắc trong thang máy / điện trường / lực lạ** (g hiệu dụng); **lực đàn hồi – lực hồi phục max/min, con lắc lò xo treo thẳng đứng có Δl₀** (cần mô hình lực, để pack động lực học).
- Đề cho **vmax VÀ amax đồng thời suy ω, A** (ω = amax/vmax); **hai trạng thái (x₁,v₁,x₂,v₂) suy ω, A**; `phase_at{t}`; vận tốc/thời gian trung bình — đều closed-form dễ thêm, chờ v2 sau phản biện (§14.8).
- Đề cho A âm / dạng x = A·cos²(…) / hàm không điều hòa ⇒ schema reject, error rõ (không dịch ép).
- Chart UI frontend, wiring route/bridge/prompt (P2), con lắc đơn animate cung tròn (§14.7).

## 14. Điểm phân vân — ĐÃ PHÁN QUYẾT TOÀN BỘ (phản biện đợt 2, 22/08)

Mười điểm giữ nguyên văn câu hỏi gốc (trace), mỗi điểm ghi phán quyết tại chỗ. Nguồn: `../reviews/2026-08-21-wave2-specs-review.md` §Findings OSCILLATION — không mở lại tranh luận.

1. **Hai quy ước đơn vị trong một pack:** kinematics v0 "hệ nhất quán, không đổi"; osc "đổi exact tại công thức SI" (§5.1). Bất khả kháng về vật lý (J = kg·m²/s²), nhưng hai triết lý song song trong cùng planSchema — phản biện xác nhận chấp nhận, hay ép v0 cũng chuyển per-quantity toàn phần cho đồng nhất?
   **ĐÃ PHÁN QUYẾT: CHẤP NHẬN per-quantity cho osc** (v0 thực tế đã per-quantity một phần); KHÔNG ép v0 đổi.
2. **PiRat {n,d,pi} vs khai độ:** đã chọn phân số literal (§3.1) vì "chép nguyên văn 2π/3" ít lỗi hơn LLM đổi 2π/3→120°. Nhược: schema hơi lạ mắt với few-shot.
   **ĐÃ PHÁN QUYẾT: GIỮ PiRat**; few-shot P2 BẮT BUỘC có ví dụ pha PHÂN SỐ (vd "2π/3" → `{n:2, d:3, pi:true}`).
3. **Mở rộng recognize (TÙY CHỌN):** thêm 2 nhánh `(p/q)·π²` và `(p/q)·√b·π` (chèn sau nhánh 4, cùng reconstruct-check 1e-10 — quét √b·π: 78 radicand × asRational ≤64, chi phí nhỏ; đã kiểm không khớp-giả với hữu tỉ den≤200 vì π vô tỉ "đủ xa"). KHÔNG bắt buộc cho v1 vì PiScalar giữ exact thượng nguồn.
   **ĐÃ PHÁN QUYẾT: KHÔNG mở rộng recognize ở v1** — PiScalar là đường chính (phản biện đã chạy máy xác nhận recognize không nhận π², √b·π, k/π và PiScalar là cần thiết); giữ nguyên `recognize.ts`, không đụng ranh giới "chỉ thêm file".
4. **Quy ước first_time t > 0 nghiêm ngặt** (§7.4): trạng thái đầu trùng đích không tính.
   **ĐÃ PHÁN QUYẾT: GIỮ t > 0 nghiêm ngặt** — khớp cách hỏi đề VN.
5. **gAsPiSquared + asserts của đề:** đề "g=10, π²=10" khai gAsPiSquared ⇒ g.approx = 9,8696; dữ kiện dư tính theo g=10 số học thuần có thể lệch ~1,3% > TOL_ASSERT 1e-3 ⇒ violation oan.
   **ĐÃ PHÁN QUYẾT: prompt P2 hướng dẫn override `tol: 0.02` cho asserts trong plan gAsPiSquared; ENGINE KHÔNG TỰ NỚI tol** (giữ TOL_ASSERT chuẩn cho mọi plan khác) — đã ghi vào §5.4.
6. **Hiển thị π² cho đáp "sách lấy π²=10":** O8 trả `π²/250 J ≈ 0,0395` trong khi đáp án sách in `0,04 J`.
   **ĐÃ PHÁN QUYẾT: engine TRUNG THỰC (không field `noteIfPiSq10`, không in số theo quy ước gần đúng)** — trình bày "≈ 0,04 nếu lấy π² = 10" là việc lời giải LLM (đã ghi vào O8).
7. **Scene:** (a) φ thiếu → animate minh họa φ=0? (b) Con lắc đơn animate cung tròn ngay v1?
   **ĐÃ PHÁN QUYẾT: (a) φ thiếu ⇒ KHÔNG animate — dựng TĨNH (bỏ phương án minh họa φ=0 + tag illustrative, đã sửa §9.1); (b) con lắc đơn animate cung tròn để V2 (giữ scene tĩnh §9.2)** — không đưa vào hình số liệu không có trong đề.
8. **Ranh giới dạng bài §13 dòng 3** (vmax+amax→ω; hai trạng thái→ω): rất phổ biến trong đề thi, closed-form ngắn. Kéo vào v1 luôn?
   **ĐÃ PHÁN QUYẾT: GIỮ NGOÀI v1** — kỷ luật "thà ít mà đúng", chống phình phạm vi; few-shot abstain ở P2.
9. **|k| ≤ 2 của PiScalar** (§3): có nên đặt trần 3 ngay từ đầu?
   **ĐÃ PHÁN QUYẾT: GIỮ TRẦN |k| ≤ 2** (YAGNI — pack sau cần thì nâng hằng).
10. **`x_at_speed`/`speed_at_x` trả GIÁ TRỊ DƯƠNG** (độ lớn) còn `v_at`/`a_at` trả đại số — text answer ghi "±4 cm" hay "4 cm"?
   **ĐÃ PHÁN QUYẾT: GIỮ trả MỘT số dương (độ lớn)** — text engine "4 cm" + ngữ nghĩa query "độ lớn li độ"; trình bày "x = ±4 cm" (hai vị trí đối xứng) là việc lời giải LLM, cùng tinh thần phán quyết chung §15.2.

## 15. Phán quyết chung đợt 2 (áp cho CẢ BA spec: dynamics · oscillation · dc-circuit)

Ba luật chung ĐÃ DUYỆT tại `../reviews/2026-08-21-wave2-specs-review.md` (Kết luận):

1. **Label trần:** scene KHÔNG nhúng giá trị engine tính vào bất kỳ label nào (đồng bộ F8) — mọi giá trị nằm ở `answers[]`. *Spec này là nơi vi phạm bị phát hiện (OS-1: "Biên +A (4 cm)", "T = 2 s") — đã sửa §9.1/§9.2 về label trần.*
2. **Exact-first, thập phân ở bridge:** engine giữ text exact ("1/5 s", "π/12 s", "2/25 J"); mọi formatter thập phân kiểu VN ("0,2 s", "0,08 J") là việc tầng bridge/UI lúc wiring — engine KHÔNG in số theo quy ước trình bày (cùng gốc với §14.6, §14.10). *Chú thích "= 0,2 s" trong lời tính tay §10 chỉ là đối chiếu ≈ cho người đọc, không phải text engine.*
3. **Chính tả field query theo v0:** field dùng chung viết đúng chính tả planSchema v0 — `value`/`vUnit`/`component`. *Queries osc đã đúng chính tả: giá trị vào kèm đơn vị dùng `vUnit` (`x_at_speed{v, vUnit}`), `unit` chỉ cho đơn vị ĐẦU RA (§4); dynamics đổi theo ở DY-3.*

## 16. Changelog phản biện (22/08)

Áp trọn kết luận `../reviews/2026-08-21-wave2-specs-review.md` (mọi finding + phán quyết ĐÃ DUYỆT). Không đổi bất kỳ giá trị số/đáp nào của 10 bài contract O1–O10 (phản biện xác nhận 31/31 số đúng toàn đợt) — chỉ sửa thiết kế/khai báo/mô tả.

| Finding / phán quyết | Vị trí sửa trong spec |
|---|---|
| OS-1 (chặn) — label trần, giá trị về answers[] | §9.1 (Bp/Bm/X0 label trần + luật in đậm), §9.2 (vật M label trần), §15.1 |
| OS-2 (chặn) — refine > 0 sau quy đổi; không bao giờ throw | §4 (khối "Refine của op oscillator"), §5.3 (guard đi kèm), §8.4 (kỷ luật lỗi), §11 DIFF 2 (try/catch) |
| OS-3 — so-exact bằng equality struct, bỏ câu "không snap float" | §3.2 (luật so-exact — nơi định nghĩa), §5.3, §7 bước 2 (cả xác nhận m bằng dấu PiScalar thay cmpScalar) |
| OS-4 (chặn) — kê DIFF trung thực + cấm trộn op | Đầu file (Phạm vi), §4 (ràng buộc cấp plan 1–3), §11 DIFF 1 (a)–(e) |
| OS-5 — guard A > 0 | §4 (refine initial {0,0}), §5.3 (guard trước khi tính φ) |
| OS-6 (thấp) — dẫn chiếu, x_at_speed v ≥ 0, error nhầm loại op, formatter, quota F1 | §3.4 (dẫn chiếu → bảng unit §6), §6 (bảng unit mới + dòng x_at_speed), §4 (`v: Num.min(0)`), §5.2 (error "nhầm loại op"), §11 (chép nhắc F1), §15.2 (formatter) |
| EXACT_COS 16 điểm | §3.2 — 1 dòng phán quyết chính thức "mở rộng C8 HỢP LỆ" |
| 10 phán quyết §14 | Ghi "ĐÃ PHÁN QUYẾT" từng điểm tại §14.1–§14.10; áp vào thân bài: §2.1 (3), §5.4 (5), O8 (6), §9.1 (7a), §9.2 (7b) |
| Phán quyết chung (a)(b)(c) | §15 (+ các mục nó trỏ tới) |

---

*Spec này ĐÃ qua phản biện đợt 2 (22/08) — kết luận tại `../reviews/2026-08-21-wave2-specs-review.md`, toàn bộ phán quyết đã áp. Mọi khẳng định về hành vi code có sẵn (recognize, AnimatedAgent, scalar/certify) đều đã kiểm bằng cách đọc + chạy code thật ngày 21/08/2026 và được phản biện chạy lại độc lập; mọi con số trong 10 bài contract đã kiểm hai vòng bằng script số học độc lập (kể cả quét minimality first-time) — không sai một số nào.*
