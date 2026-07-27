# Đợt 1 — Tròn xoay quanh Ox (đĩa) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chạy thông trọn vẹn một đường ống calculus mới — từ đề bài "quay miền quanh Ox" tới một khối tròn xoay 3D **bóng, mượt**, kéo tay / play được, thể tích tự tính & tự kiểm — trong chính AdvanceScene sẵn có.

**Architecture:** Thêm kiểu dữ liệu tham số `RevolutionSolid` vào `GeometryData` (đi cùng `points/lines/...` để `projectScene` bóc-lớp và stepper hoạt động y nguyên). Lõi tất định (`api/_lib/kernel/analysis/revolution.ts`) tính thể tích đĩa bằng `integrate` (Simpson) và tự kiểm sai số → `Verified<number>`. Một scene-builder thuần (`buildRevolutionScene`) dựng base từ `buildAnalysisFigure` (bảo đảm gate `points>0`) rồi gắn khối + bước + `anim`. Frontend thêm `<AnimatedRevolutionSolid>` (LatheGeometry + vật liệu physical bóng + mặt phẳng cắt lộ dần + lát mờ "kết đông") do một tham số tiến trình `advanceT ∈ [0,1]` trong `GeometryContext` điều khiển, và `<AdvanceAnimControl>` (thanh kéo + ▶) để scrub/play.

**Tech Stack:** Vite + React + TypeScript (KHÔNG Next.js), @react-three/fiber + three (LatheGeometry, MeshPhysicalMaterial, clippingPlanes), Node ESM kernel, vitest ^2.1.9 (`npm test` = `vitest run`).

---

## File Structure

**Tạo mới:**
- `api/_lib/kernel/analysis/revolution.ts` — lõi thuần: `evalProfile`, `revolutionVolumeDisk`, `buildRevolutionSolidOx`.
- `api/_lib/kernel/analysis/__tests__/revolution.test.ts` — test lõi (y=√x trên [0,4] → 8π).
- `api/_lib/advance/buildRevolutionScene.js` — dựng `AdvanceScene` cho mẫu `rev-ox` từ params đã trích.
- `api/_lib/advance/__tests__/buildRevolutionScene.test.js` — test scene-builder (base có points, khối, bước, anim).
- `src/components/3d/AnimatedRevolutionSolid.tsx` — khối tròn xoay bóng + lộ dần + lát kết đông.
- `src/components/layout/AdvanceAnimControl.tsx` — thanh kéo tay + nút ▶ điều khiển `advanceT`.
- `src/lib/__tests__/advanceProject.revolution.test.ts` — test `projectScene` bóc-lớp `revolutionSolids`.

**Sửa:**
- `src/types/geometry.ts` — thêm `ProfileFn`, `Verified<T>`, `RevolutionSolid`; nới `GeometryData` và `AdvanceStep`.
- `src/lib/advanceProject.ts:13-25` — map `revolutionSolids` qua `flag`.
- `api/_lib/advance/splitPrompt.js` — nhận diện & trích mẫu tròn xoay quanh Ox.
- `api/analyze-advance.js:31-52` — nhánh định tuyến `template` → `buildRevolutionScene`.
- `src/context/GeometryContext.tsx` — state `advanceT`, action `ADVANCE_SET_T`, dispatcher `setAdvanceT`, reset khi đổi bước/scene.
- `src/components/3d/GeometryRenderer.tsx:~389` — render mảng `revolutionSolids`.
- `src/components/layout/AdvanceStepper.tsx` — mount `<AdvanceAnimControl>` khi bước hiện tại có `anim`.

---

## Task 1: Kiểu dữ liệu tròn xoay trong `geometry.ts`

**Files:**
- Modify: `src/types/geometry.ts`
- Test: (kiểm bằng biên dịch ở Task 5/9; không có unit test riêng cho type)

- [ ] **Step 1: Thêm các kiểu mới vào `src/types/geometry.ts`**

Thêm khối sau NGAY TRƯỚC khai báo `interface GeometryData` (giữ mọi kiểu cũ nguyên vẹn):

```ts
// ── Calculus: khối tròn xoay (Đợt 1) ───────────────────────────────
// Biên dạng r(x): khoảng cách từ trục tới mặt, theo tọa độ dọc trục x.
export type ProfileFn =
  | { kind: 'poly'; coeffs: number[] }   // c0 + c1·x + c2·x² + …
  | { kind: 'sqrt'; a: number; b: number } // a·√x + b
  | { kind: 'const'; c: number };

// Kết quả đã (hoặc chưa) tự-kiểm bằng lõi tất định.
export interface Verified<T> {
  value: T;
  latex: string;
  verified: boolean;        // false ⇒ hiển thị "chưa kiểm chứng", không bịa
  estimatedError?: number;
}

export interface RevolutionSolid extends AdvanceFlags {
  id: string;
  outer: ProfileFn;         // biên ngoài r(x)
  inner?: ProfileFn;        // biên trong (washer) — Đợt 2, giữ optional
  axis: 'Ox' | 'Oy';        // Đợt 1 chỉ dùng 'Ox'
  domain: [number, number]; // [a, b]
  method: 'disk' | 'washer' | 'shell';
  volume?: Verified<number>;
  color?: string;
}
```

- [ ] **Step 2: Nới `GeometryData` — thêm một trường**

Trong `interface GeometryData`, thêm dòng (cạnh `curves?`/`surfaces?`):

```ts
  revolutionSolids?: RevolutionSolid[];
```

- [ ] **Step 3: Nới `AdvanceStep` — thêm `anim`**

Trong `interface AdvanceStep`, thêm trường optional:

```ts
  anim?: {
    param: 'sweep' | 'angle' | 'slab' | 'reveal';
    label: string;   // nhãn hiển thị cạnh thanh kéo, ví dụ "Quét tròn xoay"
    tMax: number;    // giá trị vật lý ứng với t=1 (Đợt 1: bằng b của domain)
    autoplay?: boolean;
  };
```

