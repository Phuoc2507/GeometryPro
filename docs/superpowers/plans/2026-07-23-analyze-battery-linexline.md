# Analyze Battery + Line×Line Intersection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the line×line intersection gap in the exact kernel (so đường×đường either yields a certified point or is safely rejected — never a fabricated point), unlock it in the translator prompt, and lay down a deterministic Vitest regression battery over the numeric `analyze` branch.

**Architecture:** Two deploy beats. **Nhịp 1** (engine-only, deployable immediately): add exact-rational `iLineLine` to the compute layer + a `'line-line'` switch case, harden the `oxyz_intersect` dialect handler with Vietnamese degenerate messages, and add 8 test files that pin current `analyze` behavior as a regression net. **Nhịp 2** (gated by the live 50-case translator gate): remove the two contradicting "đường×đường không hỗ trợ" sentences from `translatorPrompt.js`. All changes are additive — the `IntersectionAnswer` result union already carries `'point'|'parallel'|'coincident'|'none'`, so no type changes are needed.

**Tech Stack:** TypeScript, exact-rational `Scalar`/`Vec3S` kernel (free-function arithmetic), Zod plan schemas, Vitest 4.1.10 (env node; include glob `api/_lib/kernel/**/*.test.ts` auto-discovers new tests). `npm test` = `vitest run`; `npm run build` = `npm run build:kernel && vite build`.

---

## Deploy Split

| Nhịp | Tasks | Gate before push | Deploys? |
|------|-------|------------------|----------|
| **1** | Task 1 (iLineLine), Task 2 (oxyz messages), Tasks 3–8 (battery) | `npm test` green + `npm run build` exit 0 | Yes — push to `origin/main` immediately |
| **2** | Task 9 (translatorPrompt unlock) | Nhịp 1 gate **plus** the live 50-case translator gate (needs `VILAO_API_KEY`) — 0 wrong answers, 15/15 hard gate | Yes — push only after the live gate passes |

Nhịp 1 is pure engine + tests; it changes no prompt, so it cannot regress the translator and ships on the ordinary build gate. Task 9 changes model-facing instructions and therefore waits for the live gate per the translator-prompt change discipline.

---

## File Structure

**Create (test files — auto-discovered by the include glob):**
- `api/_lib/kernel/compute/__tests__/intersect-line-line.test.ts` — Task 1: 5 exact `computeIntersection` line×line cases.
- `api/_lib/kernel/analysis/__tests__/oxyz-intersect-linexline.test.ts` — Task 2: `run()`-level anti-hallucination (degenerate line×line rejected, never fabricated).
- `api/_lib/kernel/analysis/__tests__/analyze-router.test.ts` — Task 3: `runAny` dispatch (geometry vs analyze).
- `api/_lib/kernel/analysis/__tests__/analyze-answer-scale.test.ts` — Task 4: `answerScale`/`answerUnit` via the `eval` kind.
- `api/_lib/kernel/analysis/__tests__/analyze-guards.test.ts` — Task 5: pin exact guard messages (schema-fail, eval-source, optimize_multi non-expr + param-not-declared, solve_multi param-not-declared).
- `api/_lib/kernel/analysis/__tests__/analyze-multivar.test.ts` — Task 6: ≥3-var `optimize_multi` success, ≥3-var `solve_multi` success, ≥3-var `solve_multi` residual-gate rejection.
- `api/_lib/kernel/analysis/__tests__/analyze-mover-solve.test.ts` — Task 7: mover injection + single-param `solve`.
- `api/_lib/kernel/analysis/__tests__/analyze-polyfit-degrees.test.ts` — Task 8: `fitPoly` degree 1 and degree 4.

**Modify:**
- `api/_lib/kernel/compute/intersect.ts` — Task 1: add `iLineLine` + `'line-line'` case (no new imports needed).
- `api/_lib/kernel/dialects/oxyz.ts` — Task 2: Vietnamese degenerate messages in the `oxyz_intersect` handler.
- `api/_lib/kernel-bridge/translatorPrompt.js` — Task 9 (Nhịp 2): remove the two contradicting "không hỗ trợ đường×đường" sentences.

