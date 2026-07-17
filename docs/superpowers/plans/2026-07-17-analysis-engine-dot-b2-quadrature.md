# Đợt B2 — Tích phân số + biểu thức gọi hàm → Câu 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho biểu thức **gọi được hàm đã khai báo** (`2*f(z)^2`), thêm **tích phân số tự-kiểm hội tụ**, và cho mục tiêu/điều kiện nhận **biểu thức** (không chỉ truy vấn hình học). Đích: **Câu 4 (đèn lồng)** chạy trọn — a) 392 cm², c) 12,95 lít, d) 2,866 cm.

**Architecture:** Vẫn KHÔNG sửa `run()`. `expr.ts` nhận thêm map `funcs` (hàm người dùng) lúc tính. `quadrature.ts` là module số thuần. `runAnalysis` khớp hàm → bind vào `funcs` → mục tiêu/điều kiện có thể là `{kind:'expr'}` (tính thẳng, không cần hình học) hoặc truy vấn hình học (chạy `run()` như cũ); thêm kiểu `analyze: integrate`. Chống ảo giác: LLM khai báo hàm + biểu thức mô hình; engine khớp/đạo hàm/tích phân/tối ưu + tự kiểm hội tụ.

**Tech Stack:** TypeScript, Zod, Vitest, esbuild. Dựa trên Đợt A + B1 (`expr`, `paramsolve`, `polyfit`, `recognize`, `runAnalysis`).

---

## File Structure

- **Sửa:** `api/_lib/kernel/analysis/expr.ts` — closure nhận `(env, funcs)`; hàm lạ tra `funcs` lúc tính.
- **Tạo:** `api/_lib/kernel/analysis/quadrature.ts` — `integrate` (Simpson kép + ước lượng sai số Richardson).
- **Sửa:** `api/_lib/kernel/analysis/runAnalysis.ts` — `ScalarSource` (query | expr), kiểu `analyze: integrate`, nới `ops`/`parameters`, bind hàm đã khớp.
- **Sửa:** `api/_lib/kernel-bridge/translatorPrompt.js` — dạy LLM `expr`/`integrate`.
- **Tạo test:** `analysis/__tests__/quadrature.test.ts`, `analysis/__tests__/cau4-contract.test.ts`; bổ sung `expr.test.ts`.

---

## Task 1: `expr.ts` — biểu thức gọi được hàm người dùng

**Files:** Modify `api/_lib/kernel/analysis/expr.ts` · Test `api/_lib/kernel/analysis/__tests__/expr.test.ts`

- [ ] **Step 1: Test đỏ** — THÊM vào cuối `describe('evalExpr', ...)` trong `expr.test.ts`:

```ts
  it('gọi hàm do người dùng truyền vào', () => {
    const f = (x: number) => -0.01 * x * x + 0.4 * x + 10;
    expect(evalExpr('2*f(z)^2', { z: 20 }, { f })).toBeCloseTo(392, 9);
    expect(evalExpr('f(0)+f(40)', {}, { f })).toBeCloseTo(20, 9);
    expect(evalExpr('sqrt(f(20))', {}, { f })).toBeCloseTo(Math.sqrt(14), 9);
  });
  it('hàm chưa khai báo → ném', () => {
    expect(() => evalExpr('g(1)')).toThrow();
  });
```

- [ ] **Step 2: Chạy — ĐỎ**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/expr.test.ts`
Expected: FAIL — `evalExpr` chưa nhận tham số thứ 3 / ném `Hàm lạ: f` lúc PARSE.

- [ ] **Step 3: Cài đặt** — thay TOÀN BỘ `api/_lib/kernel/analysis/expr.ts` bằng:

```ts
// api/_lib/kernel/analysis/expr.ts
// Parser + evaluator biểu thức 1 dòng cho engine giải tích: số, biến, + - * / ^ (^ phải-kết-hợp),
// đơn nguyên (LỎNG hơn ^), ngoặc, hàm dựng sẵn sin/cos/tan/sqrt/abs, hằng pi/e, VÀ hàm do người
// dùng khai báo (vd f(z)) truyền qua `funcs` lúc TÍNH (tên hàm chỉ được kiểm khi tính, không khi parse).
export type Env = Record<string, number>;
export type Funcs = Record<string, (x: number) => number>;
type Node = (env: Env, funcs: Funcs) => number;
type Tok = { t: 'num' | 'name' | 'op' | '(' | ')'; v: string };

