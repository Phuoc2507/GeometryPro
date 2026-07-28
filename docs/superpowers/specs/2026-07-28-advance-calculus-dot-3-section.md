# Thiết kế: Advance — Đợt 3 "Thiết diện" (SectionCut, cắt khối đa diện bằng mặt phẳng)

- **Ngày:** 2026-07-28
- **Trạng thái:** Đã chốt phạm vi (chờ user review spec) → chuyển sang writing-plans
- **Thuộc:** đề tài lớn `2026-07-28-advance-calculus-mode-design.md` §8 "Đợt 3 — Thiết diện".
- **Nối tiếp:** Đợt 1 (Tròn xoay) + Đợt 2 (SliceStack + AreaRegion) đã SHIPPED. Cùng triết lý:
  **LLM chỉ phân loại + trích tham số; kernel dựng hình + tính số + tự kiểm** (`verified`, không bịa).

## 1. Bối cảnh & mục tiêu

Đợt 3 xử lý dạng **"thiết diện của một khối bị mặt phẳng cắt"** — bài hình học không gian phổ thông
kinh điển: cho khối (chóp / lăng trụ / hộp / lập phương), một **mặt phẳng qua 3 điểm** (đỉnh hoặc
trung điểm cạnh), yêu cầu **dựng đa giác thiết diện** và (thường) **tính diện tích**.

Khác hẳn Đợt 2 `SliceStack` ("thể tích theo thiết diện đã biết S(x)" — tích phân): ở đây thiết diện là
**một đa giác phẳng cụ thể** = giao của mặt phẳng với khối, diện tích tính **chính xác** (shoelace 3D),
không phải tích phân số.

### Phạm vi ĐÃ CHỐT (2 quyết định của user)
- **Chỉ khối ĐA DIỆN** trước: `cube` (lập phương), `box` (hộp chữ nhật), `pyramid-quad`
  (chóp đáy chữ nhật/vuông, đỉnh trên tâm đáy), `prism-tri` (lăng trụ đứng đáy tam giác đều).
  → thiết diện luôn là **đa giác lồi phẳng**, diện tích chính xác.
- **Mặt phẳng QUA 3 ĐIỂM** (`mp(MNP)`), mỗi điểm = một đỉnh **hoặc** một điểm trên cạnh
  (trung điểm, hoặc tỉ số t∈[0,1] dọc cạnh). Đây là dạng ra đề phổ biến nhất ở VN.

### Ngoài phạm vi (để sub-đợt sau)
- **Khối tròn xoay** (trụ/nón/cầu): thiết diện là **đường cong** (elip/tròn/parabol/hypebol) — engine
  + renderer khác hẳn. Không làm đợt này.
- Mặt phẳng "qua điểm, song song mp/đường" và "điểm + pháp tuyến" — **hoãn** (chỉ làm "qua 3 điểm").
  (Kiểu dữ liệu để mở, nhưng builder + prompt chỉ nhận 3-điểm ở đợt này.)
- Dựng thiết diện kiểu "kéo dài tìm giao tuyến từng bước" (minh hoạ lời giải cổ điển). Đợt này chỉ
  hiện **đa giác kết quả** + hoạt ảnh lộ dần; construction từng bước là follow-up.
- Bài không khớp 4 khối trên ⇒ báo thẳng "chưa dựng được" + hoàn credit (cơ chế `revUnsupported` sẵn có).

## 2. Trải nghiệm người dùng
1. Dán đề thiết diện (text/ảnh), chọn **Advance**, bấm vẽ — như hiện tại.
2. App nhận dạng `section-poly`, trích khối + kích thước + 3 điểm xác định mặt phẳng; **engine dựng khối
   khung dây + đa giác thiết diện + tính diện tích + tự kiểm**.
3. Vẽ **một hình 3D**: khối khung dây (mờ) + 3 điểm xác định (nổi) + **đa giác thiết diện tô nổi**;
   kéo thanh trượt / bấm ▶ để **lộ dần** đa giác; xoay 3D bằng chuột.
4. Bấm qua từng câu trên stepper (nếu đề đa câu) — tức thì, không gọi lại API.

## 3. Mô hình dữ liệu (`src/types/geometry.ts`)

