# Advance Mode — Backend Pipeline (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build `/api/analyze-advance` that turns a multi-question OR continuous-animation problem into an engine-verified `AdvanceScene { base, steps[] }` — split (with a deterministic coverage gate) → translate the base ONCE → solve each question with the engine → assemble. Anti-hallucination preserved end-to-end.

**Architecture:** New route + a small `api/_lib/advance/` module. Pass 0 (split+classify+gate, strong model) → Pass 1 (base translate once, reuse `planFromProblem`) → Pass 2 (per-question engine solve + cumulative `visibleIds`) → assemble. Continuous-animation problems bypass the split and reuse the existing engine (kinematic done). Frontend consumption = Plan B.

**Tech Stack:** Node (Vercel serverless, ESM), Vitest, Zod. Reuses `callVilao`, `planFromProblem`/`solvePlan` (`solveWithKernel.js`), `runAny` (kernel-dist), `credits.js`. Model config via ENV.

**Spec:** `docs/superpowers/specs/2026-07-20-advance-mode-design.md`.
**Branch:** off `main` (`claude/kinematic`). Rebuild kernel-dist only if `.ts` engine changes (none expected here). **HỎI trước khi gộp/deploy.**

---

## Bối cảnh cho người thực thi (đọc trước)

- `callVilao(systemPrompt, userPrompt, opts)` (`api/_lib/vilao.js`): gọi LLM Vilao. Hiện dùng **một** key `process.env.VILAO_API_KEY` (dòng ~69) + nhận `opts.model`. Cần thêm `opts.apiKey` (mỗi model một key).
- `planFromProblem(problem, opts)` + `solvePlan(plan)` (`api/_lib/kernel-bridge/solveWithKernel.js`): dịch đề → plan (Zod-validated, tự abstain) → chạy engine → `{ ok, geometry, answers/answer }`. Đây là Pass 1 (base) + nền của Pass 2.
- `runAny(plan)` (kernel-dist): chạy plan qua engine. `answers[i].text`/`.approx` (distance…), `.degrees` (angle).
- Model benchmark (2026-07-20): **premium `gpt-5.6-sol`** cho split + translate; `gemini-3.5-flash-low` fallback. Xem `[[model-benchmark-advance]]`.
- `AdvanceScene`/`Step`: xem spec mục 4. `base`: GeometryData (union). `Step.visibleIds`: id các phần tử hiện ở bước (cumulative).
- Chạy 1 file test: `npx vitest run <path>`.

---

## Task 1: `callVilao` nhận `apiKey` per-call

**Files:** Modify `api/_lib/vilao.js`; Test `api/_lib/__tests__/vilao-apikey.test.js`

- [ ] **Step 1: Test (đỏ)** — `callVilao` dùng `opts.apiKey` khi có, ném rõ khi cả opts.apiKey lẫn ENV đều thiếu.

```js
import { describe, it, expect, vi } from 'vitest';
// vilao.js dùng https trực tiếp — test ở mức "chọn key": tách hàm resolveApiKey nếu cần.
import { resolveApiKey } from '../vilao.js';

describe('callVilao per-call apiKey', () => {
  it('ưu tiên opts.apiKey; fallback ENV VILAO_API_KEY', () => {
    expect(resolveApiKey({ apiKey: 'sk-call' }, 'sk-env')).toBe('sk-call');
    expect(resolveApiKey({}, 'sk-env')).toBe('sk-env');
  });
  it('ném khi không có key nào', () => {
    expect(() => resolveApiKey({}, undefined)).toThrow(/API key/);
  });
});
```

- [ ] **Step 2: Chạy (đỏ)** — `npx vitest run api/_lib/__tests__/vilao-apikey.test.js` → FAIL (resolveApiKey chưa có).

- [ ] **Step 3: Implement** — trong `vilao.js`, tách logic chọn key:

```js
export function resolveApiKey(options = {}, envKey = process.env.VILAO_API_KEY) {
  const key = options.apiKey || envKey;
  if (!key) throw new Error('Vilao API key is not set (opts.apiKey or VILAO_API_KEY)');
  return key;
}
```
Trong `callVilao`, thêm `apiKey = null` vào destructure `options`, và thay `const currentApiKey = process.env.VILAO_API_KEY; if (!currentApiKey) throw ...` bằng `const currentApiKey = resolveApiKey({ apiKey }, process.env.VILAO_API_KEY);`.

- [ ] **Step 4: Chạy (xanh)** — `npx vitest run api/_lib/__tests__/vilao-apikey.test.js` → PASS.

- [ ] **Step 5: Không hồi quy** — `npx vitest run` → xanh.

- [ ] **Step 6: Commit** — `feat(vilao): callVilao nhan apiKey per-call (moi model mot key)`

---

## Task 2: Lưới coverage tất định (chống ảo giác tách đề)

**Files:** Create `api/_lib/advance/coverage.js`; Test `api/_lib/advance/__tests__/coverage.test.js`

Hàm THUẦN: mọi token "quan trọng" trong đề gốc (số, tên điểm 1-2 chữ in hoa, nhãn câu) phải xuất hiện trong ít nhất một part (setup + hỏi). Trả `{ ok, missing }`.

- [ ] **Step 1: Test (đỏ)**

```js
import { describe, it, expect } from 'vitest';
import { extractTokens, coverageCheck } from '../coverage.js';

describe('coverage gate', () => {
  it('extractTokens lấy số + tên điểm + nhãn câu', () => {
    const t = extractTokens('Cho chóp S.ABCD, SA=2a. a) tính V. b) trung điểm M của SC.');
    expect(t).toEqual(expect.arrayContaining(['S', 'A', 'B', 'C', 'D', 'M', '2']));
  });
  it('ok khi mọi token có mặt trong parts', () => {
    const orig = 'A(1;2). a) d(A,P). b) góc M.';
    const parts = [{ hoi: 'khoảng cách A đến P, A(1;2)' }, { hoi: 'góc tại M' }];
    expect(coverageCheck(orig, parts).ok).toBe(true);
  });
  it('fail khi part nuốt mất token (số 5)', () => {
    const orig = 'A(1;2), B(5;0). a) d(A,B).';
    const parts = [{ hoi: 'khoảng cách A(1;2) đến B' }]; // thiếu 5
    const r = coverageCheck(orig, parts);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('5');
  });
});
```

- [ ] **Step 2: Chạy (đỏ)** → FAIL.

- [ ] **Step 3: Implement** — `api/_lib/advance/coverage.js`:

```js
// Token "quan trọng" = số (nguyên/thập phân), tên điểm (1-2 chữ in hoa, có/không dấu phẩy),
// nhãn ẩn. Bỏ dấu tiếng Việt khi so khớp để không lệ thuộc cách gõ.
const noAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

// Điểm hình học = chữ IN HOA đơn (có thể có phẩy), kể cả dính chùm "ABCD" → A,B,C,D.
// Lọc bớt chữ mở đầu từ tiếng Việt hay gặp (Cho, Tính, Gọi, Biết…) để giảm token rác —
// vẫn "thà thừa hơn thiếu" (coverage gắt → rơi về bài đơn, không serve sai).
const STOP = new Set(['C', 'T', 'G', 'B', 'H', 'V', 'M', 'D']); // chỉ loại khi là TỪ (đứng một mình + sau là chữ thường)
export function extractTokens(text) {
  const t = noAccent(text);
  const nums = t.match(/\d+(?:[.,]\d+)?/g) || [];
  const pts = t.match(/[A-Z]'?/g) || [];               // A, B, S, M, A'; "ABCD" → A,B,C,D
  // bỏ chữ cái mở đầu một TỪ thường (vd "C" trong "Cho"): sau nó là chữ thường
  const filtered = pts.filter((p, i) => {
    const idx = t.indexOf(p);
    const next = t[idx + p.length];
    return !(STOP.has(p[0]) && next && /[a-z]/.test(next));
  });
  return [...new Set([...nums.map((x) => x.replace(',', '.')), ...filtered])];
}

export function coverageCheck(originalText, parts) {
  const blob = noAccent(parts.map((p) => `${p.hoi || ''} ${JSON.stringify(p.phan_tu_moi || [])}`).join(' '));
  const nblob = blob.replace(/,/g, '.');
  const missing = extractTokens(originalText).filter((tok) => !nblob.includes(tok));
  return { ok: missing.length === 0, missing };
}
```

