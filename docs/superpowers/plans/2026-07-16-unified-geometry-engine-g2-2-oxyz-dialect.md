# Kế hoạch G2-2: Dialect Oxyz + hợp nhất schema

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm dialect nhập Oxyz — khai báo entity trực tiếp bằng toạ độ/phương trình hữu tỷ → dựng `EntityTable` với giá trị **exact** — và hợp nhất với dialect tổng hợp Phase 1 thành một schema/executor **trộn được**.

**Architecture:** Theo spec `docs/superpowers/specs/2026-07-16-unified-geometry-engine-design.md`. Dựa trên nền G2-1 (Scalar/Vec3S/entities/EntityTable đã có). Dialect Oxyz cho input hữu tỷ ⇒ entity mang exact thật. Executor hợp nhất xử lý op hai dialect trong một Plan theo thứ tự, chia sẻ một `SymbolTable` (float, Phase 1) + một `EntityTable`.

**Tech Stack:** TypeScript, Zod, Vitest, `bigint`.

---

## Design deviations / phạm vi (đã cân nhắc)

1. **G2-2 chỉ làm op GIỚI THIỆU entity + dẫn xuất thuần số học** (midpoint/ratio/centroid/reflect — chỉ cộng/nhân vô hướng, giữ exact). Dẫn xuất cần **tính hình học** (foot, intersect, giao tuyến) thuộc **compute layer G2-3** — không làm ở đây.
2. **Mỗi entity chỉ làm các dạng nhập phổ biến nhất** (điểm: toạ độ; đường: 2 điểm / điểm+chỉ phương; mặt: 3 điểm / điểm+pháp tuyến / hệ số; cầu: tâm+bán kính / tâm+điểm / phương trình). Các dạng còn lại (mặt qua điểm+2 chỉ phương, đường chính tắc rời) thêm sau — cùng khuôn.
3. **Input hữu tỷ:** số nguyên truyền dạng `number`; phân số/thập phân truyền dạng **string** (`"3/2"`, `"1.5"`). `number` không nguyên được parse theo biểu diễn thập phân của nó (vd `1.5 → 3/2`); giá trị như `1/3` phải truyền string `"1/3"` (float không biểu diễn đúng).
4. **Executor hợp nhất v1:** op tổng hợp chạy qua `executeOp` Phase 1 (float) rồi đồng bộ sang EntityTable; op Oxyz dựng exact trực tiếp. Op Oxyz tham chiếu điểm có sẵn: ưu tiên lấy từ EntityTable (exact), fallback SymbolTable (float).

---

## File Structure

- Create: `api/_lib/kernel/dialects/oxyzInput.ts` — parse input hữu tỷ (`parseRational`, `parseScalar`, `parseVec3S`).
- Create: `api/_lib/kernel/dialects/oxyz.ts` — schema `OxyzOpSchema` + `executeOxyzOp` + `executeOxyzPlan`.
- Create: `api/_lib/kernel/unifiedPlan.ts` — `UnifiedPlanSchema` + `executeUnifiedPlan`.
- Modify: `api/_lib/kernel/entities.ts` — thêm builder `sphereFromEquation`.
- Test: `dialects/__tests__/oxyzInput.test.ts`, `dialects/__tests__/oxyz.test.ts`, `__tests__/unifiedPlan.test.ts`, và bổ sung `__tests__/entities.test.ts`.
- **Không sửa** `execute.ts`, `verify.ts`, `planSchema.ts` (giữ test cũ xanh).

---

## Task 1: Parse input hữu tỷ

