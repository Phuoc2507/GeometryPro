# Thiết kế: Advance Giải tích — Đợt 2 (Tích phân thể tích)

- **Ngày:** 2026-07-28
- **Trạng thái:** Đã duyệt thiết kế (user: "Cách A, làm luôn đi") → chuyển sang writing-plans
- **Liên quan:** spec tổng `2026-07-28-advance-calculus-mode-design.md`; Đợt 1 đã ship (`revolution.ts`, `buildRevolutionScene.js`, `AnimatedRevolutionSolid.tsx`, `splitPrompt.js`).

## 1. Bối cảnh & phạm vi

Đợt 1 (Tròn xoay) đã hoàn tất **mọi** biến thể revolution: đĩa/vành khăn quanh Ox, vỏ trụ quanh Oy, đĩa/vành khăn theo y quanh Oy. Vì vậy hai mục đầu của Đợt 2 trong spec gốc (`rev-oy` shell, `rev-between` washer) **đã có sẵn**. Đợt 2 còn lại **hai dạng thực sự mới**, người dùng đã chốt cả hai:

1. **Thiết diện đã biết S(x)** (`cross-known` → element `SliceStack`): khối có đáy là miền phẳng, thiết diện vuông góc với trục là hình vuông / tam giác đều / nửa tròn / chữ nhật; V = ∫ S(x) dx.
2. **Diện tích hình phẳng** (`area-plane` → element `AreaRegion`): S = ∫ |f(x)−g(x)| dx giữa hai đường. Là câu tích phân phổ biến nhất trong đề thi.

### Trong phạm vi
- SliceStack với **4 hình lát**: `square`, `equilateral`, `semicircle`, `rect` (rect cần tham số tỉ lệ).
- AreaRegion giữa hai đường, trục Ox (biến x). Render dạng **tấm mỏng đùn** (slab) để nhìn được trong 3D, **nhưng con số hiển thị là diện tích S**.
- Trục: Ox (biến x). SliceStack cũng cho `axis:'Oy'` nếu đề cắt vuông góc Oy (biến y) — cùng công thức, chỉ đổi tên biến; xem §4.
- Hàm biên: tái dùng nguyên `ProfileFn` (`poly`/`sqrt`/`const`/`expr`) của Đợt 1.
- Hoạt ảnh **Cách A**: N lát rời dày đặc, quét lộ dần theo `t`; KHÔNG morph hình học.

### Ngoài phạm vi (đợt này)
- Morph "kết đông" mượt (lát → khối liền) — để polish sau.
- Diện tích với biên cho theo y (x=g(y)); trục cắt xiên bất kỳ.
- Diện tích miền có nhiều hơn 2 biên / miền không đơn liên.

## 2. Nguyên tắc kiến trúc (khoá theo Đợt 1)

Không tạo đường ống mới. Tái dùng đúng khung Đợt 1:
- **LLM chỉ phân loại + rút tham số** (Pass 0, `splitPrompt.js`); **engine (kernel) dựng hình & tính số & tự-kiểm** bằng tích phân số. Số nào sai số quá ngưỡng ⇒ `verified:false`, không bịa.
- Element mới kế thừa `AdvanceFlags` ⇒ `projectScene` bóc lớp tự chạy khi thêm dòng `.map(flag)`.
- Dùng lại `AdvanceAnimControl` + state `advanceT` (thanh trượt tay = B, nút ▶ tự chạy = C), stepper, panel lời giải, camera, cờ verified, credit.
- Builder `.js` nạp kernel qua `../kernel-dist/index.mjs` (bundle đã build), KHÔNG import `.ts` nguồn. Thêm export ⇒ `npm run build:kernel` rebuild bundle.

## 3. Mô hình dữ liệu (`src/types/geometry.ts`)

```ts
// (1) Khối "thiết diện đã biết": V = ∫ k·side(t)² dt, t là toạ độ dọc trục.
export interface SliceStack extends AdvanceFlags {
  id: string;
  axis: 'Ox' | 'Oy';
  domain: [number, number];            // [a,b] theo biến trục (x nếu Ox, y nếu Oy)
  outer: ProfileFn;                    // biên "trên" của MIỀN ĐÁY theo biến trục
  inner?: ProfileFn;                   // biên "dưới"; bỏ ⇒ đáy tựa trục (side = outer)
  section: 'square' | 'equilateral' | 'semicircle' | 'rect';
  ratio?: number;                      // chỉ 'rect': cạnh vuông góc = ratio·side (mặc định 1)
  volume?: Verified<number>;
  color?: string;
  samples?: { t: number; side: number }[];   // engine tiền-lấy-mẫu cho renderer
}

// (2) Diện tích hình phẳng: S = ∫ |outer(x) − inner(x)| dx. ĐƠN VỊ² (không phải thể tích).
export interface AreaRegion extends AdvanceFlags {
  id: string;
  outer: ProfileFn;                    // đường trên f(x)
  inner: ProfileFn;                    // đường dưới g(x) (mặc định { kind:'const', c:0 })
  domain: [number, number];            // [a,b]
  area?: Verified<number>;
  color?: string;
  slabDepth?: number;                  // bề dày "tấm" khi đùn để nhìn 3D (mặc định ~0.15)
  samples?: { x: number; top: number; bot: number }[];
}
```

