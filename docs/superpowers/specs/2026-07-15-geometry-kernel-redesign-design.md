# Thiết kế: Geometry Kernel tất định + LLM lớp phiên dịch

**Ngày:** 2026-07-15
**Trạng thái:** Draft — chờ duyệt
**Phạm vi bài toán:** Hình học không gian phổ thông (rộng, không chỉ khối chuẩn SGK)
**Ưu tiên:** Đúng > Nhanh > Rẻ

---

## 1. Vấn đề gốc (vì sao phải xây lại)

Pipeline hiện tại bắt **LLM đóng vai engine hình học**: code đưa công thức, LLM tự tính toạ độ. Hệ quả đo được từ việc đọc mã:

- **Chậm:** chế độ "detailed" gọi LLM **2–4 lần tuần tự** (phân loại → dựng hình → ép-3D → sửa JSON). Không có streaming thật (`vilao.js` gom hết HTTP rồi mới `JSON.parse`). Có delay nhân tạo (`setTimeout` 2000ms build, 1500ms modify). Prompt 7–10KB gửi mỗi request, nhồi cả JSON hình học + few-shot.
- **Ảo giác:** LLM tự tính mọi toạ độ, **không có bộ kiểm chứng nào chạy thật**:
  - `api/_lib/constraintVerify.js` gọi `python constraintVerify.py` — **file .py không tồn tại** → luôn trả `{ok:true, confidence:0.5}`.
  - `api/solve.js` hardcode `const verified = true` (dòng ~104) → `answer_value` của LLM được tin tuyệt đối.
  - JSON lấy bằng regex + "vá dấu ngoặc" (`repairTruncatedJson`), không phải schema validation → có thể âm thầm mất dữ liệu.
  - `temperature` không set trên đường Claude chính → không tất định.

**Kết luận:** lỗi kiến trúc, không phải lỗi tinh chỉnh. Xây lại phần lõi.

---

## 2. Nguyên tắc thiết kế

> **Kernel dựng hình là chân lý. LLM chỉ là lớp hiểu ngôn ngữ. Client cho tốc độ, server cho sự thật.**

1. LLM **không bao giờ** xuất toạ độ. Nó chỉ dịch đề → **"kịch bản dựng hình"** (Construction Plan) có schema chặt.
2. Một **kernel thuần TypeScript** thực thi kịch bản → tính **mọi toạ độ** bằng toán thật.
3. Một **verifier** chạy thật, kiểm mọi ràng buộc đã phát biểu (vuông góc, song song, đồng phẳng, khoảng cách, góc) bằng số học.
4. Bài **giải**: kernel tính ra **con số**, LLM chỉ diễn giải lời giải với con số đã có sẵn → không thể tính sai đáp số.
5. **Bất biến cứng:** không bao giờ hiển thị hình / đáp án **chưa qua verify**. Verify fail → tự sửa (repair) hoặc báo "cần làm rõ đề", **không** trả kết quả sai.

Ràng buộc runtime: kernel **thuần TS/JS**, chạy chung Vercel serverless (không `spawn python` — đó là lý do verifier cũ chết).

---

## 3. Kiến trúc tổng thể

