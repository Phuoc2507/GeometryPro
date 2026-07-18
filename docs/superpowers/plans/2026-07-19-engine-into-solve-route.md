# Cắm engine vào `/api/solve` + bỏ DeepSeek — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/api/solve` (nút "Giải bài") dùng ENGINE tất định để tính + kiểm ĐÁP SỐ; LLM (Vilao) chỉ viết LỜI (các bước) dẫn tới đáp engine. Bỏ DeepSeek cloud (đang làm route hỏng).

**Architecture:** Engine giải trước → nếu được: đáp = engine, `verified=true`, Vilao viết bước dẫn tới đáp đó. Nếu engine chịu: Vilao viết bước + đáp, `verified=false` (trung thực). Contract SolveResult + UI giữ nguyên.

**Tech Stack:** Vercel serverless `.js` (`api/solve.js`, không build), engine bridge `api/_lib/kernel-bridge/solveWithKernel.js` (dynamic import), `callVilao` (`api/_lib/vilao.js`), Vitest. Spec: `docs/superpowers/specs/2026-07-19-engine-into-solve-route-design.md`.

**Nhánh:** `claude/engine-improvements`. KHÔNG gộp main khi chưa hỏi (auto-deploy prod). Route có auth/quota — verify kỹ trước deploy.

---

## Bối cảnh cho người thực thi (đọc trước)

- `api/solve.js` hiện: nhận `{problem, geometry, tags}` → `callDeepSeek(SOLVE_SYSTEM_PROMPT, buildSolveUserMessage(...))`
  → parse `{steps, final_answer, answer_value, solve_javascript}` → chạy `solve_javascript` trong `vm` sandbox,
  so với `answer_value` → set `verified`. Auth + quota ở đầu handler (GIỮ NGUYÊN).
- Engine bridge: `solveProblem(problem)` (từ `api/_lib/kernel-bridge/solveWithKernel.js`, dùng dynamic import
  như `api/analyze-geometry.js` đang làm). Trả `{ ok, geometry, answers, violations, errors, ... }`.
  - `answers[0]` có `.text` (đáp exact, vd "√2", "12.95 lít") và `.approx` (số). CÓ THỂ NÉM (abstain/schema fail)
    ⇒ luôn bọc try/catch.
  - "Engine giải được" ⇔ `eng?.ok && eng.answers?.[0] && Number.isFinite(eng.answers[0].approx) && (eng.violations?.length ?? 0) === 0`.
- `callVilao(systemPrompt, userPrompt, options)` — provider chung (gemini), thay DeepSeek.
- Test JS/TS ở repo dùng Vitest. Route `.js` khó test trực tiếp ⇒ tách phần lắp ráp thành hàm THUẦN để test.
- `.js` không build; engine bridge import `kernel-dist` đã commit sẵn.

---

## Task 1: `solvePrompts.js` — prompt hướng Vilao + chèn đáp engine, bỏ solve_javascript

**Files:**
- Modify: `api/_lib/solvePrompts.js`

- [ ] **Step 1: Sửa `SOLVE_SYSTEM_PROMPT`** — bỏ yêu cầu `solve_javascript`; thêm quy tắc "đáp số đúng được cho sẵn khi có".

Thay quy tắc 4 (solve_javascript) và OUTPUT FORMAT:
- Bỏ dòng quy tắc 4 (viết solve_javascript) và bỏ `"solve_javascript": ...` khỏi OUTPUT FORMAT + ví dụ mẫu.
- Thêm quy tắc: `Nếu được cung cấp "ĐÁP SỐ ĐÚNG (đã xác minh)", PHẢI trình bày các bước DẪN TỚI ĐÚNG đáp số đó, và "final_answer" PHẢI khớp đáp đó. TUYỆT ĐỐI không đưa ra đáp số khác.`
- Giữ `steps`, `final_answer`, `answer_value` trong format.

- [ ] **Step 2: `buildSolveUserMessage` nhận thêm `engineAnswer`** (tuỳ chọn) và chèn vào message.

