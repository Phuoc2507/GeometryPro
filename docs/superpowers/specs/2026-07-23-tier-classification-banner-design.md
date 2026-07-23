# Tiểu-dự án B — Ống phân loại 3 mức an toàn + banner dạng bài (thiết kế)

**Ngày:** 2026-07-23
**Thuộc chương trình:** 3-mức an toàn + trải nghiệm giáo viên (E → A → B → D → C)
**Tiểu-dự án:** B (keystone: lớp phân loại + UX ngồi trên lõi engine đã được A củng cố)
**Nhánh thực thi:** `claude/tier-classification` (tách từ `origin/main`, worktree `F:/geo3dnew/geo3d/.claude/worktrees/tier-classification`) — cố ý KHÔNG stack trên `claude/kinematic` để không kéo theo commit A-Nhịp-2 (`754ebee`) đang giữ chờ cổng 50-ca.
**Đã soát:** bản này đã qua **review đối kháng 3 tác nhân đọc code thật** (2026-07-23) — sửa 2 blocker ngữ nghĩa + ~8 lỗi major; các neo code đánh số dòng dưới đây đã xác minh trực tiếp.

---

## 1. Mục tiêu

Biến mô hình xác thực **nhị phân** hiện tại (`verified: true/false`) thành mô hình **3 mức an toàn** rõ ràng, hiển thị cho giáo viên qua một **banner "dạng bài · mức an toàn"**, đồng thời **render lời giải thích khi chưa chứng thực / từ chối** (hiện đang bị vứt) và **gom hai renderer badge đang vênh** về một nguồn duy nhất. B **lát sẵn "con đường 3 làn"**: Làn 1 (Chứng thực) và Làn 3 (Chưa chứng thực / Từ chối) có xe ngay; Làn 2 (Minh hoạ đại diện) được lát + gắn biển sẵn để tiểu-dự án C dẫn xe vào sau.

## 2. Bối cảnh & vấn đề (theo bản đồ code 2026-07-23, đã xác minh)

- **UI nhị phân, gộp lẫn nghĩa.** `verified: false` đang trộn ba thứ khác hẳn nhau: (a) "engine **chưa giải được** dạng này → đang hiện đáp LLM chưa kiểm chứng"; (b) "engine **từ chối** vì không dựng được / vi phạm giả thiết"; (c) "translator **khước từ** vì thiếu số liệu". Không phân biệt được.
- **Lời từ chối bị vứt.** Translator abstain (`{abstain, abstain_reason}`) ném lỗi ở `solveWithKernel.js:37-38`, bị caller nuốt (try/catch ở `analyze-geometry.js:242`, `solve.js:73`) rồi **âm thầm tụt xuống đáp án LLM**. `solve.js:73` chỉ `console.warn` message rồi `assembleSolveResult` trả **verify_error CHUNG** (`solveAssemble.js:40` — "Engine chưa giải được dạng này…"); **`abstain_reason` thật bị mất** (chỉ log). **Không component nào render** `verify_error` (`SolveResultView` chỉ khoá vào `verified`).
- **Hai badge vênh nhau.** `SolverPanel.tsx` (L253-266) dùng icon Info **trung tính** ("chưa: KHÔNG phải X", tông "gọn, không hù dọa"); `AdvanceStepper.tsx` (L77-91) dùng AlertTriangle **vàng cảnh báo**. Không có mapping chung.
- **Chưa có Mức 2 ở bất kỳ đâu.** Grep "chỉ đúng ở hình này" = 0 hit; grep `representative` trong `api/_lib`+`src` = 0 hit. Pref `showIllustrationValues` đã khai báo (E) nhưng **không code nào đọc** — để dành C.
- **Chưa có field mức nào.** `GeometryData` (`src/types/geometry.ts:212+`) không có `classification`; `SolveResult` (`useSolver.ts:26-32`) chỉ có `verified`/`verify_error`. Translator chỉ xuất plan (+ abstain, + scaleSymbol), không có `problemKind`.
- **Điểm hội tụ lý tưởng đã xác định.** `solveProblem()` (`solveWithKernel.js:119-142`, biến `result` tại L121 `{ plan, ...solvePlan(plan) }`, `return result` tại L141) là chỗ CẢ hai nhánh engine đã hội tụ về một shape VÀ metadata translator (`result.plan`) đã có mặt. (Ngoại lệ: một early-return của khối `KERNEL_CROSSCHECK` tại L133-137 — mặc định TẮT; xử lý ở §5.1.)

## 3. Nguyên tắc thiết kế

