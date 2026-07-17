# Kế hoạch G2-3a: Compute layer — Khoảng cách + Góc

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tầng compute đầu tiên — engine **tính ra đáp số** khoảng cách (mọi cặp điểm/đường/mặt, gồm **2 đường chéo nhau**) và góc (đường-đường, đường-mặt, **nhị diện**), trả dạng **exact** (căn/phân số) khi ở trong trường, kèm **self-certificate** đối chiếu exact-vs-float độc lập và **guard suy biến có cấu trúc** (không ném).

**Architecture:** Theo spec `docs/superpowers/specs/2026-07-16-unified-geometry-engine-design.md` §4 và các yêu cầu từ review nền tảng. Dùng entity G2-1/G2-2. Mọi metric dùng **công thức bình-phương-độ-lớn** (độ dài thật là căn rời trường → tính `distSq`/`cosSq` hữu tỷ rồi `sqrt`). Guard suy biến trả `{ok:false, problem}` thay vì để ra `NaN`. Self-cert: tính lại độc lập bằng float (primitive vecMath Phase 1 + công thức viết riêng) và so với đường exact.

**Tech Stack:** TypeScript, Vitest, `bigint`. Không nối LLM.

---

## Design deviations / phạm vi

1. **G2-3a chỉ làm khoảng cách + góc.** Thể tích/diện tích/phương trình → G2-3b; vị trí tương đối/giao/mặt cầu → G2-3c. Khoảng cách liên quan mặt cầu (điểm–cầu) hoãn sang G2-3c (dễ rời trường: `|PC|−R`).
2. **Góc trả dạng ký hiệu qua cos/sin exact + nhận dạng góc đẹp** (0/30/45/60/90). Góc không đẹp → `approximate` (độ thập phân); ta vẫn giữ **cos/sin exact** làm giá trị chứng nhận.
3. **Self-certificate:** đối chiếu `approx` của đường exact với một float tính **độc lập**. Lệch quá dung sai ⇒ bỏ exact, trả float + cờ `approximate` (không bao giờ hiện đáp số exact chưa chứng nhận).

---

## File Structure

- Create: `api/_lib/kernel/compute/answer.ts` — kiểu `ComputeOutcome`, `DistanceAnswer`, `AngleAnswer`, `EPS`, guard suy biến, `certifyDistance`, `certifyAngle`, `recognizeDegree`.
- Create: `api/_lib/kernel/compute/distance.ts` — công thức exact + float độc lập + `computeDistance`.
- Create: `api/_lib/kernel/compute/angle.ts` — công thức exact + `computeAngle`.
- Test: `compute/__tests__/distance.test.ts`, `compute/__tests__/angle.test.ts`.
- **Không sửa** file G2-1/G2-2/Phase-1 nào.

---

## Task 1: Nền compute — kiểu, guard suy biến, self-certificate

**Files:**
- Create: `api/_lib/kernel/compute/answer.ts`
- Test: `api/_lib/kernel/compute/__tests__/answer.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/answer.test.ts
import { describe, it, expect } from 'vitest';
import { firstDegenerate, certifyDistance, recognizeDegree } from '../answer';
import { rat, fromExact, makeExact, num } from '../../scalar';
import { ratVec } from '../../vec3s';

describe('firstDegenerate', () => {
  it('phát hiện mặt phẳng pháp tuyến 0', () => {
    const plane = { kind: 'plane' as const, n: ratVec(0n, 0n, 0n), d: rat(5n) };
    expect(firstDegenerate([plane])).toMatch(/plane/i);
  });
  it('phát hiện đường chỉ phương 0', () => {
    const line = { kind: 'line' as const, p: ratVec(0n, 0n, 0n), dir: ratVec(0n, 0n, 0n) };
    expect(firstDegenerate([line])).toMatch(/line/i);
  });
  it('mặt cầu R²≤0', () => {
    const s = { kind: 'sphere' as const, center: ratVec(0n, 0n, 0n), r2: rat(-1n) };
    expect(firstDegenerate([s])).toMatch(/sphere/i);
  });
  it('entity hợp lệ ⇒ null', () => {
    const plane = { kind: 'plane' as const, n: ratVec(0n, 0n, 1n), d: rat(0n) };
    expect(firstDegenerate([plane])).toBeNull();
  });
});

describe('certifyDistance — self-certificate', () => {
  it('giữ exact khi khớp float độc lập', () => {
    const a = certifyDistance(fromExact(makeExact(1n, 1n, 3)), Math.sqrt(3));
    expect(a.exact).toEqual(makeExact(1n, 1n, 3));
    expect(a.text).toBe('√3');
    expect(a.approximate).toBe(false);
  });
  it('bỏ exact khi lệch float (nghi ngờ lỗi số học) → trả float', () => {
    const a = certifyDistance(fromExact(makeExact(1n, 1n, 3)), 999);
    expect(a.exact).toBeNull();
    expect(a.approximate).toBe(true);
    expect(a.approx).toBe(999);
  });
  it('không có exact ⇒ dùng float độc lập', () => {
    const a = certifyDistance(num(1.234), 1.234);
    expect(a.exact).toBeNull();
    expect(a.approximate).toBe(true);
  });
});

describe('recognizeDegree', () => {
  it('nhận diện góc đẹp', () => {
    expect(recognizeDegree(45)).toBe(45);
    expect(recognizeDegree(60.0000001)).toBe(60);
    expect(recognizeDegree(54.7356)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/answer.test.ts`