- [ ] **Step 4: Chạy (xanh)** → PASS.

- [ ] **Step 5: Commit** — `feat(advance): luoi coverage tat dinh cho buoc tach de`

---

## Task 3: Prompt tách đề (Pass 0) + `splitProblem`

**Files:** Create `api/_lib/advance/splitPrompt.js`, `api/_lib/advance/splitProblem.js`; Test `api/_lib/advance/__tests__/splitProblem.test.js`

- [ ] **Step 1: Prompt** — `splitPrompt.js` export `SPLIT_PROMPT` (few-shot đã kiểm ở benchmark, kèm ví dụ `phan_tu_moi`). Yêu cầu ra CHỈ JSON: `{ type: "multi_question"|"continuous_animation"|"single", setup, parts: [{label, hoi, phan_tu_moi[]}], animation?: {kind} }`.

- [ ] **Step 2: Test (đỏ)** — `splitProblem` gọi model (MOCK), rồi coverage gate; fail coverage → `{type:'single'}`.

```js
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../vilao.js', () => ({ callVilao: vi.fn() }));
import { callVilao } from '../../vilao.js';
import { splitProblem } from '../splitProblem.js';

it('parse + coverage ok → giữ multi_question', async () => {
  callVilao.mockResolvedValue(JSON.stringify({ type: 'multi_question', setup: 'chóp S.ABCD SA=2',
    parts: [{ label: 'a', hoi: 'thể tích chóp SA=2 ABCD', phan_tu_moi: [] },
            { label: 'b', hoi: 'trung điểm M của SC', phan_tu_moi: ['M'] }] }));
  const r = await splitProblem('Cho chóp S.ABCD SA=2. a) thể tích. b) M trung điểm SC.', {});
  expect(r.type).toBe('multi_question');
  expect(r.parts).toHaveLength(2);
});
it('coverage fail → rơi về single', async () => {
  callVilao.mockResolvedValue(JSON.stringify({ type: 'multi_question', setup: 'x',
    parts: [{ label: 'a', hoi: 'thể tích' }] })); // nuốt hết số/điểm
  const r = await splitProblem('Cho chóp S.ABCD SA=2a canh 3. a) V.', {});
  expect(r.type).toBe('single');
});
```

- [ ] **Step 3: Chạy (đỏ)** → FAIL.

- [ ] **Step 4: Implement** — `splitProblem.js`:

```js
import { callVilao } from '../vilao.js';
import { SPLIT_PROMPT } from './splitPrompt.js';
import { coverageCheck } from './coverage.js';
import { extractJson } from '../kernel-bridge/jsonUtil.js'; // hoặc parse tại chỗ

const ADVANCE_MODEL = process.env.ADVANCE_MODEL || 'ram/gemini-3.5-flash-low';
const ADVANCE_API_KEY = process.env.ADVANCE_API_KEY || undefined;

export async function splitProblem(problem, opts = {}) {
  let parsed;
  try {
    const raw = await callVilao(SPLIT_PROMPT, problem, { model: opts.model || ADVANCE_MODEL, apiKey: opts.apiKey || ADVANCE_API_KEY, maxTokens: 2048, timeoutMs: 25000 });
    parsed = JSON.parse(extractJson(raw));
  } catch { return { type: 'single' }; }
  if (parsed.type !== 'multi_question' || !Array.isArray(parsed.parts) || parsed.parts.length < 2) {
    return parsed.type === 'continuous_animation' ? parsed : { type: 'single' };
  }
  const cov = coverageCheck(problem, parsed.parts);
  if (!cov.ok) return { type: 'single', _coverageMissing: cov.missing }; // gate: không serve multi-scene
  return { type: 'multi_question', setup: parsed.setup || '', parts: parsed.parts };
}
```
(Nếu `extractJson` chưa export riêng, copy hàm nhỏ vào coverage/splitProblem.)

