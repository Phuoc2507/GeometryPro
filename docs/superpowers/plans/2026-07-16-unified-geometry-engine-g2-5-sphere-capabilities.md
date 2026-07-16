# Kế hoạch G2-5: Năng lực mặt cầu (ngoại tiếp, cầu–đường, khoảng cách/diện tích/thể tích)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung các dạng bài mặt cầu còn thiếu để phủ trọn đề thi: **mặt cầu ngoại tiếp** (qua 4 điểm, exact), **cầu–đường thẳng** (vị trí tương đối exact + giao), **khoảng cách điểm–cầu**, **diện tích mặt cầu / thể tích khối cầu** (có π ⇒ gần đúng, đánh cờ `approximate`).

**Architecture:** Theo spec §4. Phân loại vị trí (so d² với R²) là exact hữu tỷ; toạ độ tâm cầu-4-điểm exact qua giải hệ tuyến tính (Cramer). Giao cầu–đường và khoảng cách điểm–mặt-cầu rời trường (hiệu/căn của hai căn) ⇒ trả gần đúng, đánh cờ. Tái dùng self-certificate + guard.

**Tech Stack:** TypeScript, Zod, Vitest. Không nối LLM.

---

## Design deviations / phạm vi

1. **Cầu ngoại tiếp:** thêm builder `sphereFromFourPoints` (tâm exact qua Cramer) + form `four_points` cho `OxyzSphereSchema`. 4 điểm đồng phẳng ⇒ lỗi (không có cầu duy nhất).
2. **Cầu–đường:** vị trí tương đối exact (tiếp xúc/cắt/rời qua d²–R²); giao → tiếp điểm exact / 2 điểm gần đúng / rỗng.
3. **Khoảng cách điểm–cầu** = `| |PC| − R |` rời trường ⇒ **gần đúng** (`approximate:true`).
4. **Diện tích mặt cầu 4πR², thể tích khối cầu (4/3)πR³** ⇒ **gần đúng** (π siêu việt); text giữ dạng ký hiệu khi R² exact.

---

## File Structure

- Modify: `api/_lib/kernel/entities.ts` — `sphereFromFourPoints`.
- Modify: `api/_lib/kernel/dialects/oxyz.ts` — form `four_points`.
- Modify: `api/_lib/kernel/compute/relative.ts` — `relSphereLine`.
- Modify: `api/_lib/kernel/compute/intersect.ts` — `iSphereLine`.
- Modify: `api/_lib/kernel/compute/distance.ts` — point–sphere.
- Modify: `api/_lib/kernel/compute/area.ts` — `computeSphereArea`.
- Modify: `api/_lib/kernel/compute/volume.ts` — `computeSphereVolume`.
- Modify: `api/_lib/kernel/compute/query.ts` — wire sphere area/volume forms.
- Tests: bổ sung các file test tương ứng + `__tests__/g2-5-sphere.test.ts`.

---

## Task 1: Mặt cầu ngoại tiếp (qua 4 điểm)