```
Đề (text/ảnh, tiếng Việt)
   │
   ├── [Vision→text] (nếu là ảnh: chỉ trích đề thành text, KHÔNG hiểu hình) ──┐
   │                                                                          │
   ▼                                                                          │
[Fast-path: pattern matcher tất định]  ◀────────────────────────────────────┘
   │  (khớp mẫu quen thuộc: "chóp đều S.ABC cạnh a", "lăng trụ đứng ABC.A'B'C'"...)
   │
   ├──(khớp)───────────────────────────────────────────────▶  Construction Plan  ── tức thì, $0, đúng 100%
   │
   └──(không khớp)
         ▼
      [LLM: Translator]  ── 1 lần gọi, structured output (json_schema) ──▶  Construction Plan (JSON)
         │
         ▼
      [Zod: validate schema]  ──(sai schema)──▶  Repair call (tối đa 1–2 lần, model leo thang nếu cần)
         │ (hợp lệ)
         ▼
Construction Plan ──[LƯU BỀN — nguồn chân lý dùng chung cho analyze/modify/solve]
   │
   ▼
[Kernel: execute]  ──▶  GeometryData (toạ độ thật) + bảng ký hiệu (điểm/đường/mặt/khối)
   │
   ▼
[Verifier: kiểm ràng buộc + suy biến + bậc tự do]  ──(có vi phạm)──┐
   │ (0 vi phạm, không suy biến)                                   │
   │                                    ┌──────────────────────────┘
   │                                    ▼
   │                     [Deterministic repair trước] (chiếu/nắn lại bằng code)
   │                                    │ (còn lỗi ngữ nghĩa)
   │                                    ▼
   │                     [LLM repair có mục tiêu] (đưa lỗi cụ thể, tối đa 2 lần)
   │                                    │ (vẫn fail)
   │                                    ▼
   │                          needs_clarification (KHÔNG hiển thị hình sai)
   ▼
[Solve: kernel tính đại lượng được hỏi bằng ≥2 phương pháp độc lập, so khớp]  ──▶  con số + exact-form (a√6/3)
   │
   ▼
[LLM: Narrator]  ── streaming ── diễn giải lời giải với CON SỐ đã nhét sẵn
   │
   ▼
Render 3D (GeometryData) + hiển thị lời giải (KaTeX)

[Modify sau đó]: "nối BD", "lấy trung điểm SC" → append 1 op vào Plan đã lưu → chạy lại
   Kernel+Verifier — phần lớn trường hợp KHÔNG cần gọi LLM.
```

**Điểm mấu chốt:**
1. LLM đứng ở *hai đầu* (hiểu đề vào, diễn giải ra), **toàn bộ phần giữa là code tất định**.
2. **Fast-path** xử lý phần lớn đề SGK mà không chạm LLM — nhanh nhất, rẻ nhất, đúng nhất có thể (không có chỗ để ảo giác).
3. **Construction Plan là nguồn chân lý bền** (persisted), không phải sản phẩm dùng-một-lần — analyze/modify/solve đều đọc/ghi cùng một Plan, nên modify gần như miễn phí và không cần dịch lại đề.
4. Sửa lỗi luôn thử **tất định trước, LLM sau** — LLM chỉ can thiệp khi lỗi mang tính *hiểu sai đề* (ngữ nghĩa), không phải lỗi số học nắn được bằng code.

---

## 4. Các thành phần chi tiết

Tất cả nằm trong thư mục mới `api/_lib/kernel/`.

### 4.0. Fast-path pattern matcher — `kernel/fastPath.ts`
Trước khi gọi LLM: thử khớp đề với một tập **mẫu luật** (regex/grammar có cấu trúc, tương tự tinh thần `src/lib/geometry/localCommands.ts` hiện có cho modify, nhưng mở rộng cho dựng hình ban đầu). Ví dụ mẫu: "hình chóp đều S.ABC(D...) cạnh đáy a[, chiều cao/cạnh bên h/l]", "lăng trụ đứng ABC.A'B'C' cạnh a", "hình hộp chữ nhật ABCD.A'B'C'D' kích thước a×b×c", "hình chóp S.ABCD đáy vuông/chữ nhật, SA⊥đáy...".
- Khớp mẫu → sinh thẳng Construction Plan bằng code, **không gọi LLM cho bước dựng hình**. Vẫn chạy qua kernel + verifier như bình thường (không bỏ qua bước kiểm chứng).
- Không khớp → rơi xuống Translator (LLM) như luồng chính.
- Bộ mẫu là **danh sách mở**, lớn dần theo corpus vàng (đề nào lặp lại nhiều trong corpus mà LLM vẫn xử lý đúng → cân nhắc đôn thành mẫu tất định).
- Đo tỉ lệ fast-path hit trên corpus — đây là chỉ số chi phí/tốc độ quan trọng nhất (§7.2 bổ sung ngưỡng).

