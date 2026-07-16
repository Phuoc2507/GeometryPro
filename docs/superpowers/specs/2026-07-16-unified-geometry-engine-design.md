# Thiết kế: Lõi Engine Hình Học Hợp Nhất (Unified Geometry Engine) — Gói G2

> **Trạng thái:** Design spec đã được duyệt qua brainstorming. Bước tiếp theo: `writing-plans` để tạo kế hoạch triển khai.
> **Ngày:** 2026-07-16
> **Tiền đề:** Phase 1 (Deterministic Geometry Kernel, `api/_lib/kernel/`) đã hoàn thành — 139 test xanh, dựng hình tổng hợp + verifier tất định.

---

## 1. Mục tiêu & bối cảnh

**Mục tiêu một câu:** Xây lõi engine hình học 3D hợp nhất, biểu diễn được cả bài **hình không gian tổng hợp** lẫn **hình học toạ độ Oxyz**, **tính ra đáp số chính xác** (không chỉ kiểm chứng), giữ nguyên bảo chứng chống ảo giác của Phase 1.

**Vì sao gói này:** Phase 1 mới *dựng hình + kiểm chứng ràng buộc*; chưa *trả lời "bằng bao nhiêu"*, chưa xử lý Oxyz, chưa có mặt cầu, thiếu vài phép xương sống (khoảng cách 2 đường chéo, góc nhị diện, giao tuyến 2 mặt). Gói G2 xây **lõi dùng chung** mà mọi gói Phase 2 sau (nối LLM, quỹ tích, cực trị, thiết diện) đều dựa vào.

**Định vị trong lộ trình (đã thống nhất):**
- **G1** (không làm ở đây): nối LLM + narrator + route production.
- **G2 (spec này):** lõi engine hợp nhất — entity model + compute layer + 2 dialect + verifier, thuần TypeScript test bằng vitest, **chưa nối LLM**.
- **G3/G4** (sau): quỹ tích + cực trị (lấy mẫu/tối ưu số + kiểm đa thể hiện), thiết diện.

**Quyết định nền tảng đã chốt:**
- Kiến trúc: **Hướng 1 — entity "song biểu diễn"** (float luôn có + exact tuỳ chọn, exact là lớp cộng thêm cô lập, không đụng máy float Phase 1).
- Số học: **lai** — hữu tỷ + căn đơn cho đáp số, float cho dựng hình/trung gian.

---

## 2. Kiến trúc tổng thể

```
        ┌─ Dialect TỔNG HỢP ─┐      ┌─ Dialect OXYZ ─┐
Đầu vào │ dựng khối + dẫn xuất│      │ toạ độ / pt    │   (một schema hợp nhất,
(Plan)  └─────────┬───────────┘      └──────┬─────────┘    op hai dialect trộn được)
                  │  cả hai SINH RA          │
                  ▼   entity hạng nhất  ◄────┘
        ┌────────────────────────────────────────────┐
        │  LÕI CHUNG                                  │
        │  • Scalar lai (float + exact tuỳ chọn)      │
        │  • Entity: Point / Line / Plane / Sphere    │
        │  • EntityTable (+ lớp mesh/render Phase 1)  │
        │  • Execute (biên dịch Plan → EntityTable)   │
        │  • Verify (ràng buộc → violation có cấu trúc)│
        │  • Compute (query → Answer, exact + float)  │
        │  • exactForm (hiển thị dạng √/phân số)       │
        └────────────────────────────────────────────┘
                  │
                  ▼
        run(plan) → { ok, entities, answers, violations, errors, trace }
```

**Nguyên tắc chủ đạo (bất biến engine):**
1. **Float gánh dựng hình + verify** — giữ nguyên máy Phase 1 và bảo chứng "không hiện hình sai".
2. **Exact là lớp certificate/hiển thị cộng thêm** — chỉ tính cho input (Oxyz cho hữu tỷ sẵn) và **đáp số cuối** qua công thức exact riêng của từng truy vấn; **không** luồn exact qua từng phép dựng.
3. **Không bao giờ ném exception với Plan đã hợp lệ schema** — mọi hình suy biến/mâu thuẫn thành `violations`/`errors` có cấu trúc.

---

## 3. Phần 1 — Entity model + số Scalar lai

### 3.1 Scalar (số lai)

