# Kế hoạch G2-3c: Compute layer — Vị trí tương đối + Giao + Phương trình đường

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất compute layer: **vị trí tương đối** (đường-đường, đường-mặt, mặt-mặt, cầu-mặt, điểm-cầu), **giao** (đường∩mặt→điểm, mặt∩mặt→giao tuyến, cầu∩mặt→đường tròn), và **viết phương trình đường thẳng**. Phân loại vị trí tương đối bằng **phép so hữu tỷ exact** khi có (không mập mờ float); giao ra **entity exact**.

**Architecture:** Theo spec §4. Vị trí tương đối = kiểm 0 và so sánh trên đại lượng **bình phương hữu tỷ** (song song ⇔ |tích có hướng|²=0; cầu-mặt ⇔ so d² với R²) → phân loại chính xác. Tái dùng guard suy biến G2-3a.

**Tech Stack:** TypeScript, Vitest, `bigint`. Không nối LLM.

---

## Design deviations / phạm vi

1. **Vị trí tương đối:** đường-đường, đường-mặt, mặt-mặt, cầu-mặt, điểm-cầu. (Cầu-đường tương tự cầu-mặt, thêm sau nếu cần.)
2. **Giao:** đường∩mặt (điểm), mặt∩mặt (giao tuyến — đường), cầu∩mặt (đường tròn / tiếp điểm / rỗng). Đường∩đường hoãn (đã có ở Phase 1 float; bản exact + phân loại chéo nằm ở vị trí tương đối).
3. **Đường tròn** trả dưới dạng `{center, r2}` trong answer (chưa thêm CircleE entity).
4. Phân loại exact khi entity có exact (Oxyz); float-only (synthetic) → ngưỡng EPS.

---

## File Structure

- Modify: `api/_lib/kernel/compute/answer.ts` — thêm `isZeroS`, `cmpScalar`.
- Create: `api/_lib/kernel/compute/relative.ts`
- Create: `api/_lib/kernel/compute/intersect.ts`
- Modify: `api/_lib/kernel/compute/equation.ts` — thêm `lineEquationText`.
- Test: `compute/__tests__/relative.test.ts`, `intersect.test.ts`, và bổ sung `equation.test.ts`.
- **Không sửa** file khác.

---

## Task 1: Vị trí tương đối + helper so sánh exact

**Files:**
- Modify: `api/_lib/kernel/compute/answer.ts`
- Create: `api/_lib/kernel/compute/relative.ts`
- Test: `api/_lib/kernel/compute/__tests__/relative.test.ts`

- [ ] **Step 1: Thêm `isZeroS` + `cmpScalar` vào `answer.ts`**

Thêm cuối `api/_lib/kernel/compute/answer.ts`:

```ts
// Kiểm một Scalar bằng 0 (exact chính xác khi có, ngược lại ngưỡng float).
export function isZeroS(s: Scalar): boolean {
  return s.exact !== null ? s.exact.num === 0n : Math.abs(s.approx) < EPS;
}

// So sánh hai Scalar: -1 / 0 / 1. Chính xác khi cả hai exact cùng radicand (gồm hữu tỷ
// radicand 1); ngược lại dùng float. So (num/den)√r ⇔ so num·den chéo (√r>0, den>0).
export function cmpScalar(a: Scalar, b: Scalar): number {
  if (a.exact !== null && b.exact !== null && a.exact.radicand === b.exact.radicand) {
    const lhs = a.exact.num * b.exact.den;
    const rhs = b.exact.num * a.exact.den;
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
  }
  const d = a.approx - b.approx;
  return Math.abs(d) < EPS ? 0 : d < 0 ? -1 : 1;
}
```

- [ ] **Step 2: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/relative.test.ts
import { describe, it, expect } from 'vitest';
import { computeRelativePosition } from '../relative';
import { pointFromCoords, lineFromPointDir, planeFromCoeffs, sphereFromCenterRadius2 } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat } from '../../scalar';