### 4.1. Construction Plan schema — `kernel/planSchema.ts`
Định nghĩa bằng **Zod** (thay hoàn toàn regex/brace-repair). LLM bị ép xuất đúng schema này qua `response_format: json_schema` (hoặc function-calling). Plan là **danh sách thao tác có kiểu**, thực thi tuần tự:

```ts
type Op =
  | { op: 'base'; shape: 'square'|'rectangle'|'triangle'|'reg_polygon'|'rhombus';
      vertices: string[]; dims: Record<string, number> }      // đặt đa giác đáy trong z=0
  | { op: 'prism'|'pyramid'; base: string[]; apexOrTop: string|string[]; height: number }
  | { op: 'point'; name: string; def: PointDef }               // trung điểm/trọng tâm/chia đoạn tỉ lệ
  | { op: 'perp_point'; name: string; from: string; to: 'plane'|'line'; target: string; length: number }
  | { op: 'foot'; name: string; from: string; onto: 'plane'|'line'; target: string } // chân đường vuông góc
  | { op: 'intersect'; name: string; a: string; b: string }    // giao điểm/giao tuyến
  | { op: 'section'; name: string; through: string[]; parallelTo?: string; containing?: string } // thiết diện
  | { op: 'sphere'|'cylinder'|'cone'; ... }
  | { op: 'assert'; relation: 'perp'|'parallel'|'coplanar'|'on'|'dist'|'angle'; args: string[]; value?: number }
type Query =
  | { kind: 'distance'; a: string; b: string }                 // điểm-điểm, điểm-đường, điểm-mặt, chéo nhau
  | { kind: 'angle'; a: string; b: string }                    // đường-đường, đường-mặt, mặt-mặt (nhị diện)
  | { kind: 'volume'|'area'; target: string }
type Plan = { solidName: string; ops: Op[]; asserts: Op[]; query?: Query }
```

- **`dims` dùng giá trị số cụ thể** (ví dụ cạnh `a` → 1). Kernel làm việc bằng số. Đáp án dạng ký hiệu (a√6/3) do module `exactForm` dựng lại (§4.7).
- `asserts` là các ràng buộc đề phát biểu để verifier kiểm (SA⊥đáy, SA=a...). Nhiều assert đồng thời *là* cách dựng (perp_point) *và* điều verifier kiểm lại.

**Plan là nguồn chân lý bền (persisted), không phải sản phẩm dùng-một-lần.** Lưu Plan cùng `GeometryData` (Supabase, cột `construction_plan jsonb` trên `saved_geometries`/phiên làm việc hiện tại). Hệ quả:
- **Modify** ("nối BD", "lấy trung điểm SC", "vẽ thêm mặt phẳng qua M song song (SBC)") = append 1 `op` vào Plan đã lưu → chạy lại kernel+verifier trên Plan mới. Phần lớn thao tác modify **không cần gọi LLM** — chỉ khi câu lệnh modify mơ hồ mới cần Translator dịch câu đó thành 1 op.
- **Solve nhiều câu hỏi trên cùng một hình** = đổi `Query`, chạy lại `kernel/solve.ts` trên Plan đã execute sẵn — không dịch lại đề.
- Đây là lý do `api/modify-geometry.js` (hiện là một pipeline LLM nặng riêng biệt, ~9.8KB prompt + tự regex JSON) được **thay thế** bằng "append-op vào Plan" ở §6, không giữ song song hai cơ chế.

