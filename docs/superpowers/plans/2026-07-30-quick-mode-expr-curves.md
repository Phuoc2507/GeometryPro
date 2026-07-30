# Vẽ nhanh & Vẽ kỹ — Đường cong biểu thức, Miền tô & Khối tròn xoay mượt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho **Vẽ nhanh + Vẽ kỹ** (route chung `api/analyze-geometry.js`) vẽ mọi đồ thị `y=f(x)` mượt (kể cả `exp(x/2)*sqrt(x)`, ln, lượng giác, phân thức), tô đúng miền giữa 2 đường, và dựng khối tròn xoay 3D bán trong suốt — thay cho polyline 3 điểm gãy khúc.

**Architecture:** Giữ đúng quy ước sẵn có "**server lấy mẫu, frontend vẽ mảng**". LLM trả `curves/areaRegions/revolutionSolids` kiểu `expr`; một helper server tất định `expandExprGeometry` biên dịch biểu thức (`compileProfile`/`sampleProfile` trong kernel) thành mảng `samples` số; frontend render bằng renderer ĐÃ CÓ (`AnimatedCurve`/`AnimatedAreaRegion`/`AnimatedRevolutionSolid`). Không nhét parser vào bundle frontend; **không** khẳng định thể tích (an toàn — đó là việc của Advance). Kèm 2 vá lỗi ngầm: camera bao trọn samples + scale co cả samples.

**Tech Stack:** Vite + React + TypeScript (KHÔNG phải Next.js). Kernel TS bundle qua esbuild → `api/_lib/kernel-dist/index.mjs` (git-tracked). Test: Vitest (`vitest run`, `fileParallelism:false`). Renderer test = gọi hàm thuần đã export (không render three).

---

## File Structure

| File | Trách nhiệm | Loại |
|---|---|---|
| `api/_lib/kernel/index.ts` | Export thêm `compileProfile`,`sampleProfile`,`parseExpr` ra entry kernel | Sửa |
| `api/_lib/kernel-dist/index.mjs` | Bundle sinh lại (git-tracked) chứa export mới | Sinh lại (build) |
| `src/types/geometry.ts` | `Curve3D` thêm `'expr'`+`expr?`+`samples?`; `RevolutionSolid` thêm `translucent?` | Sửa |
| `api/_lib/exprExpand.js` | Helper server: nở `expr` → `samples` (curve/area/solid); idempotent; fail-safe | Tạo |
| `api/_lib/normalizeGeometry.js` | Nới whitelist giữ `revolutionSolids`+`areaRegions` | Sửa |
| `api/analyze-geometry.js` | Nạp động `expandExprGeometry` ở điểm chung (phủ quick+detailed) | Sửa |
| `src/lib/geometry/fitBounds.ts` | **Module thuần** (không THREE/React): mapping toán→Three + `computeFitBounds` | Tạo |
| `src/components/3d/AnimatedCurve.tsx` | Nhánh mới: có `samples` → vẽ Line mượt + fill (dùng `curveThreePoints`) | Sửa |
| `src/components/3d/AnimatedRevolutionSolid.tsx` | `translucent` → bán trong suốt (qua `solidMaterialForTest`) | Sửa |
| `src/components/3d/GeometryCanvas.tsx` | `CameraFitter` dùng `computeFitBounds` (gộp samples) | Sửa |
| `src/lib/geometry/scaleGeometry.ts` | Nhánh `maximum>20` co cả `samples`/`domain`/`params` | Sửa |
| `api/_prompts/prompts/base.js` | Dạy model xuất `expr`/`areaRegions`/`revolutionSolids` + bảng token | Sửa |

**Tests tạo mới:**
- `api/_lib/__tests__/exprExpand.test.js` (glob khớp: `api/_lib/__tests__/**/*.test.js`)
- `api/_lib/__tests__/normalizeGeometry.expr.test.js`
- `src/lib/geometry/__tests__/fitBounds.test.ts`
- `src/lib/geometry/__tests__/scaleGeometry.samples.test.ts`
- `src/components/3d/__tests__/animatedRevolutionSolid.material.test.tsx`

---

## Task 0: Export kernel `compileProfile`/`sampleProfile`/`parseExpr` + rebuild bundle

**Bối cảnh:** `api/_lib/exprExpand.js` (Task 2) sẽ `import` 3 hàm này từ `./kernel-dist/index.mjs`. HIỆN chúng KHÔNG có trong export block của `kernel-dist/index.mjs` (chỉ `evalProfile`, `revolutionVolumeDisk`… được export). esbuild chỉ re-export những gì `kernel/index.ts` re-export ⇒ phải thêm ở nguồn rồi rebuild.

**Files:**
- Modify: `api/_lib/kernel/index.ts:43`
- Generated: `api/_lib/kernel-dist/index.mjs` (rebuild + commit — git-tracked)

- [ ] **Step 1: Thêm `compileProfile`,`sampleProfile` vào dòng re-export revolution**

Sửa `api/_lib/kernel/index.ts` dòng 43, từ:

```ts
export { evalProfile, revolutionVolumeDisk, buildRevolutionSolidOx, revolutionVolumeShellOy, buildRevolutionSolidOy, buildRevolutionSolidOyDisk } from './analysis/revolution';
```

thành:

```ts
export { evalProfile, compileProfile, sampleProfile, revolutionVolumeDisk, buildRevolutionSolidOx, revolutionVolumeShellOy, buildRevolutionSolidOy, buildRevolutionSolidOyDisk } from './analysis/revolution';
```

- [ ] **Step 2: Thêm dòng re-export `parseExpr`**

Ngay SAU dòng 45 (dòng `sectionCut`) trong `api/_lib/kernel/index.ts`, thêm dòng mới:

```ts
// Parser biểu thức 1 biến — dùng bởi api/_lib/exprExpand.js (nở đường cong 'expr' của Vẽ nhanh/Vẽ kỹ).
export { parseExpr, evalExpr } from './analysis/expr';
```

- [ ] **Step 3: Rebuild bundle**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npm run build:kernel
```
Expected: in ra `[build-kernel] wrote api/_lib/kernel-dist/index.mjs`, không lỗi.

- [ ] **Step 4: Xác minh export mới có trong bundle**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && node -e "import('./api/_lib/kernel-dist/index.mjs').then(m=>console.log(['compileProfile','sampleProfile','parseExpr'].map(k=>k+':'+(typeof m[k]))))"
```
Expected: `[ 'compileProfile:function', 'sampleProfile:function', 'parseExpr:function' ]`

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/index.ts api/_lib/kernel-dist/index.mjs
git commit -m "feat(kernel): export compileProfile/sampleProfile/parseExpr cho expr expand

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 1: Schema — `Curve3D` expr + `RevolutionSolid` translucent

**Files:**
- Modify: `src/types/geometry.ts:245-254` (Curve3D), `:272-287` (RevolutionSolid)

- [ ] **Step 1: Mở rộng `Curve3D`**

Thay khối `Curve3D` (dòng 245-254) bằng:

```ts
export interface Curve3D extends AdvanceFlags {
  id: string;
  type: 'parabola' | 'cubic' | 'rational' | 'expr';
  params: Record<string, number>; // e.g. {a, b, c, d, xMin, xMax}
  /** Biểu thức 1 biến x (cùng ngữ pháp parseExpr: exp, sqrt, ln/log, sin/cos/tan, abs, pi, e, ^). */
  expr?: string;
  /** Mẫu {x,y} do engine tính sẵn (từ expr) ⇒ frontend vẽ Line mượt mà KHÔNG cần parser. */
  samples?: { x: number; y: number }[];
  color?: string;
  style?: 'solid' | 'dashed';
  plane?: 'xy' | 'xz' | 'yz'; // Which mathematical plane the curve is drawn on
  fill?: boolean;
  fillOpacity?: number;
}
```

- [ ] **Step 2: Thêm `translucent?` vào `RevolutionSolid`**

Trong interface `RevolutionSolid` (dòng 272-287), thêm 1 dòng ngay SAU `color?: string;` (dòng 283):

```ts
  /** Vẽ nhanh/Vẽ kỹ: khối bán trong suốt (nhìn xuyên thấy đường sinh). Advance KHÔNG set ⇒ giữ khối đục. */
  translucent?: boolean;
```

- [ ] **Step 3: Xác minh không vỡ test hiện có (types được renderer tiêu thụ)**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/components/3d/__tests__
```
Expected: PASS (các smoke test cũ vẫn xanh — thay đổi chỉ là thêm field optional + literal, backward-compat).

- [ ] **Step 4: Commit**

```bash
git add src/types/geometry.ts
git commit -m "feat(types): Curve3D 'expr'+samples, RevolutionSolid translucent

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Helper server `exprExpand.js` — nở expr → samples

**Files:**
- Create: `api/_lib/exprExpand.js`
- Test: `api/_lib/__tests__/exprExpand.test.js`

**Ghi chú:** test PHẢI ở `api/_lib/__tests__/` (glob vitest: `api/_lib/__tests__/**/*.test.js`). Import `compileProfile`/`sampleProfile` từ `./kernel-dist/index.mjs` (sibling của `api/_lib/exprExpand.js`).

- [ ] **Step 1: Viết test (thất bại vì file chưa có)**

Tạo `api/_lib/__tests__/exprExpand.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { expandExprCurve, expandExprArea, expandExprSolid, expandExprGeometry } from '../exprExpand.js';

describe('expandExprCurve', () => {
  it('exp(x/2)*sqrt(x) trên [1,2] → ≥2 mẫu hữu hạn, x tăng dần', () => {
    const c = expandExprCurve({ id: 'c1', type: 'expr', expr: 'exp(x/2)*sqrt(x)', params: { xMin: 1, xMax: 2 }, plane: 'xy' });
    expect(c.samples.length).toBeGreaterThanOrEqual(2);
    expect(c.samples.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y))).toBe(true);
    expect(c.samples[0].x).toBeCloseTo(1, 9);
    expect(c.samples[c.samples.length - 1].x).toBeCloseTo(2, 9);
    // exp(1/2)*sqrt(1) = e^0.5 ≈ 1.6487
    expect(c.samples[0].y).toBeCloseTo(Math.exp(0.5), 6);
  });
  it('loại điểm non-finite (ln(x) qua x≤0 trên [-1,1])', () => {
    const c = expandExprCurve({ id: 'c2', type: 'expr', expr: 'ln(x)', params: { xMin: -1, xMax: 1 } });
    expect(c.samples.every((s) => Number.isFinite(s.y))).toBe(true);
  });
  it('curve analytic (parabola) không bị đụng', () => {
    const p = { id: 'c3', type: 'parabola', params: { a: 1, b: 0, c: 0, xMin: -1, xMax: 1 } };
    expect(expandExprCurve(p)).toBe(p);
  });
  it('idempotent: đã có samples thì trả nguyên', () => {
    const c = { id: 'c4', type: 'expr', expr: 'x', params: { xMin: 0, xMax: 1 }, samples: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
    expect(expandExprCurve(c)).toBe(c);
  });
  it('expr rác → null (fail-safe, không ném)', () => {
    expect(expandExprCurve({ id: 'c5', type: 'expr', expr: '@@@', params: { xMin: 0, xMax: 1 } })).toBeNull();
  });
});

describe('expandExprArea', () => {
  it('miền giữa x^2 (dưới) và x (trên) trên [0,1] → top≥bot', () => {
    const a = expandExprArea({ id: 'a1', outer: { kind: 'expr', expr: 'x' }, inner: { kind: 'expr', expr: 'x^2' }, domain: [0, 1] });
    expect(a.samples.length).toBeGreaterThanOrEqual(2);
    expect(a.samples.every((s) => s.top >= s.bot)).toBe(true);
  });
});

describe('expandExprSolid', () => {
  it('quay expr → có samples + translucent, KHÔNG có volume', () => {
    const s = expandExprSolid({ id: 's1', outer: { kind: 'expr', expr: 'exp(x/2)*sqrt(x)' }, domain: [1, 2], axis: 'Ox', method: 'disk' });
    expect(s.samples.length).toBeGreaterThanOrEqual(2);
    expect(s.translucent).toBe(true);
    expect(s.volume).toBeUndefined();
  });
  it('washer: có inner → innerSamples', () => {
    const s = expandExprSolid({ id: 's2', outer: { kind: 'poly', coeffs: [0, 0, 1] }, inner: { kind: 'const', c: 0 }, domain: [0, 2], axis: 'Ox', method: 'washer' });
    expect(Array.isArray(s.innerSamples)).toBe(true);
  });
});

describe('expandExprGeometry', () => {
  it('map cả curves/areaRegions/revolutionSolids, bỏ null', () => {
    const g = expandExprGeometry({
      name: 'x',
      points: [],
      curves: [{ id: 'c', type: 'expr', expr: 'x', params: { xMin: 0, xMax: 1 } }, { id: 'bad', type: 'expr', expr: '@', params: { xMin: 0, xMax: 1 } }],
      revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'x' }, domain: [0, 1], axis: 'Ox', method: 'disk' }],
    });
    expect(g.curves).toHaveLength(1);          // 'bad' bị drop
    expect(g.curves[0].samples.length).toBeGreaterThanOrEqual(2);
    expect(g.revolutionSolids[0].translucent).toBe(true);
  });
  it('geometry không có gì để nở → trả về nguyên trạng an toàn', () => {
    const g = { name: 'x', points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }], lines: [] };
    expect(expandExprGeometry(g).points).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run api/_lib/__tests__/exprExpand.test.js
```
Expected: FAIL — `Failed to resolve import "../exprExpand.js"` (file chưa tồn tại).

- [ ] **Step 3: Viết `api/_lib/exprExpand.js`**

Tạo `api/_lib/exprExpand.js`:

```js
// api/_lib/exprExpand.js
// Nở các hình 'expr' do LLM trả (Vẽ nhanh + Vẽ kỹ) thành MẪU SỐ để frontend vẽ mượt mà KHÔNG cần
// parser. KHÔNG gọi LLM. Idempotent (đã có samples thì bỏ qua). Fail-safe: biểu thức lỗi → drop (null),
// không làm chết route. KHÔNG gán volume — Vẽ nhanh/Vẽ kỹ chỉ VẼ, không khẳng định đáp số.
import { compileProfile, sampleProfile } from './kernel-dist/index.mjs';

const CURVE_SAMPLES = 80;

function sampleExprXY(expr, xMin, xMax, n = CURVE_SAMPLES) {
  const g = compileProfile({ kind: 'expr', expr });
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const y = g(x);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

// Đường cong: chỉ nở khi type==='expr'. Analytic (parabola/cubic/rational) trả nguyên. Lỗi/<2 mẫu → null.
export function expandExprCurve(curve) {
  if (!curve || typeof curve !== 'object') return null;
  if (Array.isArray(curve.samples) && curve.samples.length >= 2) return curve; // idempotent
  if (curve.type !== 'expr') return curve;
  const p = curve.params || {};
  const xMin = Number(p.xMin), xMax = Number(p.xMax);
  if (typeof curve.expr !== 'string' || !Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin === xMax) return null;
  try {
    const samples = sampleExprXY(curve.expr, xMin, xMax);
    if (samples.length < 2) return null;
    return { ...curve, samples };
  } catch {
    return null;
  }
}

// Miền tô: sample outer/inner (ProfileFn bất kỳ: expr/poly/const) trên domain → {x,top,bot}. Lỗi/<2 → null.
export function expandExprArea(area) {
  if (!area || typeof area !== 'object') return null;
  if (Array.isArray(area.samples) && area.samples.length >= 2) return area; // idempotent
  const { outer, inner, domain } = area;
  if (!outer || !inner || !Array.isArray(domain) || domain.length !== 2) return area;
  const a = Number(domain[0]), b = Number(domain[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  try {
    const go = compileProfile(outer);
    const gi = compileProfile(inner);
    const samples = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const x = a + ((b - a) * i) / CURVE_SAMPLES;
      const yo = go(x), yi = gi(x);
      if (!Number.isFinite(x) || !Number.isFinite(yo) || !Number.isFinite(yi)) continue;
      samples.push({ x, top: Math.max(yo, yi), bot: Math.min(yo, yi) });
    }
    if (samples.length < 2) return null;
    return { ...area, samples };
  } catch {
    return null;
  }
}

// Khối tròn xoay: sampleProfile(outer[/inner]) → samples/innerSamples; set translucent=true; KHÔNG volume.
export function expandExprSolid(solid) {
  if (!solid || typeof solid !== 'object') return null;
  const hasSamples = Array.isArray(solid.samples) && solid.samples.length >= 2;
  if (hasSamples && solid.translucent) return solid; // idempotent
  const { outer, inner, domain } = solid;
  if (!outer || !Array.isArray(domain) || domain.length !== 2) return solid;
  const a = Number(domain[0]), b = Number(domain[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  try {
    const samples = hasSamples ? solid.samples : sampleProfile(outer, [a, b]);
    if (!samples || samples.length < 2) return null;
    const out = { ...solid, samples, translucent: true };
    if (inner) {
      out.innerSamples = Array.isArray(solid.innerSamples) && solid.innerSamples.length >= 2
        ? solid.innerSamples
        : sampleProfile(inner, [a, b]);
    }
    return out;
  } catch {
    return null;
  }
}

// Map toàn geometry. Bỏ phần tử null (drop fail-safe). Xoá key nếu rỗng sau khi nở.
export function expandExprGeometry(geometry) {
  if (!geometry || typeof geometry !== 'object') return geometry;
  const out = { ...geometry };
  if (Array.isArray(geometry.curves)) {
    const mapped = geometry.curves.map(expandExprCurve).filter(Boolean);
    if (mapped.length) out.curves = mapped; else delete out.curves;
  }
  if (Array.isArray(geometry.areaRegions)) {
    const mapped = geometry.areaRegions.map(expandExprArea).filter(Boolean);
    if (mapped.length) out.areaRegions = mapped; else delete out.areaRegions;
  }
  if (Array.isArray(geometry.revolutionSolids)) {
    const mapped = geometry.revolutionSolids.map(expandExprSolid).filter(Boolean);
    if (mapped.length) out.revolutionSolids = mapped; else delete out.revolutionSolids;
  }
  return out;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run api/_lib/__tests__/exprExpand.test.js
```
Expected: PASS (tất cả `describe` xanh).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/exprExpand.js api/_lib/__tests__/exprExpand.test.js
git commit -m "feat(expr): exprExpand nở curve/area/solid expr → samples (fail-safe)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Nới whitelist normalize + nạp động expand ở route (phủ quick+detailed)

**Files:**
- Modify: `api/_lib/normalizeGeometry.js:206`, `:214`
- Modify: `api/analyze-geometry.js` (chèn giữa dòng 489 và 490)
- Test: `api/_lib/__tests__/normalizeGeometry.expr.test.js`

**Bối cảnh:** `normalizeGeometryData` REBUILD từ whitelist ⇒ HIỆN `revolutionSolids`/`areaRegions` bị nuốt (chỉ `curves` sống). Route gọi normalize ở điểm chung (`analyze-geometry.js:406`) rồi có thể regen (flat-3D). Điểm HỘI TỤ cuối = ngay trước `finalPayload` (sau dòng 489). Nạp `expandExprGeometry` ĐỘNG (giống kernel-bridge) để kernel-dist thiếu build không giết route.

- [ ] **Step 1: Viết test round-trip (thất bại)**

Tạo `api/_lib/__tests__/normalizeGeometry.expr.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { normalizeGeometryData } from '../normalizeGeometry.js';

describe('normalizeGeometryData · giữ revolutionSolids + areaRegions', () => {
  const input = {
    name: 'Câu 1',
    points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }],
    curves: [{ id: 'c1', type: 'expr', expr: 'exp(x/2)*sqrt(x)', params: { xMin: 1, xMax: 2 }, plane: 'xy' }],
    areaRegions: [{ id: 'ar1', outer: { kind: 'expr', expr: 'x' }, inner: { kind: 'const', c: 0 }, domain: [0, 1] }],
    revolutionSolids: [{ id: 'rs1', outer: { kind: 'expr', expr: 'exp(x/2)*sqrt(x)' }, domain: [1, 2], axis: 'Ox', method: 'disk' }],
  };

  it('curves (expr) sống sót nguyên vẹn', () => {
    const out = normalizeGeometryData(input);
    expect(out.curves).toHaveLength(1);
    expect(out.curves[0].expr).toBe('exp(x/2)*sqrt(x)');
  });
  it('areaRegions sống sót (trước đây bị nuốt)', () => {
    const out = normalizeGeometryData(input);
    expect(out.areaRegions).toHaveLength(1);
    expect(out.areaRegions[0].domain).toEqual([0, 1]);
  });
  it('revolutionSolids sống sót (trước đây bị nuốt)', () => {
    const out = normalizeGeometryData(input);
    expect(out.revolutionSolids).toHaveLength(1);
    expect(out.revolutionSolids[0].axis).toBe('Ox');
  });
  it('mảng rỗng bị xoá (không rác)', () => {
    const out = normalizeGeometryData({ name: 'x', points: [], revolutionSolids: [], areaRegions: [] });
    expect(out.revolutionSolids).toBeUndefined();
    expect(out.areaRegions).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận thất bại**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run api/_lib/__tests__/normalizeGeometry.expr.test.js
```
Expected: FAIL — `areaRegions` / `revolutionSolids` là `undefined` (bị nuốt).

- [ ] **Step 3: Nới whitelist trong `normalizeGeometry.js`**

Sửa dòng 206, thêm `'revolutionSolids', 'areaRegions'`:

```js
  const annotationArrays = ['vectors', 'angles', 'rightAngles', 'equalMarks', 'parallelMarks', 'dynamicPoints', 'curves', 'revolutionSolids', 'areaRegions', 'agents', 'measurements'];
```

Sửa dòng 214 (optionalKeys), thêm tương tự để mảng rỗng bị xoá:

```js
  const optionalKeys = ['spheres', 'circles', 'cylinders', 'cones', 'planes', 'vectors', 'angles', 'rightAngles', 'equalMarks', 'parallelMarks', 'dynamicPoints', 'surfaces', 'curves', 'revolutionSolids', 'areaRegions', 'agents', 'measurements'];
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run api/_lib/__tests__/normalizeGeometry.expr.test.js
```
Expected: PASS.

- [ ] **Step 5: Nạp động `expandExprGeometry` ở route**

Trong `api/analyze-geometry.js`, tìm dòng 489:

```js
    if (engineClassification) normalizedGeometry.classification = engineClassification;
```

Chèn NGAY SAU nó (trước `const finalPayload = {`):

```js
    // Nở hình 'expr' (đường cong/miền/khối tròn xoay) thành mẫu số để frontend vẽ mượt — CHUNG cho
    // Vẽ nhanh + Vẽ kỹ (điểm hội tụ sau mọi nhánh normalize/regen). Nạp ĐỘNG như kernel-bridge:
    // kernel-dist chưa build ⇒ rơi êm, giữ hình thô (không giết route). Idempotent + fail-safe.
    try {
      const { expandExprGeometry } = await import('./_lib/exprExpand.js');
      normalizedGeometry = expandExprGeometry(normalizedGeometry);
    } catch (exprErr) {
      console.warn('[exprExpand] bỏ qua (không chặn luồng):', exprErr?.message);
    }
```

- [ ] **Step 6: Smoke — route module vẫn import được (không lỗi cú pháp)**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && node --check api/analyze-geometry.js && echo "syntax OK"
```
Expected: `syntax OK`.

- [ ] **Step 7: Commit**

```bash
git add api/_lib/normalizeGeometry.js api/analyze-geometry.js api/_lib/__tests__/normalizeGeometry.expr.test.js
git commit -m "feat(route): giữ revolutionSolids/areaRegions + nạp động expandExprGeometry (quick+detailed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Module thuần `fitBounds.ts` — mapping toán→Three + `computeFitBounds`

**Files:**
- Create: `src/lib/geometry/fitBounds.ts`
- Test: `src/lib/geometry/__tests__/fitBounds.test.ts`

**Bối cảnh:** Module KHÔNG import THREE/React (thuần math) ⇒ test node an toàn + renderer import ngược từ đây. Toạ độ Three: math z-up → three y-up. Đường cong plane 'xy' ⇒ (x,0,y); 'xz' ⇒ (x,y,0); 'yz' ⇒ (0,y,x). Miền tô (mesh không xoay) ⇒ (x, top/bot, 0). Khối Ox: trục ∥ Three-X trên [x0,x1], bán kính ±R quanh y=axisY,z=0. Khối Oy: trục ∥ Three-Y.

- [ ] **Step 1: Viết test (thất bại)**

Tạo `src/lib/geometry/__tests__/fitBounds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { curveThreePoints, revolutionThreePoints, areaThreePoints, computeFitBounds } from '../fitBounds';

describe('curveThreePoints', () => {
  it('plane xy: (x,y) → (x,0,y); ≥2 mẫu giữ nguyên số điểm', () => {
    const pts = curveThreePoints([{ x: 1, y: 2 }, { x: 2, y: 3 }], 'xy', 1);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 1, y: 0, z: 2 });
  });
  it('cắt theo progress', () => {
    const s = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(curveThreePoints(s, 'xy', 0).length).toBe(1); // chỉ i=0 (t=0 ≤ 0)
  });
  it('loại non-finite; samples rỗng/undefined → []', () => {
    expect(curveThreePoints([{ x: 0, y: NaN }, { x: 1, y: 1 }], 'xy', 1)).toHaveLength(1);
    expect(curveThreePoints(undefined, 'xy', 1)).toEqual([]);
  });
});

describe('revolutionThreePoints', () => {
  it('Ox: bao gồm bán kính ±R quanh axisY', () => {
    const pts = revolutionThreePoints({ samples: [{ x: 1, r: 2 }, { x: 3, r: 4 }], axis: 'Ox', axisY: 0 });
    const ys = pts.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(4, 9);
    expect(Math.min(...ys)).toBeCloseTo(-4, 9);
  });
  it('samples rỗng → []', () => {
    expect(revolutionThreePoints({ samples: [], axis: 'Ox' })).toEqual([]);
  });
});

describe('areaThreePoints', () => {
  it('{x,top,bot} → 2 điểm (x,top,0),(x,bot,0)', () => {
    const pts = areaThreePoints({ samples: [{ x: 1, top: 3, bot: 1 }] });
    expect(pts).toEqual([{ x: 1, y: 3, z: 0 }, { x: 1, y: 1, z: 0 }]);
  });
});

describe('computeFitBounds', () => {
  it('geometry CHỈ có solid (không point) → bounds hữu hạn, không NaN', () => {
    const b = computeFitBounds({
      name: 'x', points: [], lines: [],
      revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'x' }, domain: [1, 2], axis: 'Ox', method: 'disk', samples: [{ x: 1, r: 1 }, { x: 2, r: 2 }] }],
    });
    expect(b).not.toBeNull();
    expect(Number.isFinite(b.cx) && Number.isFinite(b.size) && Number.isFinite(b.R)).toBe(true);
    expect(b.size).toBeGreaterThanOrEqual(2);
  });
  it('geometry rỗng hoàn toàn → null', () => {
    expect(computeFitBounds({ name: 'x', points: [], lines: [] })).toBeNull();
  });
  it('gộp cả point lẫn samples (point ở xa mở rộng khung)', () => {
    const b = computeFitBounds({
      name: 'x',
      points: [{ id: 'P', label: 'P', x: 10, y: 0, z: 0 }],
      lines: [],
      curves: [{ id: 'c', type: 'expr', params: {}, plane: 'xy', samples: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
    });
    expect(b.cx).toBeCloseTo(5, 9); // (0..10)/2
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận thất bại**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/lib/geometry/__tests__/fitBounds.test.ts
```
Expected: FAIL — `Failed to resolve import "../fitBounds"`.

- [ ] **Step 3: Viết `src/lib/geometry/fitBounds.ts`**