**Reference facts baked into this plan (verified verbatim in the worktree):**
- `IntersectionAnswer.result: 'point'|'line'|'circle'|'tangent-point'|'segment'|'none'|'coincident'|'parallel'` — already includes every value `iLineLine` returns.
- `computeIntersection(a,b): ComputeOutcome<IntersectionAnswer>` wraps each helper as `{ ok: true, answer: iXxx(...) }`; unknown key → `{ ok: false, problem: \`intersection not supported for ${key}\` }`. Dispatch key is `` `${a.kind}-${b.kind}` ``.
- `intersect.ts` already imports `subV, addV, dotV, crossV, lenSqV, scaleV` (vec3s), `div` (scalar), `isZeroS` (answer), `pointFromCoords` (entities), and types `LineE`. **No import changes for Task 1.**
- `LineE = { kind: 'line'; p: Vec3S; dir: Vec3S }`. `lineFromPointDir(p, dir)` builds one. `toApproxVec(v)` → `{ x, y, z }` numbers.
- `run(plan)` returns `{ ok, entities, answers, violations, errors, trace }`; points live in `res.entities.points` (Map). On a thrown op it returns `{ ok: false, entities: <empty table>, errors: [{ message }], ... }` (so a rejected op leaves **no** point and a non-empty `errors`).
- `RunPlanSchema` requires `solidName` (min 1) and `ops` (**min 1**). `AnalysisPlanSchema` extends it but overrides `ops` to `.default([])`, so analyze fixtures need only `solidName` + `analyze`.
- `runAny(raw)`: `'analyze' in raw` → `runAnalysis`; else `run`.
- `AnalysisResult = { ok, parameter:{name,value}, answer:{approx,text,approximate}, violations, errors:[{message}], geometry? }`.
- `eval` plan: `{ analyze: { kind:'eval', of: { kind:'expr', expr } } }`; returns `answer: mkAnswer(val)`. `mkAnswer(val)`: `display = val * answerScale` (answerScale defaults to 1; may be a number or expr string), `text = num + (answerUnit ? ' '+answerUnit : '')`.
- `optimize_multi` / `solve_multi` constraints accept `{ kind:'expr', expr }` sources (via `evalQueryEnv` → `evalExpr`), so multivar tests can avoid geometry.
- `optimizeMulti` refines each coordinate with golden-section (to 1e-9) inside a ±(range/gridPerDim) window each round → **separable, grid-aligned** targets converge to ~1e-9 in one round, far under the `solve_multi` residual gate `RESID_TOL = 1e-4`. `solve_multi` calls it with the tight budget `(…, 12, 6, 2, deadline)`; `optimize_multi` uses the generous defaults `(…, 40, 60, 5)`.
- `solve_multi` runs a final `run({ solidName, ops: concreteOpsEnv(envBest), … })`; with no geometry ops that `run()` fails the `ops.min(1)` schema and pushes an error → `ok:false`. **Every successful `solve_multi` fixture therefore includes one harmless `oxyz_point` op.**
- Exact guard strings: `` `Invalid analysis plan: ${issue}` `` · `'analyze.eval chỉ nhận nguồn "expr" hoặc "solid_volume"'` · `'optimize_multi chỉ nhận objective dạng "expr"'` · `` `parameter "${missing}" chưa khai báo` `` · `` `không giải được (residual ${maxResid.toExponential(2)})` ``.

---

# Nhịp 1 — Engine + Battery (deployable on the build gate)

## Task 1: `iLineLine` exact intersection + `'line-line'` switch case

**Files:**
- Test: `api/_lib/kernel/compute/__tests__/intersect-line-line.test.ts` (create)
- Modify: `api/_lib/kernel/compute/intersect.ts` (add `iLineLine` above `computeIntersection`; add one `case` in the switch)

- [ ] **Step 1: Write the failing test**

Create `api/_lib/kernel/compute/__tests__/intersect-line-line.test.ts`:

```ts
// Giao ĐƯỜNG×ĐƯỜNG (exact): cắt (2D & 3D đồng phẳng) → point; song song → parallel; trùng → coincident;
// chéo (3D không đồng phẳng) → none. KHÔNG bao giờ bịa điểm cho 3 trường hợp suy biến.
import { describe, it, expect } from 'vitest';
import { computeIntersection } from '../intersect';
import { lineFromPointDir } from '../../entities';
import { ratVec, toApproxVec } from '../../vec3s';

describe('computeIntersection: đường×đường', () => {
  it('2D cắt nhau → point (1,1,0)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 1n, 0n));
    const l2 = lineFromPointDir(ratVec(2n, 0n, 0n), ratVec(-1n, 1n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('point');
      expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 1, y: 1, z: 0 });
    }
  });

  it('3D đồng phẳng cắt nhau → point (2,2,2)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 1n, 1n));
    const l2 = lineFromPointDir(ratVec(2n, 2n, 2n), ratVec(1n, -1n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('point');
      expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 2, y: 2, z: 2 });
    }
  });

  it('song song → parallel (không có point)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(0n, 1n, 0n), ratVec(2n, 0n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('parallel');
      expect(r.answer.point).toBeUndefined();
    }
  });

  it('trùng nhau → coincident (không có point)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(3n, 0n, 0n), ratVec(2n, 0n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('coincident');
      expect(r.answer.point).toBeUndefined();
    }
  });

  it('chéo nhau (3D) → none (không có point)', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(0n, 0n, 1n), ratVec(0n, 1n, 0n));
    const r = computeIntersection(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('none');
      expect(r.answer.point).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/intersect-line-line.test.ts`
