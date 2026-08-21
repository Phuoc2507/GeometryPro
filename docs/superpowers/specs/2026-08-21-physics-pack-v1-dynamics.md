# Physics Pack v1 — Động lực học lớp 10 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-21
**Trạng thái:** Chờ phản biện spec (chưa thi công)
**Phạm vi:** Mở rộng physics pack sang chương **ĐỘNG LỰC HỌC** chất điểm lớp 10. Chỉ CỘNG THÊM file mới vào `api/_lib/kernel/physics/**` + test. KHÔNG sửa bất kỳ file nào có sẵn — kể cả các file v0 (`planSchema.ts`, `kinematics.ts`, `compute.ts`, `scene.ts`, `runPhysics.ts`) đang được thi công song song theo plan P1.

**Lưu ý tên gọi:** "v1" trong tài liệu này là **phiên bản NỘI DUNG pack** (chương mới — động lực học), KHÔNG phải phase "nối dây v1/P2" của rollout (bridge/route/prompt). Nối dây cho dynamics vẫn là việc của phase tích hợp sau.

---

## 1. Mục tiêu (một câu)

Giữ đúng nguyên tắc geo3d (MERGE-BRIEF): **LLM chỉ DỊCH đề → DynamicsPlan JSON (khai báo vật, mặt tựa, hệ số ma sát, các lực ĐỀ CHO); ENGINE tất định GIẢI hệ Newton bằng công thức đóng trên Scalar (exact-first), TỰ KIỂM bằng thay-ngược từng vật + ràng buộc vật lý (N ≥ 0, dây căng, thắng ma sát nghỉ), rồi BÀN GIAO gia tốc sang tầng động học v0 để trả tiếp quãng đường/vận tốc/thời gian và xuất scene animate.** Mô hình không thỏa đề (vật không trượt, phản lực âm, dây chùng) ⇒ **violation, không bịa đáp**.

## 2. Tuân thủ báo cáo phản biện phiên 1 (ràng buộc)

Mọi quy ước trong `docs/superpowers/reviews/2026-08-21-arch-physics-review-phien1.md` là RÀNG BUỘC của spec này:

| Ràng buộc đã duyệt | Spec này đáp ứng thế nào |
|---|---|
| **F2/D1 — unit per-quantity, engine đổi đơn vị bằng hữu tỉ exact, LLM chỉ chép** | Mọi đại lượng có unit riêng: `massUnit` (kg/g/tan), `unit` của lực (N/kN), `v0Unit`/`velocityUnit` (m/s ↔ km/h ×5/18). Engine đổi tại parse bằng `rat()` — ×5/18, ×1000, ×1/1000 đều exact (§6.3). Nội bộ + đầu ra cố định SI. |
| **C8/F11 — EXACT_TRIG = {0, ±30, ±45, ±60, ±90}** | Tái dùng bảng EXACT_TRIG của v0. Góc nghiêng θ ∈ (0°, 90°); góc lực xiên α cho phép ÂM (đẩy chếch xuống: sin(−30°) = −1/2 exact ⇒ N = mg + F/2 tự nhiên từ một công thức, §7.3). Góc lẻ (37°, 53°) → float + recognize, không CAS. |
| **F8 — scene v0 tối giản, KHÔNG label kèm giá trị** | Scene v1 dynamics theo đúng mức plan: điểm mốc label rỗng hoặc tên ngắn ("A", tên vật), TUYỆT ĐỐI không nhúng giá trị đã tính vào label (§10). |
| **F9 — Curve3D bắt buộc `params`** | Dynamics v1 **không cần Curve3D** (mọi quỹ đạo là đường thẳng): mặt nghiêng/mặt bàn/dây vẽ bằng `Point3D` (label rỗng) + `Line3D` — schema Line3D không có field params (đã đọc `src/types/geometry.ts:20`). Nếu bản thi công vẫn chọn Curve3D cho đoạn nào đó thì BẮT BUỘC phát `params: {}`. |
| **C6 — mọi query trả MỘT số + `unit` do engine ghi** | Toàn bộ 10 kind query (§6.2) trả đúng một số; engine gắn unit SI: m/s², N, m/s, m, s (§9.4). |
| **Tag 4 tầng `ly/10/dong-luc-hoc/<skill>`** | Đề xuất seed registry §11; gắn tag là việc bridge (như phán quyết v0 §14.5) — scene v1 chỉ giữ chỗ `tags`. |
| **C10/F6 — tol hai tầng** | Tái dùng nguyên hằng của v0: EPS_SELF = 1e-6 (thay-ngược), TOL_ASSERT = 1e-3 (dữ kiện dư của đề) (§9.3). |
| **F3 — có `time_when_velocity`** | Kế thừa query này ở tầng động học bàn giao (bài "sau bao lâu thì dừng/đạt v") (§8). |
| **Triết lý MERGE-BRIEF** | LLM không có chỗ nộp hợp lực/thành phần lực (schema không nhận f_x, f_y, netForce, mg·sinθ); mô hình sai đề ⇒ violation (§4, §9). |

## 3. Phạm vi dạng bài

### 3.1. TRONG phạm vi v1 (chọn kỹ — thà ít mà đúng)

| Dạng bài | Mô tả plan | Query chính |
|---|---|---|
| Định luật II Newton một trục | 1 `body` ngang + n `force` cùng phương (forward/backward) | `acceleration`, `force_value(net)` + động học |
| Trọng lực + phản lực trên mặt ngang | `body` + `g` | `normal_force`, `force_value(weight)` |
| Ma sát trượt mặt ngang | `body{mu}` + `force` | `force_value(friction)`, `acceleration` |
| Hãm/trượt chậm dần do ma sát (v0 ≠ 0, không lực kéo) | `body{mu, v0}` | `acceleration`, `distance_to_stop`, `time_when_velocity` |
| Mặt phẳng nghiêng (trượt xuống / được truyền v0 lên) | `body{on:'incline', inclineDeg, mu?, motion}` | `acceleration`, `normal_force`, `force_value(friction)` + động học |
| Kéo vật bằng lực xiên góc trên mặt ngang (chiếu 2 trục) | `force{angleDeg}` (α âm = đẩy chếch xuống) | `normal_force`, `force_value(friction)`, `acceleration` |
| Hệ 2 vật + dây không giãn qua ròng rọc cố định (bỏ khối lượng dây/ròng rọc) — đúng 2 cấu hình: **treo + treo (Atwood)** và **bàn ngang + treo (ròng rọc mép bàn)** | 2 `body` + 1 `string` | `acceleration`, `force_value(tension)` |
| Lực kéo tối thiểu để bắt đầu trượt (mặt ngang) | query `min_force_to_move` | 1 số N |
| Nối động học: tính a từ lực rồi hỏi s, v, t | queries động học kế thừa (§8) | `position_at`, `velocity_at`, `time_when`, `time_when_velocity`, `velocity_after_distance`, `distance_to_stop` |

### 3.2. NGOÀI phạm vi v1 (ghi rõ, có chủ đích)

- **Lực đàn hồi / lò xo**, **chuyển động tròn / lực hướng tâm**, **momen / cân bằng vật rắn**, **vật trên vật** (ma sát giữa hai vật chồng lên nhau) — theo đúng đề bài giao phạm vi.
- **Bài NGƯỢC** "biết chuyển động tìm lực" (vd "ô tô 54 km/h dừng sau 25 m, tính lực hãm"): rất phổ biến trong đề VN nhưng cần thêm op khai báo dữ kiện chuyển động quan sát được (phác v2: `{op:'observed', of, kind:'velocity_at'|'position_at', t, value}` — vẫn là "LLM chép dữ kiện đề"). Đưa vào danh sách phân vân §17.1 để phản biện quyết kéo vào v1 hay không.
- **Thang máy / vật treo đơn / trọng lượng biểu kiến** (1 vật `hanging` không có string ⇒ error rõ).
- **Ròng rọc động**, dây có khối lượng, ≥ 3 vật, **nghiêng + treo** (ròng rọc đỉnh dốc — công thức để sẵn ở §7.4 làm preview nhưng v1 TỪ CHỐI cấu hình này bằng error rõ ràng, vì không có bài contract khoá).
- **Lực xiên góc TRÊN mặt nghiêng** (v1: lực trên mặt nghiêng chỉ được dọc mặt dốc, `angleDeg = 0`).
- **Chuyển động 2 pha** (truyền v0 lên dốc, dừng, rồi trượt xuống lại): pha 1 phục vụ được (`distance_to_stop`); query vượt quá thời điểm dừng khi vật SẼ trượt ngược (tanθ > μ) ⇒ error "hai pha, ngoài phạm vi v1" (§8.3).
- **Hai hệ số ma sát riêng** (μ_nghỉ ≠ μ_trượt): lớp 10 GDPT 2018 dùng chung một μ; đề cho 2 hệ số ⇒ ngoài phạm vi (prompt phase tích hợp sẽ dặn).
- Đơn vị ĐẦU RA ngoài SI (đề hỏi "bao nhiêu km/h" — việc trình bày của lời giải LLM, engine trả m/s).
- **Mũi tên lực trong scene** → v2 (§10.4). Dây ANIMATE theo vật trong scene → v2.

