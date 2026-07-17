# Kế hoạch G2-3b: Compute layer — Thể tích + Diện tích + Phương trình

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở rộng compute layer: **thể tích** (tứ diện, hình chóp, tỉ số thể tích), **diện tích** (tam giác, đa giác phẳng), **viết phương trình** (mặt phẳng, mặt cầu) — trả **exact** khi ở trong trường, tái dùng self-certificate + guard của G2-3a.

**Architecture:** Theo spec §4. Thể tích qua **tích hỗn tạp / phân rã tứ diện** ⇒ hữu tỷ (exact). Diện tích qua **vector-area bình phương** (Σ tích có hướng) ⇒ căn (exact). Phương trình = định dạng dạng chuẩn entity thành hệ số nguyên rút gọn.

**Tech Stack:** TypeScript, Vitest, `bigint`. Không nối LLM.

---

## Design deviations / phạm vi

1. **Thể tích: tứ diện + hình chóp (chóp đều/không đều) + tỉ số.** Lăng trụ hoãn (cần phân rã 3 tứ diện/lát — sang G2-3c cùng khối phức tạp). Chóp qua fan tam giác từ đỉnh đáy ⇒ tổng tứ diện hữu tỷ.
2. **Diện tích: tam giác + đa giác phẳng.** Mặt cầu (4πR², π rời trường) hoãn.
3. **Phương trình: mặt phẳng + mặt cầu.** Đường thẳng (tham số/chính tắc) hoãn sang G2-3c (đi cùng giao tuyến). Hệ số phải là hữu tỷ exact; float-only ⇒ fallback thập phân + cờ không-exact.
4. Các hàm nhận **entity/điểm đã resolve** (chưa có Query/tên — wiring đó ở G2-4).

---

## File Structure

- Modify: `api/_lib/kernel/compute/answer.ts` — thêm `ScalarAnswer` + `certifyScalar` (tổng quát hoá self-cert cho volume/area).
- Create: `api/_lib/kernel/compute/volume.ts`
- Create: `api/_lib/kernel/compute/area.ts`
- Create: `api/_lib/kernel/compute/equation.ts`
- Test: `compute/__tests__/volume.test.ts`, `area.test.ts`, `equation.test.ts`.
- **Không sửa** file khác.

---

## Task 1: Thể tích + `certifyScalar` tổng quát

**Files:**
- Modify: `api/_lib/kernel/compute/answer.ts`
- Create: `api/_lib/kernel/compute/volume.ts`
- Test: `api/_lib/kernel/compute/__tests__/volume.test.ts`

- [ ] **Step 1: Thêm `ScalarAnswer` + `certifyScalar` vào `answer.ts`**

Thêm cuối `api/_lib/kernel/compute/answer.ts`:

```ts
// Đáp số vô hướng tổng quát (volume/area/ratio…) + self-certificate như certifyDistance.
export type ScalarAnswer = {
  kind: string;
  exact: Exact | null;
  approx: number;
  text: string;
  approximate: boolean;
};

export function certifyScalar(kind: string, s: Scalar, floatRef: number): ScalarAnswer {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(s.approx - floatRef) <= tol) {
    return { kind, exact: s.exact, approx: s.approx, text: displayScalar(s), approximate: false };
  }
  return { kind, exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
}
```

- [ ] **Step 2: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/volume.test.ts
import { describe, it, expect } from 'vitest';
import { computeTetraVolume, computePyramidVolume, volumeRatio, tetraVolumeScalar } from '../volume';
import { pointFromCoords } from '../../entities';
import { ratVec } from '../../vec3s';
import { makeExact } from '../../scalar';

function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeTetraVolume', () => {
  it('tứ diện đơn vị: V = 1/6', () => {
    const r = computeTetraVolume(P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n), P(0n, 0n, 1n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 6n, 1)); expect(r.answer.text).toBe('1/6'); }
  });
});

describe('computePyramidVolume', () => {
  it('chóp đáy vuông cạnh 2, cao 3 (đỉnh trên tâm): V = 4', () => {
    const base = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 2n, 0n), P(0n, 2n, 0n)];
    const r = computePyramidVolume(base, P(1n, 1n, 3n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(4n, 1n, 1)); expect(r.answer.text).toBe('4'); }
  });
});

describe('volumeRatio', () => {
  it('tỉ số hai thể tích hữu tỷ là hữu tỷ', () => {
    const v1 = tetraVolumeScalar(P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n), P(0n, 0n, 1n)); // 1/6
    const v2 = tetraVolumeScalar(P(0n, 0n, 0n), P(2n, 0n, 0n), P(0n, 2n, 0n), P(0n, 0n, 2n)); // 8/6
    const r = volumeRatio(v1, v2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(1n, 8n, 1)); // (1/6)/(8/6) = 1/8
  });
});
```

- [ ] **Step 3: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/volume.test.ts`
Expected: FAIL "Cannot find module '../volume'".

