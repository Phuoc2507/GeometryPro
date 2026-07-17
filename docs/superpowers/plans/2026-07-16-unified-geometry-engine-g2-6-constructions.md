# Kế hoạch G2-6: Phép dựng hình mở rộng (chiếu, đối xứng, trực tâm, tâm ngoại tiếp, giao điểm)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm các phép dựng điểm dẫn xuất **chính xác** để AI KHAI BÁO (thay vì tự tính → ảo giác): hình chiếu (foot), đối xứng qua đường/mặt, **trực tâm**, **tâm đường tròn ngoại tiếp**, **giao điểm**. Engine tính exact + kiểm chứng như mọi điểm khác.

**Architecture:** Theo spec. Tất cả các phép này ở lại trường hữu tỷ+căn (giải hệ tuyến tính Cramer / chiếu vô hướng) ⇒ exact. Dùng lại `det3` (đã có ở entities.ts) qua một solver `solve3` chung. (Phân giác bị hoãn vì tỉ số cạnh là căn/căn — rời trường.)

**Tech Stack:** TypeScript, Zod, Vitest, `bigint`.

---

## Design deviations / phạm vi

1. Làm 5 phép **exact**: `foot` (chiếu điểm lên đường/mặt), `reflect_across` (đối xứng qua đường/mặt), `orthocenter`, `circumcenter`, `intersect` (giao điểm đường-đường/đường-mặt → điểm có tên).
2. **Hoãn:** phân giác (tỉ số cạnh rời trường), chân đường vuông góc chung (thêm sau nếu cần).
3. Tất cả tạo POINT (đánh dấu derived). Tham chiếu entity qua `resolveEntityE`.

---

## File Structure

- Create: `api/_lib/kernel/constructions.ts` — `solve3`, `footOnPlaneE/LineE`, `reflectAcrossPlaneE/LineE`, `orthocenterE`, `circumcenterE`.
- Modify: `api/_lib/kernel/dialects/oxyz.ts` — 5 op mới + executor.
- Modify: `api/_lib/kernel-bridge/translatorPrompt.js` — dạy AI các phép mới.
- Test: `__tests__/constructions.test.ts`, bổ sung `dialects/__tests__/oxyz.test.ts`, `__tests__/translator-contract.test.ts`.

---

## Task 1: Phép dựng exact (constructions.ts)

**Files:**
- Create: `api/_lib/kernel/constructions.ts`
- Test: `api/_lib/kernel/__tests__/constructions.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/constructions.test.ts
import { describe, it, expect } from 'vitest';
import {
  footOnPlaneE, footOnLineE, reflectAcrossPlaneE, reflectAcrossLineE, orthocenterE, circumcenterE,
} from '../constructions';
import { ratVec, toApproxVec } from '../vec3s';
import { planeFromCoeffs, lineFromPointDir } from '../entities';
import { rat, makeExact } from '../scalar';

describe('foot / reflect', () => {
  it('chân đường vuông góc từ (1,1,1) xuống mặt z=0 = (1,1,0)', () => {
    const pl = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    expect(toApproxVec(footOnPlaneE(ratVec(1n, 1n, 1n), pl))).toEqual({ x: 1, y: 1, z: 0 });
  });
  it('chân đường vuông góc từ (0,2,0) xuống trục Ox = (0,0,0)', () => {
    const l = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    expect(toApproxVec(footOnLineE(ratVec(0n, 2n, 0n), l))).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('đối xứng (1,1,1) qua mặt z=0 = (1,1,-1)', () => {
    const pl = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    expect(toApproxVec(reflectAcrossPlaneE(ratVec(1n, 1n, 1n), pl))).toEqual({ x: 1, y: 1, z: -1 });
  });
  it('đối xứng (0,2,0) qua trục Ox = (0,-2,0)', () => {
    const l = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    expect(toApproxVec(reflectAcrossLineE(ratVec(0n, 2n, 0n), l))).toEqual({ x: 0, y: -2, z: 0 });
  });
});

describe('orthocenter / circumcenter', () => {
  it('trực tâm tam giác vuông tại A = A', () => {
    const H = orthocenterE(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(toApproxVec(H)).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('tâm ngoại tiếp tam giác vuông = trung điểm cạnh huyền', () => {
    // A(0,0,0) vuông, B(2,0,0), C(0,2,0) → tâm (1,1,0), và exact
    const O = circumcenterE(ratVec(0n, 0n, 0n), ratVec(2n, 0n, 0n), ratVec(0n, 2n, 0n));
    expect(O.x.exact).toEqual(makeExact(1n, 1n, 1));
    expect(toApproxVec(O)).toEqual({ x: 1, y: 1, z: 0 });
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/constructions.test.ts`
Expected: FAIL "Cannot find module '../constructions'".