- [ ] **Step 5: Chạy (xanh)** → PASS.

- [ ] **Step 6: Commit** — `feat(advance): splitProblem (Pass 0) + prompt tach de + gate coverage`

---

## Task 4: `buildAdvanceScene` — base 1 lần + per-question + ráp

**Files:** Create `api/_lib/advance/buildAdvanceScene.js`; Test `.../__tests__/buildAdvanceScene.test.js`

Với `multi_question`: dịch BASE một lần (setup + hợp mọi `hoi`) qua `planFromProblem`+`solvePlan` → `base` geometry. Rồi mỗi câu: xác định `visibleIds` cumulative (base ids có tên khớp `phan_tu_moi` tích luỹ) + đáp câu (engine giải trên base nếu được; chưa thì `verified:false`). Ráp `AdvanceScene`.

- [ ] **Step 1: Test (đỏ)** — cho stub base geometry (mock solveWithKernel) → `steps` cumulative đúng.

```js
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../kernel-bridge/solveWithKernel.js', () => ({
  planFromProblem: vi.fn(), solvePlan: vi.fn(),
}));
import { planFromProblem, solvePlan } from '../../kernel-bridge/solveWithKernel.js';
import { buildAdvanceScene } from '../buildAdvanceScene.js';

it('multi_question → base + steps cumulative', async () => {
  planFromProblem.mockResolvedValue({ solidName: 'x' });
  solvePlan.mockReturnValue({ ok: true, geometry: { name: 'x',
    points: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'M' }], lines: [] },
    answers: [] });
  const split = { type: 'multi_question', setup: 'chóp S.ABCD',
    parts: [{ label: 'Câu a', hoi: 'thể tích', phan_tu_moi: [] },
            { label: 'Câu b', hoi: 'góc AM', phan_tu_moi: ['M'] }] };
  const scene = await buildAdvanceScene('...', split, {});
  expect(scene.base.points).toHaveLength(6);
  expect(scene.steps).toHaveLength(2);
  // câu a: chưa có M; câu b: cumulative có M
  expect(scene.steps[0].visibleIds).not.toContain('M');
  expect(scene.steps[1].visibleIds).toContain('M');
  expect(scene.steps[0].visibleIds.every((id) => scene.steps[1].visibleIds.includes(id))).toBe(true);
});
```

- [ ] **Step 2: Chạy (đỏ)** → FAIL.

- [ ] **Step 3: Implement** — `buildAdvanceScene.js`:

```js
import { planFromProblem, solvePlan } from '../kernel-bridge/solveWithKernel.js';

// tên phần tử mới trong 1 part → id (khớp hoa/thường, bỏ mô tả).
const nameOf = (s) => String(s).trim().match(/^[A-Za-z]'?[0-9]?/)?.[0] || String(s).trim();

export async function buildAdvanceScene(problem, split, opts = {}) {
  // Dịch BASE một lần: setup + hợp mọi câu hỏi → 1 hệ toạ độ.
  const baseProblem = `${split.setup}\n` + split.parts.map((p, i) => `${p.label || i + 1}) ${p.hoi}`).join('\n');
  const basePlan = await planFromProblem(baseProblem, opts);
  const baseRes = solvePlan(basePlan);
  if (!baseRes.ok || !(baseRes.geometry?.points?.length)) {
    return null; // base fail → route rơi về bài đơn
  }
  const base = baseRes.geometry;
  const allIds = new Set(base.points.map((p) => p.id));

  const cumulative = new Set();
  // Câu đầu: mọi id KHÔNG do câu sau mới thêm. Đơn giản v1: câu i hiện = base id có tên ∈ (phan_tu_moi câu ≤ i)
  // ∪ id "nền" (không được câu nào khai là mới). Nền = allIds trừ mọi phan_tu_moi.
  const introduced = new Set(split.parts.flatMap((p) => (p.phan_tu_moi || []).map(nameOf)));
  const baseline = [...allIds].filter((id) => !introduced.has(id));

  const steps = [];
  for (const p of split.parts) {
    for (const nm of (p.phan_tu_moi || []).map(nameOf)) if (allIds.has(nm)) cumulative.add(nm);
    const visibleIds = [...new Set([...baseline, ...cumulative])];
    steps.push({
      id: p.label || `câu ${steps.length + 1}`,
      label: p.label || `Câu ${steps.length + 1}`,
      visibleIds,
      answer: undefined, // Task 5: engine giải từng câu
    });
  }
  return { base, steps };
}
```
(Đáp từng câu để Task 5; ở đây tập trung cumulative `visibleIds` + base.)

- [ ] **Step 4: Chạy (xanh)** → PASS.

- [ ] **Step 5: Commit** — `feat(advance): buildAdvanceScene - base 1 lan + visibleIds cumulative`

---

## Task 5: Đáp từng câu (engine) + nhãn "chưa kiểm chứng"

**Files:** Modify `buildAdvanceScene.js`; Test `.../__tests__/buildAdvanceScene.test.js`

Mỗi câu: thử engine giải câu đó (dịch riêng CÂU trên cùng base, hoặc query trực tiếp) → `answer.verified=true`; engine chịu → LLM trả lời (tuỳ chọn) + `verified:false`.

- [ ] **Step 1: Test (đỏ)** — câu engine giải được → verified true; engine ném → verified false, không bịa số.

```js
it('câu engine giải được → verified=true; chịu → verified=false', async () => {
  planFromProblem.mockResolvedValue({ solidName: 'x' });
  solvePlan.mockReturnValue({ ok: true, geometry: { name: 'x', points: [{ id: 'A' }], lines: [] }, answers: [] });
  // câu a giải được, câu b engine ném
  const solveQ = vi.fn()
    .mockReturnValueOnce({ ok: true, text: '√2', approx: 1.4142 })
    .mockReturnValueOnce({ ok: false });
  const split = { type: 'multi_question', setup: 's', parts: [
    { label: 'a', hoi: 'd(A,B)', phan_tu_moi: [] }, { label: 'b', hoi: 'chứng minh', phan_tu_moi: [] }] };
  const scene = await buildAdvanceScene('...', split, { _solveQuestion: solveQ });
  expect(scene.steps[0].answer.verified).toBe(true);
  expect(scene.steps[1].answer?.verified ?? false).toBe(false);
});
```

- [ ] **Step 2: Chạy (đỏ)** → FAIL.

- [ ] **Step 3: Implement** — trong vòng lặp câu, gọi `solveQuestion(p.hoi, base, opts)` (tách hàm, inject được để test): dịch CÂU (setup + chỉ câu này) qua planFromProblem+solvePlan, lấy `answers[0]`. ok → `{text, approx, verified:true}`; !ok → `{ verified:false }` (v1 để trống text; LLM-answer là follow-up).

- [ ] **Step 4: Chạy (xanh)** → PASS.

- [ ] **Step 5: Không hồi quy** — `npx vitest run` xanh.

- [ ] **Step 6: Commit** — `feat(advance): dap tung cau qua engine + nhan chua-kiem-chung`

---

## Task 6: Route `/api/analyze-advance` + credit + fallback

**Files:** Create `api/analyze-advance.js`; Modify `api/_lib/credits.js`; Test `api/_lib/__tests__/analyze-advance.test.js`

