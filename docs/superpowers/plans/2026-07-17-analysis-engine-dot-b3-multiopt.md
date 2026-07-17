# Đợt B3 — Ràng buộc đạo hàm + tối ưu nhiều biến → Câu 5 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LLM khai báo *"f là hàm bậc ba qua (0,0),(2,4),(3,0) và có CỰC ĐẠI tại x=2"* + *"tìm khoảng cách ngắn nhất tới đường y=(x+1)/(x−2)"*; **ENGINE tự khớp hàm (kể cả điều kiện f'(2)=0) và tự tối ưu 2 biến**. Đích: **Câu 5 → 7,49 m**.

**Architecture:** `fitPoly` nhận thêm **ràng buộc đạo hàm** (`slopeAt`) — mỗi ràng buộc là một hàng nữa của hệ tuyến tính. `paramsolve` thêm `optimizeMulti` (lưới thô + hạ toạ độ bằng golden-section). `runAnalysis` thêm kiểu `analyze: optimize_multi` (objective là **biểu thức**). Vẫn KHÔNG sửa `run()`.

**Tech Stack:** TypeScript, Zod, Vitest, esbuild. Dựa trên `polyfit.ts`, `paramsolve.ts`, `expr.ts`, `runAnalysis.ts`.

---

## File Structure

- **Sửa:** `api/_lib/kernel/analysis/polyfit.ts` — `fitPoly(degree, through, leading?, slopeAt?)`.
- **Sửa:** `api/_lib/kernel/analysis/paramsolve.ts` — thêm `optimizeMulti`.
- **Sửa:** `api/_lib/kernel/analysis/runAnalysis.ts` — `functions.slopeAt`, kiểu `analyze: optimize_multi`.
- **Sửa:** `api/_lib/kernel/analysis/solids.ts` — kẹp đối số `acos` (gia cố, fuzz của giám khảo Đợt C phát hiện).
- **Sửa:** `api/_lib/kernel-bridge/translatorPrompt.js` — dạy LLM `slopeAt` + `optimize_multi`.
- **Tạo test:** `analysis/__tests__/cau5-contract.test.ts`; bổ sung `polyfit.test.ts`, `paramsolve.test.ts`.

---

## Task 1: `fitPoly` — ràng buộc đạo hàm (`slopeAt`)

**Files:** Modify `api/_lib/kernel/analysis/polyfit.ts` · Test `api/_lib/kernel/analysis/__tests__/polyfit.test.ts`

- [ ] **Step 1: Test đỏ** — THÊM vào cuối `describe('polyfit', ...)`:

```ts
  it('ràng buộc ĐẠO HÀM: bậc 3 qua (0,0),(2,4),(3,0) + f\'(2)=0 → f = -x³+3x²', () => {
    const c = fitPoly(3, [[0, 0], [2, 4], [3, 0]], undefined, [[2, 0]]);
    expect(c[0]).toBeCloseTo(0, 9);
    expect(c[1]).toBeCloseTo(0, 9);
    expect(c[2]).toBeCloseTo(3, 9);
    expect(c[3]).toBeCloseTo(-1, 9);
  });

  it('slopeAt phối hợp với leading đã ghim', () => {
    // bậc 2, ghim hệ số đầu = -1/3, chỉ cần 2 ràng buộc: qua (0,0) và f'(4)=0 (đỉnh tại x=4)
    const c = fitPoly(2, [[0, 0]], -1 / 3, [[4, 0]]);
    expect(c[0]).toBeCloseTo(0, 9);
    expect(c[1]).toBeCloseTo(8 / 3, 9);   // f'(x) = -2x/3 + c1 ; f'(4)=0 ⇒ c1 = 8/3
    expect(c[2]).toBeCloseTo(-1 / 3, 9);
  });

  it('tổng ràng buộc sai số lượng → ném', () => {
    expect(() => fitPoly(3, [[0, 0], [2, 4]], undefined, [[2, 0]])).toThrow(); // 3 ràng buộc cho 4 ẩn
  });
```

- [ ] **Step 2: Chạy — ĐỎ** (`fitPoly` chưa nhận tham số thứ 4)

- [ ] **Step 3: Cài đặt** — trong `polyfit.ts`, THAY toàn bộ hàm `fitPoly` bằng:

```ts
// Khớp đa thức bậc `degree` qua `through` VÀ các ràng buộc đạo hàm `slopeAt` ([x, f'(x)]).
// Nếu `leading` cho trước ⇒ hệ số bậc cao nhất bị GHIM, chỉ khớp `degree` hệ số còn lại.
// Tổng số ràng buộc (through + slopeAt) phải BẰNG số ẩn.
export function fitPoly(
  degree: number, through: [number, number][], leading?: number, slopeAt: [number, number][] = [],
): number[] {
  const nUnknown = leading === undefined ? degree + 1 : degree;
  const nGiven = through.length + slopeAt.length;
  if (nGiven !== nUnknown) {
    throw new Error(`fitPoly: cần ${nUnknown} ràng buộc cho bậc ${degree}${leading === undefined ? '' : ' (đã ghim hệ số đầu)'}, nhận ${nGiven}`);
  }
  const A: number[][] = [];
  const b: number[] = [];
  // Ràng buộc giá trị: c0 + c1·x + ... = y (trừ phần hệ số đã ghim).
  for (const [x, y] of through) {
    const row: number[] = [];
    for (let k = 0; k < nUnknown; k++) row.push(Math.pow(x, k));
    A.push(row);
    b.push(leading === undefined ? y : y - leading * Math.pow(x, degree));
  }
  // Ràng buộc đạo hàm: Σ k·c_k·x^(k−1) = s (trừ phần hệ số đã ghim).
  for (const [x, s] of slopeAt) {
    const row: number[] = [];
    for (let k = 0; k < nUnknown; k++) row.push(k === 0 ? 0 : k * Math.pow(x, k - 1));
    A.push(row);
    b.push(leading === undefined ? s : s - degree * leading * Math.pow(x, degree - 1));
  }
  const sol = solveLinear(A, b);
  return leading === undefined ? sol : [...sol, leading];
}
```

- [ ] **Step 4: XANH + tsc + lint + full suite** (Câu 1 dùng `fitPoly` — KHÔNG được hồi quy)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/polyfit.ts api/_lib/kernel/analysis/__tests__/polyfit.test.ts
git commit -m "feat(engine): fitPoly nhận ràng buộc đạo hàm (slopeAt)"
```

---

## Task 2: `optimizeMulti` — tối ưu nhiều biến

**Files:** Modify `api/_lib/kernel/analysis/paramsolve.ts` · Test `api/_lib/kernel/analysis/__tests__/paramsolve.test.ts`

- [ ] **Step 1: Test đỏ** — THÊM vào `paramsolve.test.ts`:

```ts
import { optimizeMulti } from '../paramsolve';