- [ ] **Step 4: Kiểm biên dịch nhanh**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: KHÔNG lỗi mới ở `geometry.ts` (tsc không phải gate build, nhưng phải sạch cho các file vừa đụng).

- [ ] **Step 5: Commit**

```bash
git add src/types/geometry.ts
git commit -m "feat(types): thêm RevolutionSolid/ProfileFn/Verified cho tròn xoay Đợt 1"
```

---

## Task 2: Lõi tính thể tích đĩa (`revolution.ts`) — evalProfile + volume

**Files:**
- Create: `api/_lib/kernel/analysis/revolution.ts`
- Test: `api/_lib/kernel/analysis/__tests__/revolution.test.ts`

- [ ] **Step 1: Viết test thất bại**

Tạo `api/_lib/kernel/analysis/__tests__/revolution.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evalProfile, revolutionVolumeDisk } from '../revolution';

describe('evalProfile', () => {
  it('poly: c0 + c1·x + c2·x²', () => {
    expect(evalProfile({ kind: 'poly', coeffs: [1, 2, 3] }, 2)).toBeCloseTo(1 + 4 + 12, 12);
  });
  it('sqrt: a·√x + b', () => {
    expect(evalProfile({ kind: 'sqrt', a: 2, b: 1 }, 9)).toBeCloseTo(7, 12);
  });
  it('const', () => {
    expect(evalProfile({ kind: 'const', c: 5 }, 123)).toBe(5);
  });
});

describe('revolutionVolumeDisk', () => {
  it('y=√x quay quanh Ox trên [0,4] → 8π', () => {
    const { value, estimatedError } = revolutionVolumeDisk(
      { kind: 'sqrt', a: 1, b: 0 },
      [0, 4],
    );
    expect(value).toBeCloseTo(8 * Math.PI, 6);
    expect(estimatedError).toBeLessThan(1e-6);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/revolution.test.ts`
Expected: FAIL — không import được `../revolution`.

- [ ] **Step 3: Viết `revolution.ts` tối thiểu**

Tạo `api/_lib/kernel/analysis/revolution.ts`:

```ts
// api/_lib/kernel/analysis/revolution.ts
// Lõi tất định cho khối tròn xoay quanh Ox (phương pháp đĩa):
//   V = π ∫_a^b [r(x)]² dx  — tích phân bằng Simpson (integrate) + tự-kiểm sai số.
import type { ProfileFn, RevolutionSolid, Verified } from '../../../../src/types/geometry';
import { integrate } from './quadrature';

export function evalProfile(f: ProfileFn, x: number): number {
  switch (f.kind) {
    case 'poly': return f.coeffs.reduce((acc, c, i) => acc + c * x ** i, 0);
    case 'sqrt': return f.a * Math.sqrt(x) + f.b;
    case 'const': return f.c;
  }
}

export function revolutionVolumeDisk(
  outer: ProfileFn,
  domain: [number, number],
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const f = (x: number): number => {
    const r = evalProfile(outer, x);
    return Math.PI * r * r;
  };
  return integrate(f, a, b);
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/revolution.test.ts`
Expected: PASS (6 assertion).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/analysis/revolution.ts api/_lib/kernel/analysis/__tests__/revolution.test.ts
git commit -m "feat(kernel): evalProfile + thể tích đĩa tròn xoay quanh Ox (8π verified)"
```

---

## Task 3: Lõi `buildRevolutionSolidOx` — gói thành `RevolutionSolid` đã kiểm

**Files:**
- Modify: `api/_lib/kernel/analysis/revolution.ts`
- Test: `api/_lib/kernel/analysis/__tests__/revolution.test.ts`

- [ ] **Step 1: Thêm test thất bại**

Thêm vào cuối `revolution.test.ts`:

```ts
import { buildRevolutionSolidOx } from '../revolution';

