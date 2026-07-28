# Advance — Đợt 3 "Thiết diện" (SectionCut) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advance mode dựng được **thiết diện của khối đa diện bị mặt phẳng (qua 3 điểm) cắt** + tính diện tích chính xác, tự kiểm.

**Architecture:** LLM chỉ phân loại `section-poly` + trích {khối, kích thước, 3 điểm}; kernel `sectionCut.ts` dựng khối chuẩn → cắt lồi → đa giác thiết diện + diện tích (2 công thức cross-check ⇒ `verified`). Element `SectionCut extends AdvanceFlags` ⇒ bóc-lớp tự chạy. Renderer tô đa giác + lộ dần bằng clip-plane trong mặt phẳng thiết diện.

**Tech Stack:** Vite+React+TS, Three.js, kernel TS→`kernel-dist/index.mjs` (rebuild bằng `npm run build:kernel`), vitest. Deploy: push origin/main ⇒ Vercel auto-deploy (sau khi `npm run build` xanh).

**Spec:** `docs/superpowers/specs/2026-07-28-advance-calculus-dot-3-section.md`.

**Quy ước chung mọi task:** red test → chạy xác nhận FAIL → code tối thiểu → chạy PASS → `npm run build` xanh → commit → `git push origin HEAD:main` rồi `git push origin HEAD`. NEVER hardcode API key.

---

### Task 1: Type `SectionCut` + `sectionCuts?` + bóc-lớp

**Files:**
- Modify: `src/types/geometry.ts` (sau block Đợt 2 `AreaRegion`, và trong `GeometryData`)
- Modify: `src/lib/advanceProject.ts` (thêm 1 dòng `.map(flag)`)
- Test: `src/lib/__tests__/advanceProject.dot3.test.ts`

- [ ] **Step 1: Viết test đỏ** `src/lib/__tests__/advanceProject.dot3.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';
import type { AdvanceScene, SectionCut } from '@/types/geometry';

function sceneWithSection(): AdvanceScene {
  const sec: SectionCut = {
    id: 'sec1', targetKind: 'cube',
    polygon: [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]],
    plane: { point: [0.5, 0, 0], normal: [1, 1, 1] },
    area: { value: 0.2165, latex: 'S=…', verified: true },
  };
  return {
    base: { name: 't', points: [], lines: [], sectionCuts: [sec] },
    steps: [
      { id: 's0', label: 'mp', visibleIds: [] },
      { id: 's1', label: 'thiết diện', visibleIds: ['sec1'], highlightIds: ['sec1'] },
    ],
  };
}

// LƯU Ý: projectScene có chữ ký 3 tham số (base, steps, cur) — KHÔNG phải (scene, cur).
describe('advanceProject — SectionCut (Đợt 3)', () => {
  it('ẩn khi ∉ visibleIds', () => {
    const s = sceneWithSection();
    const g = projectScene(s.base, s.steps, 0);
    expect(g.sectionCuts![0].hidden).toBe(true);
  });
  it('nổi khi mới xuất hiện ở câu hiện tại', () => {
    const s = sceneWithSection();
    const g = projectScene(s.base, s.steps, 1);
    expect(g.sectionCuts![0].hidden).toBe(false);
    expect(g.sectionCuts![0].highlight).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy xác nhận FAIL** — `npx vitest run src/lib/__tests__/advanceProject.dot3.test.ts` (Expected: FAIL — `sectionCuts` chưa tồn tại trên type/map).

- [ ] **Step 3: Thêm type** vào `src/types/geometry.ts` ngay sau interface `AreaRegion` (kết thúc dòng `samples?: { x: number; top: number; bot: number }[];\n}`):

```ts
// ── Calculus Đợt 3: thiết diện = mặt phẳng ∩ khối đa diện ───────────
// Cách xác định điểm tạo mặt phẳng: đỉnh có tên, HOẶC điểm trên cạnh (t∈[0,1] từ v1→v2; 0.5 = trung điểm).
export type SectionPointSpec =
  | { vertex: string }                              // 'A', 'S', "C'"…
  | { onEdge: [string, string]; t: number };        // t·(v2−v1)+v1; t=0.5 ⇒ trung điểm

export type PolyhedronKind = 'cube' | 'box' | 'pyramid-quad' | 'prism-tri';

export interface SectionCut extends AdvanceFlags {
  id: string;
  targetKind: PolyhedronKind;                       // khối bị cắt (nhãn)
  polygon: [number, number, number][];              // đỉnh đa giác thiết diện, thứ tự vòng (engine dựng)
  plane: { point: [number, number, number]; normal: [number, number, number] };
  area?: Verified<number>;
  color?: string;
}
```

Và thêm vào interface `GeometryData` ngay sau `areaRegions?: AreaRegion[];`:

```ts
  sectionCuts?: SectionCut[];
```

- [ ] **Step 4: Thêm map bóc-lớp** trong `src/lib/advanceProject.ts` — tìm dòng `areaRegions: (base.areaRegions || []).map(flag),` và thêm NGAY SAU nó:

```ts
    sectionCuts: (base.sectionCuts || []).map(flag),