**Files:**
- Create: `api/_lib/kernel/dialects/oxyzInput.ts`
- Test: `api/_lib/kernel/dialects/__tests__/oxyzInput.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/dialects/__tests__/oxyzInput.test.ts
import { describe, it, expect } from 'vitest';
import { parseRational, parseVec3S } from '../oxyzInput';
import { makeExact } from '../../scalar';
import { toApproxVec } from '../../vec3s';

describe('parseRational', () => {
  it('số nguyên', () => {
    expect(parseRational(5)).toEqual(makeExact(5n, 1n, 1));
    expect(parseRational(-3)).toEqual(makeExact(-3n, 1n, 1));
  });

  it('thập phân dạng number: 1.5 → 3/2', () => {
    expect(parseRational(1.5)).toEqual(makeExact(3n, 2n, 1));
    expect(parseRational(-0.25)).toEqual(makeExact(-1n, 4n, 1));
  });

  it('string phân số: "3/2", "-7/4"', () => {
    expect(parseRational('3/2')).toEqual(makeExact(3n, 2n, 1));
    expect(parseRational('-7/4')).toEqual(makeExact(-7n, 4n, 1));
  });

  it('string thập phân và nguyên', () => {
    expect(parseRational('1.5')).toEqual(makeExact(3n, 2n, 1));
    expect(parseRational('12')).toEqual(makeExact(12n, 1n, 1));
  });

  it('ném lỗi với number dạng mũ (gợi ý dùng string)', () => {
    expect(() => parseRational(1e-7)).toThrow();
  });
});

describe('parseVec3S', () => {
  it('dựng vector từ toạ độ hỗn hợp number/string, gương float đúng', () => {
    const v = parseVec3S([1, '3/2', -2]);
    expect(toApproxVec(v)).toEqual({ x: 1, y: 1.5, z: -2 });
    expect(v.y.exact).toEqual(makeExact(3n, 2n, 1));
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyzInput.test.ts`
Expected: FAIL "Cannot find module '../oxyzInput'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/dialects/oxyzInput.ts
import { type Exact, type Scalar, makeExact, fromExact } from '../scalar';
import { type Vec3S, vec3s } from '../vec3s';

export type RationalInput = number | string;

// "1.5" / "-0.25" / "12" (thập phân hoặc nguyên, không dạng mũ) → Exact hữu tỷ.
function decimalToExact(s: string): Exact {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  if (!/^\d*\.?\d+$/.test(body) && !/^\d+\.?\d*$/.test(body)) {
    throw new Error(`Cannot parse rational from "${s}" (use "p/q" for fractions)`);
  }
  const dot = body.indexOf('.');
  if (dot === -1) {
    const v = BigInt(body);
    return makeExact(neg ? -v : v, 1n, 1);
  }
  const intPart = body.slice(0, dot) || '0';
  const fracPart = body.slice(dot + 1) || '0';
  const den = 10n ** BigInt(fracPart.length);
  const numAbs = BigInt(intPart) * den + BigInt(fracPart);
  return makeExact(neg ? -numAbs : numAbs, den, 1);
}

export function parseRational(input: RationalInput): Exact {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Rational input must be finite');
    if (Number.isInteger(input)) return makeExact(BigInt(input), 1n, 1);
    const s = input.toString();
    if (s.includes('e') || s.includes('E')) {
      throw new Error(`Number "${s}" is in exponent form; pass it as a string fraction instead`);
    }
    return decimalToExact(s);
  }
  const s = input.trim();
  if (s.includes('/')) {
    const [a, b] = s.split('/');
    return makeExact(BigInt(a.trim()), BigInt(b.trim()), 1);
  }
  return decimalToExact(s);
}

export function parseScalar(input: RationalInput): Scalar {
  return fromExact(parseRational(input));
}