1. **Mô hình 2 trục** (đã chốt với chủ dự án):
   - **Trục AN TOÀN** — *Mức 1/2/3* — trả lời "có tin được đây là ĐÁP ÁN không".
   - **Trục CHÍNH XÁC** — *exact / số* — nhãn phụ mô tả **dạng hiển thị** của đáp Mức 1, KHÔNG phải mức an toàn.
   - **Đáp án số của bài đủ dữ kiện = Mức 1** (nhãn phụ "số"), tuyệt đối không tụt xuống Mức 2. Không đáp án đúng nào bị hạ cấp.
2. **Chỉ THÊM, không phá.** `SolveResult` shape đóng băng (`{steps, final_answer, answer_value, verified, verify_error, geometry}`) — chỉ **thêm** field `tier`, không đổi/không xoá field cũ. `assembleSolveResult` giữ nguyên 5 field (`tier` gắn ở `solve.js`, KHÔNG sửa `solveAssemble.js`).
3. **B mirror `engineSolved` Y HỆT — không nới, không siết.** `verified` KHÔNG BAO GIỜ true cho đáp án LLM bịa. **Mức 1 ⟺ `engineSolved(result)===true`** (định nghĩa dưới) — B chỉ **làm hiện rõ** cái `verified` sẵn có, KHÔNG mở rộng phủ verification (mở rộng = nhịp engine riêng, §9). Bất biến này kín tuyệt đối vì classifier gọi chính hàm `engineSolved`.
4. **"tier" là AN TOÀN, tách khỏi "tier" GÓI CƯỚC.** Codebase đã có billing tier (`free/teacher/pro/school`, `TIER_LABELS` ở `Settings.tsx:16-21`). Tránh va: KHÔNG dùng field trần `tier` dạng chuỗi ở tầng UI; dùng object lồng `classification`/`tier.level` (số 1/2/3).
5. **Một nguồn sự thật, MỘT shape.** Mức được tính MỘT lần bằng `classifyTier()` trong `solveProblem()`; cả draw lẫn solve thừa hưởng cùng object `{ level, exactness, problemType, reason }` → không nhân đôi logic, không lệch key.
6. **Nhẹ, tránh cổng nặng ở Nhịp 1.** Nhịp 1 KHÔNG chạm `translatorPrompt.js` → tránh cổng 50-ca live. Nhãn phụ chính xác suy từ **field per-answer sẵn có** (`exact`/`approximate`) — KHÔNG sửa kernel, KHÔNG rebundle `kernel-dist`.
7. **Tông "gọn, không hù dọa".** Mức 3 "chưa chứng thực" (engine chưa giải) đi tông **trung tính**; chỉ dành treatment mạnh hơn cho từ chối/vi phạm có lý do rõ. Không doạ.

## 4. Định nghĩa 3 mức + trục chính xác

### 4.0. `engineSolved` — hòn đá tảng (đã đọc `solveAssemble.js:2-6`)

```
engineSolved(eng) = !!(eng && eng.ok && eng.answers && eng.answers[0]
  && typeof eng.answers[0].approx === 'number' && Number.isFinite(eng.answers[0].approx)
  && (eng.violations?.length ?? 0) === 0)
```

Đây là hàm quyết định `verified: true` trong `assembleSolveResult` (L31-33) VÀ điều kiện stamp `geometry.engineAnswer.verified` ở draw (`analyze-geometry.js:195` — `if (_ea && Number.isFinite(_ea.approx))`). Hai bề mặt draw/solve **đã thống nhất** ở điều kiện approx hữu hạn. Mức 1 neo vào đúng hàm này ⇒ không thể lệch.

### 4.1. Trục AN TOÀN (`level`)

Thứ tự xét trong classifier: **representative → engineSolved → còn lại**.

| Mức | Tên | Điều kiện (từ tín hiệu sẵn có) | Khẳng định |
|-----|-----|-------------------------------|-----------|
| **2** | Minh hoạ đại diện | `result.representative === true` (cờ do C bật; **B chưa bao giờ bật** — rail rỗng) | "Chỉ đúng ở hình này" — KHÔNG khẳng định |
| **1** | Chứng thực | `engineSolved(result) === true` (ok + `answers[0].approx` số hữu hạn + 0 violations) | "Đã kiểm chứng" ✅ |
| **3** | Chưa chứng thực / Từ chối | Còn lại (không phải 1, không phải 2) | tông theo `reason.kind` |