Thêm **một** element mới kế thừa `AdvanceFlags` ⇒ bóc-lớp chạy tự động khi thêm một dòng `.map(flag)`
trong `advanceProject.ts` (giống Đợt 1/2).

```ts
// ── Calculus Đợt 3: thiết diện = mặt phẳng ∩ khối đa diện ───────────
// Cách xác định điểm tạo mặt phẳng: đỉnh có tên, HOẶC điểm trên cạnh (t∈[0,1] từ v1→v2; 0.5 = trung điểm).
export type SectionPointSpec =
  | { vertex: string }                              // 'A', 'S', "C'"…
  | { onEdge: [string, string]; t: number };        // t·(v2−v1)+v1; t=0.5 ⇒ trung điểm

export type PolyhedronKind = 'cube' | 'box' | 'pyramid-quad' | 'prism-tri';

// Thiết diện đa giác: engine dựng đỉnh polygon (đã sắp thứ tự vòng) + diện tích tự kiểm.
export interface SectionCut extends AdvanceFlags {
  id: string;
  targetKind: PolyhedronKind;                       // khối bị cắt (chỉ để hiển thị/nhãn)
  polygon: [number, number, number][];              // đỉnh đa giác thiết diện, thứ tự vòng (engine dựng)
  plane: { point: [number, number, number]; normal: [number, number, number] }; // mp cắt (đã chuẩn hoá)
  area?: Verified<number>;
  color?: string;
}
```

Thêm vào `GeometryData`: `sectionCuts?: SectionCut[];` (ngay sau `areaRegions?`).