- [ ] **Step 3: Viết `constructions.ts`**

```ts
// api/_lib/kernel/constructions.ts
import { type Scalar, add, sub, mul, div, rat } from './scalar';
import { type Vec3S, vec3s, subV, addV, scaleV, dotV, crossV, lenSqV } from './vec3s';
import type { PlaneE, LineE } from './entities';

function det3(u: Vec3S, v: Vec3S, w: Vec3S): Scalar {
  return dotV(u, crossV(v, w));
}

// Giải hệ 3 phương trình H·rᵢ = bᵢ (i=1,2,3) bằng Cramer. Ném nếu suy biến (det = 0).
export function solve3(r1: Vec3S, r2: Vec3S, r3: Vec3S, b: Vec3S): Vec3S {
  const c0 = vec3s(r1.x, r2.x, r3.x);
  const c1 = vec3s(r1.y, r2.y, r3.y);
  const c2 = vec3s(r1.z, r2.z, r3.z);
  const detM = det3(c0, c1, c2);
  if (detM.approx === 0 || (detM.exact !== null && detM.exact.num === 0n)) {
    throw new Error('Degenerate construction: linear system has no unique solution');
  }
  return vec3s(
    div(det3(b, c1, c2), detM),
    div(det3(c0, b, c2), detM),
    div(det3(c0, c1, b), detM),
  );
}

// Chân đường vuông góc từ p xuống mặt: p − ((n·p + d)/|n|²)·n.
export function footOnPlaneE(p: Vec3S, pl: PlaneE): Vec3S {
  const t = div(add(dotV(pl.n, p), pl.d), lenSqV(pl.n));
  return subV(p, scaleV(pl.n, t));
}
// Chân đường vuông góc từ p xuống đường: a + (((p−a)·dir)/|dir|²)·dir.
export function footOnLineE(p: Vec3S, l: LineE): Vec3S {
  const t = div(dotV(subV(p, l.p), l.dir), lenSqV(l.dir));
  return addV(l.p, scaleV(l.dir, t));
}
export function reflectAcrossPlaneE(p: Vec3S, pl: PlaneE): Vec3S {
  return subV(scaleV(footOnPlaneE(p, pl), rat(2n)), p); // 2·foot − p
}
export function reflectAcrossLineE(p: Vec3S, l: LineE): Vec3S {
  return subV(scaleV(footOnLineE(p, l), rat(2n)), p);
}

// Trực tâm: H thoả (H−A)·(C−B)=0, (H−B)·(C−A)=0, và H thuộc mặt (ABC).
export function orthocenterE(a: Vec3S, b: Vec3S, c: Vec3S): Vec3S {
  const n = crossV(subV(b, a), subV(c, a));
  const r1 = subV(c, b);
  const r2 = subV(c, a);
  return solve3(r1, r2, n, vec3s(dotV(a, r1), dotV(b, r2), dotV(a, n)));
}
// Tâm ngoại tiếp: |O−A|=|O−B|=|O−C| ⇒ O·(B−A)=(|B|²−|A|²)/2, O·(C−A)=(|C|²−|A|²)/2, O∈(ABC).
export function circumcenterE(a: Vec3S, b: Vec3S, c: Vec3S): Vec3S {
  const n = crossV(subV(b, a), subV(c, a));
  const half = rat(1n, 2n);
  const r1 = subV(b, a);
  const r2 = subV(c, a);
  const b1 = mul(sub(lenSqV(b), lenSqV(a)), half);
  const b2 = mul(sub(lenSqV(c), lenSqV(a)), half);
  return solve3(r1, r2, n, vec3s(b1, b2, dotV(a, n)));
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/constructions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/constructions.ts api/_lib/kernel/__tests__/constructions.test.ts
git commit -m "feat(engine): exact constructions (foot, reflect, orthocenter, circumcenter, solve3)"
```