function line(px: bigint, py: bigint, pz: bigint, dx: bigint, dy: bigint, dz: bigint) {
  return lineFromPointDir(ratVec(px, py, pz), ratVec(dx, dy, dz));
}
function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeRelativePosition — đường-đường', () => {
  it('chéo nhau', () => {
    const r = computeRelativePosition(line(0n, 0n, 0n, 1n, 0n, 0n), line(0n, 0n, 1n, 0n, 1n, 0n));
    expect(r.ok && r.answer.relation).toBe('chéo nhau');
  });
  it('cắt nhau', () => {
    const r = computeRelativePosition(line(0n, 0n, 0n, 1n, 0n, 0n), line(0n, 0n, 0n, 0n, 1n, 0n));
    expect(r.ok && r.answer.relation).toBe('cắt nhau');
  });
  it('song song', () => {
    const r = computeRelativePosition(line(0n, 0n, 0n, 1n, 0n, 0n), line(0n, 1n, 0n, 2n, 0n, 0n));
    expect(r.ok && r.answer.relation).toBe('song song');
  });
});

describe('computeRelativePosition — cầu-mặt (so d² với R² exact)', () => {
  const sphere = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n)); // R²=4, R=2
  it('cắt theo đường tròn (mặt z=0)', () => {
    const r = computeRelativePosition(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n)));
    expect(r.ok && r.answer.relation).toBe('cắt theo đường tròn');
  });
  it('tiếp xúc (mặt z=2)', () => {
    const r = computeRelativePosition(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-2n)));
    expect(r.ok && r.answer.relation).toBe('tiếp xúc');
  });
  it('rời nhau (mặt z=3)', () => {
    const r = computeRelativePosition(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-3n)));
    expect(r.ok && r.answer.relation).toBe('rời nhau');
  });
});

describe('computeRelativePosition — điểm-cầu', () => {
  const sphere = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n));
  it('trong / trên / ngoài', () => {
    expect((computeRelativePosition(P(0n, 0n, 0n), sphere) as any).answer.relation).toBe('điểm nằm trong');
    expect((computeRelativePosition(P(2n, 0n, 0n), sphere) as any).answer.relation).toBe('điểm nằm trên');
    expect((computeRelativePosition(P(3n, 0n, 0n), sphere) as any).answer.relation).toBe('điểm nằm ngoài');
  });
});
```

- [ ] **Step 3: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/relative.test.ts`
Expected: FAIL "Cannot find module '../relative'".

- [ ] **Step 4: Viết `relative.ts`**

```ts
// api/_lib/kernel/compute/relative.ts
import { add, mul, neg, div } from '../scalar';
import { type Vec3S, subV, dotV, crossV, lenSqV, scaleV } from '../vec3s';
import type { Entity, LineE, PlaneE, SphereE, PointE } from '../entities';
import { type ComputeOutcome, firstDegenerate, isZeroS, cmpScalar } from './answer';

export type RelPosAnswer = { kind: 'relative_position'; relation: string };
const rel = (relation: string): RelPosAnswer => ({ kind: 'relative_position', relation });
const isZeroVec = (v: Vec3S) => isZeroS(lenSqV(v));

function planeSigned(pl: PlaneE, p: Vec3S) { return add(dotV(pl.n, p), pl.d); } // n·p + d
function pointOnPlane(pl: PlaneE): Vec3S { return scaleV(pl.n, div(neg(pl.d), lenSqV(pl.n))); }

function relLineLine(l1: LineE, l2: LineE): RelPosAnswer {
  const cr = crossV(l1.dir, l2.dir);
  if (isZeroVec(cr)) {
    return isZeroVec(crossV(subV(l2.p, l1.p), l1.dir)) ? rel('trùng nhau') : rel('song song');
  }
  return isZeroS(dotV(subV(l2.p, l1.p), cr)) ? rel('cắt nhau') : rel('chéo nhau');
}
function relLinePlane(l: LineE, pl: PlaneE): RelPosAnswer {
  if (!isZeroS(dotV(l.dir, pl.n))) return rel('cắt nhau');
  return isZeroS(planeSigned(pl, l.p)) ? rel('đường nằm trên mặt') : rel('song song');
}
function relPlanePlane(p1: PlaneE, p2: PlaneE): RelPosAnswer {
  if (!isZeroVec(crossV(p1.n, p2.n))) return rel('cắt nhau');
  return isZeroS(planeSigned(p2, pointOnPlane(p1))) ? rel('trùng nhau') : rel('song song');
}
function relSpherePlane(s: SphereE, pl: PlaneE): RelPosAnswer {
  const signed = planeSigned(pl, s.center);
  const dSq = div(mul(signed, signed), lenSqV(pl.n));
  const c = cmpScalar(dSq, s.r2);
  return rel(c < 0 ? 'cắt theo đường tròn' : c === 0 ? 'tiếp xúc' : 'rời nhau');
}
function relPointSphere(pt: PointE, s: SphereE): RelPosAnswer {
  const c = cmpScalar(lenSqV(subV(pt.p, s.center)), s.r2);
  return rel(c < 0 ? 'điểm nằm trong' : c === 0 ? 'điểm nằm trên' : 'điểm nằm ngoài');
}

export function computeRelativePosition(a: Entity, b: Entity): ComputeOutcome<RelPosAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'line-line': return { ok: true, answer: relLineLine(a as LineE, b as LineE) };
    case 'line-plane': return { ok: true, answer: relLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: relLinePlane(b as LineE, a as PlaneE) };
    case 'plane-plane': return { ok: true, answer: relPlanePlane(a as PlaneE, b as PlaneE) };
    case 'sphere-plane': return { ok: true, answer: relSpherePlane(a as SphereE, b as PlaneE) };
    case 'plane-sphere': return { ok: true, answer: relSpherePlane(b as SphereE, a as PlaneE) };
    case 'point-sphere': return { ok: true, answer: relPointSphere(a as PointE, b as SphereE) };
    case 'sphere-point': return { ok: true, answer: relPointSphere(b as PointE, a as SphereE) };
    default: return { ok: false, problem: `relative position not supported for ${key}` };
  }
}
```

