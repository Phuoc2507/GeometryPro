# Vẽ nhanh & Vẽ kỹ — Đường cong biểu thức, Miền tô & Khối tròn xoay mượt (expr curves)

**Ngày:** 2026-07-30
**Phạm vi:** **Vẽ nhanh + Vẽ kỹ** (`drawMode: "quick"` và `"detailed"`) — **cùng** route `api/analyze-geometry.js`, cùng `BASE_PROMPT`. (Advance có route riêng `analyze-advance.js`, đã tự vẽ mượt — không đụng.)
**Mục tiêu 1 câu:** Cho Vẽ nhanh **và Vẽ kỹ** vẽ **mọi đồ thị `y=f(x)` mượt** (kể cả `e^{x/2}·√x`, ln, lượng giác, phân thức), **tô đúng miền phẳng giới hạn bởi 2 đường**, và **dựng khối tròn xoay 3D mượt (bán trong suốt)** — thay cho polyline 3 điểm gãy khúc + nhãn rối hiện nay.

---

## 1. Bối cảnh & vấn đề

Ảnh người dùng gửi: bài `V = ∫ π·(e^{x/2}√x)² dx` quay quanh Ox trên [1,2], render ở Vẽ nhanh ra **đường gãy khúc 3 điểm** + nhãn phụ rối (P′/P″/Q′/M_top…), **không có khối 3D**. Con số thì đúng.

**Nguyên nhân gốc (đã map pipeline):**
- Route sống: `POST /api/analyze-geometry` — Vẽ nhanh (`quick`) và Vẽ kỹ (`detailed`) **chung route**, chung `BASE_PROMPT`, khác đuôi LEVEL. Thử kernel tất định (chỉ khối cổ điển) → rớt xuống LLM Gemini 3.5 Flash low.
- Prompt bảo model xuất **điểm + cạnh thẳng**; chưa bao giờ dạy nó vẽ đường cong mượt.
- `Curve3D` hiện chỉ có `type: 'parabola' | 'cubic' | 'rational'` → **không biểu diễn được** `e^{x/2}√x`.
- `lines` render bằng đoạn thẳng 2 đầu (`AnimatedLine`) → gãy khúc.

**Đòn bẩy có sẵn (khiến hướng này rẻ):**
- Kernel `compileProfile(ProfileFn)` — `api/_lib/kernel/analysis/revolution.ts:10` — parse mọi biểu thức 1 biến qua `parseExpr` (`exp`, `sqrt`, `ln`, lượng giác, phân thức…), bind cả `{x,y}`.
- Kernel `sampleProfile(outer, domain, n=64)` — `revolution.ts:42` — lấy mẫu ProfileFn thành `{x,r}[]` "để frontend dựng hình mà KHÔNG cần parser".
- Quy ước "engine tính mẫu, frontend vẽ mảng" đã dùng cho `RevolutionSolid.samples`.
- Renderer **đã có sẵn, render ở MỌI chế độ** (không gate Advance): `curves→AnimatedCurve`, `revolutionSolids→AnimatedRevolutionSolid` (Lathe), `areaRegions→AnimatedAreaRegion` (ExtrudeGeometry giữa 2 đường) — `GeometryRenderer.tsx:397-410`.

→ Ta mở rộng đúng theo quy ước sẵn có: **server lấy mẫu, frontend vẽ mảng.** Không nhét parser vào bundle frontend.

---

## 2. Kiến trúc

