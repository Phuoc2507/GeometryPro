# Làm lại chế độ vẽ: gộp "Advance" vào "Vẽ kỹ" — còn 2 chế độ (Nhanh / Kỹ)

> **Bối cảnh:** Chế độ `advance` đang bị KHOÁ (chỉ admin, `DrawModeSelector.tsx:148`,
> `analyze-advance.js:281`). Đánh giá kiến trúc kết luận: "Advance" thực chất gồm 2 năng lực,
> trong đó phần đắt giá (builder calculus tất định + animation) **đã nằm trong Vẽ kỹ** qua cầu
> `[detailed→advance]` (`analyze-geometry.js:323`). Chỉ còn **bóc lớp đa-câu (multi-question)** và
> **nhận đề bằng ảnh cho luồng nâng cao** là chưa có trong Vẽ kỹ.

**Mục tiêu:** Xoá "Advance" như một chế độ người dùng phải chọn. "Vẽ kỹ" trở thành superset:
tự động sinh `AdvanceScene` (Stepper + lời giải từng câu) khi đề đa-câu, và nhận cả đề ảnh cho
luồng nâng cao. Kết quả: **UI chỉ còn 2 chế độ, 1 pipeline backend, không còn 2 danh sách nạp
động song song, bỏ tầng credit `draw_advance` + đống logic hoàn-tiền-tụt-hạng.**

**Nguyên tắc bất biến (giữ nguyên qua toàn bộ đợt làm lại):**
- **Chống ảo giác:** mọi đường thất bại (split hỏng, coverage fail, builder null) → rơi êm về
  hình thường của Vẽ kỹ hoặc báo thẳng, TUYỆT ĐỐI không vẽ bừa. Giữ y nguyên `coverageCheck`,
  các guard `looksLike*`, và cơ chế self-verify của builder.
- **Không đập bỏ tài sản engine:** giữ toàn bộ `buildRevolutionScene / buildVesselScene /
  buildSliceScene / buildAreaScene / buildSectionScene`, `splitProblem`, `coverageCheck`,
  `projectScene`, `AdvanceStepper`, `AdvanceSolutionPanel`.
- **Không phá dữ liệu cũ:** hình đã lưu với `drawMode:'advance'` vẫn mở lại được.
- **TDD:** mỗi task đỏ→xanh; chạy `npm run test` (Vitest) trước khi commit.

---

## 0. Trạng thái hiện tại (bản đồ code cần đụng)

**Backend**
- `api/analyze-geometry.js` — route Nhanh/Kỹ. Khối `[detailed→advance]` (dòng ~323–353) đã regex-gate
  gọi `runAdvance` cho vessel/revolution/cross/area/section, trả `{mode:'advance', scene}`. **Chặn ảnh**
  (`!imageBase64`, dòng 328). **KHÔNG bắt `multi_question` chung.**
- `api/analyze-advance.js` — route Advance riêng (~410 dòng): admin-gate, credit `draw_advance`,
  deadline 52s, `assembleAdvance`, hoàn-tiền-tụt-hạng. **Sẽ rút gọn thành shim.**
- `api/_lib/advance/` — `splitProblem`, `buildAdvanceScene`, `runAdvance`, 5 builder, `coverage`.
  `runAdvance.js` và `analyze-advance.js` **giữ 2 danh sách nạp động trùng nhau** (rủi ro lệch).
- `api/_lib/entitlements.js` — `CREDIT_COST.draw_advance = 30`.

**Frontend**
- `src/components/DrawModeSelector.tsx` — 3 nút; `advanceLocked` cho non-admin; `compareModes` chỉ
  liệt kê quick + detailed (advance đã bị bỏ khỏi bảng so sánh).
- `src/context/GeometryContext.tsx` — `analyzeText` (dòng 699), `analyzeAdvance` (780),
  `queueAnalyzeText` (đã nhận `mode:'advance'` ở ~958), reducer `SET_ADVANCE_SCENE` (267).
- `src/components/DropZone.tsx` — routing theo `drawMode` (dòng 59/62/140 gọi `analyzeAdvance`).
- `src/types/geometry.ts` — `DrawMode`, `AdvanceScene`, `AdvanceStep`.
- UI đa-câu: `AdvanceStepper.tsx`, `AdvanceSolutionPanel.tsx`, `advanceProject.ts` (projectScene).

**Kết quả mong muốn (after):**
```
UI:      [Vẽ nhanh]  [Vẽ kỹ]                 ← 2 nút
Kỹ =     kernel tĩnh ⟶ (đề đa-câu?  → AdvanceScene: Stepper + lời giải)
                       (đề calculus? → builder tất định + animation)   ← ảnh cũng chạy
                       (còn lại      → hình LLM 2-pass như cũ)
Credit:  draw_quick=10, draw_detailed=20     ← bỏ draw_advance
Route:   /api/analyze-geometry (một cửa)     ← analyze-advance.js chỉ còn shim tương thích
```