export function parseVec3S(c: [RationalInput, RationalInput, RationalInput]): Vec3S {
  return vec3s(parseScalar(c[0]), parseScalar(c[1]), parseScalar(c[2]));
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyzInput.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/dialects/oxyzInput.ts api/_lib/kernel/dialects/__tests__/oxyzInput.test.ts
git commit -m "feat(engine): Oxyz rational input parsing (number/string -> exact)"
```

---

## Task 2: Builder mặt cầu từ phương trình

**Files:**
- Modify: `api/_lib/kernel/entities.ts`
- Test: `api/_lib/kernel/__tests__/entities.test.ts`

- [ ] **Step 1: Thêm test đỏ**

```ts
// append to api/_lib/kernel/__tests__/entities.test.ts
import { sphereFromEquation } from '../entities';
import { rat } from '../scalar';

describe('sphereFromEquation (x²+y²+z² + a·x + b·y + c·z + d = 0)', () => {
  it('x²+y²+z² −2x −4y −6z +5 = 0 ⇒ tâm (1,2,3), R²=9', () => {
    const s = sphereFromEquation(rat(-2n), rat(-4n), rat(-6n), rat(5n));
    expect(toApproxVec(s.center)).toEqual({ x: 1, y: 2, z: 3 });
    expect(s.r2.exact).toEqual(makeExact(9n, 1n, 1));
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/entities.test.ts`
Expected: FAIL (`sphereFromEquation is not a function`).

- [ ] **Step 3: Thêm cài đặt vào `entities.ts`**

Sửa dòng import đầu file thành:

```ts
import { type Scalar, rat, add, sub, mul, neg } from './scalar';
```

Thêm cuối file:

```ts
// Mặt cầu từ phương trình x²+y²+z² + a·x + b·y + c·z + d = 0.
// Tâm = (−a/2, −b/2, −c/2); R² = (a²+b²+c²)/4 − d = tâm.x²+tâm.y²+tâm.z² − d.
export function sphereFromEquation(a: Scalar, b: Scalar, c: Scalar, d: Scalar): SphereE {
  const half = rat(1n, 2n);
  const cx = neg(mul(a, half));
  const cy = neg(mul(b, half));
  const cz = neg(mul(c, half));
  const center = { x: cx, y: cy, z: cz };
  const r2 = sub(add(add(mul(cx, cx), mul(cy, cy)), mul(cz, cz)), d);
  return { kind: 'sphere', center, r2 };
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/entities.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/entities.ts api/_lib/kernel/__tests__/entities.test.ts
git commit -m "feat(engine): sphereFromEquation builder (complete-the-square, exact)"
```

---

## Task 3: Schema Oxyz

**Files:**
- Create: `api/_lib/kernel/dialects/oxyz.ts`
- Test: `api/_lib/kernel/dialects/__tests__/oxyz.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/dialects/__tests__/oxyz.test.ts
import { describe, it, expect } from 'vitest';
import { OxyzOpSchema } from '../oxyz';

describe('OxyzOpSchema — hợp lệ', () => {
  it('điểm bằng toạ độ', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_point', name: 'A', at: [1, 2, 3] }).success).toBe(true);
  });
  it('đường qua 2 điểm và đường điểm+chỉ phương', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_line', name: 'd', by: { form: 'two_points', a: 'A', b: 'B' } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_line', name: 'd', by: { form: 'point_dir', base: [0, 0, 0], dir: [1, 0, -1] } }).success).toBe(true);
  });
  it('mặt: 3 điểm / điểm+pháp tuyến / hệ số', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_plane', name: 'P', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_plane', name: 'P', by: { form: 'point_normal', point: 'A', normal: [2, -1, 2] } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_plane', name: 'P', by: { form: 'coeffs', a: 2, b: -1, c: 2, d: '-3' } }).success).toBe(true);
  });
  it('cầu: tâm+bán kính / tâm+điểm / phương trình', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_sphere', name: 'S', by: { form: 'center_radius', center: 'I', radius: 2 } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_sphere', name: 'S', by: { form: 'center_point', center: 'I', through: 'A' } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_sphere', name: 'S', by: { form: 'equation', a: -2, b: -4, c: -6, d: 5 } }).success).toBe(true);
  });
  it('dẫn xuất: midpoint / ratio / centroid / reflect', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_ratio', name: 'G', a: 'A', b: 'B', t: '1/3' }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_centroid', name: 'G', of: ['A', 'B', 'C'] }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_reflect', name: "A'", point: 'A', about: 'I' }).success).toBe(true);
  });
});