- **Mức 1 GỒM đáp án số** của bài đủ dữ kiện: khoảng cách, thể tích, diện tích, tỉ số (có `approx`), mặt cầu, toạ độ điểm (khi có `approx` hữu hạn), và **mọi đáp nhánh phân tích** (tối ưu/tích phân/eval/giải PT/bisection) khi trả `approx` hữu hạn. (Lưu ý trung thực: `integrate`/`eval` tin theo **tính hữu hạn**, KHÔNG qua cổng residual — chỉ `solve/optimize/*_multi` có cổng assert/residual; xem `runAnalysis.ts`. §10.)
- **Mức 3 có LÝ DO con** (`reason.kind`), phân biệt rõ 4 ca — giàu hơn hẳn "chưa kiểm chứng" đơn của hôm nay:
  - `unsolved` — `ok===true` nhưng **KHÔNG** `engineSolved` (đáp không có số hữu hạn surface): **góc** (`AngleAnswer` không có `approx`/`exact` — đã đọc `answer.ts:19-26`), **phương trình** (`{text, approximate}`, không `approx`), **vị trí tương đối**, **giao điểm**, và **THANG CHỮ** (`applyScaleSymbol` đặt `approx: null` — `solveWithKernel.js:90`). **Tông trung tính**: "Engine dựng được hình nhưng chưa chứng thực đáp số dạng này — đang hiện đáp AI." **Đây đúng bằng `verified:false` hôm nay ⇒ KHÔNG hồi quy.**
  - `violation` — hình toạ-độ-hoá **vi phạm giả thiết** (`violations.length > 0`).
  - `error` — schema/execute/compute lỗi (`errors.length > 0`, hoặc translator trả non-JSON / sai schema).
  - `abstain` — translator **khước từ** (thiếu số liệu / ngoài danh mục), kèm `abstain_reason`.
- **Mức 2 trong B:** được **định nghĩa + lát rail + gắn nhãn** nhưng **B KHÔNG dựng cơ chế vẽ hình đại diện** (deliverable của C, tiêu thụ `showIllustrationValues`). Classifier có nhánh `if (result.representative === true) level = 2` sẵn cho C bật cờ; **B không bao giờ đặt `representative`** ⇒ Mức 2 **rỗng** cho tới khi C dẫn xe vào. Ranh giới phạm vi cố ý, nêu rõ ở §9.

**Phủ Mức 1 ở Nhịp 1 (đã chốt Option A):** khoảng cách/thể tích/diện tích/tỉ số/mặt cầu/tối ưu/tích phân/eval/giải-PT-số. **Góc, phương trình, vị trí tương đối, giao điểm, THANG CHỮ → Mức 3 `unsolved` trung tính** (= status quo). Mở rộng để engine chứng thực các dạng này = **nhịp engine riêng sau** (§9), KHÔNG thuộc B.

### 4.2. Trục CHÍNH XÁC (`exactness`, CHỈ có nghĩa khi Mức 1 ⇒ `answers[0].approx` luôn hữu hạn)

Vì Mức 1 ⟺ `engineSolved`, đáp Mức 1 **luôn** có `approx` số hữu hạn. Nhãn phụ chỉ tách "khớp đúng đại số" khỏi "giá trị số":

| Giá trị | Điều kiện | Ví dụ hiển thị |
|---------|-----------|----------------|
| `exact` | **nhánh hình học** (`!('parameter' in result)`) **và** `answers[0].exact != null` **và** `answers[0].approximate === false` (đã cross-check float độc lập 1e-6, xem `certifyDistance`/`certifyScalar` ở `answer.ts`) | `√3`, `6x+3y+2z-6=0` |
| `numeric` | Còn lại của Mức 1: nhánh phân tích (**luôn** numeric — không có field `exact`), hoặc hình học `approximate:true` | `7,49` |

**Quyết định giữ nguyên (đã xác minh nguy cơ):**
- **Gate theo NHÁNH trước.** Nhánh phân tích không có field `exact` ⇒ `answers[0].exact` là `undefined` ⇒ `undefined != null` là **true** (bẫy!). Nếu không gate nhánh, một đáp phân tích `recognizeConstant` (đặt `approximate:false`, `runAnalysis.ts`) sẽ **bị dán nhầm `exact`**. Vì vậy **luôn kiểm `'parameter' in result` trước**: nhánh phân tích ⇒ `numeric` vô điều kiện. `recognizeConstant` chỉ là snap-hiển-thị float → KHÔNG bao giờ `exact`.
- **THANG CHỮ không xuất hiện ở đây** vì nó là Mức 3 (`unsolved`, approx=null) ở Nhịp 1 — nhãn `symbolic-scale` **không thuộc enum này**. (Nếu tương lai promote THANG CHỮ lên Mức 1, mới thêm giá trị `symbolic-scale` + đọc `plan.scaleSymbol` TRƯỚC test `exact`.)

### 4.3. Dạng bài (`problemType`)

Nhãn nội dung để banner hiện cạnh mức (ví dụ `[Khoảng cách] · Mức 1`).