```ts
type Scalar = {
  approx: number;           // LUÔN có — dùng dựng hình, render, verify bằng số
  exact: Exact | null;      // có khi tính được chính xác
};

type Exact =
  | { tag: 'rational'; num: bigint; den: bigint }              // đã rút gọn, den > 0
  | { tag: 'surd'; coeff: { num: bigint; den: bigint }; radicand: number }; // coeff·√radicand, radicand square-free ≥ 1
```

- **Rational:** toạ độ, hệ số phương trình, thể tích, tích vô hướng, khoảng-cách-bình-phương (d²).
- **Surd (coeff·√n):** khoảng cách, độ dài, diện tích. `radicand` luôn được chuẩn hoá square-free (ví dụ `√8 → 2√2`); `radicand = 1` ⇒ suy biến về hữu tỷ.
- **Ngoài trường (transcendental):** góc = arccos(...) không đóng ⇒ `exact = null`. Ta **lưu cos chính xác** (rational/surd) làm nguồn, góc hiển thị bằng nhận dạng độ đẹp (30/45/60/90/120/135/150) hoặc `arccos(<cos exact>)`.

**Tối giản có chủ đích (đã chốt):** `Exact` chỉ gồm Rational + Surd **đơn** — không sum-of-surds, không căn lồng nhau. Đủ phủ ~toàn bộ đáp số hình học phổ thông. Phép nào ra ngoài (ví dụ `√2 + √3`) → `exact = null`, rơi về float + nhận dạng.

**Các phép Scalar cần cài:** `add, sub, mul, div, neg, sqrt` (chỉ khi kết quả ở trong trường Rational/Surd — `sqrt` của một Rational cho Surd; `sqrt` của Surd tổng quát → null), so sánh, và `toDisplay()` (ra text `3/2`, `√14`, `3√14/14`). Mỗi phép: nếu **cả hai** toán hạng có `exact` và kết quả ở trong trường → tính exact; luôn tính `approx` song song.

### 3.2 Entity hình học (dạng chuẩn)

```ts
type Vec3S = { x: Scalar; y: Scalar; z: Scalar };   // vector Scalar (kèm gương float)

type PointE  = { kind: 'point';  p: Vec3S };
type LineE   = { kind: 'line';   p: Vec3S; dir: Vec3S };          // điểm + chỉ phương
type PlaneE  = { kind: 'plane';  n: Vec3S; d: Scalar };           // n·x + d = 0
type SphereE = { kind: 'sphere'; center: Vec3S; r2: Scalar };     // giữ R² (ở lại hữu tỷ)
```

| Entity | Dạng chuẩn | Dựng được từ |
|---|---|---|
| Point | (x,y,z) | toạ độ Oxyz; điểm dẫn xuất Phase 1 |
| Line | điểm + chỉ phương | 2 điểm; điểm+chỉ phương; tham số; chính tắc |
| Plane | pháp tuyến + d | 3 điểm; điểm+pháp tuyến; phương trình (a,b,c,d); điểm+2 chỉ phương |
| Sphere | tâm + **R²** | tâm+bán kính; phương trình; tâm+điểm; 4 điểm |

> **Chốt:** giữ **R²** thay vì R để ở lại trường hữu tỷ (bán kính thường là √hữu-tỷ).

### 3.3 EntityTable (tiến hoá từ SymbolTable Phase 1)

```ts
type EntityTable = {
  points:  Map<string, PointE>;
  lines:   Map<string, LineE>;
  planes:  Map<string, PlaneE>;
  spheres: Map<string, SphereE>;
  // Lớp mesh/render kế thừa Phase 1:
  faces:   Map<string, string[]>;   // đa giác có tên (đỉnh theo thứ tự) — để vẽ
  edges:   Set<string>;             // "A|B" canonical — để vẽ
  derivedPoints: Set<string>;       // điểm dẫn xuất (miễn trừ degeneracy) — từ Phase 1
};
```

**Hoà với Phase 1:** một mặt tổng hợp (face `ABCD`) đăng ký **cả** đa-giác-để-vẽ (`faces`) **lẫn** một `PlaneE` (trong `planes`). `resolveEntity` tổng quát hoá: token → point/line/plane/sphere, có tên hoặc ghép (`"AB"`=đường, `"ABC"`=mặt qua 3 điểm; token có tên tra map trước).

