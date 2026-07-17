# Đợt B1 — Tầng hàm số (khớp · tiếp tuyến · cực trị) → Câu 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LLM khai báo *"f là parabol qua (0,0),(8,0), hệ số đầu là tham số a"* + *"tiếp tuyến tại x=6"*; **ENGINE tự khớp hệ số, tự đạo hàm, tự tìm đỉnh**. Đích: **Câu 1 (đống rơm) chạy trọn** qua `runAnalysis` → đỉnh cao **16/3 m = 533 cm**.

**Architecture:** Tầng hàm số nằm **hoàn toàn trong lớp analysis** — `runAnalysis` khớp hàm tại mỗi giá trị tham số rồi **hạ** các op hàm (`curve_point`/`tangent_line`/`curve_extremum`) thành op hình học thường (`oxyz_point`/`oxyz_line`) với toạ độ SỐ, trước khi gọi `run()`. Engine hình học **không đổi**. Chống ảo giác: LLM không đạo hàm, không khớp hệ số.

**Tech Stack:** TypeScript, Zod, Vitest, esbuild. Dùng lại `expr.ts`, `paramsolve.ts`, `recognize.ts`, `runAnalysis.ts` (Đợt A) và `run()`/`computeQuery` sẵn có.

---

## File Structure

- **Tạo:** `api/_lib/kernel/analysis/polyfit.ts` — `fitPoly` (khử Gauss, có thể ghim hệ số đầu), `evalPoly`, `derivPoly`, `extremumOfPoly`.
- **Sửa:** `api/_lib/kernel/compute/query.ts` — thêm truy vấn `point_coord` (đọc toạ độ một điểm).
- **Sửa:** `api/_lib/kernel/analysis/runAnalysis.ts` — thêm `functions` vào schema + hạ op hàm trong `concreteOps`.
- **Sửa:** `api/_lib/kernel-bridge/translatorPrompt.js` — dạy LLM khối `functions` + op hàm.
- **Tạo test:** `analysis/__tests__/polyfit.test.ts`, `analysis/__tests__/cau1-contract.test.ts`; sửa `compute/__tests__/` cho `point_coord`.

---

## Task 1: `polyfit.ts` — khớp / tính / đạo hàm / cực trị đa thức

**Files:** Create `api/_lib/kernel/analysis/polyfit.ts` · Test `api/_lib/kernel/analysis/__tests__/polyfit.test.ts`

- [ ] **Step 1: Test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { fitPoly, evalPoly, derivPoly, extremumOfPoly } from '../polyfit';