### 4.2. Kernel executor — `kernel/execute.ts`
Interpreter thuần: duyệt `ops` theo thứ tự, giữ **symbol table** `Map<string, Point|Line|Plane|Solid>`. Mỗi op là một hàm toán tất định:
- Khối chuẩn: toạ độ chính tắc (đáy trong mp z=0, tâm gốc). Pyramid/prism/cube/box/tetra/cylinder/cone/sphere.
- Điểm dẫn xuất: trung điểm, trọng tâm, chia đoạn tỉ lệ, **giao đường-mặt / đường-đường**, **chân đường vuông góc** (projection lên mặt/đường), đối xứng.
- `perp_point`: đặt `S = foot + length · n̂` (n̂ = pháp tuyến mặt / hướng vuông góc) → dựng SA⊥đáy chính xác theo cấu tạo.
- `section` (thiết diện): cắt mặt phẳng với các cạnh của khối, trả đa giác giao (toán thuần, không dùng CSG của client).

Đầu ra: **map thẳng vào type `GeometryData` hiện có** (`src/types/geometry.ts`) → **frontend renderer không phải sửa** (giảm blast radius).

### 4.3. Verifier — `kernel/verify.ts`
Sau khi execute, kiểm lại **mọi** assert bằng số học, với dung sai ε (mặc định `1e-6` sau chuẩn hoá scale):
- `perp`: |û · v̂| < ε · ... ; `parallel`: |û × v̂| ≈ 0 ; `coplanar`: định thức ≈ 0 ; `on`: khoảng cách điểm→đường/mặt ≈ 0 ; `dist`/`angle`: |giá trị_tính − giá trị_đề| < ε.
- Trả về `{ ok: boolean, violations: {relation, args, expected, actual}[] }`.
- **Đây chính là thứ trước đây đã chết** — giờ chạy thật, thuần TS.

**Không chỉ kiểm vi phạm assert — còn phải bắt suy biến & thiếu ràng buộc**, vì một Plan có thể pass mọi assert mà vẫn vô nghĩa hình học:
- **Sanity/degeneracy pass**: 3+ điểm gọi là "tam giác"/mặt phẳng nhưng đồng phẳng suy biến hoặc thẳng hàng; thể tích khối ≈ 0; hai điểm được đặt tên khác nhau nhưng trùng toạ độ; pháp tuyến null.
- **Đếm bậc tự do**: sau khi execute, mỗi điểm phải được xác định đầy đủ bởi các `ops` đứng trước nó (không còn toạ độ "buông trôi" do thiếu ràng buộc trong Plan) — kernel từ chối Plan có điểm thiếu định nghĩa thay vì âm thầm gán giá trị mặc định.
- Hai pass này trả về cùng cấu trúc `violations` (kind: `'degenerate'|'underconstrained'`) để đi chung repair loop bên dưới.

### 4.4. Repair loop — trong `api/analyze-geometry.js` (viết lại)
Thử theo thứ tự, dừng ngay khi verify pass:
1. **Deterministic repair trước** (`kernel/repair.ts`): với các vi phạm mang tính số học thuần tuý (ví dụ SA lệch vuông góc do sai số dựng, điểm gần-nhưng-không-đúng trên một mặt) — **nắn lại bằng code** (chiếu lại điểm, chuẩn hoá vector) mà không cần hỏi LLM. Nhanh, rẻ, không rủi ro hiểu sai đề thêm lần nữa.
2. **LLM repair có mục tiêu** — chỉ khi vi phạm mang tính *ngữ nghĩa* (kernel không tự suy ra được ý đồ, ví dụ thiếu hẳn một ràng buộc mà đề có nhắc): gửi plan cũ + danh sách vi phạm cụ thể ("assert perp(SA, ABCD) actual=0.03 expected≈0"), yêu cầu chỉ sửa plan, không tự do dựng lại. **Leo thang model**: lần sửa đầu dùng model đang dùng cho Translator; nếu vẫn fail, lần sửa thứ 2 dùng model mạnh/reasoning hơn.
3. Tối đa **2 lần LLM repair**. Sau đó vẫn fail → trả trạng thái `needs_clarification` (KHÔNG hiển thị hình sai).