---

## 4. Phần 2 — Compute layer (tính đáp số)

Khác Verifier (chỉ *kiểm* giá trị cho sẵn → violation/null), Compute layer **tạo ra** đáp số / phương trình.

**Luồng:** `query (loại + toán hạng) → resolve entity → công thức đáp số → Answer`

```ts
type Answer = {
  kind: QueryKind;
  exact: Exact | EntityRef | null;   // số chính xác, HOẶC một entity (vd pt mặt/giao tuyến)
  approx: number | Vec3 | null;      // gương float
  text: string;                      // hiển thị: "d = 3√14/14", "(P): 2x − y + 2z − 3 = 0"
  approximate: boolean;              // true nếu phải rơi về float+nhận dạng (không có exact)
  trace: TraceEntry[];               // vết để narrate ở gói sau
};
```

### 4.1 Các truy vấn cài trong spec này

| Loại | Bao gồm (đậm = xương sống review báo thiếu) |
|---|---|
| `distance` | điểm-điểm / điểm-đường / điểm-mặt, **2 đường chéo nhau**, đường‖mặt, mặt‖mặt, điểm-cầu |
| `angle` | đường-đường, đường-mặt, **nhị diện (mặt-mặt)** |
| `volume` | chóp / lăng trụ / tứ diện (tích hỗn tạp), **tỉ số thể tích** |
| `area` | đa giác, tam giác, mặt cầu, diện tích xung quanh/toàn phần |
| `equation` | viết pt **mặt phẳng / đường thẳng / mặt cầu** (đầu ra Oxyz — Answer trả **entity**) |
| `relative_position` | đường-đường (‖/cắt/chéo/trùng), đường-mặt, mặt-mặt, **cầu-mặt** (tiếp xúc / cắt theo đường tròn / rời), cầu-đường |
| `intersection` | ra **entity**: điểm; **giao tuyến 2 mặt** (đường); **cầu ∩ mặt** (đường tròn) |

### 4.2 Vài công thức xương sống (đã exact hoá)

- **Khoảng cách 2 đường chéo:** `d = |(b₁−a₁)·(d₁×d₂)| / |d₁×d₂|`. Tử = |rational|, mẫu = √rational ⇒ đáp số **Surd** (`p√n/q`).
- **Nhị diện (mặt-mặt):** `cos = |n₁·n₂| / (|n₁||n₂|)`. Lưu **cos chính xác**, góc suy ra.
- **Thể tích tứ diện:** `V = |(AB, AC, AD)| / 6` (tích hỗn tạp) → rational.
- **Cầu-mặt:** so `d(tâm, mặt)` với R (qua d² vs R²): `d² < R²` cắt (bán kính đường tròn `√(R²−d²)`), `= R²` tiếp xúc, `> R²` rời.
- **Pt mặt qua 3 điểm:** `n = AB × AC` (rational), `d = −n·A` → hệ số nguyên/hữu tỷ, hiển thị dạng rút gọn.

### 4.3 Chiến lược exact (đã chốt)

Mỗi loại truy vấn có **công thức đáp số exact riêng**, nuôi bằng input exact của entity:
- Oxyz: input hữu tỷ sẵn ⇒ đáp số ra **đúng tuyệt đối**.
- Tổng hợp: nếu toạ độ dựng ra chỉ có float (không exact) ⇒ **rơi về float + nhận dạng exactForm**, đặt `approximate = true`.

### 4.4 Tự-chứng (self-certificate)

Sau khi tính exact, **đối chiếu `exact.approx` vs gương float** đã tính độc lập. Lệch quá ngưỡng tương đối ⇒ đẩy vào `errors` (lỗi nội bộ engine), **không trả đáp số sai**. Đây là cross-check nhẹ giữ tinh thần chống ảo giác; "kiểm đa thể hiện" cho *chứng minh tổng quát* thuộc gói G3.

---

## 5. Phần 3 — Hai dialect nhập (schema hợp nhất)

Cả hai là **schema Zod** sinh Plan → biên dịch xuống `EntityTable`. **Chưa có LLM** — đây là hợp đồng JSON có kiểu mà LLM sẽ sinh ở gói sau.

