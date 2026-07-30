# Vẽ nhanh — Đường cong biểu thức & Khối tròn xoay mượt (expr curves)

**Ngày:** 2026-07-30
**Phạm vi:** Chế độ **Vẽ nhanh** (`drawMode: "quick"`) — route `api/analyze-geometry.js`.
**Mục tiêu 1 câu:** Cho Vẽ nhanh vẽ **mọi đồ thị `y=f(x)` mượt** (kể cả `e^{x/2}·√x`, ln, lượng giác, phân thức) và, với bài tròn xoay, **dựng khối 3D mượt** — thay cho polyline 3 điểm gãy khúc + nhãn rối hiện nay.

---

## 1. Bối cảnh & vấn đề

Ảnh người dùng gửi: bài `V = ∫ π·(e^{x/2}√x)² dx` quay quanh Ox trên [1,2], render ở Vẽ nhanh ra **đường gãy khúc 3 điểm** + nhãn phụ rối (P′/P″/Q′/M_top…), **không có khối 3D**. Con số thì đúng.

**Nguyên nhân gốc (đã map pipeline):**
- Route sống: `POST /api/analyze-geometry` mode `quick` → thử kernel tất định (chỉ khối cổ điển) → rớt xuống LLM Gemini 3.5 Flash low với `BASE_PROMPT + LEVEL_STATIC`.
- Prompt bảo model xuất **điểm + cạnh thẳng** (`LEVEL_STATIC`: "vẽ quỹ đạo thô bằng các đường thẳng"); chưa bao giờ dạy nó vẽ đường sinh mượt.
- `Curve3D` hiện chỉ có `type: 'parabola' | 'cubic' | 'rational'` → **không biểu diễn được** `e^{x/2}√x`.
- `lines` render bằng đoạn thẳng 2 đầu (`AnimatedLine`) → gãy khúc.

**Đòn bẩy có sẵn (khiến hướng này rẻ):**
- Kernel `compileProfile(ProfileFn)` — `api/_lib/kernel/analysis/revolution.ts:10` — parse mọi biểu thức 1 biến qua `parseExpr` (`exp`, `sqrt`, `ln`, lượng giác, phân thức…).
- Kernel `sampleProfile(outer, domain, n=64)` — `revolution.ts:42` — lấy mẫu ProfileFn thành `{x,r}[]` "để frontend dựng hình mà KHÔNG cần parser".
- Quy ước "engine tính mẫu, frontend vẽ mảng" đã dùng cho `RevolutionSolid.samples`.
- `GeometryRenderer` đã render `revolutionSolids → AnimatedRevolutionSolid` (Lathe mượt) ở **mọi** drawMode.

→ Ta mở rộng đúng theo quy ước sẵn có: **server lấy mẫu, frontend vẽ mảng.** Không nhét parser vào bundle frontend.

---

## 2. Kiến trúc

```
LLM (quick) trả JSON geometry
        │  curves:[{type:'expr', expr, params:{xMin,xMax}, plane, fill?}]
        │  revolutionSolids:[{outer:{kind:'expr',expr}, domain, axis, method}]
        ▼
normalizeGeometryData  (giữ nguyên field expr / samples / revolutionSolids)
        ▼
expandQuickExpr  ◄── helper MỚI, server-side, KHÔNG gọi LLM
        │  • curve type:'expr'      → compileProfile → sample [xMin,xMax] (~80 pt, bỏ non-finite) → curve.samples
        │  • revolutionSolids expr  → sampleProfile(outer/inner) → samples/innerSamples (bỏ non-finite)
        │  • KHÔNG gán volume (Vẽ nhanh không khẳng định đáp số)
        ▼
trả về frontend
        ▼
AnimatedCurve            : có samples → vẽ Line mượt + fill Shape từ samples (cắt theo progress)
AnimatedRevolutionSolid  : dựng Lathe từ samples (đã hỗ trợ sẵn)
```

**Ranh giới an toàn:** Vẽ nhanh chỉ **vẽ hình theo biểu thức model đưa**; **không** tính/khẳng định thể tích (việc đó thuộc Advance). Không đụng cổng "Mức 3" (đó là cổng SHAPE của lời giải, không phải hình vẽ).

---

## 3. Các đơn vị thay đổi (mỗi file một trách nhiệm)

### 3.1 Schema — `src/types/geometry.ts`
`Curve3D` (dòng 245):
- Thêm `'expr'` vào union `type`.
- Thêm `expr?: string` — biểu thức 1 biến `x`, **cùng ngữ pháp `parseExpr`**.
- Thêm `samples?: { x: number; y: number }[]` — engine tính sẵn (mirror `RevolutionSolid.samples`).
- `params` vẫn dùng `{ xMin, xMax }` làm miền cho `expr`; giữ nguyên coeffs cho parabola/cubic/rational.

Backward-compat: chỉ thêm literal + field optional → code cũ (kiểm `type==='parabola'|…`) không đổi.

