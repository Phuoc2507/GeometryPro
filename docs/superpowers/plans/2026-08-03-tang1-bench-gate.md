# Tầng 1 — Cổng regression engine ("bench:gate") — Kế hoạch thực thi

> **For agentic workers:** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để thực thi task-by-task. Các bước dùng checkbox (`- [ ]`).

**Goal:** Lệnh `npm run bench:gate` phát lại một rổ đề mốc qua engine sống (mặc định tất định, không gọi AI) và chặn (exit≠0) khi có tụt lùi (đề trước giải được nay hỏng, hoặc đáp số đổi khác).

**Architecture:** Tách logic thuần (`compareCase`/`loadGolden`/`runGate` trong `api/_lib/bench/`, test vitest) khỏi vỏ CLI mỏng (`scripts/bench-gate.mjs`). Tận dụng `solvePlan()` + `answerCompare.js` sẵn có trong prod; không phụ thuộc vsgeo-bench. Rổ đề mốc là các file JSON trong `bench/golden/`.

**Tech Stack:** Node ESM (`.js`/`.mjs`), vitest, engine kernel-dist (đã build), zod (đã có gián tiếp qua schema engine).

**Spec:** `docs/superpowers/specs/2026-08-03-tang1-bench-gate-design.md`

---

## Bản đồ file

- **Sửa:** `vitest.config.ts` — thêm glob `api/_lib/bench/__tests__/**/*.test.js` vào `include`.
- **Sửa:** `package.json` — thêm script `bench:gate`.
- **Tạo:** `api/_lib/bench/compareCase.js` — THUẦN: so 1 ca golden ↔ kết quả engine → verdict.
- **Tạo:** `api/_lib/bench/loadGolden.js` — đọc + validate rổ golden từ 1 thư mục.
- **Tạo:** `api/_lib/bench/runGate.js` — điều phối: chạy mọi ca qua `solveOne` (tiêm vào), tổng hợp.
- **Tạo:** `scripts/bench-gate.mjs` — vỏ CLI: nối engine thật, in bảng, `process.exit`.
- **Tạo:** `bench/golden/pyramid-scd.json` — ca mốc đầu (pyramid trong kernel-smoke, đáp `√2`,`8/3`).
- **Tạo:** `bench/golden/README.md` — cách thêm/tạo lại golden + lộ trình gặt problem_reports.
- **Tạo (test):** `api/_lib/bench/__tests__/compareCase.test.js`, `loadGolden.test.js`, `runGate.test.js`.
- **Tạo (fixtures):** `api/_lib/bench/__tests__/fixtures/good/ok-case.json`, `.../bad/missing-plan.json`.

---

### Task 1: Scaffolding — vitest glob + thư mục

**Files:**
- Modify: `vitest.config.ts` (mảng `include`)

- [ ] **Step 1: Thêm glob test cho bench vào vitest include**

Trong `vitest.config.ts`, thêm phần tử vào mảng `include` (sau `'api/_lib/advance/__tests__/**/*.test.js'`):

```ts
'api/_lib/bench/__tests__/**/*.test.js',
```

- [ ] **Step 2: Xác nhận vitest vẫn nhận cấu hình (chưa có test bench nên không đổi số)**

Run: `npx vitest run --dir api/_lib 2>&1 | tail -5`
Expected: PASS như cũ (chưa thêm test mới).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -F <msg>   # "chore(bench): mở glob test api/_lib/bench cho vitest"
```

---

### Task 2: `compareCase` — phân loại tụt lùi (THUẦN)

**Files:**
- Create: `api/_lib/bench/compareCase.js`
- Test: `api/_lib/bench/__tests__/compareCase.test.js`

- [ ] **Step 1: Viết test thất bại**

```js
// api/_lib/bench/__tests__/compareCase.test.js
import { describe, it, expect } from 'vitest';
import { compareCase } from '../compareCase.js';

const golden = (over = {}) => ({
  id: 't', plan: {},
  expect: { ok: true, answers: [{ kind: 'distance', text: '√2' }, { kind: 'volume', text: '8/3' }] },
  ...over,
});

