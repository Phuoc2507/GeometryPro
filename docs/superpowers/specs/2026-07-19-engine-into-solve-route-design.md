# Cắm engine tất định vào `/api/solve` + bỏ DeepSeek cloud — Design Spec

**Ngày:** 2026-07-19
**Trạng thái:** Chờ duyệt spec
**Nhánh làm việc:** `claude/engine-improvements` (hoặc nhánh mới off main)

---

## 1. Mục tiêu

Đưa engine tất định vào ĐÚNG chỗ nó thuộc về: **route GIẢI** (`/api/solve`, sau nút "Giải bài").
Engine **tính + kiểm ĐÁP SỐ** (tất định, chống ảo giác); LLM chỉ **viết LỜI** (các bước giải thích)
dẫn tới đáp engine đã chốt. Đồng thời **bỏ DeepSeek cloud** (đang làm nút Giải hỏng).

Kiến trúc 2 phần của sản phẩm giữ nguyên: **VẼ** (`/api/analyze-geometry`, tức thì) tách khỏi
**GIẢI** (`/api/solve`, on-demand, tính quota). Spec này chỉ đụng route GIẢI.

## 2. Bối cảnh & phát hiện

- `/api/solve` hiện: nhận `(problem, geometry, tags)` (hình đã vẽ từ analyze-geometry) → gọi
  **DeepSeek** (`callDeepSeek`, `deepseek-chat`) sinh `steps` + `final_answer` + `solve_javascript`
  → chạy JS trong `vm` sandbox, so với `answer_value` của CHÍNH LLM → khớp thì `verified=true`.
- **Hai vấn đề:**
  1. `deepseek.js` ném `DEEPSEEK_API_KEY not set` nếu không có key ⇒ **không có DeepSeek thì route GIẢI hỏng.**
  2. "Verify" hiện là LLM tự viết đáp + tự viết script kiểm chính nó ⇒ LLM có thể viết cả đáp SAI lẫn
     script SAI khớp nhau ⇒ `verified=true` mà vẫn SAI. Đây đúng là hallucination cả dự án muốn diệt,
     ở chỗ nguy hiểm nhất (lời giải người dùng đọc).
- Engine tất định (`solveProblem` ở `api/_lib/kernel-bridge/solveWithKernel.js`) **đã** dịch đề →
  plan → run() → đáp số + tự kiểm assert. Đang được dùng ở route VẼ; cần dùng ở route GIẢI.
- Provider chung sẵn có: **Vilao** (`callVilao`, gemini) — thay DeepSeek cho khâu viết lời.

## 3. Kiến trúc mới của `/api/solve`

Luồng khi bấm "Giải bài" (`problem`, `geometry` đã có):

```
1. ENGINE thử giải:  eng = solveProblem(problem)         // tất định + tự kiểm assert
2a. Engine GIẢI ĐƯỢC (eng.ok && đáp là số + 0 violation):
      final_answer = eng đáp (exact, vd "√2", "12,95 lít")
      answer_value = eng.approx
      verified     = true            // engine đã tự kiểm — THẬT, không phải LLM tự khen
      steps        = Vilao viết LỜI, ĐƯỢC CHO SẴN đáp engine làm chân lý (chỉ diễn giải, không đổi đáp)
2b. Engine KHÔNG giải được (ngoài catalog / fallback):
      Vilao viết steps + final_answer (như luồng LLM, KHÔNG có engine)
      verified     = false
      verify_error = "Engine chưa giải được dạng này — lời giải từ AI, CHƯA kiểm chứng tất định"
3. Trả SolveResult { steps, final_answer, answer_value, verified, verify_error, geometry }  // SHAPE GIỮ NGUYÊN
```

**Nguyên tắc:** đáp số đến từ engine khi engine giải được (không để LLM tự chế); LLM chỉ lo phần LỜI.
Khi engine chịu, KHÔNG tệ hơn hiện tại (vẫn có lời giải LLM, nhưng ghi rõ chưa kiểm chứng — trung thực).

## 4. Bỏ DeepSeek cloud

- **Xoá:** `api/_lib/deepseek.js`; import + mọi lời gọi `callDeepSeek` trong `api/solve.js`.
- **Thay:** khâu viết lời trong solve dùng `callVilao` (model mặc định gemini, override qua env như route dịch).
- **Bỏ cơ chế verify cũ:** khối `vm`/`solve_javascript`/`buildCoordPreamble` — engine verify thay thế.
  (Giữ `vm` import chỉ khi còn dùng; nếu không, xoá.)
