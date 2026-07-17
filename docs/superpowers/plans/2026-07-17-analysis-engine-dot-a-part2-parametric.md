# Đợt A (phần 2) — Hình học tham số + giải/tối ưu (LLM tự đặt Câu 9 & Câu 10) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LLM khai báo hình có **1 tham số tự do** + mục tiêu/điều kiện; ENGINE tự dựng toạ độ theo tham số, **quét/giải/tối ưu** bằng số (dùng `solver1d`/lưới) rồi tự kiểm. Đích: **Câu 10 (optimize)** và **Câu 9 (solve)** chạy trọn qua một entry mới `runAnalysis()`.

**Architecture:** KHÔNG sửa `run()`. Thêm entry mới `runAnalysis()` bọc ngoài `run()`: nó thay tham số bằng số → gọi `run()` (engine hình học số) → đọc truy vấn mục tiêu → `optimizeParam`/`solveParam` điều khiển tham số → `recognizeConstant` làm đẹp đáp số → tự kiểm asserts tại nghiệm. Toạ độ phụ thuộc tham số được phép là **biểu thức chuỗi** (`"3*cos(th)"`), engine tính số ở mỗi giá trị tham số. Chống ảo giác: LLM chỉ khai báo hình + mục tiêu, không đạo hàm/không tính.

**Tech Stack:** TypeScript, Zod, Vitest, esbuild. Dựa trên `run()`/`RunPlanSchema` (`api/_lib/kernel/run.ts`), `solver1d`/`recognize` (phần 1), `Scalar`, và tầng compute/oxyz sẵn có.

---

## File Structure

- **Tạo:** `api/_lib/kernel/analysis/expr.ts` — parser+evaluator biểu thức 1 biến (số/biến/`+-*/^`/`sin cos tan sqrt abs`/`pi e`).
- **Tạo:** `api/_lib/kernel/analysis/paramsolve.ts` — `optimizeParam`, `solveParam` (số, 1 biến).
- **Sửa:** `api/_lib/kernel/dialects/oxyz.ts` — thêm op `oxyz_circumsphere_offset` (mặt cầu qua 3 điểm, tâm lệch t theo pháp tuyến đơn vị).
- **Sửa:** `api/_lib/kernel/compute/query.ts` — thêm truy vấn `sphere_metric` (radius / top_z / bottom_z).
- **Tạo:** `api/_lib/kernel/analysis/runAnalysis.ts` — schema (`parameters`+`analyze`) + driver + `runAny()` (dispatch run vs runAnalysis).
- **Sửa:** `api/_lib/kernel-bridge/translatorPrompt.js` — dạy LLM khai báo `parameters` + `analyze` (optimize/solve).
- **Sửa:** kernel index (entry của `scripts/build-kernel.mjs`) — export `runAnalysis`, `runAny`.
- **Tạo test:** cho từng module + `analysis/__tests__/parametric-contract.test.ts` (Câu 9 + Câu 10 end-to-end).

---

## Task 1: `expr.ts` — bộ tính biểu thức 1 biến

**Files:** Create `api/_lib/kernel/analysis/expr.ts` · Test `api/_lib/kernel/analysis/__tests__/expr.test.ts`

- [ ] **Step 1: Test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { evalExpr } from '../expr';