describe('compareCase', () => {
  it('pass khi ok:true và mọi đáp khớp SỐ (√2 == 1.4142…, 8/3 == 2.666…)', () => {
    const result = { ok: true, answers: [{ text: '1.4142135' }, { text: '2.6666667' }] };
    expect(compareCase(golden(), result).verdict).toBe('pass');
  });

  it('regress-status khi kỳ vọng ok:true nhưng nay ok:false', () => {
    const r = compareCase(golden(), { ok: false, answers: [] });
    expect(r.verdict).toBe('regress-status');
  });

  it('regress-status khi ok:true nhưng KHÔNG ra đáp nào', () => {
    expect(compareCase(golden(), { ok: true, answers: [] }).verdict).toBe('regress-status');
  });

  it('regress-answer khi một đáp số LỆCH', () => {
    const result = { ok: true, answers: [{ text: '√2' }, { text: '3' }] }; // 3 ≠ 8/3
    const r = compareCase(golden(), result);
    expect(r.verdict).toBe('regress-answer');
    expect(r.detail).toContain('#2');
  });

  it('regress-answer khi SỐ LƯỢNG đáp khác', () => {
    expect(compareCase(golden(), { ok: true, answers: [{ text: '√2' }] }).verdict).toBe('regress-answer');
  });

  it('error khi engine văng lỗi (__throw)', () => {
    expect(compareCase(golden(), { __throw: 'kernel-dist lỗi' }).verdict).toBe('error');
  });

  it('pass khi kỳ vọng ok:false và nay cũng ok:false', () => {
    const r = compareCase(golden({ expect: { ok: false } }), { ok: false, answers: [] });
    expect(r.verdict).toBe('pass');
  });
});
```

- [ ] **Step 2: Chạy để thấy FAIL**

Run: `npx vitest run api/_lib/bench/__tests__/compareCase.test.js`
Expected: FAIL ("Cannot find module '../compareCase.js'").

- [ ] **Step 3: Viết `compareCase.js`**

```js
// api/_lib/bench/compareCase.js
// So MỘT ca golden với kết quả engine (solvePlan/solveProblem). THUẦN, không I/O.
// Trả { id, verdict, detail }. verdict: 'pass' | 'regress-status' | 'regress-answer' | 'error'.
// So đáp bằng SỐ (answerCompare) — √2 khớp 1.4142…, KHÔNG so chuỗi thô.
import { answersAgree, toNumeric } from '../answerCompare.js';

export function compareCase(golden, result) {
  const id = golden.id;
  if (result && result.__throw) {
    return { id, verdict: 'error', detail: 'engine văng lỗi: ' + result.__throw };
  }
  const expect = golden.expect || {};
  const wantOk = expect.ok !== false; // mặc định kỳ vọng ok:true
  const gotOk = !!(result && result.ok);
  const answers = (result && result.answers) || [];

  if (!wantOk) {
    // Ca kỳ vọng HỎNG (hiếm ở v1): nay đậu ⇒ đổi hành vi (đánh regress-answer để lộ ra); nay hỏng ⇒ pass.
    return gotOk
      ? { id, verdict: 'regress-answer', detail: 'kỳ vọng ok:false nhưng nay ok:true' }
      : { id, verdict: 'pass', detail: 'ok:false như kỳ vọng' };
  }
  if (!gotOk || answers.length === 0) {
    return { id, verdict: 'regress-status', detail: `kỳ vọng ok:true nhưng nay ok=${gotOk}, số đáp=${answers.length}` };
  }
  const want = expect.answers || [];
  if (want.length !== answers.length) {
    return { id, verdict: 'regress-answer', detail: `số/thứ tự đáp khác: kỳ vọng ${want.length}, nay ${answers.length}` };
  }
  for (let i = 0; i < want.length; i++) {
    const agree = answersAgree(answers[i]?.text, toNumeric(want[i]?.text));
    if (agree !== true) {
      return { id, verdict: 'regress-answer', detail: `đáp #${i + 1} lệch: kỳ vọng "${want[i]?.text}" nay "${answers[i]?.text}"` };
    }
  }
  return { id, verdict: 'pass', detail: `${want.length} đáp khớp` };
}
```

- [ ] **Step 4: Chạy để thấy PASS**

Run: `npx vitest run api/_lib/bench/__tests__/compareCase.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/bench/compareCase.js api/_lib/bench/__tests__/compareCase.test.js
git commit -F <msg>   # "feat(bench): compareCase — phân loại tụt lùi engine (7 test)"
```

---

### Task 3: `loadGolden` — nạp + validate rổ golden

**Files:**
- Create: `api/_lib/bench/loadGolden.js`
- Test: `api/_lib/bench/__tests__/loadGolden.test.js`
- Fixtures: `api/_lib/bench/__tests__/fixtures/good/ok-case.json`, `.../bad/missing-plan.json`

- [ ] **Step 1: Tạo fixtures**

`api/_lib/bench/__tests__/fixtures/good/ok-case.json`:
```json
{ "id": "fx-ok", "plan": { "solidName": "x", "ops": [], "asserts": [], "queries": [] }, "expect": { "ok": true, "answers": [] } }
```

`api/_lib/bench/__tests__/fixtures/bad/missing-plan.json`:
```json
{ "id": "fx-bad", "expect": { "ok": true, "answers": [] } }
```

- [ ] **Step 2: Viết test thất bại**

```js
// api/_lib/bench/__tests__/loadGolden.test.js
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateGolden, loadGoldenDir } from '../loadGolden.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('validateGolden', () => {
  it('ok với ca đủ id/plan/expect', () => {
    expect(validateGolden({ id: 'a', plan: {}, expect: { ok: true, answers: [] } }).ok).toBe(true);
  });
  it('lỗi khi thiếu plan', () => {
    const v = validateGolden({ id: 'a', expect: { ok: true, answers: [] } });
    expect(v.ok).toBe(false);
    expect(v.error).toContain('plan');
  });
  it('lỗi khi ok:true nhưng answers không phải mảng', () => {
    expect(validateGolden({ id: 'a', plan: {}, expect: { ok: true } }).ok).toBe(false);
  });
});