- **Nhịp 1 — suy tất định ở bridge** (KHÔNG đụng translator). **Accessor đã xác minh** (RunPlan dùng `queries[]` mảng, KHÔNG có `query` đơn — `run.ts:14`):
  - Nhánh hình học: `result.plan.queries?.[0]?.kind` → map:
    `distance`→"Khoảng cách", `angle`→"Góc", `volume`→"Thể tích", `area`→"Diện tích", `equation`→"Phương trình", `relative_position`→"Vị trí tương đối", `intersection`→"Giao", `point_coord`→"Toạ độ điểm", `sphere_metric`→"Mặt cầu", `volume_ratio`→"Tỉ số thể tích".
  - Nhánh phân tích: `result.plan.analyze?.kind` → `optimize`/`optimize_multi`→"Cực trị", `integrate`→"Tích phân", `solve`/`solve_multi`→"Giải phương trình", `eval`→"Tính giá trị".
  - Không khớp / vắng → "Khác".
- **Nhịp 2 — translator gắn nhãn (Cách B, chủ dự án chọn):** dạy translator xuất field tuỳ chọn `problemKind` (câu-chữ theo đề, giàu hơn). Classifier **ưu tiên `plan.problemKind` nếu có & hợp lệ, fallback về map tất định**. Vì sửa `translatorPrompt.js` → **bắt buộc cổng 50-ca live** → tách nhịp deploy riêng (§8).

## 5. Kiến trúc

### 5.1. Lõi phân loại (server)

**TẠO `api/_lib/kernel-bridge/classifyTier.js`** — module **thuần**, không side-effect. Import `engineSolved` từ `../solveAssemble.js` (tái dùng, không tự chế lại):

```
classifyTier(result) -> {
  level: 1 | 2 | 3,
  exactness: 'exact' | 'numeric' | null,      // null khi level !== 1
  problemType: string,                         // nhãn tiếng Việt (map tất định ở Nhịp 1)
  reason: null | { kind: 'unsolved'|'violation'|'error'|'abstain', message: string }
}
```

Logic:
1. `problemType` = map từ `plan.queries?.[0]?.kind` / `plan.analyze?.kind` (§4.3). (Nhịp 2: `plan.problemKind` ưu tiên.)
2. `if (result.representative === true)` → `{ level: 2, exactness: null, problemType, reason: null }`.
3. `if (engineSolved(result))` → `{ level: 1, exactness: <§4.2>, problemType, reason: null }`.
4. Còn lại → `level: 3`, `exactness: null`, `reason`:
   - `violations?.length` → `{ kind: 'violation', message: violations[0].message ?? 'vi phạm giả thiết' }`.
   - else `errors?.length` → `{ kind: 'error', message: errors[0].message ?? 'lỗi tính toán' }`.
   - else (`ok===true` nhưng không engineSolved) → `{ kind: 'unsolved', message: 'Engine chưa chứng thực đáp số dạng này.' }`.
   (Ca `abstain` KHÔNG phát sinh ở đây — nó đến từ try/catch của điểm 2 dưới, vì abstain làm `planFromProblem` ném trước khi có `result`.)

Nhận `result` (đã có `plan`, `ok`, `answers`, `violations`, `errors`; **nhánh phân tích** thêm `parameter`; **nhánh hình học** thêm `trace` + `geometry` đã convert — KHÔNG có `entities`). **Phân biệt nhánh bằng `'parameter' in result`** (analysis), ngược lại hình học. (Đã xác minh `solvePlan` không surface `entities` — `solveWithKernel.js:97-116`.)

**SỬA `solveWithKernel.js`:**
1. **Bọc `planFromProblem` (L120) trong try/catch bên trong `solveProblem`.** Khi ném (abstain / non-JSON / schema), **trả object Mức-3** thay vì để exception nổ:
   ```
   catch (e) {
     const msg = e?.message || 'lỗi dịch';
     const kind = /abstain/i.test(msg) ? 'abstain' : 'error';   // 'translator abstained: …' ⇒ abstain; non-JSON/schema ⇒ error
     return { plan: null, ok: false, geometry: null, answers: [], violations: [], errors: [{ message: msg }],
              tier: { level: 3, exactness: null, problemType: 'Khác', reason: { kind, message: msg } } };
   }
   ```
   (Caller vẫn dùng LLM fallback — §5.3 — nhưng nay có `tier` để render lời giải thích. `reason.kind` phân biệt `abstain` vs `error` đúng theo §4.1, không hard-code.)
2. **Sau `const result = { plan, ...solvePlan(plan) }` (L121):** `result.tier = classifyTier(result)` — đặt **trước** khối crosscheck để nhánh return chính có `tier`.
3. **Early-return crosscheck (L132-137, mặc định TẮT):** vì nó flip `ok:false` + thêm `errors`, gắn lại `tier: classifyTier(<object disagree>)` trên chính return đó để không stale. (Edge-only; KERNEL_CROSSCHECK off mặc định.)

### 5.2. Luồng dữ liệu ra frontend

