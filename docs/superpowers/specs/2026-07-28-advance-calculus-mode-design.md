# Thiết kế: Mở rộng Advance sang 3 dạng Giải tích (Tròn xoay · Tích phân thể tích · Thiết diện)

- **Ngày:** 2026-07-28
- **Trạng thái:** Đã duyệt thiết kế (chờ user review bản spec) → chuyển sang writing-plans
- **Liên quan:** `advance-mode-design.md` (2026-07-20), các plan `analysis-engine-*` (2026-07-17), engine `api/_lib/kernel/analysis/`

## 1. Bối cảnh & mục tiêu

Advance hiện xử lý **hình không gian rời rạc** (điểm/đường/mặt/cầu) từ đề cổ điển, với khả năng **đa-câu bóc lớp** (câu a/b/c dùng chung một hình, một hệ toạ độ). Ta mở rộng Advance để hiểu thêm **ba dạng giải tích phổ thông**:

1. **Tròn xoay** — quay một miền phẳng quanh trục để tạo khối.
2. **Tích phân thể tích** — tính thể tích bằng cách "xếp lát" (đĩa/vỏ/washer, và thiết diện đã biết S(x)).
3. **Thiết diện** — cắt một khối bằng mặt phẳng, dựng đa giác giao.

Không tạo mode mới; **mở rộng chính AdvanceScene** để một đề trộn câu (a: vẽ khối, b: tính V, c: thiết diện) chạy trong **cùng một cảnh, cùng hệ toạ độ**, giữ nguyên stepper / panel lời giải / camera / cờ verified / credit.

### Mục tiêu chất lượng (không thoả hiệp)
- Khối render **mượt, bóng (glossy), lưới mịn, đổ bóng mềm** — đẹp như đồ hoạ, không phải khối "gạch" thô.
- **Engine tính & tự kiểm** mọi con số (thể tích/diện tích) bằng tích phân số; câu không kiểm được ⇒ `verified:false` ("chưa kiểm chứng"), **không bịa**.
- Tương tác **B + C**: cùng một khối vừa **kéo thanh trượt bằng tay**, vừa **bấm ▶ tự chạy**.

## 2. Phạm vi

### Trong phạm vi — thư viện ~8 mẫu lõi

| # | Mã mẫu | Dạng bài | AI rút tham số | Element sinh |
|---|--------|----------|----------------|--------------|
| 1 | `rev-ox` | Quay miền dưới f(x) quanh Ox | f, [a,b] | RevolutionSolid(disk) |
| 2 | `rev-oy` | Quay miền quanh Oy | f, [a,b] | RevolutionSolid(shell) |
| 3 | `rev-between` | Quay miền giữa f(x) và g(x) | f, g, [a,b], trục | RevolutionSolid(washer) |
| 4 | `cross-known` | Thể tích theo thiết diện đã biết S(x) | miền đáy, hình lát, sizeFn | SliceStack |
| 5 | `section-pyramid` | Thiết diện hình chóp | mp (qua điểm / song song) | SectionCut |
| 6 | `section-prism` | Thiết diện lăng trụ / hộp / lập phương | mp | SectionCut |
| 7 | `section-round` | Thiết diện khối tròn xoay (trụ/nón/cầu) | mp | SectionCut |
| 8 | `rev-region` *(dự phòng)* | Quay miền nhiều biên | các biên, trục | RevolutionSolid |

Hàm hỗ trợ ban đầu: đa thức (bậc ≤3 có kiểu riêng, ≥4 dùng hệ số thô), `sqrt`, và mở dần `sin/cos/exp/ln` khi cần. Trục ban đầu: **Ox, Oy** (trục tuỳ ý là mở rộng sau).

### Ngoài phạm vi (non-goals đợt này)
- Trục quay xiên bất kỳ; quay quanh đường thẳng ≠ Ox/Oy.
- Mặt tham số tổng quát (do người dùng mô tả tự do) — ta chỉ dùng thư viện mẫu.
- Bài giải tích không thuộc 8 mẫu ⇒ báo "chưa hỗ trợ dạng này" + fallback về vẽ kỹ (như cơ chế `degraded` hiện có).
- Diện tích mặt tròn xoay (chỉ làm thể tích ở đợt này).