## 4. Kỷ luật dịch — LLM chỉ CHÉP dữ kiện, cấm tính trung gian

Khác đề xuất thô ban đầu (`force{kind:'friction'|'gravity'|'tension'}`), schema này **chỉ cho khai lực NGOÀI đề cho (applied)**. Trọng lực, phản lực, ma sát, lực căng do **engine tự sinh** từ `mass`, `g`, `mu`, mặt tựa, dây — vì nếu cho LLM khai `{kind:'friction', value}` thì value đó chính là μN **đã tính** = vi phạm nguyên tắc R1. Schema vì thế **không có chỗ** để nộp kết quả trung gian.

| Đề nói | LLM chép vào plan | LLM KHÔNG được làm |
|---|---|---|
| "vật khối lượng 2 kg" | `mass: 2` | — |
| "ô tô 2 tấn" | `mass: 2, massUnit: 'tan'` | tự đổi 2000 kg |
| "đang chạy 54 km/h" | `v0: 54, v0Unit: 'km/h'` | tự đổi 15 m/s (engine ×5/18 exact) |
| "hệ số ma sát trượt 0,2" | `mu: 0.2` | tính F_ms = μmg |
| "mặt nghiêng góc 30°" | `on: 'incline', inclineDeg: 30` | tính mg·sin30°, mg·cos30° (engine chiếu bằng EXACT_TRIG) |
| "kéo bằng lực 20 N chếch lên 30° so với phương ngang" | `{op:'force', value: 20, angleDeg: 30}` | tính F·cosα, F·sinα |
| "đẩy bằng lực chếch XUỐNG 30°" | `angleDeg: -30` | tự cộng vào N |
| "lực cản 2000 N" | `{op:'force', value: 2000, direction: 'backward'}` | tự trừ vào lực kéo |
| "hai vật nối dây nhẹ không giãn qua ròng rọc cố định" | `{op:'string', between:['m1','m2']}` | tính a = (m₁−m₂)g/(m₁+m₂) |
| "lấy g = 10 m/s²" | `g: 10` | — (đề không nói: prompt phase tích hợp quy ước lấy 10, như v0) |
| "vật trượt xuống dốc" / "kéo vật lên dốc" | `motion: 'down'` / `'up'` | tự đổi dấu lực |
| Dữ kiện DƯ ("biết hệ chuyển động với gia tốc 2 m/s²" khi đề hỏi T) | `asserts: [{query:{kind:'acceleration'}, equals: 2}]` | dùng số đó để tính T |

## 5. Kiến trúc & ranh giới

### 5.1. File — tất cả TẠO MỚI, cộng thêm cạnh v0

```
api/_lib/kernel/physics/
  dynamicsSchema.ts       — DynamicsPlanSchema (zod riêng, KHÔNG đụng planSchema.ts v0)
  dynamics.ts             — THUẦN: chuẩn hoá hệ (trục, chiều, đổi đơn vị), giải lực → a/T/N/F_ms (Scalar),
                            residual thay-ngược, ràng buộc vật lý, handoff Quad
  runDynamics.ts          — entry runDynamics(raw): parse → solve → queries (lực + động học) → asserts
                            → scene → DynamicsResult
  dynamicsScene.ts        — scene tĩnh (mặt nghiêng/bàn/ròng rọc bằng Point3D+Line3D) + agents/timeline + charts
  __tests__/
    dynamics.test.ts  runDynamics.test.ts  dynamicsScene.test.ts  dynamics-contract.test.ts
```

**Import được phép:** `../scalar`, `../analysis/solver1d`, `../analysis/recognize`, `../compute/answer` (certifyScalar), `zod`, `import type` từ `src/types/geometry`; và **import (chỉ đọc) các helper của v0** `./kinematics` (`evalQuadS/evalQuadN`, `derivQuad`, `rootsFor`, `scalarFromNumber`, bảng EXACT_TRIG). Bề mặt helper này đã được chốt trong plan P1 (`2026-08-21-physics-pack-v0.md`, "Bản đồ file").

**Cố ý KHÔNG phụ thuộc `compute.ts`/`scene.ts` của v0:** hình dạng export nội bộ của hai file đó chưa chốt công khai (đang thi công song song). 6 query động học kế thừa được dynamics tự hiện thực (~60 dòng) trên helper `kinematics.ts` — trùng công thức, không trùng code. Nếu phản biện muốn ép tái dùng compute.ts thì điều kiện tiên quyết là v0 export hàm per-query ổn định (ghi vào phân vân §17.9).

### 5.2. Ranh giới CỨNG

- KHÔNG sửa file có sẵn nào: core kernel, `runAnalysis.ts`, `src/**`, `package.json`, `vitest.config.ts` (glob đã phủ), và **KHÔNG sửa 5 file physics v0** — nhiều agent đang chạy song song trên chúng.
- **Thứ tự thi công:** dynamics chỉ code SAU khi P1 (physics v0) đã merge — vì import helper `./kinematics`. Nếu P1 đổi tên helper trong lúc thi công thì chỉ file dynamics phải theo, không ngược lại.
- Dynamics v1 **chưa vào `index.ts`/kernel-dist** (y hệt v0): test import thẳng `../runDynamics`. Nối dây (dispatch kinematics/dynamics ở bridge, few-shot, route) là việc phase tích hợp.
- Baseline test: (1072 gốc + số test P1) phải XANH nguyên; dynamics chỉ CỘNG test. `git status` sau thi công chỉ thấy `physics/dynamics*` + `__tests__/dynamics*`.
- Nhận diện "đề động học hay động lực học" là việc translator/bridge (2 họ few-shot) — ngoài spec này.

## 6. DynamicsPlanSchema (zod)

### 6.1. Ops

```ts
// api/_lib/kernel/physics/dynamicsSchema.ts
import { z } from 'zod';
const Num = z.number().finite();
const Obj = z.string().min(1);

const BodyOp = z.object({
  op: z.literal('body'), name: Obj,
  mass: Num.positive().optional(),            // OPTIONAL: bài nghiêng thuần-gia-tốc đề KHÔNG cho m — cấm LLM bịa.
                                              // Query/cấu hình cần m mà thiếu ⇒ error rõ "cần khối lượng của <name>".
  massUnit: z.enum(['kg', 'g', 'tan']).default('kg'),
  on: z.enum(['horizontal', 'incline', 'hanging']).default('horizontal'),
  inclineDeg: Num.optional(),                 // BẮT BUỘC khi on='incline' (superRefine), 0 < θ < 90
  mu: Num.min(0).optional(),                  // hệ số ma sát trượt với mặt tựa; bỏ trống = nhẵn.
                                              // Quy ước lớp 10: cũng dùng làm ma sát nghỉ cực đại (ngưỡng trượt).
  motion: z.enum(['down', 'up']).optional(),  // CHỈ cho incline: chiều chuyển động THEO ĐỀ; mặc định 'down'
  v0: Num.min(0).default(0),                  // TỐC ĐỘ đầu dọc chiều chuyển động (≥ 0; chiều nằm ở motion/lực kéo)
  v0Unit: z.enum(['m/s', 'km/h']).default('m/s'),
});

const ForceOp = z.object({
  op: z.literal('force'), on: Obj,            // CHỈ lực NGOÀI đề cho. Trọng lực/phản lực/ma sát/căng: engine tự sinh.
  value: Num.positive(), unit: z.enum(['N', 'kN']).default('N'),
  angleDeg: Num.default(0),                   // so với PHƯƠNG MẶT TỰA (phương chuyển động); dương = chếch lên,
                                              // âm = chếch xuống; |α| < 90. V1: chỉ ≠ 0 khi mặt ngang.
  direction: z.enum(['forward', 'backward']).default('forward'), // "lực kéo"/"lực cản" — chép theo lời đề
});

const StringOp = z.object({ op: z.literal('string'), between: z.tuple([Obj, Obj]) });
// KHÔNG có op 'pulley': ròng rọc cố định được SUY ra khi 2 vật của string nằm trên 2 phương khác nhau
// (bàn + treo). Dây không giãn ⇒ |a| chung; dây + ròng rọc không khối lượng ⇒ T hai đầu bằng nhau (engine kiểm lại).

export const DynamicsOpSchema = z.discriminatedUnion('op', [BodyOp, ForceOp, StringOp]);
```

### 6.2. Queries