> Khối đa diện KHÔNG cần type mới: dựng bằng **điểm có tên** (`Point3D` A/B/C/D/S/A'…) + **cạnh**
> (`Line3D`) đưa vào `base.points`/`base.lines` — renderer hiện có vẽ sẵn. 3 điểm xác định mp cũng là
> `Point3D` (nhãn M/N/P hoặc tên đỉnh), đặt `highlight` ở bước thiết diện. `plane` lưu để (tuỳ chọn)
> vẽ mặt phẳng mờ; v1 mặc định KHÔNG vẽ mặt phẳng lớn (tránh z-fighting), chỉ vẽ đa giác.

## 4. Kernel — `api/_lib/kernel/analysis/sectionCut.ts` (mới)

Thuần, tất định, có test đóng. Export qua `kernel/index.ts` + rebuild `kernel-dist` (bắt buộc trước khi
`.js` builder dùng được).

### 4.1 Thư viện khối chuẩn
```ts
type Poly = {
  vertices: Record<string, [number, number, number]>;
  edges: [string, string][];
  faces: string[][];                 // mỗi mặt = danh sách đỉnh theo vòng (để cắt)
};
export function buildPolyhedron(kind: PolyhedronKind, dims: { a?: number; b?: number; c?: number; h?: number }): Poly;
```
Toạ độ chuẩn (đáy z=0, "đẹp" cho camera):
- `cube` (cạnh a): A(0,0,0) B(a,0,0) C(a,a,0) D(0,a,0); A'B'C'D' cùng x,y ở z=a. 12 cạnh, 6 mặt.
- `box` (a,b,c): như cube nhưng x∈a, y∈b, z∈c.
- `pyramid-quad` (đáy a×b, cao h): A(0,0,0) B(a,0,0) C(a,b,0) D(0,b,0), S(a/2,b/2,h).
  8 cạnh (đáy ABCD + SA,SB,SC,SD), 5 mặt (đáy + 4 tam giác bên).
- `prism-tri` (đáy tam giác đều cạnh a, cao h): A(0,0,0) B(a,0,0) C(a/2, a·√3/2, 0); A'B'C' ở z=h.
  9 cạnh, 5 mặt (2 tam giác + 3 chữ nhật).

### 4.2 Giải điểm & dựng mặt phẳng
```ts
export function resolveSectionPoint(poly: Poly, spec: SectionPointSpec): [number, number, number];
// vertex ⇒ poly.vertices[name]; onEdge ⇒ lerp(v1,v2,t).
export function planeFrom3(p: number[][]): { point: number[]; normal: number[] } | null;
// normal = (p1−p0)×(p2−p0); ‖normal‖≈0 (3 điểm thẳng hàng) ⇒ null.
```

### 4.3 Cắt lồi → đa giác thiết diện
```ts
export function sliceConvexPolyhedron(poly: Poly, point: number[], normal: number[]): number[][];
```
Thuật toán (khối lồi ⇒ thiết diện là đa giác lồi):
1. Signed distance mỗi đỉnh: `d(v) = normal·(v − point)`.
2. Với **mỗi cạnh** (u,v): nếu `d(u)·d(v) < 0` ⇒ điểm giao `u + d(u)/(d(u)−d(v))·(v−u)`; nếu một đỉnh
   nằm trên mp (`|d|<EPS`) ⇒ thêm chính đỉnh đó (khử trùng lặp bằng làm tròn toạ độ ~1e-6).
3. Gom các điểm giao, **sắp theo vòng**: chiếu lên mp (2 vector trực chuẩn trong mp), sắp theo góc quanh
   trọng tâm. Trả danh sách đã sắp (≥3 điểm) hoặc `[]` (mp không cắt qua trong khối).

### 4.4 Diện tích + tự kiểm
```ts
export function polygonArea3D(poly: number[][]): number;         // Newell: ½‖Σ vi×vi+1‖
export function buildSectionCut(
  id: string, kind: PolyhedronKind, dims, specs: SectionPointSpec[], color?: string,
): { sectionCut: SectionCut; poly: Poly } | null;
```
`buildSectionCut`:
- Dựng `poly`; giải 3 điểm; `planeFrom3` (null nếu thẳng hàng ⇒ trả null).
- `sliceConvexPolyhedron` → polygon; <3 đỉnh ⇒ trả null (mp không tạo thiết diện thật).
- **Diện tích 2 cách độc lập**: (A) Newell `polygonArea3D`; (B) tổng tam giác quạt từ đỉnh 0.
  `verified = |A−B| ≤ 1e-9·max(1,A)` **và** mọi đỉnh đồng phẳng (`|d|<1e-6` — đúng theo dựng).
- `latex = 'S_{thi\\text{ế}t\\,di\\text{ệ}n}=…'` (giá trị + đơn vị²); `area: Verified<number>`.
- Trả về `sectionCut` + `poly` (để builder lấy điểm/cạnh khối + 3 điểm xác định).

## 5. Scene builder — `api/_lib/advance/buildSectionScene.js` (mới)

Khuôn theo `buildSliceScene.js`. `params = { kind, dims, points: SectionPointSpec[3], parts, color? }`.
```
1. cut = buildSectionCut('sec1', kind, dims, points, '#f59e0b'); null ⇒ return null (→ fallback/guard).
2. base = { name, points:[…đỉnh khối có nhãn…], lines:[…cạnh khối…], curves:[], planes:[] }.
   + thêm 3 điểm xác định mp (nhãn 'M','N','P' hoặc tên đỉnh) vào base.points.
   base.sectionCuts = [cut.sectionCut].
3. outlineIds = tất cả id đỉnh khối + id cạnh khối; ptIds = 3 điểm xác định.
4. steps:
   - s0 "Dựng mặt phẳng cắt": visibleIds=[…khối…, …3 điểm…], highlightIds=[…3 điểm…].
       (chưa hiện đa giác — cho người xem thấy 3 điểm trước.)
   - s1 "Thiết diện" (+ diện tích): visibleIds=[…khối…, …3 điểm…, 'sec1'], highlightIds=['sec1'],
       anim={ param:'reveal', label:'Lộ thiết diện', tMax:1, autoplay:true },
       answer={ text:S.latex, approx:S.value, verified:S.verified }.
```
Đề 1 câu ⇒ vẫn 2 bước (dựng mp → thiết diện). Đề nhiều câu (a: diện tích, b: …) map theo `parts`.

## 6. Renderer — `src/components/3d/AnimatedSectionCut.tsx` (mới)

Đăng ký trong `GeometryRenderer.tsx`; map `geometry.sectionCuts`. Tôn trọng `hidden/dim/highlight`.
- **Đa giác thiết diện**: `THREE.Shape` từ `polygon` chiếu vào **mặt phẳng của nó** (2 vector trực chuẩn
  u,v trong mp; toạ độ 2D = (P·u, P·v)), `ShapeGeometry`, đặt lại vào 3D bằng ma trận cơ sở (u,v,normal)
  + gốc `point`. `MeshBasicMaterial`/`MeshStandardMaterial` **hai mặt, nửa trong suốt** (opacity ~0.55;
  dim ⇒ ~0.2) màu nổi + **viền** (`LineLoop` các đỉnh) đậm.
- **Lộ dần (param 'reveal')**: cắt theo **một trục trong mp** — `gl.localClippingEnabled=true`, một
  `THREE.Plane` pháp tuyến = u (một vector trong mp), hằng số quét từ `min(P·u)`→`max(P·u)` theo
  `advanceT` (giống `AnimatedAreaRegion` nhưng trong mặt phẳng thiết diện). `advanceT=1` ⇒ hiện trọn.
- **Geometry dựng SẴN 1 lần trong `useMemo`** (keyed trên polygon+plane), dispose khi đổi/unmount —
  theo bài học rò rỉ ở `AnimatedSliceStack` (không dựng lại mỗi frame).
- v1 **không** vẽ mặt phẳng cắt lớn (tránh z-fighting); chỉ đa giác + viền. (`plane` để dành mở sau.)

`AdvanceAnimControl` sẵn có tự hiện khi step có `anim` — không cần sửa.

## 7. Backend routing — `api/analyze-advance.js` + `splitPrompt.js`

- **Template mới `section-poly`.** Trong `assembleAdvance`, thêm nhánh (sau `area-plane`):
  `if (split.template === 'section-poly' && split.templateParams && deps.buildSectionScene) { try { scene = deps.buildSectionScene(...); if (scene) return {mode:'advance',scene}; } catch {} }`.
  Nạp động `buildSectionScene` vào `Promise.all` + deps (giống buildSliceScene/buildAreaScene).
- **Guard tất định `looksLikeSection(text)`** (chống vẽ-bừa khi classifier trượt): cần **từ khối**
  (`chóp|lăng trụ|hộp|lập phương|tứ diện`) **và** **tín hiệu cắt** (`thiết diện|cắt bởi|mặt phẳng|mp\s*\(`).
  Đặt **TRƯỚC** `looksLikeCrossSection` (Đợt 2) — vì đề chóp có thể chứa "hình vuông/tam giác" ở đáy,
  dễ bị cross-known nuốt nhầm; section-poly cần khối+cắt nên đặc trưng hơn, ưu tiên bắt trước. Trả
  `{ mode:'kernel', degraded:true, ok:false, revUnsupported:true, error: SECTION_UNSUPPORTED_MSG }`
  ⇒ handler hoàn TOÀN BỘ credit (như tròn xoay/Đợt 2).
- `SECTION_UNSUPPORTED_MSG`: "Mình nhận ra đây là bài thiết diện của khối đa diện nhưng chưa dựng được.
  Bạn thử ghi rõ khối (chóp/lăng trụ/hộp/lập phương) và 3 điểm xác định mặt phẳng cắt giúp mình nhé."
- **`splitPrompt.js`**: thêm luật `section-poly` + `templateParams` shape
  `{ kind:'cube'|'box'|'pyramid-quad'|'prism-tri', dims:{a?,b?,c?,h?}, points:[p1,p2,p3] }` với mỗi
  `p = {vertex:'A'}` hoặc `{onEdge:['A','B'], t:0.5}`; **2 ví dụ few-shot**:
  - **Ví dụ 11**: "Cho hình lập phương ABCD.A'B'C'D' cạnh a. Mặt phẳng qua 3 trung điểm của AB, AD, AA'.
    Tính diện tích thiết diện." ⇒ `{template:'section-poly', templateParams:{kind:'cube', dims:{a:1},
    points:[{onEdge:['A','B'],t:0.5},{onEdge:['A','D'],t:0.5},{onEdge:['A',"A'"],t:0.5}]}}`
    (thiết diện = tam giác đều cạnh a/√2, S = (√3/8)a²; với a=1 ⇒ ~0.2165).
  - **Ví dụ 12**: "Cho hình chóp S.ABCD đáy là hình vuông cạnh a, SA vuông góc đáy, SA=a. Mặt phẳng qua A
    và trung điểm của SB, SD…" ⇒ `{kind:'pyramid-quad', dims:{a:1,b:1,h:1},
    points:[{vertex:'A'},{onEdge:['S','B'],t:0.5},{onEdge:['S','D'],t:0.5}]}`.
  - Kích thước biểu tượng (a=1 khi đề để "a"): engine dùng số; đáp án hiển thị bằng số (đơn vị²) —
    THANG CHỮ theo a² là follow-up nếu cần, KHÔNG làm ở đợt này.

## 8. Kiểm thử (TDD từng task)
- **Kernel `sectionCut.test.ts`**: (a) `buildPolyhedron` đủ đỉnh/cạnh/mặt mỗi kind; (b) `resolveSectionPoint`
  vertex + midpoint; (c) `planeFrom3` null khi thẳng hàng; (d) **đáp án đóng**: lập phương a=1 cắt qua 3
  trung điểm AB,AD,AA' ⇒ tam giác đều, S=√3/8 (verified); (e) mp song song đáy cắt hộp ⇒ hình chữ nhật đúng
  diện tích; (f) mp không cắt trong khối ⇒ `[]`/null; (g) `verified=false`-path khi 3 điểm suy biến.
- **`advanceProject` (Đợt 3)**: `sectionCuts` map `flag` đúng hidden/dim/highlight qua các bước.
- **`buildSectionScene.test.js`**: kind hợp lệ ⇒ base có đỉnh+cạnh khối + 3 điểm + `sectionCuts[0]`;
  2 steps đúng visible/highlight/anim/answer; kind lạ / 3 điểm suy biến ⇒ trả null.
- **`analyze-advance.test.js`**: template `section-poly` → gọi `buildSectionScene`; `looksLikeSection`
  bắt đúng, đặt trước cross-known; `revUnsupported` ⇒ hoàn credit.
- **Smoke render `animatedSectionCut.smoke.test.tsx`**: hàm thuần (chiếu polygon→2D, cơ sở mp, lộ theo
  advanceT) chạy không lỗi, số đỉnh đúng.
- **Build gate `npm run build` phải xanh** trước khi push (rebuild `kernel-dist` sau khi thêm export).

## 9. Phân task (writing-plans sẽ chi tiết hoá)
1. Type `SectionCut` + `sectionCuts?` + `advanceProject` map `flag`.
2. Kernel `sectionCut.ts`: `buildPolyhedron` + `resolveSectionPoint` + `planeFrom3`.
3. Kernel: `sliceConvexPolyhedron` + `polygonArea3D` + `buildSectionCut` (tự kiểm) + export + rebuild dist.
4. Builder `buildSectionScene.js` (2 bước).
5. Routing `analyze-advance.js` (`section-poly` + `looksLikeSection` + deps) + `splitPrompt.js` (luật + Ví dụ 11/12).
6. Renderer `AnimatedSectionCut.tsx` + đăng ký `GeometryRenderer.tsx`.

Mỗi task: red test → xanh → build gate → **push origin/main** (auto-deploy Vercel, theo "luôn push").
Phương pháp: **subagent-driven-development** (fresh subagent/​task + spec-review + code-review).

## 10. Rủi ro & điểm mở
- **Sắp đỉnh đa giác** sai thứ tự ⇒ đa giác tự cắt / diện tích sai: đã chốt dùng góc-quanh-trọng-tâm trong
  mp; cross-check 2 công thức diện tích bắt lỗi này (verified=false nếu lệch).
- **Điểm nằm đúng trên đỉnh/cạnh** (d≈0): khử trùng lặp bằng làm tròn toạ độ; test case đỉnh-trên-mp.
- **Chiếu polygon ↔ 3D** cho render dễ lệch cơ sở: viết hàm thuần + test số đỉnh/đồng phẳng.
- **Nhầm template với Đợt 2** (cross-known): guard `looksLikeSection` đặt trước + prompt phân biệt rõ
  "thể tích theo thiết diện đã biết" (Đợt 2) vs "diện tích thiết diện khi cắt khối" (Đợt 3).
- **Chưa nhìn tận mắt render** (route Advance chặn auth) — như Đợt 1/2, sẽ nhờ user thử prod sau khi ship.