### 4.5. Solve — `api/solve.js` (viết lại) + `kernel/solve.ts`
- Nhận `GeometryData` đã execute (toạ độ thật) + `Query`.
- Kernel **tự tính** đại lượng được hỏi: khoảng cách (điểm-mặt, hai đường chéo nhau...), góc (đường-mặt, nhị diện), thể tích, diện tích. Toàn công thức thật, có unit test.
- **Kiểm chéo bằng 2 phương pháp độc lập khi có thể** (ví dụ khoảng cách điểm→mặt: công thức thể tích `3V/S` **và** chiếu vector `|n̂·(P−A)|`; góc nhị diện: qua pháp tuyến **và** qua đường vuông góc chung dựng trực tiếp). Hai kết quả lệch nhau > ε → coi là **bug kernel**, log cảnh báo nội bộ (không phải lỗi người dùng) và fallback phương pháp còn lại + gắn cờ `low_confidence` để theo dõi, không chặn hiển thị vì đây là lỗi cài đặt cần fix chứ không phải lỗi đề.
- Ra `{ value: number, exact: string, steps_data: {...}, cross_checked: boolean }`.
- LLM **Narrator**: nhận con số + dữ liệu bước, chỉ *viết lời giải* (streaming). **Không** cho LLM tự tính đáp số — số đã có sẵn.
- Bỏ hẳn `verified = true` giả; nếu muốn double-check, verifier kiểm lại quan hệ trước khi tính.

### 4.6. Vision → text — `api/analyze-geometry.js` (nhánh ảnh)
Khi input có `imageBase64`: vision model **chỉ trích đề thành text** (OCR + diễn giải đề bài, không tự hiểu/tự dựng hình). Text trích ra chảy tiếp vào **đúng pipeline text** ở trên (fast-path → cache → Translator...) thay vì một nhánh riêng bỏ qua cache như hiện tại. Tách bạch "đọc ảnh" khỏi "hiểu hình" — vision model không được phép xuất toạ độ hay Plan trực tiếp.

### 4.7. Exact-form — `kernel/exactForm.ts`
Nhận `float` → dựng dạng chuẩn SGK `p·√q / r` (nhận dạng closed-form: thử khớp với `k·√n` cho n nhỏ, hữu tỉ hoá). Để đáp án khớp sách giáo khoa. Có bảng test riêng.

---

## 5. Ví dụ end-to-end

**Đề:** "Cho hình chóp S.ABCD đáy là hình vuông cạnh a, SA ⊥ (ABCD), SA = a√2. Tính góc giữa SC và (ABCD)."

**Plan (LLM xuất ra):**
```json
{ "solidName": "S.ABCD",
  "ops": [
    { "op": "base", "shape": "square", "vertices": ["A","B","C","D"], "dims": { "edge": 1 } },
    { "op": "perp_point", "name": "S", "from": "A", "to": "plane", "target": "ABCD", "length": 1.41421356 }
  ],
  "asserts": [
    { "op": "assert", "relation": "perp", "args": ["SA","ABCD"] },
    { "op": "assert", "relation": "dist", "args": ["S","A"], "value": 1.41421356 }
  ],
  "query": { "kind": "angle", "a": "SC", "b": "ABCD" } }
```

**Kernel execute:** A(0,0,0) B(1,0,0) C(1,1,0) D(0,1,0) S(0,0,√2).

**Verifier:** SA=(0,0,√2), AB=(1,0,0) → dot=0 ✓ (perp). |S−A|=√2 ✓ (dist). → 0 vi phạm.

**Solve:** góc(SC, mp z=0): tan = SA / AC = √2 / √2 = 1 → **45°**. `exact = "45°"`.

**Narrator (streaming):** "Vì SA⊥(ABCD) nên hình chiếu của SC lên (ABCD) là AC, góc cần tìm là ∠SCA. tan∠SCA = SA/AC = a√2 / a√2 = 1 ⇒ ∠SCA = 45°."