- **Prompt:** `SOLVE_SYSTEM_PROMPT`/`buildSolveUserMessage` ở `api/_lib/solvePrompts.js` — sửa cho hợp
  Vilao + cho phép chèn "đáp số đã biết (từ engine)" vào user message để LLM viết lời dẫn tới đúng đáp đó.
  Bỏ yêu cầu LLM sinh `solve_javascript`.
- **KHÔNG đụng** (flag riêng, quyết định sau): `api/_lib/ollama.js` (`deepseek-r1:14b` là model LOCAL, provider
  khác, còn được analyze/modify-geometry dùng) và comment ở `jsonHelpers.js:115`. Đó KHÔNG phải DeepSeek cloud.

## 5. Giữ nguyên (không đổi)

- Route contract: `POST /api/solve {problem, geometry, tags}` → `{steps, final_answer, answer_value, verified, verify_error, geometry}`.
- `useSolver.ts`, `SolverPanel.tsx`, UI — KHÔNG đổi (shape SolveResult y nguyên, kể cả `verified`).
- Auth + quota (`checkAndIncrementApiQuota`), `maxDuration`.

## 6. Ngoài phạm vi

- Không đổi UI/SolverPanel, không đổi route VẼ.
- Không sửa bộ giải đa-ràng-buộc (#1 Oxyz — spec riêng).
- Không xoá ollama/deepseek-r1 local (quyết định riêng).

## 7. Tiêu chí thành công

- Bài engine giải được (chóp→√2, đèn lồng→12,95 lít, nón∩trụ→7,0205, Câu 6→8…): `/api/solve` trả
  `verified=true` với **đáp đúng của engine**, steps hợp lý dẫn tới đáp đó.
- Bài engine chịu: trả steps LLM + `verified=false` + verify_error rõ ràng, **không crash, không ném lỗi**.
- **KHÔNG còn phụ thuộc `DEEPSEEK_API_KEY`**; không còn import deepseek trong solve; route chạy được khi
  không có DeepSeek (đúng thực tế hiện tại).
- `verified` KHÔNG bao giờ true cho đáp LLM-tự-chế (chỉ true khi engine tự kiểm).

## 8. Rủi ro & giảm thiểu

- **R1: LLM viết lời LỆCH đáp engine.** ⇒ prompt cho LLM biết "đáp cuối = <engine>", yêu cầu steps dẫn
  tới đúng đó; nếu LLM vẫn ghi đáp khác trong final_answer, ghi ĐÈ bằng đáp engine (engine là chân lý).
- **R2: Engine giải được nhưng đáp không phải cái đề GIẢI hỏi** (vd đề hỏi lời giải, engine chỉ có số).
  ⇒ engine cung cấp số + verified; steps LLM lo phần trình bày. Nếu đề hỏi thứ engine không có (đáp phi số)
  ⇒ coi như 2b (verified=false).
- **R3: Vilao viết lời chậm/timeout.** ⇒ trong `maxDuration=300`; đặt timeout Vilao hợp lý; engine nhanh.
- **R4: Regression route GIẢI.** ⇒ giữ contract; test luồng 2a (engine giải) và 2b (fallback) không crash.

## 9. Kiểm thử

- **Đơn vị:** hàm lắp SolveResult từ (engine result | fallback) — test cả 2 nhánh.
- **Tích hợp:** gọi `/api/solve` (mock Vilao) với 1 bài engine-giải-được → verified=true, đáp = engine;
  1 bài engine-chịu → verified=false, có steps, không throw.
- **E2E (LLM thật):** 1–2 bài (chóp→√2) qua solve → verified=true, đáp đúng, steps đọc được.
- **Không hồi quy:** suite hiện tại xanh; route VẼ không đổi.

## 10. Ghi chú triển khai

- Làm trên nhánh, **hỏi trước khi gộp main** (auto-deploy prod). Solve là route có auth/quota — verify kỹ trước deploy.
- Thứ tự gợi ý: (a) tách hàm lắp SolveResult + nhánh engine/fallback; (b) thay DeepSeek→Vilao ở khâu lời +
  sửa solvePrompts; (c) bỏ deepseek.js + vm self-verify; (d) test 2 nhánh; (e) e2e.