function tokenize(s: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
      toks.push({ t: 'num', v: s.slice(i, j) }); i = j; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i; while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      toks.push({ t: 'name', v: s.slice(i, j) }); i = j; continue;
    }
    if ('+-*/^'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { toks.push({ t: '(', v: c }); i++; continue; }
    if (c === ')') { toks.push({ t: ')', v: c }); i++; continue; }
    throw new Error(`Ký tự lạ trong biểu thức: '${c}'`);
  }
  return toks;
}

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export function parseExpr(src: string): (env?: Env, funcs?: Funcs) => number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];

  function parseE(): Node { // E := T (('+'|'-') T)*
    let left = parseT();
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v; const right = parseT(); const l = left;
      left = (env, fs) => (op === '+' ? l(env, fs) + right(env, fs) : l(env, fs) - right(env, fs));
    }
    return left;
  }
  function parseT(): Node { // T := U (('*'|'/') U)*
    let left = parseU();
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = eat().v; const right = parseU(); const l = left;
      left = (env, fs) => (op === '*' ? l(env, fs) * right(env, fs) : l(env, fs) / right(env, fs));
    }
    return left;
  }
  function parseU(): Node { // U := ('-'|'+') U | F — đơn nguyên LỎNG hơn ^ (nên -2^2 = -(2^2))
    const tk = peek();
    if (tk && tk.t === 'op' && tk.v === '-') { eat(); const u = parseU(); return (env, fs) => -u(env, fs); }
    if (tk && tk.t === 'op' && tk.v === '+') { eat(); return parseU(); }
    return parseF();
  }
  function parseF(): Node { // F := B ('^' U)? (^ phải-kết-hợp; số mũ có thể mang dấu)
    const base = parseB();
    if (peek() && peek().t === 'op' && peek().v === '^') {
      eat(); const exp = parseU();
      return (env, fs) => Math.pow(base(env, fs), exp(env, fs));
    }
    return base;
  }
  function parseB(): Node { // B := num | const | var | func '(' E ')' | '(' E ')'
    const tk = peek();
    if (!tk) throw new Error('Biểu thức cụt');
    if (tk.t === 'num') { eat(); const val = parseFloat(tk.v); return () => val; }
    if (tk.t === '(') { eat(); const e = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat(); return e; }
    if (tk.t === 'name') {
      eat();
      if (peek() && peek().t === '(') {
        const fname = tk.v;
        eat(); const arg = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat();
        return (env, fs) => {
          const fn = FUNCS[fname] ?? fs[fname];
          if (!fn) throw new Error(`Hàm lạ: ${fname}`);
          return fn(arg(env, fs));
        };
      }
      if (tk.v in CONSTS) { const cv = CONSTS[tk.v]; return () => cv; }
      const name = tk.v;
      return (env) => { if (!(name in env)) throw new Error(`Biến chưa gán: ${name}`); return env[name]; };
    }
    throw new Error(`Token lạ: ${tk.v}`);
  }

  const fn = parseE();
  if (pos !== toks.length) throw new Error('Biểu thức dư token');
  return (env: Env = {}, funcs: Funcs = {}) => fn(env, funcs);
}