describe('loadGoldenDir', () => {
  it('nạp mọi *.json hợp lệ trong thư mục', () => {
    const cases = loadGoldenDir(join(here, 'fixtures', 'good'));
    expect(cases.map((c) => c.id)).toEqual(['fx-ok']);
  });
  it('NÉM khi có ca hỏng schema (không chạy mù)', () => {
    expect(() => loadGoldenDir(join(here, 'fixtures', 'bad'))).toThrow(/thiếu plan|missing-plan/);
  });
});
```

- [ ] **Step 3: Chạy để thấy FAIL**

Run: `npx vitest run api/_lib/bench/__tests__/loadGolden.test.js`
Expected: FAIL ("Cannot find module '../loadGolden.js'").

- [ ] **Step 4: Viết `loadGolden.js`**

```js
// api/_lib/bench/loadGolden.js
// Nạp rổ đề mốc từ 1 thư mục: đọc mọi *.json, validate tối thiểu. NÉM nếu có ca hỏng
// (cổng phải báo lỗi rõ, không được chạy mù trên rổ hỏng).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function validateGolden(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'không phải object' };
  if (typeof obj.id !== 'string' || !obj.id) return { ok: false, error: 'thiếu id' };
  if (!obj.plan || typeof obj.plan !== 'object') return { ok: false, error: `[${obj.id || '?'}] thiếu plan` };
  if (!obj.expect || typeof obj.expect !== 'object') return { ok: false, error: `[${obj.id}] thiếu expect` };
  if (obj.expect.ok !== false && !Array.isArray(obj.expect.answers)) {
    return { ok: false, error: `[${obj.id}] expect.answers phải là mảng khi ok:true` };
  }
  return { ok: true };
}

export function loadGoldenDir(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const cases = [];
  for (const f of files) {
    let obj;
    try { obj = JSON.parse(readFileSync(join(dir, f), 'utf8')); }
    catch (e) { throw new Error(`golden hỏng JSON: ${f}: ${e.message}`); }
    const v = validateGolden(obj);
    if (!v.ok) throw new Error(`golden không hợp lệ: ${f}: ${v.error}`);
    cases.push(obj);
  }
  return cases;
}
```

- [ ] **Step 5: Chạy để thấy PASS**

Run: `npx vitest run api/_lib/bench/__tests__/loadGolden.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add api/_lib/bench/loadGolden.js api/_lib/bench/__tests__/loadGolden.test.js api/_lib/bench/__tests__/fixtures
git commit -F <msg>   # "feat(bench): loadGolden — nạp + validate rổ đề mốc (5 test)"
```

---

### Task 4: `runGate` — điều phối + tổng hợp

**Files:**
- Create: `api/_lib/bench/runGate.js`
- Test: `api/_lib/bench/__tests__/runGate.test.js`

- [ ] **Step 1: Viết test thất bại (solver GIẢ — không cần engine)**

```js
// api/_lib/bench/__tests__/runGate.test.js
import { describe, it, expect } from 'vitest';
import { runGate } from '../runGate.js';

const goodCase = { id: 'g', plan: {}, expect: { ok: true, answers: [{ text: '2' }] } };
const passResult = { ok: true, answers: [{ text: '2' }] };