- [ ] **Step 1: credit** — `credits.js`: thêm `CREDIT_COST.draw_advance` (ví dụ 3; con số duyệt sau). Test: `expect(CREDIT_COST.draw_advance).toBeGreaterThan(CREDIT_COST.draw_detailed ?? 2)`.

- [ ] **Step 2: Test route (đỏ)** — mock split/build; multi_question → trả `{ mode:'advance', scene }`; split=single/build=null → fallback về xử lý bài đơn (gọi solveProblem, mode:'kernel'); hoàn credit khi tụt hạng.

```js
// mock splitProblem, buildAdvanceScene, solveWithKernel; kiểm 3 nhánh + refund khi degrade.
```

- [ ] **Step 3: Implement** — handler: auth (Bearer như analyze-geometry), `checkAndConsume('draw_advance')`, `splitProblem` → nếu `multi_question` → `buildAdvanceScene` → nếu scene ok trả `{mode:'advance', scene}`; nếu `continuous_animation` → route engine hiện có (kinematic) → `{mode:'advance', scene:{base, steps:[{...timeline}]}}`; nếu `single`/scene=null → `solveProblem(problem)` (bài đơn) + **refund** chênh lệch xuống mức detailed. Stream tiến trình qua SSE (theo `analyze-geometry.js`). Đặt `export const config = { maxDuration: 60 }`.

- [ ] **Step 4: Chạy (xanh)** → PASS.

- [ ] **Step 5: Không hồi quy** — `npx vitest run` xanh.

- [ ] **Step 6: Commit** — `feat(advance): route /api/analyze-advance + credit draw_advance + fallback tut-hang`

---

## Task 7: E2E đo thật (model gpt-5.6-sol) + Findings

**Files:** Create `scripts/e2e-advance.mjs`

- [ ] **Step 1: Script** — nạp `.env.local` (+ `ADVANCE_MODEL=cd/gpt-5.6-sol`, `ADVANCE_API_KEY=<inline, KHÔNG commit>`), chạy 1 bài đa-câu (vd chóp S.ABCD 3 câu) qua `splitProblem`→`buildAdvanceScene` 2 lần; in: type, số steps, visibleIds cumulative đúng?, đáp mỗi câu (verified?).

- [ ] **Step 2: Đo** — xác nhận: tách đúng số câu, coverage pass, base dựng 1 lần (1 hệ toạ độ), visibleIds câu sau ⊇ câu trước, đáp câu engine-verified ở câu giải được. Ghi Findings.

- [ ] **Step 3: Không hồi quy** — `npx vitest run` xanh.

- [ ] **Step 4: Commit** — `test(advance): e2e do that pipeline da-cau (gpt-5.6-sol)`

---

## Kiểm cuối + gộp
- [ ] Toàn suite xanh; không đụng route vẽ cũ.
- [ ] Cập nhật memory (pipeline Advance backend xong).
- [ ] **HỎI trước khi gộp main** (auto-deploy). Sau đó → **Plan B (frontend: mode + player)**.

## Findings

**Thực thi 2026-07-20 (subagent-driven, 463 tests xanh):**
- **T1** callVilao apiKey per-call (resolveApiKey) — commit 05a76bf.
- **T2** coverage.js (extractTokens + coverageCheck) — commit 3028fee. *(Implementer bắt lỗi `indexOf` trong code mẫu → sửa bằng regex.exec; sửa vitest.config include cho advance/__tests__.)*
- **T3** splitPrompt + splitProblem (mọi đường lỗi → single) — commit cbfed0f + 58185ac (thêm test chứng minh nhánh coverage-gate bằng mutation).
- **T4** buildAdvanceScene (base 1 lần + visibleIds cumulative + base-fail→null) — commit 5130ddb.
- **T5** đáp từng câu + verified flag (chống-bịa 2 lớp) — commit 8f271a6.
- **T6** route /api/analyze-advance + assembleAdvance (5 test nhánh) + credit `draw_advance:3` (ở entitlements.js) + fallback refund tụt-hạng + nạp động — commit c1c51a3.
- **T7** e2e đo thật + fix.