Thêm vào `GeometryData`:
```ts
sliceStacks?: SliceStack[];
areaRegions?: AreaRegion[];
```

**Hệ số hình lát** k trong V = ∫ k·side² dt:
| section | k | S theo cạnh side |
|---|---|---|
| square | 1 | side² |
| equilateral | √3/4 | (√3/4)·side² |
| semicircle | π/8 | (π/8)·side² (đường kính = side) |
| rect | ratio | side·(ratio·side) |

`side(t) = |outer(t) − inner(t)|` (inner vắng ⇒ `side = |outer(t)|`).

## 4. Kernel (math + tự-kiểm) — `api/_lib/kernel/analysis/sliceVolume.ts` (mới)

Tách file riêng cho rõ, cạnh `revolution.ts`. Tái dùng `compileProfile`, `sampleProfile`, `integrate` (Simpson) từ `revolution.ts`/`quadrature.ts`.

- `SECTION_K: Record<section, (ratio:number)=>number>` — hệ số k.
- `sliceStackVolume(section, outer, domain, inner?, ratio?) → { value, estimatedError }`: tích phân `k·side(t)²`.
- `buildSliceStack(id, section, outer, domain, color?, inner?, ratio?, axis?) → SliceStack`: tính V, `verified = estErr ≤ 1e-6·max(1,|V|)`, latex theo section, tiền-lấy-mẫu `samples:{t,side}`.
- `planarArea(outer, inner, domain) → { value, estimatedError }`: tích phân `|outer−inner|`.
- `buildAreaRegion(id, outer, domain, inner?, color?, slabDepth?) → AreaRegion`: tính S, verified, latex `S=\int_a^b |f(x)-g(x)|\,dx`, tiền-lấy-mẫu `samples:{x,top,bot}`.
- Export tất cả qua `kernel/index.ts`; rebuild `kernel-dist`.

**Kiểm đóng (đáp án biết trước):**
- Thiết diện vuông, đáy y=√x trên [0,4] (side=√x) ⇒ V=∫x dx=8.
- Nửa tròn cùng đáy ⇒ (π/8)·8 = π.
- Tam giác đều cùng đáy ⇒ (√3/4)·8 = 2√3.
- Diện tích giữa y=x và y=x² trên [0,1] ⇒ 1/6.

## 5. Backend / prompt

- `analyze-advance.js`: thêm 2 nhánh định tuyến cạnh `rev-ox`:
  - `split.template === 'cross-known'` → `buildSliceScene(split.templateParams)`.
  - `split.template === 'area-plane'` → `buildAreaScene(split.templateParams)`.
  - Inject `buildSliceScene`, `buildAreaScene` vào `deps` như `buildRevolutionScene`.
- `splitPrompt.js`: thêm 2 khối quy tắc + few-shot:
  - cross-known: dạy chọn `section`, `side = outer−inner`, cách lấy `domain` (nghiệm giao / cận cho sẵn), coeffs poly theo biến trục.
  - area-plane: dạy `outer` (trên), `inner` (dưới), `domain` = 2 hoành độ giao (giải outer=inner).
  - Giữ triết lý: shape lạ / không rút được ⇒ BỎ template.
- Guard fallback: thêm `looksLikeCrossSection(text)` + `looksLikeArea(text)` để khi đề "có mùi" 2 dạng này mà không ra template ⇒ trả thông báo "chưa hỗ trợ dạng này" + hoàn credit (giống `looksLikeRevolution`/`revUnsupported` của Đợt 1). Thông điệp riêng cho từng dạng.

## 6. Scene builder — `api/_lib/advance/`