- [ ] **Step 5: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/relative.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/compute/answer.ts api/_lib/kernel/compute/relative.ts api/_lib/kernel/compute/__tests__/relative.test.ts
git commit -m "feat(engine): exact relative-position classification (line/plane/sphere/point pairs)"
```

---

## Task 2: Giao (đường∩mặt, mặt∩mặt, cầu∩mặt)

**Files:**
- Create: `api/_lib/kernel/compute/intersect.ts`
- Test: `api/_lib/kernel/compute/__tests__/intersect.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/intersect.test.ts
import { describe, it, expect } from 'vitest';
import { computeIntersection } from '../intersect';
import { lineFromPointDir, planeFromCoeffs, sphereFromCenterRadius2 } from '../../entities';
import { ratVec, toApproxVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

describe('computeIntersection — đường ∩ mặt', () => {
  it('cho giao điểm (0,0,0)', () => {
    const l = lineFromPointDir(ratVec(0n, 0n, 5n), ratVec(0n, 0n, 1n));
    const pl = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n)); // z=0
    const r = computeIntersection(l, pl);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.result).toBe('point'); expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 0, y: 0, z: 0 }); }
  });
});

describe('computeIntersection — mặt ∩ mặt (giao tuyến)', () => {
  it('z=0 ∩ y=0 = trục Ox', () => {
    const p1 = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n)); // z=0
    const p2 = planeFromCoeffs(rat(0n), rat(1n), rat(0n), rat(0n)); // y=0
    const r = computeIntersection(p1, p2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('line');
      const dir = toApproxVec(r.answer.line!.dir);
      // chỉ phương ‖ Ox
      expect(dir.y).toBeCloseTo(0, 9);
      expect(dir.z).toBeCloseTo(0, 9);
      expect(Math.abs(dir.x)).toBeGreaterThan(0);
      expect(toApproxVec(r.answer.line!.p)).toEqual({ x: 0, y: 0, z: 0 });
    }
  });
});