describe('evalExpr', () => {
  it('số học + ưu tiên', () => {
    expect(evalExpr('1 + 2*3')).toBe(7);
    expect(evalExpr('(1+2)*3')).toBe(9);
    expect(evalExpr('2^3^2')).toBe(512); // ^ phải-kết-hợp
    expect(evalExpr('-5 + 2')).toBe(-3);
  });
  it('biến + hàm + hằng', () => {
    expect(evalExpr('3*cos(th)', { th: 0 })).toBeCloseTo(3, 12);
    expect(evalExpr('2*sqrt(3)')).toBeCloseTo(2 * Math.sqrt(3), 12);
    expect(evalExpr('pi/2')).toBeCloseTo(Math.PI / 2, 12);
    expect(evalExpr('a+b', { a: 1, b: 2 })).toBe(3);
  });
  it('biến chưa gán → ném', () => {
    expect(() => evalExpr('x+1')).toThrow();
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (`npx vitest run api/_lib/kernel/analysis/__tests__/expr.test.ts` → module not found)

- [ ] **Step 3: Cài đặt `expr.ts`**

```ts
// api/_lib/kernel/analysis/expr.ts
// Parser + evaluator biểu thức 1 dòng cho engine giải tích: số, biến, + - * / ^ (^ phải-kết-hợp),
// đơn nguyên -, ngoặc, hàm sin/cos/tan/sqrt/abs, hằng pi/e. Trả hàm (env) => number.
export type Env = Record<string, number>;
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

export function parseExpr(src: string): (env: Env) => number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];

  function parseE(): (env: Env) => number { // E := T (('+'|'-') T)*
    let left = parseT();
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v; const right = parseT(); const l = left;
      left = (env) => (op === '+' ? l(env) + right(env) : l(env) - right(env));
    }
    return left;
  }
  function parseT(): (env: Env) => number { // T := F (('*'|'/') F)*
    let left = parseF();
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = eat().v; const right = parseF(); const l = left;
      left = (env) => (op === '*' ? l(env) * right(env) : l(env) / right(env));
    }
    return left;
  }
  function parseF(): (env: Env) => number { // F := B ('^' F)?  (phải-kết-hợp)
    const base = parseB();
    if (peek() && peek().t === 'op' && peek().v === '^') {
      eat(); const exp = parseF();
      return (env) => Math.pow(base(env), exp(env));
    }
    return base;
  }
  function parseB(): (env: Env) => number { // B := num | const | var | func '(' E ')' | '(' E ')' | ('-'|'+') B
    const tk = peek();
    if (!tk) throw new Error('Biểu thức cụt');
    if (tk.t === 'op' && tk.v === '-') { eat(); const b = parseB(); return (env) => -b(env); }
    if (tk.t === 'op' && tk.v === '+') { eat(); return parseB(); }
    if (tk.t === 'num') { eat(); const val = parseFloat(tk.v); return () => val; }
    if (tk.t === '(') { eat(); const e = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat(); return e; }
    if (tk.t === 'name') {
      eat();
      if (peek() && peek().t === '(') {
        const fn = FUNCS[tk.v]; if (!fn) throw new Error(`Hàm lạ: ${tk.v}`);
        eat(); const arg = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat();
        return (env) => fn(arg(env));
      }
      if (tk.v in CONSTS) { const cv = CONSTS[tk.v]; return () => cv; }
      const name = tk.v;
      return (env) => { if (!(name in env)) throw new Error(`Biến chưa gán: ${name}`); return env[name]; };
    }
    throw new Error(`Token lạ: ${tk.v}`);
  }

  const fn = parseE();
  if (pos !== toks.length) throw new Error('Biểu thức dư token');
  return fn;
}

export function evalExpr(src: string, env: Env = {}): number {
  return parseExpr(src)(env);
}
```

- [ ] **Step 4: Chạy — XANH + lint** (`npx vitest run .../expr.test.ts` → PASS; `npx eslint api/_lib/kernel/analysis/expr.ts` → 0)

- [ ] **Step 5: Commit** `git add ...expr.ts ...expr.test.ts && git commit -m "feat(engine): analysis expr — bộ tính biểu thức 1 biến"`

---

## Task 2: `paramsolve.ts` — tối ưu & giải nghiệm 1 biến (số)

**Files:** Create `api/_lib/kernel/analysis/paramsolve.ts` · Test `api/_lib/kernel/analysis/__tests__/paramsolve.test.ts`

- [ ] **Step 1: Test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { optimizeParam, solveParam } from '../paramsolve';

describe('optimizeParam', () => {
  it('max của x(4−x) trên [0,4] = 4 tại x=2', () => {
    const r = optimizeParam((x) => x * (4 - x), 0, 4, 'max');
    expect(r.x).toBeCloseTo(2, 6);
    expect(r.value).toBeCloseTo(4, 6);
  });
  it('min của (x−1)² trên [−2,4] = 0 tại x=1', () => {
    const r = optimizeParam((x) => (x - 1) ** 2, -2, 4, 'min');
    expect(r.x).toBeCloseTo(1, 6);
  });
});

describe('solveParam', () => {
  it('x²=7 trên [0,5] → √7', () => {
    const r = solveParam((x) => x * x, 7, 0, 5);
    expect(r).not.toBeNull();
    expect(r!.x).toBeCloseTo(Math.sqrt(7), 8);
  });
  it('không đổi dấu → null', () => {
    expect(solveParam((x) => x * x + 1, 0, 0, 5)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

- [ ] **Step 3: Cài đặt `paramsolve.ts`**

```ts
// api/_lib/kernel/analysis/paramsolve.ts
// Tối ưu & giải nghiệm MỘT biến trên [lo,hi] bằng số (lưới thô + tinh chỉnh) — không cần đạo hàm.
// Dùng cho engine giải tích: quét một tham số hình học, đánh giá lại hình ở mỗi giá trị.

// Tối ưu: lưới thô tìm ô tốt nhất rồi golden-section trong ô lân cận.
export function optimizeParam(
  f: (x: number) => number, lo: number, hi: number, sense: 'max' | 'min', grid = 400,
): { x: number; value: number } {
  const sign = sense === 'max' ? 1 : -1;
  let bx = lo, bv = sign * f(lo);
  for (let i = 1; i <= grid; i++) {
    const x = lo + ((hi - lo) * i) / grid;
    const v = sign * f(x);
    if (v > bv) { bv = v; bx = x; }
  }
  const h = (hi - lo) / grid;
  let a = Math.max(lo, bx - h), b = Math.min(hi, bx + h);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a);
  for (let k = 0; k < 200; k++) {
    if (sign * f(c) > sign * f(d)) b = d; else a = c;
    c = b - gr * (b - a); d = a + gr * (b - a);
    if (b - a < 1e-12) break;
  }
  const x = (a + b) / 2;
  return { x, value: f(x) };
}

// Giải f(x)=target trên [lo,hi]: tìm ô đổi dấu của g=f−target rồi chia đôi. null nếu không có.
export function solveParam(
  f: (x: number) => number, target: number, lo: number, hi: number, grid = 800,
): { x: number; residual: number } | null {
  const g = (x: number) => f(x) - target;
  let x0 = lo, g0 = g(lo);
  if (g0 === 0) return { x: lo, residual: 0 };
  for (let i = 1; i <= grid; i++) {
    const x1 = lo + ((hi - lo) * i) / grid;
    const g1 = g(x1);
    if (g1 === 0) return { x: x1, residual: 0 };
    if (g0 * g1 < 0) {
      let a = x0, b = x1, ga = g0;
      for (let k = 0; k < 200; k++) {
        const m = (a + b) / 2, gm = g(m);
        if (ga * gm <= 0) b = m; else { a = m; ga = gm; }
        if (b - a < 1e-13) break;
      }
      const x = (a + b) / 2;
      return { x, residual: Math.abs(g(x)) };
    }
    x0 = x1; g0 = g1;
  }
  return null;
}
```

- [ ] **Step 4: Chạy — XANH + lint**

- [ ] **Step 5: Commit** `git commit -m "feat(engine): analysis paramsolve — optimizeParam & solveParam (số, 1 biến)"`

---

## Task 3: Op `oxyz_circumsphere_offset` + truy vấn `sphere_metric` (cho Câu 9)

**Files:** Modify `api/_lib/kernel/dialects/oxyz.ts`, `api/_lib/kernel/compute/query.ts` · Test `api/_lib/kernel/dialects/__tests__/oxyz-circumsphere.test.ts`

- [ ] **Step 1: Test đỏ** — tạo `api/_lib/kernel/dialects/__tests__/oxyz-circumsphere.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { run } from '../../run';

describe('oxyz_circumsphere_offset + sphere_metric', () => {
  it('mặt cầu qua 3 điểm, lệch t theo pháp tuyến; đọc bán kính & đỉnh', () => {
    // 3 đỉnh cột A(0,0,10),B(4,0,6),C(0,4,6); t=0 ⇒ cầu tâm = tâm ngoại tiếp, R=4√6/3≈3.266.
    const res = run({
      solidName: 'poles',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 10] },
        { op: 'oxyz_point', name: 'B', at: [4, 0, 6] },
        { op: 'oxyz_point', name: 'C', at: [0, 4, 6] },
        { op: 'oxyz_circumsphere_offset', name: 'S', of: ['A', 'B', 'C'], t: 0 },
      ],
      queries: [
        { kind: 'sphere_metric', target: 'S', what: 'radius' },
        { kind: 'sphere_metric', target: 'S', what: 'top_z' },
      ],
    });
    expect(res.ok).toBe(true);
    expect((res.answers[0] as { approx: number }).approx).toBeCloseTo(4 * Math.sqrt(6) / 3, 6);
    // t=0: tâm=(4/3,4/3,22/3), top_z = 22/3 + 4√6/3
    expect((res.answers[1] as { approx: number }).approx).toBeCloseTo(22 / 3 + 4 * Math.sqrt(6) / 3, 6);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (op & query chưa có → errors)

- [ ] **Step 3a: Thêm op vào `oxyz.ts`**

Bổ sung import còn thiếu ở đầu file (giữ nguyên các import cũ, chỉ THÊM những cái chưa có): `circumcenterE` từ `'../constructions'` (đã import ở phần 1? nếu chưa, thêm), và các vec3/scalar cần: `crossV`, `num`, `scaleV`, `addV`, `subV`, `lenSqV`. Kiểm dòng import hiện có rồi thêm cái thiếu.

Thêm schema (cạnh các Oxyz*Schema khác):
```ts
export const OxyzCircumsphereOffsetSchema = z.object({
  op: z.literal('oxyz_circumsphere_offset'),
  name: PointName, // dùng grammar tên chặt như các op dựng khác
  of: z.tuple([Name, Name, Name]),
  t: RInput, // số (đã thay tham số) — khoảng cách CÓ DẤU dọc pháp tuyến ĐƠN VỊ của mặt (ABC)
});
```
Thêm vào union `OxyzOpSchema` (thêm một dòng thành viên):
```ts
  OxyzCircumsphereOffsetSchema,
```
Thêm case trong `executeOxyzOp`:
```ts
    case 'oxyz_circumsphere_offset': {
      const a = requirePointE(et, op.of[0]).p;
      const b = requirePointE(et, op.of[1]).p;
      const c = requirePointE(et, op.of[2]).p;
      const Q = circumcenterE(a, b, c);
      const normal = crossV(subV(b, a), subV(c, a));
      const nlen = Math.sqrt(lenSqV(normal).approx);
      const tv = parseScalar(op.t).approx;
      const center = addV(Q, scaleV(normal, num(tv / nlen))); // Q + (t/|n|)·n  (số)
      const r2 = lenSqV(subV(center, a));
      setSphereE(et, op.name, sphereFromCenterRadius2(center, r2));
      break;
    }
```
(`sphereFromCenterRadius2` đã được import sẵn ở oxyz.ts; `parseScalar` cũng vậy. Nếu `circumcenterE`/`crossV`/`num`/`scaleV`/`addV`/`subV`/`lenSqV` chưa có trong import thì thêm.)

Đăng ký op vào routing của `unifiedPlan.ts`: thêm `'oxyz_circumsphere_offset'` vào CẢ HAI set `OXYZ_OPS` và `OXYZ_POINT_OPS`? — KHÔNG, nó tạo SPHERE không phải point. Chỉ thêm vào `OXYZ_OPS` (không thêm vào `OXYZ_POINT_OPS`).

- [ ] **Step 3b: Thêm truy vấn `sphere_metric` vào `query.ts`**

Thêm thành viên vào `QueryESchema` union:
```ts
  z.object({ kind: z.literal('sphere_metric'), target: Tok, what: z.enum(['radius', 'top_z', 'bottom_z']) }),
```
Thêm case trong `computeQuery` switch:
```ts
      case 'sphere_metric': {
        const e = resolveEntityE(query.target, et);
        if (e.kind !== 'sphere') return { ok: false, problem: 'sphere_metric needs a sphere' };
        const R = Math.sqrt(e.r2.approx);
        const val = query.what === 'radius' ? R
          : query.what === 'top_z' ? e.center.z.approx + R
          : e.center.z.approx - R;
        return { ok: true, answer: { kind: 'sphere_metric', exact: null, approx: val, text: val.toFixed(4), approximate: true } };
      }
```
Cập nhật kiểu `QueryAnswer` union nếu tsc đòi: `sphere_metric` trả dạng `ScalarAnswer` (đã có `kind` string linh hoạt) — nếu `QueryAnswer` không nhận, thêm `| ScalarAnswer` (đã import ScalarAnswer) hoặc để literal khớp `ScalarAnswer`. Chạy tsc để xác nhận.

- [ ] **Step 4: Chạy — XANH + tsc + lint** (`npx vitest run .../oxyz-circumsphere.test.ts`; `npx tsc --noEmit -p tsconfig.json`; `npx eslint api/_lib/kernel --ext .ts`)

- [ ] **Step 5: Commit** `git commit -m "feat(engine): oxyz_circumsphere_offset + sphere_metric query (nền cho Câu 9 solve)"`

---

## Task 4: `runAnalysis.ts` — schema tham số + driver giải/tối ưu

**Files:** Create `api/_lib/kernel/analysis/runAnalysis.ts` · Test `api/_lib/kernel/analysis/__tests__/runAnalysis.test.ts`

- [ ] **Step 1: Test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis', () => {
  it('solve: điểm P=(t,0,0), tìm t sao cho d(O,P)=3 → t=3', () => {
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 10] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 3 },
        report: { kind: 'distance', a: 'O', b: 'P' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(3, 6);
    expect(r.answer.approx).toBeCloseTo(3, 6);
  });

  it('optimize: điểm P=(t,0,0), max của −(t−2)² qua diện… dùng khoảng cách', () => {
    // max âm-bình-phương: điểm P=(t,0,0), tối thiểu d(P,(2,0,0)) ⇔ t=2.
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 5] }],
      ops: [
        { op: 'oxyz_point', name: 'Q', at: [2, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      analyze: { kind: 'optimize', parameter: 't', sense: 'min', objective: { kind: 'distance', a: 'P', b: 'Q' } },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(2, 5);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

- [ ] **Step 3: Cài đặt `runAnalysis.ts`**

```ts
// api/_lib/kernel/analysis/runAnalysis.ts
// Entry GIẢI TÍCH: bọc ngoài run() — LLM khai báo hình có 1 tham số tự do + mục tiêu/điều kiện;
// engine thay tham số bằng số, chạy run() (hình học số), đọc truy vấn, rồi tối ưu/giải theo tham số.
// KHÔNG sửa run(). Chống ảo giác: engine tính, LLM chỉ khai báo.
import { z } from 'zod';
import { run, RunPlanSchema } from '../run';
import { QueryESchema } from '../compute/query';
import { evalExpr } from './expr';
import { optimizeParam, solveParam } from './paramsolve';
import { recognizeConstant } from './recognize';

const NumOrExpr = z.union([z.number(), z.string()]);

const AnalyzeSchema = z.union([
  z.object({ kind: z.literal('optimize'), parameter: z.string(), sense: z.enum(['max', 'min']), objective: QueryESchema }),
  z.object({
    kind: z.literal('solve'), parameter: z.string(),
    constraint: z.object({ of: QueryESchema, equals: NumOrExpr }),
    report: QueryESchema,
  }),
]);

export const AnalysisPlanSchema = RunPlanSchema.extend({
  parameters: z.array(z.object({ name: z.string(), domain: z.tuple([NumOrExpr, NumOrExpr]) })).min(1),
  analyze: AnalyzeSchema,
});
export type AnalysisPlan = z.infer<typeof AnalysisPlanSchema>;

export type AnalysisResult = {
  ok: boolean;
  parameter: { name: string; value: number };
  answer: { approx: number; text: string; approximate: boolean };
  violations: unknown[];
  errors: { message: string }[];
};

// Số hoá một entry toạ độ/tham số: nếu là chuỗi CÓ chứa tên tham số → evalExpr; ngược lại giữ nguyên.
function numify(c: number | string, env: Record<string, number>, params: string[]): number | string {
  if (typeof c === 'string' && params.some((p) => new RegExp(`\\b${p}\\b`).test(c))) return evalExpr(c, env);
  return c;
}

// Đọc SỐ từ một answer (distance/area/volume/scalar/sphere_metric có approx; angle có degrees).
function scalarOf(a: unknown): number {
  const o = a as Record<string, unknown>;
  if (o && typeof o.approx === 'number') return o.approx;
  if (o && typeof o.degrees === 'number') return o.degrees;
  throw new Error('Truy vấn mục tiêu/điều kiện không trả số');
}

function fail(name: string, msg: string): AnalysisResult {
  return { ok: false, parameter: { name, value: NaN }, answer: { approx: NaN, text: '(lỗi)', approximate: true }, violations: [], errors: [{ message: msg }] };
}

export function runAnalysis(raw: unknown): AnalysisResult {
  const parsed = AnalysisPlanSchema.safeParse(raw);
  if (!parsed.success) return fail('?', `Invalid analysis plan: ${parsed.error.issues[0]?.message ?? 'schema'}`);
  const plan = parsed.data;
  const pname = plan.analyze.parameter;
  const paramNames = plan.parameters.map((p) => p.name);
  const decl = plan.parameters.find((p) => p.name === pname);
  if (!decl) return fail(pname, `parameter "${pname}" chưa khai báo`);
  const lo = evalExpr(String(decl.domain[0]), {});
  const hi = evalExpr(String(decl.domain[1]), {});

  // Dựng plan CỤ THỂ tại giá trị tham số + một truy vấn mục tiêu; trả số của truy vấn (hoặc null nếu lỗi).
  const evalQuery = (value: number, query: unknown): number | null => {
    const env = { [pname]: value };
    const ops = plan.ops.map((op) => {
      const o = op as Record<string, unknown>;
      if (o.op === 'oxyz_point' && Array.isArray(o.at)) return { ...o, at: (o.at as (number | string)[]).map((c) => numify(c, env, paramNames)) };
      if (o.op === 'oxyz_circumsphere_offset') return { ...o, t: numify(o.t as number | string, env, paramNames) };
      return op;
    });
    const res = run({ solidName: plan.solidName, ops, asserts: [], queries: [query] });
    if (!res.ok || res.answers.length === 0) return null;
    try { return scalarOf(res.answers[0]); } catch { return null; }
  };

  if (plan.analyze.kind === 'optimize') {
    const obj = plan.analyze.objective;
    const f = (x: number): number => { const v = evalQuery(x, obj); if (v === null) throw new Error('objective lỗi tại tham số'); return v; };
    let best;
    try { best = optimizeParam(f, lo, hi, plan.analyze.sense); } catch (e) { return fail(pname, (e as Error).message); }
    const nice = recognizeConstant(best.value);
    return { ok: true, parameter: { name: pname, value: best.x }, answer: { approx: best.value, text: nice ? nice.text : best.value.toFixed(4), approximate: !nice }, violations: [], errors: [] };
  }

  // solve
  const target = evalExpr(String(plan.analyze.constraint.equals), {});
  const cof = plan.analyze.constraint.of;
  const g = (x: number): number => { const v = evalQuery(x, cof); if (v === null) throw new Error('constraint lỗi tại tham số'); return v; };
  let sol;
  try { sol = solveParam(g, target, lo, hi); } catch (e) { return fail(pname, (e as Error).message); }
  if (!sol) return fail(pname, 'không tìm được nghiệm tham số trong miền');
  const reported = evalQuery(sol.x, plan.analyze.report);
  if (reported === null) return fail(pname, 'report query lỗi tại nghiệm');
  const nice = recognizeConstant(reported);
  return { ok: true, parameter: { name: pname, value: sol.x }, answer: { approx: reported, text: nice ? nice.text : reported.toFixed(4), approximate: !nice }, violations: [], errors: [] };
}

// Dispatch: có `analyze` ⇒ runAnalysis; ngược lại run() thường.
export function runAny(raw: unknown): ReturnType<typeof run> | AnalysisResult {
  if (raw && typeof raw === 'object' && 'analyze' in (raw as object)) return runAnalysis(raw);
  return run(raw);
}
```

- [ ] **Step 4: Chạy — XANH + tsc + lint**

- [ ] **Step 5: Commit** `git commit -m "feat(engine): runAnalysis — hình học tham số + tối ưu/giải (bọc ngoài run)"`

---

## Task 5: Hợp đồng end-to-end — Câu 9 (solve) + Câu 10 (optimize)

**Files:** Test `api/_lib/kernel/analysis/__tests__/parametric-contract.test.ts`

- [ ] **Step 1: Test (đỏ nếu Task 3/4 chưa xong; nếu xong thì xanh — đây là test tích hợp)**

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 9 & Câu 10 qua runAnalysis', () => {
  it('Câu 9 (solve): quả cầu tựa 3 cột, đỉnh cao 14 → R = 10−2√7', () => {
    const r = runAnalysis({
      solidName: 'poles',
      parameters: [{ name: 't', domain: [0, 20] }],
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 10] },
        { op: 'oxyz_point', name: 'B', at: [4, 0, 6] },
        { op: 'oxyz_point', name: 'C', at: [0, 4, 6] },
        { op: 'oxyz_circumsphere_offset', name: 'S', of: ['A', 'B', 'C'], t: 't' },
      ],
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'sphere_metric', target: 'S', what: 'top_z' }, equals: 14 },
        report: { kind: 'sphere_metric', target: 'S', what: 'radius' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(10 - 2 * Math.sqrt(7), 4);
    expect(r.answer.text).toBe('10 - 2√7');
  });

  it('Câu 10 (optimize): bóng tấm pin, max diện tích hình thang', () => {
    const r = runAnalysis({
      solidName: 'panel',
      parameters: [{ name: 'th', domain: [0.02, 1.55] }], // (0, π/2)
      ops: [
        { op: 'oxyz_point', name: 'A', at: [-1, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'S', at: [0, 0, 4] },
        { op: 'oxyz_point', name: 'C', at: [1, '3*cos(th)', '3*sin(th)'] },
        { op: 'oxyz_point', name: 'D', at: [-1, '3*cos(th)', '3*sin(th)'] },
        { op: 'oxyz_plane', name: 'ground', by: { form: 'coeffs', a: 0, b: 0, c: 1, d: 0 } },
        { op: 'oxyz_line', name: 'SC', by: { form: 'two_points', a: 'S', b: 'C' } },
        { op: 'oxyz_line', name: 'SD', by: { form: 'two_points', a: 'S', b: 'D' } },
        { op: 'oxyz_intersect', name: 'Cp', a: 'SC', b: 'ground' },
        { op: 'oxyz_intersect', name: 'Dp', a: 'SD', b: 'ground' },
      ],
      analyze: {
        kind: 'optimize', parameter: 'th', sense: 'max',
        objective: { kind: 'area', shape: 'polygon', points: ['A', 'B', 'Cp', 'Dp'] },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(16.518, 2); // ≈ 16,5 m²
    expect(Math.sin(r.parameter.value)).toBeCloseTo(0.878, 2);
  });
});
```

- [ ] **Step 2: Chạy — kỳ vọng XANH** (`npx vitest run api/_lib/kernel/analysis/__tests__/parametric-contract.test.ts`)

Ghi chú nếu Câu 10 lệch: `oxyz_intersect` line∩plane phải trả điểm giao (G2-6); polygon A,B,Cp,Dp là hình thang trong z=0 → `area/polygon` tính đúng. Nếu `oxyz_intersect` không nhận line-plane, kiểm lại executor G2-6 (không sửa test).

- [ ] **Step 3: Commit** `git commit -m "test(engine): Câu 9 (solve) + Câu 10 (optimize) chạy trọn qua runAnalysis"`

---

## Task 6: Prompt + export + rebuild + kiểm chứng + mốc

**Files:** Modify `api/_lib/kernel-bridge/translatorPrompt.js`, kernel index (entry của build), (kiểm chứng)

- [ ] **Step 1: Dạy LLM `parameters` + `analyze`** — chèn một mục mới vào `TRANSLATOR_PROMPT` (trước dòng "CHỈ trả về JSON"), nội dung:

```
## BÀI CÓ THAM SỐ / TỐI ƯU / TÌM ĐIỀU KIỆN (không tự tính — để engine giải)
Nếu đề hỏi "lớn nhất/nhỏ nhất" theo một đại lượng thay đổi (góc, độ dài…), HOẶC cho một điều kiện cần
tìm giá trị thoả: KHAI BÁO một tham số tự do và để engine giải. TUYỆT ĐỐI KHÔNG tự đạo hàm/tự tính.
- Khai báo tham số: "parameters": [ { "name": "th", "domain": [0, "pi/2"] } ]
- Toạ độ phụ thuộc tham số viết dạng CHUỖI biểu thức: "3*cos(th)", "2*sin(th)+1" (dùng sin/cos/sqrt/pi).
- Tối ưu: "analyze": { "kind":"optimize", "parameter":"th", "sense":"max", "objective": <một query trả số, vd diện tích> }
- Tìm điều kiện: "analyze": { "kind":"solve", "parameter":"t",
    "constraint": { "of": <query trả số>, "equals": <giá trị> }, "report": <query muốn lấy đáp> }
- Mặt cầu tựa 3 điểm (lệch t dọc trục): { "op":"oxyz_circumsphere_offset", "name":"S", "of":["A","B","C"], "t":"t" }
- Đọc số của mặt cầu: { "kind":"sphere_metric", "target":"S", "what":"radius" | "top_z" | "bottom_z" }
```

- [ ] **Step 2: Export entry** — trong file index mà `scripts/build-kernel.mjs` bundle (tìm file entry; là nơi `export ... run`), THÊM:
```ts
export { runAnalysis, runAny, AnalysisPlanSchema } from './analysis/runAnalysis';
```

- [ ] **Step 3: Kiểm chứng toàn cục**

Run: `npx vitest run` → mọi test xanh.
Run: `npx tsc --noEmit -p tsconfig.json` → sạch.
Run: `npx eslint api/_lib/kernel --ext .ts` → sạch.
Run: `node scripts/build-kernel.mjs` → ghi `api/_lib/kernel-dist/index.mjs` không lỗi; bundle chứa `runAnalysis`.

- [ ] **Step 4: Commit mốc**
```bash
git commit --allow-empty -m "chore(engine): Đợt A phần 2 xong — hình học tham số + optimize/solve (Câu 9 & Câu 10 qua runAnalysis)"
```

---

## Self-Review (đã rà)

- **Phủ outline đã duyệt:** (1) expr = Task 1; (2) toạ độ theo tham số = numify trong Task 4; (3) điều phối solve/optimize = Task 2 + Task 4; (4) recognize áp lên đáp = Task 4; (5) prompt = Task 6; (6) test Câu 9+10 = Task 5.
- **Chống ảo giác:** LLM chỉ khai báo hình + tham số + mục tiêu; mọi tính toán ở engine. solve kiểm residual; optimize dùng lưới+golden; đáp số qua `recognizeConstant`.
- **An toàn:** KHÔNG sửa `run()`. Chỉ THÊM op/query mới (không đổi hành vi cũ) + module analysis cô lập + `runAnalysis`/`runAny` mới.
- **Nhất quán kiểu:** `evalExpr(src, env): number`; `optimizeParam/solveParam` nhận `(x:number)=>number`; `runAnalysis(raw): AnalysisResult`; `oxyz_circumsphere_offset` tạo sphere (chỉ vào `OXYZ_OPS`); `sphere_metric` trả `{approx,text,...}`. Golden truy vết tay: Câu 9 R=10−2√7; Câu 10 max≈16,518 tại sinθ≈0,878; solve d(O,P)=3→t=3.
- **Không placeholder:** expr.ts, paramsolve.ts, runAnalysis.ts có mã đầy đủ; các bước sửa oxyz/query/prompt có snippet chính xác + vị trí chèn.