LLM không hề tự tính — mọi số do kernel cung cấp. Trên thực tế, đề dạng "S.ABCD đáy vuông, SA⊥đáy, SA=..." khớp thẳng **fast-path pattern matcher** (§4.0) — Plan ở trên được sinh **không cần gọi Translator**, tiết kiệm 1 round-trip LLM hoàn toàn cho lớp đề rất phổ biến này.

---

## 6. Tích hợp với code hiện tại

**Thêm mới:**
- `api/_lib/kernel/` — `planSchema.ts`, `fastPath.ts`, `execute.ts`, `verify.ts`, `repair.ts`, `solve.ts`, `exactForm.ts`, `index.ts`.
- `api/_prompts/prompts/translate.ts` — prompt cho Translator (đề → Plan). Ngắn, không few-shot khổng lồ; dựa vào json_schema.
- `api/_prompts/prompts/narrate.ts` — prompt cho Narrator (dữ liệu → lời giải).
- `api/_lib/telemetry.ts` — trace xuyên pipeline (§7.1 mục 5).
- Migration Supabase: thêm cột `construction_plan jsonb` vào bảng lưu hình hiện có (để Plan là nguồn chân lý bền, §4.1).
- Bộ test: `api/_lib/kernel/__tests__/` + corpus vàng `api/_lib/kernel/__tests__/golden/`.

**Viết lại:**
- `api/analyze-geometry.js` — bỏ chế độ multi-pass; thành: fast-path → (nếu miss) Translator → validate → execute → verify (kể cả degeneracy/DOF) → (deterministic repair → LLM repair có leo thang) → trả GeometryData + Plan. Giữ cache (SHA-256, thêm tầng chuẩn hoá — §Pha sau) và auth. Nhánh ảnh chuyển sang vision→text rồi tái sử dụng cùng pipeline (§4.6).
- `api/solve.js` — bỏ `verified=true`; kernel tính (kèm kiểm chéo 2 phương pháp), LLM narrate + stream.
- `api/modify-geometry.js` — **thay bằng cơ chế append-op**: câu lệnh modify rõ ràng (nối, trung điểm, xoá...) → thử khớp `localCommands.ts` hiện có trước, không khớp thì Translator dịch câu lệnh thành 1 `op` duy nhất → append vào Plan đã lưu → chạy lại kernel+verify. Không còn là pipeline LLM 9.8KB prompt riêng.

**Giữ nguyên (không đụng):**
- `src/types/geometry.ts` (kernel xuất đúng type này), toàn bộ `src/components/3d/*` renderer.

**Xoá / ngừng dùng:**
- `api/_lib/constraintVerify.js` + `constraintVerify.py` (đã chết) → thay bằng `kernel/verify.ts`.
- Đường JSON-repair-bằng-LLM trong `jsonHelpers.js` (Zod thay thế).

**Ngoài phạm vi lần này (pha sau, tách riêng — xem §8 "cải tiến theo pha"):**
- Frontend perf: `useHiddenLineDetection` raycast mỗi frame, memo hoá `GeometryContext`, bỏ `setTimeout` giả, streaming UI thật.
- Quota server-authoritative (bỏ tin `localStorage`).
- Cache 2 tầng (chuẩn hoá ngữ nghĩa) và thang leo model theo độ khó — tối ưu thêm sau khi lõi ổn.

---

## 7. Kiểm chứng & tiêu chí thành công

Đây là phần quan trọng nhất — làm sao biết bản mới **thực sự tốt hơn**.

### 7.1. Cách kiểm chứng (how we verify)