```ts
const VUnit = z.enum(['m/s', 'km/h']).default('m/s');
export const DynamicsQuerySchema = z.discriminatedUnion('kind', [
  // — Động lực học —
  z.object({ kind: z.literal('acceleration'), of: Obj.optional(), label: z.string().optional() }),
      // ĐẠI SỐ theo chiều dương (= chiều chuyển động): hệ ròng rọc luôn ra dương; vật đang hãm ra ÂM (D4).
      // 'of' bỏ trống = gia tốc hệ (2 vật chung |a|); có 'of' phải là body tồn tại.
  z.object({ kind: z.literal('force_value'), force: z.enum(['tension', 'friction', 'weight', 'net']),
             on: Obj, label: z.string().optional() }),
      // Trả ĐỘ LỚN (≥0): tension = lực căng dây; friction = μN; weight = mg; net = m·|a| (hợp lực).
  z.object({ kind: z.literal('normal_force'), on: Obj, label: z.string().optional() }),   // N (độ lớn)
  z.object({ kind: z.literal('min_force_to_move'), on: Obj, angleDeg: Num.default(0),
             label: z.string().optional() }),
      // F_min để vật BẮT ĐẦU trượt trên mặt ngang, lực hợp góc angleDeg với phương ngang (μ nghỉ = mu).
      // KHÔNG khai op force cho lực này (giá trị là ẩn số). V1: chỉ mặt ngang.

  // — Kế thừa động học v0 (chạy trên gia tốc engine vừa tính; xem §8) —
  z.object({ kind: z.literal('velocity_at'), of: Obj, t: Num.positive(), label: z.string().optional() }),
  z.object({ kind: z.literal('position_at'), of: Obj, t: Num.positive(), label: z.string().optional() }),
      // x0 = 0 và chuyển động không đổi chiều trong miền hợp lệ (§8.3) ⇒ position = QUÃNG ĐƯỜNG.
  z.object({ kind: z.literal('time_when'), of: Obj, position: Num.positive(), label: z.string().optional() }),
  z.object({ kind: z.literal('time_when_velocity'), of: Obj, velocity: Num.min(0), velocityUnit: VUnit,
             label: z.string().optional() }),          // F3: đạt tốc độ cho trước; velocity: 0 = lúc dừng
  z.object({ kind: z.literal('velocity_after_distance'), of: Obj, distance: Num.positive(),
             label: z.string().optional() }),          // v = √(v0² + 2as) — "vận tốc ở chân dốc" (LLM không chain được)
  z.object({ kind: z.literal('distance_to_stop'), of: Obj, label: z.string().optional() }),  // s = v0²/(2|a|)
]);

export const DynamicsPlanSchema = z.object({
  problemName: z.string().min(1),
  g: Num.positive().optional(),
      // KHÔNG default (chống hard-code, như v0). Optional vì bài "ngang nhẵn thuần lực" (D1, D10) không cần g.
      // Mô hình cần trọng lực (có mu / incline / hanging / query N, weight, min_force) mà thiếu g ⇒ error rõ.
  ops: z.array(DynamicsOpSchema).min(1),
  queries: z.array(DynamicsQuerySchema).min(1),
  asserts: z.array(z.object({ query: DynamicsQuerySchema, equals: Num,
                              tol: Num.positive().optional() })).default([]),   // dữ kiện DƯ của đề, như v0 §7.2
  charts: z.array(z.object({ kind: z.enum(['x_t', 'v_t']), of: z.array(Obj).min(1) })).default([]),
  scene: z.object({ durationSec: Num.positive().optional(),
                    labels: z.record(z.string(), z.string()).optional() }).default({}),
});
export type DynamicsPlan = z.infer<typeof DynamicsPlanSchema>;
```

**superRefine (từ chối sớm, lỗi tiếng Việt rõ):** (1) `incline` phải có `inclineDeg` ∈ (0, 90); `motion` chỉ hợp lệ với incline; (2) tối đa 2 body; 2 body ⇔ đúng 1 string; string nối 2 body tồn tại, khác nhau; (3) hệ 2 vật v1 chỉ nhận cấu hình {hanging, hanging} hoặc {horizontal, hanging}; các cấu hình khác (incline+hanging…) ⇒ lỗi "cấu hình chưa hỗ trợ v1"; (4) body `hanging` phải nằm trong string (không hệ treo đơn), không có mu/incline/motion/force; (5) `force.on` trỏ body tồn tại; force trên incline bắt buộc `angleDeg: 0`; |angleDeg| < 90; (6) hệ 2 vật v1: `v0 = 0` cả hai (bài VN hệ ròng rọc xuất phát từ nghỉ); (7) `mu` chỉ với horizontal/incline.

### 6.3. Đổi đơn vị per-quantity (engine làm, hữu tỉ exact — F2/D1)

| Field | Đơn vị nhận | Hệ số về SI (nhân bằng `rat()`) |
|---|---|---|
| `mass` + `massUnit` | kg / g / tan | ×1 / ×1/1000 / ×1000 |
| `force.value` + `unit` | N / kN | ×1 / ×1000 |
| `v0` + `v0Unit`, `time_when_velocity.velocity` + `velocityUnit` | m/s / km/h | ×1 / **×5/18** (54 km/h → 54·5/18 = 15 exact) |
| `g` | m/s² cố định | ×1 |
| `mu`, góc | không thứ nguyên / độ | — |
| `t`, `position`, `distance` trong queries | s / m cố định | ×1 |

Nội bộ và đầu ra **cố định SI** (khác v0 động học vốn cho phép hệ km–h nhất quán): động lực học trộn thứ nguyên qua N = kg·m/s², và mọi đề VN chương này đều SI — đơn giản và an toàn hơn một "hệ nhất quán" nhân tạo.

## 7. Tầng giải (dynamics.ts) — trục, chiều, công thức đóng

### 7.1. Mô hình trục & chiều dương

Mỗi body có MỘT trục chuyển động 1-D gắn với mặt tựa: ngang → trục ngang; nghiêng → trục dọc mặt dốc; treo → trục thẳng đứng. **Chiều dương của mỗi bài = chiều chuyển động thực:**

- Có `v0 > 0` ⇒ chiều dương = chiều v0 (ma sát trượt ngược chiều đó).
- 1 vật, `v0 = 0`: ngang ⇒ chiều lực `forward`; nghiêng ⇒ theo `motion` ('down' mặc định).
- Hệ 2 vật, v0 = 0: **engine tự xác định** chiều bằng so sánh lực phát động (§7.5) — LLM không khai, đề nói "vật nào đi xuống" chỉ dùng làm assert nếu muốn.

Trục pháp tuyến (vuông góc mặt tựa) chỉ dùng để lập N — không có chuyển động theo phương đó (ràng buộc N ≥ 0 kiểm §9.2).

### 7.2. Lực engine TỰ SINH trên từng vật

| Lực | Thành phần dọc trục (+ = chiều dương) | Thành phần pháp tuyến |
|---|---|---|
| Trọng lực mg | ngang: 0; nghiêng: −mg·sinθ nếu chiều dương hướng LÊN dốc, +mg·sinθ nếu hướng XUỐNG; treo: +mg nếu chiều dương đi xuống, −mg nếu đi lên | ngang: −mg; nghiêng: −mg·cosθ; treo: 0 |
| Phản lực N | 0 | +N (ẩn, giải từ cân bằng pháp tuyến) |
| Ma sát trượt μN | **−μN** (luôn ngược chiều chuyển động) | 0 |
| Lực đề cho F, góc α (so mặt tựa) | ±F·cosα (dấu theo `direction`) | +F·sinα (α > 0 chếch lên làm GIẢM N; α < 0 làm TĂNG N) |
| Lực căng T (có string) | ±T (ẩn, hướng dọc dây về phía ròng rọc) | 0 |

sinθ/cosθ, sinα/cosα lấy từ **EXACT_TRIG** (Scalar exact với {0, ±30, ±45, ±60, ±90}); góc khác → float, đáp cuối qua recognize.

### 7.3. Bảng công thức đóng từng dạng + đường exact

Ký hiệu: mọi số đã về SI, Scalar. `driving` = tổng thành phần dọc trục của các lực KHÔNG-ma-sát theo chiều dương.

| # | Dạng | Công thức đóng | Đường exact (khi nào giữ được dạng căn/hữu tỉ) |
|---|---|---|---|
| 1 | Ngang, các lực dọc trục | a = (ΣF_forward − ΣF_backward)/m | Hữu tỉ luôn (input hữu tỉ) |
| 2 | Ngang + ma sát, lực dọc trục | N = mg; F_ms = μmg; a = (ΣF± − μmg)/m | Hữu tỉ luôn |
| 3 | Hãm do ma sát (v0 > 0, không lực kéo) | a = −μg; t_dừng = v0/(μg); s_dừng = v0²/(2μg) | Hữu tỉ luôn |
| 4 | Kéo/đẩy xiên góc α trên ngang | N = mg − F·sinα (α âm ⇒ N tăng, CÙNG một công thức); F_ms = μN; a = (F·cosα − μN − ΣF_backward)/m | α = ±30/±60: sin hoặc cos hữu tỉ ⇒ N, F_ms hữu tỉ exact; a dạng p + q√3 → exact chết ĐÚNG THIẾT KẾ, recognize dựng lại (D9). α = ±45 và μ = 0: a = (F√2/2)/m một-căn exact; có μ: p + q√2 → recognize |
| 5 | Nghiêng trượt xuống | N = mg·cosθ; a = g(sinθ − μcosθ) | μ = 0: a = g·sinθ một-căn exact (θ=30: hữu tỉ g/2). **θ = 45: sin = cos = (1/2)√2 ⇒ N, F_ms, a CÙNG radicand 2 — exact một-căn XUYÊN SUỐT** (D6). θ = 30/60 với μ > 0: a dạng p + q√3 → recognize |
| 6 | Nghiêng đi lên (truyền v0 hoặc kéo F dọc dốc) | a = (F − mg·sinθ − μmg·cosθ)/m (F = 0 nếu chỉ truyền v0 ⇒ a < 0) | như dòng 5 |
| 7 | Atwood (treo + treo) | a = \|m₁ − m₂\|·g/(m₁+m₂); T = 2m₁m₂g/(m₁+m₂) | Hữu tỉ luôn |
| 8 | Bàn ngang (μ) + treo, ròng rọc mép bàn | a = (m₂ − μm₁)g/(m₁+m₂); T = m₁m₂(1+μ)g/(m₁+m₂) | Hữu tỉ luôn |
| 9 | Lực tối thiểu bắt đầu trượt (ngang, góc α) | F_min = μmg/(cosα + μ·sinα) | α = 0: μmg hữu tỉ exact. α ≠ 0: mẫu p + q√r ⇒ nghịch đảo RỜI trường một-căn → float, recognize thường trượt → thập phân trung thực (approximate: true) — ghi thẳng, xem phân vân §17.3 |
| 10 | Động học sau khi có a | x(τ) = v0τ + (a/2)τ²; v(τ) = v0 + aτ; v = √(v0² + 2as); nghiệm thời gian qua `solveQuadratic` | sqrtExact khi radicand đẹp (D5: √50 = 5√2); nghiệm bậc 2 exact khi Δ chính phương·squarefree — y hệt v0 |
| — | (v2 preview, KHÔNG cam kết v1) Nghiêng + treo | a = (m₂ − m₁sinθ − μm₁cosθ)g/(m₁+m₂) | θ = 30, μ = 0: hữu tỉ; nói chung p + q√r |