describe('runGate', () => {
  it('không tụt lùi khi mọi ca pass', async () => {
    const { summary, hasRegression } = await runGate([goodCase], async () => passResult);
    expect(hasRegression).toBe(false);
    expect(summary.pass).toBe(1);
  });

  it('bắt regress-answer khi solver trả đáp lệch', async () => {
    const { summary, hasRegression } = await runGate([goodCase], async () => ({ ok: true, answers: [{ text: '5' }] }));
    expect(hasRegression).toBe(true);
    expect(summary['regress-answer']).toBe(1);
  });

  it('solver NÉM → verdict error (không làm sập cổng)', async () => {
    const { summary, hasRegression } = await runGate([goodCase], async () => { throw new Error('boom'); });
    expect(hasRegression).toBe(true);
    expect(summary.error).toBe(1);
  });

  it('tổng hợp nhiều ca đúng', async () => {
    const cases = [goodCase, { ...goodCase, id: 'g2' }];
    let n = 0;
    const { results } = await runGate(cases, async () => (n++ === 0 ? passResult : { ok: false, answers: [] }));
    expect(results.map((r) => r.verdict)).toEqual(['pass', 'regress-status']);
  });
});
```

- [ ] **Step 2: Chạy để thấy FAIL**

Run: `npx vitest run api/_lib/bench/__tests__/runGate.test.js`
Expected: FAIL ("Cannot find module '../runGate.js'").

- [ ] **Step 3: Viết `runGate.js`**

```js
// api/_lib/bench/runGate.js
// Điều phối cổng: mỗi ca chạy qua solveOne(case) (TIÊM VÀO để test không cần engine/LLM),
// phân loại bằng compareCase. solveOne ném → ghi { __throw } (verdict error), KHÔNG làm sập cổng.
// Trả { results, summary, hasRegression }. hasRegression = có bất kỳ verdict ≠ 'pass'.
import { compareCase } from './compareCase.js';

export async function runGate(cases, solveOne) {
  const results = [];
  for (const c of cases) {
    let result;
    try { result = await solveOne(c); }
    catch (e) { result = { __throw: e && e.message ? e.message : String(e) }; }
    results.push(compareCase(c, result));
  }
  const summary = { pass: 0, 'regress-status': 0, 'regress-answer': 0, error: 0 };
  for (const r of results) summary[r.verdict] = (summary[r.verdict] || 0) + 1;
  const hasRegression = results.some((r) => r.verdict !== 'pass');
  return { results, summary, hasRegression };
}
```

- [ ] **Step 4: Chạy để thấy PASS**

Run: `npx vitest run api/_lib/bench/__tests__/runGate.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/bench/runGate.js api/_lib/bench/__tests__/runGate.test.js
git commit -F <msg>   # "feat(bench): runGate — điều phối cổng + tổng hợp (4 test)"
```

---

### Task 5: Rổ golden thật + vỏ CLI + lệnh npm (chạy engine THẬT)

**Files:**
- Create: `bench/golden/pyramid-scd.json`
- Create: `bench/golden/README.md`
- Create: `scripts/bench-gate.mjs`
- Modify: `package.json` (script `bench:gate`)

- [ ] **Step 1: Tạo ca mốc đầu (pyramid từ kernel-smoke — đáp đã chứng minh `√2`, `8/3`)**

`bench/golden/pyramid-scd.json`:
```json
{
  "id": "pyramid-scd-01",
  "source": "kernel-smoke.mjs",
  "text": "Cho hình chóp S.ABCD đáy vuông cạnh 2, SA vuông góc đáy, SA=2. Tính d(A,(SCD)) và thể tích khối chóp.",
  "plan": {
    "solidName": "S.ABCD",
    "ops": [
      { "op": "oxyz_point", "name": "A", "at": [0, 0, 0] },
      { "op": "oxyz_point", "name": "B", "at": [2, 0, 0] },
      { "op": "oxyz_point", "name": "C", "at": [2, 2, 0] },
      { "op": "oxyz_point", "name": "D", "at": [0, 2, 0] },
      { "op": "oxyz_point", "name": "S", "at": [0, 0, 2] },
      { "op": "oxyz_plane", "name": "BASE", "by": { "form": "three_points", "a": "A", "b": "B", "c": "C" } },
      { "op": "oxyz_plane", "name": "SCD", "by": { "form": "three_points", "a": "S", "b": "C", "c": "D" } },
      { "op": "edge", "from": "A", "to": "B" }, { "op": "edge", "from": "B", "to": "C" },
      { "op": "edge", "from": "C", "to": "D" }, { "op": "edge", "from": "D", "to": "A" },
      { "op": "edge", "from": "S", "to": "A" }, { "op": "edge", "from": "S", "to": "B" },
      { "op": "edge", "from": "S", "to": "C" }, { "op": "edge", "from": "S", "to": "D" }
    ],
    "asserts": [{ "relation": "perp", "args": ["AS", "BASE"] }],
    "queries": [
      { "kind": "distance", "a": "A", "b": "SCD" },
      { "kind": "volume", "solid": "pyramid", "points": ["A", "B", "C", "D"], "apex": "S" }
    ]
  },
  "expect": {
    "ok": true,
    "answers": [
      { "kind": "distance", "text": "√2" },
      { "kind": "volume", "text": "8/3" }
    ]
  }
}
```

- [ ] **Step 2: Viết vỏ CLI `scripts/bench-gate.mjs`**

```js
// scripts/bench-gate.mjs
// Cổng regression engine (Tầng 1) — chạy TAY trước deploy: phát lại rổ đề mốc qua engine,
// rớt là chặn (exit≠0). Mặc định engine-replay (solvePlan — tất định, KHÔNG gọi AI).
// Cờ --full: chạy cả bước dịch (solveProblem — TỐN LLM, cần env .env.local).
// Cờ --dir <path>: đổi rổ golden (mặc định bench/golden).
// Chạy: npm run bench:gate   |   npm run bench:gate -- --full
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadGoldenDir } from '../api/_lib/bench/loadGolden.js';
import { runGate } from '../api/_lib/bench/runGate.js';
import { solvePlan, solveProblem } from '../api/_lib/kernel-bridge/solveWithKernel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const full = argv.includes('--full');
const dir = argv.includes('--dir') ? argv[argv.indexOf('--dir') + 1] : join(__dirname, '..', 'bench', 'golden');