export function evalExpr(src: string, env: Env = {}, funcs: Funcs = {}): number {
  return parseExpr(src)(env, funcs);
}
```

- [ ] **Step 4: XANH + tsc + lint + full suite** (mọi test cũ của expr/runAnalysis phải còn xanh)

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/expr.test.ts` → PASS 5/5.
Run: `npx vitest run` → toàn bộ xanh. `npx tsc --noEmit -p tsconfig.json` → sạch. `npx eslint api/_lib/kernel --ext .ts` → sạch.

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/expr.ts api/_lib/kernel/analysis/__tests__/expr.test.ts
git commit -m "feat(engine): expr gọi được hàm do người dùng khai báo (f(z))"
```

---

## Task 2: `quadrature.ts` — tích phân số có tự-kiểm hội tụ

**Files:** Create `api/_lib/kernel/analysis/quadrature.ts` · Test `api/_lib/kernel/analysis/__tests__/quadrature.test.ts`

- [ ] **Step 1: Test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { integrate } from '../quadrature';

describe('integrate', () => {
  it('∫₀¹ x² dx = 1/3', () => {
    const r = integrate((x) => x * x, 0, 1);
    expect(r.value).toBeCloseTo(1 / 3, 10);
    expect(r.estimatedError).toBeLessThan(1e-8);
  });
  it('∫₀^π sin x dx = 2', () => {
    expect(integrate(Math.sin, 0, Math.PI).value).toBeCloseTo(2, 9);
  });
  it('Câu 4: ∫₀⁴⁰ 2·r(z)² dz ≈ 12949,33 (r(z)=-z²/100+0.4z+10)', () => {
    const r = (z: number) => -0.01 * z * z + 0.4 * z + 10;
    const v = integrate((z) => 2 * r(z) ** 2, 0, 40).value;
    expect(v).toBeCloseTo(12949.33, 1);
    expect(v / 1000).toBeCloseTo(12.95, 2); // lít
  });
  it('cận đảo chiều → dấu âm', () => {
    expect(integrate((x) => x * x, 1, 0).value).toBeCloseTo(-1 / 3, 10);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (module not found)

- [ ] **Step 3: Cài đặt `quadrature.ts`**

```ts
// api/_lib/kernel/analysis/quadrature.ts
// Tích phân xác định bằng Simpson kép có TỰ KIỂM: tính ở n rồi 2n khoảng, ước lượng sai số theo
// Richardson |I₂ₙ − Iₙ|/15. Engine dùng để KHÔNG "trả bừa" khi chưa hội tụ.

function simpson(f: (x: number) => number, a: number, b: number, n: number): number {
  const m = n % 2 === 0 ? n : n + 1; // Simpson cần số khoảng CHẴN
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}

// Tăng đôi lưới tới khi sai số ước lượng đủ nhỏ (tương đối) hoặc chạm trần lưới.
export function integrate(
  f: (x: number) => number, a: number, b: number, tol = 1e-9, maxN = 1 << 18,
): { value: number; estimatedError: number } {
  let n = 8;
  let prev = simpson(f, a, b, n);
  for (;;) {
    n *= 2;
    const cur = simpson(f, a, b, n);
    const err = Math.abs(cur - prev) / 15;
    if (err <= tol * Math.max(1, Math.abs(cur)) || n >= maxN) return { value: cur, estimatedError: err };
    prev = cur;
  }
}
```

- [ ] **Step 4: XANH + lint** (`npx vitest run .../quadrature.test.ts` → PASS 4/4; eslint sạch)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/quadrature.ts api/_lib/kernel/analysis/__tests__/quadrature.test.ts
git commit -m "feat(engine): analysis quadrature — integrate (Simpson kép + ước lượng sai số)"
```

---

## Task 3: `runAnalysis` — nguồn số dạng biểu thức + kiểu `integrate`

**Files:** Modify `api/_lib/kernel/analysis/runAnalysis.ts` · Test `api/_lib/kernel/analysis/__tests__/runAnalysis-expr.test.ts`

