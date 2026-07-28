# Advance Giải tích — Đợt 2 (Tích phân thể tích) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm cho Advance 2 dạng tích phân mới — khối "thiết diện đã biết S(x)" (SliceStack) và diện tích hình phẳng (AreaRegion) — engine tự tính & tự-kiểm, render 3D mượt với hoạt ảnh xếp-lát (Cách A).

**Architecture:** Tái dùng nguyên đường ống Đợt 1: LLM (Pass 0) chỉ phân loại + rút tham số → kernel tất định dựng hình, tích phân số (`integrate` Simpson), tự-kiểm `verified` → element kế thừa `AdvanceFlags` → `projectScene` bóc lớp → renderer + `AdvanceAnimControl`/`advanceT`. Builder `.js` nạp kernel qua `kernel-dist/index.mjs` (rebuild sau khi thêm export). Làm xong SliceStack rồi mới sang AreaRegion.

**Tech Stack:** Vite + React + TypeScript, Three.js (`ExtrudeGeometry`/`LatheGeometry`/`Plane` clipping), Vitest, kernel TS bundle (`npm run build:kernel`), Vercel auto-deploy từ `origin/main`.

---

## File Structure

**Tạo mới:**
- `api/_lib/kernel/analysis/sliceVolume.ts` — kernel: `SECTION_K`, `sliceStackVolume`, `buildSliceStack` (SliceStack); `planarArea`, `buildAreaRegion` (AreaRegion). Tách khỏi `revolution.ts` cho rõ trách nhiệm, tái dùng `compileProfile`/`integrate`.
- `api/_lib/advance/buildSliceScene.js` — dựng AdvanceScene cho `cross-known`.
- `api/_lib/advance/buildAreaScene.js` — dựng AdvanceScene cho `area-plane`.
- `src/components/3d/AnimatedSliceStack.tsx` — render khối thiết diện (+ export thuần `sectionShape`, `sliceSamplesForTest`).
- `src/components/3d/AnimatedAreaRegion.tsx` — render tấm diện tích (+ export thuần `areaLoopForTest`).
- Test kèm mỗi file (xem từng task).

**Sửa:**
- `src/types/geometry.ts` — thêm `SliceStack`, `AreaRegion` + 2 field `GeometryData`.
- `src/lib/advanceProject.ts` — map cờ cho 2 mảng mới.
- `api/_lib/kernel/index.ts` — export builder mới.
- `api/analyze-advance.js` — định tuyến 2 template + deps + guard `looksLikeCrossSection`/`looksLikeArea`.
- `api/_lib/advance/splitPrompt.js` — quy tắc + few-shot 2 dạng.
- `src/components/3d/GeometryRenderer.tsx` — đăng ký 2 renderer.

---

## PHASE 1 — SliceStack (thiết diện đã biết) trọn đầu-cuối

### Task 1: Types + projectScene cho cả 2 element mới

**Files:**
- Modify: `src/types/geometry.ts` (sau `RevolutionSolid`, ~dòng 280; và trong `GeometryData` sau `revolutionSolids?`, ~dòng 302)
- Modify: `src/lib/advanceProject.ts:25`
- Test: `src/lib/__tests__/advanceProject.dot2.test.ts` (tạo)

- [ ] **Step 1: Viết test đỏ**

Tạo `src/lib/__tests__/advanceProject.dot2.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';
import type { GeometryData, AdvanceStep } from '@/types/geometry';

const base = {
  name: 't', points: [], lines: [],
  sliceStacks: [{ id: 'sl1', axis: 'Ox', domain: [0, 4], outer: { kind: 'sqrt', a: 1, b: 0 }, section: 'square' }],
  areaRegions: [{ id: 'ar1', outer: { kind: 'poly', coeffs: [0, 1] }, inner: { kind: 'poly', coeffs: [0, 0, 1] }, domain: [0, 1] }],
} as unknown as GeometryData;

const steps: AdvanceStep[] = [
  { id: 's0', label: 'a', visibleIds: ['sl1'] },
  { id: 's1', label: 'b', visibleIds: ['sl1', 'ar1'] },
];

describe('projectScene — Đợt 2 element', () => {
  it('câu 0: sl1 hiện (highlight), ar1 ẩn', () => {
    const g = projectScene(base, steps, 0);
    expect(g.sliceStacks![0]).toMatchObject({ hidden: false, highlight: true });
    expect(g.areaRegions![0]).toMatchObject({ hidden: true });
  });
  it('câu 1: ar1 mới hiện (highlight), sl1 dim', () => {
    const g = projectScene(base, steps, 1);
    expect(g.areaRegions![0]).toMatchObject({ hidden: false, highlight: true });
    expect(g.sliceStacks![0]).toMatchObject({ hidden: false, dim: true });
  });
});
```

- [ ] **Step 2: Chạy test — kỳ vọng ĐỎ**

Run: `npx vitest run src/lib/__tests__/advanceProject.dot2.test.ts`
Expected: FAIL (`sliceStacks`/`areaRegions` undefined trên kết quả projectScene; type error).

- [ ] **Step 3: Thêm type vào `src/types/geometry.ts`**

Sau block `RevolutionSolid` (kết ở ~dòng 280), thêm:

```ts
// ── Calculus Đợt 2: thiết diện đã biết & diện tích hình phẳng ──────
// (1) Khối có thiết diện vuông góc trục đã biết: V = ∫ k·side(t)² dt.
export interface SliceStack extends AdvanceFlags {
  id: string;
  axis: 'Ox' | 'Oy';
  domain: [number, number];            // [a,b] theo biến trục
  outer: ProfileFn;                    // biên "trên" miền đáy theo biến trục
  inner?: ProfileFn;                   // biên "dưới"; bỏ ⇒ side = |outer|
  section: 'square' | 'equilateral' | 'semicircle' | 'rect';
  ratio?: number;                      // chỉ 'rect': cạnh vuông góc = ratio·side
  volume?: Verified<number>;
  color?: string;
  samples?: { t: number; side: number }[];
}

// (2) Diện tích hình phẳng: S = ∫ |outer(x) − inner(x)| dx. ĐƠN VỊ² (không phải thể tích).
export interface AreaRegion extends AdvanceFlags {
  id: string;
  outer: ProfileFn;                    // đường trên f(x)
  inner: ProfileFn;                    // đường dưới g(x)
  domain: [number, number];            // [a,b]
  area?: Verified<number>;
  color?: string;
  slabDepth?: number;                  // bề dày "tấm" khi đùn để nhìn 3D
  samples?: { x: number; top: number; bot: number }[];
}
```

Trong `interface GeometryData`, ngay sau `revolutionSolids?: RevolutionSolid[];` (dòng 302):

```ts
  sliceStacks?: SliceStack[];
  areaRegions?: AreaRegion[];
```

- [ ] **Step 4: Map cờ trong `src/lib/advanceProject.ts`**