---

## Phase 1 — Backend: đưa `multi_question` vào luồng Vẽ kỹ (năng lực DUY NHẤT còn thiếu)

**Files:** sửa `api/analyze-geometry.js`; test mới `api/_lib/__tests__/detailed-multiquestion.test.js`.

Ý tưởng: khối `[detailed→advance]` hiện chỉ chạy khi `looksLike*` (calculus). Bổ sung: khi KHÔNG
khớp calculus, vẫn thử `splitProblem` — nếu ra `multi_question` (coverage ok) thì chạy
`buildAdvanceScene` và trả `AdvanceScene`. Đây chính là phần "advance" thật sự.

- [ ] **Step 1 (đỏ):** test — với đề 2 câu (mock `splitProblem`→multi_question, mock
  `buildAdvanceScene`→scene), luồng detailed trả `{mode:'advance', scene}`; với đề 1 câu → không
  đụng tới (rơi luồng Vẽ kỹ thường).
- [ ] **Step 2:** tách phần chung của khối `[detailed→advance]` thành 1 nhánh:
  - Gọi `runAdvance(trimmedPrompt, { imageBase64 })` **một lần** (nó đã chứa cả split + mọi builder
    + nhánh `multi_question` bên trong `assembleAdvance`). KHÔNG cần gọi `splitProblem` tay ở route.
  - Điều kiện phục vụ: `adv.mode === 'advance' && adv.scene?.base?.points?.length`.
  - Bỏ điều kiện chặn theo `looksLike*` ở TẦNG NÀY — để `assembleAdvance` tự quyết (nó đã có đủ
    guard + fallback). `looksLike*` chỉ còn dùng trong `assembleAdvance` để báo-thẳng khi calculus
    dựng hỏng, giữ nguyên.
- [ ] **Step 3:** giữ `logEngineDecision({ reason: 'advance-from-detailed' })` cho quan sát.
- [ ] **Step 4 (xanh):** `npx vitest run api/_lib/__tests__/detailed-multiquestion.test.js`.

**Rủi ro thời gian:** `assembleAdvance` có nhiều lượt LLM (~30–40s). Vẽ kỹ hiện chạy stream với
timeout rộng. Thêm **deadline nội bộ** cho nhánh này (tái dùng hằng `ADVANCE_DEADLINE_MS`, mặc định
52s) và `Promise.race` như `analyze-advance.js:335`. Chạm deadline → rơi về Vẽ kỹ thường (KHÔNG
504). Đây là điểm phải test kỹ (Phase 6).

---

## Phase 2 — Backend: cho luồng nâng cao trong Vẽ kỹ nhận ĐỀ ẢNH

**Files:** `api/analyze-geometry.js`.

Hiện `[detailed→advance]` bị `!imageBase64` (dòng 328) vì gate là regex-trên-chữ. Nhưng
`splitProblem` **đã gộp đọc-ảnh + phân loại trong 1 lượt vision** (`splitProblem.js:52`,
`opts.imageBase64`). Nên chỉ cần truyền ảnh xuống.

- [ ] **Step 1 (đỏ):** test — detailed + `imageBase64` (mock `runAdvance`→scene) trả `mode:'advance'`.
- [ ] **Step 2:** bỏ nhánh chặn ảnh; gọi `runAdvance(trimmedPrompt || '', { imageBase64 })`.
  Khi chỉ có ảnh, `trimmedPrompt` rỗng → `assembleAdvance` lấy `split.setup` (bản chép) làm
  `effectiveText` (đã hỗ trợ sẵn, `analyze-advance.js:127`).
- [ ] **Step 3:** giữ fail-fast "đọc ảnh hỏng" (`IMAGE_READ_FAILED_MSG`) → rơi về Vẽ kỹ thường
  (luồng LLM có `imageBase64` vẫn vẽ được hình cơ bản), KHÔNG để trắng màn.
- [ ] **Step 4 (xanh):** chạy test.

---

## Phase 3 — Backend: gỡ bỏ endpoint Advance riêng, xoá nợ "2 danh sách nạp động"

**Files:** `api/analyze-advance.js` (rút gọn), `api/_lib/advance/runAdvance.js` (nguồn chân lý duy
nhất về danh sách builder).

- [ ] **Step 1:** `runAdvance.js` đã là chỗ ráp deps duy nhất — biến nó thành **nguồn chân lý**:
  các nơi cần chạy pipeline (route detailed ở Phase 1, `redrawProblem.js`) đều gọi `runAdvance`.