**Shape thống nhất:** `classification` (trên geometry) và `tier` (trên SolveResult) **cùng object** `{ level, exactness, problemType, reason }` do `classifyTier` sinh. Không remap key.

- **Nhánh SOLVE** (`api/solve.js`) — **bề mặt CHÍNH cho Mức 3**:
  - Nhánh re-run (`else`, `solve.js:70-76`): `eng = await solveProblem(...)` → **đã mang `eng.tier`**.
  - Nhánh reuse (`solve.js:65-68`): `eng` tổng hợp từ `geometry.engineAnswer` (không có `tier`/`plan`).
  - Trước `res.json` (L104), tính: `const tier = eng.tier ?? geometry?.classification ?? null;` rồi trả `res.json({ ...out, tier, geometry })`. (Reuse: lấy `tier` từ `geometry.classification` do draw đã tính → nhất quán. Không có → `null` → UI fallback theo `verified`.) **KHÔNG sửa `assembleSolveResult`** (giữ đóng băng 5 field).
- **Nhánh DRAW** (`api/analyze-geometry.js`):
  - **Nhánh engine phục vụ** (`usable`, quick L191-232; tương tự khối detailed ~L314+): sau khi dựng `geometry`, `geometry.classification = classifyTier(k)`. (Với góc: `usable` true nhưng `classifyTier` → Mức 3 `unsolved` — đúng, vì `engineAnswer` cũng không được stamp do `approx` không hữu hạn; nhất quán.)
  - **Hoist tier cho nhánh rơi-LLM:** khai `let engineClassification = null;` ở scope handler; trong khối kernel gán `engineClassification = k.tier` (cả khi `!usable`), và trong `catch (e)` (L242) gán `engineClassification = { level: 3, exactness: null, problemType: 'Khác', reason: { kind: 'error', message: e?.message || 'lỗi engine' } }`. Tại `finalPayload` (L499-519), nếu `engineClassification` có, gắn `finalPayload.step2.geometry.classification = engineClassification` → banner hiện Mức 2/3 cho draw trực tiếp.
  - **Giới hạn phạm vi trung thực:** các đường draw KHÔNG chạy khối kernel (ảnh, hoặc detailed khi `KERNEL_MODE=off`) sẽ **không** mang `classification` → banner ẩn ở draw đó; **Mức 3 vẫn render đầy đủ trên bề mặt SOLVE** (§5.3). Banner giáo viên là **enrichment tăng dần**, không phải kênh Mức-3 duy nhất.
- **Threading React** (`src/context/GeometryContext.tsx`): **KHÔNG cần sửa.** `classification` là field **lồng trong** object `geometry`; cả 4 path (`analyzeText` L646 `{...step2.geometry}`, `analyzeImage` L564 `finishWithGeometry(step2.geometry)`, và 2 path queue) **chuyển nguyên object** qua `SET_GEOMETRY` (reducer L184-192 lưu nguyên, không lược field). Nested `classification` **tự sống sót**. (Bản trước sai: 2 path non-queue chỉ rơi `step1.tags/detailLevel` — anh em của `step2`, KHÔNG phải `geometry.classification`.)

### 5.3. Mức 3 — render lời giải thích, GIỮ fallback LLM (chủ dự án chọn "coexist")

- KHÔNG bỏ đáp án LLM. Khi `tier.level === 3`: vẫn hiện đáp LLM gắn nhãn "chưa kiểm chứng" **NHƯNG THÊM** khối giải thích lấy từ `tier.reason.message` (ưu tiên) nối với `verify_error` sẵn có. Với `reason.kind==='abstain'` hiện đúng lý do translator (thay vì message CHUNG hôm nay). `useSolver.ts` đã mang `verify_error`; nay thêm `tier` → `SolveResultView` (`SolverPanel.tsx`) render khối lý do.

### 5.4. UI (teacher-only + gom badge, chủ dự án chọn)

- **TẠO `src/lib/safetyTier.ts`** — mapping tập trung (nguồn duy nhất cho nhãn/màu/icon/copy tiếng Việt):
  ```
  safetyTierMeta(level: 1|2|3) -> { label, tone: 'ok'|'muted'|'refuse', icon, description }
  exactnessLabel(exactness: 'exact'|'numeric'|null) -> string    // 'exact'→'chính xác', 'numeric'→'giá trị số'
  verifiedToLevel(verified: boolean) -> 1 | 3                     // dùng cho badge HS khi chỉ có boolean (không có tier server)
  ```
  Hoà giải mâu thuẫn neutral-vs-vàng theo tông "gọn, không hù dọa": **Mức 1** xanh Check "Đã kiểm chứng"; **Mức 2** trung tính/xanh dương "chỉ đúng ở hình này"; **Mức 3** trung tính Info + khối lý do, KHÔNG dùng X đỏ.