### 5.1 Dialect Tổng hợp (tiến hoá `planSchema` Phase 1)
Giữ nguyên op dựng: khối chuẩn (square/rectangle/rhombus/reg_polygon/triangle), prism, pyramid, điểm dẫn xuất (midpoint/centroid/ratio/reflect), perp_point, foot, intersect, edge. **Mới:** face đăng ký thêm `PlaneE`; thêm op đặt tên đường/mặt tường minh khi cần.

### 5.2 Dialect Oxyz (mới)
Entity cho trực tiếp, **nhiều dạng nhập** mỗi loại (đã chốt):

| Entity | Các cách nhập |
|---|---|
| `point` | `A = (x,y,z)` hữu tỷ |
| `line` | 2 điểm · điểm+chỉ phương · tham số · chính tắc |
| `plane` | hệ số (a,b,c,d) · điểm+pháp tuyến · 3 điểm · điểm+2 chỉ phương |
| `sphere` | phương trình · tâm+bán kính · tâm+điểm · 4 điểm |
| dẫn xuất | trung điểm, chiếu (foot), đối xứng, giao — **dùng chung với Dialect Tổng hợp** |

### 5.3 Hợp nhất & cho phép trộn (đã chốt)
**Một schema hợp nhất**: op giới thiệu entity của cả hai dialect **cùng tồn tại** trong một Plan. Điều này mô hình hoá tự nhiên kỹ thuật **"toạ độ hoá"** (cho hình chóp → gán hệ Oxyz → tính). Mọi thứ hạ nguồn (dẫn xuất, compute, verify) dùng chung; hai dialect chỉ khác ở op **giới thiệu entity gốc**.

---

## 6. Phần 4 — Verifier mở rộng + lỗi có cấu trúc

### 6.1 Mở rộng quan hệ
- Đủ tổ hợp đường/mặt: **mặt‖mặt, mặt⊥mặt**, đường-mặt, đường-đường (kế thừa + sửa từ review Phase 1).
- Mặt cầu: **điểm thuộc cầu**, **tiếp xúc** (đường/mặt tiếp xúc cầu), điểm trong/ngoài.
- Degeneracy mở rộng cho entity mới: cầu R²≤0, mặt pháp tuyến 0, đường chỉ phương 0 (dùng lại guard đã thêm ở review Phase 1).

### 6.2 Bỏ throw → trả cấu trúc (bất biến engine)
Hiện `verifyAssert`/`executeOp` **ném exception** với tổ hợp không hỗ trợ hoặc plan hợp-lệ-schema nhưng hỏng hình (rủi ro review đã nêu). Trong spec này, **engine không ném với Plan đã hợp lệ schema** — mọi thứ thành violation/error có cấu trúc để vòng lặp LLM (gói sau) tiêu thụ được.

### 6.3 Hợp đồng entry point
```ts
function run(plan: unknown): EngineResult;

type EngineResult = {
  ok: boolean;                 // true nếu không violation & không error
  entities: EntityTable;
  answers: Answer[];           // kết quả compute cho các query trong plan
  violations: Violation[];     // assert bị vi phạm + degeneracy
  errors: EngineError[];       // plan hợp-lệ-schema nhưng không dựng/tính được (thay throw)
  trace: TraceEntry[];         // vết execute→verify→compute
};
```
Chỉ **schema invalid** mới lỗi ở tầng Zod (trước khi vào engine). Đã vào `run()` thì luôn trả cấu trúc, không throw.

---

## 7. Phần 5 — Hoà với Phase 1, phạm vi, test, tiêu chí thành công

### 7.1 Hoà với Phase 1 (cộng thêm, không đập đi)
- `SymbolTable → EntityTable` theo hướng bồi thêm; **giữ 139 test Phase 1 xanh** (chỉ chỉnh nơi model thật sự đổi hình).
- Op tổng hợp đăng ký thêm `PlaneE`/`LineE` bên cạnh lớp mesh-render cũ.
- Float Vec3 Phase 1 = "gương approx"; `exact` phủ lên trên. Dựng hình vẫn thuần float.

### 7.2 Ranh giới cứng — NGOÀI spec này
- LLM translator + narrator → gói sau.
- Gap `.ts/.js` + route production + `server.js`/`api/*.js` → gói nối LLM. **G2 vẫn thuần TypeScript, test bằng vitest như Phase 1.**
- Quỹ tích, cực trị, thiết diện, chứng minh đa-thể-hiện → G3/G4.
- Sum-of-surds / căn lồng / mặt bậc hai tổng quát / bài đại học → loại.