### 3.2 Helper server MỚI — `api/_lib/quickExpand.js`
- `expandExprCurve(curve)` → nếu `type==='expr'`: `compileProfile({kind:'expr',expr})`, lấy `N=80` mẫu đều trên `[xMin,xMax]`, **bỏ điểm `!isFinite(y)`**; gán `curve.samples`. Nếu <2 mẫu hữu hạn → trả `null` (drop curve, fail-safe). `parseExpr` ném lỗi → bắt, trả `null` (không crash route).
- `expandExprSolid(solid)` → với `outer`/`inner` là `expr` (hoặc thiếu `samples`): `sampleProfile` → `samples`/`innerSamples`, lọc non-finite. **Không** gán `volume`.
- `expandQuickExpr(geometry)` → map `geometry.curves` qua `expandExprCurve` (bỏ null), `geometry.revolutionSolids` qua `expandExprSolid` (bỏ null).
- Import từ kernel entry. **Nếu** `compileProfile`/`sampleProfile`/`parseExpr` chưa export ở entry `kernel-dist` → export thêm + `npm run build:kernel` + commit `api/_lib/kernel-dist/index.mjs` (file này git-tracked).

### 3.3 Route — `api/analyze-geometry.js`
Sau `normalizeGeometryData`, TRƯỚC khi trả về (nhánh LLM quick): `geometry = expandQuickExpr(geometry)`.
Kiểm `normalizeGeometryData` **không** nuốt `expr` / `samples` / `revolutionSolids`; nếu nuốt → nới whitelist.

### 3.4 Renderer — `src/components/3d/AnimatedCurve.tsx`
Trong `useMemo` (dòng 47): nhánh mới **đặt trước** kiểm analytic —
- Nếu `curve.samples?.length >= 2`: dùng thẳng `{x,y}` từ samples (không eval), qua đúng phép chiếu `plane` hiện có (xy/xz/yz), cắt theo `progress` để giữ hiệu ứng vẽ dần, và dựng fill Shape từ samples (giống logic dòng 98–108).
- `type==='expr'` mà thiếu samples → trả `{points:[], shapeGeometry:null}` (vẽ rỗng, không crash).
- Nhánh parabola/cubic/rational **giữ nguyên**.

### 3.5 Prompt — `api/_prompts/prompts/base.js` + `levels.js`
- Dạy: mọi đồ thị/đường sinh `y=f(x)` (kể cả e^x, ln, √, lượng giác, phân thức) → xuất `curves` `{type:'expr', expr, params:{xMin,xMax}, plane, fill?}`; **ngừng nối tay bằng `lines`**.
- Kèm **bảng token `parseExpr` chấp nhận** (đọc `parseExpr` khi thực thi để chép ĐÚNG) + ví dụ `exp(x/2)*sqrt(x)`.
- Bài **tròn xoay** → xuất thêm 1 `revolutionSolids` `{outer:{kind:'expr',expr}, domain:[a,b], axis:'Ox'|'Oy', method:'disk'}` (khối 3D); **không** kèm số thể tích.
- **Vệ sinh nhãn:** chỉ đặt nhãn điểm có nghĩa (O, giao trục, cận a/b); điểm phụ để `label:''`.
- Thêm `revolutionSolids` vào phần liệt kê schema output của prompt (hiện thiếu).

### 3.6 Test — `src/lib/**/__tests__` + kernel test
- `quickExpand`: `exp(x/2)*sqrt(x)` trên [1,2] → ≥2 mẫu, tất cả hữu hạn, x tăng dần; `ln(x)` trên [-1,1] → loại non-finite, còn phần hợp lệ hoặc null; `1/x` qua 0 → loại cực.
- Renderer: curve có samples → `points.length >= 2`; thiếu samples → rỗng, không ném.
- Round-trip type/normalize: `type:'expr'` + `samples` sống sót qua `normalizeGeometryData`.

---

## 4. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Prompt model không chịu xuất `expr`/`revolutionSolids` | Ví dụ rõ trong prompt; đo lại bằng chính đề trong ảnh sau khi sửa. |
| `expr` của model không khớp `parseExpr` | Bảng token trong prompt chép đúng từ `parseExpr`; parse lỗi → drop curve fail-safe (không crash). |
| Mẫu non-finite (ln≤0, cực 1/x, √âm) làm vỡ Line/Lathe | `expandQuickExpr` lọc `!isFinite`; <2 mẫu → drop. |
| `normalizeGeometryData` nuốt field mới | Test round-trip + audit whitelist. |
| Kernel entry chưa export sampler | Export + rebuild `kernel-dist` + commit (đã note). |
| Quick mode "chậm đi" | Chỉ thêm sampling tất định (~vài chục phép tính); **không** thêm gọi LLM. |

## 5. Ngoài phạm vi (YAGNI)
- **Không** tính/khẳng định thể tích ở Vẽ nhanh (Advance lo).
- **Không** parser biểu thức ở frontend.
- **Không** đụng Advance mode, Vẽ kỹ, hay manual mode.
- **Không** refactor `AnimatedLine` / các curve analytic cũ.

## 6. Tiêu chí thành công
1. Đề trong ảnh (`e^{x/2}√x` quanh Ox [1,2]) ở Vẽ nhanh → **đường sinh mượt + khối tròn xoay 3D mượt**, nhãn sạch.
2. Đồ thị hàm phi-đa-thức bất kỳ (ln, sin, 1/x) vẽ mượt, không NaN/crash.
3. `npm run build` xanh; unit test mới xanh; test cũ không vỡ.
4. Không hồi quy Advance/Vẽ kỹ (Curve3D dùng chung, đổi backward-compat).