**Không nhánh nào cho LLM nộp kết quả:** mọi vế phải chỉ chứa số liệu đề (m, μ, θ, α, F, g, v0) — đúng nguyên tắc engine tính.

### 7.4. Giải hệ 2 vật (string) — một đường code duy nhất

1. Tổng khối lượng M = m₁ + m₂ (cả hai `mass` bắt buộc có — thiếu ⇒ error).
2. Lực phát động có hướng cố định: D = (thành phần trọng lực + lực đề cho, chiếu dọc trục từng vật, lấy dấu theo ứng viên chiều "vật treo đi xuống"). Atwood: D = (m₁ − m₂)g. Bàn + treo: D = m₂g.
3. Ngưỡng ma sát nghỉ: F_ms,max = Σ μᵢNᵢ (chỉ vật trên mặt có μ; N từ cân bằng pháp tuyến).
4. |D| ≤ F_ms,max (so sánh exact bằng `cmpScalar` khi còn trong trường) ⇒ **violation `he-khong-chuyen-dong`** — không serve đáp (kể cả Atwood m₁ = m₂: cân bằng, xem phân vân §17.6).
5. |D| > F_ms,max ⇒ chiều dương = sign(D); a = (|D| − F_ms,max)/M.
6. T giải từ phương trình vật treo: T = m₂(g − a) (vật treo đi xuống) hoặc m₂(g + a) (đi lên); rồi **thay vào phương trình vật kia làm tự kiểm** (§9.1) — "lực căng hai đầu khớp nhau".

### 7.5. Dựng đáp — mirror v0 §6.3 nguyên vẹn

`certifyScalar(kind, scalarKQ, floatKQ)` với floatKQ tính ĐỘC LẬP bằng số học thường → exact sống thì `displayScalar`; chết thì `recognizeConstant` (nhánh p + q√r đã đối chiếu code `recognize.ts`: quét q = qn/qd, |qn| ≤ 8, qd ≤ 8, p hữu tỉ mẫu ≤ 16 — phủ đáp D9); trượt nốt → thập phân 4 chữ số, `approximate: true`.

## 8. Kế thừa động học v0 (handoff)

### 8.1. Cầu nối

Sau khi có a (Scalar, đại số theo chiều dương) và v0′ (đã đổi SI): dựng `Quad` cho từng vật — x: {0, v0′, a/2}, v qua `derivQuad` — rồi phục vụ 6 query động học bằng đúng công cụ v0 (`evalQuadS/N`, `rootsFor` = `solveQuadratic`). Gốc thời gian t = 0 là lúc bắt đầu xét (không có `startAt` trong dynamics).

| Query | Công thức | Ghi chú |
|---|---|---|
| `velocity_at(of, t)` | v0′ + a·t | kẹp miền §8.3 |
| `position_at(of, t)` | v0′t + (a/2)t² | = quãng đường (x0 = 0, không đổi chiều trong miền) |
| `time_when(of, position)` | nghiệm nhỏ nhất t > 0 của x(t) = position | reuse quy tắc chọn nghiệm v0 |
| `time_when_velocity(of, v*)` | t = (v* − v0′)/a | tuyến tính; v* đổi đơn vị ×5/18 nếu km/h |
| `velocity_after_distance(of, s)` | v = √(v0′² + 2as) | đòi v0′² + 2as ≥ 0, ngược lại error "không đạt tới quãng đường đó" |
| `distance_to_stop(of)` | v0′²/(2·(−a)) | đòi a < 0 (hoặc a ngược chiều v0′); a ≥ 0 ⇒ error "vật không dừng" |

### 8.2. Miền thời gian hợp lệ

a ≥ 0: miền [0, ∞). a < 0 (hãm/lên dốc): miền [0, t_dừng], t_dừng = −v0′/a.

### 8.3. Sau khi dừng — xử lý TRUNG THỰC (khác parabol thô của v0)

Parabol toán học cho vật "chạy lùi" sau khi dừng — vật lý thì không (ma sát là lực cản, không phát động). Với query có t > t_dừng (hoặc position > s_dừng):

- **Nếu sau dừng vật ĐỨNG YÊN VĨNH VIỄN** (driving còn lại ≤ μN — luôn đúng trên mặt ngang không lực kéo): serve giá trị CHỐT — `velocity_at` = 0, `position_at` = s_dừng — kèm dòng `checks` "vật đã dừng tại t = t_dừng, giữ nguyên vị trí". Đây là chặn tận gốc lỗi "nghiệm ma" F12/L02 ở tầng mô hình.
- **Nếu sau dừng vật SẼ trượt ngược** (nghiêng với tanθ > μ, vật được truyền v0 lên dốc): query vượt t_dừng ⇒ **error "chuyển động hai pha — ngoài phạm vi v1"**, không bịa. `time_when(position)` với position ≤ s_dừng và `distance_to_stop` vẫn hợp lệ (pha 1).

## 9. Tự kiểm & ràng buộc vật lý

### 9.1. Auto self-check (LUÔN chạy, ghi vào `checks[]`)

| Kiểm | Nội dung |
|---|---|
| `newton_axis` | THAY a NGƯỢC vào tổng lực dọc trục TỪNG VẬT: \|ΣF_trục,i − mᵢ·a\| = 0 exact (khi còn trong trường) hoặc ≤ EPS_SELF·scale. Bài lực xiên kiểm CẢ trục pháp tuyến: \|N + F·sinα − mg\| ≤ EPS. |
| `tension_match` | Hệ 2 vật: T rút từ phương trình vật này thay vào phương trình vật kia — "lực căng hai đầu dây khớp nhau": residual ≤ EPS_SELF. |
| `kinematic_back` | Mọi đáp thời gian/quãng đường thay ngược vào x(t), v(t) như v0 §7.1; `velocity_after_distance` kiểm \|v² − (v0′² + 2as)\| ≤ EPS. |
| `stop_domain` | Đáp động học nằm trong miền §8.2/§8.3; giá trị kẹp có dòng trace riêng. |

### 9.2. Ràng buộc vật lý — vi phạm ⇒ `violations`, ok: false, KHÔNG serve đáp

| Ràng buộc | Vi phạm | Violation |
|---|---|---|
| Thắng ma sát nghỉ (chỉ khi v0 = 0) | driving ≤ μN (so exact khi được) | `vat-khong-truot` — "lực chưa thắng ma sát nghỉ (driving … ≤ μN …), vật không trượt" (số liệu kèm trong message) |
| Hệ 2 vật có chuyển động | \|D\| ≤ Σ μᵢNᵢ | `he-khong-chuyen-dong` |
| Phản lực không âm | N < 0 (F·sinα > mg) | `phan-luc-am` — "lực nhấc vật khỏi mặt tựa, mô hình v1 không phủ" |
| Dây chỉ kéo, không đẩy | T < 0 | `day-chung` |
| Assert dữ kiện dư của đề | \|got − equals\| > tol·max(1, \|equals\|) | như v0 §7.2 — dịch sai đề |

### 9.3. Ngưỡng — tái dùng nguyên hằng v0 §7.3

`EPS_SELF = 1e-6` (tương đối), `TOL_ASSERT = 1e-3`. Không thêm hằng mới; khai lại trong `dynamics.ts` (không sửa file v0 để export).

### 9.4. Đơn vị đáp (engine ghi — C6)

`acceleration` → `m/s²`; `force_value`/`normal_force`/`min_force_to_move` → `N`; `velocity_*` → `m/s`; `position_at`/`distance_*` → `m`; `time_*` → `s`. Quy ước trình bày dấu (vd "a = −3 m/s², độ lớn 3 m/s² ngược chiều chuyển động") là việc prompt lời giải, kiểu F18.

## 10. Scene (dynamicsScene.ts) — tối giản theo F8

### 10.1. Phần tĩnh (Point3D label rỗng + Line3D — KHÔNG cần Curve3D)