- `buildSliceScene.js`: gọi `buildSliceStack`, gắn vào `base.sliceStacks`, tạo điểm mẫu cho gate `points>0`, dựng 2 bước (Câu a: hiện khối + anim `sweep`; Câu b: đáp án V verified). Mẫu khung nhìn: nếu `outer` là poly ⇒ hiện curve đáy; ngược lại điểm mẫu. (Sao khuôn `buildRevolutionScene.js`.)
- `buildAreaScene.js`: gọi `buildAreaRegion`, gắn `base.areaRegions`, hiện 2 đường f,g (poly ⇒ curve) + miền; bước đáp án gắn `area` (nhãn "Diện tích"). anim `sweep` (tô lộ trái→phải).

## 7. Render (Three.js) — `src/components/3d/`

Đăng ký trong `GeometryRenderer.tsx`; tôn trọng `hidden/dim/highlight`; dùng `advanceT`.

### `<AnimatedSliceStack>`
- Mỗi lát: `THREE.Shape` của tiết diện (dựng theo `section`) → `ExtrudeGeometry` mỏng theo trục; đặt tại `t_i` dọc domain, scale theo `side(t_i)` từ `samples`.
- Số lát cố định dày (vd 48). **Cách A**: hiện các lát có `t_i ≤ a + advanceT·(b−a)` ⇒ khối mọc dần; ở `advanceT=1` hiện đủ ⇒ trông khối đặc.
- Vật liệu `MeshPhysicalMaterial` bóng (roughness≈0.25, clearcoat) như Đợt 1. Nhận/đổ bóng.
- `axis:'Oy'` ⇒ lát dựng dọc trục Y (đổi vai x↔y khi đặt), tương tự Đợt 1 xử lý Oy.
- Hàm dựng THREE.Shape cho từng section export riêng để test thuần (không cần canvas): `sectionShape(section, side, ratio)`.

### `<AnimatedAreaRegion>`
- `THREE.Shape` viền miền: đi theo `top` (a→b) rồi `bot` (b→a) từ `samples`; `ExtrudeGeometry` sâu `slabDepth` (tấm mỏng), tâm ở z=0. Bán trong suốt nhẹ.
- Quét lộ trái→phải bằng `THREE.Plane` + `clippingPlanes` (constant = a + advanceT·(b−a)) — như reveal của revolution.
- Cũng vẽ 2 đường f,g nổi để thấy miền bị kẹp.

### Điều khiển
- Dùng lại `<AdvanceAnimControl>` + `advanceT`; step có `anim.param:'sweep'`, `autoplay:true`, `tMax = b`.

## 8. `projectScene` (`src/lib/advanceProject.ts`)
- Thêm 2 dòng: `sliceStacks: (d.sliceStacks||[]).map(flag)`, `areaRegions: (d.areaRegions||[]).map(flag)` — để hidden/dim/highlight/visibleIds áp cho element mới.

## 9. Kiểm thử
- **Kernel unit** (`sliceVolume.test.ts`): 4 đáp án đóng §4 + rect (side=√x, ratio=2 ⇒ V=2·8=16) + sai-order inner/outer cho area vẫn ra |·|.
- **Scene** (`buildSliceScene.test.js`, `buildAreaScene.test.js`): base có element + points>0; 2 bước; đáp án verified đúng số; nhãn "Thể tích"/"Diện tích".
- **projectScene** (`advanceProject.*.test.ts`): flag áp đúng cho 2 mảng mới.
- **Render smoke** (`animatedSliceStack.smoke`, `animatedAreaRegion.smoke`): mount không lỗi; `sectionShape` trả đúng số đỉnh/kích thước cho từng section.
- **splitProblem**: phân loại `cross-known`/`area-plane` + coverage.

## 10. Thứ tự triển khai trong Đợt 2
1. **SliceStack** trọn đầu-cuối: type → kernel → scene → prompt → projectScene → render → smoke. Build+test xanh, push.
2. **AreaRegion** trọn đầu-cuối: tương tự. Build+test xanh, push.

Mỗi bước theo TDD (test đỏ → code → xanh), commit thường xuyên, `npm run build` xanh trước khi đẩy `origin/main` (deploy tự động Vercel).

## 11. Rủi ro & điểm mở
- `ExtrudeGeometry` cho nửa tròn/tam giác cần đúng tâm & hướng để lát khít; test `sectionShape` chặn hồi quy.
- Slab diện tích nhìn nghiêng vẫn có thể mỏng; chọn `slabDepth` đủ dày để thấy, đủ mỏng để không giống khối.
- Ngưỡng `verified` tái dùng của Đợt 1 (1e-6 tương đối) — theo dõi với đề `expr`.
- `looksLike*` guard có thể bắt nhầm/sót; giữ regex hẹp như Đợt 1, chỉ để tránh im lặng vẽ nhầm.