---

## Task 2: Op Oxyz cho các phép dựng

**Files:**
- Modify: `api/_lib/kernel/dialects/oxyz.ts`
- Test: `api/_lib/kernel/dialects/__tests__/oxyz.test.ts`

- [ ] **Step 1: Thêm test đỏ**

```ts
// append to api/_lib/kernel/dialects/__tests__/oxyz.test.ts
describe('oxyz — phép dựng mở rộng', () => {
  it('foot: hình chiếu S(0,0,3) lên mặt z=0 → (0,0,0)', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'S', at: [0, 0, 3] },
      { op: 'oxyz_plane', name: 'P', by: { form: 'coeffs', a: 0, b: 0, c: 1, d: 0 } },
      { op: 'oxyz_foot', name: 'H', from: 'S', onto: 'plane', target: 'P' },
    ]);
    expect(toApproxVec(et.points.get('H')!.p)).toEqual({ x: 0, y: 0, z: 0 });
    expect(et.derivedPoints.has('H')).toBe(true);
  });
  it('orthocenter của tam giác vuông tại A = A', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
      { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
      { op: 'oxyz_orthocenter', name: 'H', of: ['A', 'B', 'C'] },
    ]);
    expect(toApproxVec(et.points.get('H')!.p)).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('reflect_across: đối xứng A(1,1,1) qua mặt z=0 → (1,1,-1)', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'A', at: [1, 1, 1] },
      { op: 'oxyz_plane', name: 'P', by: { form: 'coeffs', a: 0, b: 0, c: 1, d: 0 } },
      { op: 'oxyz_reflect_across', name: 'A2', point: 'A', across: 'plane', target: 'P' },
    ]);
    expect(toApproxVec(et.points.get('A2')!.p)).toEqual({ x: 1, y: 1, z: -1 });
  });
  it('intersect: giao đường Oz với mặt z=0 → gốc', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_line', name: 'd', by: { form: 'point_dir', base: [0, 0, 5], dir: [0, 0, 1] } },
      { op: 'oxyz_plane', name: 'P', by: { form: 'coeffs', a: 0, b: 0, c: 1, d: 0 } },
      { op: 'oxyz_intersect', name: 'I', a: 'd', b: 'P' },
    ]);
    expect(toApproxVec(et.points.get('I')!.p)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyz.test.ts`
Expected: FAIL (op mới chưa hỗ trợ).

- [ ] **Step 3: Sửa `oxyz.ts` — schema + executor**

Thêm vào import entities (dòng import từ '../entities') các builder KHÔNG cần — nhưng thêm import từ constructions và compute intersect:

```ts
import { footOnPlaneE, footOnLineE, reflectAcrossPlaneE, reflectAcrossLineE, orthocenterE, circumcenterE } from '../constructions';
import { computeIntersection } from '../compute/intersect';
```

Thêm các schema op (sau `OxyzReflectSchema`, dùng `PointName` cho tên điểm tạo ra):

```ts
export const OxyzFootSchema = z.object({ op: z.literal('oxyz_foot'), name: PointName, from: Name, onto: z.enum(['line', 'plane']), target: Name });
export const OxyzReflectAcrossSchema = z.object({ op: z.literal('oxyz_reflect_across'), name: PointName, point: Name, across: z.enum(['line', 'plane']), target: Name });
export const OxyzOrthocenterSchema = z.object({ op: z.literal('oxyz_orthocenter'), name: PointName, of: z.tuple([Name, Name, Name]) });
export const OxyzCircumcenterSchema = z.object({ op: z.literal('oxyz_circumcenter'), name: PointName, of: z.tuple([Name, Name, Name]) });
export const OxyzIntersectSchema = z.object({ op: z.literal('oxyz_intersect'), name: PointName, a: Name, b: Name });
```