Trong object trả về của `projectScene`, sau dòng `revolutionSolids: (base.revolutionSolids || []).map(flag),` (dòng 25) thêm:

```ts
    sliceStacks: (base.sliceStacks || []).map(flag),
    areaRegions: (base.areaRegions || []).map(flag),
```

- [ ] **Step 5: Chạy test — kỳ vọng XANH**

Run: `npx vitest run src/lib/__tests__/advanceProject.dot2.test.ts`
Expected: PASS (2 test).

- [ ] **Step 6: Commit**

```bash
git add src/types/geometry.ts src/lib/advanceProject.ts src/lib/__tests__/advanceProject.dot2.test.ts
git commit -m "feat(advance-đợt2): type SliceStack/AreaRegion + projectScene bóc lớp"
```

---

### Task 2: Kernel — `buildSliceStack` + tích phân tự-kiểm

**Files:**
- Create: `api/_lib/kernel/analysis/sliceVolume.ts`
- Modify: `api/_lib/kernel/index.ts:43` (thêm export)
- Test: `api/_lib/kernel/analysis/__tests__/sliceVolume.test.ts` (tạo)

- [ ] **Step 1: Viết test đỏ**

Tạo `api/_lib/kernel/analysis/__tests__/sliceVolume.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSliceStack, sliceStackVolume } from '../sliceVolume';

const sqrtX = { kind: 'sqrt', a: 1, b: 0 } as const;   // side = √x ⇒ side² = x, ∫_0^4 x dx = 8

describe('sliceVolume — thiết diện đã biết', () => {
  it('vuông, đáy √x trên [0,4] ⇒ V=8', () => {
    expect(sliceStackVolume('square', sqrtX, [0, 4]).value).toBeCloseTo(8, 6);
  });
  it('nửa tròn ⇒ (π/8)·8 = π', () => {
    expect(sliceStackVolume('semicircle', sqrtX, [0, 4]).value).toBeCloseTo(Math.PI, 6);
  });
  it('tam giác đều ⇒ (√3/4)·8 = 2√3', () => {
    expect(sliceStackVolume('equilateral', sqrtX, [0, 4]).value).toBeCloseTo(2 * Math.sqrt(3), 6);
  });
  it('chữ nhật ratio=2 ⇒ 2·8 = 16', () => {
    expect(sliceStackVolume('rect', sqrtX, [0, 4], undefined, 2).value).toBeCloseTo(16, 6);
  });
  it('builder gắn volume verified + method + samples', () => {
    const s = buildSliceStack('s1', 'square', sqrtX, [0, 4]);
    expect(s.volume!.verified).toBe(true);
    expect(s.volume!.value).toBeCloseTo(8, 6);
    expect(s.section).toBe('square');
    expect(s.samples!.length).toBeGreaterThan(0);
    expect(s.samples![s.samples!.length - 1]).toMatchObject({ t: 4 });
    expect(s.samples![s.samples!.length - 1].side).toBeCloseTo(2, 6);
  });
  it('side dùng |outer-inner|: đáy giữa outer=2, inner=0 ⇒ vuông cạnh 2 trên [0,3] ⇒ V=4·3=12', () => {
    const v = sliceStackVolume('square', { kind: 'const', c: 2 }, [0, 3], { kind: 'const', c: 0 });
    expect(v.value).toBeCloseTo(12, 6);
  });
});
```

- [ ] **Step 2: Chạy test — ĐỎ**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/sliceVolume.test.ts`
Expected: FAIL (module `../sliceVolume` không tồn tại).

- [ ] **Step 3: Viết `api/_lib/kernel/analysis/sliceVolume.ts`**

```ts
// api/_lib/kernel/analysis/sliceVolume.ts
// Lõi tất định cho khối "thiết diện đã biết" (Đợt 2): V = ∫ k·side(t)² dt, side = |outer−inner|.
// k theo hình lát: vuông=1, tam giác đều=√3/4, nửa tròn=π/8, chữ nhật=ratio.
import type { ProfileFn, SliceStack, Verified } from '../../../../src/types/geometry';
import { integrate } from './quadrature';
import { compileProfile } from './revolution';

export type SectionKind = 'square' | 'equilateral' | 'semicircle' | 'rect';

// Hệ số k của diện tích thiết diện theo cạnh `side`.
export function sectionK(section: SectionKind, ratio = 1): number {
  switch (section) {
    case 'square': return 1;
    case 'equilateral': return Math.sqrt(3) / 4;
    case 'semicircle': return Math.PI / 8;          // đường kính = side
    case 'rect': return ratio;                      // cạnh kia = ratio·side
  }
}

const LATEX_S: Record<SectionKind, string> = {
  square: 's^2',
  equilateral: '\\tfrac{\\sqrt3}{4}s^2',
  semicircle: '\\tfrac{\\pi}{8}s^2',
  rect: 'k\\,s^2',
};

// side(t) = |outer(t) − inner(t)| (inner vắng ⇒ |outer|).
function compileSide(outer: ProfileFn, inner?: ProfileFn): (t: number) => number {
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  return (t) => Math.abs(go(t) - (gi ? gi(t) : 0));
}

export function sliceStackVolume(
  section: SectionKind,
  outer: ProfileFn,
  domain: [number, number],
  inner?: ProfileFn,
  ratio = 1,
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const side = compileSide(outer, inner);
  const k = sectionK(section, ratio);
  return integrate((t) => k * side(t) * side(t), a, b);
}

function sampleSide(
  outer: ProfileFn, domain: [number, number], inner?: ProfileFn, n = 64,
): { t: number; side: number }[] {
  const [a, b] = domain;
  const side = compileSide(outer, inner);
  const out: { t: number; side: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = a + ((b - a) * i) / n;
    const s = side(t);
    out.push({ t, side: Number.isFinite(s) ? Math.max(0, s) : 0 });
  }
  return out;
}

export function buildSliceStack(
  id: string,
  section: SectionKind,
  outer: ProfileFn,
  domain: [number, number],
  color?: string,
  inner?: ProfileFn,
  ratio?: number,
  axis: 'Ox' | 'Oy' = 'Ox',
): SliceStack {
  const r = section === 'rect' ? (ratio && ratio > 0 ? ratio : 1) : undefined;
  const { value, estimatedError } = sliceStackVolume(section, outer, domain, inner, r ?? 1);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = `V=\\int_{${domain[0]}}^{${domain[1]}} ${LATEX_S[section]}\\,d${axis === 'Oy' ? 'y' : 'x'}`;
  const volume: Verified<number> = { value, latex, verified, estimatedError };
  return {
    id, axis, domain, outer, section, volume, color,
    ...(inner ? { inner } : {}),
    ...(r !== undefined ? { ratio: r } : {}),
    samples: sampleSide(outer, domain, inner),
  };
}
```

- [ ] **Step 4: Export trong `api/_lib/kernel/index.ts`**

Thêm dòng sau dòng export `revolution` (dòng 43):

```ts
export { sectionK, sliceStackVolume, buildSliceStack } from './analysis/sliceVolume';
```

- [ ] **Step 5: Rebuild bundle rồi chạy test**

```bash
npm run build:kernel
npx vitest run api/_lib/kernel/analysis/__tests__/sliceVolume.test.ts
```
Expected: build sinh lại `api/_lib/kernel-dist/index.mjs`; test PASS (6 test).

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/analysis/sliceVolume.ts api/_lib/kernel/analysis/__tests__/sliceVolume.test.ts api/_lib/kernel/index.ts api/_lib/kernel-dist/index.mjs
git commit -m "feat(advance-đợt2): kernel buildSliceStack + tích phân thiết diện tự-kiểm"
```

