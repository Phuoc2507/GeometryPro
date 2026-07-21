# Advance — Lời giải từng câu (B) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps dùng checkbox.

**Goal:** Mỗi câu trong Advance kèm **lời giải từng bước** (SolveStep[] + verified) — sinh **eager, song song** khi dựng scene, trả **cùng 1 call** `/api/analyze-advance` (không gọi lại). Frontend hiện panel lời giải + reveal điểm dựng qua `solveReveal` sẵn có.

**Architecture:** Rút lõi solve từ `api/solve.js` thành hàm thuần `solveSteps(problem, geometry, engAnswer, opts)` (tái dùng `solvePrompts` + `solveAssemble`). `buildAdvanceScene` gọi `solveSteps` per câu (Promise.all, TÁI DÙNG engineAnswer đã tính — không chạy engine 2 lần). Frontend: `AdvanceStep.solution` → panel + `buildSolveReveal`.

**Tech Stack:** Node ESM, Vitest, React/TS. Tái dùng: solvePrompts.js, solveAssemble.js, solveReveal.ts, useSolver (SolveStep type), SolverPanel.

**Nhánh:** `claude/kinematic` (= origin/main = 0b057bc, đã có Advance + solve-reveal). HỎI trước khi gộp/deploy.

---

## Task B1: Rút lõi `solveSteps` (refactor, không đổi hành vi)

**Files:** Create `api/_lib/solveCore.js`; Modify `api/solve.js`; Test `api/_lib/__tests__/solveCore.test.js`

Hiện `solve.js` handler làm: engine giải (engineAnswer) → `buildSolveUserMessage` → `callVilao(SOLVE_SYSTEM_PROMPT)` → `parseSolveResponse` → `assembleSolveResult(eng, parsed)`. Rút phần "từ (problem, geometry, engAnswer) → kết quả solve" thành hàm thuần.

- [ ] **Step 1: Test (đỏ)** — `solveCore.test.js`: mock callVilao trả JSON steps hợp lệ; `solveSteps('P', geo, {text:'√2',approx:1.41,verified:true}, {})` → `{steps:[...], final_answer, verified:true}`; callVilao ném → trả `{steps:[], verified:false, ...}` (không throw).
- [ ] **Step 2: Chạy đỏ.**
- [ ] **Step 3: Implement** `api/_lib/solveCore.js`:
```js
import { callVilao } from './vilao.js';
import { SOLVE_SYSTEM_PROMPT, buildSolveUserMessage } from './solvePrompts.js';
import { assembleSolveResult } from './solveAssemble.js';
import { parseJsonResponse, repairTruncatedJson } from './jsonHelpers.js';
// COPY parseSolveResponse tu solve.js (dong 9-30) vao day (hoac export tu solve.js roi import).
export async function solveSteps(problem, geometry, engAnswer, opts = {}) {
  // eng: gói engineAnswer thành shape assembleSolveResult mong đợi (như solve.js:92).
  const eng = engAnswer && Number.isFinite(engAnswer.approx)
    ? { ok: !!engAnswer.verified, answers: [{ text: engAnswer.text, approx: engAnswer.approx }], violations: [] } : null;
  let parsed = null;
  try {
    const userMessage = buildSolveUserMessage(problem, geometry, opts.tags, engAnswer);
    const raw = await callVilao(SOLVE_SYSTEM_PROMPT, userMessage, { model: opts.model, apiKey: opts.apiKey, maxTokens: opts.maxTokens ?? 4096, timeoutMs: opts.timeoutMs ?? 60000 });
    parsed = parseSolveResponse(raw);
  } catch { parsed = null; }
  return assembleSolveResult(eng, parsed); // {steps, final_answer, answer_value, verified, verify_error}
}
```
- [ ] **Step 4: `solve.js` dùng lại** — thay khối buildSolveUserMessage→callVilao→parse→assemble trong handler bằng `const out = await solveSteps(problem.trim(), geometry, engAnswer, {...})`. Giữ auth/credit/http nguyên. (Nếu `parseSolveResponse` cần cho cả 2 → export từ solveCore, solve.js import.)
- [ ] **Step 5: Chạy xanh + toàn suite xanh** (solve.js không đổi hành vi — solvePrompts.test/cache-refund vẫn xanh).
- [ ] **Step 6: Commit** — `refactor(solve): rut loi solveSteps de tai dung (solve.js khong doi hanh vi)`