- **Banner giáo viên — mount ở WRAPPER DESKTOP, KHÔNG ở `PanelContent` dùng chung.** (`PanelContent` cũng được `MobileRightPanel` render trong Sheet `lg:hidden` tại `RightPanel.tsx:841`, mount ở cả `Index.tsx:71` lẫn `TeacherMode.tsx:169` → mount trong `PanelContent` sẽ **rò xuống mobile <1024px**.) Mount trong `<aside>` desktop (khối `div` tại L882, ngay trước `<PanelContent/>` L884, nằm trong wrapper `hidden lg:flex` L858) → **chỉ giáo viên ≥1024px**. Banner tự đọc `state.geometry?.classification` (empty guard: `if (!state.geometry) return` đã có ở L98 của PanelContent, nhưng banner ở aside cần tự guard `if (!classification) return null`). Tái dùng `src/components/ui/alert.tsx` (chưa dùng nơi nào) + `badge.tsx`. Nội dung: `[<problemType>] · Mức <level> — <label>` (+ chip `exactnessLabel` khi Mức 1; + khối `reason.message` khi Mức 3).
- **Gom 2 badge học sinh (KHÔNG đổi phạm vi HS):** `SolverPanel.tsx` (L253-266) và `AdvanceStepper.tsx` (L77-91) thay render nhị phân tự-chế bằng gọi chung `safetyTier.ts`. **Nhịp 1 KHÔNG thêm tri-state cho `AdvanceStep.answer`** (field này sinh ở `api/_lib/advance/buildAdvanceScene.js` — ngoài phạm vi §6, không ai populate `tier` → sẽ undefined). Thay vào đó **map `verified` boolean sẵn có → level qua `verifiedToLevel()`** rồi dùng `safetyTierMeta`. Học sinh vẫn thấy badge như cũ (chỉ nhất quán về nhãn/màu), KHÔNG thêm banner.

### 5.5. Kiểu (types)

- `src/types/geometry.ts`: thêm
  `GeometryData.classification?: { level: 1|2|3; exactness: 'exact'|'numeric'|null; problemType: string; reason?: { kind: string; message: string } | null }`.
  (KHÔNG mở rộng `AdvanceStep.answer` — xem §5.4.)
- `src/hooks/useSolver.ts`: thêm `tier?: { level: 1|2|3; exactness: 'exact'|'numeric'|null; problemType: string; reason?: { kind: string; message: string } | null }` vào `SolveResult` (additive). **Quan trọng:** `solve()` map kết quả bằng **5 field tường minh** (L72-78, không `...data`) → phải **thêm `tier: data.tier ?? null`** vào map đó, nếu không server-`tier` bị rơi âm thầm. `hydrate` (L94) nhận nguyên `SolveResult` nên tự mang theo.

## 6. Cấu trúc file (tạo/sửa)

**TẠO**
- `api/_lib/kernel-bridge/classifyTier.js` — classifier thuần (import `engineSolved`).
- `api/_lib/__tests__/classifyTier.test.js` — **đặt ĐÚNG thư mục khớp vitest glob** (`api/_lib/__tests__/**/*.test.js`). (KHÔNG đặt cạnh module ở `kernel-bridge/` — glob KHÔNG phủ → test **âm thầm không chạy → giả xanh**. Đã xác minh `vitest.config.ts:5`.)
- `src/lib/safetyTier.ts` — mapping mức → nhãn/màu/icon/copy + `verifiedToLevel`.
- `src/lib/safetyTier.test.ts` — test mapping (khớp glob `src/**/*.test.ts`).

**SỬA (Nhịp 1)**
- `api/_lib/kernel-bridge/solveWithKernel.js` — try/catch abstain→Mức3 quanh `planFromProblem`; `result.tier = classifyTier(result)` trước crosscheck; gắn `tier` trên early-return crosscheck.
- `api/solve.js` — tính `tier = eng.tier ?? geometry?.classification ?? null`; trả `{ ...out, tier, geometry }` (cả 2 nhánh reuse/re-run).
- `api/analyze-geometry.js` — `geometry.classification = classifyTier(k)` ở nhánh phục vụ; hoist `engineClassification` gắn lên `finalPayload.step2.geometry` cho nhánh rơi-LLM.
- `src/types/geometry.ts` — `GeometryData.classification`.
- `src/hooks/useSolver.ts` — `SolveResult.tier` + thêm `tier: data.tier ?? null` vào map L72-78.
- `src/components/layout/RightPanel.tsx` — banner trong `<aside>` desktop (KHÔNG trong `PanelContent`).
- `src/components/SolverPanel.tsx` — badge + khối lý do Mức 3 qua `safetyTier.ts`.
- `src/components/layout/AdvanceStepper.tsx` — badge qua `safetyTier.ts` (map `verified`→level).