Expected: FAIL "Cannot find module '../answer'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/compute/answer.ts
import { type Exact, type Scalar, displayScalar } from '../scalar';
import { lenSqV } from '../vec3s';
import type { Entity } from '../entities';

// Ngưỡng float cho suy biến / song song (so trên đại lượng bình-phương).
export const EPS = 1e-9;

export type ComputeOutcome<T> = { ok: true; answer: T } | { ok: false; problem: string };

export type DistanceAnswer = {
  kind: 'distance';
  exact: Exact | null;
  approx: number;
  text: string;
  approximate: boolean;
};

export type AngleAnswer = {
  kind: 'angle';
  exactDegrees: number | null; // góc đẹp nếu nhận diện được
  degrees: number;
  exactCos: Exact | null; // |cos| (đường-đường/nhị diện) hoặc |sin| (đường-mặt) đã chứng nhận
  text: string;
  approximate: boolean;
};

// Trả thông điệp suy biến đầu tiên (không ném), để compute trả {ok:false} có cấu trúc.
export function firstDegenerate(entities: Entity[]): string | null {
  for (const e of entities) {
    if (e.kind === 'plane' && lenSqV(e.n).approx < EPS) return 'Degenerate plane (zero normal vector)';
    if (e.kind === 'line' && lenSqV(e.dir).approx < EPS) return 'Degenerate line (zero direction vector)';
    if (e.kind === 'sphere' && e.r2.approx <= EPS) return 'Degenerate sphere (radius squared <= 0)';
  }
  return null;
}

// So đường exact với một float tính ĐỘC LẬP; lệch quá dung sai ⇒ bỏ exact (không hiện
// đáp số chưa chứng nhận), dùng float.
export function certifyDistance(s: Scalar, floatRef: number): DistanceAnswer {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(s.approx - floatRef) <= tol) {
    return { kind: 'distance', exact: s.exact, approx: s.approx, text: displayScalar(s), approximate: false };
  }
  return { kind: 'distance', exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
}

const NICE_DEGREES = [0, 30, 45, 60, 90];

export function recognizeDegree(deg: number): number | null {
  for (const d of NICE_DEGREES) if (Math.abs(deg - d) < 1e-4) return d;
  return null;
}