Expected: FAIL — all 5 cases fail; `r.ok` is `false` with `problem: "intersection not supported for line-line"`.

- [ ] **Step 3: Add `iLineLine` above `computeIntersection`**

In `api/_lib/kernel/compute/intersect.ts`, insert this function immediately **before** the `export function computeIntersection` declaration (the imports it uses — `crossV, subV, dotV, lenSqV, addV, scaleV, div, isZeroS, pointFromCoords` — are already present):

```ts
// Đường×đường (exact): cross = dir1×dir2. |cross|²=0 ⇒ song song/trùng — phân biệt bằng (p2−p1)×dir1.
// Ngược lại xét đồng phẳng qua tích hỗn tạp (p2−p1)·cross: ≠0 ⇒ CHÉO (none); =0 ⇒ CẮT tại
// t = ((p2−p1)×dir2)·cross / |cross|², điểm = p1 + t·dir1. Toàn bộ trên số hữu tỉ exact.
function iLineLine(l1: LineE, l2: LineE): IntersectionAnswer {
  const cross = crossV(l1.dir, l2.dir);
  const w = subV(l2.p, l1.p); // p2 − p1
  if (isZeroS(lenSqV(cross))) {
    return isZeroS(lenSqV(crossV(w, l1.dir)))
      ? { kind: 'intersection', result: 'coincident' }
      : { kind: 'intersection', result: 'parallel' };
  }
  if (!isZeroS(dotV(w, cross))) return { kind: 'intersection', result: 'none' }; // chéo nhau (3D)
  const t = div(dotV(crossV(w, l2.dir), cross), lenSqV(cross));
  return { kind: 'intersection', result: 'point', point: pointFromCoords(addV(l1.p, scaleV(l1.dir, t))) };
}
```

- [ ] **Step 4: Add the `'line-line'` switch case**

In the same file, in `computeIntersection`'s `switch (key)`, add this case immediately **before** `default:`:

```ts
    case 'line-line': return { ok: true, answer: iLineLine(a as LineE, b as LineE) };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/intersect-line-line.test.ts`
Expected: PASS — 5/5.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/compute/intersect.ts api/_lib/kernel/compute/__tests__/intersect-line-line.test.ts
git commit -m "feat(kernel): iLineLine exact — giao đường×đường (point/parallel/coincident/none)"
```

---

## Task 2: `oxyz_intersect` degenerate Vietnamese messages (anti-hallucination)

**Why:** With Task 1 in place, `computeIntersection` on two parallel lines now returns `{ ok:true, result:'parallel' }` instead of `{ ok:false }`. The existing handler already refuses to fabricate a point (it throws on any non-`point` result), but the message is English and generic. This task makes it a clear Vietnamese, kind-specific rejection so the anti-hallucination refusal is legible to teachers.

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/oxyz-intersect-linexline.test.ts` (create)
- Modify: `api/_lib/kernel/dialects/oxyz.ts` (the `case 'oxyz_intersect'` block)

- [ ] **Step 1: Write the failing test**

Create `api/_lib/kernel/analysis/__tests__/oxyz-intersect-linexline.test.ts`:

```ts
// CHỐNG BỊA: oxyz_intersect trên đường×đường suy biến (song song/trùng/chéo) PHẢI báo lỗi, KHÔNG dựng
// điểm. run() bắt lỗi op → ok:false, errors có thông điệp tiếng Việt, và KHÔNG có điểm nào được đặt.
import { describe, it, expect } from 'vitest';
import { run } from '../../run';

function intersectTwoLines(
  d1: { base: [number, number, number]; dir: [number, number, number] },
  d2: { base: [number, number, number]; dir: [number, number, number] },
) {
  return run({
    solidName: 'll',
    ops: [
      { op: 'oxyz_line', name: 'd1', by: { form: 'point_dir', base: d1.base, dir: d1.dir } },
      { op: 'oxyz_line', name: 'd2', by: { form: 'point_dir', base: d2.base, dir: d2.dir } },
      { op: 'oxyz_intersect', name: 'X', a: 'd1', b: 'd2' },
    ],
  });
}

describe('oxyz_intersect đường×đường — chống bịa điểm', () => {
  it('cắt nhau → dựng ĐƯỢC điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 1, 0] },
      { base: [2, 0, 0], dir: [-1, 1, 0] },
    );
    expect(res.ok).toBe(true);
    expect(res.entities.points.has('X')).toBe(true);
  });

  it('song song → BÁO LỖI, không có điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 0, 0] },
      { base: [0, 1, 0], dir: [2, 0, 0] },
    );
    expect(res.ok).toBe(false);
    expect(res.entities.points.has('X')).toBe(false);
    expect(res.errors[0].message).toContain('song song');
  });

  it('trùng nhau → BÁO LỖI, không có điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 0, 0] },
      { base: [3, 0, 0], dir: [2, 0, 0] },
    );
    expect(res.ok).toBe(false);
    expect(res.entities.points.has('X')).toBe(false);
    expect(res.errors[0].message).toContain('trùng');
  });

  it('chéo nhau (3D) → BÁO LỖI, không có điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 0, 0] },
      { base: [0, 0, 1], dir: [0, 1, 0] },
    );
    expect(res.ok).toBe(false);
    expect(res.entities.points.has('X')).toBe(false);
    expect(res.errors[0].message).toContain('chéo');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/oxyz-intersect-linexline.test.ts`
Expected: FAIL — the 3 degenerate cases throw the old English message `"... is not a single point (parallel)"`, so `.toContain('song song')` / `'trùng'` / `'chéo'` fail. (The "cắt nhau" case already passes thanks to Task 1.)

- [ ] **Step 3: Replace the `oxyz_intersect` handler body**

In `api/_lib/kernel/dialects/oxyz.ts`, replace the entire existing block:

```ts
    case 'oxyz_intersect': {
      const r = computeIntersection(resolveEntityE(op.a, et), resolveEntityE(op.b, et));
      if (!r.ok) throw new Error(r.problem);
      const pt = r.answer.result === 'point' ? r.answer.point : r.answer.result === 'tangent-point' ? r.answer.point : null;
      if (!pt) throw new Error(`oxyz_intersect: ${op.a} ∩ ${op.b} is not a single point (${r.answer.result})`);
      setPointE(et, op.name, pt.p, true);
      break;
    }
```

with:

```ts
    case 'oxyz_intersect': {
      const r = computeIntersection(resolveEntityE(op.a, et), resolveEntityE(op.b, et));
      if (!r.ok) throw new Error(r.problem);
      const res = r.answer.result;
      if (res === 'point' || res === 'tangent-point') { setPointE(et, op.name, r.answer.point!.p, true); break; }
      const why = res === 'parallel' ? 'hai đối tượng song song — không có giao điểm'
        : res === 'coincident' ? 'hai đối tượng trùng nhau — vô số giao điểm, không xác định một điểm'
        : res === 'none' ? 'hai đối tượng không cắt nhau (chéo nhau) — không có giao điểm'
        : res === 'line' ? 'giao là một ĐƯỜNG (mặt×mặt) — dùng query intersection, không phải op oxyz_intersect'
        : `không phải một điểm (${res})`;
      throw new Error(`oxyz_intersect: ${op.a} ∩ ${op.b} — ${why}`);
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/oxyz-intersect-linexline.test.ts`
Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/dialects/oxyz.ts api/_lib/kernel/analysis/__tests__/oxyz-intersect-linexline.test.ts
git commit -m "feat(kernel): oxyz_intersect báo lỗi tiếng Việt cho đường×đường suy biến (chống bịa điểm)"
```

---

## Task 3: Battery — `runAny` router dispatch

**Note:** Tasks 3–8 are **characterization tests** — they pin behavior that already exists, so they PASS on first run. If any fails on Step 2, that is a genuine regression to surface, not a TDD "red" step. Run each, confirm green, commit.

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/analyze-router.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `api/_lib/kernel/analysis/__tests__/analyze-router.test.ts`:

```ts
// runAny là bộ định tuyến: plan có `analyze` → runAnalysis (AnalysisResult, có `answer`); ngược lại → run()
// (EngineResult, có `entities`). Pin để đổi router không âm thầm gãy.
import { describe, it, expect } from 'vitest';
import { runAny } from '../runAnalysis';