1. **Unit test cho kernel (TDD):** mỗi op và mỗi phép solve có test với toạ độ/đáp án biết trước (ví dụ trung điểm, chân đường vuông góc, góc đường-mặt, khoảng cách hai đường chéo nhau, thể tích chóp). Viết test trước, code sau.
2. **Corpus vàng (golden set):** tập **≥ 60 đề thật** từ SGK/đề thi (chia 2 nhóm: ~40 "khối chuẩn", ~20 "rộng"), mỗi đề kèm **hình đúng + đáp án đúng**. Một script chạy toàn bộ đề qua pipeline, in bảng pass/fail + đường đi thực tế (fast-path/Translator/repair nào được dùng).
3. **Verifier là bảo chứng runtime:** mọi hình hiển thị đều đã qua verify 0 vi phạm (kể cả degeneracy/DOF) — đo tỉ lệ verify-pass ở production.
4. **So sánh A/B với bản cũ:** chạy cùng corpus qua pipeline cũ và mới, so số câu đúng + độ trễ + chi phí token.
5. **Telemetry xuyên pipeline (bắt buộc, thuộc phạm vi lõi — không hoãn sang pha sau):** ghi ở mỗi chặng — plan, đường đi (fast-path/LLM), số violations theo loại, số lần repair (deterministic/LLM) và model dùng, cache hit, token, latency từng bước, `cross_checked`. Không có dữ liệu này thì không đo được các ngưỡng ở §7.2.

### 7.2. Định nghĩa "thành công" (số đo cụ thể)

| Tiêu chí | Ngưỡng đạt |
|---|---|
| **Bất biến không-ảo-giác** | **0** hình/đáp án chưa-verify được hiển thị. Hình sai → repair hoặc báo cần làm rõ. (điều kiện cứng, không thương lượng) |
| **Độ đúng — nhóm khối chuẩn** | ≥ **98%** đề trong corpus cho hình đúng + đáp án khớp exact-form |
| **Độ đúng — nhóm rộng** | ≥ **85%** đề cho kết quả đúng; phần còn lại rơi vào "cần làm rõ" (KHÔNG trả sai) |
| **Tất định** | Cùng một đề chạy 5 lần → hình + đáp án **giống hệt** (temperature=0 ở Translator; kernel tất định) |
| **Tốc độ — hiện hình** | p50 < **2.5s**, p95 < **5s** tới khi hình 3D đầu tiên hiện (1 round-trip + kernel < vài ms) |
| **Tốc độ — lời giải** | Bắt đầu **stream** lời giải < 1.5s sau khi bấm giải; không còn `setTimeout` giả |
| **Số round-trip LLM** | **0** cho đề khớp fast-path, **1** cho dựng hình qua Translator (thêm tối đa 2 nếu repair), **1** cho giải. (cũ: 2–4 luôn luôn) |
| **Tỉ lệ fast-path hit** | ≥ **30%** đề trong corpus nhóm "khối chuẩn" dựng hình mà **không** gọi LLM (đo qua telemetry §7.1 mục 5) |
| **Chi phí token/đề** | Giảm ≥ **40%** so với bản cũ (bỏ few-shot + không re-serialize JSON khổng lồ + fast-path miễn token) |
| **Modify không tốn LLM** | ≥ **70%** thao tác modify trong corpus (nối điểm, trung điểm, xoá, đổi tên...) chạy qua append-op, không gọi LLM |

### 7.3. Cổng nghiệm thu
Bản mới chỉ được thay bản cũ khi: (a) toàn bộ unit test xanh, (b) đạt ngưỡng độ-đúng ở §7.2 trên corpus vàng, (c) bất biến không-ảo-giác giữ 100% trên corpus, (d) telemetry cho thấy đạt ngưỡng fast-path hit + chi phí token.

---

## 8. Phân pha triển khai