describe('optimizeMulti', () => {
  it('min của (x−1)² + (y+2)² trên [-5,5]² → (1,−2), giá trị 0', () => {
    const r = optimizeMulti((v) => (v[0] - 1) ** 2 + (v[1] + 2) ** 2, [-5, -5], [5, 5], 'min');
    expect(r.xs[0]).toBeCloseTo(1, 5);
    expect(r.xs[1]).toBeCloseTo(-2, 5);
    expect(r.value).toBeCloseTo(0, 8);
  });

  it('max của −(x−2)² − (y−3)² + 7 → 7 tại (2,3)', () => {
    const r = optimizeMulti((v) => -((v[0] - 2) ** 2) - ((v[1] - 3) ** 2) + 7, [0, 0], [5, 5], 'max');
    expect(r.value).toBeCloseTo(7, 8);
  });

  it('Câu 5: khoảng cách ngắn nhất giữa f=-x³+3x² và g=(x+1)/(x−2) (đơn vị ×10 m)', () => {
    const f = (x: number) => -(x ** 3) + 3 * x * x;
    const g = (x: number) => (x + 1) / (x - 2);
    const r = optimizeMulti((v) => 10 * Math.hypot(v[0] - v[1], f(v[0]) - g(v[1])), [2, 2.05], [3, 7], 'min');
    expect(r.value).toBeCloseTo(7.485, 2);
    expect(r.xs[0]).toBeCloseTo(2.369, 2);
    expect(r.xs[1]).toBeCloseTo(3.069, 2);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

- [ ] **Step 3: Cài đặt** — THÊM vào cuối `paramsolve.ts`:

```ts
// Tối ưu NHIỀU biến trên hộp [los,his]: lưới thô tìm ô tốt nhất, rồi HẠ TOẠ ĐỘ — lặp golden-section
// theo từng chiều (cửa sổ ±h quanh điểm hiện tại, nên điểm có thể "đi bộ" ra khỏi ô ban đầu).
export function optimizeMulti(
  f: (xs: number[]) => number, los: number[], his: number[], sense: 'max' | 'min',
  gridPerDim = 40, rounds = 60,
): { xs: number[]; value: number } {
  const n = los.length;
  const sign = sense === 'max' ? 1 : -1;
  let best = { xs: los.slice(), v: -Infinity };
  const total = Math.pow(gridPerDim + 1, n);
  for (let t = 0; t < total; t++) {
    let rem = t;
    const xs: number[] = [];
    for (let d = 0; d < n; d++) {
      const i = rem % (gridPerDim + 1);
      rem = Math.floor(rem / (gridPerDim + 1));
      xs.push(los[d] + ((his[d] - los[d]) * i) / gridPerDim);
    }
    const v = sign * f(xs);
    if (v > best.v) best = { xs, v };
  }
  const xs = best.xs.slice();
  const gr = (Math.sqrt(5) - 1) / 2;
  for (let r = 0; r < rounds; r++) {
    for (let d = 0; d < n; d++) {
      const h = (his[d] - los[d]) / gridPerDim;
      let a = Math.max(los[d], xs[d] - h);
      let b = Math.min(his[d], xs[d] + h);
      let c = b - gr * (b - a);
      let e = a + gr * (b - a);
      for (let k = 0; k < 80; k++) {
        const xc = xs.slice(); xc[d] = c;
        const xe = xs.slice(); xe[d] = e;
        if (sign * f(xc) > sign * f(xe)) b = e; else a = c;
        c = b - gr * (b - a); e = a + gr * (b - a);
        if (b - a < 1e-13) break;
      }
      xs[d] = (a + b) / 2;
    }
  }
  return { xs, value: f(xs) };
}
```

- [ ] **Step 4: XANH + lint** (`npx vitest run .../paramsolve.test.ts` → PASS 7/7)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/paramsolve.ts api/_lib/kernel/analysis/__tests__/paramsolve.test.ts
git commit -m "feat(engine): paramsolve optimizeMulti — tối ưu nhiều biến (lưới + hạ toạ độ)"
```

---

## Task 3: `runAnalysis` — `functions.slopeAt` + kiểu `optimize_multi`

**Files:** Modify `api/_lib/kernel/analysis/runAnalysis.ts` · Test `api/_lib/kernel/analysis/__tests__/runAnalysis-multiopt.test.ts`

- [ ] **Step 1: Test đỏ** — tạo `api/_lib/kernel/analysis/__tests__/runAnalysis-multiopt.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis — slopeAt + optimize_multi', () => {
  it('khớp hàm có f\'(2)=0 rồi tối ưu 2 biến', () => {
    const r = runAnalysis({
      solidName: 'c5',
      functions: [{ name: 'f', form: 'poly', degree: 3, through: [[0, 0], [2, 4], [3, 0]], slopeAt: [[2, 0]] }],
      parameters: [{ name: 'a', domain: [2, 3] }, { name: 'b', domain: [2.05, 7] }],
      analyze: {
        kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min',
        objective: { kind: 'expr', expr: 'sqrt((a-b)^2 + (f(a)-(b+1)/(b-2))^2)' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(0.7485, 3);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (`Invalid analysis plan`)

- [ ] **Step 3: Cài đặt** — sửa `api/_lib/kernel/analysis/runAnalysis.ts`:

(a) Import: thêm `optimizeMulti` vào dòng import từ `'./paramsolve'`.

(b) Trong khối `functions` của `AnalysisPlanSchema`, THÊM trường:
```ts
    slopeAt: z.array(z.tuple([NumOrExpr, NumOrExpr])).default([]),
```
(c) THÊM thành viên vào `AnalyzeSchema`:
```ts
  z.object({ kind: z.literal('optimize_multi'), parameters: z.array(z.string()).min(2), sense: z.enum(['max', 'min']), objective: ScalarSource }),
```
(d) Trong `fitAt`, truyền `slopeAt` vào `fitPoly` — THAY dòng gọi `fitPoly` bằng:
```ts
      const slopes = fd.slopeAt.map(([sx, ss]) => [evalExpr(String(sx), env), evalExpr(String(ss), env)] as [number, number]);
      const c = fitPoly(fd.degree, pts, lead, slopes);
```
(e) Ngay SAU nhánh `if (plan.analyze.kind === 'eval') {...}`, thêm nhánh nhiều biến:
```ts
  // ---- optimize_multi: tối ưu nhiều tham số; objective PHẢI là biểu thức (chưa hỗ trợ query hình học) ----
  if (plan.analyze.kind === 'optimize_multi') {
    const az = plan.analyze;
    const src = az.objective;
    if (!isExprSrc(src)) return fail(az.parameters.join(','), 'optimize_multi chỉ nhận objective dạng "expr"');
    const decls = az.parameters.map((nm) => plan.parameters.find((p) => p.name === nm));
    const missing = az.parameters.find((nm, i) => !decls[i]);
    if (missing) return fail(az.parameters.join(','), `parameter "${missing}" chưa khai báo`);
    try {
      const los = decls.map((d) => evalExpr(String(d!.domain[0]), {}));
      const his = decls.map((d) => evalExpr(String(d!.domain[1]), {}));
      const objective = (xs: number[]): number => {
        const env: Env = {};
        az.parameters.forEach((nm, i) => { env[nm] = xs[i]; });
        return evalExpr(src.expr, env, fitAt(env).funcs);
      };
      const best = optimizeMulti(objective, los, his, az.sense);
      const nice = recognizeConstant(best.value);
      return {
        ok: Number.isFinite(best.value), parameter: { name: az.parameters.join(','), value: NaN },
        answer: { approx: best.value, text: nice ? nice.text : best.value.toFixed(4), approximate: !nice },
        violations: [], errors: [],
      };
    } catch (e) { return fail(az.parameters.join(','), (e as Error).message); }
  }
```

- [ ] **Step 4: XANH + tsc + lint + full suite** (Câu 1/4/8/9/10 KHÔNG hồi quy)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/runAnalysis.ts api/_lib/kernel/analysis/__tests__/runAnalysis-multiopt.test.ts
git commit -m "feat(engine): runAnalysis — functions.slopeAt + kiểu analyze optimize_multi"
```

---

## Task 4: Hợp đồng Câu 5 + gia cố lensArea + prompt + rebuild + mốc

**Files:** Test `api/_lib/kernel/analysis/__tests__/cau5-contract.test.ts` · Modify `api/_lib/kernel/analysis/solids.ts`, `api/_lib/kernel-bridge/translatorPrompt.js`

- [ ] **Step 1: Test hợp đồng Câu 5**

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 5 (hồ bơi) qua runAnalysis', () => {
  it('MN ngắn nhất từ đường cong bậc ba tới đường nhựa ≈ 7,49 m', () => {
    const r = runAnalysis({
      solidName: 'pool',
      // f: bậc ba qua O(0,0), B(2,4), C(3,0); B là CỰC ĐẠI ⇒ f'(2)=0. Engine tự khớp ⇒ f = -x³+3x².
      functions: [{ name: 'f', form: 'poly', degree: 3, through: [[0, 0], [2, 4], [3, 0]], slopeAt: [[2, 0]] }],
      // a chạy trên đồ thị f (nhánh B→C), b chạy trên đường nhựa g(x)=(x+1)/(x-2), x>2.
      parameters: [{ name: 'a', domain: [2, 3] }, { name: 'b', domain: [2.05, 7] }],
      analyze: {
        kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min',
        // ×10 vì đơn vị mỗi trục là 10 m.
        objective: { kind: 'expr', expr: '10*sqrt((a-b)^2 + (f(a)-(b+1)/(b-2))^2)' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(7.485, 2);
    expect(Number(r.answer.approx.toFixed(2))).toBe(7.49);
  });
});
```

- [ ] **Step 2: Chạy — kỳ vọng XANH**

- [ ] **Step 3: Gia cố `lensArea`** — trong `api/_lib/kernel/analysis/solids.ts`, THAY hai dòng `a1`/`a2` bằng bản có kẹp đối số (fuzz của giám khảo Đợt C: nhiễu 1 ULP sát biên tiếp xúc có thể đẩy đối số `acos` vượt ±1 → NaN):

```ts
  const clamp1 = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);
  const a1 = r1 * r1 * Math.acos(clamp1((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)));
  const a2 = r2 * r2 * Math.acos(clamp1((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)));
```

- [ ] **Step 4: Dạy LLM** — chèn vào `TRANSLATOR_PROMPT` (ngay trước dòng "CHỈ trả về JSON"):

```
## HÀM CÓ ĐIỀU KIỆN CỰC TRỊ / TỐI ƯU NHIỀU BIẾN
- Đề cho "B(2;4) là điểm CỰC ĐẠI của f" ⇒ đó là ràng buộc ĐẠO HÀM, khai báo:
    { "name":"f", "form":"poly", "degree":3, "through":[[0,0],[2,4],[3,0]], "slopeAt":[[2,0]] }
  (slopeAt: [[x, f'(x)]]. Tổng số ràng buộc through + slopeAt phải BẰNG số hệ số cần tìm.)
- Khoảng cách ngắn nhất giữa HAI đường cong (điểm chạy trên cả hai) ⇒ tối ưu HAI tham số:
    "parameters": [ {"name":"a","domain":[2,3]}, {"name":"b","domain":[2.05,7]} ],
    "analyze": { "kind":"optimize_multi", "parameters":["a","b"], "sense":"min",
                 "objective": { "kind":"expr", "expr":"sqrt((a-b)^2 + (f(a)-g(b))^2)" } }
  · objective của optimize_multi PHẢI là "expr". Hàm cho SẴN trong đề (vd g(x)=(x+1)/(x-2)) cứ viết
    thẳng vào expr: "(b+1)/(b-2)" — không cần khai báo trong "functions".
  · Nếu đơn vị mỗi trục là 10 m thì nhân 10 trong expr để ra mét.
```

- [ ] **Step 5: Kiểm chứng toàn cục + rebuild**

Run: `npx vitest run` → toàn bộ xanh. `npx tsc --noEmit -p tsconfig.json` sạch. `npx eslint api/_lib/kernel --ext .ts` sạch. `node scripts/build-kernel.mjs` không lỗi.

- [ ] **Step 6: Commit mốc**
```bash
git add -A
git commit -m "feat(engine): Đợt B3 xong — slopeAt + tối ưu nhiều biến, Câu 5 giải trọn (7,49 m)"
```

---

## Self-Review (đã rà)

- **Phủ mục tiêu:** slopeAt = Task 1; optimizeMulti = Task 2; nối runAnalysis = Task 3; Câu 5 + gia cố + prompt = Task 4.
- **Chống ảo giác:** LLM chỉ khai báo điểm đi qua + điều kiện cực đại (f'(2)=0) + hàm cho sẵn của đề; ENGINE khớp hệ số và tối ưu. Không LLM nào phải đạo hàm hay giải hệ.
- **An toàn:** `run()` KHÔNG đổi; `fitPoly` thêm tham số CÓ MẶC ĐỊNH (`slopeAt = []`) nên mọi lời gọi cũ (Câu 1) không đổi hành vi; `optimize_multi` là kiểu MỚI, không đụng optimize/solve/integrate/eval.
- **Nhất quán kiểu:** `fitPoly(degree, through, leading?, slopeAt?)`; `optimizeMulti(f, los, his, sense, gridPerDim?, rounds?) → {xs, value}`. Golden ĐÃ CHẠY KIỂM: `fitPoly(3,[[0,0],[2,4],[3,0]],undefined,[[2,0]]) = [0,0,3,−1]`; Câu 5 = **7,4851 m tại a=2,3694 · b=3,0689**.
- **Giới hạn có chủ ý (ghi rõ):** `optimize_multi` chỉ nhận objective `expr` (chưa ghép hình học nhiều tham số) — đủ cho Câu 5.
- **Không placeholder:** mọi bước có mã đầy đủ + lệnh + kỳ vọng.