describe('runAny — định tuyến geometry vs analyze', () => {
  it('plan KHÔNG có analyze → run() (EngineResult có entities)', () => {
    const g = runAny({ solidName: 'r', ops: [{ op: 'oxyz_point', name: 'A', at: [1, 2, 3] }] });
    expect('entities' in g).toBe(true);
    if ('entities' in g) {
      expect(g.ok).toBe(true);
      expect(g.entities.points.has('A')).toBe(true);
    }
  });

  it('plan CÓ analyze → runAnalysis (AnalysisResult có answer)', () => {
    const a = runAny({ solidName: 'r', analyze: { kind: 'eval', of: { kind: 'expr', expr: '6' } } });
    expect('answer' in a).toBe(true);
    if ('answer' in a) {
      expect(a.ok).toBe(true);
      expect(a.answer.approx).toBe(6);
    }
  });
});
```

- [ ] **Step 2: Run to confirm green**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/analyze-router.test.ts`
Expected: PASS — 2/2.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/analyze-router.test.ts
git commit -m "test(kernel): battery — pin runAny router (geometry vs analyze)"
```

---

## Task 4: Battery — `answerScale` / `answerUnit` display layer

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/analyze-answer-scale.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `api/_lib/kernel/analysis/__tests__/analyze-answer-scale.test.ts`:

```ts
// answerScale (số hoặc biểu thức) nhân vào trị hiển thị; answerUnit gắn đuôi đơn vị. KHÔNG ảnh hưởng phép
// tính, chỉ khâu hiển thị cuối. Dùng kind:'eval' (đồng bộ, không hình học) để pin.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('answerScale / answerUnit (qua eval)', () => {
  it('answerScale số: 2000 × 0.001 = 2, gắn đơn vị "lít"', () => {
    const r = runAnalysis({
      solidName: 'sc',
      analyze: { kind: 'eval', of: { kind: 'expr', expr: '2000' } },
      answerScale: 0.001,
      answerUnit: 'lít',
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(2, 9);
    expect(r.answer.text).toContain('lít');
  });

  it('answerScale biểu thức chuỗi: 8 × (1/4) = 2', () => {
    const r = runAnalysis({
      solidName: 'sc',
      analyze: { kind: 'eval', of: { kind: 'expr', expr: '8' } },
      answerScale: '1/4',
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(2, 9);
  });

  it('không khai answerScale/answerUnit → trị trần, không đuôi đơn vị', () => {
    const r = runAnalysis({
      solidName: 'sc',
      analyze: { kind: 'eval', of: { kind: 'expr', expr: '7' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBe(7);
    expect(r.answer.text.trim()).toBe('7');
  });
});
```

- [ ] **Step 2: Run to confirm green**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/analyze-answer-scale.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/analyze-answer-scale.test.ts
git commit -m "test(kernel): battery — pin answerScale/answerUnit (display layer)"
```

---

## Task 5: Battery — exact guard messages

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/analyze-guards.test.ts` (create)

All five guards below return synchronously (before any optimizer runs), so this file is fast and deterministic.

- [ ] **Step 1: Write the test**

Create `api/_lib/kernel/analysis/__tests__/analyze-guards.test.ts`:

```ts
// Pin CHÍNH XÁC thông điệp các cổng chặn của nhánh analyze. Đổi lời nhắc = phải cập nhật test có chủ đích
// (không âm thầm nới lỏng). Mọi cổng ở đây trả về đồng bộ, không chạy optimizer.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('cổng chặn nhánh analyze — thông điệp chính xác', () => {
  it('schema hỏng (thiếu solidName) → "Invalid analysis plan:"', () => {
    const r = runAnalysis({ analyze: { kind: 'eval', of: { kind: 'expr', expr: '1' } } });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain('Invalid analysis plan:');
    expect(r.parameter.name).toBe('?');
  });

  it('eval nguồn không hợp lệ → "analyze.eval chỉ nhận nguồn ..."', () => {
    const r = runAnalysis({
      solidName: 'g',
      analyze: { kind: 'eval', of: { kind: 'distance', a: 'A', b: 'B' } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('analyze.eval chỉ nhận nguồn "expr" hoặc "solid_volume"');
  });

  it('optimize_multi objective không phải expr → "optimize_multi chỉ nhận objective dạng \\"expr\\""', () => {
    const r = runAnalysis({
      solidName: 'g',
      parameters: [{ name: 'a', domain: [0, 1] }, { name: 'b', domain: [0, 1] }],
      analyze: { kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min', objective: { kind: 'distance', a: 'A', b: 'B' } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('optimize_multi chỉ nhận objective dạng "expr"');
  });

  it('optimize_multi tham số chưa khai báo → "parameter \\"b\\" chưa khai báo"', () => {
    const r = runAnalysis({
      solidName: 'g',
      parameters: [{ name: 'a', domain: [0, 1] }],
      analyze: { kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min', objective: { kind: 'expr', expr: 'a+b' } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('parameter "b" chưa khai báo');
  });

  it('solve_multi tham số chưa khai báo → "parameter \\"b\\" chưa khai báo"', () => {
    const r = runAnalysis({
      solidName: 'g',
      parameters: [{ name: 'a', domain: [0, 1] }],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b'],
        constraints: [{ of: { kind: 'expr', expr: 'a+b' }, equals: 1 }],
        report: { kind: 'expr', expr: 'a+b' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('parameter "b" chưa khai báo');
  });
});
```

- [ ] **Step 2: Run to confirm green**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/analyze-guards.test.ts`
Expected: PASS — 5/5.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/analyze-guards.test.ts
git commit -m "test(kernel): battery — pin thông điệp cổng chặn analyze (schema/eval/multi)"
```

---

## Task 6: Battery — ≥3-var `optimize_multi` & `solve_multi`

**Why:** Existing multi-var coverage is all 2-var. This pins the N-dim (N=3) code paths: a successful `optimize_multi`, a successful `solve_multi` (separable + grid-aligned so it converges far under the `1e-4` gate), and the `solve_multi` residual-gate **rejection** (anti-hallucination on an unsatisfiable system).

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/analyze-multivar.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `api/_lib/kernel/analysis/__tests__/analyze-multivar.test.ts`:

```ts
// Đường N-ẩn (N=3): optimize_multi tối thiểu hoá (a−1)²+(b−2)²+(c−3)² → 0; solve_multi tách biến a=3,b=5,c=7
// (đích trùng nút lưới ⇒ golden-section hội tụ ~1e-9 < gate 1e-4) → report a+b+c=15; và hệ VÔ NGHIỆM ⇒
// cổng residual TỪ CHỐI. Ràng buộc dạng expr (không hình học) để nhanh & tất định.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('analyze nhiều biến (N=3)', () => {
  it('optimize_multi 3 ẩn: min (a−1)²+(b−2)²+(c−3)² ≈ 0', () => {
    const r = runAnalysis({
      solidName: 'om3',
      parameters: [
        { name: 'a', domain: [0, 5] },
        { name: 'b', domain: [0, 5] },
        { name: 'c', domain: [0, 5] },
      ],
      analyze: {
        kind: 'optimize_multi', parameters: ['a', 'b', 'c'], sense: 'min',
        objective: { kind: 'expr', expr: '(a-1)^2 + (b-2)^2 + (c-3)^2' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(0, 3);
  });

  it('solve_multi 3 ẩn tách biến (a=3,b=5,c=7) → report a+b+c=15', () => {
    const r = runAnalysis({
      solidName: 'sm3',
      ops: [{ op: 'oxyz_point', name: 'A', at: [0, 0, 0] }], // 1 op vô hại: run() cuối cần ops≥1
      parameters: [
        { name: 'a', domain: [0, 12] },
        { name: 'b', domain: [0, 12] },
        { name: 'c', domain: [0, 12] },
      ],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b', 'c'],
        constraints: [
          { of: { kind: 'expr', expr: 'a' }, equals: 3 },
          { of: { kind: 'expr', expr: 'b' }, equals: 5 },
          { of: { kind: 'expr', expr: 'c' }, equals: 7 },
        ],
        report: { kind: 'expr', expr: 'a+b+c' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(15, 3);
  });

  it('solve_multi 3 ẩn VÔ NGHIỆM → cổng residual từ chối', () => {
    const r = runAnalysis({
      solidName: 'sm3x',
      ops: [{ op: 'oxyz_point', name: 'A', at: [0, 0, 0] }],
      parameters: [
        { name: 'a', domain: [0, 12] },
        { name: 'b', domain: [0, 12] },
        { name: 'c', domain: [0, 12] },
      ],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b', 'c'],
        constraints: [
          { of: { kind: 'expr', expr: 'a' }, equals: 3 },
          { of: { kind: 'expr', expr: 'b' }, equals: 5 },
          { of: { kind: 'expr', expr: 'a+b' }, equals: 100 },
        ],
        report: { kind: 'expr', expr: 'a+b+c' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain('không giải được (residual');
  });
});
```

- [ ] **Step 2: Run to confirm green**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/analyze-multivar.test.ts`
Expected: PASS — 3/3. (If the middle case flakes on `ok`, the separable/grid-aligned choice is what guarantees convergence — do not loosen the assertion; investigate `optimizeMulti`.)

- [ ] **Step 3: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/analyze-multivar.test.ts
git commit -m "test(kernel): battery — pin optimize_multi/solve_multi 3-ẩn + cổng residual"
```

---

## Task 7: Battery — mover injection + single-param `solve`

**Why:** mover+`optimize` is already covered; the gap is mover+`solve`. The mover auto-injects an `oxyz_ratio` op for `M(t)=from+t·(to−from)` whenever `'parameter' in plan.analyze`, which is true for `solve`.

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/analyze-mover-solve.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `api/_lib/kernel/analysis/__tests__/analyze-mover-solve.test.ts`:

```ts
// Vật chuyển động M(t)=A+t·(B−A). Engine tự tiêm oxyz_ratio M (không bắt LLM tính toạ độ). solve tìm t sao
// cho dist(M,A)=4: với A(0,0,0), B(10,0,0) ⇒ M=(10t,0,0), 10t=4 ⇒ t=0.4, report dist(M,A)=4.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('mover + solve (đơn tham số)', () => {
  it('giải t để dist(M,A)=4 trên đoạn A→B(10,0,0) → report 4', () => {
    const r = runAnalysis({
      solidName: 'mv',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [10, 0, 0] },
      ],
      parameters: [{ name: 't', domain: [0, 1] }],
      mover: { point: 'M', from: 'A', to: 'B' },
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'M', b: 'A' }, equals: 4 },
        report: { kind: 'distance', a: 'M', b: 'A' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(4, 3);
  });
});
```

- [ ] **Step 2: Run to confirm green**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/analyze-mover-solve.test.ts`
Expected: PASS — 1/1.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/analyze-mover-solve.test.ts
git commit -m "test(kernel): battery — pin mover + solve (đơn tham số)"
```

---

## Task 8: Battery — `fitPoly` degree 1 and degree 4

**Why:** Existing `polyfit.test.ts` covers degrees 2 and 3. This pins the boundary (linear) and a higher degree. Assertions go through `evalPoly` so they are independent of the coefficient ordering convention.

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/analyze-polyfit-degrees.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `api/_lib/kernel/analysis/__tests__/analyze-polyfit-degrees.test.ts`:

```ts
// fitPoly khớp đa thức qua các điểm (Vandermonde). Bậc 1 (đường thẳng qua 2 điểm) và bậc 4 (qua 5 điểm).
// Kiểm bằng evalPoly để không phụ thuộc thứ tự hệ số. leading để trống ⇒ cần degree+1 ràng buộc.
import { describe, it, expect } from 'vitest';
import { fitPoly, evalPoly } from '../polyfit';

describe('fitPoly — bậc 1 và bậc 4', () => {
  it('bậc 1 qua (0,1),(2,5) → đường 1+2x', () => {
    const c = fitPoly(1, [[0, 1], [2, 5]]);
    expect(evalPoly(c, 0)).toBeCloseTo(1, 9);
    expect(evalPoly(c, 2)).toBeCloseTo(5, 9);
    expect(evalPoly(c, 1)).toBeCloseTo(3, 9); // nội suy giữa
  });

  it('bậc 4 qua (i, i^4) i=0..4 → khớp x^4', () => {
    const c = fitPoly(4, [[0, 0], [1, 1], [2, 16], [3, 81], [4, 256]]);
    expect(evalPoly(c, 2)).toBeCloseTo(16, 6);   // điểm đã khớp
    expect(evalPoly(c, 4)).toBeCloseTo(256, 4);  // điểm đã khớp
    expect(evalPoly(c, 2.5)).toBeCloseTo(39.0625, 3); // 2.5^4, nội suy duy nhất
  });
});
```

- [ ] **Step 2: Run to confirm green**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/analyze-polyfit-degrees.test.ts`
Expected: PASS — 2/2.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/analyze-polyfit-degrees.test.ts
git commit -m "test(kernel): battery — pin fitPoly bậc 1 và bậc 4"
```

---

## Nhịp 1 Gate — full suite + build, then push

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS — all prior tests plus the 8 new files green (≈491 baseline + new cases). Zero failures.

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: exit 0 (`build:kernel` then `vite build` both succeed).

- [ ] **Step 3: Push (auto-deploy)**

Only if Steps 1–2 both pass:

```bash
git push origin claude/kinematic:main
```

(Per the deploy rule: push to `origin/main` = auto-deploy via Vercel; build must pass first. Confirm the current branch upstream before pushing.)

---

# Nhịp 2 — Translator prompt unlock (gated by the live translator gate)

## Task 9: Remove the "đường×đường không hỗ trợ" contradiction in `translatorPrompt.js`

**Gate:** Do NOT execute this task until Nhịp 1 is deployed AND the live 50-case translator gate passes (needs `VILAO_API_KEY`; standard: 15/15 hard gate, 0 wrong answers). The op description at line 94 already permits `đường-đường`; these two edits remove the sentences that contradict it.

**Files:**
- Modify: `api/_lib/kernel-bridge/translatorPrompt.js` (two edits)

- [ ] **Step 1: Edit 1 — the intersection-support note**

Find:

```
  MẶT×MẶT trả {result:"line", line:{p,dir}} (đáp giao tuyến LÀ ĐƯỜNG). KHÔNG hỗ trợ đường×đường.
```

Replace with:

```
  MẶT×MẶT trả {result:"line", line:{p,dir}} (đáp giao tuyến LÀ ĐƯỜNG). ĐƯỜNG×ĐƯỜNG trả {result:"point"} nếu cắt; nếu song song/trùng/chéo, engine BÁO LỖI (từ chối bài, KHÔNG bịa điểm).
```

- [ ] **Step 2: Edit 2 — the `oxyz_intersect` capability line**

Find (two consecutive lines):

```
  · oxyz_intersect{ name, a, b } — giao 2 đối tượng → 1 ĐIỂM. CHỈ ra điểm khi giao ĐƯỜNG × MẶT.
    (mặt×mặt ra ĐƯỜNG, đường×đường không hỗ trợ ⇒ KHÔNG dùng oxyz_intersect cho chúng.)
```

Replace with:

```
  · oxyz_intersect{ name, a, b } — giao 2 đối tượng → 1 ĐIỂM khi giao ĐƯỜNG×MẶT hoặc ĐƯỜNG×ĐƯỜNG (nếu cắt nhau).
    (mặt×mặt ra ĐƯỜNG ⇒ dùng QUERY intersection, KHÔNG dùng op. Đường×đường song song/trùng/chéo ⇒ engine báo lỗi.)
```

- [ ] **Step 3: Offline contract check + full suite**

Run: `npm test`
Expected: PASS — the offline translator contract test and all others stay green (prompt edits don't change the schema; the đường×đường JSON shape already validates).

- [ ] **Step 4: Live translator gate (manual/ops)**

Run the live 50-case translator gate (needs `VILAO_API_KEY` in `.env.local`). Include a few đường×đường problems (a solvable intersecting pair + one parallel pair that must be refused). Proceed only on 15/15 hard gate and 0 wrong answers. If the gate regresses, revert this task's two edits — do NOT weaken the gate.

- [ ] **Step 5: Commit + push**

Only after the live gate passes:

```bash
git add api/_lib/kernel-bridge/translatorPrompt.js
git commit -m "feat(translator): mở khoá giao đường×đường (oxyz_intersect) — bỏ câu 'không hỗ trợ' mâu thuẫn"
git push origin claude/kinematic:main
```

---

## YAGNI / Out of scope

- **No `IntersectionAnswer` type change** — the result union already covers `point/parallel/coincident/none`.
- **No new op** — `oxyz_intersect` already accepts two lines; only its handler messaging changes.
- **No live-model battery** — the battery is deterministic Vitest only (the live gate stays a separate, manual step for Task 9).
- **No refactor** of `intersect.ts`/`runAnalysis.ts` beyond the additive changes above.

## Risks

- **`solve_multi` 3-var convergence (Task 6):** mitigated by choosing separable, grid-aligned targets (a=3,b=5,c=7 on domain [0,12], grid 12 → integer nodes) so golden-section nails each coordinate in round 1, ~1e-9 ≪ 1e-4 gate. Do not substitute a coupled system — it converges near the gate boundary and flakes.
- **`solve_multi` final `run()` needs ops≥1:** every successful `solve_multi` fixture carries one `oxyz_point` op; without it `run()` fails the `ops.min(1)` schema and forces `ok:false`.
- **Prompt gate risk (Task 9):** kept to two surgical edits (no new VÍ DỤ block) to minimize the chance of regressing the 50-case gate.

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-23-analyze-battery-linexline-design.md`): Đơn vị 1 iLineLine → Task 1; Đơn vị 2 oxyz safe degenerate → Task 2; Đơn vị 3 translator unlock → Task 9; Battery (7 areas: router, answer-scale, guards, multivar, mover+solve, polyfit degrees, line×line) → Tasks 1,3,4,5,6,7,8. 2-phase deploy split → Nhịp 1 gate + Nhịp 2 gate. ✅ All covered.

**Placeholder scan:** No TBD/TODO; every test and every impl edit shows complete code; every command has an expected result. ✅

**Type consistency:** `iLineLine(l1: LineE, l2: LineE): IntersectionAnswer` returns bare answers wrapped by the switch as `{ ok:true, answer: iLineLine(...) }`, matching the existing `iLinePlane`/`iPlanePlane` pattern. `LineE.p`/`.dir`, `pointFromCoords`, `toApproxVec`, `run().entities.points`, `runAnalysis().answer.approx`, `runAny` union narrowing via `'entities' in g` / `'answer' in a`, and all guard strings match the verbatim source. ✅