// Dùng cos/sin exact + độ float để tạo AngleAnswer. Góc đẹp ⇒ exactDegrees; ngược lại
// approximate nhưng vẫn giữ cos/sin exact làm giá trị chứng nhận.
export function certifyAngle(metric: Scalar, degrees: number): AngleAnswer {
  const nice = recognizeDegree(degrees);
  return {
    kind: 'angle',
    exactDegrees: nice,
    degrees: nice ?? degrees,
    exactCos: metric.exact,
    text: nice !== null ? `${nice}°` : `≈ ${degrees.toFixed(2)}°`,
    approximate: nice === null,
  };
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/answer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/answer.ts api/_lib/kernel/compute/__tests__/answer.test.ts
git commit -m "feat(engine): compute foundation (answer types, degeneracy guards, self-certificate)"
```

---

## Task 2: Khoảng cách (mọi cặp điểm/đường/mặt, gồm 2 đường chéo)

**Files:**
- Create: `api/_lib/kernel/compute/distance.ts`
- Test: `api/_lib/kernel/compute/__tests__/distance.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/distance.test.ts
import { describe, it, expect } from 'vitest';
import { computeDistance } from '../distance';
import { pointFromCoords, lineFromPointDir, planeFromCoeffs } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeDistance', () => {
  it('điểm–điểm: |(0,0,0)-(2,1,2)| = 3', () => {
    const r = computeDistance(P(0n, 0n, 0n), P(2n, 1n, 2n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(3n, 1n, 1)); expect(r.answer.text).toBe('3'); }
  });

  it('điểm–mặt: (1,1,1) tới x+y+z=0 = √3', () => {
    const plane = planeFromCoeffs(rat(1n), rat(1n), rat(1n), rat(0n));
    const r = computeDistance(P(1n, 1n, 1n), plane);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 1n, 3)); expect(r.answer.text).toBe('√3'); }
  });

  it('điểm–đường: (0,2,0) tới trục Ox = 2', () => {
    const line = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const r = computeDistance(P(0n, 2n, 0n), line);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(2n, 1n, 1));
  });

  it('2 đường chéo nhau: Ox tại z=0 và (Oy dời lên z=1) = 1', () => {
    const l1 = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    const l2 = lineFromPointDir(ratVec(0n, 0n, 1n), ratVec(0n, 1n, 0n));
    const r = computeDistance(l1, l2);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 1n, 1)); expect(r.answer.text).toBe('1'); }
  });

  it('mặt suy biến ⇒ {ok:false} có cấu trúc, không ném', () => {
    const bad = planeFromCoeffs(rat(0n), rat(0n), rat(0n), rat(5n));
    const r = computeDistance(P(1n, 1n, 1n), bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/plane/i);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/distance.test.ts`
Expected: FAIL "Cannot find module '../distance'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/compute/distance.ts
import { type Scalar, add, mul, div, neg, sqrt, rat } from '../scalar';
import { type Vec3S, subV, dotV, crossV, lenSqV, scaleV, toApproxVec } from '../vec3s';
import type { Entity, PointE, LineE, PlaneE } from '../entities';
import { sub, dot, cross, length, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type DistanceAnswer, EPS, firstDegenerate, certifyDistance } from './answer';

const av = toApproxVec;
function pt(p: Vec3S): PointE { return { kind: 'point', p }; }

// ---- công thức exact (đường distSq hữu tỷ → sqrt) ----
function sqPointPoint(a: Vec3S, b: Vec3S): Scalar { return lenSqV(subV(a, b)); }
function sqPointLine(p: Vec3S, l: LineE): Scalar {
  return div(lenSqV(crossV(subV(p, l.p), l.dir)), lenSqV(l.dir));
}
function sqPointPlane(p: Vec3S, pl: PlaneE): Scalar {
  const signed = add(dotV(pl.n, p), pl.d); // n·p + d
  return div(mul(signed, signed), lenSqV(pl.n));
}

// ---- float độc lập (self-certificate) ----
function fPointPoint(a: Vec3, b: Vec3): number { return length(sub(a, b)); }
function fPointLine(p: Vec3, a: Vec3, dir: Vec3): number {
  return length(cross(sub(p, a), dir)) / length(dir);
}
function fPointPlane(p: Vec3, n: Vec3, d: number): number {
  return Math.abs(dot(n, p) + d) / length(n);
}
function fLineLine(a1: Vec3, d1: Vec3, a2: Vec3, d2: Vec3): number {
  const cr = cross(d1, d2);
  const cl = length(cr);
  if (cl < EPS) return fPointLine(a2, a1, d1); // song song
  return Math.abs(dot(sub(a2, a1), cr)) / cl;
}

// ---- dispatcher từng cặp ----
function dPointPoint(a: PointE, b: PointE): DistanceAnswer {
  return certifyDistance(sqrt(sqPointPoint(a.p, b.p)), fPointPoint(av(a.p), av(b.p)));
}
function dPointLine(a: PointE, l: LineE): DistanceAnswer {
  return certifyDistance(sqrt(sqPointLine(a.p, l)), fPointLine(av(a.p), av(l.p), av(l.dir)));
}
function dPointPlane(a: PointE, pl: PlaneE): DistanceAnswer {
  return certifyDistance(sqrt(sqPointPlane(a.p, pl)), fPointPlane(av(a.p), av(pl.n), pl.d.approx));
}
function dLineLine(l1: LineE, l2: LineE): DistanceAnswer {
  const cr = crossV(l1.dir, l2.dir);
  if (lenSqV(cr).approx < EPS) return dPointLine(pt(l1.p), l2); // song song → điểm–đường
  const r = subV(l2.p, l1.p);
  const triple = dotV(r, cr);
  const distSq = div(mul(triple, triple), lenSqV(cr));
  return certifyDistance(sqrt(distSq), fLineLine(av(l1.p), av(l1.dir), av(l2.p), av(l2.dir)));
}
function dLinePlane(l: LineE, pl: PlaneE): DistanceAnswer {
  if (Math.abs(dotV(l.dir, pl.n).approx) > EPS) return certifyDistance(rat(0n), 0); // cắt nhau
  return dPointPlane(pt(l.p), pl); // song song → điểm–mặt
}
function dPlanePlane(p1: PlaneE, p2: PlaneE): DistanceAnswer {
  if (lenSqV(crossV(p1.n, p2.n)).approx > EPS) return certifyDistance(rat(0n), 0); // cắt nhau
  const pointOnP1 = scaleV(p1.n, div(neg(p1.d), lenSqV(p1.n))); // chân đường vuông góc từ O
  return dPointPlane(pt(pointOnP1), p2);
}

export function computeDistance(a: Entity, b: Entity): ComputeOutcome<DistanceAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'point-point': return { ok: true, answer: dPointPoint(a as PointE, b as PointE) };
    case 'point-line': return { ok: true, answer: dPointLine(a as PointE, b as LineE) };
    case 'line-point': return { ok: true, answer: dPointLine(b as PointE, a as LineE) };
    case 'point-plane': return { ok: true, answer: dPointPlane(a as PointE, b as PlaneE) };
    case 'plane-point': return { ok: true, answer: dPointPlane(b as PointE, a as PlaneE) };
    case 'line-line': return { ok: true, answer: dLineLine(a as LineE, b as LineE) };
    case 'line-plane': return { ok: true, answer: dLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: dLinePlane(b as LineE, a as PlaneE) };
    case 'plane-plane': return { ok: true, answer: dPlanePlane(a as PlaneE, b as PlaneE) };
    default: return { ok: false, problem: `distance not supported for ${key}` };
  }
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/distance.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/distance.ts api/_lib/kernel/compute/__tests__/distance.test.ts
git commit -m "feat(engine): exact distance compute (all point/line/plane pairs incl. skew lines)"
```

---

## Task 3: Góc (đường-đường, đường-mặt, nhị diện)

**Files:**
- Create: `api/_lib/kernel/compute/angle.ts`
- Test: `api/_lib/kernel/compute/__tests__/angle.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/angle.test.ts
import { describe, it, expect } from 'vitest';
import { computeAngle } from '../angle';
import { lineFromPointDir, planeFromCoeffs } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

function line(dx: bigint, dy: bigint, dz: bigint) {
  return lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(dx, dy, dz));
}

describe('computeAngle', () => {
  it('đường-đường 60°: dir (1,1,0) và (1,0,1)', () => {
    const r = computeAngle(line(1n, 1n, 0n), line(1n, 0n, 1n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exactDegrees).toBe(60); expect(r.answer.text).toBe('60°'); }
  });

  it('đường-đường 90°: dir (1,0,0) và (0,1,0)', () => {
    const r = computeAngle(line(1n, 0n, 0n), line(0n, 1n, 0n));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exactDegrees).toBe(90);
  });

  it('nhị diện 45°: mặt z=0 và mặt y+z=0', () => {
    const p1 = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    const p2 = planeFromCoeffs(rat(0n), rat(1n), rat(1n), rat(0n));
    const r = computeAngle(p1, p2);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exactDegrees).toBe(45); expect(r.answer.exactCos).toEqual(makeExact(1n, 2n, 2)); }
  });

  it('đường-mặt 90°: đường ‖ Oz vuông góc mặt z=0', () => {
    const l = line(0n, 0n, 1n);
    const plane = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    const r = computeAngle(l, plane);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exactDegrees).toBe(90);
  });

  it('góc không đẹp ⇒ approximate với độ thập phân', () => {
    const r = computeAngle(line(1n, 1n, 1n), line(1n, 0n, 0n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.approximate).toBe(true); expect(r.answer.text).toMatch(/≈/); }
  });

  it('đường suy biến ⇒ {ok:false}', () => {
    const r = computeAngle(line(0n, 0n, 0n), line(1n, 0n, 0n));
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/angle.test.ts`
Expected: FAIL "Cannot find module '../angle'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/compute/angle.ts
import { type Scalar, mul, div, sqrt } from '../scalar';
import { type Vec3S, dotV, lenSqV } from '../vec3s';
import type { Entity, LineE, PlaneE } from '../entities';
import { type ComputeOutcome, type AngleAnswer, firstDegenerate, certifyAngle } from './answer';

// |cos θ| giữa hai vector u,v = √( (u·v)² / (|u|²|v|²) ), θ ∈ [0,90]. Ở trong trường (đường
// distSq hữu tỷ → sqrt), là giá trị chứng nhận exact cho cos (đường-đường/nhị diện) hoặc
// sin (đường-mặt).
function absCosOf(u: Vec3S, v: Vec3S): Scalar {
  const d = dotV(u, v);
  return sqrt(div(mul(d, d), mul(lenSqV(u), lenSqV(v))));
}

function degFromMetric(metricApprox: number): number {
  return (Math.acos(Math.min(1, Math.abs(metricApprox))) * 180) / Math.PI;
}

function aLineLine(l1: LineE, l2: LineE): AngleAnswer {
  const cosAbs = absCosOf(l1.dir, l2.dir);
  return certifyAngle(cosAbs, degFromMetric(cosAbs.approx));
}
function aPlanePlane(p1: PlaneE, p2: PlaneE): AngleAnswer {
  const cosAbs = absCosOf(p1.n, p2.n); // góc nhị diện = góc giữa hai pháp tuyến (nhọn)
  return certifyAngle(cosAbs, degFromMetric(cosAbs.approx));
}
function aLinePlane(l: LineE, pl: PlaneE): AngleAnswer {
  // sin(góc đường–mặt) = |cos(dir, pháp tuyến)|; góc = 90° − góc(dir, n).
  const sinAbs = absCosOf(l.dir, pl.n);
  const deg = 90 - degFromMetric(sinAbs.approx);
  return certifyAngle(sinAbs, deg);
}

export function computeAngle(a: Entity, b: Entity): ComputeOutcome<AngleAnswer> {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case 'line-line': return { ok: true, answer: aLineLine(a as LineE, b as LineE) };
    case 'plane-plane': return { ok: true, answer: aPlanePlane(a as PlaneE, b as PlaneE) };
    case 'line-plane': return { ok: true, answer: aLinePlane(a as LineE, b as PlaneE) };
    case 'plane-line': return { ok: true, answer: aLinePlane(b as LineE, a as PlaneE) };
    default: return { ok: false, problem: `angle not supported for ${key}` };
  }
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/angle.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/angle.ts api/_lib/kernel/compute/__tests__/angle.test.ts
git commit -m "feat(engine): exact angle compute (line-line, line-plane, dihedral) + nice-angle recognition"
```

---

## Task 4: Kiểm chứng toàn cục

**Files:** (không tạo mới)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: PASS toàn bộ — 219 test trước + các test compute mới, 0 fail, không hồi quy.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi.

- [ ] **Step 3: Lint**

Run: `npx eslint api/_lib/kernel --ext .ts`
Expected: không lỗi/cảnh báo.

- [ ] **Step 4: Commit dấu mốc**

```bash
git commit --allow-empty -m "chore(engine): G2-3a distance+angle compute complete — exact answers + self-certificate green"
```

---

## Success criteria cho G2-3a

- [ ] `computeDistance` trả **exact đúng** cho điểm–điểm, điểm–đường, điểm–mặt, **2 đường chéo nhau**, đường–mặt, mặt–mặt (dùng công thức bình-phương → căn).
- [ ] `computeAngle` trả **góc đẹp exact** (0/30/45/60/90) khi có, giữ cos/sin exact; góc không đẹp → `approximate` với độ thập phân.
- [ ] **Self-certificate** hoạt động: đường exact lệch float độc lập ⇒ bỏ exact, trả float + cờ.
- [ ] Entity suy biến (mặt pháp-tuyến-0, đường dir-0, cầu R²≤0) ⇒ `{ok:false, problem}` **không ném**.
- [ ] Toàn bộ test cũ xanh; `tsc` + `eslint` sạch.