- **Mặt đất**: như v0 §8.1 (2 điểm G0/G1 label rỗng + Line3D xám).
- **Mặt nghiêng**: 2 điểm (đỉnh dốc, chân dốc) label rỗng + Line3D solid — đặt trong mặt phẳng xz (trục đứng vật lý ghi vào z geo3d, y = 0, đúng quirk map (x, 0, z) của v0).
- **Bàn + ròng rọc mép bàn**: mặt bàn = Line3D ngang tại z = H_bàn; ròng rọc = 1 điểm label rỗng ở mép; vật treo rơi dọc mép.
- **Atwood**: xà ngang + điểm ròng rọc; 2 agent hai bên chuyển động đối nhau theo z.
- **Dây**: v1 vẽ TĨNH ở vị trí đầu (Line3D nét đứt) hoặc BỎ — dây co giãn theo agent cần cơ chế line-bám-agent chưa có ⇒ v2 (ghi rõ, không hứa).
- **KHÔNG label kèm giá trị** (F8): label chỉ là tên ngắn từ `scene.labels` ("Vật", "m₁"…) hoặc rỗng.
- **Mũi tên lực (vectơ F, N, P, F_ms): v2** — cần shape mũi tên + chú giải; v1 không phát gì.

### 10.2. Agents + timeline — tái dùng nguyên quy tắc v0 §8.2

Chuyển động dọc đường thẳng: điểm theo tham số s(t) = v0′·k·t + (a/2)·k²·t² chiếu lên phương của mặt:

- Ngang: x(t) = x_start + s(t), z = const. Nghiêng (trượt xuống): x(t) = s(t)·cosθ, z(t) = H − s(t)·sinθ. Treo: z(t) = z_start ± s(t).
- **T_phys** = max(mọi `t` trong queries; mọi đáp thời gian; t_dừng nếu hữu hạn); bài thuần lực không có đại lượng thời gian/quãng đường ⇒ **T_phys = 2 s danh nghĩa** (minh hoạ trượt theo a thật — phân vân §17.7). Track end tại min(T_phys, t_dừng).
- Quy tắc playback GIỮ NGUYÊN v0 (đã duyệt D2): 3 ≤ T_phys ≤ 15 ⇒ k = 1; ngoài khoảng ⇒ D_pb = 10 s, k = T_phys/10. `scene.durationSec` ép D_pb.
- 3 quirk frontend giữ nguyên: phát CẢ `params.equations` (vế phải) LẪN `params.path`; **`t*t` không `t^2`**; **`landing_point` bắt buộc mọi track**; `params.timeScale = k`; tags `['physics', 'timeScale:<k>']` (taxonomy do bridge merge sau).

### 10.3. Ví dụ scene D6 (nghiêng 45°, μ = 0,5 — a = 5√2/2 ≈ 3,5355 m/s²)

T_phys = 2 (danh nghĩa) < 3 ⇒ D_pb = 10, k = 0,2. s(2 s vật lý) = ½·3,5355·4 = 5√2 ≈ 7,0711 m dọc dốc ⇒ đỉnh (0, 0, 5), chân (5, 0, 0) (vì 5√2·cos45 = 5 exact). Hệ số playback: ½·a·k²·cos45 = ½·(5√2/2)·0,04·(√2/2) = **1/20 = 0.05 exact**.

```jsonc
{
  "name": "vat-truot-nghieng-45",
  "axisUnit": "m",
  "tags": ["physics", "timeScale:0.2"],
  "points": [
    { "id": "dinh", "label": "", "x": 0, "y": 0, "z": 5 },
    { "id": "chan", "label": "", "x": 5, "y": 0, "z": 0 },
    { "id": "G0", "label": "", "x": -0.5, "y": 0, "z": 0 },
    { "id": "G1", "label": "", "x": 6, "y": 0, "z": 0 }
  ],
  "lines": [
    { "id": "doc", "from": "dinh", "to": "chan", "style": "solid", "color": "#8B8B8B" },
    { "id": "ground", "from": "G0", "to": "G1", "style": "solid", "color": "#8B8B8B" }
  ],
  "curves": [],
  "agents": [
    { "id": "vat", "label": "Vật", "initialPosition": [0, 0, 5], "color": "#FFA500", "radius": 0.14 }
  ],
  "timeline": {
    "duration": 10,
    "tracks": [
      { "id": "mv_vat", "start": 0, "end": 10, "type": "parametric_path", "targetId": "vat",
        "params": {
          "equations": { "x": "0 + 0.05*t*t", "y": "0", "z": "5 + -0.05*t*t" },
          "path": "x(t) = 0 + 0.05*t*t, y(t) = 0, z(t) = 5 + -0.05*t*t",
          "landing_point": [5, 0, 0],
          "timeScale": 0.2
        } }
    ]
  }
}
```

(Kiểm bằng parser AnimatedAgent: t = 10 → x = 5, z = 0 = chân dốc; t > end đậu tại landing_point ✓.)

### 10.4. Charts

Tái dùng format v0 §8.3 trên Quad handoff: `v_t` (đường thẳng v0′ → v0′ + aT — 2 mẫu), `x_t` (65 mẫu). Vẫn nằm trong DynamicsResult, không vào GeometryData (phán quyết D6 của phản biện).

## 11. Taxonomy đề xuất (gắn ở bridge, việc P0 — spec chỉ đề xuất seed)

`ly/10/dong-luc-hoc/` + { `dinh-luat-ii`, `ma-sat-truot`, `mat-phang-nghieng`, `he-vat-rong-roc`, `luc-xien-goc` }. Bài nối động học tag kép (vd `dinh-luat-ii` + `ly/10/dong-hoc/bien-doi-deu`). Registry là nguồn sự thật duy nhất (C4) — danh sách này cần được cập nhật vào registry TRƯỚC khi bridge gắn, nếu không sẽ bị `isKnownTag` drop lặng (bài học F10).

## 12. DynamicsResult

Cùng hình dạng `PhysicsResult` v0 §9 (bridge sau này dùng chung một đường): `{ ok, answers[] {label?, kind, text, approx, unit, approximate}, checks[], violations[], errors[], geometry, charts, meta }`. `meta` thêm 2 field mô tả mô hình (minh bạch cho trace): `meta.model = { direction: 'm2-di-xuong' | 'theo-luc-keo' | …, config: 'ngang' | 'nghieng' | 'atwood' | 'ban-treo' }`.

---

## 13. MƯỜI (+1) BÀI CONTRACT — tính tay TỪNG BƯỚC

Số liệu tự đặt kiểu SGK/đề VN, đáp đẹp. Mỗi bài: đề, plan kỳ vọng, tính tay, TỰ KIỂM thay-ngược, kỳ vọng test. File test: `__tests__/dynamics-contract.test.ts`. Chuỗi text exact viết theo đúng `displayExact` (đã đối chiếu `scalar.ts:55`: "5√2/2", "75/2", "-3").

---

### D1 — F = ma trơn, một lực (+ vận tốc sau t)

**Đề:** "Một vật khối lượng 2 kg đang đứng yên trên mặt phẳng ngang nhẵn thì chịu tác dụng của lực kéo 10 N theo phương ngang. a) Tính gia tốc của vật. b) Tính vận tốc của vật sau 3 s."

```json
{ "problemName": "f-ma-tron-mot-luc",
  "ops": [ { "op": "body", "name": "vat", "mass": 2 },
           { "op": "force", "on": "vat", "value": 10 } ],
  "queries": [ { "kind": "acceleration", "of": "vat", "label": "a" },
               { "kind": "velocity_at", "of": "vat", "t": 3, "label": "b" } ] }
```

**Tính tay:** Trục ngang, chiều dương = chiều lực kéo. ΣF = 10. a = 10/2 = **5 m/s²** (hữu tỉ exact). Handoff v(t) = 5t ⇒ v(3) = **15 m/s**.
**Tự kiểm:** thay ngược: 10 − 2·5 = 0 exact ✓. Không có g trong plan: hợp lệ (không μ, không query N — trục pháp không cần lập); check ghi trace "bỏ qua kiểm N (không cần trọng lực)".
**Kỳ vọng:** "5 m/s²"; "15 m/s"; approximate:false cả hai; plan KHÔNG có `g` vẫn chạy (khoá đường g-optional).

---

### D2 — F = ma trơn, HAI lực ngược chiều (+ hợp lực + quãng đường)

**Đề:** "Một vật khối lượng 4 kg trên mặt ngang nhẵn chịu hai lực cùng phương ngang: lực kéo F₁ = 18 N và lực cản F₂ = 6 N ngược chiều F₁. Vật bắt đầu chuyển động từ trạng thái nghỉ. a) Tính hợp lực tác dụng lên vật. b) Tính gia tốc. c) Tính quãng đường vật đi được sau 4 s."

```json
{ "problemName": "f-ma-hai-luc",
  "ops": [ { "op": "body", "name": "vat", "mass": 4 },
           { "op": "force", "on": "vat", "value": 18 },
           { "op": "force", "on": "vat", "value": 6, "direction": "backward" } ],
  "queries": [ { "kind": "force_value", "force": "net", "on": "vat", "label": "a" },
               { "kind": "acceleration", "of": "vat", "label": "b" },
               { "kind": "position_at", "of": "vat", "t": 4, "label": "c" } ] }
```