```

- [ ] **Step 5: Chạy PASS** — `npx vitest run src/lib/__tests__/advanceProject.dot3.test.ts` (Expected: PASS). Rồi `npm run build` (Expected: built).

- [ ] **Step 6: Commit + push**

```bash
git add src/types/geometry.ts src/lib/advanceProject.ts src/lib/__tests__/advanceProject.dot3.test.ts && git commit -m "feat(đợt3): type SectionCut + bóc-lớp sectionCuts" && git push origin HEAD:main && git push origin HEAD
```

---

### Task 2: Kernel — khối chuẩn + giải điểm + mặt phẳng từ 3 điểm

**Files:**
- Create: `api/_lib/kernel/analysis/sectionCut.ts`
- Test: `api/_lib/kernel/analysis/__tests__/sectionCut.test.ts`

- [ ] **Step 1: Viết test đỏ** `api/_lib/kernel/analysis/__tests__/sectionCut.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildPolyhedron, resolveSectionPoint, planeFrom3 } from '../sectionCut';

describe('sectionCut — khối chuẩn & giải điểm', () => {
  it('cube: 8 đỉnh, 12 cạnh, 6 mặt', () => {
    const p = buildPolyhedron('cube', { a: 2 });
    expect(Object.keys(p.vertices).length).toBe(8);
    expect(p.edges.length).toBe(12);
    expect(p.faces.length).toBe(6);
    expect(p.vertices['C']).toEqual([2, 2, 0]);
    expect(p.vertices["A'"]).toEqual([0, 0, 2]);
  });
  it('pyramid-quad: 5 đỉnh (có S), 8 cạnh, 5 mặt; S trên tâm đáy', () => {
    const p = buildPolyhedron('pyramid-quad', { a: 2, b: 2, h: 3 });
    expect(p.vertices['S']).toEqual([1, 1, 3]);
    expect(Object.keys(p.vertices).length).toBe(5);
    expect(p.edges.length).toBe(8);
  });
  it('prism-tri: 6 đỉnh, 9 cạnh', () => {
    const p = buildPolyhedron('prism-tri', { a: 2, h: 4 });
    expect(Object.keys(p.vertices).length).toBe(6);
    expect(p.edges.length).toBe(9);
  });
  it('resolveSectionPoint: đỉnh & trung điểm', () => {
    const p = buildPolyhedron('cube', { a: 2 });
    expect(resolveSectionPoint(p, { vertex: 'B' })).toEqual([2, 0, 0]);
    expect(resolveSectionPoint(p, { onEdge: ['A', 'B'], t: 0.5 })).toEqual([1, 0, 0]);
  });
  it('planeFrom3: 3 điểm thẳng hàng ⇒ null', () => {
    expect(planeFrom3([[0, 0, 0], [1, 0, 0], [2, 0, 0]])).toBeNull();
  });
  it('planeFrom3: pháp tuyến đúng phương', () => {
    const pl = planeFrom3([[0, 0, 0], [1, 0, 0], [0, 1, 0]])!;
    expect(Math.abs(pl.normal[0])).toBeLessThan(1e-9);
    expect(Math.abs(pl.normal[1])).toBeLessThan(1e-9);
    expect(Math.abs(pl.normal[2])).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Chạy xác nhận FAIL** — `npx vitest run api/_lib/kernel/analysis/__tests__/sectionCut.test.ts` (Expected: FAIL — module chưa có).

- [ ] **Step 3: Tạo `api/_lib/kernel/analysis/sectionCut.ts`** (phần 1 — khối + điểm + mặt phẳng; phần cắt/diện tích thêm ở Task 3):

```ts
// api/_lib/kernel/analysis/sectionCut.ts
// Lõi tất định Đợt 3: thiết diện = mặt phẳng ∩ khối đa diện lồi. LLM chỉ trích tham số; engine dựng & kiểm.
import type {
  SectionPointSpec, PolyhedronKind, SectionCut, Verified,
} from '../../../../src/types/geometry';

export type Vec3 = [number, number, number];
export type Poly = {
  vertices: Record<string, Vec3>;
  edges: [string, string][];
  faces: string[][];
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): number => Math.sqrt(dot(a, a));

// Sinh cạnh từ chu trình đỉnh (khép kín).
function ring(names: string[]): [string, string][] {
  return names.map((n, i) => [n, names[(i + 1) % names.length]] as [string, string]);
}

export function buildPolyhedron(kind: PolyhedronKind, dims: { a?: number; b?: number; c?: number; h?: number }): Poly {
  const a = dims.a ?? 1;
  if (kind === 'cube' || kind === 'box') {
    const bx = kind === 'cube' ? a : (dims.b ?? a);
    const cz = kind === 'cube' ? a : (dims.c ?? a);
    const vertices: Record<string, Vec3> = {
      A: [0, 0, 0], B: [a, 0, 0], C: [a, bx, 0], D: [0, bx, 0],
      "A'": [0, 0, cz], "B'": [a, 0, cz], "C'": [a, bx, cz], "D'": [0, bx, cz],
    };
    const bottom = ['A', 'B', 'C', 'D']; const top = ["A'", "B'", "C'", "D'"];
    const edges: [string, string][] = [
      ...ring(bottom), ...ring(top),
      ['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"],
    ];
    const faces = [
      bottom, top,
      ['A', 'B', "B'", "A'"], ['B', 'C', "C'", "B'"],
      ['C', 'D', "D'", "C'"], ['D', 'A', "A'", "D'"],
    ];
    return { vertices, edges, faces };
  }
  if (kind === 'pyramid-quad') {
    const bx = dims.b ?? a; const h = dims.h ?? a;
    const vertices: Record<string, Vec3> = {
      A: [0, 0, 0], B: [a, 0, 0], C: [a, bx, 0], D: [0, bx, 0], S: [a / 2, bx / 2, h],
    };
    const base = ['A', 'B', 'C', 'D'];
    const edges: [string, string][] = [
      ...ring(base), ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D'],
    ];
    const faces = [base, ['A', 'B', 'S'], ['B', 'C', 'S'], ['C', 'D', 'S'], ['D', 'A', 'S']];
    return { vertices, edges, faces };
  }
  // prism-tri: đáy tam giác đều cạnh a, cao h.
  const h = dims.h ?? a; const cy = (Math.sqrt(3) / 2) * a;
  const vertices: Record<string, Vec3> = {
    A: [0, 0, 0], B: [a, 0, 0], C: [a / 2, cy, 0],
    "A'": [0, 0, h], "B'": [a, 0, h], "C'": [a / 2, cy, h],
  };
  const bottom = ['A', 'B', 'C']; const top = ["A'", "B'", "C'"];
  const edges: [string, string][] = [
    ...ring(bottom), ...ring(top), ['A', "A'"], ['B', "B'"], ['C', "C'"],
  ];
  const faces = [
    bottom, top,
    ['A', 'B', "B'", "A'"], ['B', 'C', "C'", "B'"], ['C', 'A', "A'", "C'"],
  ];
  return { vertices, edges, faces };
}

export function resolveSectionPoint(poly: Poly, spec: SectionPointSpec): Vec3 {
  if ('vertex' in spec) {
    const v = poly.vertices[spec.vertex];
    if (!v) throw new Error(`Đỉnh không tồn tại: ${spec.vertex}`);
    return v;
  }
  const [n1, n2] = spec.onEdge;
  const v1 = poly.vertices[n1]; const v2 = poly.vertices[n2];
  if (!v1 || !v2) throw new Error(`Cạnh không hợp lệ: ${n1}${n2}`);
  return add(v1, scale(sub(v2, v1), spec.t));
}

export function planeFrom3(p: Vec3[]): { point: Vec3; normal: Vec3 } | null {
  if (p.length < 3) return null;
  const n = cross(sub(p[1], p[0]), sub(p[2], p[0]));
  const len = norm(n);
  if (len < 1e-9) return null;                 // 3 điểm thẳng hàng
  return { point: p[0], normal: scale(n, 1 / len) };
}

// (Task 3 sẽ thêm sliceConvexPolyhedron, polygonArea3D, buildSectionCut, và các re-export.)
export const __vecHelpers = { sub, add, scale, dot, cross, norm };
```

- [ ] **Step 4: Chạy PASS** — `npx vitest run api/_lib/kernel/analysis/__tests__/sectionCut.test.ts` (Expected: PASS).

- [ ] **Step 5: Commit** (chưa push — Task 3 cùng file kernel; push ở cuối Task 3 sau khi rebuild dist)

```bash
git add api/_lib/kernel/analysis/sectionCut.ts api/_lib/kernel/analysis/__tests__/sectionCut.test.ts && git commit -m "feat(đợt3): kernel khối chuẩn + giải điểm + planeFrom3"
```

---

### Task 3: Kernel — cắt lồi + diện tích + `buildSectionCut` (tự kiểm) + export + rebuild dist

**Files:**
- Modify: `api/_lib/kernel/analysis/sectionCut.ts` (thêm hàm cắt/diện tích/build)
- Modify: `api/_lib/kernel/index.ts` (export)
- Test: append vào `api/_lib/kernel/analysis/__tests__/sectionCut.test.ts`
- Rebuild: `npm run build:kernel`

- [ ] **Step 1: Append test đỏ** vào cuối `api/_lib/kernel/analysis/__tests__/sectionCut.test.ts`:

```ts
import { sliceConvexPolyhedron, polygonArea3D, buildSectionCut } from '../sectionCut';

describe('sectionCut — cắt & diện tích', () => {
  it('lập phương a=1 cắt qua 3 trung điểm AB,AD,AA\' ⇒ tam giác đều S=√3/8', () => {
    const p = buildPolyhedron('cube', { a: 1 });
    const pt = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]] as [number, number, number][];
    const pl = planeFrom3(pt)!;
    const polygon = sliceConvexPolyhedron(p, pl.point, pl.normal);
    expect(polygon.length).toBe(3);
    expect(polygonArea3D(polygon)).toBeCloseTo(Math.sqrt(3) / 8, 6);
  });
  it('mp song song đáy (z=1) cắt hộp 2×3×4 ⇒ hình chữ nhật S=6', () => {
    const p = buildPolyhedron('box', { a: 2, b: 3, c: 4 });
    const polygon = sliceConvexPolyhedron(p, [0, 0, 1], [0, 0, 1]);
    expect(polygon.length).toBe(4);
    expect(polygonArea3D(polygon)).toBeCloseTo(6, 6);
  });
  it('mp không cắt trong khối ⇒ []', () => {
    const p = buildPolyhedron('cube', { a: 1 });
    expect(sliceConvexPolyhedron(p, [0, 0, 5], [0, 0, 1]).length).toBe(0);
  });
  it('buildSectionCut: verified true + area đúng', () => {
    const r = buildSectionCut('sec1', 'cube', { a: 1 },
      [{ onEdge: ['A', 'B'], t: 0.5 }, { onEdge: ['A', 'D'], t: 0.5 }, { onEdge: ['A', "A'"], t: 0.5 }])!;
    expect(r.sectionCut.area!.verified).toBe(true);
    expect(r.sectionCut.area!.value).toBeCloseTo(Math.sqrt(3) / 8, 6);
    expect(r.sectionCut.polygon.length).toBe(3);
  });
  it('buildSectionCut: 3 điểm thẳng hàng ⇒ null', () => {
    const r = buildSectionCut('sec1', 'cube', { a: 1 },
      [{ vertex: 'A' }, { onEdge: ['A', 'B'], t: 0.5 }, { vertex: 'B' }]);
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy xác nhận FAIL** — `npx vitest run api/_lib/kernel/analysis/__tests__/sectionCut.test.ts` (Expected: FAIL — hàm chưa có).

- [ ] **Step 3: Thêm vào `sectionCut.ts`** (thay dòng `export const __vecHelpers…` cuối file bằng khối dưới; giữ `__vecHelpers` nếu muốn, hoặc bỏ):

```ts
const EPS = 1e-7;
const roundKey = (v: Vec3): string => v.map((x) => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(6)).join(',');

// Sắp các điểm đồng phẳng theo vòng quanh trọng tâm (dùng 2 vector trực chuẩn trong mp).
function orderRing(pts: Vec3[], normal: Vec3): Vec3[] {
  if (pts.length < 3) return pts;
  const c = scale(pts.reduce((s, p) => add(s, p), [0, 0, 0] as Vec3), 1 / pts.length);
  const u0 = sub(pts[0], c);
  const uLen = norm(u0);
  const u = uLen < EPS ? ([1, 0, 0] as Vec3) : scale(u0, 1 / uLen);
  const v = cross(normal, u);
  return [...pts].sort((p, q) => {
    const ap = Math.atan2(dot(sub(p, c), v), dot(sub(p, c), u));
    const aq = Math.atan2(dot(sub(q, c), v), dot(sub(q, c), u));
    return ap - aq;
  });
}

export function sliceConvexPolyhedron(poly: Poly, point: Vec3, normal: Vec3): Vec3[] {
  const d = (v: Vec3): number => dot(sub(v, point), normal);
  const seen = new Set<string>();
  const pts: Vec3[] = [];
  const push = (v: Vec3): void => { const k = roundKey(v); if (!seen.has(k)) { seen.add(k); pts.push(v); } };
  for (const [n1, n2] of poly.edges) {
    const v1 = poly.vertices[n1]; const v2 = poly.vertices[n2];
    const d1 = d(v1); const d2 = d(v2);
    if (Math.abs(d1) < EPS) push(v1);
    if (Math.abs(d2) < EPS) push(v2);
    if (d1 * d2 < -EPS * EPS) {                     // cắt hẳn qua cạnh
      const t = d1 / (d1 - d2);
      push(add(v1, scale(sub(v2, v1), t)));
    }
  }
  if (pts.length < 3) return [];
  return orderRing(pts, normal);
}

// Diện tích đa giác phẳng 3D (Newell): ½‖Σ vi × vi+1‖.
export function polygonArea3D(pts: Vec3[]): number {
  if (pts.length < 3) return 0;
  let n: Vec3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) n = add(n, cross(pts[i], pts[(i + 1) % pts.length]));
  return norm(n) / 2;
}

// Diện tích bằng quạt tam giác từ đỉnh 0 (độc lập với Newell) — dùng cross-check thứ tự vòng.
function fanArea(pts: Vec3[]): number {
  let s = 0;
  for (let i = 1; i < pts.length - 1; i++) s += norm(cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0]))) / 2;
  return s;
}