**Files:**
- Modify: `api/_lib/kernel/entities.ts`
- Modify: `api/_lib/kernel/dialects/oxyz.ts`
- Test: `api/_lib/kernel/__tests__/g2-5-sphere.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/g2-5-sphere.test.ts
import { describe, it, expect } from 'vitest';
import { sphereFromFourPoints } from '../entities';
import { ratVec, toApproxVec } from '../vec3s';
import { makeExact } from '../scalar';
import { executeOxyzPlan } from '../dialects/oxyz';

describe('sphereFromFourPoints', () => {
  it('cầu qua (0,0,0),(2,0,0),(0,2,0),(0,0,2) → tâm (1,1,1), R²=3', () => {
    const s = sphereFromFourPoints(ratVec(0n, 0n, 0n), ratVec(2n, 0n, 0n), ratVec(0n, 2n, 0n), ratVec(0n, 0n, 2n));
    expect(toApproxVec(s.center)).toEqual({ x: 1, y: 1, z: 1 });
    expect(s.r2.exact).toEqual(makeExact(3n, 1n, 1));
  });
  it('4 điểm đồng phẳng → ném', () => {
    expect(() => sphereFromFourPoints(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n), ratVec(1n, 1n, 0n))).toThrow();
  });
});

describe('Oxyz sphere form four_points', () => {
  it('dựng cầu ngoại tiếp từ 4 điểm', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
      { op: 'oxyz_point', name: 'C', at: [0, 2, 0] },
      { op: 'oxyz_point', name: 'D', at: [0, 0, 2] },
      { op: 'oxyz_sphere', name: 'S', by: { form: 'four_points', a: 'A', b: 'B', c: 'C', d: 'D' } },
    ]);
    const S = et.spheres.get('S')!;
    expect(toApproxVec(S.center)).toEqual({ x: 1, y: 1, z: 1 });
    expect(S.r2.exact).toEqual(makeExact(3n, 1n, 1));
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/g2-5-sphere.test.ts`
Expected: FAIL (`sphereFromFourPoints is not a function`).

- [ ] **Step 3: Thêm `sphereFromFourPoints` vào `entities.ts`**

Sửa dòng import đầu file thành:

```ts
import { type Scalar, rat, add, sub, mul, div, neg } from './scalar';
import { type Vec3S, vec3s, subV, dotV, crossV, lenSqV } from './vec3s';
```

Thêm cuối file:

```ts
// det 3×3 với các CỘT là u,v,w: det = u·(v×w).
function det3(u: Vec3S, v: Vec3S, w: Vec3S): Scalar {
  return dotV(u, crossV(v, w));
}

// Mặt cầu ngoại tiếp 4 điểm. Tâm X thoả X·aᵢ = bᵢ với aᵢ = Pᵢ−P0, bᵢ = (|Pᵢ|²−|P0|²)/2
// (i=1,2,3). Giải bằng Cramer (exact hữu tỷ). 4 điểm đồng phẳng ⇒ det = 0 ⇒ ném.
export function sphereFromFourPoints(p0: Vec3S, p1: Vec3S, p2: Vec3S, p3: Vec3S): SphereE {
  const half = rat(1n, 2n);
  const a1 = subV(p1, p0), a2 = subV(p2, p0), a3 = subV(p3, p0);
  const q0 = dotV(p0, p0);
  const b1 = mul(sub(dotV(p1, p1), q0), half);
  const b2 = mul(sub(dotV(p2, p2), q0), half);
  const b3 = mul(sub(dotV(p3, p3), q0), half);
  // Cột của ma trận hàng [a1;a2;a3]:
  const c0 = vec3s(a1.x, a2.x, a3.x);
  const c1 = vec3s(a1.y, a2.y, a3.y);
  const c2 = vec3s(a1.z, a2.z, a3.z);
  const bVec = vec3s(b1, b2, b3);
  const detM = det3(c0, c1, c2);
  if (detM.approx === 0 || (detM.exact !== null && detM.exact.num === 0n)) {
    throw new Error('The four points are coplanar; no unique circumscribing sphere');
  }
  const center = vec3s(
    div(det3(bVec, c1, c2), detM),
    div(det3(c0, bVec, c2), detM),
    div(det3(c0, c1, bVec), detM),
  );
  return { kind: 'sphere', center, r2: lenSqV(subV(center, p0)) };
}
```

- [ ] **Step 4: Thêm form `four_points` vào `OxyzSphereSchema` + executor (`oxyz.ts`)**

Trong `OxyzSphereSchema.by` discriminatedUnion, thêm member:

```ts
    z.object({ form: z.literal('four_points'), a: Name, b: Name, c: Name, d: Name }),
```

Thêm import `sphereFromFourPoints` vào dòng import entities của `oxyz.ts`. Trong `case 'oxyz_sphere'`, thêm nhánh trước `else` cuối (nhánh `equation`):