```js
export function buildSolveUserMessage(problemText, geometry, tags = [], engineAnswer = null) {
  const coordLines = (geometry.points || []).map(p => `${p.id}=(${p.x},${p.y},${p.z})`).join('  ');
  const answerBlock = engineAnswer
    ? `\n\n⚠️ ĐÁP SỐ ĐÚNG (đã xác minh bằng engine tất định): ${engineAnswer}\nHãy viết các bước DẪN TỚI đúng đáp số này; "final_answer" phải khớp.`
    : '';
  return `${FEW_SHOT_EXAMPLE}

═══════════════════════════════════════════════════════
BÀI CẦN GIẢI
═══════════════════════════════════════════════════════
Đề bài: ${problemText}
Phân loại (Tags): ${tags && tags.length > 0 ? tags.join(', ') : 'Không có'}

Toạ độ các điểm: ${coordLines}${answerBlock}

Hãy giải từng bước và trả về JSON đúng format.`;
}
```

- [ ] **Step 3: Bỏ `solve_javascript` khỏi `FEW_SHOT_EXAMPLE`** (xoá dòng `"solve_javascript": ...` trong ví dụ).

- [ ] **Step 4: Xoá `buildCoordPreamble`** (không còn dùng khi bỏ vm sandbox).

- [ ] **Step 5: Test** — `api/_lib/__tests__/solvePrompts.test.js`

```js
import { describe, it, expect } from 'vitest';
import { buildSolveUserMessage, SOLVE_SYSTEM_PROMPT } from '../solvePrompts.js';
describe('solvePrompts', () => {
  const geo = { points: [{ id: 'A', x: 0, y: 0, z: 0 }, { id: 'B', x: 1, y: 0, z: 0 }] };
  it('chèn đáp engine khi có', () => {
    const msg = buildSolveUserMessage('Tính AB', geo, [], '√2');
    expect(msg).toContain('ĐÁP SỐ ĐÚNG');
    expect(msg).toContain('√2');
  });
  it('không có đáp engine thì không chèn', () => {
    expect(buildSolveUserMessage('Tính AB', geo)).not.toContain('ĐÁP SỐ ĐÚNG');
  });
  it('prompt không còn yêu cầu solve_javascript', () => {
    expect(SOLVE_SYSTEM_PROMPT).not.toContain('solve_javascript');
  });
});
```

Run: `npx vitest run api/_lib/__tests__/solvePrompts.test.js` → PASS.

- [ ] **Step 6: Commit** — `refactor(solve): prompt huong Vilao + chen dap engine, bo solve_javascript`

---

## Task 2: Hàm THUẦN `assembleSolveResult` (lõi lắp ráp, test được)

**Files:**
- Create: `api/_lib/solveAssemble.js`
- Test: `api/_lib/__tests__/solveAssemble.test.js`

- [ ] **Step 1: Viết test (đỏ)** — 2 nhánh: engine giải được (verified=true, đáp=engine) và engine chịu (verified=false).

```js
import { describe, it, expect } from 'vitest';
import { engineSolved, assembleSolveResult } from '../solveAssemble.js';

describe('solveAssemble', () => {
  it('engineSolved: đúng khi ok + answer số + 0 violation', () => {
    expect(engineSolved({ ok: true, answers: [{ text: '√2', approx: 1.4142 }], violations: [] })).toBe(true);
    expect(engineSolved({ ok: false, answers: [] })).toBe(false);
    expect(engineSolved(null)).toBe(false);
    expect(engineSolved({ ok: true, answers: [{ text: 'x', approx: NaN }], violations: [] })).toBe(false);
  });
  it('engine giải được → đáp engine + verified=true, steps từ LLM', () => {
    const eng = { ok: true, answers: [{ text: '√2', approx: 1.4142 }], violations: [] };
    const llm = { steps: [{ id: 's1', title: 't', explanation: 'e' }], final_answer: '1.41 (LLM tự chế)', answer_value: 1.41 };
    const r = assembleSolveResult(eng, llm);
    expect(r.verified).toBe(true);
    expect(r.final_answer).toBe('√2');        // ĐÈ đáp LLM bằng đáp engine
    expect(r.answer_value).toBeCloseTo(1.4142, 4);
    expect(r.steps.length).toBe(1);
    expect(r.verify_error).toBeNull();
  });
  it('engine chịu → đáp LLM + verified=false + verify_error', () => {
    const llm = { steps: [{ id: 's1', title: 't', explanation: 'e' }], final_answer: 'abc', answer_value: 5 };
    const r = assembleSolveResult(null, llm);
    expect(r.verified).toBe(false);
    expect(r.final_answer).toBe('abc');
    expect(r.verify_error).toMatch(/chưa kiểm chứng|engine/i);
  });
});
```