// --full cần khoá API translator: nạp .env.local (đường chính engine-replay KHÔNG cần env).
if (full) {
  try { const { config } = await import('dotenv'); config({ path: join(__dirname, '..', '.env.local') }); }
  catch { /* dotenv thiếu → cứ chạy, callVilao sẽ báo thiếu khoá */ }
}

const cases = loadGoldenDir(dir);
console.log(`bench:gate — ${cases.length} ca | chế độ: ${full ? 'full-pipeline (LLM)' : 'engine-replay (tất định)'} | rổ: ${dir}`);

const solveOne = full ? (c) => solveProblem(c.text) : (c) => solvePlan(c.plan);
const { results, summary, hasRegression } = await runGate(cases, solveOne);

for (const r of results) {
  console.log(`  ${r.verdict === 'pass' ? '✅' : '❌'} ${r.id} [${r.verdict}] ${r.detail}`);
}
console.log(`Tổng: pass=${summary.pass} regress-status=${summary['regress-status']} regress-answer=${summary['regress-answer']} error=${summary.error}`);
console.log(hasRegression ? 'GATE FAIL ❌ (có tụt lùi)' : 'GATE PASS ✅');
process.exit(hasRegression ? 1 : 0);
```

- [ ] **Step 3: Thêm script `bench:gate` vào `package.json`**

Trong `"scripts"`, thêm (sau `"smoke:kernel"`):
```json
"bench:gate": "npm run build:kernel && node scripts/bench-gate.mjs",
```

- [ ] **Step 4: Chạy cổng THẬT (engine-replay) — phải PASS**

Run: `npm run bench:gate`
Expected: in `✅ pyramid-scd-01 [pass] 2 đáp khớp` và `GATE PASS ✅`, exit 0.
Nếu FAIL ở đáp: chạy `node -e "import('./api/_lib/kernel-bridge/solveWithKernel.js').then(m=>console.log(JSON.stringify(m.solvePlan(require('./bench/golden/pyramid-scd.json').plan).answers)))"` để đọc đáp THẬT rồi sửa `expect.answers` cho khớp (đừng đoán).

- [ ] **Step 5: Chứng minh cổng CHẶN được — tạm phá 1 đáp rồi chạy lại**

Sửa tạm `expect.answers[1].text` từ `"8/3"` thành `"999"`, chạy `npm run bench:gate`.
Expected: `❌ ... [regress-answer] đáp #2 lệch ...` và `GATE FAIL ❌`, exit 1.
Rồi HOÀN `"8/3"` lại. (Không commit bản phá.)