```ts
      } else if (op.by.form === 'four_points') {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        const c = requirePointE(et, op.by.c);
        const d = requirePointE(et, op.by.d);
        setSphereE(et, op.name, sphereFromFourPoints(a.p, b.p, c.p, d.p));
      } else {
```

- [ ] **Step 5: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/g2-5-sphere.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/entities.ts api/_lib/kernel/dialects/oxyz.ts api/_lib/kernel/__tests__/g2-5-sphere.test.ts
git commit -m "feat(engine): circumscribing sphere from 4 points (exact Cramer solve) + Oxyz form"
```

---

## Task 2: Cầu–đường thẳng + điểm–cầu

**Files:**
- Modify: `api/_lib/kernel/compute/relative.ts`, `intersect.ts`, `distance.ts`
- Test: các file test tương ứng

- [ ] **Step 1: Viết test đỏ**

```ts
// append to api/_lib/kernel/compute/__tests__/relative.test.ts
import { sphereFromCenterRadius2, lineFromPointDir } from '../../entities';

describe('cầu–đường thẳng', () => {
  const S = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n)); // R²=4, R=2
  it('cắt: trục Ox qua tâm', () => {
    const r = computeRelativePosition(S, lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n)));
    expect(r.ok && r.answer.relation).toBe('cắt nhau');
  });
  it('tiếp xúc: đường ‖ Ox tại khoảng cách 2', () => {
    const r = computeRelativePosition(S, lineFromPointDir(ratVec(0n, 2n, 0n), ratVec(1n, 0n, 0n)));
    expect(r.ok && r.answer.relation).toBe('tiếp xúc');
  });
  it('rời: đường ‖ Ox tại khoảng cách 3', () => {
    const r = computeRelativePosition(S, lineFromPointDir(ratVec(0n, 3n, 0n), ratVec(1n, 0n, 0n)));
    expect(r.ok && r.answer.relation).toBe('rời nhau');
  });
});
```

```ts
// append to api/_lib/kernel/compute/__tests__/distance.test.ts
import { sphereFromCenterRadius2 } from '../../entities';