describe('buildRevolutionSolidOx', () => {
  it('gói khối với volume đã verified + latex', () => {
    const s = buildRevolutionSolidOx('rev1', { kind: 'sqrt', a: 1, b: 0 }, [0, 4], '#6366f1');
    expect(s.id).toBe('rev1');
    expect(s.axis).toBe('Ox');
    expect(s.method).toBe('disk');
    expect(s.domain).toEqual([0, 4]);
    expect(s.color).toBe('#6366f1');
    expect(s.volume?.value).toBeCloseTo(8 * Math.PI, 6);
    expect(s.volume?.verified).toBe(true);
    expect(s.volume?.latex).toContain('\\pi');
    expect(s.volume?.latex).toContain('\\int');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/revolution.test.ts`
Expected: FAIL — `buildRevolutionSolidOx` chưa tồn tại.

- [ ] **Step 3: Thêm `buildRevolutionSolidOx` vào `revolution.ts`**

Thêm cuối file `revolution.ts`:

```ts
export function buildRevolutionSolidOx(
  id: string,
  outer: ProfileFn,
  domain: [number, number],
  color?: string,
): RevolutionSolid {
  const { value, estimatedError } = revolutionVolumeDisk(outer, domain);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const volume: Verified<number> = {
    value,
    latex: `V=\\pi\\int_{${domain[0]}}^{${domain[1]}}\\left[r(x)\\right]^2\\,dx`,
    verified,
    estimatedError,
  };
  return { id, outer, axis: 'Ox', domain, method: 'disk', color, volume };
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/revolution.test.ts`
Expected: PASS (toàn bộ describe).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/analysis/revolution.ts api/_lib/kernel/analysis/__tests__/revolution.test.ts
git commit -m "feat(kernel): buildRevolutionSolidOx gói khối tròn xoay đã tự-kiểm"
```

---

## Task 4: `projectScene` bóc-lớp `revolutionSolids`

**Files:**
- Modify: `src/lib/advanceProject.ts:13-25`
- Test: `src/lib/__tests__/advanceProject.revolution.test.ts`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/lib/__tests__/advanceProject.revolution.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';
import type { GeometryData, AdvanceStep } from '@/types/geometry';

const base: GeometryData = {
  name: 't',
  points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }],
  lines: [],
  planes: [],
  revolutionSolids: [
    { id: 'rev1', outer: { kind: 'sqrt', a: 1, b: 0 }, axis: 'Ox', domain: [0, 4], method: 'disk' },
  ],
};
const steps: AdvanceStep[] = [
  { id: 's0', label: 'Câu a', visibleIds: ['A'] },
  { id: 's1', label: 'Câu b', visibleIds: ['A', 'rev1'] },
];

describe('projectScene · revolutionSolids', () => {
  it('ẩn khi id chưa thuộc bước', () => {
    const g = projectScene(base, steps, 0);
    expect(g.revolutionSolids?.[0].hidden).toBe(true);
  });
  it('highlight khi id vừa xuất hiện ở bước hiện tại', () => {
    const g = projectScene(base, steps, 1);
    expect(g.revolutionSolids?.[0].hidden).toBe(false);
    expect(g.revolutionSolids?.[0].highlight).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run src/lib/__tests__/advanceProject.revolution.test.ts`
Expected: FAIL — `g.revolutionSolids` là `undefined`.

- [ ] **Step 3: Sửa `projectScene`**

Trong `src/lib/advanceProject.ts`, thêm một dòng vào object trả về (ngay sau `curves: (base.curves || []).map(flag),`):

```ts
    revolutionSolids: (base.revolutionSolids || []).map(flag),
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/lib/__tests__/advanceProject.revolution.test.ts`
Expected: PASS (2 assertion).

- [ ] **Step 5: Commit**

```bash
git add src/lib/advanceProject.ts src/lib/__tests__/advanceProject.revolution.test.ts
git commit -m "feat(advance): projectScene bóc-lớp revolutionSolids theo bước"
```

---

## Task 5: Scene-builder `buildRevolutionScene` (params → AdvanceScene)

Dựng base bằng `buildAnalysisFigure` (curve r(x) + ~24 điểm mẫu ⇒ qua gate `points>0`), gắn khối tròn xoay đã kiểm, và tạo 2 bước: Câu a (hiện khối) + Câu b (hiện thể tích). LLM chỉ trích `params`; hàm này thuần & test được không cần mạng.

**Files:**
- Create: `api/_lib/advance/buildRevolutionScene.js`
- Test: `api/_lib/advance/__tests__/buildRevolutionScene.test.js`

- [ ] **Step 1: Viết test thất bại**

Tạo `api/_lib/advance/__tests__/buildRevolutionScene.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildRevolutionScene } from '../buildRevolutionScene.js';

const params = {
  outer: { kind: 'sqrt', a: 1, b: 0 },
  domain: [0, 4],
  fnLabel: 'y=\\sqrt{x}',
  parts: [
    { label: 'Câu a', hoi: 'Vẽ khối tròn xoay quanh Ox' },
    { label: 'Câu b', hoi: 'Tính thể tích' },
  ],
};

describe('buildRevolutionScene', () => {
  const scene = buildRevolutionScene(params);

  it('base có điểm mẫu (qua gate points>0)', () => {
    expect(scene.base.points.length).toBeGreaterThan(0);
  });
  it('base gắn đúng 1 khối tròn xoay', () => {
    expect(scene.base.revolutionSolids).toHaveLength(1);
    expect(scene.base.revolutionSolids[0].axis).toBe('Ox');
  });
  it('2 bước, cumulative visibleIds gồm id khối từ Câu a', () => {
    expect(scene.steps).toHaveLength(2);
    const revId = scene.base.revolutionSolids[0].id;
    expect(scene.steps[0].visibleIds).toContain(revId);
    expect(scene.steps[1].visibleIds).toContain(revId);
  });
  it('Câu a có anim sweep autoplay; Câu b có đáp án thể tích verified', () => {
    expect(scene.steps[0].anim).toMatchObject({ param: 'sweep', autoplay: true });
    expect(scene.steps[1].answer.verified).toBe(true);
    expect(scene.steps[1].answer.approx).toBeCloseTo(8 * Math.PI, 4);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run api/_lib/advance/__tests__/buildRevolutionScene.test.js`
Expected: FAIL — không import được `../buildRevolutionScene.js`.

- [ ] **Step 3: Viết `buildRevolutionScene.js`**

Tạo `api/_lib/advance/buildRevolutionScene.js`:

```js
// api/_lib/advance/buildRevolutionScene.js
// Dựng AdvanceScene cho mẫu 'rev-ox' từ params đã trích (LLM chỉ trích, engine dựng & kiểm).
// base: buildAnalysisFigure (curve r(x) + điểm mẫu ⇒ qua gate points>0) + gắn khối tròn xoay đã verified.
// steps: Câu a hiện khối (+ anim sweep), Câu b hiện đáp án thể tích.
import { buildAnalysisFigure } from '../kernel/analysis/analysisFigure.js';
import { buildRevolutionSolidOx } from '../kernel/analysis/revolution.js';

// ProfileFn → hệ số poly để buildAnalysisFigure vẽ curve minh hoạ.
// sqrt không phải đa thức: xấp xỉ hình dạng bằng poly bậc 2 khớp 3 điểm để CÓ curve gợi ý
// (đường sinh chính xác do khối tròn xoay lo; curve chỉ để mắt thấy biên dạng).
function profileToCoeffs(outer, domain) {
  if (outer.kind === 'poly') return outer.coeffs.slice();
  if (outer.kind === 'const') return [outer.c];
  // sqrt: khớp parabola qua x = a, mid, b.
  const [a, b] = domain;
  const mid = (a + b) / 2;
  const r = (x) => outer.a * Math.sqrt(x) + outer.b;
  // Giải hệ 3 ẩn c0,c1,c2 cho 3 điểm (a,mid,b) — Lagrange gọn.
  const xs = [a, mid, b];
  const ys = xs.map(r);
  const c2 =
    (ys[0] / ((xs[0] - xs[1]) * (xs[0] - xs[2]))) +
    (ys[1] / ((xs[1] - xs[0]) * (xs[1] - xs[2]))) +
    (ys[2] / ((xs[2] - xs[0]) * (xs[2] - xs[1])));
  // Suy c1, c0 từ giá trị tại a và b (đủ để vẽ; không cần độ chính xác cao).
  const c1 = (ys[2] - ys[0]) / (xs[2] - xs[0]) - c2 * (xs[0] + xs[2]);
  const c0 = ys[0] - c1 * xs[0] - c2 * xs[0] * xs[0];
  return [c0, c1, c2];
}

export function buildRevolutionScene(params) {
  const { outer, domain, parts } = params;
  const revId = 'rev1';
  const solid = buildRevolutionSolidOx(revId, outer, domain, '#6366f1');

  const fnName = 'r';
  const base = buildAnalysisFigure('Tròn xoay quanh Ox', {
    polys: { [fnName]: profileToCoeffs(outer, domain) },
    polyDomains: { [fnName]: domain },
    points: [],
    solids: {},
  });
  base.revolutionSolids = [solid];

  const samplePointIds = base.points.map((p) => p.id);
  const partA = parts?.[0] ?? { label: 'Câu a', hoi: 'Khối tròn xoay quanh Ox' };
  const partB = parts?.[1] ?? { label: 'Câu b', hoi: 'Thể tích khối' };

  const v = solid.volume;
  const steps = [
    {
      id: 's0',
      label: partA.label,
      visibleIds: [...samplePointIds, revId],
      highlightIds: [revId],
      anim: { param: 'sweep', label: 'Quét tròn xoay', tMax: domain[1], autoplay: true },
      solution: partA.hoi,
    },
    {
      id: 's1',
      label: partB.label,
      visibleIds: [...samplePointIds, revId],
      answer: {
        text: v.latex,
        approx: v.value,
        verified: v.verified,
      },
      solution: partB.hoi,
    },
  ];

  return { base, steps };
}
```

> **Lưu ý import kernel:** `revolution.ts`/`analysisFigure.ts` là TypeScript. Trong test vitest chúng import trực tiếp `.js` specifier và vitest phân giải sang `.ts` (đã dùng ở suite kernel hiện có). Nếu route production nạp `kernel-dist/` (đã build), giữ specifier `../kernel/analysis/...js` như các file cùng thư mục để đồng nhất với `solveWithKernel.js`.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run api/_lib/advance/__tests__/buildRevolutionScene.test.js`
Expected: PASS (5 assertion). Nếu phân giải `.js`→`.ts` lỗi, đổi specifier import trong `buildRevolutionScene.js` sang `.ts` cho khớp cấu hình kernel test rồi chạy lại.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/advance/buildRevolutionScene.js api/_lib/advance/__tests__/buildRevolutionScene.test.js
git commit -m "feat(advance): buildRevolutionScene dựng AdvanceScene tròn xoay từ params đã trích"
```

---

## Task 6: Định tuyến pipeline — split trích mẫu + `assembleAdvance` gọi builder

Cho `splitProblem` gắn `template: 'rev-ox'` và `templateParams` khi đề là "quay miền quanh Ox"; cho `assembleAdvance` ưu tiên nhánh template trước các nhánh cũ. Test lõi bằng deps injection (không mạng).

**Files:**
- Modify: `api/_lib/advance/splitPrompt.js` (bổ sung quy tắc + trường trích)
- Modify: `api/analyze-advance.js:20-52` (nhánh template trong `assembleAdvance`)
- Test: `api/_lib/advance/__tests__/assembleAdvance.revolution.test.js`

- [ ] **Step 1: Viết test thất bại (routing lõi, deps injected)**

Tạo `api/_lib/advance/__tests__/assembleAdvance.revolution.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { assembleAdvance } from '../../../analyze-advance.js';

describe('assembleAdvance · nhánh template rev-ox', () => {
  it('split có template ⇒ gọi buildRevolutionScene, trả mode advance', async () => {
    const fakeScene = { base: { points: [{ id: 'x' }] }, steps: [{ id: 's0', label: 'a', visibleIds: ['x'] }] };
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({
        type: 'multi_question',
        template: 'rev-ox',
        templateParams: { outer: { kind: 'sqrt', a: 1, b: 0 }, domain: [0, 4], parts: [] },
        setup: '', parts: [],
      }),
      buildRevolutionScene: vi.fn().mockReturnValue(fakeScene),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn(),
    };
    const out = await assembleAdvance('đề', deps, {});
    expect(deps.buildRevolutionScene).toHaveBeenCalledOnce();
    expect(deps.buildAdvanceScene).not.toHaveBeenCalled();
    expect(out).toEqual({ mode: 'advance', scene: fakeScene });
  });

  it('không có template ⇒ giữ nhánh multi_question cũ', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'multi_question', setup: '', parts: [] }),
      buildRevolutionScene: vi.fn(),
      buildAdvanceScene: vi.fn().mockResolvedValue({ base: {}, steps: [] }),
      solveProblem: vi.fn(),
    };
    const out = await assembleAdvance('đề', deps, {});
    expect(deps.buildRevolutionScene).not.toHaveBeenCalled();
    expect(deps.buildAdvanceScene).toHaveBeenCalledOnce();
    expect(out.mode).toBe('advance');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run api/_lib/advance/__tests__/assembleAdvance.revolution.test.js`
Expected: FAIL — `assembleAdvance` chưa biết `deps.buildRevolutionScene` / chưa có nhánh template.

- [ ] **Step 3: Thêm nhánh template vào `assembleAdvance`**

Trong `api/analyze-advance.js`, ngay SAU `const split = await deps.splitProblem(problem, opts);` và TRƯỚC `if (split.type === 'multi_question')`, chèn:

```js
  // Nhánh mẫu calculus (Đợt 1: rev-ox). Engine dựng khối tất định, tự kiểm thể tích.
  if (split.template === 'rev-ox' && split.templateParams && deps.buildRevolutionScene) {
    try {
      const scene = deps.buildRevolutionScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng mẫu hỏng → rơi xuống fallback bài đơn */ }
  }
```

- [ ] **Step 4: Nạp `buildRevolutionScene` vào handler thật**

Trong `api/analyze-advance.js`, tại khối `Promise.all([...])` nạp động (hiện có 4 import), thêm import thứ 5 và đưa vào deps:

```js
    const [{ splitProblem }, { buildAdvanceScene }, { solveProblem }, { transcribeImage }, { buildRevolutionScene }] = await Promise.all([
      import('./_lib/advance/splitProblem.js'),
      import('./_lib/advance/buildAdvanceScene.js'),
      import('./_lib/kernel-bridge/solveWithKernel.js'),
      import('./_lib/advance/transcribeImage.js'),
      import('./_lib/advance/buildRevolutionScene.js'),
    ]);
```

và cập nhật lời gọi:

```js
    const result = await assembleAdvance(problemSeed, { splitProblem, buildAdvanceScene, solveProblem, transcribeImage, buildRevolutionScene }, { imageBase64 });
```

- [ ] **Step 5: Dạy `splitPrompt` nhận diện & trích mẫu tròn xoay**

Trong `api/_lib/advance/splitPrompt.js`, thêm vào cuối phần "Cấu trúc" JSON (sau trường `"animation"`), mô tả trường mẫu optional; và thêm một quy tắc + few-shot. Chèn đoạn sau vào cuối `SPLIT_PROMPT` (ngay TRƯỚC dòng `Bây giờ hãy tách đề…`):

```
QUY TẮC MẪU GIẢI TÍCH (optional — chỉ thêm khi CHẮC CHẮN khớp):
- Nếu đề yêu cầu QUAY một miền phẳng quanh trục Ox để tạo khối tròn xoay, thêm 2 trường ở cấp gốc:
  "template": "rev-ox",
  "templateParams": {
    "outer": <biên dạng r(x)>,  // { "kind":"sqrt","a":..,"b":.. } hoặc { "kind":"poly","coeffs":[c0,c1,..] } hoặc { "kind":"const","c":.. }
    "domain": [a, b],           // cận tích phân theo x
    "fnLabel": "<LaTeX hàm, ví dụ y=\\sqrt{x}>",
    "parts": [ { "label":"Câu a", "hoi":".." }, { "label":"Câu b", "hoi":".." } ]
  }
- CHỈ đặt "template" khi trục là Ox và biên dạng khớp một trong 3 "kind" trên. Không chắc → BỎ QUA, để engine xử như thường.

[Ví dụ 4 — rev-ox]
Đề: "Cho miền phẳng giới hạn bởi y = √x, trục Ox và x = 4. a) Vẽ khối tròn xoay khi quay miền quanh Ox. b) Tính thể tích khối đó."
JSON:
{
  "type": "multi_question",
  "setup": "Miền phẳng giới hạn bởi y=√x, trục Ox, x=4",
  "parts": [
    { "label": "Câu a", "hoi": "Vẽ khối tròn xoay khi quay miền quanh Ox", "phan_tu_moi": [] },
    { "label": "Câu b", "hoi": "Tính thể tích khối tròn xoay", "phan_tu_moi": [] }
  ],
  "template": "rev-ox",
  "templateParams": {
    "outer": { "kind": "sqrt", "a": 1, "b": 0 },
    "domain": [0, 4],
    "fnLabel": "y=\\sqrt{x}",
    "parts": [
      { "label": "Câu a", "hoi": "Vẽ khối tròn xoay khi quay miền quanh Ox" },
      { "label": "Câu b", "hoi": "Tính thể tích khối tròn xoay" }
    ]
  }
}
```

> `splitProblem.js` parse JSON của model thành object và trả nguyên; các trường lạ (`template`, `templateParams`) đi kèm tự nhiên. KIỂM: mở `splitProblem.js`, xác nhận nó `return`/spread cả object parse (không whitelely chỉ vài khoá). Nếu nó lọc khoá, thêm `template` và `templateParams` vào danh sách giữ lại.

- [ ] **Step 6: Chạy test để xác nhận pass**

Run: `npx vitest run api/_lib/advance/__tests__/assembleAdvance.revolution.test.js`
Expected: PASS (2 assertion).

- [ ] **Step 7: Chạy toàn bộ suite advance để không vỡ nhánh cũ**

Run: `npx vitest run api/_lib/advance`
Expected: PASS toàn bộ (gồm test analyze-advance cũ).

- [ ] **Step 8: Commit**

```bash
git add api/analyze-advance.js api/_lib/advance/splitPrompt.js api/_lib/advance/__tests__/assembleAdvance.revolution.test.js
git commit -m "feat(advance): định tuyến mẫu rev-ox trong assembleAdvance + trích params ở splitPrompt"
```

---

## Task 7: `GeometryContext` — tham số tiến trình `advanceT`

**Files:**
- Modify: `src/context/GeometryContext.tsx`
- Test: `src/context/__tests__/geometryContext.advanceT.test.tsx` (nếu thư mục test context chưa có, tạo mới)

- [ ] **Step 1: Viết test thất bại (reducer thuần)**

> Nếu reducer chưa được export, Step 3 sẽ export nó. Tạo `src/context/__tests__/geometryContext.advanceT.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { geometryReducer, initialGeometryState } from '../GeometryContext';

describe('advanceT trong reducer', () => {
  it('khởi tạo = 0', () => {
    expect(initialGeometryState.advanceT).toBe(0);
  });
  it('ADVANCE_SET_T đặt & kẹp [0,1]', () => {
    const s1 = geometryReducer(initialGeometryState, { type: 'ADVANCE_SET_T', payload: 0.5 });
    expect(s1.advanceT).toBe(0.5);
    const s2 = geometryReducer(initialGeometryState, { type: 'ADVANCE_SET_T', payload: 9 });
    expect(s2.advanceT).toBe(1);
    const s3 = geometryReducer(initialGeometryState, { type: 'ADVANCE_SET_T', payload: -9 });
    expect(s3.advanceT).toBe(0);
  });
  it('đổi bước reset advanceT=0', () => {
    const primed = { ...initialGeometryState, advanceT: 0.7, advanceScene: { base: {}, steps: [{ id: 'a', label: '', visibleIds: [] }, { id: 'b', label: '', visibleIds: [] }] } };
    const out = geometryReducer(primed, { type: 'SET_STEP', payload: 1 });
    expect(out.advanceT).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run src/context/__tests__/geometryContext.advanceT.test.tsx`
Expected: FAIL — `advanceT` chưa có / reducer chưa export.

- [ ] **Step 3: Sửa `GeometryContext.tsx`**

3a. Bảo đảm state & reducer được export (nếu đang là hàm/biến nội bộ, thêm `export`):
```ts
export const initialGeometryState = { /* … các trường cũ … */ };
export function geometryReducer(state, action) { /* … */ }
```

3b. Trong `initialGeometryState`, thêm trường (cạnh `currentStep: 0`):
```ts
  advanceT: 0,
```

3c. Trong `geometryReducer`, thêm case:
```ts
    case 'ADVANCE_SET_T':
      return { ...state, advanceT: Math.max(0, Math.min(1, action.payload)) };
```

3d. Trong case `SET_STEP` (đang clamp currentStep), thêm reset `advanceT: 0` vào object trả về:
```ts
    case 'SET_STEP': {
      const n = state.advanceScene?.steps?.length ?? 0;
      const step = Math.max(0, Math.min(action.payload, Math.max(0, n - 1)));
      return { ...state, currentStep: step, advanceT: 0 };
    }
```

3e. Trong case `SET_ADVANCE_SCENE` (đang set currentStep:0), thêm `advanceT: 0`:
```ts
    case 'SET_ADVANCE_SCENE':
      return { ...state, advanceScene: action.payload, currentStep: 0, advanceT: 0 };
```

3f. Thêm dispatcher trong provider (cạnh `setStep`):
```ts
  const setAdvanceT = useCallback((t: number) => dispatch({ type: 'ADVANCE_SET_T', payload: t }), []);
```

3g. Đưa `advanceT` và `setAdvanceT` vào giá trị context (object `value`) và vào type của context (thêm `advanceT: number;` và `setAdvanceT: (t: number) => void;`).

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/context/__tests__/geometryContext.advanceT.test.tsx`
Expected: PASS (3 assertion).

- [ ] **Step 5: Commit**

```bash
git add src/context/GeometryContext.tsx src/context/__tests__/geometryContext.advanceT.test.tsx
git commit -m "feat(context): advanceT tiến-trình cho animation tròn xoay (reset khi đổi bước/scene)"
```

---

## Task 8: `<AnimatedRevolutionSolid>` — khối bóng, lộ dần, lát kết đông

**Files:**
- Create: `src/components/3d/AnimatedRevolutionSolid.tsx`
- Test: `src/components/3d/__tests__/animatedRevolutionSolid.smoke.test.tsx`

> **Hình học:** LatheGeometry quay quanh trục Y cục bộ. Ta xoay mesh `rotation.z = -π/2` để trục lathe trùng world **X (Ox)**. Điểm biên dạng `Vector2(radius, axial)` với `radius = r(x)`, `axial = x` (từ a→b). "Lộ dần" bằng **clippingPlane** normal `(-1,0,0)`, `constant = xCut` (giữ phần world-x ≤ xCut). "Lát kết đông": trong lúc `t<1` hiện vài đĩa mờ tại các x mẫu ≤ xCut, độ mờ `~(1−t)`; `t=1` đĩa biến mất, còn khối bóng liền.

- [ ] **Step 1: Viết smoke test thất bại**

Tạo `src/components/3d/__tests__/animatedRevolutionSolid.smoke.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { profileSamplesForTest } from '../AnimatedRevolutionSolid';

describe('AnimatedRevolutionSolid · biên dạng', () => {
  it('sinh điểm lathe (radius,axial) đúng đầu-cuối cho √x trên [0,4]', () => {
    const pts = profileSamplesForTest({ kind: 'sqrt', a: 1, b: 0 }, [0, 4], 8);
    expect(pts[0]).toMatchObject({ axial: 0 });
    expect(pts[0].radius).toBeCloseTo(0, 9);
    const last = pts[pts.length - 1];
    expect(last.axial).toBeCloseTo(4, 9);
    expect(last.radius).toBeCloseTo(2, 9); // √4 = 2
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run src/components/3d/__tests__/animatedRevolutionSolid.smoke.test.tsx`
Expected: FAIL — không import được `profileSamplesForTest`.

- [ ] **Step 3: Viết component**

Tạo `src/components/3d/AnimatedRevolutionSolid.tsx`:

```tsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { ProfileFn, RevolutionSolid } from '@/types/geometry';

const SEGMENTS = 96;   // đủ mịn để mặt cong bóng liền
const AXIAL_STEPS = 64;
const DISK_COUNT = 14;

function evalProfile(f: ProfileFn, x: number): number {
  switch (f.kind) {
    case 'poly': return f.coeffs.reduce((a, c, i) => a + c * x ** i, 0);
    case 'sqrt': return f.a * Math.sqrt(x) + f.b;
    case 'const': return f.c;
  }
}

// Export riêng để test thuần (không dựng canvas).
export function profileSamplesForTest(outer: ProfileFn, domain: [number, number], steps: number) {
  const [a, b] = domain;
  const out: { radius: number; axial: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = a + ((b - a) * i) / steps;
    out.push({ radius: Math.max(0, evalProfile(outer, x)), axial: x });
  }
  return out;
}

export default function AnimatedRevolutionSolid({ solid }: { solid: RevolutionSolid }) {
  const { advanceT } = useGeometry();
  const { gl } = useThree();
  gl.localClippingEnabled = true; // bật cắt cục bộ để lộ dần

  const [a, b] = solid.domain;
  if (solid.hidden) return null;

  const geometry = useMemo(() => {
    const pts = profileSamplesForTest(solid.outer, solid.domain, AXIAL_STEPS).map(
      (p) => new THREE.Vector2(p.radius, p.axial),
    );
    return new THREE.LatheGeometry(pts, SEGMENTS);
  }, [solid.outer, a, b]);

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  const xCut = a + (b - a) * advanceT;
  clipPlane.constant = xCut;

  const baseColor = solid.color ?? '#6366f1';
  const dim = !!solid.dim;
  const opacity = dim ? 0.25 : 1;

  // Đĩa "đang cộng dồn": mờ khi chạy, tan khi t→1.
  const disks = useMemo(() => {
    const arr: { x: number; r: number }[] = [];
    for (let i = 0; i < DISK_COUNT; i++) {
      const x = a + ((b - a) * (i + 0.5)) / DISK_COUNT;
      arr.push({ x, r: Math.max(1e-3, evalProfile(solid.outer, x)) });
    }
    return arr;
  }, [solid.outer, a, b]);
  const diskOpacity = Math.max(0, 1 - advanceT) * 0.35;

  return (
    <group>
      {/* Khối bóng liền — xoay để trục lathe trùng Ox, cắt lộ dần theo xCut */}
      <mesh geometry={geometry} rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={baseColor}
          roughness={0.25}
          metalness={0.0}
          clearcoat={1}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
          transparent={dim}
          opacity={opacity}
          emissive={solid.highlight ? new THREE.Color(baseColor) : new THREE.Color('#000000')}
          emissiveIntensity={solid.highlight ? 0.25 : 0}
          clippingPlanes={[clipPlane]}
        />
      </mesh>

      {/* Lát mờ minh hoạ tích phân (biến mất khi kết đông) */}
      {diskOpacity > 0.01 &&
        disks
          .filter((d) => d.x <= xCut)
          .map((d, i) => (
            <mesh key={i} position={[d.x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[d.r, d.r, (b - a) / DISK_COUNT * 0.85, 40]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={diskOpacity} />
            </mesh>
          ))}
    </group>
  );
}
```

> Nếu hook `useGeometry` tên khác (ví dụ `useGeometryContext`), đổi cho khớp export thực của `GeometryContext.tsx`.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/components/3d/__tests__/animatedRevolutionSolid.smoke.test.tsx`
Expected: PASS (3 assertion).

- [ ] **Step 5: Commit**

```bash
git add src/components/3d/AnimatedRevolutionSolid.tsx src/components/3d/__tests__/animatedRevolutionSolid.smoke.test.tsx
git commit -m "feat(3d): AnimatedRevolutionSolid — khối bóng lộ dần + lát kết đông"
```

---

## Task 9: Nối `<AnimatedRevolutionSolid>` vào `GeometryRenderer`

**Files:**
- Modify: `src/components/3d/GeometryRenderer.tsx:~389`
- Test: kiểm qua E2E (Task 11). Không unit test riêng (render Three trong test là smoke ở Task 8).

- [ ] **Step 1: Import component**

Đầu `GeometryRenderer.tsx`, thêm:
```ts
import AnimatedRevolutionSolid from './AnimatedRevolutionSolid';
```

- [ ] **Step 2: Render mảng `revolutionSolids`**

Ngay cạnh chỗ map `surfaces` (khoảng dòng 389, nơi có `surfaces.map(...<AnimatedSurface>)`), thêm:
```tsx
      {(scene.revolutionSolids || []).map((solid) => (
        <AnimatedRevolutionSolid key={solid.id} solid={solid} />
      ))}
```
> `scene` ở đây là biến đang giữ kết quả `projectScene` (cùng biến đang dùng cho `scene.surfaces`/`scene.points`). Dùng đúng tên biến local hiện có trong file (nếu là `projected` thì `projected.revolutionSolids`).

- [ ] **Step 3: Kiểm biên dịch**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sạch ở `GeometryRenderer.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/3d/GeometryRenderer.tsx
git commit -m "feat(3d): GeometryRenderer render revolutionSolids"
```

---

## Task 10: `<AdvanceAnimControl>` — thanh kéo + ▶ điều khiển `advanceT`

**Files:**
- Create: `src/components/layout/AdvanceAnimControl.tsx`
- Modify: `src/components/layout/AdvanceStepper.tsx`
- Test: `src/components/layout/__tests__/advanceAnimControl.test.tsx`

- [ ] **Step 1: Viết test thất bại (thanh kéo gọi setAdvanceT)**

Tạo `src/components/layout/__tests__/advanceAnimControl.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { AdvanceAnimControlView } from '../AdvanceAnimControl';

describe('AdvanceAnimControlView', () => {
  it('kéo thanh trượt gọi onSeek với t chuẩn hoá', () => {
    const onSeek = vi.fn();
    render(<AdvanceAnimControlView t={0} playing={false} label="Quét" onSeek={onSeek} onTogglePlay={() => {}} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.5' } });
    expect(onSeek).toHaveBeenCalledWith(0.5);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run src/components/layout/__tests__/advanceAnimControl.test.tsx`
Expected: FAIL — không import được `AdvanceAnimControlView`.

- [ ] **Step 3: Viết component (view thuần + wrapper nối context)**

Tạo `src/components/layout/AdvanceAnimControl.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { useGeometry } from '@/context/GeometryContext';

// View thuần — test được không cần context.
export function AdvanceAnimControlView({
  t, playing, label, onSeek, onTogglePlay,
}: {
  t: number; playing: boolean; label: string;
  onSeek: (t: number) => void; onTogglePlay: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur">
      <button aria-label={playing ? 'Tạm dừng' : 'Chạy'} onClick={onTogglePlay} className="text-white">
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <span className="text-xs text-white/80 whitespace-nowrap">{label}</span>
      <input
        type="range" role="slider" min={0} max={1} step={0.001} value={t}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="w-40 accent-indigo-400"
      />
    </div>
  );
}

// Wrapper nối GeometryContext + đồng hồ play nội bộ.
export default function AdvanceAnimControl({ label, autoplay }: { label: string; autoplay?: boolean }) {
  const { advanceT, setAdvanceT } = useGeometry();
  const playingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const stop = () => {
    playingRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };
  const tick = (prev: number, last: number) => {
    const now = performance.now();
    const next = Math.min(1, prev + (now - last) / 2200); // ~2.2s trọn hành trình
    setAdvanceT(next);
    if (next < 1 && playingRef.current) rafRef.current = requestAnimationFrame(() => tick(next, now));
    else stop();
  };
  const togglePlay = () => {
    if (playingRef.current) { stop(); return; }
    playingRef.current = true;
    const start = advanceT >= 1 ? 0 : advanceT;
    setAdvanceT(start);
    rafRef.current = requestAnimationFrame(() => tick(start, performance.now()));
  };

  useEffect(() => {
    if (autoplay) { playingRef.current = true; rafRef.current = requestAnimationFrame(() => tick(0, performance.now())); }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdvanceAnimControlView
      t={advanceT} playing={playingRef.current} label={label}
      onSeek={(v) => { stop(); setAdvanceT(v); }} onTogglePlay={togglePlay}
    />
  );
}
```

> Nếu `lucide-react` không có sẵn, thay icon bằng ký tự `▶`/`⏸`. Kiểm bằng: có import `lucide-react` ở component khác trong `layout/` không.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/components/layout/__tests__/advanceAnimControl.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount trong `AdvanceStepper`**

Trong `src/components/layout/AdvanceStepper.tsx`:

5a. Import:
```ts
import AdvanceAnimControl from './AdvanceAnimControl';
```

5b. Lấy bước hiện tại (component đã đọc `advanceScene`/`currentStep`). Ngay TRÊN phần render thanh chọn câu, thêm:
```tsx
{(() => {
  const step = advanceScene?.steps?.[currentStep];
  return step?.anim ? (
    <div className="mb-2 flex justify-center">
      <AdvanceAnimControl label={step.anim.label} autoplay={step.anim.autoplay} />
    </div>
  ) : null;
})()}
```
> Dùng đúng tên biến local của `AdvanceStepper` cho scene/step hiện tại (nếu đã có `steps`/`cur`, thay cho `advanceScene?.steps`/`currentStep`).

- [ ] **Step 6: Kiểm biên dịch + test layout**

Run: `npx vitest run src/components/layout && npx tsc --noEmit -p tsconfig.json`
Expected: test PASS; tsc sạch ở 2 file vừa sửa.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/AdvanceAnimControl.tsx src/components/layout/__tests__/advanceAnimControl.test.tsx src/components/layout/AdvanceStepper.tsx
git commit -m "feat(ui): AdvanceAnimControl thanh kéo + play, mount khi bước có anim"
```

---

## Task 11: E2E thủ công trên dev server + full test

**Files:** (không sửa mã; kiểm thực tế)

- [ ] **Step 1: Chạy toàn bộ test**

Run: `npm test`
Expected: PASS toàn bộ (không hồi quy).

- [ ] **Step 2: Mở dev server & nạp scene mẫu**

Dùng preview_start `{name}` cho dev server (đã note :8080). Vì UI thật cần đăng nhập + trừ credit, kiểm nhanh bằng cách bơm scene mẫu vào `GeometryContext` (dispatch `SET_ADVANCE_SCENE`) qua devtools hoặc một route/fixture tạm, với scene:
```js
// từ buildRevolutionScene({ outer:{kind:'sqrt',a:1,b:0}, domain:[0,4], parts:[{label:'Câu a',hoi:''},{label:'Câu b',hoi:''}] })
```

- [ ] **Step 3: Mắt kiểm 4 điểm nghiệm thu**

- Câu a: khối tròn xoay hiện, **mặt cong bóng liền** (không phải khối gạch); có lát mờ khi đang chạy rồi **kết đông** khi t=1.
- Thanh kéo: kéo tay → khối mọc dần mượt; ▶ → tự chạy ~2.2s tới đầy.
- Xoay chuột (OrbitControls) vẫn mượt, khối đổ bóng mềm.
- Câu b: hiện công thức `V=π∫[r(x)]²dx` + số ≈ 25.13 với badge **đã kiểm chứng**.

- [ ] **Step 4: Chụp bằng chứng**

`computer {action:"screenshot"}` khối ở t≈0.5 và t=1; đọc `read_console_messages` xác nhận không lỗi Three/clipping.

- [ ] **Step 5: Commit (nếu có tinh chỉnh nhỏ)**

```bash
git add -A
git commit -m "chore(advance): tinh chỉnh nghiệm thu Đợt 1 tròn xoay"
```

---

## Self-Review (đã chạy)

**Spec coverage** (mục §8 Đợt 1): Type (T1); projectScene (T4); kernel verify thể tích (T2, T3); `<AnimatedRevolutionSolid>` kéo/play/kết đông (T8, T10); `<AdvanceAnimControl>` (T10); per-step t trong context (T7); splitProblem nhận `rev-ox` (T6); buildAdvanceScene dựng element → thay bằng `buildRevolutionScene` chuyên biệt (T5) vì base calculus phải qua `buildAnalysisFigure` để đạt gate `points>0` (planFromProblem cổ điển sẽ trả null cho đề thuần giải tích). Đường ống end-to-end nối ở T6/T9/T10, nghiệm thu T11.

**Placeholder scan:** không còn TBD/“xử lý lỗi phù hợp”. Mọi step có mã cụ thể hoặc lệnh + kỳ vọng.

**Type consistency:** `RevolutionSolid`/`ProfileFn`/`Verified` (T1) dùng nhất quán ở T2–T5, T8; `advanceT`/`setAdvanceT`/`ADVANCE_SET_T` (T7) dùng ở T8, T10; `buildRevolutionSolidOx` (T3) gọi ở T5; `buildRevolutionScene` (T5) inject ở T6; `profileSamplesForTest` (T8) test ở T8. Tên khớp.

**Rủi ro đã ghi chú:** (a) phân giải import `.js`↔`.ts` trong kernel test — hướng xử lý ở T5/Step4; (b) tên hook context (`useGeometry` vs khác) — ghi chú ở T8/T10; (c) `splitProblem.js` có thể whitelist khoá — kiểm ở T6/Step5; (d) tên biến scene local trong `GeometryRenderer`/`AdvanceStepper` — ghi chú thay đúng biến.