Run: `npx vitest run api/_lib/__tests__/solveAssemble.test.js` → FAIL (module chưa có).

- [ ] **Step 2: Viết `api/_lib/solveAssemble.js`**

```js
// Lắp SolveResult: đáp SỐ từ engine (khi giải được, verified thật); LỜI từ LLM.
export function engineSolved(eng) {
  return !!(eng && eng.ok && eng.answers && eng.answers[0]
    && typeof eng.answers[0].approx === 'number' && Number.isFinite(eng.answers[0].approx)
    && (eng.violations?.length ?? 0) === 0);
}

function normalizeSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map((s, i) => ({
    id: s.id || `s${i + 1}`,
    title: s.title || `Bước ${i + 1}`,
    explanation: s.explanation || '',
    formula: s.formula || null,
    highlight: Array.isArray(s.highlight) ? s.highlight : [],
    view_mode: s.view_mode === '2d' ? '2d' : '3d',
  }));
}

export function assembleSolveResult(eng, llm) {
  const steps = normalizeSteps(llm?.steps);
  if (engineSolved(eng)) {
    const a = eng.answers[0];
    return { steps, final_answer: a.text, answer_value: a.approx, verified: true, verify_error: null };
  }
  return {
    steps,
    final_answer: typeof llm?.final_answer === 'string' ? llm.final_answer : '',
    answer_value: typeof llm?.answer_value === 'number' ? llm.answer_value : null,
    verified: false,
    verify_error: 'Engine chưa giải được dạng này — lời giải từ AI, CHƯA kiểm chứng tất định.',
  };
}
```

- [ ] **Step 3: Test → xanh.** Run: `npx vitest run api/_lib/__tests__/solveAssemble.test.js` → PASS.

- [ ] **Step 4: Commit** — `feat(solve): ham thuan assembleSolveResult (dap engine + verified that, loi LLM)`

---

## Task 3: `solve.js` — cắm engine + Vilao, bỏ DeepSeek + vm

**Files:**
- Modify: `api/solve.js`

- [ ] **Step 1: Đổi import** — bỏ DeepSeek, vm, buildCoordPreamble; thêm Vilao + solveAssemble.

Xoá:
```js
import vm from 'vm';
import { callDeepSeek } from './_lib/deepseek.js';
import { SOLVE_SYSTEM_PROMPT, buildSolveUserMessage, buildCoordPreamble } from './_lib/solvePrompts.js';
```
Thay bằng:
```js
import { callVilao } from './_lib/vilao.js';
import { SOLVE_SYSTEM_PROMPT, buildSolveUserMessage } from './_lib/solvePrompts.js';
import { engineSolved, assembleSolveResult } from './_lib/solveAssemble.js';
```
(Giữ `parseJsonResponse`, `repairTruncatedJson`, supabase, quota — không đổi.)

- [ ] **Step 2: Sau khi qua auth/quota/validate, gọi ENGINE trước** (bọc try/catch — có thể ném):

```js
let eng = null;
try {
  const { solveProblem } = await import('./_lib/kernel-bridge/solveWithKernel.js');
  eng = await solveProblem(problem.trim());
} catch (e) {
  console.warn('[solve] engine không giải được, rơi về LLM:', e?.message || e);
}
const engAnswer = engineSolved(eng) ? eng.answers[0].text : null;
```

- [ ] **Step 3: Gọi Vilao (thay DeepSeek) để viết LỜI**, chèn đáp engine:

```js
let raw;
try {
  raw = await callVilao(
    SOLVE_SYSTEM_PROMPT,
    buildSolveUserMessage(problem.trim(), geometry, tags, engAnswer),
    { maxTokens: 3000, timeoutMs: 60000 },
  );
} catch (err) {
  console.error('[solve] Vilao API error:', err.message);
  return res.status(502).json({ error: `LLM call failed: ${err.message}` });
}
```