```
LLM (quick HOẶC detailed) trả JSON geometry
        │  curves:[{type:'expr', expr, params:{xMin,xMax}, plane, fill?}]
        │  areaRegions:[{outer:{kind:'expr'}, inner:{kind:'expr'}, domain, plane?}]
        │  revolutionSolids:[{outer:{kind:'expr'}, inner?, domain, axis, method}]
        ▼
normalizeGeometryData  (NỚI whitelist: giữ revolutionSolids + areaRegions; curves đã giữ sẵn)
        ▼
expandExprGeometry  ◄── helper MỚI, server-side, KHÔNG gọi LLM
        │  chạy ở điểm CHUNG của route → phủ CẢ quick lẫn detailed (Vẽ nhanh + Vẽ kỹ)
        │  • curve type:'expr'      → compileProfile → sample [xMin,xMax] (~80 pt, bỏ non-finite) → curve.samples
        │  • areaRegions expr       → compileProfile(outer,inner) → samples {x,top,bot} (bỏ non-finite)
        │  • revolutionSolids expr  → sampleProfile(outer/inner) → samples/innerSamples (bỏ non-finite)
        │  • gắn cờ solid.translucent=true (khối bán trong suốt cho quick/detailed)
        │  • KHÔNG gán volume (Vẽ nhanh/Vẽ kỹ không khẳng định đáp số)
        ▼
trả về frontend  →  CameraFitter bao trọn (đã vá) + scaleGeometry co cả samples (đã vá)
        ▼
AnimatedCurve           : có samples → vẽ Line mượt + fill xuống y=0 (cắt theo progress)
AnimatedAreaRegion      : ExtrudeGeometry giữa top/bot (đã hỗ trợ sẵn)
AnimatedRevolutionSolid : Lathe từ samples, bán trong suốt khi translucent (đã hỗ trợ + sửa nhỏ)
```

**Ranh giới an toàn:** Vẽ nhanh & Vẽ kỹ chỉ **vẽ hình theo biểu thức model đưa**; **không** tính/khẳng định thể tích (việc đó thuộc Advance). Không đụng cổng "Mức 3" (đó là cổng SHAPE của lời giải, không phải hình vẽ).

---

## 3. Các đơn vị thay đổi (mỗi file một trách nhiệm)

### 3.1 Schema — `src/types/geometry.ts`
- `Curve3D` (dòng 245): thêm `'expr'` vào union `type`; thêm `expr?: string` (biểu thức 1 biến `x`, **cùng ngữ pháp `parseExpr`**); thêm `samples?: { x: number; y: number }[]` (engine tính sẵn). `params` vẫn dùng `{ xMin, xMax }` làm miền cho `expr`.
- `RevolutionSolid` (dòng 272): thêm `translucent?: boolean` — cờ để renderer vẽ bán trong suốt (nhìn xuyên thấy đường sinh). Advance **không** set cờ này ⇒ giữ nguyên khối đục cũ.
- `AreaRegion` (dòng 305) **đã có sẵn** (`outer`, `inner`, `domain`, `samples:{x,top,bot}[]`) — tái dùng, không đổi.
- Backward-compat: chỉ thêm literal + field optional → code cũ không đổi.

### 3.2 Helper server MỚI — `api/_lib/exprExpand.js`
- `expandExprCurve(curve)` → nếu `type==='expr'`: `compileProfile({kind:'expr',expr})`, lấy `N=80` mẫu đều trên `[xMin,xMax]`, **bỏ điểm `!isFinite(y)`**; gán `curve.samples`. <2 mẫu hữu hạn → trả `null` (drop, fail-safe). `parseExpr` ném lỗi → bắt, trả `null` (không crash route).
- `expandExprArea(area)` → với `outer`/`inner` là `expr` (hoặc thiếu `samples`): sample cả hai qua `compileProfile` trên `domain`, ghép `samples:{x,top,bot}[]`, lọc non-finite. <2 mẫu → `null`.
- `expandExprSolid(solid)` → với `outer`/`inner` là `expr` (hoặc thiếu `samples`): `sampleProfile` → `samples`/`innerSamples`, lọc non-finite; **set `solid.translucent = true`**. **Không** gán `volume`.
- `expandExprGeometry(geometry)` → map `geometry.curves`/`areaRegions`/`revolutionSolids` qua helper tương ứng (bỏ null). **Idempotent**: đã có `samples` thì bỏ qua.
- Import từ kernel entry. **Nếu** `compileProfile`/`sampleProfile`/`parseExpr` chưa export ở entry `kernel-dist` → export thêm + `npm run build:kernel` + commit `api/_lib/kernel-dist/index.mjs` (git-tracked).