describe('polyfit', () => {
  it('khớp có GHIM hệ số đầu: bậc 2 qua (0,0),(8,0), a=-1/3 → f(x)=-x²/3+8x/3', () => {
    const c = fitPoly(2, [[0, 0], [8, 0]], -1 / 3); // [c0,c1,c2]
    expect(c[0]).toBeCloseTo(0, 10);
    expect(c[1]).toBeCloseTo(8 / 3, 10);
    expect(c[2]).toBeCloseTo(-1 / 3, 10);
  });

  it('khớp ĐỦ điểm: bậc 2 qua (0,10),(20,14),(40,10) → r(z)=-z²/100+0.4z+10', () => {
    const c = fitPoly(2, [[0, 10], [20, 14], [40, 10]]);
    expect(c[0]).toBeCloseTo(10, 10);
    expect(c[1]).toBeCloseTo(0.4, 10);
    expect(c[2]).toBeCloseTo(-0.01, 10);
  });

  it('evalPoly + derivPoly', () => {
    const c = [0, 8 / 3, -1 / 3];
    expect(evalPoly(c, 6)).toBeCloseTo(4, 10);   // f(6)=4
    expect(evalPoly(c, 0)).toBeCloseTo(0, 10);
    const d = derivPoly(c);                       // f'(x) = 8/3 - 2x/3
    expect(evalPoly(d, 6)).toBeCloseTo(-4 / 3, 10);
  });

  it('extremumOfPoly: đỉnh parabol tại x=4, y=16/3', () => {
    const r = extremumOfPoly([0, 8 / 3, -1 / 3], 0, 8);
    expect(r).not.toBeNull();
    expect(r!.x).toBeCloseTo(4, 6);
    expect(r!.y).toBeCloseTo(16 / 3, 6);
  });

  it('sai số điểm → ném', () => {
    expect(() => fitPoly(2, [[0, 0]], -1 / 3)).toThrow();
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (`npx vitest run api/_lib/kernel/analysis/__tests__/polyfit.test.ts` → module not found)

- [ ] **Step 3: Cài đặt `polyfit.ts`**

```ts
// api/_lib/kernel/analysis/polyfit.ts
// Tầng HÀM SỐ cho engine giải tích: khớp đa thức qua điểm (có thể ghim hệ số bậc cao nhất = tham số
// tự do), tính giá trị, đạo hàm, và tìm cực trị. Tất cả bằng SỐ — engine làm, LLM không phải đạo hàm.
// Hệ số luôn theo thứ tự [c0, c1, ..., cn] ứng với c0 + c1·x + ... + cn·xⁿ.
import { solveParam } from './paramsolve';

// Khử Gauss có chọn trụ (hệ nhỏ, n ≤ 6). Ném nếu suy biến.
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) throw new Error('Khớp đa thức: hệ suy biến (điểm trùng/không xác định)');
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// Khớp đa thức bậc `degree` qua `through`. Nếu `leading` cho trước ⇒ hệ số bậc cao nhất bị GHIM và
// chỉ khớp `degree` hệ số còn lại (cần đúng `degree` điểm); ngược lại cần `degree+1` điểm.
export function fitPoly(degree: number, through: [number, number][], leading?: number): number[] {
  const nUnknown = leading === undefined ? degree + 1 : degree;
  if (through.length !== nUnknown) {
    throw new Error(`fitPoly: cần ${nUnknown} điểm cho bậc ${degree}${leading === undefined ? '' : ' (đã ghim hệ số đầu)'}, nhận ${through.length}`);
  }
  const A: number[][] = [];
  const b: number[] = [];
  for (const [x, y] of through) {
    const row: number[] = [];
    for (let k = 0; k < nUnknown; k++) row.push(Math.pow(x, k));
    A.push(row);
    b.push(leading === undefined ? y : y - leading * Math.pow(x, degree));
  }
  const sol = solveLinear(A, b);
  return leading === undefined ? sol : [...sol, leading];
}

// Horner.
export function evalPoly(c: number[], x: number): number {
  let s = 0;
  for (let k = c.length - 1; k >= 0; k--) s = s * x + c[k];
  return s;
}

export function derivPoly(c: number[]): number[] {
  const d: number[] = [];
  for (let k = 1; k < c.length; k++) d.push(k * c[k]);
  return d.length ? d : [0];
}

// Cực trị = nghiệm f'(x)=0 trong [lo,hi] (dùng bộ giải số sẵn có). null nếu không có.
export function extremumOfPoly(c: number[], lo: number, hi: number): { x: number; y: number } | null {
  const d = derivPoly(c);
  const r = solveParam((x) => evalPoly(d, x), 0, lo, hi);
  if (!r) return null;
  return { x: r.x, y: evalPoly(c, r.x) };
}
```

- [ ] **Step 4: XANH + lint** (`npx vitest run .../polyfit.test.ts` → PASS 5/5; `npx eslint api/_lib/kernel/analysis/polyfit.ts` → 0)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/polyfit.ts api/_lib/kernel/analysis/__tests__/polyfit.test.ts
git commit -m "feat(engine): analysis polyfit — khớp/tính/đạo hàm/cực trị đa thức"
```

---

## Task 2: Truy vấn `point_coord` (đọc toạ độ một điểm)

**Files:** Modify `api/_lib/kernel/compute/query.ts` · Test `api/_lib/kernel/compute/__tests__/point-coord.test.ts`

- [ ] **Step 1: Test đỏ** — tạo `api/_lib/kernel/compute/__tests__/point-coord.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { run } from '../../run';

describe('truy vấn point_coord', () => {
  it('đọc từng toạ độ, giữ exact khi có', () => {
    const res = run({
      solidName: 'p',
      ops: [{ op: 'oxyz_point', name: 'A', at: ['3/2', 'sqrt(2)', 5] }],
      queries: [
        { kind: 'point_coord', target: 'A', axis: 'x' },
        { kind: 'point_coord', target: 'A', axis: 'y' },
        { kind: 'point_coord', target: 'A', axis: 'z' },
      ],
    });
    expect(res.ok).toBe(true);
    expect((res.answers[0] as { text: string }).text).toBe('3/2');
    expect((res.answers[1] as { text: string }).text).toBe('√2');
    expect((res.answers[2] as { approx: number }).approx).toBeCloseTo(5, 12);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

- [ ] **Step 3: Cài đặt** — trong `api/_lib/kernel/compute/query.ts`:

(a) Thêm thành viên vào union `QueryESchema` (đặt cạnh các query khác):
```ts
  z.object({ kind: z.literal('point_coord'), target: Tok, axis: z.enum(['x', 'y', 'z']) }),
```
(b) Thêm `certifyScalar` vào dòng import từ `'./answer'` (giữ các import cũ, chỉ thêm nếu chưa có).
(c) Thêm case trong `computeQuery` switch:
```ts
      case 'point_coord': {
        const e = resolveEntityE(query.target, et);
        if (e.kind !== 'point') return { ok: false, problem: 'point_coord needs a point' };
        const s = query.axis === 'x' ? e.p.x : query.axis === 'y' ? e.p.y : e.p.z;
        return { ok: true, answer: certifyScalar('point_coord', s, s.approx) };
      }
```

- [ ] **Step 4: XANH + tsc + lint** (`npx vitest run .../point-coord.test.ts`; `npx tsc --noEmit -p tsconfig.json`; `npx eslint api/_lib/kernel --ext .ts`)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/compute/query.ts api/_lib/kernel/compute/__tests__/point-coord.test.ts
git commit -m "feat(engine): truy vấn point_coord (đọc toạ độ điểm, giữ exact)"
```

---

## Task 3: `runAnalysis` — khối `functions` + hạ op hàm thành op hình học

**Files:** Modify `api/_lib/kernel/analysis/runAnalysis.ts` · Test `api/_lib/kernel/analysis/__tests__/runAnalysis-functions.test.ts`

- [ ] **Step 1: Test đỏ** — tạo `api/_lib/kernel/analysis/__tests__/runAnalysis-functions.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis — tầng hàm số', () => {
  it('curve_point + tangent_line + curve_extremum (hàm cố định, không tham số hoá hệ số)', () => {
    // f = parabol qua (0,0),(8,0) với hệ số đầu ghim bằng tham số a; ở đây khoá a bằng miền hẹp quanh -1/3.
    const r = runAnalysis({
      solidName: 'f',
      parameters: [{ name: 'a', domain: [-2, -0.01] }],
      functions: [{ name: 'f', form: 'poly', degree: 2, through: [[0, 0], [8, 0]], leading: 'a' }],
      ops: [
        { op: 'curve_point', name: 'B', f: 'f', x: 6 },
        { op: 'curve_extremum', name: 'V', f: 'f', domain: [0, 8] },
      ],
      analyze: {
        kind: 'solve', parameter: 'a',
        constraint: { of: { kind: 'point_coord', target: 'B', axis: 'y' }, equals: 4 }, // f(6)=4 ⇔ a=-1/3
        report: { kind: 'point_coord', target: 'V', axis: 'y' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(-1 / 3, 6);
    expect(r.answer.approx).toBeCloseTo(16 / 3, 5); // đỉnh
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (schema chưa có `functions`/op hàm → Invalid analysis plan)

- [ ] **Step 3: Cài đặt** — trong `api/_lib/kernel/analysis/runAnalysis.ts`:

(a) Thêm import:
```ts
import { fitPoly, evalPoly, derivPoly, extremumOfPoly } from './polyfit';
```
(b) Thêm `functions` vào `AnalysisPlanSchema` (bên trong `.extend({...})`, cạnh `parameters`):
```ts
  functions: z.array(z.object({
    name: z.string(),
    form: z.literal('poly'),
    degree: z.number().int().min(1),
    through: z.array(z.tuple([NumOrExpr, NumOrExpr])),
    leading: z.string().optional(), // tên tham số dùng làm hệ số bậc cao nhất (để trống ⇒ khớp đủ điểm)
  })).default([]),
```
(c) Trong `concreteOps`, TRƯỚC vòng `plan.ops.map(...)`, khớp mọi hàm tại giá trị tham số rồi HẠ op hàm.
Thay toàn bộ thân `concreteOps` bằng:
```ts
  const concreteOps = (value: number): unknown[] => {
    const env = { [pname]: value };
    // 1) Khớp hàm tại giá trị tham số hiện tại (engine tự khớp — LLM không tính).
    const fitted: Record<string, number[]> = {};
    for (const fd of plan.functions) {
      const pts = fd.through.map(([px, py]) => [evalExpr(String(px), env), evalExpr(String(py), env)] as [number, number]);
      const lead = fd.leading !== undefined ? evalExpr(fd.leading, env) : undefined;
      fitted[fd.name] = fitPoly(fd.degree, pts, lead);
    }
    const needFn = (name: string): number[] => {
      const c = fitted[name];
      if (!c) throw new Error(`Hàm "${name}" chưa khai báo trong functions`);
      return c;
    };
    // 2) Hạ op hàm → op hình học SỐ; thay tham số trong op hình học thường.
    return plan.ops.map((op) => {
      const o = op as Record<string, unknown>;
      if (o.op === 'curve_point') {
        const c = needFn(o.f as string);
        const x = evalExpr(String(o.x), env);
        return { op: 'oxyz_point', name: o.name, at: [x, evalPoly(c, x), 0] };
      }
      if (o.op === 'tangent_line') {
        const c = needFn(o.f as string);
        const x = evalExpr(String(o.x), env);
        const slope = evalPoly(derivPoly(c), x);
        return { op: 'oxyz_line', name: o.name, by: { form: 'point_dir', base: [x, evalPoly(c, x), 0], dir: [1, slope, 0] } };
      }
      if (o.op === 'curve_extremum') {
        const c = needFn(o.f as string);
        const dom = o.domain as [number | string, number | string];
        const ex = extremumOfPoly(c, evalExpr(String(dom[0]), env), evalExpr(String(dom[1]), env));
        if (!ex) throw new Error(`curve_extremum: hàm "${o.f as string}" không có cực trị trong miền`);
        return { op: 'oxyz_point', name: o.name, at: [ex.x, ex.y, 0] };
      }
      if (o.op === 'oxyz_point' && Array.isArray(o.at)) return { ...o, at: (o.at as (number | string)[]).map((c) => numify(c, env, paramNames)) };
      if (o.op === 'oxyz_circumsphere_offset') return { ...o, t: numify(o.t as number | string, env, paramNames) };
      return op;
    });
  };
```
Ghi chú: `evalQuery` bắt lỗi qua `run()`; nếu `concreteOps` NÉM (vd không có cực trị tại một giá trị tham số), bọc lời gọi trong `evalQuery`/`finalize` bằng try/catch trả `null`/`fail` — thêm:
```ts
  const evalQuery = (value: number, query: unknown): number | null => {
    let ops: unknown[];
    try { ops = concreteOps(value); } catch { return null; }
    const res = run({ solidName: plan.solidName, ops, asserts: [], queries: [query] });
    if (!res.ok || res.answers.length === 0) return null;
    try { return scalarOf(res.answers[0]); } catch { return null; }
  };
```
và trong `finalize`:
```ts
  const finalize = (value: number, query: unknown): AnalysisResult => {
    let ops: unknown[];
    try { ops = concreteOps(value); } catch (e) { return fail(pname, (e as Error).message); }
    const res = run({ solidName: plan.solidName, ops, asserts: plan.asserts, queries: [query] });
    ...giữ nguyên phần còn lại...
  };
```

- [ ] **Step 4: XANH + tsc + lint + full suite** (mọi test cũ phải còn xanh)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/runAnalysis.ts api/_lib/kernel/analysis/__tests__/runAnalysis-functions.test.ts
git commit -m "feat(engine): runAnalysis — khối functions + hạ curve_point/tangent_line/curve_extremum"
```

---

## Task 4: Hợp đồng Câu 1 + prompt + rebuild + mốc

**Files:** Test `api/_lib/kernel/analysis/__tests__/cau1-contract.test.ts` · Modify `api/_lib/kernel-bridge/translatorPrompt.js`

- [ ] **Step 1: Test hợp đồng Câu 1**

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 1 (đống rơm) qua runAnalysis', () => {
  it('thang dài 5 tiếp tuyến tại x=6 → đỉnh cao 16/3 m = 533 cm', () => {
    const r = runAnalysis({
      solidName: 'haystack',
      parameters: [{ name: 'a', domain: [-2, -0.01] }], // đống rơm mở xuống ⇒ a<0
      functions: [{ name: 'f', form: 'poly', degree: 2, through: [[0, 0], [8, 0]], leading: 'a' }],
      ops: [
        { op: 'curve_point', name: 'B', f: 'f', x: 6 },
        { op: 'tangent_line', name: 'T', f: 'f', x: 6 },       // ENGINE đạo hàm
        { op: 'oxyz_plane', name: 'G', by: { form: 'coeffs', a: 0, b: 1, c: 0, d: 0 } }, // mặt đất y=0
        { op: 'oxyz_intersect', name: 'C', a: 'T', b: 'G' },   // thang chạm đất
        { op: 'curve_extremum', name: 'V', f: 'f', domain: [0, 8] },
      ],
      analyze: {
        kind: 'solve', parameter: 'a',
        constraint: { of: { kind: 'distance', a: 'B', b: 'C' }, equals: 5 }, // thang dài 5
        report: { kind: 'point_coord', target: 'V', axis: 'y' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(-1 / 3, 5);  // a = -1/3
    expect(r.answer.approx).toBeCloseTo(16 / 3, 4);    // 5,3333 m
    expect(Math.round(r.answer.approx * 100)).toBe(533); // → 533 cm
  });
});
```

- [ ] **Step 2: Chạy — kỳ vọng XANH** (`npx vitest run api/_lib/kernel/analysis/__tests__/cau1-contract.test.ts`)

Ghi chú nếu ĐỎ: kiểm `oxyz_intersect` line∩plane (đã có từ G2-6) và tên điểm hợp regex `/^[A-Z]\d*'?$/` (B, C, V, T, G đều hợp lệ). KHÔNG sửa test.

- [ ] **Step 3: Dạy LLM khối `functions`** — chèn vào `TRANSLATOR_PROMPT` (ngay trước dòng "CHỈ trả về JSON"):

```
## BÀI CÓ ĐỒ THỊ HÀM SỐ (parabol/bậc ba…) — engine tự khớp & tự đạo hàm
KHÔNG tự tính hệ số, KHÔNG tự đạo hàm, KHÔNG tự tìm đỉnh. Hãy KHAI BÁO:
- "functions": [ { "name":"f", "form":"poly", "degree":2, "through":[[0,0],[8,0]], "leading":"a" } ]
  · "through": các điểm đồ thị ĐI QUA (đề cho). · "leading": tên tham số làm hệ số bậc cao nhất
    (dùng khi đề chưa đủ điểm để xác định hàm); bỏ trống nếu đủ điểm (cần degree+1 điểm).
- Điểm trên đồ thị:  { "op":"curve_point", "name":"B", "f":"f", "x":6 }
- Tiếp tuyến tại x:  { "op":"tangent_line", "name":"T", "f":"f", "x":6 }   ← engine tự đạo hàm
- Đỉnh/cực trị:      { "op":"curve_extremum", "name":"V", "f":"f", "domain":[0,8] }
- Đọc toạ độ điểm:   { "kind":"point_coord", "target":"V", "axis":"y" }
Bài phẳng (Oxy) thì đặt z=0; "mặt đất" y=0 là mặt phẳng { "form":"coeffs", "a":0,"b":1,"c":0,"d":0 }.
```

- [ ] **Step 4: Kiểm chứng toàn cục + rebuild**

Run: `npx vitest run` → mọi test xanh.
Run: `npx tsc --noEmit -p tsconfig.json` → sạch. Run: `npx eslint api/_lib/kernel --ext .ts` → sạch.
Run: `node scripts/build-kernel.mjs` → ghi `api/_lib/kernel-dist/index.mjs` không lỗi.

- [ ] **Step 5: Commit mốc**
```bash
git add -A
git commit -m "feat(engine): Đợt B1 xong — tầng hàm số (khớp/tiếp tuyến/cực trị), Câu 1 giải trọn (533 cm)"
```

---

## Self-Review (đã rà)

- **Phủ mục tiêu:** tầng hàm số = Task 1 + Task 3; `point_coord` = Task 2; Câu 1 end-to-end + prompt = Task 4. Câu 4 (tích phân/quadrature) và Câu 5 (tối ưu 2 tham số) là plan riêng — CỐ Ý ngoài phạm vi.
- **Chống ảo giác:** LLM chỉ khai báo `through`/`leading`/`x`; engine khớp hệ số (`fitPoly`), đạo hàm (`derivPoly`), tìm đỉnh (`extremumOfPoly`). `finalize` vẫn kiểm `asserts` tại nghiệm (đã có).
- **An toàn:** `run()` KHÔNG đổi; op hàm được HẠ thành op hình học trước khi tới kernel; chỉ THÊM query `point_coord`.
- **Nhất quán kiểu:** hệ số luôn `[c0..cn]`; `fitPoly(degree, through, leading?) → number[]`; `extremumOfPoly(c, lo, hi) → {x,y}|null`; op hàm dùng `f` (tên hàm) + `x`/`domain`. Golden truy vết tay: `fitPoly(2,[[0,0],[8,0]],−1/3)=[0,8/3,−1/3]`; `f(6)=4`; `f'(6)=−4/3`; tiếp tuyến chạm đất `C=(9,0)`; `|BC|=5`; đỉnh `(4, 16/3)` → **533 cm**.
- **Không placeholder:** mọi bước có mã đầy đủ + lệnh + kỳ vọng.