- [ ] **Step 1: Test đỏ** — tạo `api/_lib/kernel/analysis/__tests__/runAnalysis-expr.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

const LANTERN = { name: 'f', form: 'poly', degree: 2, through: [[0, 10], [20, 14], [40, 10]] };

describe('runAnalysis — nguồn số dạng biểu thức + integrate', () => {
  it('integrate: ∫₀⁴⁰ 2 f(z)² dz ≈ 12949,33 (không cần tham số/hình học)', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      analyze: { kind: 'integrate', variable: 'z', from: 0, to: 40, integrand: '2*f(z)^2' },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(12949.33, 1);
  });

  it('optimize với objective là biểu thức: max 2 f(z)² = 392', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      parameters: [{ name: 'z', domain: [0, 40] }],
      analyze: { kind: 'optimize', parameter: 'z', sense: 'max', objective: { kind: 'expr', expr: '2*f(z)^2' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(392, 6);
    expect(r.parameter.value).toBeCloseTo(20, 4);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (`Invalid analysis plan` — chưa có kiểu integrate / nguồn expr / ops-parameters còn bắt buộc)

- [ ] **Step 3: Cài đặt** — sửa `api/_lib/kernel/analysis/runAnalysis.ts`:

(a) Dòng import: thêm `type Funcs` và `integrate` (giữ các import cũ):
```ts
import { evalExpr, type Env, type Funcs } from './expr';
import { integrate } from './quadrature';
```
(b) Ngay SAU `const NumOrExpr = ...`, thêm nguồn số:
```ts
// Nguồn SỐ cho mục tiêu/điều kiện: truy vấn HÌNH HỌC, hoặc BIỂU THỨC (gọi được hàm đã khai báo).
const ScalarSource = z.union([
  QueryESchema,
  z.object({ kind: z.literal('expr'), expr: z.string() }),
]);
```
(c) Thay `AnalyzeSchema` bằng (objective/of/report dùng `ScalarSource`, thêm kiểu `integrate`):
```ts
const AnalyzeSchema = z.union([
  z.object({ kind: z.literal('optimize'), parameter: z.string(), sense: z.enum(['max', 'min']), objective: ScalarSource }),
  z.object({
    kind: z.literal('solve'), parameter: z.string(),
    constraint: z.object({ of: ScalarSource, equals: NumOrExpr }),
    report: ScalarSource,
  }),
  z.object({ kind: z.literal('integrate'), variable: z.string(), from: NumOrExpr, to: NumOrExpr, integrand: z.string() }),
]);
```
(d) Trong `AnalysisPlanSchema.extend({...})`: nới `ops` và `parameters` (bài chỉ-hàm không cần hình học/tham số):
```ts
  ops: z.array(z.union([FunctionOpSchema, UnifiedOpSchema])).default([]),
  parameters: z.array(z.object({ name: z.string(), domain: z.tuple([NumOrExpr, NumOrExpr]) })).default([]),
```
(e) Trong thân `runAnalysis`, NGAY SAU `const plan = parsed.data;` và `const paramNames = ...`, thêm bộ khớp hàm dùng chung + nhánh `integrate` (đặt TRƯỚC dòng `const pname = plan.analyze.parameter;`):
```ts
  // Khớp mọi hàm khai báo tại env → map tên→hàm số để biểu thức gọi được (engine khớp, LLM không tính).
  const fitAt = (env: Env): { coeffs: Record<string, number[]>; funcs: Funcs } => {
    const coeffs: Record<string, number[]> = {};
    const funcs: Funcs = {};
    for (const fd of plan.functions) {
      const pts = fd.through.map(([px, py]) => [evalExpr(String(px), env), evalExpr(String(py), env)] as [number, number]);
      const lead = fd.leading !== undefined ? evalExpr(fd.leading, env) : undefined;
      const c = fitPoly(fd.degree, pts, lead);
      coeffs[fd.name] = c;
      funcs[fd.name] = (x: number) => evalPoly(c, x);
    }
    return { coeffs, funcs };
  };

  // ---- integrate: thuần hàm số, không cần tham số/hình học ----
  if (plan.analyze.kind === 'integrate') {
    const az = plan.analyze;
    try {
      const { funcs } = fitAt({});
      const from = evalExpr(String(az.from), {}, funcs);
      const to = evalExpr(String(az.to), {}, funcs);
      const r = integrate((x) => evalExpr(az.integrand, { [az.variable]: x }, funcs), from, to);
      const nice = recognizeConstant(r.value);
      return {
        ok: true, parameter: { name: az.variable, value: NaN },
        answer: { approx: r.value, text: nice ? nice.text : r.value.toFixed(4), approximate: !nice },
        violations: [], errors: [],
      };
    } catch (e) { return fail(az.variable, (e as Error).message); }
  }
```
(f) Trong `concreteOps`, THAY khối khớp hàm cũ (vòng `for (const fd of plan.functions) {...}` + `const fitted: ... = {}`) bằng dùng lại `fitAt`:
```ts
    const fitted = fitAt(env).coeffs;