- [ ] **Step 2:** `analyze-advance.js` → rút thành **shim tương thích ngược** cho client cũ / gọi
  thẳng: nhận request, **định tuyến nội bộ sang cùng logic detailed** (hoặc trả 410/hướng dẫn dùng
  Vẽ kỹ). Giữ credit = mức `draw_detailed`, KHÔNG còn `draw_advance`. Xoá phần deadline/hoàn-tiền-
  tụt-hạng **trùng** (đã nằm ở nhánh detailed sau Phase 1).
  - *Lý do giữ shim thay vì xoá hẳn:* client đã build/cache có thể còn POST `/api/analyze-advance`
    (`GeometryContext.analyzeAdvance` dòng 834). Xoá file → 404 giữa lúc chuyển đổi. Shim sống ≥1
    chu kỳ deploy rồi mới cân nhắc xoá.
- [ ] **Step 3:** gỡ `requireAdmin`/`ADVANCE_ADMIN_ONLY_MSG` khỏi đường phục vụ (khoá admin không
  còn ý nghĩa khi năng lực đã mở cho mọi người qua Vẽ kỹ). Giữ export các `*_UNSUPPORTED_MSG` +
  `looksLike*` + `assembleAdvance` (được import bởi `runAdvance`/tests) — **không đổi chữ ký**.
- [ ] **Step 4:** cập nhật `api/_lib/advance/__tests__/analyze-advance.test.js` cho hình dạng mới.
- [ ] **Step 5 (xanh):** `npm run test`.

---

## Phase 4 — Frontend: bỏ chế độ `advance` khỏi UI, hợp nhất đường gọi

**Files:** `DrawModeSelector.tsx`, `DropZone.tsx`, `GeometryContext.tsx`, `types/geometry.ts`.

- [ ] **Step 1 — DrawModeSelector:** bỏ entry `advance` khỏi `modes`; xoá `advanceLocked`, nhánh
  toast "đang nâng cấp", và dòng chú thích Lock. Cập nhật `compareModes` cho Vẽ kỹ nêu rõ **"tự động
  bóc lớp theo từng câu khi đề nhiều ý; dựng khối tròn xoay/thiết diện chính xác"** (đây là chỗ nói
  cho người dùng biết Vẽ kỹ nay bao trùm mọi thứ Advance từng làm).
- [ ] **Step 2 — DropZone:** thay mọi `if (drawMode === 'advance') context.analyzeAdvance(...)`
  bằng đường Vẽ kỹ thường (`queueAnalyzeText` / `queueAnalyzeImage` với `mode:'detailed'`). Cả text
  lẫn ảnh giờ đi một cửa.