---

### Task 3: Scene builder `buildSliceScene.js`

**Files:**
- Create: `api/_lib/advance/buildSliceScene.js`
- Test: `api/_lib/advance/__tests__/buildSliceScene.test.js` (tạo)

Tham chiếu khuôn: `api/_lib/advance/buildRevolutionScene.js` (đọc để theo đúng cách dùng `buildAnalysisFigure`, `outlineIds`, 2 bước).

- [ ] **Step 1: Viết test đỏ**

Tạo `api/_lib/advance/__tests__/buildSliceScene.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildSliceScene } from '../buildSliceScene.js';

describe('buildSliceScene', () => {
  const sc = buildSliceScene({
    section: 'square',
    outer: { kind: 'sqrt', a: 1, b: 0 },
    domain: [0, 4],
    fnLabel: 'y=\\sqrt{x}',
    parts: [{ label: 'Câu 1', hoi: 'Tính thể tích' }],
  });

  it('base gắn đúng 1 SliceStack, qua gate points>0', () => {
    expect(sc.base.sliceStacks).toHaveLength(1);
    expect(sc.base.points.length).toBeGreaterThan(0);
  });
  it('2 bước; Câu a anim sweep autoplay; Câu b đáp án V=8 verified', () => {
    expect(sc.steps).toHaveLength(2);
    expect(sc.steps[0].anim).toMatchObject({ param: 'sweep', autoplay: true });
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].answer.approx).toBeCloseTo(8, 4);
  });
  it('bước không mang solution dạng chuỗi', () => {
    for (const s of sc.steps) expect(typeof s.solution).not.toBe('string');
  });
  it('nửa tròn ⇒ V=π', () => {
    const s = buildSliceScene({ section: 'semicircle', outer: { kind: 'sqrt', a: 1, b: 0 }, domain: [0, 4] });
    expect(s.steps[1].answer.approx).toBeCloseTo(Math.PI, 4);
  });
});
```

- [ ] **Step 2: Chạy test — ĐỎ**

Run: `npx vitest run api/_lib/advance/__tests__/buildSliceScene.test.js`
Expected: FAIL (module không tồn tại).

- [ ] **Step 3: Viết `api/_lib/advance/buildSliceScene.js`**

```js
// api/_lib/advance/buildSliceScene.js
// Dựng AdvanceScene cho mẫu 'cross-known' (khối thiết diện đã biết). LLM chỉ trích tham số; engine dựng & kiểm.
// Khuôn theo buildRevolutionScene.js: base = buildAnalysisFigure (curve/điểm mẫu qua gate) + SliceStack đã verified.
import { buildAnalysisFigure, buildSliceStack } from '../kernel-dist/index.mjs';

export function buildSliceScene(params) {
  const { section, outer, domain, inner, ratio, parts, axis } = params;
  const sec = ['square', 'equilateral', 'semicircle', 'rect'].includes(section) ? section : 'square';
  const solidAxis = axis === 'Oy' ? 'Oy' : 'Ox';
  const id = 'slice1';
  const solid = buildSliceStack(id, sec, outer, domain, '#0ea5e9', inner || undefined, ratio, solidAxis);

  // Điểm mẫu cho gate points>0, lấy thưa từ mẫu cạnh (điểm biên trên miền đáy: (t, side)).
  const src = solid.samples && solid.samples.length ? solid.samples : [{ t: domain[0], side: 0 }];
  const stepEvery = Math.max(1, Math.floor(src.length / 8));
  const samplePts = src
    .filter((_, i) => i % stepEvery === 0)
    .map((s, i) => ({ id: `p${i}`, label: '', x: s.t, y: s.side, z: 0 }));

  // Biên dạng đáy LÀ poly (theo trục) ⇒ vẽ curve mượt; kiểu khác dựa điểm mẫu.
  const usePolyCurve = outer && outer.kind === 'poly';
  const base = buildAnalysisFigure('Thể tích theo thiết diện', {
    polys: usePolyCurve ? { r: outer.coeffs.slice() } : {},
    polyDomains: usePolyCurve ? { r: domain } : {},
    points: samplePts,
    solids: {},
  });
  base.sliceStacks = [solid];

  const curveIds = (base.curves || []).map((c) => c.id);
  const outlineIds = curveIds.length ? curveIds : base.points.map((p) => p.id);
  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Khối thiết diện' };
  const partB = hasTwoParts ? parts[1] : { label: 'Thể tích' };

  const v = solid.volume;
  const steps = [
    {
      id: 's0', label: partA.label,
      visibleIds: [...outlineIds, id], highlightIds: [id],
      anim: { param: 'sweep', label: 'Xếp lát', tMax: domain[1], autoplay: true },
    },
    {
      id: 's1', label: partB.label,
      visibleIds: [...outlineIds, id],
      answer: { text: v.latex, approx: v.value, verified: v.verified },
    },
  ];
  return { base, steps };
}
```

- [ ] **Step 4: Chạy test — XANH**

Run: `npx vitest run api/_lib/advance/__tests__/buildSliceScene.test.js`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/advance/buildSliceScene.js api/_lib/advance/__tests__/buildSliceScene.test.js
git commit -m "feat(advance-đợt2): buildSliceScene dựng cảnh khối thiết diện"
```

---

### Task 4: Định tuyến backend + prompt + guard cho `cross-known`

**Files:**
- Modify: `api/analyze-advance.js` (routing ~dòng 57; deps ~dòng 143 & 160; guard ~dòng 88)
- Modify: `api/_lib/advance/splitPrompt.js` (thêm quy tắc + Ví dụ 9)
- Test: `api/_lib/advance/__tests__/analyze-advance.test.js` (thêm case)

- [ ] **Step 1: Viết test đỏ (routing cross-known)**

Trong `api/_lib/advance/__tests__/analyze-advance.test.js`, thêm:

```js
it('template cross-known → gọi buildSliceScene, trả mode advance', async () => {
  const deps = {
    splitProblem: async () => ({ type: 'single', template: 'cross-known',
      templateParams: { section: 'square', outer: { kind: 'sqrt', a: 1, b: 0 }, domain: [0, 4] } }),
    buildAdvanceScene: async () => null,
    solveProblem: async () => ({ ok: false }),
    buildRevolutionScene: () => null,
    buildSliceScene: () => ({ base: { name: 'x', points: [{ id: 'p0' }] }, steps: [] }),
  };
  const out = await assembleAdvance('đề', deps, {});
  expect(out.mode).toBe('advance');
});
```

(Bảo đảm `assembleAdvance` đã được import ở đầu file — đã có từ Đợt 1.)

- [ ] **Step 2: Chạy — ĐỎ**

Run: `npx vitest run api/_lib/advance/__tests__/analyze-advance.test.js -t "cross-known"`
Expected: FAIL (`assembleAdvance` chưa biết nhánh `cross-known`, trả fallback).

- [ ] **Step 3: Thêm nhánh routing trong `api/analyze-advance.js`**

Sau block `if (split.template === 'rev-ox' …) { … }` (kết ~dòng 62), thêm:

```js
  // Đợt 2: khối thiết diện đã biết. Engine dựng & tự-kiểm thể tích.
  if (split.template === 'cross-known' && split.templateParams && deps.buildSliceScene) {
    try {
      const scene = deps.buildSliceScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng hỏng → fallback */ }
  }