## 3. Trải nghiệm người dùng (4 bước)

1. **Dán đề** giải tích (text/ảnh), chọn **Advance**, bấm vẽ — như hiện tại.
2. App **nhận ra dạng** (đối chiếu ~8 mẫu), tách câu a/b/c, **tự tính & tự kiểm** đáp án.
3. Vẽ **một hình 3D** mượt bóng: **kéo thanh trượt** hoặc **bấm ▶** để xem khối dựng dần; xoay 3D bằng chuột.
4. **Bấm qua từng câu** a/b/c trên stepper: chuyển câu **tức thì, không gọi lại API**.

## 4. Mô hình dữ liệu

Mở rộng `GeometryData` (`src/types/geometry.ts`) bằng **3 mảng phần tử mới**, mỗi phần tử có `id` và kế thừa `AdvanceFlags` ⇒ `projectScene` bóc-lớp chạy tự động khi thêm 3 dòng `.map(flag)`.

```ts
// Hàm biên tái dùng Curve3D (parabola/cubic) + mở thêm kiểu.
type ProfileFn =
  | { kind: 'poly'; coeffs: number[] }         // c0..cn
  | { kind: 'sqrt'; a: number; b: number }     // a*sqrt(x)+b (mở dần)
  | { kind: 'const'; c: number };

// Kết quả engine tính + tự kiểm (khớp triết lý anti-hallucination).
interface Verified<T> { value: T; latex: string; verified: boolean; estimatedError?: number }

// (1)(2)(3)(8) Khối tròn xoay — dùng cho tròn xoay & tích phân thể tích đĩa/vỏ/washer.
interface RevolutionSolid extends AdvanceFlags {
  id: string;
  outer: ProfileFn;             // biên ngoài
  inner?: ProfileFn;            // biên trong (washer / giữa 2 đường)
  axis: 'Ox' | 'Oy';
  domain: [number, number];     // [a,b]
  method: 'disk' | 'washer' | 'shell';
  volume?: Verified<number>;
  color?: string;
}

// (4) Khối "thiết diện đã biết" V = ∫S(x)dx.
interface SliceStack extends AdvanceFlags {
  id: string;
  axis: 'Ox' | 'Oy';
  domain: [number, number];
  section: 'square' | 'equilateral' | 'semicircle' | 'rect' | 'disk';
  sizeFn: ProfileFn;            // cạnh/bán kính lát theo vị trí trục
  volume?: Verified<number>;
  color?: string;
}

// (5)(6)(7) Thiết diện — mặt phẳng cắt một khối.
type PlaneSpec =
  | { kind: 'throughPoints'; pointIds: string[] }
  | { kind: 'pointNormal'; point: [number,number,number]; normal: [number,number,number] }
  | { kind: 'throughParallel'; throughId: string; parallelToIds: string[] };
interface SectionCut extends AdvanceFlags {
  id: string;
  targetId: string;            // id khối bị cắt (chóp/hộp/trụ/nón/cầu/RevolutionSolid)
  plane: PlaneSpec;
  polygon: ([number,number,number])[];  // đỉnh đa giác thiết diện — engine dựng
  area?: Verified<number>;
  color?: string;
}
```

Thêm vào `GeometryData`:
```ts
revolutionSolids?: RevolutionSolid[];
sliceStacks?: SliceStack[];
sectionCuts?: SectionCut[];
```
> Ghi chú: đã có `Surface3D` + `surfaces?` trong type. Ta **không** nhồi vào Surface3D vì các dạng này cần tham số riêng (miền tích phân, method, plane) và animation; tách type mới cho rõ ràng, dễ test độc lập.