- [ ] **Step 4: Viết `volume.ts`**

```ts
// api/_lib/kernel/compute/volume.ts
import { type Scalar, div, neg, rat, add } from '../scalar';
import { type Vec3S, subV, dotV, crossV, toApproxVec } from '../vec3s';
import type { PointE } from '../entities';
import { sub, scalarTriple, tetrahedronVolume, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type ScalarAnswer, certifyScalar } from './answer';

const av = toApproxVec;

// ×6 thể tích có dấu của tứ diện (a,b,c,d) = tích hỗn tạp (b−a, c−a, d−a).
function tripleScalar(a: Vec3S, b: Vec3S, c: Vec3S, d: Vec3S): Scalar {
  return dotV(subV(b, a), crossV(subV(c, a), subV(d, a)));
}
function absS(s: Scalar): Scalar {
  return s.approx < 0 ? neg(s) : s;
}

export function tetraVolumeScalar(a: PointE, b: PointE, c: PointE, d: PointE): Scalar {
  return div(absS(tripleScalar(a.p, b.p, c.p, d.p)), rat(6n));
}

export function pyramidVolumeScalar(base: PointE[], apex: PointE): Scalar {
  let sum = rat(0n);
  for (let i = 1; i < base.length - 1; i++) {
    sum = add(sum, tripleScalar(base[0].p, base[i].p, base[i + 1].p, apex.p));
  }
  return div(absS(sum), rat(6n));
}

function fPyramid(base: Vec3[], apex: Vec3): number {
  let s = 0;
  for (let i = 1; i < base.length - 1; i++) {
    s += scalarTriple(sub(base[i], base[0]), sub(base[i + 1], base[0]), sub(apex, base[0]));
  }
  return Math.abs(s) / 6;
}

export function computeTetraVolume(a: PointE, b: PointE, c: PointE, d: PointE): ComputeOutcome<ScalarAnswer> {
  const floatRef = tetrahedronVolume(av(a.p), av(b.p), av(c.p), av(d.p));
  return { ok: true, answer: certifyScalar('volume', tetraVolumeScalar(a, b, c, d), floatRef) };
}

export function computePyramidVolume(base: PointE[], apex: PointE): ComputeOutcome<ScalarAnswer> {
  if (base.length < 3) return { ok: false, problem: 'pyramid base needs at least 3 vertices' };
  const floatRef = fPyramid(base.map((p) => av(p.p)), av(apex.p));
  return { ok: true, answer: certifyScalar('volume', pyramidVolumeScalar(base, apex), floatRef) };
}

export function volumeRatio(a: Scalar, b: Scalar): ComputeOutcome<ScalarAnswer> {
  if (Math.abs(b.approx) < 1e-12) return { ok: false, problem: 'volume ratio: denominator volume is zero' };
  return { ok: true, answer: certifyScalar('ratio', div(a, b), a.approx / b.approx) };
}
```

- [ ] **Step 5: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/volume.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/compute/answer.ts api/_lib/kernel/compute/volume.ts api/_lib/kernel/compute/__tests__/volume.test.ts
git commit -m "feat(engine): exact volume compute (tetrahedron, pyramid, ratio) + certifyScalar"
```

---

## Task 2: Diện tích (tam giác, đa giác phẳng)

**Files:**
- Create: `api/_lib/kernel/compute/area.ts`
- Test: `api/_lib/kernel/compute/__tests__/area.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/area.test.ts
import { describe, it, expect } from 'vitest';
import { computeTriangleArea, computePolygonArea } from '../area';
import { pointFromCoords } from '../../entities';
import { ratVec } from '../../vec3s';
import { makeExact } from '../../scalar';

function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeTriangleArea', () => {
  it('tam giác vuông cạnh 1: S = 1/2', () => {
    const r = computeTriangleArea(P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 2n, 1)); expect(r.answer.text).toBe('1/2'); }
  });
});