### 3.3 Route — `api/analyze-geometry.js` (phủ CẢ quick lẫn detailed)
- `normalizeGeometryData` gọi ở **điểm CHUNG sau cả 2 nhánh** (`analyze-geometry.js:406`). Ngay **sau** đó, TRƯỚC khi trả response: `geometry = expandExprGeometry(geometry)`. Idempotent nên chạy 1 lần đủ.
- **Nới whitelist normalize** (`api/_lib/normalizeGeometry.js:206`): thêm `'revolutionSolids'`, `'areaRegions'` vào `annotationArrays` (hiện đang **nuốt** cả hai). (`sliceStacks`/`sectionCuts` ngoài phạm vi — vẫn để nuốt.)

### 3.4 Renderer — `src/components/3d/`
- `AnimatedCurve.tsx` (useMemo dòng 47): nhánh mới **đặt trước** kiểm analytic — nếu `curve.samples?.length >= 2`: dùng thẳng `{x,y}` từ samples (không eval), qua đúng phép chiếu `plane` (xy/xz/yz), cắt theo `progress` giữ hiệu ứng vẽ dần, dựng fill Shape từ samples (giống dòng 98–108). `type==='expr'` mà thiếu samples → trả rỗng (không crash). Parabola/cubic/rational **giữ nguyên**.
- `AnimatedRevolutionSolid.tsx` (material dòng 182): khi `solid.translucent` → `transparent=true`, `opacity≈0.55` (nhìn xuyên thấy đường sinh). Không có cờ ⇒ giữ nguyên `opacity=1` (Advance không hồi quy). Cờ `dim` cũ vẫn ưu tiên như cũ.
- `AnimatedAreaRegion.tsx`: **không đổi** — đã dựng ExtrudeGeometry giữa `samples.top/bot`.

### 3.5 Prompt — `api/_prompts/prompts/base.js` (DÙNG CHUNG cho Vẽ nhanh + Vẽ kỹ)
Đặt phần dạy vào **`BASE_PROMPT`** để **cả hai** chế độ cùng nhận. `LEVEL_STATIC`/`LEVEL_CINEMATIC` không cần đụng.
- Mọi đồ thị/đường sinh `y=f(x)` (kể cả e^x, ln, √, lượng giác, phân thức) → xuất `curves` `{type:'expr', expr, params:{xMin,xMax}, plane, fill?}`; **ngừng nối tay bằng `lines`**.
- **Hình phẳng giới hạn bởi 2 đường** `y=f(x)`, `y=g(x)` trên `[a,b]` → xuất `areaRegions` `{outer:{kind:'expr',expr:f}, inner:{kind:'expr',expr:g}, domain:[a,b]}`. (Miền tựa trục y=0 thì `inner` là `{kind:'const',c:0}` hoặc dùng `curve.fill`.)
- **Bài tròn xoay** → xuất thêm 1 `revolutionSolids` `{outer:{kind:'expr',expr}, inner? , domain:[a,b], axis:'Ox'|'Oy', method:'disk'|'washer'}` (khối 3D); **không** kèm số thể tích. (Server tự set `translucent`; model khỏi lo.)
- Kèm **bảng token `parseExpr` chấp nhận** (đọc `parseExpr` khi thực thi để chép ĐÚNG) + ví dụ `exp(x/2)*sqrt(x)`.
- **Vệ sinh nhãn:** chỉ đặt nhãn điểm có nghĩa (O, giao trục, cận a/b); điểm phụ để `label:''`.
- Thêm `areaRegions` + `revolutionSolids` vào phần liệt kê schema output của prompt (hiện thiếu).