```

- [ ] **Step 4: Nạp `buildSliceScene` vào deps của handler**

Dòng 143–148, thêm import; dòng 160 thêm vào object deps:

```js
    const [{ splitProblem }, { buildAdvanceScene }, { solveProblem }, { buildRevolutionScene }, { buildSliceScene }] = await Promise.all([
      import('./_lib/advance/splitProblem.js'),
      import('./_lib/advance/buildAdvanceScene.js'),
      import('./_lib/kernel-bridge/solveWithKernel.js'),
      import('./_lib/advance/buildRevolutionScene.js'),
      import('./_lib/advance/buildSliceScene.js'),
    ]);
```

Và trong `Promise.race([assembleAdvance(problemSeed, { … }, …)])` (dòng 160) thêm `buildSliceScene` vào object:

```js
      assembleAdvance(problemSeed, { splitProblem, buildAdvanceScene, solveProblem, buildRevolutionScene, buildSliceScene }, { imageBase64 }),
```

- [ ] **Step 5: Chạy — XANH**

Run: `npx vitest run api/_lib/advance/__tests__/analyze-advance.test.js`
Expected: PASS (cả case mới + cũ).

- [ ] **Step 6: Thêm guard `looksLikeCrossSection` + thông điệp**

Ở đầu `api/analyze-advance.js` cạnh `REV_UNSUPPORTED_MSG` (tìm chuỗi này), thêm hằng:

```js
export const CROSS_UNSUPPORTED_MSG =
  'Mình nhận ra đây là bài thể tích theo thiết diện nhưng chưa dựng được. ' +
  'Bạn thử ghi rõ miền đáy (giới hạn bởi đường nào) và hình lát (vuông/tam giác đều/nửa tròn) giúp mình nhé.';
```

Cạnh hàm `looksLikeRevolution` (kết ~dòng 43) thêm:

```js
export function looksLikeCrossSection(text) {
  const s = (text || '').toLowerCase();
  return /thi[eế]t di[eệ]n/.test(s) && /(vu[oô]ng|tam gi[aá]c|n[uử]a (h[iì]nh )?tr[oò]n|ch[uữ] nh[aậ]t)/.test(s);
}
```

Trong `assembleAdvance`, ngay TRƯỚC block `if (looksLikeRevolution(effectiveText))` (dòng 88), thêm:

```js
  if (looksLikeCrossSection(effectiveText)) {
    return { mode: 'kernel', degraded: true, ok: false, revUnsupported: true, error: CROSS_UNSUPPORTED_MSG };
  }
```

(Dùng lại cờ `revUnsupported` để handler HOÀN credit + frontend hiện toast — không cần thêm cờ mới.)

- [ ] **Step 7: Thêm quy tắc + Ví dụ 9 vào `api/_lib/advance/splitPrompt.js`**

Trong khối "QUY TẮC MẪU GIẢI TÍCH", sau các quy tắc rev, thêm đoạn (trước dòng "Bây giờ hãy tách đề"):

```
- Nếu đề tính THỂ TÍCH bằng THIẾT DIỆN đã biết (đáy là miền phẳng, thiết diện vuông góc trục là hình
  vuông/tam giác đều/nửa tròn/chữ nhật) → dùng "template":"cross-known", "templateParams":
    { "section":"square"|"equilateral"|"semicircle"|"rect",
      "outer": <biên TRÊN miền đáy theo biến trục>, "inner": <biên DƯỚI; BỎ nếu đáy tựa trục>,
      "domain":[a,b], "ratio": <chỉ 'rect': cạnh kia = ratio·cạnh đáy>, "fnLabel":"..", "parts":[..] }
  Cạnh lát tại mỗi vị trí = |outer − inner|. "domain" lấy như bài diện tích (cận cho sẵn hoặc nghiệm giao).
```

Rồi thêm few-shot:

```
[Ví dụ 9 — cross-known, thiết diện vuông]
Đề: "Cho vật thể có đáy là hình phẳng giới hạn bởi y=√x, trục Ox và x=4. Thiết diện cắt vuông góc với Ox là hình vuông. Tính thể tích."
JSON:
{
  "type": "single",
  "setup": "Đáy giới hạn bởi y=√x, Ox, x=4; thiết diện vuông góc Ox là hình vuông",
  "parts": [ { "label": "Câu 1", "hoi": "Tính thể tích vật thể", "phan_tu_moi": [] } ],
  "template": "cross-known",
  "templateParams": {
    "section": "square",
    "outer": { "kind": "sqrt", "a": 1, "b": 0 },
    "domain": [0, 4],
    "fnLabel": "y=\\sqrt{x}",
    "parts": [ { "label": "Câu 1", "hoi": "Tính thể tích vật thể" } ]
  }
}
```

- [ ] **Step 8: Test guard (splitPrompt là prompt tĩnh, chỉ test guard logic)**

Trong `api/_lib/advance/__tests__/analyze-advance.test.js` thêm:

```js
it('đề thiết diện KHÔNG ra template → guard trả CROSS_UNSUPPORTED (hoàn credit)', async () => {
  const deps = {
    splitProblem: async () => ({ type: 'single' }),
    buildAdvanceScene: async () => null, solveProblem: async () => ({ ok: false }),
    buildRevolutionScene: () => null, buildSliceScene: () => null,
  };
  const out = await assembleAdvance('Thiết diện vuông góc Ox là hình vuông, tính thể tích', deps, {});
  expect(out.revUnsupported).toBe(true);
});
```

Run: `npx vitest run api/_lib/advance/__tests__/analyze-advance.test.js`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add api/analyze-advance.js api/_lib/advance/splitPrompt.js api/_lib/advance/__tests__/analyze-advance.test.js
git commit -m "feat(advance-đợt2): định tuyến cross-known + prompt Ví dụ 9 + guard thiết diện"
```