**🐛 E2E bắt được bug thật (coverage quá gắt):** `coverageCheck` chỉ soi `parts`, KHÔNG soi `setup` → kích thước
đề ("cạnh 2a", "SA=2a") ở setup bị coi là "thiếu" → loại oan MỌI bài đa-câu về single. **Fix:** `coverageCheck`
nhận thêm `setup` (soi cả setup + parts); `splitProblem` truyền `parsed.setup`. + regression test.

**E2E kết quả (gpt-5.6-sol split + gemini base, chóp S.ABCD 2a 3 câu, 2/2 lần):**
- split → `multi_question`, 3 parts; câu b nhận đúng "M trung điểm SC" là phần tử mới.
- base dựng 1 lần (6 điểm, 1 hệ toạ độ); 3 steps; visibleIds **cumulative đúng** (câu b ⊇ câu a).
- đáp engine **cả 3 câu verified**: a) thể tích `8/3`, b) k/c M→(ABCD) `1`, c) k/c A→(SBC) `√2`.
- ✅ Pipeline backend Advance hoạt động end-to-end với model thật.

**Final code review (subagent) → CHANGES_NEEDED → đã sửa 2 must-fix (commit sau):**
- **C1 (Critical, ĐÃ SỬA):** `coverageCheck` dùng SUBSTRING → token bị nuốt vẫn lọt nếu chữ số nằm trong số
  khác ("2" ⊂ "12") → lỗ hổng bịa đáp verified-sai. Sửa: so khớp TẬP TOKEN (`extractTokens` cả haystack) + test.
- **I1 (Important-safety, ĐÃ SỬA):** `planFromProblem`/`solveProblem` NÉM khi translator abstain (out-of-catalog)
  → `buildAdvanceScene` chỉ bắt `ok:false` → 500. Sửa: bọc try/catch base-translate → null; `assembleAdvance`
  bọc fallback solveProblem → `{degraded, ok:false, abstained}` sạch (không 500) + test.

**Hoãn (degrade an toàn, KHÔNG bịa — follow-up/Plan B):**
- **I2:** `nameOf` lấy chữ đầu descriptor → "trung điểm M của SC" ra "t" thay vì "M" ⇒ reveal cộng-dồn sập về
  "hiện hết". (e2e vẫn chạy vì few-shot bias phrasing chữ-trước; prompt "I là trung điểm AB".) Fix: rút point-id
  xuất hiện làm token trong descriptor ∩ allIds. Cũng: mặt/đường ("(SBC)") chưa reveal (points-only).
- **I3:** giải-từng-câu chỉ có setup+câu đó (mất ngữ cảnh câu trước) ⇒ câu phụ thuộc câu trước → abstain (an toàn).
- **I4:** chưa cap N≤6, chưa SSE stream, base chưa normalize, envelope degraded khác shape route vẽ (Plan B lo).
- Nits: N1 dead `?? res.answer`; N2 key wiring nửa vời (base vẫn VILAO_API_KEY); N4 coverage bỏ dấu ±; N5 all-false vẫn full giá.

**Ghi chú wiring:** Pass 1 (base) hiện dùng gemini (TRANSLATOR_MODEL), Pass 0 (split) dùng gpt-5.6-sol (ADVANCE_MODEL).
Đây là "model mạnh ở điểm yếu (split, không engine gác)", gemini rẻ cho base (engine gác) — hợp benchmark. Nếu muốn
gpt-sol cho cả base: cần cho `planFromProblem` nhận opts.model (follow-up nhỏ). Handler HTTP (auth/credit) chưa
unit-test (theo pattern route cũ). Free-tier quota không hoàn khi tụt-hạng (theo tiền lệ analyze-geometry).