```
(giữ nguyên `needFn` và toàn bộ phần hạ op phía sau).

(g) THAY `evalQuery` và `finalize` để nhận nguồn số (query HOẶC expr):
```ts
  const isExprSrc = (s: unknown): s is { kind: 'expr'; expr: string } =>
    !!s && typeof s === 'object' && (s as { kind?: string }).kind === 'expr';

  // Đánh giá nguồn số tại giá trị tham số (KHÔNG kèm asserts — dùng khi quét/giải). null nếu lỗi.
  const evalQuery = (value: number, src: unknown): number | null => {
    const env = { [pname]: value };
    if (isExprSrc(src)) {
      try { return evalExpr(src.expr, env, fitAt(env).funcs); } catch { return null; }
    }
    let ops: unknown[];
    try { ops = concreteOps(value); } catch { return null; }
    const res = run({ solidName: plan.solidName, ops, asserts: [], queries: [src] });
    if (!res.ok || res.answers.length === 0) return null;
    try { return scalarOf(res.answers[0]); } catch { return null; }
  };

  // Tại nghiệm cuối: lấy đáp số + kiểm asserts (nếu có hình học) để tự kiểm mô hình.
  const finalize = (value: number, src: unknown): AnalysisResult => {
    const env = { [pname]: value };
    let violations: unknown[] = [];
    let errors: { message: string }[] = [];
    let val = NaN;
    if (isExprSrc(src)) {
      try { val = evalExpr(src.expr, env, fitAt(env).funcs); } catch (e) { return fail(pname, (e as Error).message); }
      if (plan.ops.length > 0) {
        try {
          const res = run({ solidName: plan.solidName, ops: concreteOps(value), asserts: plan.asserts, queries: [] });
          violations = res.violations; errors = res.errors.map((e) => ({ message: e.message }));
        } catch (e) { errors = [{ message: (e as Error).message }]; }
      }
    } else {
      let ops: unknown[];
      try { ops = concreteOps(value); } catch (e) { return fail(pname, (e as Error).message); }
      const res = run({ solidName: plan.solidName, ops, asserts: plan.asserts, queries: [src] });
      try { if (res.answers.length > 0) val = scalarOf(res.answers[0]); } catch { /* không trả số */ }
      violations = res.violations; errors = res.errors.map((e) => ({ message: e.message }));
    }
    const nice = Number.isFinite(val) ? recognizeConstant(val) : null;
    return {
      ok: violations.length === 0 && errors.length === 0 && Number.isFinite(val),
      parameter: { name: pname, value },
      answer: { approx: val, text: nice ? nice.text : (Number.isFinite(val) ? val.toFixed(4) : '(lỗi)'), approximate: !nice },
      violations, errors,
    };
  };
```
(h) Nếu tsc báo `Env` chưa export từ `./expr` — nó ĐÃ export (`export type Env`). Giữ import như (a).

- [ ] **Step 4: XANH + tsc + lint + full suite**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/runAnalysis-expr.test.ts` → PASS 2/2.
Run: `npx vitest run` → toàn bộ xanh (Câu 1/9/10 KHÔNG hồi quy). `npx tsc --noEmit -p tsconfig.json` sạch. `npx eslint api/_lib/kernel --ext .ts` sạch.

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/runAnalysis.ts api/_lib/kernel/analysis/__tests__/runAnalysis-expr.test.ts
git commit -m "feat(engine): runAnalysis — nguồn số dạng biểu thức + kiểu analyze integrate"
```

---

## Task 4: Hợp đồng Câu 4 + prompt + rebuild + mốc

**Files:** Test `api/_lib/kernel/analysis/__tests__/cau4-contract.test.ts` · Modify `api/_lib/kernel-bridge/translatorPrompt.js`

- [ ] **Step 1: Test hợp đồng Câu 4**

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

// Đèn lồng cao 40, mặt cắt vuông; nửa đường chéo r(z) là parabol qua (0,10),(20,14),(40,10).
// Cạnh vuông = r√2 ⇒ diện tích mặt cắt = 2r².  (L0=10√2 ⇒ r=10; Lmax=14√2 ⇒ r=14.)
const LANTERN = { name: 'r', form: 'poly', degree: 2, through: [[0, 10], [20, 14], [40, 10]] };

describe('Câu 4 (đèn lồng) qua runAnalysis', () => {
  it('a) diện tích mặt cắt LỚN NHẤT = 392 cm² (đề nói 196 ⇒ Sai)', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      parameters: [{ name: 'z', domain: [0, 40] }],
      analyze: { kind: 'optimize', parameter: 'z', sense: 'max', objective: { kind: 'expr', expr: '2*r(z)^2' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(392, 6);
  });

  it('c) thể tích = 12,95 lít', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      analyze: { kind: 'integrate', variable: 'z', from: 0, to: 40, integrand: '2*r(z)^2' },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx / 1000).toBeCloseTo(12.95, 2);
  });

  it('d) bán kính bóng đèn lớn nhất ≈ 2,866 cm', () => {
    // Tâm bóng trên trục, cách đáy 22. Mặt gần trục nhất ở độ cao z cách trục r(z)/√2 (trung điểm cạnh).
    // Khoảng cách tâm→lồng = sqrt((r(z)/√2)² + (z−22)²); trừ 7 (khoảng an toàn) ⇒ bán kính tối đa.
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      parameters: [{ name: 'z', domain: [0, 40] }],
      analyze: {
        kind: 'optimize', parameter: 'z', sense: 'min',
        objective: { kind: 'expr', expr: 'sqrt((r(z)/sqrt(2))^2 + (z-22)^2) - 7' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(2.866, 3);
  });
});
```