---

### Task 5: Render `<AnimatedSliceStack>` + đăng ký

**Files:**
- Create: `src/components/3d/AnimatedSliceStack.tsx`
- Modify: `src/components/3d/GeometryRenderer.tsx` (import ~dòng 27; render sau block revolution ~dòng 397)
- Test: `src/components/3d/__tests__/animatedSliceStack.smoke.test.tsx` (tạo)

Tham chiếu khuôn hoạt ảnh/clip: `src/components/3d/AnimatedRevolutionSolid.tsx`.

- [ ] **Step 1: Viết test đỏ (thuần, không canvas)**

Tạo `src/components/3d/__tests__/animatedSliceStack.smoke.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { sectionShape, sliceSamplesForTest } from '../AnimatedSliceStack';

describe('AnimatedSliceStack · hình lát', () => {
  it('vuông cạnh 2: Shape có bbox 2×2 tâm gốc', () => {
    const shp = sectionShape('square', 2);
    const pts = shp.getPoints();
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2, 6);
  });
  it('nửa tròn cạnh 2 (bán kính 1): cao 1, rộng 2', () => {
    const pts = sectionShape('semicircle', 2).getPoints(32);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2, 1);
    expect(Math.max(...ys)).toBeCloseTo(1, 1);
  });
  it('sliceSamplesForTest lọc theo t≤ ngưỡng (Cách A quét lộ dần)', () => {
    const samples = [{ t: 0, side: 0 }, { t: 2, side: 1 }, { t: 4, side: 2 }];
    expect(sliceSamplesForTest(samples, [0, 4], 0.5).length).toBe(2); // t ≤ 2
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

Run: `npx vitest run src/components/3d/__tests__/animatedSliceStack.smoke.test.tsx`
Expected: FAIL (module không tồn tại).

- [ ] **Step 3: Viết `src/components/3d/AnimatedSliceStack.tsx`**

```tsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { useGeometry } from '@/context/GeometryContext';
import type { SliceStack } from '@/types/geometry';

const SLICE_COUNT = 48;      // số lát khi kết đông (Cách A: nhiều lát khít = trông khối đặc)
const SLICE_DEPTH = 0.9;     // bề dày mỗi lát tương đối (× bước) để lát liền nhau

// Dựng THREE.Shape tiết diện, TÂM ở gốc, "cạnh đáy" = side theo phương ngang (x).
// square/rect: chữ nhật; equilateral: tam giác đều đáy dưới; semicircle: nửa tròn phần trên.
export function sectionShape(section: SliceStack['section'], side: number, ratio = 1): THREE.Shape {
  const s = Math.max(1e-4, side);
  const shp = new THREE.Shape();
  if (section === 'square' || section === 'rect') {
    const h = section === 'rect' ? s * ratio : s;
    shp.moveTo(-s / 2, -h / 2); shp.lineTo(s / 2, -h / 2);
    shp.lineTo(s / 2, h / 2); shp.lineTo(-s / 2, h / 2); shp.closePath();
  } else if (section === 'equilateral') {
    const h = (Math.sqrt(3) / 2) * s;
    shp.moveTo(-s / 2, -h / 2); shp.lineTo(s / 2, -h / 2); shp.lineTo(0, h / 2); shp.closePath();
  } else { // semicircle: đường kính = side nằm ngang, vòm hướng lên
    shp.moveTo(-s / 2, 0); shp.absarc(0, 0, s / 2, Math.PI, 0, true); shp.closePath();
  }
  return shp;
}

// Lọc lát hiện theo tiến trình t∈[0,1] (Cách A). Export riêng để test thuần.
export function sliceSamplesForTest(
  samples: { t: number; side: number }[], domain: [number, number], advanceT: number,
) {
  const [a, b] = domain;
  const cut = a + (b - a) * advanceT;
  return samples.filter((sp) => sp.t <= cut + 1e-9);
}

function sideAt(samples: { t: number; side: number }[], t: number): number {
  if (!samples.length) return 0;
  if (t <= samples[0].t) return samples[0].side;
  const last = samples[samples.length - 1];
  if (t >= last.t) return last.side;
  for (let i = 1; i < samples.length; i++) {
    if (t <= samples[i].t) {
      const p = samples[i - 1], q = samples[i];
      const k = (t - p.t) / (q.t - p.t || 1);
      return p.side + k * (q.side - p.side);
    }
  }
  return last.side;
}