---

## Task B2: `buildAdvanceScene` gắn `solution` per câu (song song)

**Files:** Modify `api/_lib/advance/buildAdvanceScene.js`; Test cũ + ca mới

Sau khi có `base` + `answers` (đã có), thêm: mỗi câu sinh `solution` = `solveSteps(hoi, base, answer, opts)` — **song song cùng answers**, TÁI DÙNG `answers[i]` làm engAnswer (không chạy engine lại). Gắn `step.solution`.

- [ ] **Step 1: Test (đỏ)** — mock `solveSteps` (inject qua opts): câu → `step.solution.steps` khớp; giữ 7 test cũ xanh.
- [ ] **Step 2-3: Implement** — thêm `opts.solveSteps || defaultSolveSteps` (default import từ `../solveCore.js`). Trong pha giải song song, đổi:
```js
  const solveFn = opts.solveSteps || solveSteps;
  const answers = await Promise.all(parts.map((p) => solveQuestion(p.hoi, split.setup, opts)));
  const solutions = await Promise.all(parts.map((p, i) => {
    const a = answers[i];
    const eng = a?.ok && a.text !== undefined ? { text: a.text, approx: a.approx, verified: true } : null;
    return solveFn(`${split.setup}\n${p.hoi}`, base, eng, opts).catch(() => null);
  }));
```
Gắn `solution: solutions[m.i] || null` vào mỗi step. (2 nhóm Promise.all có thể gộp 1 nếu muốn; giữ rõ ràng.)
- [ ] **Step 4: Xanh + không hồi quy.**
- [ ] **Step 5: Commit** — `feat(advance): gan loi giai tung buoc per-cau (song song, tai dung engineAnswer)`

---

## Task B3: Frontend — hiện lời giải + reveal trong Advance

**Files:** Modify `src/types/geometry.ts` (AdvanceStep.solution), `src/components/layout/AdvanceStepper.tsx` hoặc panel mới; tái dùng `SolverPanel`/`useSolver.hydrate` + `buildSolveReveal`

- [ ] **Step 1: Type** — `AdvanceStep.solution?: import('@/hooks/useSolver').SolveResult` (steps + verified…).
- [ ] **Step 2: Hiện panel** — khi ở câu hiện tại và `steps[cur].solution` có → render lời giải (tái dùng `SolverPanel` hoặc component con của nó). Dùng `useSolver().hydrate(steps[cur].solution)` để nạp không-gọi-API, đổi câu → hydrate lại.
- [ ] **Step 3: Reveal điểm dựng** — dùng `buildSolveReveal(advanceScene.base, solution.steps)` cho câu hiện tại → điểm dựng của lời giải hiện vào hình (hợp với projectScene: base = base + newPoints). *(v1 tối thiểu: hiện điểm dựng ở câu; đồng bộ camera/step-trong-câu để C.)*
- [ ] **Step 4: tsc + suite xanh; verify browser (inject scene có solution).**
- [ ] **Step 5: Commit** — `feat(advance-fe): hien loi giai tung buoc + reveal diem dung trong Advance`

---

## Kiểm cuối
- [ ] Toàn suite xanh; solve.js/quick/detailed không đổi.
- [ ] E2E: `/api/analyze-advance` trả scene có `steps[].solution` (đo thật gpt-sol).
- [ ] HỎI trước gộp/deploy. Sau B → **C** (camera-fly + orchestrator đồng bộ).

## Findings
*(Điền khi thực thi.)*
