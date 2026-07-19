# Bộ giải đa-ràng-buộc `solve_multi` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Engine giải hệ N-ẩn M-ràng-buộc hình học (đáp vô hướng) bằng least-squares residual, tái dùng `optimizeMulti`. Chỉ serve khi residual≈0 + assert đạt (không serve-sai).

**Architecture:** Thêm analyze kind `solve_multi` ở lớp analysis. Mở `concreteOps`/`evalQuery` từ 1-biến lên **env nhiều-biến**. objective = Σ(query−target)² → optimizeMulti → kiểm residual → verify assert → report. KHÔNG đụng `run()`/core.

**Tech Stack:** TS (`api/_lib/kernel/analysis/runAnalysis.ts`), Zod, Vitest; prompt `translatorPrompt.js`. Spec: `docs/superpowers/specs/2026-07-19-solve-multi-constraint-design.md`.

**Nhánh:** `claude/solve-multi` (off main). Rebuild kernel-dist sau khi đổi .ts. HỎI trước khi gộp main.

---

## Bối cảnh cho người thực thi (đọc trước — `runAnalysis.ts`)

- `runAnalysis(raw)` phân nhánh theo `plan.analyze.kind`: `integrate`/`eval`/`optimize_multi` (đa biến, objective=expr) ở đầu; rồi phần 1-BIẾN (`optimize`/`solve`) dùng `pname` + helper `concreteOps(value)`, `evalQuery(value,src)`, `finalize(value,src)`.
- `concreteOps(value)` (dòng ~250) dựng `env={[pname]:value}` rồi hạ op hàm→hình học + `numify(c, env, paramNames)`. `evalQuery(value,src)` (~298) dựng env rồi eval expr/solid_volume/truy-vấn-qua-run. **Thân đã env-based — chỉ dựng env từ 1 biến.**
- `optimize_multi` (~217): dựng `env` từ `xs[]`, objective = `evalExpr(src.expr, env, fitAt(env).funcs)`, `optimizeMulti(objective, los, his, sense)`, `mkAnswer(best.value)`, geometry qua `buildAnalysisFigure(...)`.
- Có sẵn: `fitAt(env)`, `solidVolumeAt(env,src)`, `isExprSrc`, `isSolidVolSrc`, `scalarOf`, `run`, `entityTableToGeometryData`, `buildAnalysisFigure`+`buildFigureInput`, `mkAnswer`, `evalExpr`, `optimizeMulti`, `numify`, `paramNames`, `type Env`.
- Chạy 1 file test: `npx vitest run <path>`. Rebuild bundle: `npm run build:kernel`.

---

## Task 1: Mở `concreteOps`/`evalQuery` lên env NHIỀU BIẾN (refactor thuần)

Tách thân env-based ra hàm `*Env(env)` dùng chung; bản 1-biến thành wrapper. KHÔNG đổi hành vi.

**Files:** Modify `api/_lib/kernel/analysis/runAnalysis.ts`

- [ ] **Step 1: Thêm `concreteOpsEnv(env)` + `evalQueryEnv(env,src)` ở scope SỚM** (ngay sau `solidVolumeAt`, trước nhánh `integrate` ~dòng 158) — copy y nguyên thân `concreteOps`/`evalQuery` hiện tại nhưng nhận `env` thay vì dựng từ `value`:

```ts
// Hạ op (hàm→hình học) + thay THAM SỐ (điểm/coeffs/ratio.t…) từ env NHIỀU BIẾN. Dùng cho cả 1-biến lẫn đa-biến.
const concreteOpsEnv = (env: Env): unknown[] => {
  const fitted = fitAt(env).coeffs;
  const needFn = (name: string): number[] => {
    const c = fitted[name]; if (!c) throw new Error(`Hàm "${name}" chưa khai báo trong functions`); return c;
  };
  return plan.ops.map((op) => {
    const o = op as Record<string, unknown>;
    if (o.op === 'curve_point') { const c = needFn(o.f as string); const x = evalExpr(String(o.x), env); return { op: 'oxyz_point', name: o.name, at: [x, evalPoly(c, x), 0] }; }
    if (o.op === 'tangent_line') { const c = needFn(o.f as string); const x = evalExpr(String(o.x), env); const slope = evalPoly(derivPoly(c), x); return { op: 'oxyz_line', name: o.name, by: { form: 'point_dir', base: [x, evalPoly(c, x), 0], dir: [1, slope, 0] } }; }
    if (o.op === 'curve_extremum') { const c = needFn(o.f as string); const dom = o.domain as [number | string, number | string]; const ex = extremumOfPoly(c, evalExpr(String(dom[0]), env), evalExpr(String(dom[1]), env)); if (!ex) throw new Error(`curve_extremum: hàm "${o.f as string}" không có cực trị trong miền`); return { op: 'oxyz_point', name: o.name, at: [ex.x, ex.y, 0] }; }
    if (o.op === 'oxyz_point' && Array.isArray(o.at)) return { ...o, at: (o.at as (number | string)[]).map((c) => numify(c, env, paramNames)) };
    if (o.op === 'oxyz_circumsphere_offset') return { ...o, t: numify(o.t as number | string, env, paramNames) };
    if (o.op === 'oxyz_plane' && (o.by as { form?: string })?.form === 'coeffs') { const by = o.by as { form: 'coeffs'; a: number|string; b: number|string; c: number|string; d: number|string }; return { ...o, by: { ...by, a: numify(by.a, env, paramNames), b: numify(by.b, env, paramNames), c: numify(by.c, env, paramNames), d: numify(by.d, env, paramNames) } }; }
    if (o.op === 'oxyz_ratio') return { ...o, t: numify(o.t as number | string, env, paramNames) };
    return op;
  });
};
// Đánh giá nguồn số tại env NHIỀU BIẾN (không kèm asserts). null nếu lỗi.
const evalQueryEnv = (env: Env, src: unknown): number | null => {
  if (isExprSrc(src)) { try { return evalExpr(src.expr, env, fitAt(env).funcs); } catch { return null; } }
  if (isSolidVolSrc(src)) { try { return solidVolumeAt(env, src); } catch { return null; } }
  let ops: unknown[]; try { ops = concreteOpsEnv(env); } catch { return null; }
  const res = run({ solidName: plan.solidName, ops, asserts: [], queries: [src] });
  if (!res.ok || res.answers.length === 0) return null;
  try { return scalarOf(res.answers[0]); } catch { return null; }
};
```

- [ ] **Step 2: Đổi bản 1-biến thành WRAPPER** — trong phần 1-biến (sau `const pname = ...`), thay định nghĩa cũ:

```ts
const concreteOps = (value: number): unknown[] => concreteOpsEnv({ [pname]: value });
const evalQuery = (value: number, src: unknown): number | null => evalQueryEnv({ [pname]: value }, src);
```
(Xoá 2 thân dài cũ. `finalize` giữ nguyên — vẫn gọi `concreteOps(value)`.)

- [ ] **Step 3: Không hồi quy** — `npx vitest run` → TẤT CẢ xanh (refactor thuần, hành vi 1-biến không đổi). Đặc biệt các test `optimize`/`solve`/`runAnalysis` phải y nguyên.

- [ ] **Step 4: Commit** — `refactor(analysis): concreteOpsEnv/evalQueryEnv (env nhieu bien), 1-bien thanh wrapper`

---

## Task 2: Kind `solve_multi` + bộ giải least-squares (schema + nhánh + gate + report)

**Files:** Modify `runAnalysis.ts`; Test `api/_lib/kernel/analysis/__tests__/solve-multi.test.ts`

- [ ] **Step 1: Thêm `solve_multi` vào `AnalyzeSchema`** (union, cạnh `optimize_multi`):

```ts
z.object({
  kind: z.literal('solve_multi'),
  parameters: z.array(z.string()).min(2),
  constraints: z.array(z.object({ of: ScalarSource, equals: NumOrExpr })).min(1),
  report: ScalarSource,
}),
```

- [ ] **Step 2: Test hand-plan (đỏ trước)** — hệ 2-ẩn-2-ràng-buộc có nghiệm biết trước.

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