**Tính tay:** ΣF = 18 − 6 = 12 ⇒ hợp lực **12 N**. a = 12/4 = **3 m/s²**. Quad x = {0, 0, 3/2} ⇒ x(4) = (3/2)·16 = **24 m**.
**Tự kiểm:** 18 − 6 − 4·3 = 0 exact ✓; v0 = 0, driving = 12 > 0 (không μ) ⇒ chuyển động ✓.
**Kỳ vọng:** "12 N"; "3 m/s²"; "24 m"; approximate:false.

---

### D3 — Ma sát ngang: kéo dọc trục (+ trọng lượng, phản lực)

**Đề:** "Một vật khối lượng 5 kg đặt trên sàn ngang, hệ số ma sát trượt giữa vật và sàn là 0,2. Kéo vật bằng lực 20 N theo phương ngang. Lấy g = 10 m/s². a) Tính trọng lượng của vật. b) Tính phản lực của sàn. c) Tính lực ma sát trượt. d) Tính gia tốc của vật."

```json
{ "problemName": "ma-sat-ngang-keo", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "mass": 5, "mu": 0.2 },
           { "op": "force", "on": "vat", "value": 20 } ],
  "queries": [ { "kind": "force_value", "force": "weight", "on": "vat", "label": "a" },
               { "kind": "normal_force", "on": "vat", "label": "b" },
               { "kind": "force_value", "force": "friction", "on": "vat", "label": "c" },
               { "kind": "acceleration", "of": "vat", "label": "d" } ] }
```

**Tính tay:** P = mg = 50 ⇒ **50 N**. Trục pháp: N = mg = **50 N** (không lực đứng khác). F_ms = μN = (1/5)·50 = **10 N** (0.2 → 1/5 exact qua `scalarFromNumber`). a = (20 − 10)/5 = **2 m/s²**.
**Tự kiểm:** v0 = 0: driving 20 > μN = 10 ⇒ trượt ✓ (pass `static_threshold`). Thay ngược trục x: 20 − 10 − 5·2 = 0 exact ✓; trục pháp: 50 − 50 = 0 ✓; N ≥ 0 ✓.
**Kỳ vọng:** "50 N"; "50 N"; "10 N"; "2 m/s²"; approximate:false.

---

### D4 — Hãm do ma sát: đơn vị km/h + tấn (engine đổi ×5/18, ×1000) — đáp a ÂM

**Đề:** "Một ô tô khối lượng 1 tấn đang chạy với tốc độ 54 km/h trên đường ngang thì hãm phanh, bánh xe ngừng quay và trượt trên mặt đường. Hệ số ma sát trượt giữa lốp xe và mặt đường là 0,3. Lấy g = 10 m/s². a) Tính gia tốc của ô tô. b) Tính quãng đường ô tô trượt được đến khi dừng. c) Sau bao lâu kể từ lúc hãm thì ô tô dừng?"

```json
{ "problemName": "oto-ham-truot", "g": 10,
  "ops": [ { "op": "body", "name": "oto", "mass": 1, "massUnit": "tan", "mu": 0.3,
             "v0": 54, "v0Unit": "km/h" } ],
  "queries": [ { "kind": "acceleration", "of": "oto", "label": "a" },
               { "kind": "distance_to_stop", "of": "oto", "label": "b" },
               { "kind": "time_when_velocity", "of": "oto", "velocity": 0, "label": "c" } ] }
```

**Tính tay:** Engine đổi: m = 1 tấn ×1000 = 1000 kg; v0 = 54 × 5/18 = 270/18 = **15 m/s exact** (hữu tỉ thuần). Chiều dương = chiều v0. Không lực kéo; F_ms = μmg = (3/10)·1000·10 = 3000 N ngược chiều. a = −3000/1000 = **−3 m/s²** (đại số). b) s_dừng = v0²/(2·3) = 225/6 = **75/2 m = 37,5 m**. c) t = (0 − 15)/(−3) = **5 s**.
**Tự kiểm:** −3000 − 1000·(−3) = 0 exact ✓; v(5) = 15 − 15 = 0 ✓; x(5) = 15·5 − (3/2)·25 = 75/2 = s_dừng khớp ✓; sau dừng driving = 0 ≤ μN ⇒ đứng yên vĩnh viễn, miền hợp lệ ✓.
**Kỳ vọng:** "-3 m/s²" (đại số — khoá quy ước dấu); "75/2 m" ≈ 37.5; "5 s"; approximate:false. (T_phys = 5 ∈ [3,15] ⇒ scene k = 1.)

---

### D5 — Nghiêng 30° KHÔNG ma sát + nối động học (đáp DẠNG CĂN, mass KHÔNG cho)

**Đề:** "Một vật được thả trượt không vận tốc đầu từ đỉnh mặt phẳng nghiêng nhẵn dài 5 m, nghiêng góc 30° so với phương ngang. Lấy g = 10 m/s². a) Tính gia tốc của vật. b) Tính vận tốc của vật tại chân dốc. c) Tính thời gian vật trượt hết dốc."

```json
{ "problemName": "nghieng-30-nhan", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "on": "incline", "inclineDeg": 30 } ],
  "queries": [ { "kind": "acceleration", "of": "vat", "label": "a" },
               { "kind": "velocity_after_distance", "of": "vat", "distance": 5, "label": "b" },
               { "kind": "time_when", "of": "vat", "position": 5, "label": "c" } ] }
```

**Tính tay:** Đề KHÔNG cho khối lượng — plan không có `mass` (khoá đường mass-optional; a không phụ thuộc m). sin30 = 1/2 exact. a = g·sin30 = 10·(1/2) = **5 m/s²** exact. b) v = √(0 + 2·5·5) = √50 = **5√2 m/s ≈ 7,0711** (sqrtExact: 50 = 25·2). c) (5/2)t² = 5: `solveQuadratic(5/2, 0, −5)`: Δ = 50, √50 = 5√2, t = 5√2/5 = **√2 s ≈ 1,4142** exact (b = 0 nên nghiệm ở lại trường một-căn).
**Tự kiểm:** v² − 2as = 50 − 50 = 0 exact ✓; x(√2) = (5/2)·2 = 5 ✓; trượt: tan30 ≈ 0,577 > μ = 0 ✓ (driving mg·sin30 > 0 theo đơn-vị-khối-lượng — kiểm symbolic vì m vắng).
**Kỳ vọng:** "5 m/s²"; "5√2 m/s" ≈ 7.0711; "√2 s" ≈ 1.4142; approximate:false cả ba.

---

### D6 — Nghiêng 45° CÓ ma sát — exact MỘT-CĂN xuyên suốt (N, F_ms, a cùng √2)

**Đề:** "Một vật khối lượng 4 kg trượt xuống mặt phẳng nghiêng góc 45° so với phương ngang, hệ số ma sát trượt giữa vật và mặt nghiêng là 0,5. Lấy g = 10 m/s². a) Tính phản lực của mặt nghiêng lên vật. b) Tính lực ma sát trượt. c) Tính gia tốc của vật."

```json
{ "problemName": "nghieng-45-ma-sat", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "mass": 4, "on": "incline", "inclineDeg": 45, "mu": 0.5 } ],
  "queries": [ { "kind": "normal_force", "on": "vat", "label": "a" },
               { "kind": "force_value", "force": "friction", "on": "vat", "label": "b" },
               { "kind": "acceleration", "of": "vat", "label": "c" } ] }
```

**Tính tay:** cos45 = sin45 = (1/2)√2 exact. a) N = mg·cos45 = 40·(1/2)√2 = **20√2 N ≈ 28,2843**. b) F_ms = μN = (1/2)·20√2 = **10√2 N ≈ 14,1421**. c) a = (mg·sin45 − F_ms)/m = (20√2 − 10√2)/4 — CÙNG radicand 2 nên `subExact` sống: = 10√2/4 = **5√2/2 m/s² ≈ 3,5355** (displayExact: "5√2/2").
**Tự kiểm:** trượt: driving 20√2 > μN = 10√2 — so sánh EXACT cùng radicand ✓ (tan45 = 1 > 0,5). Thay ngược dọc trục: 20√2 − 10√2 − 4·(5√2/2) = 20√2 − 20√2 = **0 exact** ✓; trục pháp: N − mg·cos45 = 0 exact ✓; N ≥ 0 ✓.
**Kỳ vọng:** "20√2 N"; "10√2 N"; "5√2/2 m/s²"; approximate:false CẢ BA (bài chứng minh chuỗi exact một-căn của động lực học). Đây cũng là bài của ví dụ scene §10.3.

---

### D7 — Hệ 2 vật treo ròng rọc cố định (Atwood)

**Đề:** "Hai vật m₁ = 3 kg và m₂ = 2 kg nối với nhau bằng dây nhẹ không giãn vắt qua ròng rọc cố định. Bỏ qua khối lượng ròng rọc và ma sát ở trục ròng rọc. Lấy g = 10 m/s². a) Tính gia tốc của các vật. b) Tính lực căng dây."