- [ ] **Step 4: Parse + lắp ráp qua hàm thuần; XOÁ toàn bộ khối vm/solve_javascript.**

```js
const parsed = parseSolveResponse(raw); // giữ hàm parse có sẵn; nó KHÔNG còn cần solve_javascript
if (!parsed) {
  return res.status(422).json({ error: 'LLM returned invalid JSON', raw_preview: raw.slice(0, 300) });
}
const out = assembleSolveResult(eng, parsed);
return res.json({ ...out, geometry });
```

Xoá: biến `verified`/`verifyError`/`sandboxValue`, toàn bộ `if (parsed.solve_javascript) { vm... }`, và `normalizeSteps` cũ trong solve.js (đã chuyển vào solveAssemble). `parseSolveResponse` giữ, nhưng bỏ ràng buộc `solve_javascript` nếu có.

- [ ] **Step 5: node --check** — `node --check api/solve.js` → OK.

- [ ] **Step 6: Commit** — `feat(solve): cam engine (dap+verified) + Vilao viet loi; bo DeepSeek+vm self-verify`

---

## Task 4: Xoá `deepseek.js` + xác nhận sạch tham chiếu

**Files:**
- Delete: `api/_lib/deepseek.js`

- [ ] **Step 1: Xoá file** — `git rm api/_lib/deepseek.js`.

- [ ] **Step 2: Xác nhận không còn import DeepSeek cloud** trong api/ (trừ ollama-r1 local + comment jsonHelpers — cố ý giữ):

Run: `grep -rn "deepseek\|DeepSeek" api/ | grep -v "ollama.js" | grep -v "jsonHelpers.js"`
Expected: KHÔNG còn dòng nào (mọi tham chiếu DeepSeek cloud đã sạch).

- [ ] **Step 3: Full suite + node --check** — `npx vitest run` xanh; `node --check api/solve.js` OK.

- [ ] **Step 4: Commit** — `chore(solve): xoa deepseek.js (DeepSeek cloud) - khong con dung`

---

## Task 5: E2E + không hồi quy + xác nhận hết phụ thuộc DEEPSEEK_API_KEY

**Files:**
- Create: `scripts/e2e-solve.mjs` (đo, phụ thuộc LLM + key)

- [ ] **Step 1: Script E2E** — nạp `.env.local`, dựng payload `{problem, geometry}` cho 1 bài engine-giải-được
  (chóp S.ABCD → √2; geometry lấy từ analyze-geometry hoặc dựng tay 5 điểm), gọi HÀM logic của solve
  (import solveProblem + assembleSolveResult + callVilao trực tiếp, KHÔNG cần http) → in `{verified, final_answer, answer_value, steps.length}`.

- [ ] **Step 2: Kỳ vọng** — bài chóp: `verified=true`, `final_answer` chứa "√2", `steps.length>0`.
  Bài engine-chịu (vd quỹ tích): `verified=false`, có steps, không throw. Ghi kết quả vào "## Findings".

- [ ] **Step 3: Không hồi quy** — `npx vitest run` xanh. Route VẼ (`analyze-geometry`) KHÔNG đụng.

- [ ] **Step 4: Xác nhận độc lập DeepSeek** — đảm bảo KHÔNG set `DEEPSEEK_API_KEY` mà `/api/solve` vẫn chạy
  (engine + Vilao). Ghi rõ trong Findings.

- [ ] **Step 5: Commit** — `test(solve): e2e engine-vao-solve + findings`

---

## Kiểm cuối + gộp

- [ ] Toàn suite xanh; route VẼ không đổi; contract SolveResult y nguyên (UI không cần sửa).
- [ ] Cập nhật memory `integration-branch-and-prod.md` (solve giờ engine-first, bỏ DeepSeek).
- [ ] **HỎI trước khi gộp main** (auto-deploy). Verify prod: nút Giải bài chạy, bài chuẩn `verified=true` đáp đúng.

---

## Findings

*(Điền khi thực thi Task 5: verified/đáp cho bài engine-giải-được và bài engine-chịu; xác nhận không cần DEEPSEEK_API_KEY.)*