describe('computePolygonArea', () => {
  it('hình vuông cạnh 2 (dời khỏi gốc): S = 4', () => {
    const sq = [P(1n, 1n, 0n), P(3n, 1n, 0n), P(3n, 3n, 0n), P(1n, 3n, 0n)];
    const r = computePolygonArea(sq);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(4n, 1n, 1)); expect(r.answer.text).toBe('4'); }
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/area.test.ts`
Expected: FAIL "Cannot find module '../area'".

- [ ] **Step 3: Viết `area.ts`**

```ts
// api/_lib/kernel/compute/area.ts
import { type Scalar, mul, sqrt, rat } from '../scalar';
import { subV, crossV, lenSqV, addV, ratVec, toApproxVec } from '../vec3s';
import type { PointE } from '../entities';
import { sub, cross, length, type Vec3 } from '../vecMath';
import { type ComputeOutcome, type ScalarAnswer, certifyScalar } from './answer';

const av = toApproxVec;

// S = (1/2)|u×v| ⇒ S² = (1/4)|u×v|² (ở trong trường: |·|² hữu tỷ → sqrt → căn).
export function triangleAreaScalar(a: PointE, b: PointE, c: PointE): Scalar {
  const cr = crossV(subV(b.p, a.p), subV(c.p, a.p));
  return sqrt(mul(rat(1n, 4n), lenSqV(cr)));
}

// Vector-area đa giác phẳng: 2·S·n̂ = Σ Vi × V(i+1) (khép kín ⇒ độc lập gốc). S²=(1/4)|Σ|².
export function polygonAreaScalar(pts: PointE[]): Scalar {
  const n = pts.length;
  let sum = ratVec(0n, 0n, 0n);
  for (let i = 0; i < n; i++) sum = addV(sum, crossV(pts[i].p, pts[(i + 1) % n].p));
  return sqrt(mul(rat(1n, 4n), lenSqV(sum)));
}

function fTriangle(a: Vec3, b: Vec3, c: Vec3): number {
  return length(cross(sub(b, a), sub(c, a))) / 2;
}
function fPolygon(pts: Vec3[]): number {
  const n = pts.length;
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < n; i++) {
    const cr = cross(pts[i], pts[(i + 1) % n]);
    sx += cr.x; sy += cr.y; sz += cr.z;
  }
  return length({ x: sx, y: sy, z: sz }) / 2;
}

export function computeTriangleArea(a: PointE, b: PointE, c: PointE): ComputeOutcome<ScalarAnswer> {
  return { ok: true, answer: certifyScalar('area', triangleAreaScalar(a, b, c), fTriangle(av(a.p), av(b.p), av(c.p))) };
}
export function computePolygonArea(pts: PointE[]): ComputeOutcome<ScalarAnswer> {
  if (pts.length < 3) return { ok: false, problem: 'polygon needs at least 3 vertices' };
  return { ok: true, answer: certifyScalar('area', polygonAreaScalar(pts), fPolygon(pts.map((p) => av(p.p)))) };
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh + lint**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/area.test.ts`
Expected: PASS.
Run: `npx eslint api/_lib/kernel/compute/area.ts`
Expected: sạch (loại import thừa nếu có — `add` từ vecMath không dùng trong bản trên).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/area.ts api/_lib/kernel/compute/__tests__/area.test.ts
git commit -m "feat(engine): exact area compute (triangle + planar polygon via vector area)"
```

---

## Task 3: Viết phương trình (mặt phẳng, mặt cầu)

**Files:**
- Create: `api/_lib/kernel/compute/equation.ts`
- Test: `api/_lib/kernel/compute/__tests__/equation.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/equation.test.ts
import { describe, it, expect } from 'vitest';
import { planeEquationText, sphereEquationText } from '../equation';
import { planeFromCoeffs, planeFromThreePoints, sphereFromEquation } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat } from '../../scalar';

describe('planeEquationText', () => {
  it('hệ số nguyên: 2x − y + 2z − 3 = 0', () => {
    const pl = planeFromCoeffs(rat(2n), rat(-1n), rat(2n), rat(-3n));
    expect(planeEquationText(pl)).toBe('2x - y + 2z - 3 = 0');
  });
  it('mặt z=0 từ 3 điểm', () => {
    const pl = planeFromThreePoints(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(planeEquationText(pl)).toBe('z = 0');
  });
  it('khử mẫu về hệ số nguyên: (1/2)x + y = 0 → x + 2y = 0', () => {
    const pl = planeFromCoeffs(rat(1n, 2n), rat(1n), rat(0n), rat(0n));
    expect(planeEquationText(pl)).toBe('x + 2y = 0');
  });
});

describe('sphereEquationText', () => {
  it('tâm (1,2,3), R²=9', () => {
    const s = sphereFromEquation(rat(-2n), rat(-4n), rat(-6n), rat(5n));
    expect(sphereEquationText(s)).toBe('(x - 1)² + (y - 2)² + (z - 3)² = 9');
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/equation.test.ts`
Expected: FAIL "Cannot find module '../equation'".

- [ ] **Step 3: Viết `equation.ts`**

```ts
// api/_lib/kernel/compute/equation.ts
import { type Scalar, displayExact } from '../scalar';
import type { PlaneE, SphereE } from '../entities';

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
function blcm(a: bigint, b: bigint): bigint {
  return (a / bgcd(a, b)) * b;
}

// Chỉ hệ số hữu tỷ exact (radicand 1) mới viết được dạng nguyên rút gọn.
function rationalCoeffs(scalars: Scalar[]): { num: bigint; den: bigint }[] | null {
  const out: { num: bigint; den: bigint }[] = [];
  for (const s of scalars) {
    if (s.exact === null || s.exact.radicand !== 1) return null;
    out.push({ num: s.exact.num, den: s.exact.den });
  }
  return out;
}

// "2x - y + 2z - 3 = 0" — bỏ hệ số 0, gộp dấu, ±1 ẩn hệ số, hằng số không có biến.
function formatLinear(a: bigint, b: bigint, c: bigint, d: bigint): string {
  let out = '';
  const term = (k: bigint, v: string) => {
    if (k === 0n) return;
    const neg = k < 0n;
    const abs = neg ? -k : k;
    const mag = v !== '' && abs === 1n ? '' : `${abs}`;
    if (out === '') out += `${neg ? '-' : ''}${mag}${v}`;
    else out += ` ${neg ? '-' : '+'} ${mag}${v}`;
  };
  term(a, 'x');
  term(b, 'y');
  term(c, 'z');
  term(d, '');
  if (out === '') out = '0';
  return `${out} = 0`;
}

export function planeEquationText(pl: PlaneE): string {
  const rats = rationalCoeffs([pl.n.x, pl.n.y, pl.n.z, pl.d]);
  if (!rats) {
    return `${pl.n.x.approx}x + ${pl.n.y.approx}y + ${pl.n.z.approx}z + ${pl.d.approx} = 0`;
  }
  let D = 1n;
  for (const r of rats) D = blcm(D, r.den);
  const ints = rats.map((r) => r.num * (D / r.den));
  let g = 0n;
  for (const k of ints) g = bgcd(g, k);
  if (g === 0n) g = 1n;
  let [a, b, c, d] = ints.map((k) => k / g) as [bigint, bigint, bigint, bigint];
  const lead = [a, b, c].find((k) => k !== 0n);
  if (lead !== undefined && lead < 0n) { a = -a; b = -b; c = -c; d = -d; }
  return formatLinear(a, b, c, d);
}

export function sphereEquationText(s: SphereE): string {
  const parts = [s.center.x, s.center.y, s.center.z];
  if (parts.some((c) => c.exact === null || c.exact.radicand !== 1) || s.r2.exact === null) {
    return `(x, y, z) center ≈ (${parts.map((c) => c.approx).join(', ')}), R² ≈ ${s.r2.approx}`;
  }
  const varPart = (c: Scalar, v: string) => {
    const e = c.exact!;
    if (e.num === 0n) return `${v}²`;
    const neg = e.num < 0n;
    const mag = displayExact({ num: neg ? -e.num : e.num, den: e.den, radicand: 1 });
    return `(${v} ${neg ? '+' : '-'} ${mag})²`;
  };
  return `${varPart(s.center.x, 'x')} + ${varPart(s.center.y, 'y')} + ${varPart(s.center.z, 'z')} = ${displayExact(s.r2.exact)}`;
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/equation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/equation.ts api/_lib/kernel/compute/__tests__/equation.test.ts
git commit -m "feat(engine): plane + sphere equation formatting (reduced integer coeffs)"
```

---

## Task 4: Kiểm chứng toàn cục

**Files:** (không tạo mới)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: PASS toàn bộ — 238 test trước + các test volume/area/equation mới, 0 fail.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi.

- [ ] **Step 3: Lint**

Run: `npx eslint api/_lib/kernel --ext .ts`
Expected: không lỗi/cảnh báo.

- [ ] **Step 4: Commit dấu mốc**

```bash
git commit --allow-empty -m "chore(engine): G2-3b volume/area/equation compute complete — exact answers green"
```

---

## Success criteria cho G2-3b

- [ ] Thể tích tứ diện & hình chóp **exact hữu tỷ** (`1/6`, `4`); tỉ số thể tích **exact**.
- [ ] Diện tích tam giác & đa giác phẳng **exact** (dùng vector-area bình phương → căn); độc lập gốc toạ độ.
- [ ] Viết phương trình mặt phẳng ra **hệ số nguyên rút gọn, chuẩn dấu** (`2x - y + 2z - 3 = 0`, `z = 0`); mặt cầu ra `(x−a)²+…=R²`.
- [ ] Toàn bộ test cũ xanh; `tsc` + `eslint` sạch.