Thêm các member đó vào `OxyzOpSchema` union (sau `OxyzReflectSchema`):

```ts
  OxyzFootSchema,
  OxyzReflectAcrossSchema,
  OxyzOrthocenterSchema,
  OxyzCircumcenterSchema,
  OxyzIntersectSchema,
```

Thêm helper `resolveEntityE`-lite tại chỗ: dùng lại `resolveEntityE`. Thêm import:

```ts
import { resolveEntityE } from '../resolveE';
```

Thêm các case vào `switch (op.op)` trong `executeOxyzOp` (trước dấu `}` đóng switch):

```ts
    case 'oxyz_foot': {
      const from = requirePointE(et, op.from);
      const target = resolveEntityE(op.target, et);
      if (op.onto === 'plane') {
        if (target.kind !== 'plane') throw new Error(`oxyz_foot onto plane: "${op.target}" is not a plane`);
        setPointE(et, op.name, footOnPlaneE(from.p, target), true);
      } else {
        if (target.kind !== 'line') throw new Error(`oxyz_foot onto line: "${op.target}" is not a line`);
        setPointE(et, op.name, footOnLineE(from.p, target), true);
      }
      break;
    }
    case 'oxyz_reflect_across': {
      const pt = requirePointE(et, op.point);
      const target = resolveEntityE(op.target, et);
      if (op.across === 'plane') {
        if (target.kind !== 'plane') throw new Error(`oxyz_reflect_across plane: "${op.target}" is not a plane`);
        setPointE(et, op.name, reflectAcrossPlaneE(pt.p, target), true);
      } else {
        if (target.kind !== 'line') throw new Error(`oxyz_reflect_across line: "${op.target}" is not a line`);
        setPointE(et, op.name, reflectAcrossLineE(pt.p, target), true);
      }
      break;
    }
    case 'oxyz_orthocenter': {
      const [a, b, c] = op.of.map((n) => requirePointE(et, n).p);
      setPointE(et, op.name, orthocenterE(a, b, c), true);
      break;
    }
    case 'oxyz_circumcenter': {
      const [a, b, c] = op.of.map((n) => requirePointE(et, n).p);
      setPointE(et, op.name, circumcenterE(a, b, c), true);
      break;
    }
    case 'oxyz_intersect': {
      const r = computeIntersection(resolveEntityE(op.a, et), resolveEntityE(op.b, et));
      if (!r.ok) throw new Error(r.problem);
      const pt = r.answer.result === 'point' ? r.answer.point : r.answer.result === 'tangent-point' ? r.answer.point : null;
      if (!pt) throw new Error(`oxyz_intersect: ${op.a} ∩ ${op.b} is not a single point (${r.answer.result})`);
      setPointE(et, op.name, pt.p, true);
      break;
    }
```

- [ ] **Step 4: Chạy để chắc chắn xanh + lint**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyz.test.ts`
Expected: PASS.
Run: `npx eslint api/_lib/kernel/dialects/oxyz.ts`
Expected: sạch (loại import thừa nếu có).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/dialects/oxyz.ts api/_lib/kernel/dialects/__tests__/oxyz.test.ts
git commit -m "feat(engine): Oxyz construction ops (foot, reflect_across, orthocenter, circumcenter, intersect)"
```

---

## Task 3: Dạy AI các phép + test hợp đồng

**Files:**
- Modify: `api/_lib/kernel-bridge/translatorPrompt.js`
- Test: `api/_lib/kernel/__tests__/translator-contract.test.ts`

- [ ] **Step 1: Thêm test đỏ (hợp đồng)**