// Điểm P=(a,b,0). Ràng buộc: dist(O,P)=5 và dist(A,P)=5 với O(0,0,0), A(6,0,0).
// Nghiệm: a=3, b=±4 (P cách đều O,A và cách 5). report a+b → 7 (nhánh b=4).
it('solve_multi: 2 rang buoc dist -> giai dung, residual~0', () => {
  const r = runAnalysis({
    solidName: 'sm', parameters: [{ name: 'a', domain: [0, 6] }, { name: 'b', domain: [0, 6] }],
    ops: [
      { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'A', at: [6, 0, 0] },
      { op: 'oxyz_point', name: 'P', at: ['a', 'b', 0] },
    ],
    analyze: {
      kind: 'solve_multi', parameters: ['a', 'b'],
      constraints: [
        { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 5 },
        { of: { kind: 'distance', a: 'A', b: 'P' }, equals: 5 },
      ],
      report: { kind: 'expr', expr: 'a+b' },
    },
  });
  expect(r.ok).toBe(true);
  expect(r.answer.approx).toBeCloseTo(7, 3);   // a=3,b=4 → 7
});

// Vô nghiệm (ràng buộc mâu thuẫn) → ok=false (residual gate chặn serve-sai).
it('solve_multi: vo nghiem -> ok=false (khong serve-sai)', () => {
  const r = runAnalysis({
    solidName: 'sm', parameters: [{ name: 'a', domain: [0, 1] }, { name: 'b', domain: [0, 1] }],
    ops: [{ op: 'oxyz_point', name: 'O', at: [0, 0, 0] }, { op: 'oxyz_point', name: 'P', at: ['a', 'b', 0] }],
    analyze: { kind: 'solve_multi', parameters: ['a', 'b'],
      constraints: [ { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 100 } ],  // không đạt trong miền [0,1]²
      report: { kind: 'expr', expr: 'a+b' } },
  });
  expect(r.ok).toBe(false);
});
```

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/solve-multi.test.ts` → FAIL (chưa có nhánh).

- [ ] **Step 3: Viết nhánh `solve_multi`** (đặt NGAY SAU nhánh `optimize_multi`, ~dòng 241):

```ts
if (plan.analyze.kind === 'solve_multi') {
  const az = plan.analyze;
  const decls = az.parameters.map((nm) => plan.parameters.find((p) => p.name === nm));
  const missing = az.parameters.find((nm, i) => !decls[i]);
  if (missing) return fail(az.parameters.join(','), `parameter "${missing}" chưa khai báo`);
  try {
    const los = decls.map((d) => evalExpr(String(d!.domain[0]), {}));
    const his = decls.map((d) => evalExpr(String(d!.domain[1]), {}));
    const envOf = (xs: number[]): Env => { const env: Env = {}; az.parameters.forEach((nm, i) => { env[nm] = xs[i]; }); return env; };
    const residOf = (env: Env, c: { of: unknown; equals: number | string }): number | null => {
      const q = evalQueryEnv(env, c.of);
      if (q === null || !Number.isFinite(q)) return null;
      return q - evalExpr(String(c.equals), env);
    };
    const objective = (xs: number[]): number => {
      const env = envOf(xs); let sum = 0;
      for (const c of az.constraints) { const r = residOf(env, c); if (r === null) return Number.POSITIVE_INFINITY; sum += r * r; }
      return sum;
    };
    const best = optimizeMulti(objective, los, his, 'min');
    const envBest = envOf(best.xs);
    // GATE residual: chỉ serve khi THẬT SỰ giải được
    const RESID_TOL = 1e-4;
    let maxResid = 0;
    for (const c of az.constraints) { const r = residOf(envBest, c); if (r === null) return fail(az.parameters.join(','), 'ràng buộc không đánh giá được tại nghiệm'); maxResid = Math.max(maxResid, Math.abs(r)); }
    if (maxResid > RESID_TOL) return fail(az.parameters.join(','), `không giải được (residual ${maxResid.toExponential(2)})`);
    // verify assert + geometry tại nghiệm
    let violations: unknown[] = [], errors: { message: string }[] = [], geometry: unknown = null;
    try {
      const res = run({ solidName: plan.solidName, ops: concreteOpsEnv(envBest), asserts: plan.asserts, queries: [] });
      violations = res.violations; errors = res.errors.map((e) => ({ message: e.message }));
      if (res.entities.points.size > 0) geometry = entityTableToGeometryData(res.entities, plan.solidName || 'figure');
    } catch (e) { errors = [{ message: (e as Error).message }]; }
    const rep = evalQueryEnv(envBest, az.report);
    const val = rep === null ? NaN : rep;
    return {
      ok: violations.length === 0 && errors.length === 0 && Number.isFinite(val),
      parameter: { name: az.parameters.join(','), value: NaN },
      answer: mkAnswer(val), violations, errors,
      geometry: geometry ?? buildAnalysisFigure(az.parameters.join(','), buildFigureInput(envBest)),
    };
  } catch (e) { return fail(az.parameters.join(','), (e as Error).message); }
}
```