**KHÔNG sửa** (bản trước liệt kê nhầm): `api/_lib/solveAssemble.js` (đóng băng — `tier` gắn ở `solve.js`); `src/context/GeometryContext.tsx` (nested `classification` tự sống sót).

**SỬA (Nhịp 2 — sau cổng 50-ca)**
- `api/_lib/kernel-bridge/translatorPrompt.js` — thêm field tuỳ chọn `problemKind`.
- `api/_lib/kernel-bridge/classifyTier.js` — ưu tiên `plan.problemKind`, fallback map tất định.

## 7. Kiểm thử

- **Đơn vị `classifyTier` (`api/_lib/__tests__/classifyTier.test.js`, khớp glob `.js`):** bảng ca cho từng nhánh, dựng `result` giả (không cần chạy engine thật):
  - Mức 1 `exact` (hình học: `{ ok:true, answers:[{kind:'distance', exact:{…}, approx:1.73, approximate:false}], violations:[], plan:{queries:[{kind:'distance'}]} }`).
  - Mức 1 `numeric` phân tích (`{ ok:true, parameter:…, answers:[{kind:'kết quả', approx:7.49, approximate:false}], violations:[], plan:{analyze:{kind:'optimize'}} }`) — khẳng định `exactness==='numeric'` (chống bẫy `undefined != null`).
  - Mức 1 `numeric` hình học `approximate:true`.
  - Mức 3 `unsolved` — **góc** (`answers:[{kind:'angle', degrees:60}]`, không `approx`) và **THANG CHỮ** (`answers:[{kind:'distance', approx:null, scaleSymbol:'a'}]`): khẳng định `level===3 && reason.kind==='unsolved'`.
  - Mức 3 `violation` (`violations:[{message:…}]`), Mức 3 `error` (`errors:[{message:…}]`).
  - Mức 2 (`{ representative:true, ok:true, … }`) — rail cho C.
  - `problemType`: `plan.queries[0].kind` → nhãn; `plan.analyze.kind` → nhãn; `volume_ratio`→"Tỉ số thể tích"; vắng/lạ → "Khác".
  - Nhịp 2: `plan.problemKind` được ưu tiên; vắng → fallback map.
- **Bất biến (guard chống trôi):** test khẳng định `classifyTier(r).level===1 ⟺ engineSolved(r)===true` trên vài `result` mẫu. (Hiện là hệ quả định nghĩa vì classifier gọi `engineSolved`; test khoá lại để tương lai không ai tách đôi.)
- **Frontend `safetyTier.test.ts`:** `safetyTierMeta(level).tone` đúng theo mức; `verifiedToLevel(true)===1`, `verifiedToLevel(false)===3`; `exactnessLabel`. Test thuần, không render 3D.
- **Đặc tả (characterization):** không sửa test/source để ép xanh; red = hồi quy thật, nổi lên. `npm test` phải chạy đủ file mới (kiểm bằng số test tăng — đề phòng glob bỏ sót).

## 8. Kế hoạch triển khai (2 nhịp)

- **Nhịp 1 — cổng build+test (KHÔNG cổng 50-ca):** toàn bộ §5 trừ translator. `problemType` dùng map tất định. Build **tại worktree `tier-classification`, đúng nhánh** (KHÔNG phải worktree khác). Gate: `npm run build` exit 0 **và** `npm test` xanh (và xác nhận số test tăng do file mới) → push `claude/tier-classification` → `origin/main` (fast-forward từ `1849492`) = deploy. Độc lập hoàn toàn với `754ebee`.
- **Nhịp 2 — cổng 50-ca live:** thêm `problemKind` vào `translatorPrompt.js` + ưu tiên trong classifier. **Bắt buộc** cổng translator 50-ca (VILAO_API_KEY, gemini; 15/15 hard + 0 sai) TRƯỚC push — do CHỦ DỰ ÁN chạy, KHÔNG tự chạy headless. Chỉ push khi cổng qua.

## 9. Phạm vi

**Trong phạm vi B:** classifier 3 mức (server) + trục chính xác + banner giáo viên + gom badge + render lời chưa-chứng-thực/từ-chối (Mức 3, giữ LLM) + rail Mức 2 (định nghĩa + nhãn + nhánh classifier + cờ `representative`) + `problemType` (tất định Nhịp 1, translator Nhịp 2).