export default function AnimatedSliceStack({ solid }: { solid: SliceStack }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const [a, b] = solid.domain;
  const oy = solid.axis === 'Oy';
  const ratio = solid.ratio ?? 1;
  const samples = solid.samples || [];

  const slices = useMemo(() => {
    const arr: { pos: number; side: number }[] = [];
    for (let i = 0; i < SLICE_COUNT; i++) {
      const t = a + ((b - a) * (i + 0.5)) / SLICE_COUNT;
      arr.push({ pos: t, side: Math.max(1e-4, sideAt(samples, t)) });
    }
    return arr;
  }, [samples, a, b]);

  const depth = (Math.abs(b - a) / SLICE_COUNT) * SLICE_DEPTH;
  if (solid.hidden) return null;
  const cut = a + (b - a) * advanceT;
  const color = solid.color ?? '#0ea5e9';
  const opacity = solid.dim ? 0.25 : 1;

  return (
    <group>
      {slices.filter((sl) => sl.pos <= cut + 1e-9).map((sl, i) => {
        const geo = new THREE.ExtrudeGeometry(sectionShape(solid.section, sl.side, ratio), {
          depth, bevelEnabled: false, steps: 1,
        });
        geo.translate(0, 0, -depth / 2);
        // Ox: lát nằm trong mặt Oyz, xếp dọc theo x ⇒ xoay 90° quanh Y để "depth" chạy theo x.
        // Oy: lát trong mặt Oxz, xếp dọc theo y ⇒ xoay 90° quanh X.
        const rotation: [number, number, number] = oy ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0];
        const position: [number, number, number] = oy ? [0, sl.pos, 0] : [sl.pos, 0, 0];
        return (
          <mesh key={i} geometry={geo} position={position} rotation={rotation} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={color} roughness={0.25} metalness={0.0} clearcoat={1} clearcoatRoughness={0.2}
              side={THREE.DoubleSide} transparent={solid.dim} opacity={opacity}
              emissive={solid.highlight ? new THREE.Color(color) : new THREE.Color('#000000')}
              emissiveIntensity={solid.highlight ? 0.2 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
```

- [ ] **Step 4: Chạy — XANH**

Run: `npx vitest run src/components/3d/__tests__/animatedSliceStack.smoke.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Đăng ký trong `GeometryRenderer.tsx`**

Sau `import AnimatedRevolutionSolid …` (dòng 27):

```tsx
import AnimatedSliceStack from './AnimatedSliceStack';
```

Sau block revolution (dòng 397):

```tsx
      {/* ═══ Slice Stacks (thiết diện đã biết) ═══ */}
      {(geometry.sliceStacks || []).map((s) => (
        <AnimatedSliceStack key={s.id} solid={s} />
      ))}
```

- [ ] **Step 6: Build gate + full test**

```bash
npx vitest run
npm run build
```
Expected: toàn bộ test PASS; build XANH.

- [ ] **Step 7: Commit + push (SliceStack xong đầu-cuối)**

```bash
git add src/components/3d/AnimatedSliceStack.tsx src/components/3d/GeometryRenderer.tsx src/components/3d/__tests__/animatedSliceStack.smoke.test.tsx
git commit -m "feat(advance-đợt2): render AnimatedSliceStack + đăng ký renderer"
git push origin HEAD:main
git push origin HEAD
```

---

## PHASE 2 — AreaRegion (diện tích hình phẳng) trọn đầu-cuối

### Task 6: Kernel — `buildAreaRegion`

**Files:**
- Modify: `api/_lib/kernel/analysis/sliceVolume.ts` (thêm `planarArea` + `buildAreaRegion`)
- Modify: `api/_lib/kernel/index.ts` (thêm export)
- Test: `api/_lib/kernel/analysis/__tests__/areaRegion.test.ts` (tạo)

- [ ] **Step 1: Viết test đỏ**

Tạo `api/_lib/kernel/analysis/__tests__/areaRegion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { planarArea, buildAreaRegion } from '../sliceVolume';

const line = { kind: 'poly', coeffs: [0, 1] } as const;    // y=x
const para = { kind: 'poly', coeffs: [0, 0, 1] } as const; // y=x²

describe('areaRegion — diện tích hình phẳng', () => {
  it('giữa y=x và y=x² trên [0,1] ⇒ 1/6', () => {
    expect(planarArea(line, para, [0, 1]).value).toBeCloseTo(1 / 6, 6);
  });
  it('|·| bất chấp thứ tự: đổi outer/inner vẫn 1/6', () => {
    expect(planarArea(para, line, [0, 1]).value).toBeCloseTo(1 / 6, 6);
  });
  it('builder gắn area verified + samples {x,top,bot}', () => {
    const r = buildAreaRegion('a1', line, [0, 1], para);
    expect(r.area!.verified).toBe(true);
    expect(r.area!.value).toBeCloseTo(1 / 6, 6);
    expect(r.samples![0]).toHaveProperty('top');
    expect(r.samples![0]).toHaveProperty('bot');
  });
  it('inner mặc định = 0 khi vắng', () => {
    const r = buildAreaRegion('a2', { kind: 'const', c: 3 }, [0, 2]); // ∫_0^2 3 dx = 6
    expect(r.area!.value).toBeCloseTo(6, 6);
    expect(r.inner).toEqual({ kind: 'const', c: 0 });
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/areaRegion.test.ts`
Expected: FAIL (`planarArea`/`buildAreaRegion` chưa export).

- [ ] **Step 3: Thêm vào `api/_lib/kernel/analysis/sliceVolume.ts`**

Ở đầu file thêm `AreaRegion` vào import type:

```ts
import type { ProfileFn, SliceStack, AreaRegion, Verified } from '../../../../src/types/geometry';
```

Cuối file thêm:

```ts
export function planarArea(
  outer: ProfileFn, inner: ProfileFn, domain: [number, number],
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const gf = compileProfile(outer);
  const gg = compileProfile(inner);
  return integrate((x) => Math.abs(gf(x) - gg(x)), a, b);
}

function sampleArea(
  outer: ProfileFn, inner: ProfileFn, domain: [number, number], n = 64,
): { x: number; top: number; bot: number }[] {
  const [a, b] = domain;
  const gf = compileProfile(outer);
  const gg = compileProfile(inner);
  const out: { x: number; top: number; bot: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const f = gf(x), g = gg(x);
    out.push({ x, top: Math.max(f, g), bot: Math.min(f, g) });
  }
  return out;
}

export function buildAreaRegion(
  id: string,
  outer: ProfileFn,
  domain: [number, number],
  inner?: ProfileFn,
  color?: string,
  slabDepth = 0.15,
): AreaRegion {
  const inr: ProfileFn = inner ?? { kind: 'const', c: 0 };
  const { value, estimatedError } = planarArea(outer, inr, domain);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = `S=\\int_{${domain[0]}}^{${domain[1]}} |f(x)-g(x)|\\,dx`;
  const area: Verified<number> = { value, latex, verified, estimatedError };
  return { id, outer, inner: inr, domain, area, color, slabDepth, samples: sampleArea(outer, inr, domain) };
}
```

- [ ] **Step 4: Export trong `api/_lib/kernel/index.ts`**

Thêm vào dòng export sliceVolume (đã tạo ở Task 2):

```ts
export { sectionK, sliceStackVolume, buildSliceStack, planarArea, buildAreaRegion } from './analysis/sliceVolume';
```

- [ ] **Step 5: Rebuild + test**

```bash
npm run build:kernel
npx vitest run api/_lib/kernel/analysis/__tests__/areaRegion.test.ts
```
Expected: PASS (4 test).

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/analysis/sliceVolume.ts api/_lib/kernel/analysis/__tests__/areaRegion.test.ts api/_lib/kernel/index.ts api/_lib/kernel-dist/index.mjs
git commit -m "feat(advance-đợt2): kernel buildAreaRegion + tích phân diện tích tự-kiểm"
```

---

### Task 7: Scene builder `buildAreaScene.js`

**Files:**
- Create: `api/_lib/advance/buildAreaScene.js`
- Test: `api/_lib/advance/__tests__/buildAreaScene.test.js` (tạo)

- [ ] **Step 1: Viết test đỏ**

Tạo `api/_lib/advance/__tests__/buildAreaScene.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildAreaScene } from '../buildAreaScene.js';

describe('buildAreaScene', () => {
  const sc = buildAreaScene({
    outer: { kind: 'poly', coeffs: [0, 1] },
    inner: { kind: 'poly', coeffs: [0, 0, 1] },
    domain: [0, 1],
    fnLabel: 'y=x,\\ y=x^2',
    parts: [{ label: 'Câu 1', hoi: 'Tính diện tích' }],
  });
  it('base gắn 1 AreaRegion, qua gate points>0', () => {
    expect(sc.base.areaRegions).toHaveLength(1);
    expect(sc.base.points.length).toBeGreaterThan(0);
  });
  it('2 bước; đáp án S=1/6 verified; nhãn có "Diện tích"', () => {
    expect(sc.steps).toHaveLength(2);
    expect(sc.steps[1].answer.approx).toBeCloseTo(1 / 6, 4);
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].label.toLowerCase()).toContain('diện tích');
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

Run: `npx vitest run api/_lib/advance/__tests__/buildAreaScene.test.js`
Expected: FAIL (module không tồn tại).

- [ ] **Step 3: Viết `api/_lib/advance/buildAreaScene.js`**

```js
// api/_lib/advance/buildAreaScene.js
// Dựng AdvanceScene cho mẫu 'area-plane' (diện tích hình phẳng). Engine tính & tự-kiểm S=∫|f−g|dx.
import { buildAnalysisFigure, buildAreaRegion } from '../kernel-dist/index.mjs';

export function buildAreaScene(params) {
  const { outer, inner, domain, parts } = params;
  const id = 'area1';
  const region = buildAreaRegion(id, outer, domain, inner || undefined, '#22c55e');

  // Điểm mẫu gate: lấy thưa biên trên miền.
  const src = region.samples && region.samples.length ? region.samples : [{ x: domain[0], top: 0, bot: 0 }];
  const stepEvery = Math.max(1, Math.floor(src.length / 8));
  const samplePts = src
    .filter((_, i) => i % stepEvery === 0)
    .map((s, i) => ({ id: `p${i}`, label: '', x: s.x, y: s.top, z: 0 }));

  // Vẽ 2 đường f,g mượt khi LÀ poly.
  const polys = {};
  const polyDomains = {};
  if (outer && outer.kind === 'poly') { polys.f = outer.coeffs.slice(); polyDomains.f = domain; }
  if (inner && inner.kind === 'poly') { polys.g = inner.coeffs.slice(); polyDomains.g = domain; }
  const base = buildAnalysisFigure('Diện tích hình phẳng', { polys, polyDomains, points: samplePts, solids: {} });
  base.areaRegions = [region];

  const curveIds = (base.curves || []).map((c) => c.id);
  const outlineIds = curveIds.length ? curveIds : base.points.map((p) => p.id);
  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Miền phẳng' };
  const partB = hasTwoParts ? parts[1] : { label: 'Diện tích' };

  const s = region.area;
  const steps = [
    {
      id: 's0', label: partA.label,
      visibleIds: [...outlineIds, id], highlightIds: [id],
      anim: { param: 'sweep', label: 'Tô miền', tMax: domain[1], autoplay: true },
    },
    {
      id: 's1', label: partB.label,
      visibleIds: [...outlineIds, id],
      answer: { text: s.latex, approx: s.value, verified: s.verified },
    },
  ];
  return { base, steps };
}
```

- [ ] **Step 4: Chạy — XANH**

Run: `npx vitest run api/_lib/advance/__tests__/buildAreaScene.test.js`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/advance/buildAreaScene.js api/_lib/advance/__tests__/buildAreaScene.test.js
git commit -m "feat(advance-đợt2): buildAreaScene dựng cảnh diện tích hình phẳng"
```

---

### Task 8: Định tuyến backend + prompt + guard cho `area-plane`

**Files:**
- Modify: `api/analyze-advance.js` (routing, deps, guard)
- Modify: `api/_lib/advance/splitPrompt.js` (quy tắc + Ví dụ 10)
- Test: `api/_lib/advance/__tests__/analyze-advance.test.js` (thêm case)

- [ ] **Step 1: Viết test đỏ**

Thêm vào `analyze-advance.test.js`:

```js
it('template area-plane → gọi buildAreaScene, trả mode advance', async () => {
  const deps = {
    splitProblem: async () => ({ type: 'single', template: 'area-plane',
      templateParams: { outer: { kind: 'poly', coeffs: [0, 1] }, inner: { kind: 'poly', coeffs: [0, 0, 1] }, domain: [0, 1] } }),
    buildAdvanceScene: async () => null, solveProblem: async () => ({ ok: false }),
    buildRevolutionScene: () => null, buildSliceScene: () => null,
    buildAreaScene: () => ({ base: { name: 'x', points: [{ id: 'p0' }] }, steps: [] }),
  };
  const out = await assembleAdvance('đề', deps, {});
  expect(out.mode).toBe('advance');
});
```

- [ ] **Step 2: Chạy — ĐỎ**

Run: `npx vitest run api/_lib/advance/__tests__/analyze-advance.test.js -t "area-plane"`
Expected: FAIL.

- [ ] **Step 3: Nhánh routing trong `api/analyze-advance.js`**

Sau block `cross-known` (Task 4), thêm:

```js
  // Đợt 2: diện tích hình phẳng. Engine tính & tự-kiểm S=∫|f−g|dx.
  if (split.template === 'area-plane' && split.templateParams && deps.buildAreaScene) {
    try {
      const scene = deps.buildAreaScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng hỏng → fallback */ }
  }
```

- [ ] **Step 4: Nạp `buildAreaScene` vào deps handler**

Thêm `import('./_lib/advance/buildAreaScene.js')` vào `Promise.all` và `{ buildAreaScene }` vào destructure + object deps truyền cho `assembleAdvance` (song song `buildSliceScene`).

- [ ] **Step 5: Guard `looksLikeArea` + thông điệp**

Cạnh `CROSS_UNSUPPORTED_MSG` thêm:

```js
export const AREA_UNSUPPORTED_MSG =
  'Mình nhận ra đây là bài diện tích hình phẳng nhưng chưa dựng được. ' +
  'Bạn thử ghi rõ hai đường giới hạn miền (y=… và y=…) giúp mình nhé.';
```

Cạnh `looksLikeCrossSection` thêm:

```js
export function looksLikeArea(text) {
  const s = (text || '').toLowerCase();
  return /di[eệ]n t[ií]ch/.test(s) && /(h[iì]nh ph[aẳ]ng|gi[oớ]i h[aạ]n|mi[eề]n)/.test(s);
}
```

Trong `assembleAdvance`, ngay TRƯỚC block `if (looksLikeRevolution(...))`, sau guard cross-section, thêm:

```js
  if (looksLikeArea(effectiveText)) {
    return { mode: 'kernel', degraded: true, ok: false, revUnsupported: true, error: AREA_UNSUPPORTED_MSG };
  }
```

- [ ] **Step 6: Quy tắc + Ví dụ 10 trong `splitPrompt.js`**

Sau quy tắc cross-known, thêm:

```
- Nếu đề tính DIỆN TÍCH hình phẳng giới hạn bởi hai đường y=f(x), y=g(x) → "template":"area-plane",
  "templateParams": { "outer":<đường f>, "inner":<đường g>, "domain":[a,b], "fnLabel":"..", "parts":[..] }.
  "domain" = 2 hoành độ giao (giải f=g); nếu đề cho cận x thì dùng cận đó. Thứ tự outer/inner KHÔNG quan
  trọng (engine lấy |f−g|).
```

Few-shot:

```
[Ví dụ 10 — area-plane, diện tích giữa 2 đường]
Đề: "Tính diện tích hình phẳng giới hạn bởi hai đường y=x và y=x²."
JSON:
{
  "type": "single",
  "setup": "Hình phẳng giới hạn bởi y=x và y=x²",
  "parts": [ { "label": "Câu 1", "hoi": "Tính diện tích hình phẳng", "phan_tu_moi": [] } ],
  "template": "area-plane",
  "templateParams": {
    "outer": { "kind": "poly", "coeffs": [0, 1] },
    "inner": { "kind": "poly", "coeffs": [0, 0, 1] },
    "domain": [0, 1],
    "fnLabel": "y=x,\\ y=x^2",
    "parts": [ { "label": "Câu 1", "hoi": "Tính diện tích hình phẳng" } ]
  }
}
```

- [ ] **Step 7: Chạy full analyze-advance test — XANH**

Run: `npx vitest run api/_lib/advance/__tests__/analyze-advance.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add api/analyze-advance.js api/_lib/advance/splitPrompt.js api/_lib/advance/__tests__/analyze-advance.test.js
git commit -m "feat(advance-đợt2): định tuyến area-plane + prompt Ví dụ 10 + guard diện tích"
```

---

### Task 9: Render `<AnimatedAreaRegion>` + đăng ký

**Files:**
- Create: `src/components/3d/AnimatedAreaRegion.tsx`
- Modify: `src/components/3d/GeometryRenderer.tsx`
- Test: `src/components/3d/__tests__/animatedAreaRegion.smoke.test.tsx` (tạo)

- [ ] **Step 1: Viết test đỏ**

Tạo `src/components/3d/__tests__/animatedAreaRegion.smoke.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { areaLoopForTest } from '../AnimatedAreaRegion';

describe('AnimatedAreaRegion · viền miền', () => {
  it('loop kín: đi top a→b rồi bot b→a, số đỉnh = 2·(n+1)', () => {
    const samples = [
      { x: 0, top: 0, bot: 0 }, { x: 0.5, top: 0.5, bot: 0.25 }, { x: 1, top: 1, bot: 1 },
    ];
    const loop = areaLoopForTest(samples);
    expect(loop.length).toBe(samples.length * 2);
    // Đỉnh đầu = (0, top0); đỉnh cuối = (0, bot0) (khép về x đầu).
    expect(loop[0]).toMatchObject({ x: 0 });
    expect(loop[loop.length - 1]).toMatchObject({ x: 0 });
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ**

Run: `npx vitest run src/components/3d/__tests__/animatedAreaRegion.smoke.test.tsx`
Expected: FAIL (module không tồn tại).

- [ ] **Step 3: Viết `src/components/3d/AnimatedAreaRegion.tsx`**

```tsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { AreaRegion } from '@/types/geometry';

// Viền miền kín: biên trên (a→b) rồi biên dưới (b→a). Export riêng để test thuần.
export function areaLoopForTest(samples: { x: number; top: number; bot: number }[]) {
  const top = samples.map((s) => ({ x: s.x, y: s.top }));
  const bot = samples.slice().reverse().map((s) => ({ x: s.x, y: s.bot }));
  return [...top, ...bot];
}

export default function AnimatedAreaRegion({ region }: { region: AreaRegion }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const { gl } = useThree();
  gl.localClippingEnabled = true;

  const [a, b] = region.domain;
  const depth = region.slabDepth ?? 0.15;
  const samples = region.samples || [];

  const geometry = useMemo(() => {
    if (samples.length < 2) return null;
    const shape = new THREE.Shape();
    const loop = areaLoopForTest(samples);
    shape.moveTo(loop[0].x, loop[0].y);
    for (let i = 1; i < loop.length; i++) shape.lineTo(loop[i].x, loop[i].y);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  }, [samples, depth]);

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  clipPlane.constant = a + (b - a) * advanceT;   // lộ dần trái→phải

  if (region.hidden || !geometry) return null;
  const color = region.color ?? '#22c55e';
  const opacity = region.dim ? 0.2 : 0.7;   // tấm bán trong suốt (là DIỆN TÍCH, không phải khối đặc)

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color} roughness={0.3} metalness={0.0} side={THREE.DoubleSide}
        transparent opacity={opacity}
        emissive={region.highlight ? new THREE.Color(color) : new THREE.Color('#000000')}
        emissiveIntensity={region.highlight ? 0.2 : 0}
        clippingPlanes={[clipPlane]}
      />
    </mesh>
  );
}
```

- [ ] **Step 4: Chạy — XANH**

Run: `npx vitest run src/components/3d/__tests__/animatedAreaRegion.smoke.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Đăng ký trong `GeometryRenderer.tsx`**

Sau `import AnimatedSliceStack …`:

```tsx
import AnimatedAreaRegion from './AnimatedAreaRegion';
```

Sau block slice stacks:

```tsx
      {/* ═══ Area Regions (diện tích hình phẳng) ═══ */}
      {(geometry.areaRegions || []).map((r) => (
        <AnimatedAreaRegion key={r.id} region={r} />
      ))}
```

- [ ] **Step 6: Build gate + full test**

```bash
npx vitest run
npm run build
```
Expected: toàn bộ test PASS; build XANH.

- [ ] **Step 7: Commit + push (AreaRegion xong đầu-cuối)**

```bash
git add src/components/3d/AnimatedAreaRegion.tsx src/components/3d/GeometryRenderer.tsx src/components/3d/__tests__/animatedAreaRegion.smoke.test.tsx
git commit -m "feat(advance-đợt2): render AnimatedAreaRegion + đăng ký renderer"
git push origin HEAD:main
git push origin HEAD
```

---

## Hoàn tất Đợt 2

- [ ] **Kiểm tổng:** `npx vitest run` (toàn bộ xanh) + `npm run build` (xanh).
- [ ] **Cập nhật memory** `advance-calculus-revolution.md`: đánh dấu Đợt 2 (SliceStack + AreaRegion) SHIPPED, ghi commit, lưu ý render chưa soi-mắt (route auth-gated) + chưa live-test qua LLM classifier với Ví dụ 9/10.
- [ ] **(Tuỳ chọn) Live-test classifier** khi có key: đề thiết diện vuông (đáy √x) và diện tích y=x/y=x² → kỳ vọng tag `cross-known`/`area-plane` + số verified đúng (8 và 1/6).

## Ghi chú tự-review plan
- **Type nhất quán:** `SliceStack.samples` dùng `{t,side}`; renderer + scene dùng đúng `t`/`side`. `AreaRegion.samples` dùng `{x,top,bot}`; builder + renderer + test khớp. `sectionShape`/`sliceSamplesForTest`/`areaLoopForTest` export đúng tên như test gọi.
- **Phủ spec:** SliceStack (4 hình lát, cả rect+ratio) ✓; AreaRegion (slab mỏng, số = diện tích) ✓; Cách A (lọc lát theo t) ✓; guard fallback 2 dạng ✓; kernel tự-kiểm ✓; projectScene bóc lớp ✓.
- **Không placeholder:** mọi step có code/lệnh cụ thể + kỳ vọng đỏ/xanh.