describe('computeIntersection — cầu ∩ mặt', () => {
  const sphere = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n)); // R²=4
  it('cắt → đường tròn tâm (0,0,1), R²=3 (mặt z=1)', () => {
    const r = computeIntersection(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-1n)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.result).toBe('circle');
      expect(toApproxVec(r.answer.circle!.center.p)).toEqual({ x: 0, y: 0, z: 1 });
      expect(r.answer.circle!.r2.exact).toEqual(makeExact(3n, 1n, 1));
    }
  });
  it('tiếp xúc → tiếp điểm (mặt z=2)', () => {
    const r = computeIntersection(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-2n)));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.result).toBe('tangent-point'); expect(toApproxVec(r.answer.point!.p)).toEqual({ x: 0, y: 0, z: 2 }); }
  });
  it('rời → none (mặt z=3)', () => {
    const r = computeIntersection(sphere, planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(-3n)));
    expect(r.ok && r.answer.result).toBe('none');
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/intersect.test.ts`
Expected: FAIL "Cannot find module '../intersect'".

- [ ] **Step 3: Viết `intersect.ts`**

```ts
// api/_lib/kernel/compute/intersect.ts
import { type Scalar, add, sub, mul, neg, div } from '../scalar';
import { type Vec3S, subV, addV, dotV, crossV, lenSqV, scaleV } from '../vec3s';
import { type PointE, type LineE, pointFromCoords } from '../entities';
import type { Entity, PlaneE, SphereE } from '../entities';
import { type ComputeOutcome, firstDegenerate, isZeroS, cmpScalar } from './answer';

export type IntersectionAnswer = {
  kind: 'intersection';
  result: 'point' | 'line' | 'circle' | 'tangent-point' | 'none' | 'coincident' | 'parallel';
  point?: PointE;
  line?: LineE;
  circle?: { center: PointE; r2: Scalar };
};

function planeSigned(pl: PlaneE, p: Vec3S) { return add(dotV(pl.n, p), pl.d); }
function pointOnPlane(pl: PlaneE): Vec3S { return scaleV(pl.n, div(neg(pl.d), lenSqV(pl.n))); }

function iLinePlane(l: LineE, pl: PlaneE): IntersectionAnswer {
  const dn = dotV(l.dir, pl.n);
  if (isZeroS(dn)) {
    return isZeroS(planeSigned(pl, l.p))
      ? { kind: 'intersection', result: 'coincident' }
      : { kind: 'intersection', result: 'parallel' };
  }
  const t = neg(div(planeSigned(pl, l.p), dn)); // t = −(n·A+d)/(n·dir)
  return { kind: 'intersection', result: 'point', point: pointFromCoords(addV(l.p, scaleV(l.dir, t))) };
}

function iPlanePlane(p1: PlaneE, p2: PlaneE): IntersectionAnswer {
  const u = crossV(p1.n, p2.n);
  if (isZeroS(lenSqV(u))) {
    return isZeroS(planeSigned(p2, pointOnPlane(p1)))
      ? { kind: 'intersection', result: 'coincident' }
      : { kind: 'intersection', result: 'parallel' };
  }
  // Điểm p = α·n1 + β·n2 thoả n1·p=−d1, n2·p=−d2. det = |n1|²|n2|² − (n1·n2)² = |u|².
  const n1n1 = lenSqV(p1.n), n2n2 = lenSqV(p2.n), n1n2 = dotV(p1.n, p2.n), det = lenSqV(u);
  const alpha = div(add(neg(mul(p1.d, n2n2)), mul(p2.d, n1n2)), det);
  const beta = div(add(neg(mul(p2.d, n1n1)), mul(p1.d, n1n2)), det);
  const p = addV(scaleV(p1.n, alpha), scaleV(p2.n, beta));
  return { kind: 'intersection', result: 'line', line: { kind: 'line', p, dir: u } };
}

function iSpherePlane(s: SphereE, pl: PlaneE): IntersectionAnswer {
  const signed = planeSigned(pl, s.center);
  const dSq = div(mul(signed, signed), lenSqV(pl.n));
  const c = cmpScalar(dSq, s.r2);
  if (c > 0) return { kind: 'intersection', result: 'none' };
  const foot = subV(s.center, scaleV(pl.n, div(signed, lenSqV(pl.n)))); // chân đường vuông góc từ tâm
  if (c === 0) return { kind: 'intersection', result: 'tangent-point', point: pointFromCoords(foot) };
  return { kind: 'intersection', result: 'circle', circle: { center: pointFromCoords(foot), r2: sub(s.r2, dSq) } };
}

export function computeIntersection(a: Entity, b: Entity): ComputeOutcome<IntersectionAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'line-plane': return { ok: true, answer: iLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: iLinePlane(b as LineE, a as PlaneE) };
    case 'plane-plane': return { ok: true, answer: iPlanePlane(a as PlaneE, b as PlaneE) };
    case 'sphere-plane': return { ok: true, answer: iSpherePlane(a as SphereE, b as PlaneE) };
    case 'plane-sphere': return { ok: true, answer: iSpherePlane(b as SphereE, a as PlaneE) };
    default: return { ok: false, problem: `intersection not supported for ${key}` };
  }
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/intersect.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/intersect.ts api/_lib/kernel/compute/__tests__/intersect.test.ts
git commit -m "feat(engine): exact intersection (line-plane point, plane-plane line, sphere-plane circle)"
```

---

## Task 3: Viết phương trình đường thẳng (tham số)

**Files:**
- Modify: `api/_lib/kernel/compute/equation.ts`
- Test: `api/_lib/kernel/compute/__tests__/equation.test.ts`

- [ ] **Step 1: Thêm test đỏ**

```ts
// append to api/_lib/kernel/compute/__tests__/equation.test.ts
import { lineEquationText } from '../equation';
import { lineFromPointDir } from '../../entities';