export function buildSectionCut(
  id: string, kind: PolyhedronKind, dims: { a?: number; b?: number; c?: number; h?: number },
  specs: SectionPointSpec[], color = '#f59e0b',
): { sectionCut: SectionCut; poly: Poly } | null {
  if (!specs || specs.length < 3) return null;
  const poly = buildPolyhedron(kind, dims);
  let resolved: Vec3[];
  try { resolved = specs.slice(0, 3).map((s) => resolveSectionPoint(poly, s)); }
  catch { return null; }
  const pl = planeFrom3(resolved);
  if (!pl) return null;
  const polygon = sliceConvexPolyhedron(poly, pl.point, pl.normal);
  if (polygon.length < 3) return null;
  const aNewell = polygonArea3D(polygon);
  const aFan = fanArea(polygon);
  const verified = Math.abs(aNewell - aFan) <= 1e-9 * Math.max(1, aNewell) && aNewell > EPS;
  const latex = `S_{\\text{thiết diện}}=${aNewell.toFixed(4)}`;
  const area: Verified<number> = { value: aNewell, latex, verified, estimatedError: Math.abs(aNewell - aFan) };
  return {
    sectionCut: {
      id, targetKind: kind, polygon: polygon as [number, number, number][],
      plane: { point: pl.point, normal: pl.normal }, area, color,
    },
    poly,
  };
}
```

- [ ] **Step 4: Export** trong `api/_lib/kernel/index.ts` — thêm cạnh các export analysis khác (vd sau dòng export sliceVolume):

```ts
export { buildPolyhedron, resolveSectionPoint, planeFrom3, sliceConvexPolyhedron, polygonArea3D, buildSectionCut } from './analysis/sectionCut';
```

- [ ] **Step 5: Rebuild bundle** — `npm run build:kernel` (Expected: sinh lại `api/_lib/kernel-dist/index.mjs`).

- [ ] **Step 6: Chạy PASS + build** — `npx vitest run api/_lib/kernel/analysis/__tests__/sectionCut.test.ts` (PASS) rồi `npm run build` (built).

- [ ] **Step 7: Commit + push**

```bash
git add api/_lib/kernel/analysis/sectionCut.ts api/_lib/kernel/analysis/__tests__/sectionCut.test.ts api/_lib/kernel/index.ts api/_lib/kernel-dist/index.mjs && git commit -m "feat(đợt3): cắt lồi + diện tích + buildSectionCut tự kiểm + rebuild dist" && git push origin HEAD:main && git push origin HEAD
```

---

### Task 4: Scene builder `buildSectionScene.js`

**Files:**
- Create: `api/_lib/advance/buildSectionScene.js`
- Test: `api/_lib/advance/__tests__/buildSectionScene.test.js`

- [ ] **Step 1: Viết test đỏ** `api/_lib/advance/__tests__/buildSectionScene.test.js`

```js
import { describe, it, expect } from 'vitest';
import { buildSectionScene } from '../buildSectionScene.js';