describe('OxyzOpSchema — không hợp lệ', () => {
  it('điểm thiếu toạ độ', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_point', name: 'A' }).success).toBe(false);
  });
  it('op không tồn tại', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_nope', name: 'A' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyz.test.ts`
Expected: FAIL "Cannot find module '../oxyz'".

- [ ] **Step 3: Viết cài đặt (chỉ schema trong task này; executor ở Task 4)**

```ts
// api/_lib/kernel/dialects/oxyz.ts
import { z } from 'zod';

const RInput = z.union([z.number(), z.string().min(1)]);
const Coord3 = z.tuple([RInput, RInput, RInput]);
const Name = z.string().min(1);

export const OxyzPointSchema = z.object({ op: z.literal('oxyz_point'), name: Name, at: Coord3 });

export const OxyzLineSchema = z.object({
  op: z.literal('oxyz_line'),
  name: Name,
  by: z.discriminatedUnion('form', [
    z.object({ form: z.literal('two_points'), a: Name, b: Name }),
    z.object({ form: z.literal('point_dir'), base: Coord3, dir: Coord3 }),
  ]),
});

export const OxyzPlaneSchema = z.object({
  op: z.literal('oxyz_plane'),
  name: Name,
  by: z.discriminatedUnion('form', [
    z.object({ form: z.literal('three_points'), a: Name, b: Name, c: Name }),
    z.object({ form: z.literal('point_normal'), point: Name, normal: Coord3 }),
    z.object({ form: z.literal('coeffs'), a: RInput, b: RInput, c: RInput, d: RInput }),
  ]),
});

export const OxyzSphereSchema = z.object({
  op: z.literal('oxyz_sphere'),
  name: Name,
  by: z.discriminatedUnion('form', [
    z.object({ form: z.literal('center_radius'), center: Name, radius: RInput }),
    z.object({ form: z.literal('center_point'), center: Name, through: Name }),
    z.object({ form: z.literal('equation'), a: RInput, b: RInput, c: RInput, d: RInput }),
  ]),
});

const PointName = z.string().regex(/^[A-Z]\d*'?$/);

export const OxyzMidpointSchema = z.object({ op: z.literal('oxyz_midpoint'), name: PointName, a: Name, b: Name });
export const OxyzRatioSchema = z.object({ op: z.literal('oxyz_ratio'), name: PointName, a: Name, b: Name, t: RInput });
export const OxyzCentroidSchema = z.object({ op: z.literal('oxyz_centroid'), name: PointName, of: z.array(Name).min(2) });
export const OxyzReflectSchema = z.object({ op: z.literal('oxyz_reflect'), name: PointName, point: Name, about: Name });

export const OxyzOpSchema = z.union([
  OxyzPointSchema,
  OxyzLineSchema,
  OxyzPlaneSchema,
  OxyzSphereSchema,
  OxyzMidpointSchema,
  OxyzRatioSchema,
  OxyzCentroidSchema,
  OxyzReflectSchema,
]);

export type OxyzOp = z.infer<typeof OxyzOpSchema>;
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/dialects/oxyz.ts api/_lib/kernel/dialects/__tests__/oxyz.test.ts
git commit -m "feat(engine): Oxyz dialect schema (point/line/plane/sphere + derived)"
```

---

## Task 4: Executor Oxyz (dựng EntityTable exact)

**Files:**
- Modify: `api/_lib/kernel/dialects/oxyz.ts`
- Test: `api/_lib/kernel/dialects/__tests__/oxyz.test.ts`

- [ ] **Step 1: Thêm test đỏ**

```ts
// append to api/_lib/kernel/dialects/__tests__/oxyz.test.ts
import { executeOxyzPlan } from '../oxyz';
import { toApproxVec } from '../../vec3s';
import { makeExact } from '../../scalar';

describe('executeOxyzPlan — dựng entity exact', () => {
  it('điểm, mặt qua 3 điểm (pháp tuyến & d exact), midpoint exact', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
      { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
      { op: 'oxyz_plane', name: 'P', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
      { op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' },
    ]);
    // mặt z=0: pháp tuyến (0,0,1), d = 0
    const P = et.planes.get('P')!;
    expect(toApproxVec(P.n)).toEqual({ x: 0, y: 0, z: 1 });
    expect(P.d.exact).toEqual(makeExact(0n, 1n, 1));
    // M = trung điểm AB = (1/2, 0, 0), exact
    const M = et.points.get('M')!;
    expect(M.p.x.exact).toEqual(makeExact(1n, 2n, 1));
    expect(toApproxVec(M.p)).toEqual({ x: 0.5, y: 0, z: 0 });
  });

  it('mặt cầu từ phương trình: tâm (1,2,3), R²=9', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_sphere', name: 'S', by: { form: 'equation', a: -2, b: -4, c: -6, d: 5 } },
    ]);
    const S = et.spheres.get('S')!;
    expect(toApproxVec(S.center)).toEqual({ x: 1, y: 2, z: 3 });
    expect(S.r2.exact).toEqual(makeExact(9n, 1n, 1));
  });

  it('đường qua 2 điểm giữ chỉ phương exact', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'A', at: [1, 0, 0] },
      { op: 'oxyz_point', name: 'B', at: [1, 2, 2] },
      { op: 'oxyz_line', name: 'd', by: { form: 'two_points', a: 'A', b: 'B' } },
    ]);
    const d = et.lines.get('d')!;
    expect(toApproxVec(d.dir)).toEqual({ x: 0, y: 2, z: 2 });
  });

  it('ném lỗi rõ ràng khi tham chiếu điểm chưa định nghĩa', () => {
    expect(() => executeOxyzPlan([{ op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' }])).toThrow();
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyz.test.ts`
Expected: FAIL (`executeOxyzPlan is not a function`).

- [ ] **Step 3: Thêm cài đặt vào `oxyz.ts`**

Thêm import ở đầu file (sau dòng `import { z } from 'zod';`):

```ts
import { rat, mul } from '../scalar';
import { type Vec3S, addV, subV, scaleV } from '../vec3s';
import {
  type PointE,
  pointFromCoords, lineFromTwoPoints, lineFromPointDir,
  planeFromThreePoints, planeFromPointNormal, planeFromCoeffs,
  sphereFromCenterRadius2, sphereFromCenterPoint, sphereFromEquation,
} from '../entities';
import { type EntityTable, createEmptyEntityTable } from '../entityTable';
import { parseScalar, parseVec3S } from './oxyzInput';
```

Thêm cuối file:

```ts
function requirePointE(et: EntityTable, name: string): PointE {
  const p = et.points.get(name);
  if (!p) throw new Error(`Oxyz: point "${name}" is referenced before it is defined`);
  return p;
}

function setPointE(et: EntityTable, name: string, p: Vec3S): void {
  if (et.points.has(name)) throw new Error(`Oxyz: point "${name}" is already defined`);
  et.points.set(name, pointFromCoords(p));
}

export function executeOxyzOp(op: OxyzOp, et: EntityTable): void {
  switch (op.op) {
    case 'oxyz_point':
      setPointE(et, op.name, parseVec3S(op.at));
      break;
    case 'oxyz_line': {
      if (op.by.form === 'two_points') {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        et.lines.set(op.name, lineFromTwoPoints(a.p, b.p));
      } else {
        et.lines.set(op.name, lineFromPointDir(parseVec3S(op.by.base), parseVec3S(op.by.dir)));
      }
      break;
    }
    case 'oxyz_plane': {
      if (op.by.form === 'three_points') {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        const c = requirePointE(et, op.by.c);
        et.planes.set(op.name, planeFromThreePoints(a.p, b.p, c.p));
      } else if (op.by.form === 'point_normal') {
        const point = requirePointE(et, op.by.point);
        et.planes.set(op.name, planeFromPointNormal(point.p, parseVec3S(op.by.normal)));
      } else {
        et.planes.set(op.name, planeFromCoeffs(
          parseScalar(op.by.a), parseScalar(op.by.b), parseScalar(op.by.c), parseScalar(op.by.d),
        ));
      }
      break;
    }
    case 'oxyz_sphere': {
      if (op.by.form === 'center_radius') {
        const center = requirePointE(et, op.by.center);
        const r = parseScalar(op.by.radius);
        et.spheres.set(op.name, sphereFromCenterRadius2(center.p, mul(r, r)));
      } else if (op.by.form === 'center_point') {
        const center = requirePointE(et, op.by.center);
        const through = requirePointE(et, op.by.through);
        et.spheres.set(op.name, sphereFromCenterPoint(center.p, through.p));
      } else {
        et.spheres.set(op.name, sphereFromEquation(
          parseScalar(op.by.a), parseScalar(op.by.b), parseScalar(op.by.c), parseScalar(op.by.d),
        ));
      }
      break;
    }
    case 'oxyz_midpoint': {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      setPointE(et, op.name, scaleV(addV(a.p, b.p), rat(1n, 2n)));
      break;
    }
    case 'oxyz_ratio': {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      const t = parseScalar(op.t);
      // A + t·(B − A)
      setPointE(et, op.name, addV(a.p, scaleV(subV(b.p, a.p), t)));
      break;
    }
    case 'oxyz_centroid': {
      const pts = op.of.map((n) => requirePointE(et, n).p);
      let sum = pts[0];
      for (let i = 1; i < pts.length; i++) sum = addV(sum, pts[i]);
      setPointE(et, op.name, scaleV(sum, rat(1n, BigInt(pts.length))));
      break;
    }
    case 'oxyz_reflect': {
      const point = requirePointE(et, op.point);
      const about = requirePointE(et, op.about);
      // 2·about − point
      setPointE(et, op.name, subV(scaleV(about.p, rat(2n)), point.p));
      break;
    }
  }
}

export function executeOxyzPlan(ops: OxyzOp[]): EntityTable {
  const et = createEmptyEntityTable();
  for (const op of ops) executeOxyzOp(op, et);
  return et;
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh + lint sạch**

Run: `npx vitest run api/_lib/kernel/dialects/__tests__/oxyz.test.ts`
Expected: PASS.
Run: `npx eslint api/_lib/kernel/dialects/oxyz.ts`
Expected: không lỗi (loại mọi import thừa nếu có).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/dialects/oxyz.ts api/_lib/kernel/dialects/__tests__/oxyz.test.ts
git commit -m "feat(engine): Oxyz executor -> exact EntityTable (introduction + arithmetic derived)"
```

---

## Task 5: Schema + executor hợp nhất (trộn 2 dialect)

**Files:**
- Create: `api/_lib/kernel/unifiedPlan.ts`
- Test: `api/_lib/kernel/__tests__/unifiedPlan.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/unifiedPlan.test.ts
import { describe, it, expect } from 'vitest';
import { UnifiedPlanSchema, executeUnifiedPlan } from '../unifiedPlan';
import { toApproxVec } from '../vec3s';
import { makeExact } from '../scalar';

describe('UnifiedPlanSchema', () => {
  it('chấp nhận plan trộn op tổng hợp và op Oxyz', () => {
    const r = UnifiedPlanSchema.safeParse({
      solidName: 'mix',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } },
        { op: 'oxyz_sphere', name: 'S', by: { form: 'center_point', center: 'A', through: 'B' } },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe('executeUnifiedPlan', () => {
  it('dựng hình tổng hợp (float) và entity Oxyz (exact) trong cùng một bảng', () => {
    const et = executeUnifiedPlan({
      solidName: 'mix',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 2, 2] },
        { op: 'oxyz_sphere', name: 'S', by: { form: 'center_point', center: 'A', through: 'B' } },
        { op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' },
      ],
    });
    // Sphere R² = |B−A|² = 1+4+4 = 9, exact
    expect(et.spheres.get('S')!.r2.exact).toEqual(makeExact(9n, 1n, 1));
    // M exact = (1/2, 1, 1)
    expect(et.points.get('M')!.p.x.exact).toEqual(makeExact(1n, 2n, 1));
  });

  it('op tổng hợp và Oxyz cùng tồn tại; điểm tổng hợp là float, điểm Oxyz là exact', () => {
    const et = executeUnifiedPlan({
      solidName: 'mix2',
      ops: [
        { op: 'base', shape: 'square', vertices: ['P', 'Q', 'R', 'T'], dims: { edge: 2 } },
        { op: 'oxyz_point', name: 'A', at: [3, 4, 0] },
      ],
    });
    // 4 đỉnh hình vuông (float) + điểm A (exact) = 5 điểm
    expect(et.points.size).toBe(5);
    expect(et.points.get('P')!.p.x.exact).toBeNull(); // tổng hợp: float-only
    expect(et.points.get('A')!.p.x.exact).toEqual(makeExact(3n, 1n, 1)); // Oxyz: exact
    // face của hình vuông đăng ký thành PlaneE
    expect(et.planes.has('PQRT')).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/unifiedPlan.test.ts`
Expected: FAIL "Cannot find module '../unifiedPlan'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/unifiedPlan.ts
import { z } from 'zod';
import { ConstructionOpSchema, type ConstructionOp } from './planSchema';
import { OxyzOpSchema, type OxyzOp, executeOxyzOp } from './dialects/oxyz';
import type { SymbolTable, Vec3 } from './types';
import { createEmptySymbolTable, executeOp } from './execute';
import { type EntityTable, createEmptyEntityTable } from './entityTable';
import { pointFromCoords, planeFromThreePoints } from './entities';
import { num } from './scalar';
import type { Vec3S } from './vec3s';

const OXYZ_OPS = new Set([
  'oxyz_point', 'oxyz_line', 'oxyz_plane', 'oxyz_sphere',
  'oxyz_midpoint', 'oxyz_ratio', 'oxyz_centroid', 'oxyz_reflect',
]);

export const UnifiedOpSchema = z.union([ConstructionOpSchema, OxyzOpSchema]);

export const UnifiedPlanSchema = z.object({
  solidName: z.string().min(1),
  ops: z.array(UnifiedOpSchema).min(1),
});

export type UnifiedPlan = z.infer<typeof UnifiedPlanSchema>;

function floatVecToVec3S(v: Vec3): Vec3S {
  return { x: num(v.x), y: num(v.y), z: num(v.z) };
}

// Đồng bộ (bồi thêm) mọi điểm/mặt/cạnh mới của SymbolTable float sang EntityTable.
function syncSymtabToEntities(symtab: SymbolTable, et: EntityTable): void {
  for (const [name, pos] of symtab.points) {
    if (!et.points.has(name)) et.points.set(name, pointFromCoords(floatVecToVec3S(pos)));
  }
  for (const [key, verts] of symtab.namedPlanes) {
    et.faces.set(key, verts);
    if (verts.length >= 3 && !et.planes.has(key)) {
      const [a, b, c] = verts.map((n) => floatVecToVec3S(symtab.points.get(n)!));
      et.planes.set(key, planeFromThreePoints(a, b, c));
    }
  }
  for (const e of symtab.edges) et.edges.add(e);
  if (symtab.derivedPoints) for (const d of symtab.derivedPoints) et.derivedPoints.add(d);
}

export function executeUnifiedPlan(plan: UnifiedPlan): EntityTable {
  const symtab = createEmptySymbolTable();
  const et = createEmptyEntityTable();
  for (const op of plan.ops) {
    if (OXYZ_OPS.has((op as { op: string }).op)) {
      executeOxyzOp(op as OxyzOp, et);
    } else {
      executeOp(op as ConstructionOp, symtab);
      syncSymtabToEntities(symtab, et);
    }
  }
  return et;
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/unifiedPlan.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/unifiedPlan.ts api/_lib/kernel/__tests__/unifiedPlan.test.ts
git commit -m "feat(engine): unified plan schema + executor (synthetic + Oxyz mixable)"
```

---

## Task 6: Kiểm chứng toàn cục

**Files:** (không tạo mới)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: PASS toàn bộ — 178 test G2-1/Phase 1 + các test mới (oxyzInput, oxyz, entities bổ sung, unifiedPlan), 0 fail, không hồi quy.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi.

- [ ] **Step 3: Lint**

Run: `npx eslint api/_lib/kernel --ext .ts`
Expected: không lỗi/cảnh báo (loại mọi import thừa).

- [ ] **Step 4: Commit dấu mốc**

```bash
git commit --allow-empty -m "chore(engine): G2-2 Oxyz dialect complete — schema + exact executor + unified plan green"
```

---

## Success criteria cho G2-2

- [ ] Parse input hữu tỷ (number nguyên, number thập phân, string phân số/thập phân) → Exact đúng; number dạng mũ bị từ chối rõ ràng.
- [ ] Schema Oxyz nhận đủ dạng nhập đã liệt kê cho point/line/plane/sphere + 4 dẫn xuất; từ chối input thiếu/không hợp lệ.
- [ ] `executeOxyzPlan` dựng entity **exact**: mặt qua 3 điểm cho pháp tuyến & d exact; cầu từ phương trình cho tâm + R² exact; midpoint/ratio/centroid/reflect exact; tham chiếu điểm chưa định nghĩa → ném lỗi rõ.
- [ ] `UnifiedPlanSchema` chấp nhận plan trộn; `executeUnifiedPlan` cho op tổng hợp (float) và op Oxyz (exact) cùng tồn tại trong một EntityTable.
- [ ] Toàn bộ test cũ vẫn xanh (không sửa execute/verify/planSchema); `tsc` + `eslint` sạch.