```ts
// append inside the describe(...) in api/_lib/kernel/__tests__/translator-contract.test.ts
  it('bài trực tâm — engine TÍNH H (không để AI tự cắm)', () => {
    // A(1,0,0), B(0,2,0), C(0,0,4): trực tâm H = (16/21, 8/21, 4/21).
    const res = solve({
      solidName: 'ABC',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [0, 2, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 0, 4] },
        { op: 'oxyz_orthocenter', name: 'H', of: ['A', 'B', 'C'] },
      ],
    });
    expect(res.ok).toBe(true);
    const H = res.entities.points.get('H');
    expect(H).toBeDefined();
    expect(H!.p.x.approx).toBeCloseTo(16 / 21, 9);
    expect(H!.p.y.approx).toBeCloseTo(8 / 21, 9);
    expect(H!.p.z.approx).toBeCloseTo(4 / 21, 9);
  });
```

Ghi chú: op `oxyz_orthocenter` đã có từ Task 2 nên test này có thể PASS ngay (bước "đỏ" bỏ qua) — nó là test HỒI QUY khoá lại hành vi; deliverable chính của Task 3 là cập nhật prompt (Step 3).

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/translator-contract.test.ts`
Expected: FAIL (trước khi có op — nhưng op đã có từ Task 2; nếu vậy test có thể PASS ngay. Mục đích test là hồi quy). Nếu PASS ngay thì bỏ qua bước đỏ.

- [ ] **Step 3: Cập nhật `translatorPrompt.js`**

Trong phần "OPS", thêm sau dòng "Điểm đối xứng qua tâm":

```
- Hình chiếu (chân đ. vuông góc) lên đường/mặt: { "op": "oxyz_foot", "name": "H", "from": "A", "onto": "plane", "target": "P" } (onto: "line" hoặc "plane")
- Đối xứng qua đường/mặt: { "op": "oxyz_reflect_across", "name": "A'", "point": "A", "across": "plane", "target": "P" }
- Trực tâm tam giác: { "op": "oxyz_orthocenter", "name": "H", "of": ["A", "B", "C"] }
- Tâm đường tròn ngoại tiếp tam giác: { "op": "oxyz_circumcenter", "name": "O", "of": ["A", "B", "C"] }
- Giao điểm (đường-đường / đường-mặt): { "op": "oxyz_intersect", "name": "I", "a": "d", "b": "P" }
```

Thêm một dòng nguyên tắc (sau phần "NGUYÊN TẮC TOẠ-ĐỘ-HOÁ"):

```
- TUYỆT ĐỐI KHÔNG tự tính rồi cắm cứng toạ độ của điểm dẫn xuất (trực tâm, hình chiếu, giao điểm...). Hãy DÙNG op tương ứng để engine tính — nếu không engine không kiểm được và có thể sai.
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/translator-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel-bridge/translatorPrompt.js api/_lib/kernel/__tests__/translator-contract.test.ts
git commit -m "feat(engine): teach Translator the new construction ops (declare, don't self-compute)"
```

---

## Task 4: Kiểm chứng toàn cục

**Files:** (không tạo mới)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: PASS toàn bộ — 322 test trước + các test G2-6 mới, 0 fail.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json` → không lỗi.
Run: `npx eslint api/_lib/kernel --ext .ts` → sạch.

- [ ] **Step 3: Rebuild kernel + commit dấu mốc**

```bash
node scripts/build-kernel.mjs
git commit --allow-empty -m "chore(engine): G2-6 construction ops complete — foot/reflect/orthocenter/circumcenter/intersect green"
```

---

## Success criteria cho G2-6

- [ ] 5 phép dựng exact (foot/reflect/orthocenter/circumcenter/intersect) đúng golden; tất cả tạo điểm derived.
- [ ] Op Oxyz tương ứng chạy qua `executeOxyzPlan`/`run`; tham chiếu entity qua resolveEntityE.
- [ ] AI được dạy dùng op thay vì tự tính (dặn rõ trong prompt).
- [ ] Toàn bộ test cũ xanh; `tsc` + `eslint` sạch; kernel build lại được.
```