- [ ] **Step 2: Chạy — kỳ vọng XANH** (`npx vitest run api/_lib/kernel/analysis/__tests__/cau4-contract.test.ts` → 3/3)

- [ ] **Step 3: Dạy LLM** — chèn vào `TRANSLATOR_PROMPT` (ngay trước dòng "CHỈ trả về JSON"):

```
## TÍCH PHÂN / BIỂU THỨC THEO HÀM (engine tính — đừng tự tích phân)
- Mục tiêu/điều kiện có thể là BIỂU THỨC thay vì truy vấn hình học:
    { "kind":"expr", "expr":"2*r(z)^2" }        ← gọi được hàm đã khai báo trong "functions"
- Tính tích phân xác định: "analyze": { "kind":"integrate", "variable":"z", "from":0, "to":40,
    "integrand":"2*r(z)^2" }   (bài này KHÔNG cần "parameters" hay "ops")
- Thể tích khối có MẶT CẮT biến thiên: viết diện tích mặt cắt theo hàm rồi integrate.
  Vd mặt cắt là hình vuông có NỬA ĐƯỜNG CHÉO r(z) ⇒ cạnh = r√2 ⇒ diện tích = 2*r(z)^2.
- Cú pháp biểu thức: + - * / ^, dấu * BẮT BUỘC (viết "2*r(z)", không viết "2r(z)");
  hàm sin, cos, tan, sqrt, abs; hằng pi, e.
```

- [ ] **Step 4: Kiểm chứng toàn cục + rebuild**

Run: `npx vitest run` → toàn bộ xanh. `npx tsc --noEmit -p tsconfig.json` → sạch.
Run: `npx eslint api/_lib/kernel --ext .ts` → sạch. `node scripts/build-kernel.mjs` → ghi bundle không lỗi.

- [ ] **Step 5: Commit mốc**
```bash
git add -A
git commit -m "feat(engine): Đợt B2 xong — tích phân + biểu thức theo hàm, Câu 4 giải trọn (392 cm², 12,95 L, 2,866 cm)"
```

---

## Self-Review (đã rà)

- **Phủ mục tiêu:** expr gọi hàm = Task 1; quadrature = Task 2; nguồn expr + kiểu integrate + nới ops/parameters = Task 3; Câu 4 (a,c,d) + prompt = Task 4. Ý b) là mệnh đề về DẠNG parabol (dấu) — không phải phép tính số, engine không cần trả (đã ghi: đáp đúng là −z²/100+14 ở hệ tâm giữa).
- **Chống ảo giác:** LLM khai báo `functions.through` + biểu thức mô hình; engine KHỚP hệ số, TÍCH PHÂN (tự kiểm hội tụ Richardson), TỐI ƯU. `finalize` vẫn kiểm `asserts` khi plan có hình học.
- **An toàn:** `run()` KHÔNG đổi; nới `ops`/`parameters` chỉ ở AnalysisPlanSchema; nhánh `integrate` không chạm hình học; các test Câu 1/9/10 phải còn xanh (Step 4 Task 3 + Task 4).
- **Nhất quán kiểu:** `evalExpr(src, env?, funcs?)`; `integrate(f,a,b,tol?,maxN?) → {value, estimatedError}`; `ScalarSource = QueryE | {kind:'expr',expr}`; `fitAt(env) → {coeffs, funcs}`. Golden truy vết tay: r(z)=−z²/100+0.4z+10; 2·r(20)²=392; ∫₀⁴⁰2r²=12949,33 (=12,95 L); min sqrt((r/√2)²+(z−22)²)−7 = 2,866.
- **Không placeholder:** expr.ts và quadrature.ts có mã đầy đủ; runAnalysis có snippet chính xác + vị trí chèn.