describe('lineEquationText (tham số)', () => {
  it('điểm (1,0,0), chỉ phương (2,1,-1)', () => {
    const l = lineFromPointDir(ratVec(1n, 0n, 0n), ratVec(2n, 1n, -1n));
    const txt = lineEquationText(l);
    expect(txt).toContain('x = 1 + 2t');
    expect(txt).toContain('z = 0 - 1t');
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/equation.test.ts`
Expected: FAIL (`lineEquationText is not a function`).

- [ ] **Step 3: Thêm cài đặt vào `equation.ts`**

Sửa dòng import đầu file thành (thêm `displayScalar`, `neg`, và kiểu `LineE`):

```ts
import { type Scalar, displayExact, displayScalar, neg } from '../scalar';
import type { PlaneE, SphereE, LineE } from '../entities';
```

Thêm cuối file:

```ts
// Dạng tham số: mỗi thành phần "v = p0 ± |d|t". Hệ số hiển thị dạng exact khi có.
export function lineEquationText(l: LineE): string {
  const comp = (p0: Scalar, d: Scalar, v: string): string => {
    const dNeg = d.approx < 0;
    const dMag = displayScalar(dNeg ? neg(d) : d);
    return `${v} = ${displayScalar(p0)} ${dNeg ? '-' : '+'} ${dMag}t`;
  };
  return [
    comp(l.p.x, l.dir.x, 'x'),
    comp(l.p.y, l.dir.y, 'y'),
    comp(l.p.z, l.dir.z, 'z'),
  ].join(', ');
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh + lint**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/equation.test.ts`
Expected: PASS.
Run: `npx eslint api/_lib/kernel/compute/equation.ts`
Expected: sạch.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/equation.ts api/_lib/kernel/compute/__tests__/equation.test.ts
git commit -m "feat(engine): parametric line equation text"
```

---

## Task 4: Kiểm chứng toàn cục

**Files:** (không tạo mới)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: PASS toàn bộ — 247 test trước + các test relative/intersect/equation mới, 0 fail.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi.

- [ ] **Step 3: Lint**

Run: `npx eslint api/_lib/kernel --ext .ts`
Expected: không lỗi/cảnh báo.

- [ ] **Step 4: Commit dấu mốc**

```bash
git commit --allow-empty -m "chore(engine): G2-3c relative/intersection/line-equation compute complete — compute layer done"
```

---

## Success criteria cho G2-3c

- [ ] Vị trí tương đối phân loại **chính xác**: đường-đường (chéo/cắt/song song/trùng), đường-mặt, mặt-mặt, cầu-mặt (cắt/tiếp xúc/rời qua so d²–R²), điểm-cầu (trong/trên/ngoài).
- [ ] Giao ra **entity exact**: đường∩mặt → điểm; mặt∩mặt → giao tuyến (chỉ phương n₁×n₂, điểm exact); cầu∩mặt → đường tròn (tâm + R²) / tiếp điểm / rỗng.
- [ ] Viết phương trình đường thẳng dạng tham số.
- [ ] Guard suy biến → `{ok:false}` không ném; toàn bộ test cũ xanh; `tsc` + `eslint` sạch.