const cubeMidParams = {
  kind: 'cube', dims: { a: 1 },
  points: [{ onEdge: ['A', 'B'], t: 0.5 }, { onEdge: ['A', 'D'], t: 0.5 }, { onEdge: ['A', "A'"], t: 0.5 }],
};

describe('buildSectionScene', () => {
  it('dựng base có đỉnh khối + cạnh + 3 điểm + sectionCuts', () => {
    const scene = buildSectionScene(cubeMidParams);
    expect(scene).not.toBeNull();
    expect(scene.base.sectionCuts).toHaveLength(1);
    expect(scene.base.points.length).toBeGreaterThanOrEqual(8 + 3); // 8 đỉnh + 3 điểm mp
    expect(scene.base.lines.length).toBe(12);                        // 12 cạnh lập phương
    expect(scene.base.sectionCuts[0].area.verified).toBe(true);
  });
  it('2 bước: dựng mp (highlight 3 điểm) → thiết diện (anim reveal + answer)', () => {
    const { steps } = buildSectionScene(cubeMidParams);
    expect(steps).toHaveLength(2);
    expect(steps[1].visibleIds).toContain('sec1');
    expect(steps[1].anim.param).toBe('reveal');
    expect(steps[1].answer.verified).toBe(true);
  });
  it('kind lạ ⇒ null', () => {
    expect(buildSectionScene({ kind: 'sphere', dims: {}, points: cubeMidParams.points })).toBeNull();
  });
  it('3 điểm suy biến (thẳng hàng) ⇒ null', () => {
    expect(buildSectionScene({ kind: 'cube', dims: { a: 1 },
      points: [{ vertex: 'A' }, { onEdge: ['A', 'B'], t: 0.5 }, { vertex: 'B' }] })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy xác nhận FAIL** — `npx vitest run api/_lib/advance/__tests__/buildSectionScene.test.js` (Expected: FAIL — module chưa có).

- [ ] **Step 3: Tạo `api/_lib/advance/buildSectionScene.js`**

```js
// api/_lib/advance/buildSectionScene.js
// Dựng AdvanceScene cho mẫu 'section-poly' (thiết diện khối đa diện). LLM chỉ trích tham số; engine dựng & kiểm.
// Khối = điểm có tên + cạnh (renderer sẵn có vẽ); phần mới = đa giác SectionCut (đã verified).
import { buildSectionCut } from '../kernel-dist/index.mjs';

const KINDS = ['cube', 'box', 'pyramid-quad', 'prism-tri'];

export function buildSectionScene(params) {
  const { kind, dims, points, parts, color } = params || {};
  if (!KINDS.includes(kind)) return null;
  const built = buildSectionCut('sec1', kind, dims || {}, points || [], color || '#f59e0b');
  if (!built) return null;
  const { sectionCut, poly } = built;

  // Đỉnh khối → Point3D có nhãn; cạnh → Line3D.
  const vpoints = Object.entries(poly.vertices).map(([name, v]) => ({
    id: name, label: name, x: v[0], y: v[1], z: v[2],
  }));
  const vlines = poly.edges.map(([a, b], i) => ({ id: `e${i}`, from: a, to: b, style: 'solid' }));

  // 3 điểm xác định mặt phẳng → điểm nổi, nhãn M/N/P (nếu không trùng đỉnh có sẵn).
  const labelMNP = ['M', 'N', 'P'];
  const mpPoints = sectionCut.polygon; // KHÔNG dùng — polygon là đỉnh thiết diện; điểm mp lấy từ params
  const defPts = (points || []).slice(0, 3).map((sp, i) => {
    // Toạ độ điểm xác định: engine dùng cùng công thức resolve (đỉnh/onEdge) — tính lại từ poly.
    let x, y, z;
    if (sp.vertex) { const v = poly.vertices[sp.vertex]; [x, y, z] = v; }
    else {
      const [n1, n2] = sp.onEdge; const v1 = poly.vertices[n1]; const v2 = poly.vertices[n2]; const t = sp.t;
      x = v1[0] + (v2[0] - v1[0]) * t; y = v1[1] + (v2[1] - v1[1]) * t; z = v1[2] + (v2[2] - v1[2]) * t;
    }
    const onVertex = sp.vertex ? sp.vertex : null;
    return { id: onVertex || `mp${i}`, label: onVertex || labelMNP[i], x, y, z };
  });
  // Bỏ điểm xác định trùng id đỉnh khối (đỉnh đã có trong vpoints).
  const existing = new Set(vpoints.map((p) => p.id));
  const extraPts = defPts.filter((p) => !existing.has(p.id));

  const base = {
    name: 'Thiết diện', points: [...vpoints, ...extraPts], lines: vlines,
    curves: [], planes: [], sectionCuts: [sectionCut],
  };

  const solidIds = [...vpoints.map((p) => p.id), ...vlines.map((l) => l.id)];
  const defPtIds = defPts.map((p) => p.id);
  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Dựng mặt phẳng cắt' };
  const partB = hasTwoParts ? parts[1] : { label: 'Thiết diện' };
  const S = sectionCut.area;

  const steps = [
    {
      id: 's0', label: partA.label,
      visibleIds: [...solidIds, ...defPtIds], highlightIds: [...defPtIds],
    },
    {
      id: 's1', label: partB.label,
      visibleIds: [...solidIds, ...defPtIds, 'sec1'], highlightIds: ['sec1'],
      anim: { param: 'reveal', label: 'Lộ thiết diện', tMax: 1, autoplay: true },
      answer: { text: S.latex, approx: S.value, verified: S.verified },
    },
  ];
  return { base, steps };
}
```

> Ghi chú: bỏ biến `mpPoints` thừa nếu muốn sạch. Chức năng đúng là điều kiện đạt.

- [ ] **Step 4: Chạy PASS + build** — `npx vitest run api/_lib/advance/__tests__/buildSectionScene.test.js` (PASS) rồi `npm run build` (built).

- [ ] **Step 5: Commit + push**

```bash
git add api/_lib/advance/buildSectionScene.js api/_lib/advance/__tests__/buildSectionScene.test.js && git commit -m "feat(đợt3): buildSectionScene (2 bước: dựng mp → thiết diện)" && git push origin HEAD:main && git push origin HEAD
```

---

### Task 5: Routing `analyze-advance.js` + prompt `splitPrompt.js`

**Files:**
- Modify: `api/analyze-advance.js` (nhánh template + guard + deps)
- Modify: `api/_lib/advance/splitPrompt.js` (luật + Ví dụ 11/12)
- Test: append vào `api/_lib/__tests__/analyze-advance.test.js`

- [ ] **Step 1: Append test đỏ** vào `api/_lib/__tests__/analyze-advance.test.js` (dùng đúng style deps-injected sẵn có trong file — copy khuôn từ case `cross-known`):

```js
import { looksLikeSection } from '../../analyze-advance.js';

describe('Đợt 3 — section-poly', () => {
  it('template section-poly ⇒ gọi buildSectionScene', async () => {
    const deps = {
      splitProblem: async () => ({ template: 'section-poly', templateParams: { kind: 'cube', dims: { a: 1 }, points: [] }, type: 'single' }),
      buildSectionScene: () => ({ base: { name: 't', points: [], lines: [] }, steps: [] }),
      solveProblem: async () => ({ ok: false }),
    };
    const out = await assembleAdvance('thiết diện lập phương', deps, {});
    expect(out.mode).toBe('advance');
  });
  it('looksLikeSection: cần khối + tín hiệu cắt', () => {
    expect(looksLikeSection('thiết diện của hình chóp S.ABCD cắt bởi mặt phẳng (MNP)')).toBe(true);
    expect(looksLikeSection('tính diện tích hình phẳng giới hạn bởi y=x')).toBe(false);
  });
  it('đề thiết diện khối không dựng được ⇒ revUnsupported (hoàn credit)', async () => {
    const deps = {
      splitProblem: async () => ({ type: 'single' }),
      buildSectionScene: () => null,
      solveProblem: async () => ({ ok: true, geometry: {} }),
    };
    const out = await assembleAdvance('thiết diện hình lập phương cắt bởi mặt phẳng qua 3 trung điểm', deps, {});
    expect(out.revUnsupported).toBe(true);
  });
});
```

(Nếu file test dùng `import { assembleAdvance } from …` sẵn ở đầu — tái dùng; chỉ thêm `looksLikeSection` vào import.)

- [ ] **Step 2: Chạy xác nhận FAIL** — `npx vitest run api/_lib/__tests__/analyze-advance.test.js` (Expected: FAIL — `looksLikeSection`/nhánh chưa có).

- [ ] **Step 3a: `api/analyze-advance.js`** — thêm hằng thông điệp (cạnh AREA_UNSUPPORTED_MSG):

```js
// Đợt 3: đề RÕ là thiết diện khối đa diện nhưng KHÔNG dựng được mẫu section-poly ⇒ báo thẳng.
export const SECTION_UNSUPPORTED_MSG =
  'Mình nhận ra đây là bài thiết diện của khối đa diện nhưng chưa dựng được. ' +
  'Bạn thử ghi rõ khối (chóp/lăng trụ/hộp/lập phương) và 3 điểm xác định mặt phẳng cắt giúp mình nhé.';
```

- [ ] **Step 3b:** thêm guard tất định (cạnh looksLikeArea):

```js
// Nhận diện đề THIẾT DIỆN KHỐI ĐA DIỆN (Đợt 3) TẤT ĐỊNH: cần TỪ KHỐI + TÍN HIỆU CẮT. Đặt TRƯỚC
// looksLikeCrossSection (Đợt 2) vì đề chóp/hộp có thể chứa "vuông/tam giác" ở đáy → dễ bị cross-known nuốt.
export function looksLikeSection(text) {
  const s = (text || '').toLowerCase();
  const hasSolid = /(ch[oó]p|l[aă]ng tr[uụ]|h[iì]nh h[oộ]p|l[aậ]p ph[uươ]ng|t[uứ] di[eệ]n)/.test(s);
  const hasCut = /(thi[eế]t di[eệ]n|c[aắ]t b[oở]i|m[aặ]t ph[aẳ]ng|mp\s*\()/.test(s);
  return hasSolid && hasCut;
}
```

- [ ] **Step 3c:** thêm nhánh template trong `assembleAdvance`, NGAY SAU nhánh `area-plane`:

```js
  // Đợt 3: thiết diện khối đa diện. Engine dựng đa giác giao & tự-kiểm diện tích.
  if (split.template === 'section-poly' && split.templateParams && deps.buildSectionScene) {
    try {
      const scene = deps.buildSectionScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng hỏng → fallback */ }
  }
```

- [ ] **Step 3d:** thêm guard TRƯỚC `looksLikeCrossSection`:

```js
  if (looksLikeSection(effectiveText)) {
    return { mode: 'kernel', degraded: true, ok: false, revUnsupported: true, error: SECTION_UNSUPPORTED_MSG };
  }
```

- [ ] **Step 3e:** wiring deps trong `handler` — thêm `buildSectionScene` vào Promise.all import + vào object deps của `assembleAdvance`:

```js
    const [{ splitProblem }, { buildAdvanceScene }, { solveProblem }, { buildRevolutionScene }, { buildSliceScene }, { buildAreaScene }, { buildSectionScene }] = await Promise.all([
      import('./_lib/advance/splitProblem.js'),
      import('./_lib/advance/buildAdvanceScene.js'),
      import('./_lib/kernel-bridge/solveWithKernel.js'),
      import('./_lib/advance/buildRevolutionScene.js'),
      import('./_lib/advance/buildSliceScene.js'),
      import('./_lib/advance/buildAreaScene.js'),
      import('./_lib/advance/buildSectionScene.js'),
    ]);
```
và trong lời gọi `assembleAdvance(problemSeed, { …, buildSliceScene, buildAreaScene, buildSectionScene }, { imageBase64 })`.

- [ ] **Step 3f: `api/_lib/advance/splitPrompt.js`** — thêm luật `section-poly` vào phần mô tả template + 2 ví dụ. Đọc file để đặt đúng chỗ (cạnh luật cross-known/area-plane). Nội dung luật:

```
- 'section-poly' (THIẾT DIỆN khối đa diện, KHÁC cross-known): đề cho một KHỐI (lập phương/hộp/chóp/lăng trụ)
  và một MẶT PHẲNG QUA 3 ĐIỂM (đỉnh hoặc trung điểm cạnh), hỏi DỰNG/ DIỆN TÍCH THIẾT DIỆN.
  templateParams = { kind:'cube'|'box'|'pyramid-quad'|'prism-tri', dims:{a?,b?,c?,h?},
    points:[p1,p2,p3] } với mỗi p = {"vertex":"A"} HOẶC {"onEdge":["A","B"],"t":0.5} (0.5=trung điểm).
  Ký hiệu chuẩn: hộp/lập phương ABCD.A'B'C'D' (đáy ABCD z=0, nắp A'B'C'D'); chóp S.ABCD (đỉnh S);
  lăng trụ ABC.A'B'C'. Kích thước ghi bằng "a" ⇒ dùng a=1 (nếu có b,c,h riêng thì điền).
```

Ví dụ 11 (thêm vào mảng few-shot):
```
Đề: "Cho hình lập phương ABCD.A'B'C'D' cạnh a. Mặt phẳng đi qua trung điểm của AB, AD và AA'. Tính diện tích thiết diện."
→ { "type":"single", "template":"section-poly", "templateParams":{ "kind":"cube", "dims":{"a":1},
     "points":[{"onEdge":["A","B"],"t":0.5},{"onEdge":["A","D"],"t":0.5},{"onEdge":["A","A'"],"t":0.5}] } }
```
Ví dụ 12:
```
Đề: "Cho hình chóp S.ABCD đáy hình vuông cạnh a, SA⊥đáy, SA=a. Mặt phẳng qua A và trung điểm SB, SD. Tính diện tích thiết diện."
→ { "type":"single", "template":"section-poly", "templateParams":{ "kind":"pyramid-quad", "dims":{"a":1,"b":1,"h":1},
     "points":[{"vertex":"A"},{"onEdge":["S","B"],"t":0.5},{"onEdge":["S","D"],"t":0.5}] } }
```

- [ ] **Step 4: Chạy PASS + build** — `npx vitest run api/_lib/__tests__/analyze-advance.test.js` (PASS) rồi `npm run build` (built).

- [ ] **Step 5: Commit + push**

```bash
git add api/analyze-advance.js api/_lib/advance/splitPrompt.js api/_lib/__tests__/analyze-advance.test.js && git commit -m "feat(đợt3): routing section-poly + looksLikeSection + prompt Ví dụ 11/12" && git push origin HEAD:main && git push origin HEAD
```

---

### Task 6: Renderer `AnimatedSectionCut.tsx` + đăng ký

**Files:**
- Create: `src/components/3d/AnimatedSectionCut.tsx`
- Modify: `src/components/3d/GeometryRenderer.tsx` (import + map `geometry.sectionCuts`)
- Test: `src/components/3d/__tests__/animatedSectionCut.smoke.test.tsx`

- [ ] **Step 1: Viết test đỏ** `src/components/3d/__tests__/animatedSectionCut.smoke.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { sectionBasis, projectTo2D } from '../AnimatedSectionCut';

describe('AnimatedSectionCut — hàm thuần', () => {
  const poly: [number, number, number][] = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]];
  const normal: [number, number, number] = [1, 1, 1];
  it('sectionBasis trả u,v trực chuẩn & vuông góc normal', () => {
    const { u, v } = sectionBasis(poly, normal);
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(u, v)).toBeCloseTo(0, 6);
    expect(dot(u, normal)).toBeCloseTo(0, 6);
    expect(Math.hypot(...u)).toBeCloseTo(1, 6);
  });
  it('projectTo2D trả đúng số đỉnh', () => {
    const b = sectionBasis(poly, normal);
    expect(projectTo2D(poly, b).length).toBe(3);
  });
});
```

- [ ] **Step 2: Chạy xác nhận FAIL** — `npx vitest run src/components/3d/__tests__/animatedSectionCut.smoke.test.tsx` (Expected: FAIL — module chưa có).

- [ ] **Step 3: Tạo `src/components/3d/AnimatedSectionCut.tsx`**

```tsx
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { SectionCut } from '@/types/geometry';

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Cơ sở trực chuẩn (u,v) TRONG mặt phẳng thiết diện + gốc = đỉnh 0. Export để test thuần.
export function sectionBasis(polygon: V3[], normal: V3): { origin: V3; u: V3; v: V3; n: V3 } {
  const n = unit(normal);
  const origin = polygon[0];
  const ref = polygon.length > 1 ? sub(polygon[1], origin) : ([1, 0, 0] as V3);
  let u = unit(sub(ref, [n[0] * dot(ref, n), n[1] * dot(ref, n), n[2] * dot(ref, n)] as V3));
  if (!Number.isFinite(u[0]) || len(u) < 1e-6) u = unit(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]));
  const v = cross(n, u);
  return { origin, u, v, n };
}

export function projectTo2D(polygon: V3[], basis: { origin: V3; u: V3; v: V3 }): [number, number][] {
  return polygon.map((p) => { const r = sub(p, basis.origin); return [dot(r, basis.u), dot(r, basis.v)] as [number, number]; });
}

export default function AnimatedSectionCut({ cut }: { cut: SectionCut }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const { gl } = useThree();
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);

  const color = cut.color ?? '#f59e0b';
  const polygon = cut.polygon as V3[];

  // Dựng SẴN geometry đa giác 1 lần (chiếu vào mp → ShapeGeometry → đặt lại 3D bằng ma trận cơ sở).
  const { geometry, matrix, sweep } = useMemo(() => {
    const basis = sectionBasis(polygon, cut.plane.normal);
    const pts2d = projectTo2D(polygon, basis);
    const shape = new THREE.Shape(pts2d.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ShapeGeometry(shape);
    const { origin, u, v, n } = basis;
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...u), new THREE.Vector3(...v), new THREE.Vector3(...n),
    ).setPosition(origin[0], origin[1], origin[2]);
    // Trục lộ dần = u (thế giới). Quét từ min→max chiếu-u của các đỉnh.
    const projU = polygon.map((p) => dot(p, u));
    return { geometry: geo, matrix: m, sweep: { u, min: Math.min(...projU), max: Math.max(...projU) } };
  }, [polygon, cut.plane.normal]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Clip-plane lộ dần theo advanceT: giữ điểm có (p·u) ≤ constant.
  const clip = useMemo(() => {
    const nrm = new THREE.Vector3(-sweep.u[0], -sweep.u[1], -sweep.u[2]);
    return [new THREE.Plane(nrm, 0)];
  }, [sweep]);
  const constant = sweep.min + (sweep.max - sweep.min) * advanceT + 1e-3;
  clip[0].constant = constant;

  if (cut.hidden) return null;
  const opacity = cut.dim ? 0.2 : 0.55;
  const outline = polygon.map((p) => new THREE.Vector3(...p));
  outline.push(outline[0].clone());
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outline);

  return (
    <group>
      <mesh geometry={geometry} matrix={matrix} matrixAutoUpdate={false}>
        <meshStandardMaterial
          color={color} side={THREE.DoubleSide} transparent opacity={opacity}
          roughness={0.4} metalness={0.0} clippingPlanes={clip}
          emissive={cut.highlight ? new THREE.Color(color) : new THREE.Color('#000000')}
          emissiveIntensity={cut.highlight ? 0.25 : 0}
        />
      </mesh>
      <lineLoop>
        <primitive object={outlineGeo} attach="geometry" />
        <lineBasicMaterial color={color} />
      </lineLoop>
    </group>
  );
}
```

- [ ] **Step 4: Đăng ký trong `src/components/3d/GeometryRenderer.tsx`** — mirror cách `AnimatedAreaRegion` được import & map. Thêm import:

```tsx
import AnimatedSectionCut from './AnimatedSectionCut';
```
và cạnh block map `geometry.areaRegions`:

```tsx
{geometry.sectionCuts?.map((cut) => (
  <AnimatedSectionCut key={cut.id} cut={cut} />
))}
```

- [ ] **Step 5: Chạy PASS + build** — `npx vitest run src/components/3d/__tests__/animatedSectionCut.smoke.test.tsx` (PASS) rồi `npm run build` (built). Cũng chạy full `npx vitest run` để chắc không vỡ gì.

- [ ] **Step 6: Commit + push**

```bash
git add src/components/3d/AnimatedSectionCut.tsx src/components/3d/GeometryRenderer.tsx src/components/3d/__tests__/animatedSectionCut.smoke.test.tsx && git commit -m "feat(đợt3): renderer AnimatedSectionCut (tô đa giác + lộ dần clip)" && git push origin HEAD:main && git push origin HEAD
```

---

## Sau khi hết task
- Dispatch final code-reviewer cho toàn bộ Đợt 3.
- Cập nhật memory `advance-calculus-revolution.md`: Đợt 3 SHIPPED + commit + caveat (chưa nhìn render, chưa live-test classifier với Ví dụ 11/12).
- Nhờ user thử prod: 1 đề lập phương + 1 đề chóp.