- [ ] **Step 4: Test xanh** — `npx vitest run .../solve-multi.test.ts` → PASS (giải đúng 7; vô nghiệm → ok=false).

- [ ] **Step 5: Thêm test ASSERT-VI-PHẠM → ok=false** (chống serve-sai khi mô hình sai): thêm `asserts:[{relation:'dist',args:['O','P'],value:99}]` (sai tại nghiệm) vào plan giải-được → `expect(r.ok).toBe(false)` và `r.violations.length>0`.

- [ ] **Step 6: Không hồi quy toàn suite** — `npx vitest run` → tất cả xanh (optimize_multi cũ không đổi).

- [ ] **Step 7: Commit** — `feat(analysis): solve_multi - giai N-an M-rang-buoc hinh hoc (least-squares + gate residual + assert)`

---

## Task 3: Few-shot `solve_multi` + đo end-to-end + rebuild + không hồi quy

**Files:** Modify `api/_lib/kernel-bridge/translatorPrompt.js`; Create `scripts/measure-solve-multi.mjs`

- [ ] **Step 1: Thêm ví dụ few-shot `solve_multi`** (dạng Câu 4: đường Δ qua A(1,2,3) chỉ phương (a,b,1), cắt d1 & d2 → tính a+b). Ràng buộc: "khoảng cách Δ đến d1 = 0" và "… d2 = 0" (hoặc điểm-giao thuộc cả hai). report `{kind:'expr',expr:'a+b'}`. Nhắc: đáp phải VÔ HƯỚNG; nếu đề hỏi điểm/vectơ/pt thì KHÔNG mô hình (rơi về). Dùng plan đã kiểm chạy được (chạy thử trước khi chốt vào prompt, như Task 3 của plan Oxyz trước).

- [ ] **Step 2: node --check + rebuild** — `node --check api/_lib/kernel-bridge/translatorPrompt.js`; `npm run build:kernel`.

- [ ] **Step 3: Script đo e2e** — nạp `.env.local`, chạy Câu 2 (b+c) + Câu 4 (a+b) (chép sạch từ ảnh PDF) qua `planFromProblem`+`solvePlan`, 2 lần; in serve/đáp/assert; so đáp án PDF. Ghi Findings.

- [ ] **Step 4: Đối chiếu tiêu chí** — Câu 2, Câu 4 serve đúng (khớp 1 phương án PDF), mỗi câu `plan.asserts.length>0`; không serve-sai. Nếu 1 bài kẹt cực-tiểu → ghi nhận (phủ thiếu, không sai).

- [ ] **Step 5: Không hồi quy** — `npx vitest run` xanh; 10 benchmark cũ không đổi.

- [ ] **Step 6: Commit** — `feat(prompt): few-shot solve_multi + do e2e Cau2/Cau4`

---

## Kiểm cuối + gộp
- [ ] Toàn suite xanh; kernel-dist rebuild & commit; các nhánh analyze cũ không đổi.
- [ ] Cập nhật memory (solve_multi + độ phủ mới).
- [ ] **HỎI trước khi gộp main** (auto-deploy). Verify prod: draw khoẻ + 1 bài solve_multi serve đúng.

## Findings
*(Điền khi thực thi: Câu 2/Câu 4 serve/đáp/đúng-sai; bài nào kẹt cực tiểu.)*