```json
{ "problemName": "atwood-3-2", "g": 10,
  "ops": [ { "op": "body", "name": "m1", "mass": 3, "on": "hanging" },
           { "op": "body", "name": "m2", "mass": 2, "on": "hanging" },
           { "op": "string", "between": ["m1", "m2"] } ],
  "queries": [ { "kind": "acceleration", "label": "a" },
               { "kind": "force_value", "force": "tension", "on": "m1", "label": "b" } ],
  "scene": { "labels": { "m1": "m₁", "m2": "m₂" } } }
```

**Tính tay:** D = (m₁ − m₂)g = 10 > 0 ⇒ m₁ đi xuống (engine tự xác định, ghi `meta.model.direction`). a = 10/(3+2) = **2 m/s²**. T từ vật 2 (đi lên): T = m₂(g + a) = 2·12 = **24 N**.
**Tự kiểm — lực căng hai đầu khớp nhau:** từ vật 1: T = m₁(g − a) = 3·8 = 24 ✓ trùng exact. Thay ngược: vật 1: 30 − 24 = 6 = 3·2 ✓; vật 2: 24 − 20 = 4 = 2·2 ✓. T = 24 > 0 dây căng ✓.
**Kỳ vọng:** "2 m/s²"; "24 N"; approximate:false; `checks` chứa `tension_match` pass; query tension với `on:"m2"` phải trả CÙNG 24 N.

---

### D8 — Bàn ngang có ma sát + vật treo qua ròng rọc mép bàn

**Đề:** "Vật m₁ = 3 kg đặt trên mặt bàn nằm ngang, nối với vật m₂ = 2 kg treo thẳng đứng bằng dây nhẹ không giãn vắt qua ròng rọc cố định ở mép bàn. Hệ số ma sát trượt giữa m₁ và mặt bàn là 0,2. Bỏ qua khối lượng ròng rọc. Lấy g = 10 m/s². a) Tính gia tốc của hệ. b) Tính lực căng dây."

```json
{ "problemName": "ban-treo-rong-roc", "g": 10,
  "ops": [ { "op": "body", "name": "m1", "mass": 3, "mu": 0.2 },
           { "op": "body", "name": "m2", "mass": 2, "on": "hanging" },
           { "op": "string", "between": ["m1", "m2"] } ],
  "queries": [ { "kind": "acceleration", "label": "a" },
               { "kind": "force_value", "force": "tension", "on": "m2", "label": "b" } ] }
```

**Tính tay:** N₁ = m₁g = 30; ngưỡng μN₁ = 6. D = m₂g = 20 > 6 ⇒ hệ chuyển động, m₂ đi xuống. a = (20 − 6)/(3+2) = 14/5 = **2,8 m/s²** ("14/5"). T = m₂(g − a) = 2·(10 − 14/5) = 2·(36/5) = 72/5 = **14,4 N** ("72/5").
**Tự kiểm:** từ m₁: T = m₁a + μm₁g = 42/5 + 6 = 72/5 ✓ khớp hai đầu exact. Thay ngược: m₁: 72/5 − 6 − 3·(14/5) = 72/5 − 30/5 − 42/5 = 0 ✓; m₂: 20 − 72/5 − 2·(14/5) = 100/5 − 72/5 − 28/5 = 0 ✓. T > 0 ✓; N₁ ≥ 0 ✓.
**Kỳ vọng:** "14/5 m/s²" ≈ 2.8; "72/5 N" ≈ 14.4; approximate:false.

---

### D9 — Kéo vật bằng lực XIÊN GÓC trên sàn có ma sát (chiếu 2 trục; α = 30° cho N hữu tỉ)

**Đề:** "Một vật khối lượng 2 kg đặt trên sàn ngang. Kéo vật bằng lực F = 20 N hợp với phương ngang góc 30° (chếch lên). Hệ số ma sát trượt giữa vật và sàn là 0,5. Lấy g = 10 m/s². a) Tính phản lực của sàn. b) Tính lực ma sát trượt. c) Tính gia tốc của vật."

```json
{ "problemName": "keo-xien-30", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "mass": 2, "mu": 0.5 },
           { "op": "force", "on": "vat", "value": 20, "angleDeg": 30 } ],
  "queries": [ { "kind": "normal_force", "on": "vat", "label": "a" },
               { "kind": "force_value", "force": "friction", "on": "vat", "label": "b" },
               { "kind": "acceleration", "of": "vat", "label": "c" } ] }
```

**Tính tay (chiếu 2 trục):** sin30 = 1/2 (hữu tỉ exact), cos30 = (1/2)√3.
Trục đứng: N = mg − F·sin30 = 20 − 10 = **10 N** exact. Kiểm nhấc: F·sin30 = 10 < mg = 20 ⇒ N > 0 ✓.
F_ms = μN = (1/2)·10 = **5 N** exact.
Trục ngang: a = (F·cos30 − F_ms)/m = (10√3 − 5)/2. `subExact(10√3, 5)` = null (khác radicand) ⇒ float ≈ (17,3205 − 5)/2 = **6,1603 m/s²**; `recognizeConstant(6.16025…)` nhánh p + q√r: p = −5/2 (mẫu 2 ≤ 16), q = 5 (≤ 8), r = 3 — TRONG không gian quét của `recognize.ts` ⇒ text **"-5/2 + 5√3"**, dựng lại khớp 1e-10, approximate:false.
**Tự kiểm:** trượt: F·cos30 = 10√3 ≈ 17,32 > μN = 5 ✓. Trục đứng: N + F·sin30 − mg = 10 + 10 − 20 = 0 exact ✓. Trục ngang thay ngược: 10√3 − 5 − 2·a ≈ residual ~1e-15 ≤ EPS_SELF ✓.
**Kỳ vọng:** "10 N"; "5 N"; answers[2].approx ≈ 6.1603 (±1e-3), text kỳ vọng "-5/2 + 5√3 m/s²" — test khoá CỨNG approx, khoá MỀM text (nếu recognize trả khác thì chấp nhận thập phân approximate:true — trung thực như v0 P6c; chốt khi chạy code thật, phân vân §17.4).

---

### D10 — Nối động học TRỌN: tính a từ lực rồi hỏi quãng đường & vận tốc sau t (đề "ô tô 2 tấn")

**Đề:** "Một ô tô khối lượng 2 tấn bắt đầu chuyển động thẳng trên đường ngang. Lực kéo của động cơ là 4000 N, lực cản tổng cộng lên xe là 2000 N (coi như không đổi). a) Tính gia tốc của ô tô. b) Tính quãng đường ô tô đi được sau 10 s. c) Tính vận tốc của ô tô ở cuối giây thứ 10."

```json
{ "problemName": "oto-2-tan-noi-dong-hoc",
  "ops": [ { "op": "body", "name": "oto", "mass": 2, "massUnit": "tan" },
           { "op": "force", "on": "oto", "value": 4000 },
           { "op": "force", "on": "oto", "value": 2000, "direction": "backward" } ],
  "queries": [ { "kind": "acceleration", "of": "oto", "label": "a" },
               { "kind": "position_at", "of": "oto", "t": 10, "label": "b" },
               { "kind": "velocity_at", "of": "oto", "t": 10, "label": "c" } ] }
```

**Tính tay:** m = 2 tấn ×1000 = 2000 kg (engine đổi). a = (4000 − 2000)/2000 = **1 m/s²**. Handoff Quad {0, 0, 1/2}: x(10) = (1/2)·100 = **50 m**; v(10) = 1·10 = **10 m/s**.
**Tự kiểm:** 4000 − 2000 − 2000·1 = 0 exact ✓; lực cản khai `backward` (KHÔNG μ, KHÔNG cần g — plan không có g hợp lệ) ✓; driving = 2000 > 0 ⇒ chuyển động ✓.
**Kỳ vọng:** "1 m/s²"; "50 m"; "10 m/s"; approximate:false. (T_phys = 10 ⇒ k = 1, scene realtime.)

---

### D11 (BONUS) — Lực kéo tối thiểu để vật bắt đầu trượt (α = 0)

**Đề:** "Một vật khối lượng 3 kg đặt trên sàn ngang, hệ số ma sát giữa vật và sàn là 0,4 (coi ma sát nghỉ cực đại bằng ma sát trượt). Lấy g = 10 m/s². Tìm độ lớn nhỏ nhất của lực kéo theo phương ngang để vật bắt đầu trượt."

```json
{ "problemName": "luc-toi-thieu-truot", "g": 10,
  "ops": [ { "op": "body", "name": "vat", "mass": 3, "mu": 0.4 } ],
  "queries": [ { "kind": "min_force_to_move", "on": "vat", "label": "a" } ] }
```

**Tính tay:** F_min = μmg/(cos0 + μ·sin0) = μmg = (2/5)·3·10 = **12 N** exact.
**Tự kiểm:** tại F = F_min: driving = μN đúng ngưỡng (residual 0 exact); quy ước SGK: đáp là giá trị ngưỡng.
**Kỳ vọng:** "12 N"; approximate:false. (Bài này KHÔNG có op force — lực là ẩn số của query; test khoá điều đó.)

---

### Test âm bản (không đánh số, bắt buộc có trong contract suite)