**NGOÀI phạm vi B (nêu rõ để chống phình):**
- **Mở rộng phủ verification** — làm engine chứng thực **góc / phương trình / vị trí tương đối / giao điểm / THANG CHỮ** để lên Mức 1 (sửa `engineSolved`/`assembleSolveResult`, đổi hợp đồng `verified`) = **nhịp engine riêng** (ứng viên A-nhịp sau). B **mirror** `engineSolved` hiện tại, các dạng này ở Mức 3 `unsolved` trung tính (= status quo).
- **Cơ chế vẽ hình đại diện Mức 2** (dựng hình cho bài thiếu-thang/chứng minh, đo-trên-hình, đọc `showIllustrationValues`, bật cờ `representative`) = **tiểu-dự án C**. B chỉ lát rail.
- **Bảng phân loại dạng bài + đề ví dụ cho giáo viên** = **tiểu-dự án D**.
- Bật `KERNEL_CROSSCHECK` (OFF mặc định) — không dùng cho mức ở B.
- Sửa kernel per-answer exactness (`answer.ts`/`runAnalysis.ts`) — không cần: exactness suy ở bridge từ field sẵn có, tránh rebundle `kernel-dist`.

## 10. Rủi ro & giảm thiểu

- **Bẫy `undefined != null` ở exactness** → dán nhầm `exact` cho đáp phân tích: **gate `'parameter' in result` TRƯỚC** (§4.2). Test numeric-phân-tích khoá lại.
- **Test âm thầm không chạy** (glob vitest bỏ sót `kernel-bridge/`): đặt test ở `api/_lib/__tests__/*.test.js`; gate deploy kiểm **số test tăng**.
- **Banner rò xuống mobile** (`PanelContent` dùng chung với `MobileRightPanel`): mount ở `<aside>` desktop, không ở `PanelContent` (§5.4).
- **Mức 2/3 không tới banner draw** (classification chỉ gắn ở nhánh phục vụ): hoist `engineClassification` sang `finalPayload` (§5.2); và Mức 3 luôn render trên bề mặt SOLVE (§5.3) — banner là enrichment.
- **`tier` rơi âm thầm ở `useSolver`** (map 5 field tường minh): thêm `tier: data.tier ?? null` (§5.5).
- **`reason.kind` sai** (hard-code 'abstain' cho mọi throw): phân nhánh theo message (abstain vs error) trong catch (§5.1).
- **Nhánh khác shape** (hình học `trace` vs phân tích `parameter`; `solve_multi` `ok=false`): phân biệt bằng `'parameter' in result`; `classifyTier` phủ cả shape "đã từ chối" từ try/catch; test phủ từng nhánh.
- **Draw-vs-solve lệch mức:** "một nguồn sự thật một shape" — `classifyTier` trong `solveProblem`; solve reuse lấy `geometry.classification`, else `eng.tier` (cùng hàm).
- **Phủ Mức 1 hẹp** (góc/phương trình/THANG CHỮ → Mức 3): **cố ý, không phải lỗi** — mirror `verified` hôm nay, không hồi quy; mở rộng là nhịp engine sau (§9). Ghi rõ để D/roadmap biết.
- **Cổng 50-ca (Nhịp 2)** & **va tên "tier":** cô lập translator vào Nhịp 2; dùng object lồng `classification`/`tier.level`, không field trần `tier`.
- **Deploy discipline:** build đúng worktree/nhánh; `dist/` + `api/_lib/kernel-dist/index.mjs` ĐƯỢC git theo dõi (KHÔNG gitignore — `.gitignore` chỉ bỏ `/build`) nhưng **cũ-theo-thông-lệ**: Vercel rebuild cả hai từ source khi deploy (preset Vite, `outputDirectory: dist`), nên KHÔNG stage churn build sau `npm run build`.

## 11. Nhật ký quyết định (đã chốt với chủ dự án)

1. **Mức 3:** render lời giải thích **NHƯNG vẫn kèm** đáp LLM (coexist), không bỏ fallback.
2. **Phạm vi UI:** banner **chỉ giáo viên** (RightPanel ≥1024px, mount ở `<aside>` desktop); badge học sinh **gom** về mapping chung, **không đổi phạm vi HS**.
3. **Dạng bài:** **Cách B** — translator sinh `problemKind` (Nhịp 2, cổng 50-ca); map tất định làm nền Nhịp 1 + fallback vĩnh viễn.
4. **Ngữ nghĩa mức:** **mô hình 2 trục** — Mức = an toàn; exact/số = nhãn phụ. Đáp số bài đủ dữ kiện = **Mức 1**, không tụt Mức 2.
5. **Nhánh:** worktree B tách từ `origin/main`, không stack trên `754ebee`.
6. **Phủ Mức 1 (Option A — sau review đối kháng):** **Mức 1 ⟺ `engineSolved()` y hệt.** B thuần phân loại, KHÔNG đụng kernel/hợp đồng `verified`. Góc / phương trình / vị trí tương đối / giao điểm / **THANG CHỮ** → **Mức 3 `unsolved` trung tính** (= status quo, không hồi quy). Mở rộng phủ verification = **nhịp engine riêng sau**, không nhồi vào B.