describe('khoảng cách điểm–cầu (gần đúng)', () => {
  it('điểm ngoài: từ (5,0,0) tới mặt cầu tâm O R=2 = 3', () => {
    const S = sphereFromCenterRadius2(ratVec(0n, 0n, 0n), rat(4n));
    const r = computeDistance(pointFromCoords(ratVec(5n, 0n, 0n)), S);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.approx).toBeCloseTo(3, 9); expect(r.answer.approximate).toBe(true); }
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/relative.test.ts api/_lib/kernel/compute/__tests__/distance.test.ts`
Expected: FAIL (sphere-line chưa hỗ trợ / point-sphere chưa hỗ trợ).

- [ ] **Step 3: Thêm `relSphereLine` vào `relative.ts`**

Thêm import (nếu chưa có) `type LineE` đã có. Thêm hàm + dispatch:

```ts
function relSphereLine(s: SphereE, l: LineE): RelPosAnswer {
  // d(tâm, đường)² so với R²
  const cr = crossV(subV(s.center, l.p), l.dir);
  const dSq = div(lenSqV(cr), lenSqV(l.dir));
  const c = cmpScalar(dSq, s.r2);
  return rel(c < 0 ? 'cắt nhau' : c === 0 ? 'tiếp xúc' : 'rời nhau');
}
```

Trong `computeRelativePosition` switch, thêm:

```ts
    case 'sphere-line': return { ok: true, answer: relSphereLine(a as SphereE, b as LineE) };
    case 'line-sphere': return { ok: true, answer: relSphereLine(b as SphereE, a as LineE) };
```

- [ ] **Step 4: Thêm point–sphere vào `distance.ts`**

Thêm hàm + dispatch. Import `SphereE` (đã có Entity). Khoảng cách điểm–mặt-cầu = `| |PC| − R |` rời trường ⇒ tính float, exact=null:

```ts
function dPointSphere(p: PointE, s: SphereE): DistanceAnswer {
  const pc = Math.sqrt(lenSqV(subV(p.p, s.center)).approx);
  const R = Math.sqrt(s.r2.approx);
  const d = Math.abs(pc - R);
  return certifyDistance(num(d), d); // exact rời trường ⇒ approximate
}
```

Thêm import `num` từ scalar (đã import `rat`; thêm `num`), và `SphereE` vào import entities. Trong `computeDistance` switch:

```ts
    case 'point-sphere': return { ok: true, answer: dPointSphere(a as PointE, b as SphereE) };
    case 'sphere-point': return { ok: true, answer: dPointSphere(b as PointE, a as SphereE) };
```

Ghi chú: `certifyDistance(num(d), d)` — vì `num(d).exact === null`, self-cert trả `approximate:true`, `approx=d`.

- [ ] **Step 5: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/relative.test.ts api/_lib/kernel/compute/__tests__/distance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/compute/relative.ts api/_lib/kernel/compute/distance.ts api/_lib/kernel/compute/__tests__/relative.test.ts api/_lib/kernel/compute/__tests__/distance.test.ts
git commit -m "feat(engine): sphere-line relative position + point-sphere distance (approximate)"
```

---

## Task 3: Diện tích mặt cầu + thể tích khối cầu

**Files:**
- Modify: `api/_lib/kernel/compute/area.ts`, `volume.ts`, `query.ts`
- Test: bổ sung `g2-5-sphere.test.ts`

- [ ] **Step 1: Thêm test đỏ**

```ts
// append to api/_lib/kernel/__tests__/g2-5-sphere.test.ts
import { run } from '../run';

describe('diện tích mặt cầu / thể tích khối cầu qua run()', () => {
  const ops = [
    { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
    { op: 'oxyz_sphere', name: 'S', by: { form: 'center_radius', center: 'A', radius: 2 } }, // R=2, R²=4
  ];
  it('diện tích 4πR² ≈ 16π (gần đúng)', () => {
    const res = run({ solidName: 't', ops, queries: [{ kind: 'area', shape: 'sphere', target: 'S' }] });
    const a = res.answers.find((x) => x.kind === 'area');
    expect(a).toBeDefined();
    if (a && a.kind === 'area') { expect(a.approx).toBeCloseTo(16 * Math.PI, 6); expect(a.approximate).toBe(true); }
  });
  it('thể tích (4/3)πR³ ≈ (32/3)π (gần đúng)', () => {
    const res = run({ solidName: 't', ops, queries: [{ kind: 'volume', solid: 'sphere', target: 'S' }] });
    const v = res.answers.find((x) => x.kind === 'volume');
    expect(v).toBeDefined();
    if (v && v.kind === 'volume') expect(v.approx).toBeCloseTo((32 / 3) * Math.PI, 6);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/g2-5-sphere.test.ts`
Expected: FAIL (schema `area shape:'sphere'` / `volume solid:'sphere'` chưa có).

- [ ] **Step 3: Thêm compute + wire schema**

Trong `area.ts` thêm (import `type SphereE` từ entities, `displayScalar` từ scalar):

```ts
export function computeSphereArea(s: SphereE): ScalarAnswer {
  const r2 = s.r2.approx;
  const approx = 4 * Math.PI * r2;
  const text = s.r2.exact ? `4π·${displayScalar(s.r2)}` : `${approx.toFixed(4)}`;
  return { kind: 'area', exact: null, approx, text, approximate: true };
}
```

Trong `volume.ts` thêm (import `type SphereE`, `sqrt` từ scalar):

```ts
export function computeSphereVolume(s: SphereE): ScalarAnswer {
  const R = Math.sqrt(s.r2.approx);
  const approx = (4 / 3) * Math.PI * R * R * R;
  return { kind: 'volume', exact: null, approx, text: `${approx.toFixed(4)}`, approximate: true };
}
```

Trong `query.ts`:
- **Đổi `QueryESchema` từ `z.discriminatedUnion('kind', [...])` sang `z.union([...])`** (bắt buộc — discriminatedUnion không cho hai member cùng `kind`), thêm biến thể sphere ĐẶT TRƯỚC biến thể enum trong mỗi cặp `volume`/`area`. Thay TOÀN BỘ khai báo `QueryESchema` bằng:

```ts
export const QueryESchema = z.union([
  z.object({ kind: z.literal('distance'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('angle'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('relative_position'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('intersection'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('equation'), target: Tok }),
  z.object({ kind: z.literal('volume'), solid: z.literal('sphere'), target: Tok }),
  z.object({ kind: z.literal('volume'), solid: z.enum(['tetrahedron', 'pyramid']), points: z.array(Tok).min(3), apex: Tok.optional() }),
  z.object({ kind: z.literal('volume_ratio'), a: SolidSpec, b: SolidSpec }),
  z.object({ kind: z.literal('area'), shape: z.literal('sphere'), target: Tok }),
  z.object({ kind: z.literal('area'), shape: z.enum(['triangle', 'polygon']), points: z.array(Tok).min(3) }),
]);
```

- Import `computeSphereArea` từ `./area`, `computeSphereVolume` từ `./volume`. Trong dispatcher:

```ts
      case 'volume': {
        if (query.solid === 'sphere') {
          const e = resolveEntityE(query.target, et);
          if (e.kind !== 'sphere') return { ok: false, problem: 'volume(sphere) needs a sphere' };
          return { ok: true, answer: computeSphereVolume(e) };
        }
        const pts = asPoints(query.points, et);
        ...giữ nguyên phần tetra/pyramid...
      }
      case 'area': {
        if (query.shape === 'sphere') {
          const e = resolveEntityE(query.target, et);
          if (e.kind !== 'sphere') return { ok: false, problem: 'area(sphere) needs a sphere' };
          return { ok: true, answer: computeSphereArea(e) };
        }
        const pts = asPoints(query.points, et);
        ...giữ nguyên phần triangle/polygon...
      }
```

- [ ] **Step 4: Chạy để chắc chắn xanh + tsc**

Run: `npx vitest run api/_lib/kernel/__tests__/g2-5-sphere.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sạch.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/area.ts api/_lib/kernel/compute/volume.ts api/_lib/kernel/compute/query.ts api/_lib/kernel/__tests__/g2-5-sphere.test.ts
git commit -m "feat(engine): sphere surface area + sphere volume queries (approximate, pi)"
```

---

## Task 4: Kiểm chứng toàn cục

**Files:** (không tạo mới)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: PASS toàn bộ — 305 test trước + các test G2-5 mới, 0 fail.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json` → không lỗi.
Run: `npx eslint api/_lib/kernel --ext .ts` → sạch.

- [ ] **Step 3: Commit dấu mốc**

```bash
git commit --allow-empty -m "chore(engine): G2-5 sphere capabilities complete — circumsphere, sphere-line, sphere metrics green"
```

---

## Success criteria cho G2-5

- [ ] Mặt cầu ngoại tiếp 4 điểm: tâm + R² **exact** (Cramer); 4 điểm đồng phẳng → lỗi rõ.
- [ ] Cầu–đường: vị trí tương đối **exact** (tiếp xúc/cắt/rời); khoảng cách điểm–cầu **gần đúng** có cờ.
- [ ] Diện tích mặt cầu 4πR² + thể tích khối cầu (4/3)πR³ qua `run()`, **gần đúng** có cờ.
- [ ] Toàn bộ test cũ xanh; `tsc` + `eslint` sạch.
```