### Animation hợp nhất B + C — một tham số `t`
Mỗi `AdvanceStep` mang thêm trục tiến trình chuẩn hoá:
```ts
interface AdvanceStep {
  /* ...visibleIds, answer, solution, timeline (đang có)... */
  anim?: {
    param: 'sweep' | 'angle' | 'slab' | 'reveal';  // ý nghĩa của t
    label: string;      // "Quét đĩa", "Góc quay", "Vị trí lát x"
    tMax: number;       // giá trị thực khi t=1 (b, hoặc 360°)
    autoplay?: boolean; // C: tự chạy khi mở câu
  };
}
```
- `t ∈ [0,1]` duy nhất cho mỗi câu. **Thanh trượt kéo tay = B**; **nút ▶ tự tăng t theo thời gian = C**. Một t, hai cách điều khiển.
- `t` **thuần client**, không đụng undo/redo hay API — giống `setStep` đổi câu.
- Mỗi phần tử tự diễn giải `t` (xem §5).

## 5. Rendering (Three.js) — "xếp lát rồi kết đông"

Các component mới trong `src/components/3d/`, đăng ký trong `GeometryRenderer.tsx`, đều tôn trọng `hidden/dim/highlight`.

### Chất liệu chung (mượt & bóng)
- `MeshPhysicalMaterial` / `MeshStandardMaterial`: `roughness≈0.25`, `metalness≈0.05`, `clearcoat` nhẹ, `envMap` để có phản chiếu; hai mặt (`side: DoubleSide`) khi cần.
- Lưới mịn: LatheGeometry `segments≥64`; bo pháp tuyến (`computeVertexNormals`) cho mặt liền, không thấy cạnh gãy.
- Đổ bóng mềm (soft shadow) đã có trong scene — bật nhận/đổ bóng cho khối mới.

### RevolutionSolid → `<AnimatedRevolutionSolid>`
- **t=1 (kết quả):** dựng `LatheGeometry` từ profile (mẫu outer/inner theo domain) → **mặt cong liền, bóng**. Washer = hai lathe (ngoài trừ trong) hoặc lathe có lỗ.
- **Khi đang chạy (t<1, param 'sweep'):** hiển thị **các đĩa/vỏ mỏng** dựng dần tới vị trí `a + t·(b−a)` để **dạy ý tưởng tích phân**. Đĩa dùng material hơi trong.
- **Kết đông:** khi `t→1`, số lát tăng dần và **morph/blend** sang một khối lathe liền bóng (crossfade opacity + tăng segment). Người dùng thấy "lát tan vào nhau".
- Nhãn thể tích + LaTeX hiện khi câu tương ứng có `volume` (badge verified).

### SliceStack → `<AnimatedSliceStack>`
- Mỗi lát là một prism mỏng có tiết diện `section` (vuông/tam giác đều/nửa tròn…), kích thước theo `sizeFn`. Cùng cơ chế "xếp lát → kết đông" thành khối liền mượt ở `t=1`.

### SectionCut → `<AnimatedSectionCut>`
- Vẽ khối `targetId` mờ (dim), **mặt phẳng cắt** (nửa trong suốt), và **đa giác thiết diện** tô nổi (highlight) từ `polygon`.
- Dùng `THREE.Plane` + `clippingPlanes` để "khoét" khối minh hoạ, hoặc chỉ tô đa giác + mặt phẳng nếu clipping quá nặng.
- `param 'slab'/'reveal'`: trượt mặt phẳng dọc trục / lộ dần đa giác khi kéo `t`.

### Điều khiển tương tác
- Component nổi `<AdvanceAnimControl>` (gần `AdvanceStepper`): thanh trượt `t` + nút ▶/⏸ + nhãn `anim.label` và giá trị thực (`t·tMax`). Chỉ hiện khi step hiện tại có `anim`. `autoplay` ⇒ chạy khi mở câu.
- Lưu `t` ở context (per-step) song song `currentStep`; đổi câu reset `t` về 0 (hoặc 1 nếu câu tĩnh).

## 6. Backend pipeline

Tái dùng khung `api/analyze-advance.js` + `api/_lib/advance/` và engine `api/_lib/kernel/analysis/`.