```ts
// src/lib/geometry/fitBounds.ts
// Toán bao khung camera cho hình có samples (đường cong expr, miền tô, khối tròn xoay) — THUẦN (không
// THREE/React) để test node + renderer import ngược. Toạ độ Three (math z-up → three y-up).
import type { GeometryData } from '@/types/geometry';

export type XYZ = { x: number; y: number; z: number };
const fin = (v: number) => Number.isFinite(v);

// Đường cong: mẫu {x,y} (toạ độ toán) → toạ độ Three theo mặt phẳng vẽ, cắt tới progress (0..1).
export function curveThreePoints(
  samples: { x: number; y: number }[] | undefined,
  plane: 'xy' | 'xz' | 'yz' = 'xy',
  progress = 1,
): XYZ[] {
  if (!Array.isArray(samples)) return [];
  const out: XYZ[] = [];
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    if (t > progress) break;
    const { x, y } = samples[i];
    if (!fin(x) || !fin(y)) continue;
    if (plane === 'xy') out.push({ x, y: 0, z: y });
    else if (plane === 'xz') out.push({ x, y, z: 0 });
    else out.push({ x: 0, y, z: x }); // yz
  }
  return out;
}

// Khối tròn xoay: hộp bao AN TOÀN (hơi rộng chút cũng chấp nhận — camera không mất hình). Ox: trục ∥
// Three-X trên [x0,x1], bán kính ±R quanh Three-Y=axisY & Three-Z=0. Oy: trục ∥ Three-Y, bán kính ±R.
export function revolutionThreePoints(solid: {
  samples?: { x: number; r: number }[];
  innerSamples?: { x: number; r: number }[];
  axis?: 'Ox' | 'Oy';
  axisY?: number;
}): XYZ[] {
  const all = [...(solid.samples ?? []), ...(solid.innerSamples ?? [])].filter((s) => fin(s.x) && fin(s.r));
  if (all.length < 1) return [];
  const axisY = solid.axisY ?? 0;
  const xs = all.map((s) => s.x);
  const R = Math.max(0, ...all.map((s) => Math.abs(s.r)));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (solid.axis === 'Oy') {
    const ax = Math.max(Math.abs(x0), Math.abs(x1), R);
    return [
      { x: R, y: 0, z: 0 }, { x: -R, y: 0, z: 0 },
      { x: 0, y: ax, z: 0 }, { x: 0, y: -ax, z: 0 },
      { x: 0, y: 0, z: R }, { x: 0, y: 0, z: -R },
    ];
  }
  const mid = (x0 + x1) / 2;
  return [
    { x: x0, y: axisY, z: 0 }, { x: x1, y: axisY, z: 0 },
    { x: x0, y: axisY + R, z: 0 }, { x: x0, y: axisY - R, z: 0 },
    { x: x1, y: axisY + R, z: 0 }, { x: x1, y: axisY - R, z: 0 },
    { x: mid, y: axisY, z: R }, { x: mid, y: axisY, z: -R },
  ];
}

// Miền tô: mẫu {x,top,bot} → Three (mesh KHÔNG xoay: shape (x,y) ⇒ Three-X=x, Three-Y=top/bot, Three-Z=0).
export function areaThreePoints(area: { samples?: { x: number; top: number; bot: number }[] }): XYZ[] {
  if (!Array.isArray(area.samples)) return [];
  const out: XYZ[] = [];
  for (const s of area.samples) {
    if (!fin(s.x)) continue;
    if (fin(s.top)) out.push({ x: s.x, y: s.top, z: 0 });
    if (fin(s.bot)) out.push({ x: s.x, y: s.bot, z: 0 });
  }
  return out;
}

// Gộp mọi điểm bao (Three) từ curves/areaRegions/revolutionSolids (points xử lý riêng ở computeFitBounds).
export function extraFitPoints(geometry: GeometryData | null): XYZ[] {
  if (!geometry) return [];
  const pts: XYZ[] = [];
  for (const c of geometry.curves ?? []) pts.push(...curveThreePoints(c.samples, c.plane, 1));
  for (const a of geometry.areaRegions ?? []) pts.push(...areaThreePoints(a));
  for (const s of geometry.revolutionSolids ?? []) pts.push(...revolutionThreePoints(s));
  return pts;
}

// Bao khung (toạ độ Three) từ CẢ points lẫn samples. Trả null nếu không có điểm hữu hạn nào.
export function computeFitBounds(geometry: GeometryData | null):
  { cx: number; cy: number; cz: number; size: number; R: number } | null {
  if (!geometry) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const add = (x: number, y: number, z: number) => {
    if (fin(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    if (fin(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (fin(z)) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  };
  for (const p of geometry.points ?? []) add(Number(p.x), Number(p.z), Number(p.y)); // math z-up → three y-up
  for (const q of extraFitPoints(geometry)) add(q.x, q.y, q.z);                        // đã ở toạ độ Three
  if (!fin(minX) || !fin(maxX)) return null;
  const spanX = maxX - minX, spanY = maxY - minY, spanZ = maxZ - minZ;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    cz: (minZ + maxZ) / 2,
    size: Math.max(spanX, spanY, spanZ, 2),
    R: 0.5 * Math.hypot(spanX, spanY, spanZ) || 1,
  };
}
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/lib/geometry/__tests__/fitBounds.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geometry/fitBounds.ts src/lib/geometry/__tests__/fitBounds.test.ts
git commit -m "feat(camera): fitBounds thuần — gộp bounds samples (curve/area/solid)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `AnimatedCurve` — nhánh vẽ từ `samples`

**Files:**
- Modify: `src/components/3d/AnimatedCurve.tsx` (import + useMemo dòng 47)

**Bối cảnh:** Thêm nhánh ĐẶT TRƯỚC guard analytic (dòng 48): nếu `curve.samples?.length >= 2` → vẽ thẳng bằng `curveThreePoints` (từ Task 4) + fill Shape xuống y=0. `type:'expr'` mà thiếu samples → rơi xuống guard cũ → trả rỗng (không ném). Parabola/cubic/rational giữ nguyên.

- [ ] **Step 1: Thêm import `curveThreePoints`**

Sau dòng 8 (`import { useGeometryOptional } ...`) thêm:

```ts
import { curveThreePoints } from '@/lib/geometry/fitBounds';
```

- [ ] **Step 2: Thêm nhánh samples vào đầu useMemo**

Trong `useMemo` (dòng 47), NGAY SAU dòng mở `const { points, shapeGeometry } = useMemo(() => {` và TRƯỚC dòng 48 (`if (curve.type !== 'parabola' ...`), chèn:

```ts
    // Nhánh MỚI: engine đã gửi samples {x,y} (đường 'expr' hoặc bất kỳ) → vẽ thẳng, không eval/parser.
    if (curve.samples && curve.samples.length >= 2) {
      const planeS = curve.plane || 'xy';
      const coords = curveThreePoints(curve.samples, planeS, progress);
      const pts = coords.map((c) => new THREE.Vector3(c.x, c.y, c.z));
      if (pts.length < 2) {
        if (pts.length === 1) pts.push(pts[0].clone());
        else {
          const x0 = curve.samples[0].x;
          pts.push(new THREE.Vector3(x0, 0, 0), new THREE.Vector3(x0, 0, 0));
        }
      }
      let shapeGeo: THREE.ShapeGeometry | null = null;
      if (curve.fill) {
        const vec2Pts: THREE.Vector2[] = [];
        const n = curve.samples.length;
        for (let i = 0; i < n; i++) {
          const t = n > 1 ? i / (n - 1) : 0;
          if (t > progress) break;
          const s = curve.samples[i];
          if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
          vec2Pts.push(new THREE.Vector2(s.x, s.y));
        }
        if (vec2Pts.length > 2) {
          const shape = new THREE.Shape();
          shape.moveTo(vec2Pts[0].x, 0);
          shape.lineTo(vec2Pts[0].x, vec2Pts[0].y);
          for (let i = 1; i < vec2Pts.length; i++) shape.lineTo(vec2Pts[i].x, vec2Pts[i].y);
          shape.lineTo(vec2Pts[vec2Pts.length - 1].x, 0);
          shape.lineTo(vec2Pts[0].x, 0);
          shapeGeo = new THREE.ShapeGeometry(shape);
        }
      }
      return { points: pts, shapeGeometry: shapeGeo };
    }
```

**Lưu ý plane rotation:** nhóm `<group rotation={...}>` (dòng 115-123) đã map plane cho CẢ analytic lẫn samples (điểm được đẩy theo đúng quy ước Three ở `curveThreePoints`, khớp `pts.push(Vector3(x,0,y))` cũ) ⇒ không cần đổi phần rotation.

- [ ] **Step 3: Xác minh test renderer cũ vẫn PASS + không ném với expr thiếu samples**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/lib/geometry/__tests__/fitBounds.test.ts src/components/3d/__tests__
```
Expected: PASS (logic samples đã test qua `curveThreePoints` ở Task 4; guard cũ trả `{points:[],shapeGeometry:null}` cho expr thiếu samples — không ném).

- [ ] **Step 4: Commit**

```bash
git add src/components/3d/AnimatedCurve.tsx
git commit -m "feat(render): AnimatedCurve vẽ từ samples (đường expr mượt + fill)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `AnimatedRevolutionSolid` — khối bán trong suốt khi `translucent`

**Files:**
- Modify: `src/components/3d/AnimatedRevolutionSolid.tsx` (dòng 167-168, dòng 182-194)
- Test: `src/components/3d/__tests__/animatedRevolutionSolid.material.test.tsx`

**Bối cảnh:** Tách quyết định vật liệu thành hàm thuần `solidMaterialForTest` (test được, ưu tiên `dim` như cũ), rồi component dùng nó. `dim` (Advance) → opacity 0.25; `translucent` (quick/detailed) → 0.55; không cờ → đục (1).

- [ ] **Step 1: Viết test (thất bại)**

Tạo `src/components/3d/__tests__/animatedRevolutionSolid.material.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { solidMaterialForTest } from '../AnimatedRevolutionSolid';

describe('solidMaterialForTest', () => {
  it('translucent → transparent, opacity ~0.55', () => {
    expect(solidMaterialForTest({ translucent: true })).toEqual({ transparent: true, opacity: 0.55 });
  });
  it('không cờ → đục (opacity 1)', () => {
    expect(solidMaterialForTest({})).toEqual({ transparent: false, opacity: 1 });
  });
  it('dim ưu tiên hơn translucent (Advance không hồi quy)', () => {
    expect(solidMaterialForTest({ dim: true, translucent: true })).toEqual({ transparent: true, opacity: 0.25 });
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận thất bại**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/components/3d/__tests__/animatedRevolutionSolid.material.test.tsx
```
Expected: FAIL — `solidMaterialForTest` chưa export.

- [ ] **Step 3: Thêm helper + dùng trong component**

Trong `AnimatedRevolutionSolid.tsx`, thêm hàm thuần (đặt ngay sau `import` cuối, trước `const SEGMENTS`):

```ts
// Quyết định vật liệu khối: dim (Advance) ưu tiên; translucent (Vẽ nhanh/Vẽ kỹ) bán trong suốt; else đục.
export function solidMaterialForTest(solid: { dim?: boolean; translucent?: boolean }): { transparent: boolean; opacity: number } {
  if (solid.dim) return { transparent: true, opacity: 0.25 };
  if (solid.translucent) return { transparent: true, opacity: 0.55 };
  return { transparent: false, opacity: 1 };
}
```

Thay dòng 167-168:

```ts
  const dim = !!solid.dim;
  const opacity = dim ? 0.25 : 1;
```

bằng:

```ts
  const dim = !!solid.dim;
  const mat = solidMaterialForTest(solid);
```

Trong `<meshPhysicalMaterial>` (dòng 182-194), thay 2 dòng:

```tsx
          transparent={dim}
          opacity={opacity}
```

bằng:

```tsx
          transparent={mat.transparent}
          opacity={mat.opacity}
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/components/3d/__tests__/animatedRevolutionSolid.material.test.tsx src/components/3d/__tests__/animatedRevolutionSolid.smoke.test.tsx
```
Expected: PASS (cả test mới lẫn smoke cũ).

- [ ] **Step 5: Commit**

```bash
git add src/components/3d/AnimatedRevolutionSolid.tsx src/components/3d/__tests__/animatedRevolutionSolid.material.test.tsx
git commit -m "feat(render): RevolutionSolid translucent (Vẽ nhanh/Vẽ kỹ), dim vẫn ưu tiên

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `CameraFitter` dùng `computeFitBounds` (bao trọn samples)

**Files:**
- Modify: `src/components/3d/GeometryCanvas.tsx:18` (import), `:22-102` (CameraFitter)

**Bối cảnh:** Thay early-return `if (!geometry?.points?.length) return;` + tính bounds chỉ từ `geometry.points` bằng `computeFitBounds` (đã gộp samples). Giữ nguyên gate refit theo name/nonce, nhánh 2D/3D, và commitCameraState.

- [ ] **Step 1: Thêm import**

Sau dòng 18 (`import { scaleGeometry } ...`) thêm:

```ts
import { computeFitBounds } from '@/lib/geometry/fitBounds';
```

- [ ] **Step 2: Viết lại thân effect của `CameraFitter`**

Thay TOÀN BỘ thân `useEffect` (dòng 31-99) — từ `if (!geometry?.points?.length) return;` đến hết khối commitCameraState — bằng:

```ts
    const bounds = computeFitBounds(geometry);
    if (!bounds) return;
    const name = geometry?.name || '';
    const nonceChanged = resetNonce !== prevNonceRef.current;
    // Fit khi có hình MỚI, hoặc khi người dùng bấm "Đặt lại góc nhìn" (R / menu View).
    if (name === prevNameRef.current && !nonceChanged) return;
    prevNameRef.current = name;
    prevNonceRef.current = resetNonce;

    // bounds ở toạ độ Three (đã gộp points + samples của curve/area/solid).
    const { cx, cy, cz, size, R } = bounds;
    if (is2D) {
      // Look from underneath to make X right and Y up (due to coordinate handedness)
      camera.position.set(cx, -10, cz);
      camera.lookAt(cx, 0, cz);
      camera.up.set(0, 0, 1); // Three.js Z (Math Y) is Up
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const orthCamera = camera as THREE.OrthographicCamera;
        orthCamera.zoom = Math.min(canvasSize.width, canvasSize.height) / (size * 1.2);
        orthCamera.updateProjectionMatrix();
      }
    } else {
      // Ôm SÁT hình theo FOV + tỉ lệ khung nhìn (màn dọc/mobile -> fit theo chiều hẹp).
      const fov = (((camera as THREE.PerspectiveCamera).fov ?? 50) * Math.PI) / 180;
      const aspect = Math.max(0.1, canvasSize.width / Math.max(1, canvasSize.height));
      const distV = R / Math.tan(fov / 2);
      const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
      const distH = R / Math.tan(hFov / 2);
      const dist = Math.max(distV, distH) * 1.2; // 1.2 = chừa lề nhỏ cho nhãn điểm
      const dir = new THREE.Vector3(0.55, 0.55, 0.75).normalize();
      camera.position.set(cx + dir.x * dist, cy + dir.y * dist, cz + dir.z * dist);
      camera.up.set(0, 1, 0);
      camera.lookAt(cx, cy, cz);
    }
    camera.updateProjectionMatrix();

    // Đồng bộ pose vào cameraState để CaptureModal/CameraTracker khớp góc nhìn.
    if (commitCameraState) {
      const pos = camera.position;
      const targetVec = new THREE.Vector3(cx, cy, cz);
      const zoom = camera instanceof THREE.OrthographicCamera
        ? camera.zoom
        : 10.59 / Math.max(0.1, pos.distanceTo(targetVec));
      commitCameraState({
        position: [pos.x, pos.y, pos.z],
        target: [cx, cy, cz],
        zoom,
      });
    }
```

(Giữ nguyên mảng dependency dòng 99: `[geometry, camera, is2D, canvasSize, resetNonce, commitCameraState]`.)

- [ ] **Step 3: Xác minh — build frontend không lỗi type + test camera cũ/chung xanh**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/lib/geometry/__tests__/fitBounds.test.ts && npm run build
```
Expected: test PASS; `npm run build` (build:kernel + vite build) xanh, không lỗi TS ở GeometryCanvas.

- [ ] **Step 4: Commit**

```bash
git add src/components/3d/GeometryCanvas.tsx
git commit -m "fix(camera): CameraFitter bao trọn samples (khối/đường/miền không lọt khung)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: `scaleGeometry` — co cả samples/domain khi `maximum>20`

**Files:**
- Modify: `src/lib/geometry/scaleGeometry.ts:99-145` (nhánh return có scale)
- Test: `src/lib/geometry/__tests__/scaleGeometry.samples.test.ts`

**Bối cảnh:** Nhánh `maximum>20` co points nhưng BỎ `samples` ⇒ khối lệch tỉ lệ so với points. Nhân cùng `factor` cho `curve.samples`, `solid.samples`/`innerSamples`, `area.samples`, và `domain`/`params.xMin/xMax`. `expr` string không rescale được nhưng samples là nguồn sự thật render nên vẫn đúng.

- [ ] **Step 1: Viết test (thất bại)**

Tạo `src/lib/geometry/__tests__/scaleGeometry.samples.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scaleGeometry } from '../scaleGeometry';
import type { GeometryData } from '@/types/geometry';

describe('scaleGeometry · co samples đồng bộ với points', () => {
  // maximum = 40 (>20) ⇒ factor = 40/8 = 5.
  const g: GeometryData = {
    name: 'big', points: [{ id: 'A', label: 'A', x: 40, y: 0, z: 0 }], lines: [],
    curves: [{ id: 'c', type: 'expr', params: { xMin: 0, xMax: 40 }, plane: 'xy', samples: [{ x: 0, y: 0 }, { x: 40, y: 20 }] }],
    revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'x' }, domain: [0, 40], axis: 'Ox', method: 'disk', samples: [{ x: 0, r: 0 }, { x: 40, r: 10 }] }],
    areaRegions: [{ id: 'a', outer: { kind: 'expr', expr: 'x' }, inner: { kind: 'const', c: 0 }, domain: [0, 40], samples: [{ x: 0, top: 0, bot: 0 }, { x: 40, top: 20, bot: 0 }] }],
  };

  it('point co factor 5 (x:40→8)', () => {
    const out = scaleGeometry(g)!;
    expect(out.points[0].x).toBeCloseTo(8, 9);
  });
  it('curve.samples + params co cùng factor', () => {
    const out = scaleGeometry(g)!;
    expect(out.curves![0].samples![1]).toMatchObject({ x: 8, y: 4 });
    expect(out.curves![0].params.xMax).toBeCloseTo(8, 9);
  });
  it('solid.samples + domain co cùng factor', () => {
    const out = scaleGeometry(g)!;
    expect(out.revolutionSolids![0].samples![1]).toMatchObject({ x: 8, r: 2 });
    expect(out.revolutionSolids![0].domain).toEqual([0, 8]);
  });
  it('area.samples + domain co cùng factor', () => {
    const out = scaleGeometry(g)!;
    expect(out.areaRegions![0].samples![1]).toMatchObject({ x: 8, top: 4, bot: 0 });
    expect(out.areaRegions![0].domain).toEqual([0, 8]);
  });
  it('maximum ≤ 20 ⇒ không co (samples nguyên)', () => {
    const small = { ...g, points: [{ id: 'A', label: 'A', x: 4, y: 0, z: 0 }] };
    const out = scaleGeometry(small)!;
    expect(out.revolutionSolids![0].samples![1]).toMatchObject({ x: 40, r: 10 });
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận thất bại**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/lib/geometry/__tests__/scaleGeometry.samples.test.ts
```
Expected: FAIL — solid/area không co (samples/domain giữ 40).

- [ ] **Step 3: Bổ sung scale cho samples trong nhánh return**

Trong `scaleGeometry.ts`, NGAY SAU khối `scalePoint` (dòng 93-97, trước `return {`), thêm các helper co samples:

```ts
  const scaleXY = (s: { x: number; y: number }) => ({ ...s, x: s.x / factor, y: s.y / factor });
  const scaleXR = (s: { x: number; r: number }) => ({ ...s, x: s.x / factor, r: s.r / factor });
  const scaleArea = (s: { x: number; top: number; bot: number }) => ({ ...s, x: s.x / factor, top: s.top / factor, bot: s.bot / factor });
  const scaleDomain = (d: [number, number]): [number, number] => [d[0] / factor, d[1] / factor];
```

Trong object `return { ...normalized, ... }` (dòng 99-145): bên trong hàm map `curves` (dòng 128-144), TRƯỚC `return { ...curve, params };` (dòng 143), đổi thành co cả samples:

```ts
      const scaledCurve = { ...curve, params };
      if (Array.isArray(curve.samples)) scaledCurve.samples = curve.samples.map(scaleXY);
      return scaledCurve;
```

Rồi THÊM 2 key mới vào object return (sau `curves: normalized.curves?.map(...)`, trước dấu `}` đóng return):

```ts
    revolutionSolids: normalized.revolutionSolids?.map((solid) => ({
      ...solid,
      domain: scaleDomain(solid.domain),
      ...(solid.axisY !== undefined ? { axisY: solid.axisY / factor } : {}),
      ...(Array.isArray(solid.samples) ? { samples: solid.samples.map(scaleXR) } : {}),
      ...(Array.isArray(solid.innerSamples) ? { innerSamples: solid.innerSamples.map(scaleXR) } : {}),
    })),
    areaRegions: normalized.areaRegions?.map((area) => ({
      ...area,
      domain: scaleDomain(area.domain),
      ...(Array.isArray(area.samples) ? { samples: area.samples.map(scaleArea) } : {}),
    })),
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npx vitest run src/lib/geometry/__tests__/scaleGeometry.samples.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geometry/scaleGeometry.ts src/lib/geometry/__tests__/scaleGeometry.samples.test.ts
git commit -m "fix(scale): co cả samples/domain khi hình lớn (khối không lệch tỉ lệ)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Prompt `base.js` — dạy model xuất expr/area/solid

**Files:**
- Modify: `api/_prompts/prompts/base.js:39` (thêm khối dạy), `:80` (schema output)

**Bối cảnh:** Đặt phần dạy vào `BASE_PROMPT` để CẢ Vẽ nhanh + Vẽ kỹ cùng nhận. Bảng token chép ĐÚNG từ `parseExpr`: hàm `sin cos tan sqrt abs exp ln log` (ln=log=log tự nhiên), hằng `pi e`, toán tử `+ - * / ^`; KHÔNG nhân ngầm (`2*x` chứ không `2x`), KHÔNG ngoặc nhọn LaTeX (`exp(x/2)` chứ không `e^{x/2}`).

- [ ] **Step 1: Thêm khối dạy sau dòng parabola (dòng 39)**

Trong `api/_prompts/prompts/base.js`, NGAY SAU dòng 39 (dòng `Đường cong 2D (parabola)...`), thêm:

```js
   - Đồ thị/đường sinh y=f(x) TỔNG QUÁT (e^x, ln, √, lượng giác, phân thức): mảng "curves" với type="expr", expr="<biểu thức 1 biến x>", params={xMin, xMax}, plane (mặc định "xy"), fill (true nếu tô xuống trục). ĐỪNG nối tay bằng "lines" — luôn dùng curves type="expr" cho đường cong không phải đa thức.
   - HÌNH PHẲNG giới hạn bởi 2 đường y=f(x), y=g(x) trên [a,b]: mảng "areaRegions" với outer={kind:"expr",expr:"f"}, inner={kind:"expr",expr:"g"}, domain:[a,b]. Nếu miền tựa trục hoành thì inner={kind:"const",c:0}.
   - KHỐI TRÒN XOAY: THÊM 1 phần tử "revolutionSolids" với outer={kind:"expr",expr:"<r(x)>"}, inner (nếu vành khăn), domain:[a,b], axis:"Ox" (hoặc "Oy"), method:"disk"|"washer". TUYỆT ĐỐI KHÔNG kèm số thể tích/đáp số — chỉ vẽ hình (hệ thống tự tính mẫu & tô bán trong suốt).
   - NGỮ PHÁP "expr" (bắt buộc theo đúng, sai sẽ bị bỏ): hàm được phép: sin, cos, tan, sqrt, abs, exp, ln, log (ln=log=logarit TỰ NHIÊN); hằng: pi, e; toán tử: + - * / ^ ; biến DUY NHẤT là x. PHẢI viết dấu nhân tường minh (2*x, KHÔNG "2x"); dùng exp(x/2) hoặc e^(x/2) CHỨ KHÔNG e^{x/2}; không ngoặc nhọn/không LaTeX. Ví dụ hợp lệ: "exp(x/2)*sqrt(x)", "ln(x)+1", "1/(x^2+1)", "sqrt(4-x^2)".
   - VỆ SINH NHÃN đường cong: chỉ đặt label cho điểm CÓ NGHĨA (O, giao trục, cận a/b); điểm phụ trên đường sinh để label rỗng "".
```

- [ ] **Step 2: Cập nhật liệt kê schema output (dòng 80)**

Thay dòng 80:

```js
    "surfaces": [...], "curves": [...], "agents": [...], "timeline": {...}
```

bằng:

```js
    "surfaces": [...], "curves": [...], "areaRegions": [...], "revolutionSolids": [...], "agents": [...], "timeline": {...}
```

- [ ] **Step 3: Xác minh chuỗi đã có + module import được**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && node --check api/_prompts/prompts/base.js && node -e "import('./api/_prompts/prompts/base.js').then(m=>{const p=m.BASE_PROMPT;console.log('expr:',p.includes('type=\"expr\"'),'| area:',p.includes('areaRegions'),'| rev:',p.includes('revolutionSolids'),'| token:',p.includes('exp(x/2)'))})"
```
Expected: `syntax OK` ẩn, và dòng `expr: true | area: true | rev: true | token: true`.

- [ ] **Step 4: Commit**

```bash
git add api/_prompts/prompts/base.js
git commit -m "feat(prompt): dạy Vẽ nhanh/Vẽ kỹ xuất expr curves + areaRegions + revolutionSolids

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Build xanh toàn cục + đẩy prod

**Files:** không sửa — chỉ verify + deploy.

- [ ] **Step 1: Chạy TOÀN BỘ test**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npm test
```
Expected: PASS toàn bộ (test cũ không vỡ; test mới xanh).

- [ ] **Step 2: Build production**

Run:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && npm run build
```
Expected: `build:kernel` + `vite build` xanh, không lỗi. (Đây là cổng bắt buộc TRƯỚC khi push.)

- [ ] **Step 3: Đẩy prod (theo constraint "luôn push" — deploy Vercel qua origin/main)**

Chỉ khi Step 1+2 xanh:
```bash
cd "F:/geo3dnew/geo3d/.claude/worktrees/project-advanced-drawing-mode-4c5e0b" && git push origin HEAD:main && git push origin HEAD
```
Expected: cả hai push thành công (cập nhật `main` để Vercel deploy + cập nhật branch làm việc).

---

## Self-Review

**1. Spec coverage** (đối chiếu design §3.1–3.7):
- §3.1 Schema (Curve3D expr/samples, RevolutionSolid translucent) → **Task 1** ✓ (AreaRegion đã có sẵn — không đụng, đúng spec).
- §3.2 `exprExpand.js` (4 hàm, idempotent, fail-safe, drop null) + export kernel → **Task 0 + Task 2** ✓.
- §3.3 Route wiring (điểm chung, nạp động) + whitelist normalize → **Task 3** ✓.
- §3.4 Renderer (AnimatedCurve samples; RevolutionSolid translucent; AreaRegion không đổi) → **Task 5 + Task 6** ✓ (AreaRegion không có task = đúng, "không đổi").
- §3.5 Prompt (expr/area/solid + bảng token + vệ sinh nhãn + schema listing) → **Task 9** ✓.
- §3.6 Vá camera + scale samples → **Task 4 + Task 7 (camera)**, **Task 8 (scale)** ✓.
- §3.7 Test (exprExpand, renderer, round-trip normalize, camera bounds) → rải trong Task 2/3/4/6/8 ✓.

**2. Placeholder scan:** Không có "TBD/TODO/tương tự Task N". Mọi step có code/cmd + expected output đầy đủ. ✓

**3. Type consistency:**
- `expandExprCurve/Area/Solid/Geometry` — tên khớp giữa Task 2 (định nghĩa) và Task 3 (import `expandExprGeometry`). ✓
- `curveThreePoints/revolutionThreePoints/areaThreePoints/extraFitPoints/computeFitBounds` — định nghĩa Task 4, dùng Task 5 (`curveThreePoints`) + Task 7 (`computeFitBounds`). ✓
- `solidMaterialForTest` — định nghĩa & dùng trong Task 6. ✓
- `scaleXY/scaleXR/scaleArea/scaleDomain` — nội bộ Task 8. ✓
- `Curve3D.samples:{x,y}[]`, `RevolutionSolid.samples:{x,r}[]`, `AreaRegion.samples:{x,top,bot}[]` — khớp giữa types (Task 1) và mọi consumer. ✓
- Export kernel `compileProfile/sampleProfile/parseExpr` (Task 0) — khớp import trong `exprExpand.js` (Task 2, dùng `compileProfile`+`sampleProfile`; `parseExpr` được `compileProfile` gọi nội bộ trong bundle). ✓

**Ghi chú an toàn:** `expandExprGeometry` KHÔNG gán `volume` (Task 2) và chỉ chạy ở route quick/detailed (Task 3) — không đụng Advance (route riêng) ⇒ giữ ranh giới "không khẳng định đáp số". `translucent` opt-in ⇒ Advance không hồi quy.