### 7.3 Chiến lược test (TDD)
- **Unit:** số học Scalar (rút gọn hữu tỷ, chuẩn hoá surd square-free, sqrt trong/ngoài trường), builder từng entity (mọi dạng nhập), từng công thức compute, từng quan hệ verify.
- **Đối chiếu exact-vs-float** (self-certificate) cho mọi công thức đáp số.
- **Bộ "bài vàng"** — bài phổ thông tiêu biểu (cả 2 dialect) có **đáp số exact đã biết**, khẳng định text đáp số khớp:
  1. Khoảng cách 2 đường chéo nhau (Oxyz) → dạng `p√n/q`.
  2. Góc nhị diện (tổng hợp: chóp S.ABCD).
  3. Viết pt mặt phẳng qua 3 điểm (Oxyz) → hệ số nguyên rút gọn.
  4. Mặt cầu ngoại tiếp hình chóp → tâm + R².
  5. Tỉ số thể tích hai khối.
  6. Cầu ∩ mặt = đường tròn (bán kính, tâm).
  7. **Toạ-độ-hoá**: cho chóp tổng hợp → gán hệ Oxyz → tính khoảng cách/góc (plan trộn 2 dialect).
- **Hồi quy:** 139 test Phase 1 vẫn xanh.

### 7.4 Tiêu chí thành công (thế nào là xong)
1. Với Plan viết tay (không LLM), engine **tất định** ra entity đúng + **đáp số exact đúng** cho toàn bộ bộ bài vàng.
2. Đáp số exact luôn khớp gương float (self-certificate), hoặc bị đánh dấu `approximate`.
3. Verifier bắt được hình sai; engine **không ném** với plan hợp lệ schema (mọi hình xấu → `violations`/`errors`).
4. Cả 2 dialect chạy; một plan **trộn** (toạ-độ-hoá) chạy end-to-end trong engine.
5. Phase 1 giữ nguyên (mọi test cũ xanh); `tsc --noEmit` + eslint sạch.

---

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Refactor `SymbolTable` làm vỡ 139 test Phase 1 | Bồi thêm thay vì thay thế; chạy full suite sau mỗi bước; giữ API cũ |
| Số học exact phình thành CAS | Giới hạn cứng Rational + Surd đơn; ra ngoài trường → float + cờ approximate |
| `bigint` cho rational: tràn/hiệu năng | Rút gọn (gcd) sau mỗi phép; đề phổ thông hệ số nhỏ; float gánh phần nặng |
| Nhận nhầm dạng exact (exactForm heuristic) | Chỉ dùng nhận dạng khi **không** có exact thật; luôn kèm self-certificate + cờ approximate |
| Trộn 2 dialect gây nhập nhằng resolve | Ưu tiên tra map có tên trước; quy tắc tokenizer rõ ràng; test ca trộn |

---

## 9. Cấu trúc file dự kiến (định hướng cho writing-plans)

```
api/_lib/kernel/
  scalar.ts              # Scalar lai + số học Rational/Surd + toDisplay
  entities.ts            # PointE/LineE/PlaneE/SphereE + dạng chuẩn + builder
  entityTable.ts         # EntityTable (tiến hoá SymbolTable)
  resolve.ts             # (mở rộng) token → point/line/plane/sphere
  dialects/
    synthetic.ts         # (tiến hoá planSchema Phase 1) op dựng khối
    oxyz.ts              # op nhập toạ độ/phương trình
    planSchema.ts        # schema hợp nhất (union op 2 dialect)
  execute.ts             # (mở rộng) biên dịch Plan → EntityTable
  verify.ts              # (mở rộng) quan hệ + degeneracy, trả cấu trúc
  compute/
    distance.ts, angle.ts, volume.ts, area.ts,
    equation.ts, relative.ts, intersection.ts
  exactForm.ts           # (kế thừa) nhận dạng dạng đẹp — fallback
  index.ts               # run(plan): EngineResult
  __tests__/…            # unit + bài vàng + hồi quy Phase 1
```
*(Cấu trúc chính xác do writing-plans chốt; đây là định hướng phân rã trách nhiệm.)*