- **Pha 1 — Kernel + verifier (nền móng):** planSchema, execute (khối chuẩn + điểm dẫn xuất + perp/foot/intersect), verify (kể cả degeneracy/DOF, §4.3), deterministic repair (§4.4 bước 1), exactForm, đầy đủ unit test, telemetry cơ bản. Chưa nối LLM. *Nghiệm thu: chạy được Plan viết tay → hình + verify đúng.*
- **Pha 2 — Fast-path + Translator + analyze pipeline:** fastPath.ts với bộ mẫu ban đầu (~10-15 mẫu phổ biến nhất), prompt translate, structured output, LLM repair loop có leo thang model, Plan persistence (cột `construction_plan`), viết lại `analyze-geometry.js`. *Nghiệm thu: đề tiếng Việt → hình đúng, đạt ngưỡng corpus nhóm chuẩn + ngưỡng fast-path hit ban đầu.*
- **Pha 3 — Solve + Narrator:** kernel/solve (kèm kiểm chéo 2 phương pháp), viết lại `solve.js`, narrate streaming. *Nghiệm thu: đáp án đúng + lời giải stream + `cross_checked` hoạt động.*
- **Pha 4 — Modify qua append-op:** viết lại `api/modify-geometry.js` dùng Plan persistence từ Pha 2, tái dùng `localCommands.ts` làm fast-path cho modify. *Nghiệm thu: đạt ngưỡng "modify không tốn LLM" §7.2.*
- **Pha 5 — Mở rộng "rộng":** section/thiết diện, constraint-solver nhẹ cho điểm tự do, vision→text (§4.6), mở rộng bộ mẫu fast-path dựa trên corpus. *Nghiệm thu: đạt ngưỡng nhóm rộng.*
- **Pha 6 — Tối ưu chi phí (sau khi lõi đã đúng & ổn định):** cache 2 tầng (chuẩn hoá ngữ nghĩa), thang leo model theo độ khó áp dụng rộng hơn cho cả Translator (không chỉ repair).
- **(Sau) Pha 7 — Frontend perf + quota server-side** (spec riêng).

Mỗi pha có spec → plan → cài đặt riêng. Thứ tự trên ưu tiên "Đúng" trước (Pha 1-3 dựng xong toàn bộ vòng kiểm chứng) rồi mới tối ưu "Nhanh/Rẻ" thêm (Pha 6), đúng tinh thần ưu tiên đã chốt.

---

## 9. Rủi ro & quyết định mở

- **Đáp án ký hiệu (a√6/3):** kernel tính số; `exactForm` dựng lại dạng chuẩn. Rủi ro: một số dạng lạ nhận diện không ra → fallback hiển thị số thập phân + cảnh báo. *Chấp nhận cho Pha 3, cải thiện dần.*
- **Phần "rộng" cần điểm tự do (quỹ tích, dựng hình mở):** giải bằng constraint-solver nhẹ (Newton) ở Pha 5 — rủi ro hội tụ; nếu không hội tụ → "cần làm rõ".
- **Chất lượng Translator:** phụ thuộc model đủ mạnh để bám json_schema. Giữ lớp trừu tượng provider hiện có; chọn model theo độ khó (rẻ cho parse, mạnh cho đề phức tạp).
- **Nhập nhằng đề tiếng Việt:** nếu Translator không chắc → xuất `needs_clarification` thay vì đoán bừa.
- **Fast-path khớp sai mẫu:** một regex/grammar khớp nhầm (ví dụ đề có biến thể nhỏ khác ý mẫu) có thể sinh Plan sai mà verifier không bắt được nếu assert cũng bị sinh sai theo. Giảm rủi ro: fast-path luôn chạy qua **cùng** verifier như đường LLM (không có "lối tắt" bỏ qua kiểm chứng), và mẫu chỉ được thêm vào sau khi đã chứng minh đúng trên corpus vàng.
- **Deterministic repair có thể che giấu lỗi kernel thay vì sửa lỗi Plan:** nắn số học "cho verify pass" đôi khi là vá triệu chứng. Giới hạn: chỉ áp dụng deterministic repair cho sai số nhỏ (ε lớn hơn dung sai chuẩn nhưng dưới một ngưỡng "hợp lý", ví dụ < 1% kích thước hình) — vượt ngưỡng thì coi là lỗi ngữ nghĩa, chuyển thẳng sang LLM repair.

---

## 10. Câu một dòng

> LLM để **hiểu và diễn giải**, kernel để **tính và làm luật**; không bao giờ hiển thị thứ chưa qua verify.