1. **transcribeImage** *(nếu ảnh)* — giữ nguyên.
2. **splitProblem (Pass 0) — mở rộng:** ngoài `multi_question | continuous_animation | single`, thêm nhận dạng **mã mẫu giải tích** cho từng phần: mỗi `part` có thể mang `template: 'rev-ox' | ... | null`. Vẫn giữ kiểm phủ (coverage) chống bỏ sót câu.
3. **buildAdvanceScene (Pass 1) — mở rộng:** với part có `template`, gọi **kernel analysis** để:
   - rút tham số (hàm, cận, trục, mặt phẳng) — tái dùng `polyfit`, `analysisFigure` mở rộng;
   - **dựng element** (RevolutionSolid/SliceStack/SectionCut) vào `base`;
   - **tính & tự kiểm** thể tích/diện tích bằng `quadrature`/`solids` → `Verified<T>`;
   - gán `visibleIds` tích luỹ + `anim` cho step.
4. Trả `{ mode:'advance', scene }` như hiện tại. Part không khớp mẫu ⇒ `verified:false` hoặc rơi về single-solve (`degraded`, hoàn credit) — cơ chế sẵn có.

### Anti-hallucination
- LLM **chỉ** phân loại mẫu + rút tham số; **engine dựng hình & tính số**. 
- Con số nào không qua kiểm tích phân số (sai số > ngưỡng) ⇒ `verified:false`. UI hiện badge "chưa kiểm chứng" thay vì đáp án giả.

## 7. Kiểm thử

- **Kernel (unit):** mở rộng `api/_lib/kernel/analysis/__tests__/` — thể tích đĩa/vỏ/washer với đáp án đóng đã biết (vd quay y=√x quanh Ox trên [0,4] ⇒ 8π); thiết diện đã biết S(x); diện tích thiết diện chóp/hộp cơ bản. So sai số quadrature < ngưỡng.
- **projectScene:** thêm case cho 3 mảng element mới (hidden/dim/highlight) trong `src/lib/__tests__/advanceProject.test.ts`.
- **splitProblem:** case phân loại đúng mẫu + coverage cho đề trộn câu.
- **Render (smoke):** mount component với dữ liệu mẫu, kiểm không lỗi + số segment/material đúng.
- **E2E thủ công:** đề trộn a/b/c trên dev server (:8080), kiểm kéo/play + bấm câu.

## 8. Phân đợt triển khai

- **Đợt 1 — Tròn xoay quanh Ox (đĩa), trọn vẹn đầu-cuối.** Type + `projectScene` + kernel verify thể tích + `<AnimatedRevolutionSolid>` (kéo/play/kết đông) + `<AdvanceAnimControl>` + splitProblem nhận `rev-ox` + buildAdvanceScene dựng element. Mục tiêu: **chạy thông cả đường ống** với một mẫu.
- **Đợt 2 — Tích phân thể tích.** `rev-oy` (shell), `rev-between` (washer), `cross-known` (SliceStack). Nhấn mạnh kiểm thể tích + xếp lát kết đông cho cả slice stack.
- **Đợt 3 — Thiết diện.** `section-pyramid/prism/round` + `<AnimatedSectionCut>` + dựng đa giác giao (plane × solid). Khó nhất về hình học, làm sau cùng.

Mỗi đợt: có test kernel + smoke render, build phải xanh trước khi push (deploy tự động qua Vercel).

## 9. Rủi ro & điểm mở
- **"Kết đông" mượt** (morph lát → lathe) có thể tốn công tinh chỉnh; fallback: crossfade opacity đơn giản nếu morph hình học quá nặng.
- **Clipping thiết diện** có thể nặng/nhiều lỗi z-fighting; fallback: chỉ tô đa giác + mặt phẳng, không khoét khối.
- **Trục Oy (shell)** cần cẩn thận đổi vai trò x↔y trong profile.
- Ngưỡng sai số `verified` cần calibrate theo vài đề thật.
- Số hàm hỗ trợ ban đầu hẹp (đa thức + sqrt); mở thêm khi gặp đề thực tế.