- [ ] **Step 6: Sau khi chạy `npm run bench:gate`, kernel-dist bị build re-emit — KHÔI PHỤC (không đụng kernel source)**

Run: `git checkout -- api/_lib/kernel-dist/index.mjs`
(Chỉ chạy nếu `git status` báo kernel-dist đổi mà bạn KHÔNG sửa kernel source.)

- [ ] **Step 7: Viết `bench/golden/README.md`**

```markdown
# Rổ đề mốc (golden) — Tầng 1 bench:gate

Mỗi `*.json` là 1 ca: `{ id, source, text?, plan, expect:{ ok, answers:[{kind,text}] } }`.
- `plan` (bắt buộc) chạy qua engine bằng `solvePlan` — **tất định, không gọi AI**.
- `text` (tùy chọn) chỉ cần cho chế độ `--full` (chạy cả bước dịch).
- `expect.answers` khớp THEO THỨ TỰ với `plan.queries`; so bằng SỐ (√2 == 1.4142…).

## Chạy
- `npm run bench:gate`            # engine-replay (mặc định, miễn phí)
- `npm run bench:gate -- --full`  # cả translator (tốn LLM, cần .env.local)

## Thêm ca mốc
1. Viết `plan` (hoặc lấy từ `problem_reports.ai_json.plan` — Tầng 0 đã lưu).
2. Chạy `solvePlan(plan)`, ĐỌC đáp thật, ĐỐI CHIẾU TAY xem đúng chưa.
3. Chỉ khi chắc đúng mới ghi `expect.answers` = đáp đó. **Đừng "tạo lại golden" từ engine đang nghi sai** — golden phải phản ánh đáp ĐÚNG, không phải đáp HIỆN TẠI.

## Lộ trình (chưa làm)
Gặt tự động từ `problem_reports` thành ca "known-gap"; khi bản sửa làm ca đó đậu → gợi ý kết nạp. Đây là chỗ nối Tầng 2/3.
```

- [ ] **Step 8: Commit**

```bash
git add bench/golden scripts/bench-gate.mjs package.json
git commit -F <msg>   # "feat(bench): cổng bench:gate chạy engine thật + rổ golden pyramid"
```

---

### Task 6: Chốt — full suite + build + đẩy prod

- [ ] **Step 1: Chạy TOÀN BỘ test**

Run: `npx vitest run 2>&1 | tail -8`
Expected: tất cả xanh (1007 cũ + 16 mới = ~1023).

- [ ] **Step 2: Build (không đụng kernel source → khôi phục kernel-dist nếu re-emit)**

Run: `npm run build 2>&1 | tail -3` rồi `git checkout -- api/_lib/kernel-dist/index.mjs` nếu nó đổi.
Expected: build xanh, `git status` chỉ còn file chủ đích.

- [ ] **Step 3: Đẩy prod (build phải xanh trước)**

```bash
git fetch origin && git rebase origin/main && git push origin HEAD:main
```

- [ ] **Step 4: Xác nhận deploy Vercel**

Run (PowerShell): `Invoke-RestMethod` tới `https://api.github.com/repos/Phuoc2507/GeometryPro/commits/<sha>/status` → chờ `state=success`.

---

## Self-Review

- **Spec coverage:** engine-replay gate ✓ (Task 5), phân loại regress ✓ (Task 2), exit code ✓ (Task 5 CLI), golden format ✓ (Task 5), so đáp bằng số ✓ (Task 2 dùng answerCompare), `--full` ✓ (Task 5), tách logic/CLI + test ✓ (Task 2–4), README + lộ trình harvest ✓ (Task 5). KHÔNG làm (đúng YAGNI): capture, harvest, cron, CI, dashboard.
- **Placeholder scan:** không TBD; mọi bước có code/lệnh thật. `<msg>` = viết message ra file UTF-8 rồi `git commit -F` (nếp PowerShell của repo).
- **Type consistency:** `compareCase(golden, result)`, `runGate(cases, solveOne)`, `loadGoldenDir(dir)`, `validateGolden(obj)` — tên & chữ ký khớp giữa các task và CLI. verdict strings ('pass'|'regress-status'|'regress-answer'|'error') dùng nhất quán ở compareCase + runGate summary + test.
- **Rủi ro đã chặn:** golden bám-sai (README + đối chiếu tay), kernel-dist churn (khôi phục sau mỗi lần build/gate), vitest bỏ sót test (Task 1 mở glob), đáp đoán-sai (Task 5 Step 4 đọc đáp thật trước khi chốt).