- [ ] **Step 3 — GeometryContext:** `queueAnalyzeText` **đã** nhận `mode:'advance'` scene từ
  response (dòng ~958) → nhúng `advanceScene` + `SET_ADVANCE_SCENE`. **Không cần đổi.**
  - Giữ `analyzeAdvance()` như **wrapper mỏng** (gọi queueAnalyzeText detailed) để không vỡ nơi
    khác đang tham chiếu, hoặc xoá và sửa các call-site. Chọn 1, ghi rõ trong PR.
  - Lưu ý `drawMode` lưu vào lịch sử: response `mode:'advance'` hiện set `drawMode:'advance'`
    (dòng 964). **Giữ `'advance'` ở tầng dữ liệu geometry** (nó chỉ đánh dấu "hình này là scene bóc
    lớp") — đây KHÁC với `DrawMode` của UI. Xem Phase 5 để tách 2 khái niệm.
- [ ] **Step 4 — types:** `DrawMode` (lựa chọn UI) rút còn `'quick' | 'detailed'`. Trường
  `GeometryData.drawMode` (đánh dấu nguồn hình, `geometry.ts:400`) **giữ cả `'advance'`** để mở lại
  hình cũ không vỡ. Đổi tên/ghi comment tách bạch 2 nghĩa để tránh nhầm.
- [ ] **Step 5:** `RedrawGoldenButton.tsx:84` (`source === 'advance' ? 'advance' : 'detailed'`) —
  rà lại: nút "Nhờ AI vẽ lại" gọi `redrawProblem`→`runAdvance`, giữ hoạt động; chỉ đảm bảo không
  gửi `mode:'advance'` tới endpoint đã shim.
- [ ] **Step 6:** cập nhật test frontend liên quan (`geometryContext.advanceT.test.tsx`,
  `advanceAnimControl.test.tsx` vẫn xanh vì UI đa-câu KHÔNG đổi).

---

## Phase 5 — Credit / entitlements: bỏ `draw_advance`

**Files:** `api/_lib/entitlements.js`, chỗ dùng `creditCostFor('draw_advance')`.

- [ ] **Step 1:** xoá `draw_advance` khỏi `CREDIT_COST` (hoặc để `= draw_detailed` như alias tương
  thích 1 chu kỳ rồi xoá). Mọi đường phục vụ nâng cao tính đúng **20 (draw_detailed)**.
- [ ] **Step 2:** gỡ logic "hoàn chênh lệch xuống Vẽ kỹ" (`analyze-advance.js:347–364`) — không còn
  chênh lệch để hoàn. Giữ hoàn-tiền khi thực sự KHÔNG vẽ được (revUnsupported) như luồng Vẽ kỹ.
- [ ] **Step 3:** grep toàn repo `draw_advance` đảm bảo không còn tham chiếu chết (tests, docs).

---

## Phase 6 — Kiểm chứng, verify badge, độ trễ

- [ ] **Step 1 — verify badge:** `AdvanceStepper.tsx:10` đang `SHOW_VERIFY_BADGE=false`. Quyết định
  dứt điểm: (a) hoàn thiện tín hiệu `verified` từ engine rồi bật, hoặc (b) bỏ hẳn code badge. Không
  để cờ chết lửng. (Khuyến nghị (a): engine đã trả `verified:true` cho câu giải được ở
  `buildAdvanceScene.js:79`.)
- [ ] **Step 2 — độ trễ:** đo p95 nhánh detailed-multiquestion trên bộ đề thật. Nếu vượt ~45s,
  cân nhắc: cap số câu (`buildAdvanceScene.js:35` đang ≤6), hoặc chạy `solveQuestion` +
  `solveSteps` song song (đã Promise.all). Ghi số đo vào PR.
- [ ] **Step 3 — thông điệp UX:** đề đa-câu dựng hỏng → toast "đã vẽ hình, chưa bóc lớp được từng
  câu" thay vì im lặng. Đề calculus hỏng giữ các `*_UNSUPPORTED_MSG`.

---

## Phase 7 — Dữ liệu & dọn dẹp cuối

- [ ] **Step 1 — golden store:** hình chuẩn đã duyệt với `mode:'advance'` (`goldenStore`,
  `RedrawGoldenButton`) vẫn phục vụ được: `findGolden` trả `golden.response` nguyên trạng, frontend
  đọc `data.mode === 'advance'` (queueAnalyzeText) → OK, **không cần migrate DB**. Chỉ kiểm bằng test.
- [ ] **Step 2 — smoke e2e:** đề 1 câu tĩnh (→ kernel), đề tròn xoay (→ builder), đề 3 câu
  (→ AdvanceScene + Stepper), đề ảnh nâng cao. Tất cả qua **một nút "Vẽ kỹ"**.
- [ ] **Step 3 — docs:** đánh dấu spec/plan advance cũ là "superseded bởi tài liệu này". Cập nhật
  `CLAUDE.md`/README nếu có nhắc 3 chế độ.
- [ ] **Step 4:** `npm run lint && npm run test && npm run build`.

---

## Giữ gì / Bỏ gì (bảng tra nhanh)

| GIỮ (tài sản) | BỎ / RÚT GỌN |
|---|---|
| 5 builder tất định + self-verify | Chế độ `advance` trong `DrawModeSelector` |
| `splitProblem` + `coverageCheck` | Khoá admin + `ADVANCE_ADMIN_ONLY_MSG` |
| `buildAdvanceScene` (bóc lớp đa-câu) | `CREDIT_COST.draw_advance` + hoàn-tiền-tụt-hạng |
| `projectScene`, Stepper, SolutionPanel, AnimControl | Endpoint `analyze-advance` đầy đủ → còn shim |
| `runAdvance` (nguồn chân lý deps) | Danh sách nạp động trùng ở `analyze-advance.js` |
| `GeometryData.drawMode` nhận cả `'advance'` (mở hình cũ) | `DrawMode` UI: bỏ `'advance'` |
| Các `*_UNSUPPORTED_MSG` guard chống ảo giác | Đường gọi `analyzeAdvance` riêng ở DropZone |

## Rủi ro & rollback

- **Thời gian/504:** nhánh nâng cao trong Vẽ kỹ nặng. Bọc deadline + `Promise.race`, rơi về Vẽ kỹ
  thường. Nếu p95 xấu → bật cờ ENV `DETAILED_ADVANCE=off` để tắt nhánh, Vẽ kỹ về hành vi cũ (giữ
  đường lui bằng biến môi trường, không cần revert code).
- **Client cũ:** shim `analyze-advance` giữ tương thích ≥1 chu kỳ deploy.
- **Rollback:** mỗi Phase là commit độc lập; Phase 1–2 (backend, sau cờ ENV) có thể bật/tắt không
  đụng UI. Đổi UI (Phase 4) chỉ merge sau khi backend chạy ổn định.

## Thứ tự thực thi đề xuất

`Phase 1 → 2` (backend sau cờ ENV, chưa lộ ra UI) → đo đạc `Phase 6` → `Phase 4` (đổi UI) →
`Phase 3, 5` (dọn endpoint + credit) → `Phase 7` (dữ liệu + smoke + docs).