1. **Vật không trượt:** D3 nhưng F = 5 N (< μmg = 10): kỳ vọng `violations` chứa `vat-khong-truot`, `ok: false`, `answers` KHÔNG serve — không bịa đáp.
2. **Phản lực âm:** D9 nhưng F = 50 N (F·sin30 = 25 > mg = 20): violation `phan-luc-am`, ok: false.
3. **Thiếu g khi cần:** plan D3 bỏ `g`: error rõ "cần g…", ok: false.
4. **Thiếu mass khi cần:** plan D3 bỏ `mass`: error rõ "cần khối lượng của vat".
5. **Assert dữ kiện dư sai:** D8 thêm `asserts: [{query:{kind:'acceleration'}, equals: 2}]` (đề dư nói a = 2 nhưng đúng là 2,8): violation assert, ok: false.

### Bảng tổng hợp 10 + 1 bài

| # | Dạng | Đáp chốt |
|---|---|---|
| D1 | F=ma trơn, 1 lực | 5 m/s²; 15 m/s |
| D2 | F=ma trơn, 2 lực ngược chiều | 12 N; 3 m/s²; 24 m |
| D3 | Ma sát ngang, kéo dọc trục | 50 N; 50 N; 10 N; 2 m/s² |
| D4 | Hãm do ma sát (54 km/h, 1 tấn — engine đổi ×5/18, ×1000) | −3 m/s²; 75/2 m = 37,5 m; 5 s |
| D5 | Nghiêng 30° nhẵn + nối động học (không cho m) | 5 m/s²; **5√2 m/s**; **√2 s** |
| D6 | Nghiêng 45° có ma sát (exact một-căn xuyên suốt) | **20√2 N**; **10√2 N**; **5√2/2 m/s²** |
| D7 | Atwood 3–2 | 2 m/s²; 24 N |
| D8 | Bàn (μ = 0,2) + treo, ròng rọc mép bàn | 14/5 m/s² = 2,8; 72/5 N = 14,4 |
| D9 | Kéo xiên 30° có ma sát (chiếu 2 trục) | 10 N; 5 N; ≈ 6,1603 m/s² (kỳ vọng "-5/2 + 5√3") |
| D10 | Nối động học (2 tấn, kéo + cản) | 1 m/s²; 50 m; 10 m/s |
| D11* | F_min bắt đầu trượt (bonus) | 12 N |

Độ phủ: mọi query kind xuất hiện ≥ 1 lần (acceleration ×9, force_value đủ 4 nhánh tension/friction/weight/net, normal_force ×3, min_force_to_move ×1, cả 6 query động học kế thừa); cả hai đường đơn vị (km/h, tấn); cả hai nhánh mass/g optional; exact hữu tỉ, exact một-căn, recognize p+q√r, và 5 test âm bản cho violations/errors.

## 14. Rủi ro & giảm thiểu

- **R1 — LLM tính hộ engine** (nộp μN, mg·sinθ, hợp lực, đổi km/h): schema không có field nào nhận số đã tính (force chỉ nhận applied; không f_x/f_y/netForce); unit per-quantity để engine đổi; prompt phase tích hợp cấm tường minh + few-shot D-bài.
- **R2 — Rối dấu/chiều** (a âm, chiều hệ ròng rọc): MỘT quy ước duy nhất "chiều dương = chiều chuyển động thực" (§7.1); contract D4 khoá đáp âm, D7/D8 khoá chiều engine tự xác định.
- **R3 — Khớp giả của recognize trên p + q√r:** không gian quét recognize hẹp (|q| ≤ 8, mẫu ≤ 16) + tự kiểm dựng-lại 1e-10 sẵn có; contract D9 khoá approx cứng, text mềm.
- **R4 — Phụ thuộc v0 đang thi công song song:** dynamics chỉ import helper `kinematics.ts` có tên chốt trong plan P1; thi công SAU merge P1; nếu helper đổi tên chỉ sửa file dynamics.
- **R5 — Mô hình tĩnh/động nhập nhằng** (μ nghỉ vs trượt): quy ước lớp 10 μ chung, ghi ngay trong schema comment + spec; đề cho 2 hệ số nằm ngoài phạm vi (prompt sẽ báo).
- **R6 — Đề "vật đứng yên" hợp lệ** (hỏi ma sát nghỉ khi F nhỏ): v1 trả violation `vat-khong-truot` thay vì đáp F_ms,nghỉ = F — đúng "thà ít mà đúng" nhưng là giới hạn thật; ghi ở §17.6 để phản biện quyết.

## 15. Tiêu chí thành công

1. 11 bài contract D1–D11 chạy qua `runDynamics` ra ĐÚNG đáp tính tay: text exact đúng chỗ ("5√2 m/s", "√2 s", "20√2 N", "10√2 N", "5√2/2 m/s²", "14/5 m/s²", "72/5 N", "-3 m/s²"), approx khớp ±1e-6 (riêng D9c ±1e-3, text mềm).
2. `checks[]` có `newton_axis` pass cho TỪNG vật ở mọi bài; D7/D8 có `tension_match` pass; 5 test âm bản ra đúng violation/error, `ok: false`, không serve đáp.
3. Scene D6 khớp §10.3 (equations `t*t`, landing_point, k = 0,2; điểm label rỗng — không giá trị trong label; không Curve3D thiếu params).
4. Toàn suite: (1072 + test P1) cũ XANH nguyên; `git status` chỉ thấy file `dynamics*` mới.
5. `npx tsc -p tsconfig.kernel.json` sạch (nghi thức F9).

## 16. Đối chiếu nhanh với spec v0

Thống nhất: triết lý dịch-tính-tự kiểm, Scalar/EXACT_TRIG/solveQuadratic/recognize/certifyScalar, quy ước scene (t*t, landing_point, trục đứng → z, playback 3–15 s), hình dạng Result, hai ngưỡng EPS. Khác biệt CÓ CHỦ ĐÍCH: (1) đơn vị vào per-quantity + nội bộ SI cố định (v0 dùng hệ nhất quán tùy plan — dynamics buộc SI vì N = kg·m/s²); (2) `g` cấp plan optional-nhưng-bắt-lỗi (v0: per-op bắt buộc — dynamics nhiều op cùng cần g, đặt per-op sẽ trùng lặp); (3) thêm tầng ràng buộc vật lý (N ≥ 0, dây căng, ngưỡng trượt) không có ở động học; (4) sau-khi-dừng xử lý theo vật lý (kẹp/2-pha) thay vì parabol thô.

## 17. Điểm còn phân vân cho phản biện (trung thực)

1. **Bài ngược "biết chuyển động tìm lực"** (lực hãm từ quãng đường dừng…) — lát cắt LỚN của đề VN đang ngoài v1. Kéo vào bằng op `observed` (§3.2) ngay v1 hay để v2? (Thiên về v2 để giữ "thà ít mà đúng", nhưng cần phản biện xác nhận độ phủ đề chấp nhận được.)
2. **Dấu của `acceleration`:** đại số theo chiều chuyển động (D4 trả −3). Giáo viên VN hay đọc "gia tốc 3 m/s², ngược chiều chuyển động". Giữ đại số + để prompt trình bày (như F18), hay thêm query/field `magnitude`?
3. **`min_force_to_move` với α ≠ 0:** mẫu số p + q√r làm đáp gần như luôn thập phân (recognize khó với 1/(p+q√r)). Giữ α tự do, hay v1 chỉ nhận α = 0 (D11) và α ≠ 0 để v2?
4. **Kỳ vọng text của recognize cho D9c** ("-5/2 + 5√3"): đã đối chiếu không gian quét trên code recognize.ts hiện tại, nhưng CHƯA chạy máy — bản thi công phải chạy thật rồi khoá text cứng hoặc giữ mềm.
5. **`mass`/`g` optional + bắt lỗi khi cần** (chống LLM bịa số đề không cho): quy ước lỗi runtime đã đủ rõ chưa, hay phản biện muốn 2 schema riêng (bài có lực ngoài ⇒ mass bắt buộc từ zod)?
6. **Trường hợp "đứng yên" là ĐÁP hợp lệ:** đề hỏi "tính lực ma sát (nghỉ) khi kéo F = 5 N" hoặc Atwood m₁ = m₂ — v1 trả violation không-chuyển-động thay vì F_ms = F / a = 0, T = mg. Chấp nhận giới hạn này cho v1 (đề lớp 10 chương động lực học chủ yếu hỏi trường hợp có chuyển động), hay thêm nhánh tĩnh?
7. **T_phys danh nghĩa 2 s cho bài thuần lực** (D6): số chọn theo cảm quan để scene có chuyển động; cần user thử canvas như phán quyết D2 của v0.
8. **`meta.model`** (direction/config) là mở rộng nhẹ so PhysicsResult v0 — có cần giữ Result byte-tương-thích tuyệt đối thay vì thêm field?
9. **Tái dùng compute.ts v0 cho 6 query động học** thay vì tự hiện thực ~60 dòng (§5.1): đợi P1 merge xong xem export thực tế rồi quyết ở phản biện — điều kiện là không sửa file v0.
10. **Hệ 2 vật có v0 ≠ 0** (đang chuyển động sẵn): v1 chặn (superRefine) — có đề thực nào cần không?

---

**Spec này sẽ được phản biện trước khi thi công.** Người phản biện nên kiểm lại: 11 bài tính tay (§13), tính khả thi exact một-căn của D6, không gian recognize của D9, và các quyết định §17.