### 3.6 Vá 2 lỗi ngầm (điều tra phát hiện — bắt buộc để feature hiển thị đúng)
- **Camera bao trọn** — `src/components/3d/GeometryCanvas.tsx:45-50` (`CameraFitter`) hiện chỉ tính bounds từ `geometry.points`. Nới để gộp bounds từ: `curves[].samples` (qua phép chiếu plane), `areaRegions[].samples` (`x`,`top`,`bot`), `revolutionSolids[].samples` (x∈domain, mở rộng ±r quanh `axisY` theo 2 phương vuông góc trục quay). Guard: bỏ qua điểm non-finite; nếu chỉ có solid/curve mà không point vẫn fit được.
- **Scale co cả samples** — `src/lib/geometry/scaleGeometry.ts` nhánh `maximum>20` co points nhưng **bỏ** `samples` → khối lệch tỉ lệ. Nhân cùng hệ số cho `curve.samples`, `solid.samples`/`innerSamples`, `area.samples`, và `params.xMin/xMax`/`domain`.

### 3.7 Test
- `exprExpand`: `exp(x/2)*sqrt(x)` trên [1,2] → ≥2 mẫu hữu hạn, x tăng dần; area giữa `x^2` và `x` trên [0,1] → `top≥bot`; `ln(x)` trên [-1,1] → loại non-finite; `1/x` qua 0 → loại cực; đã có `samples` → idempotent.
- Renderer: curve có samples → `points.length >= 2`; thiếu samples → rỗng, không ném; solid `translucent` → material `transparent=true`.
- Round-trip normalize: `curves(type:'expr'+samples)`, `revolutionSolids`, `areaRegions` sống sót qua `normalizeGeometryData` (quick & detailed).
- Camera: bounds gộp một solid/area không có point → fit không NaN.

---

## 4. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Model không xuất `expr`/`areaRegions`/`revolutionSolids` | Ví dụ rõ trong `BASE_PROMPT`; đo lại bằng chính đề trong ảnh sau khi sửa. |
| `expr` model không khớp `parseExpr` | Bảng token chép đúng từ `parseExpr`; parse lỗi → drop fail-safe (không crash). |
| Mẫu non-finite (ln≤0, cực 1/x, √âm) vỡ Line/Lathe/Extrude | `expandExprGeometry` lọc `!isFinite`; <2 mẫu → drop. |
| Khối/đường lọt khung camera | Vá `CameraFitter` gộp bounds samples (§3.6). |
| Khối lệch tỉ lệ khi hình lớn | Vá `scaleGeometry` co cả samples (§3.6). |
| Regression Advance (khối đục → trong) | `translucent` là **opt-in**; Advance không set ⇒ giữ nguyên. |
| Vẽ nhanh/Vẽ kỹ "chậm đi" | Chỉ thêm sampling tất định (~vài chục phép tính); **không** thêm gọi LLM. |

## 5. Ngoài phạm vi (YAGNI)
- **Không** tính/khẳng định thể tích ở Vẽ nhanh/Vẽ kỹ (Advance lo).
- **Không** parser biểu thức ở frontend.
- **Không** đụng Advance mode hay manual mode.
- **Không** refactor `AnimatedLine` / các curve analytic cũ.
- **Hoãn** (đã cân nhắc, chưa làm): đường cận x=a/x=b + đánh số trục toạ độ; nhãn phương trình cạnh đường (`Curve3D.label`); `sliceStacks`/`sectionCuts` trong quick/detailed.

## 6. Tiêu chí thành công
1. Đề trong ảnh (`e^{x/2}√x` quanh Ox [1,2]) ở **cả Vẽ nhanh lẫn Vẽ kỹ** → **đường sinh mượt + khối tròn xoay 3D bán trong suốt**, nhãn sạch, camera bao trọn.
2. Bài "hình phẳng giới hạn bởi 2 đường" → **miền tô đúng giữa 2 đường** (không phải chỉ xuống y=0).
3. Đồ thị hàm phi-đa-thức bất kỳ (ln, sin, 1/x) vẽ mượt, không NaN/crash.
4. `npm run build` xanh; unit test mới xanh; test cũ không vỡ.
5. Không hồi quy Advance & manual mode (Curve3D/RevolutionSolid dùng chung, đổi backward-compat; `translucent` opt-in).
