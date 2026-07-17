# Kế hoạch G2-4: Capstone — Entity Resolver + Query + Verifier + `run()`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ghép toàn bộ engine thành một entrypoint `run(plan)`: nhận Plan JSON (op hai dialect + assert + query) → dựng `EntityTable`, **kiểm chứng assert**, **tính đáp số query**, trả `{ ok, entities, answers, violations, errors, trace }` — **không bao giờ ném** với plan hợp lệ schema.

**Architecture:** Theo spec §6.3. Verifier xây **trên compute layer** (perp = angle 90°, on = distance 0, …). Resolver tổng quát token → entity trên `EntityTable`. Mọi throw của executor được bọc thành `errors` có cấu trúc.

**Tech Stack:** TypeScript, Zod, Vitest. Không nối LLM (đó là gói Phase-2 sau).

---

## Design deviations / phạm vi

1. **Verifier dùng lại compute** thay vì viết lại hình học: `perp`↔angle=90, `parallel`↔angle=0, `on`↔distance=0, `dist`/`angle`↔giá trị, `coplanar`↔coplanarityProblem. Đủ 6 quan hệ Phase-1; quan hệ mặt cầu (tiếp xúc/thuộc-cầu) thêm sau.
2. **Query:** distance/angle/relative_position/intersection (2 token), equation (1 token), volume (tetra/pyramid), area (triangle/polygon). Dùng lại compute G2-3.
3. **Mang sang gói SAU (ghi rõ, không làm ở đây):** self-cert cho entity giao (residual `n·p+d≈0`); họ truy vấn còn thiếu (điểm-cầu, cầu-đường, lăng trụ, diện tích mặt cầu); quyết định góc nhị diện có hướng. G2-4 chỉ làm capstone wiring.

---

## File Structure

- Create: `api/_lib/kernel/resolveE.ts` — `resolveEntityE(token, et)`.
- Create: `api/_lib/kernel/compute/query.ts` — `QueryE` schema + `QueryAnswer` + `computeQuery`.
- Create: `api/_lib/kernel/verifyE.ts` — `verifyAssertE(assert, et)`.
- Create: `api/_lib/kernel/run.ts` — `RunPlanSchema`, `EngineResult`, `run(plan)`.
- Modify: `api/_lib/kernel/index.ts` — export `run`.
- Test: `__tests__/resolveE.test.ts`, `compute/__tests__/query.test.ts`, `__tests__/verifyE.test.ts`, `__tests__/run.test.ts`.

---

## Task 1: Entity resolver

**Files:**
- Create: `api/_lib/kernel/resolveE.ts`
- Test: `api/_lib/kernel/__tests__/resolveE.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/resolveE.test.ts
import { describe, it, expect } from 'vitest';
import { resolveEntityE } from '../resolveE';
import { createEmptyEntityTable } from '../entityTable';
import { pointFromCoords, lineFromPointDir } from '../entities';
import { ratVec, toApproxVec } from '../vec3s';

function et3() {
  const et = createEmptyEntityTable();
  et.points.set('A', pointFromCoords(ratVec(0n, 0n, 0n)));
  et.points.set('B', pointFromCoords(ratVec(1n, 0n, 0n)));
  et.points.set('C', pointFromCoords(ratVec(0n, 1n, 0n)));
  return et;
}

describe('resolveEntityE', () => {
  it('điểm có tên', () => {
    expect(resolveEntityE('A', et3()).kind).toBe('point');
  });
  it('ghép 2 chữ → đường', () => {
    const e = resolveEntityE('AB', et3());
    expect(e.kind).toBe('line');
    if (e.kind === 'line') expect(toApproxVec(e.dir)).toEqual({ x: 1, y: 0, z: 0 });
  });
  it('ghép 3 chữ → mặt', () => {
    expect(resolveEntityE('ABC', et3()).kind).toBe('plane');
  });
  it('entity có tên (đường Oxyz)', () => {
    const et = et3();
    et.lines.set('d', lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(0n, 0n, 1n)));
    expect(resolveEntityE('d', et).kind).toBe('line');
  });
  it('token ngoặc "(ABC)"', () => {
    expect(resolveEntityE('(ABC)', et3()).kind).toBe('plane');
  });
  it('token không giải được → ném', () => {
    expect(() => resolveEntityE('XYZ', et3())).toThrow();
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/resolveE.test.ts`
Expected: FAIL "Cannot find module '../resolveE'".

- [ ] **Step 3: Viết `resolveE.ts`**

```ts
// api/_lib/kernel/resolveE.ts
import type { EntityTable } from './entityTable';
import { type Entity, lineFromTwoPoints, planeFromThreePoints } from './entities';

// Tách token thành các tên điểm (khớp dài nhất trước, như Phase 1).
function tokenizePointNames(raw: string, known: Set<string>): string[] | null {
  const names = Array.from(known).sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let rest = raw;
  while (rest.length > 0) {
    const match = names.find((n) => rest.startsWith(n));
    if (!match) return null;
    tokens.push(match);
    rest = rest.slice(match.length);
  }
  return tokens;
}

// token → entity trên EntityTable. Ưu tiên tên đã đăng ký (điểm/đường/mặt/cầu), rồi ghép
// tên điểm ("AB"=đường, "ABC…"=mặt qua 3 điểm đầu). Ném nếu không giải được.
export function resolveEntityE(token: string, et: EntityTable): Entity {
  const paren = token.match(/^\((.+)\)$/);
  const inner = paren ? paren[1] : token;

  const p = et.points.get(inner);
  if (p) return p;
  const l = et.lines.get(inner);
  if (l) return l;
  const pl = et.planes.get(inner);
  if (pl) return pl;
  const s = et.spheres.get(inner);
  if (s) return s;

  const tokens = tokenizePointNames(inner, new Set(et.points.keys()));
  if (!tokens) {
    throw new Error(`Cannot resolve entity "${token}": not a named entity or a compound of known points`);
  }
  if (tokens.length === 1) return et.points.get(tokens[0])!;
  if (tokens.length === 2) {
    return lineFromTwoPoints(et.points.get(tokens[0])!.p, et.points.get(tokens[1])!.p);
  }
  const [a, b, c] = tokens;
  return planeFromThreePoints(et.points.get(a)!.p, et.points.get(b)!.p, et.points.get(c)!.p);
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/resolveE.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/resolveE.ts api/_lib/kernel/__tests__/resolveE.test.ts
git commit -m "feat(engine): entity resolver over EntityTable (named + compound tokens)"
```

---

## Task 2: Query schema + dispatcher

**Files:**
- Create: `api/_lib/kernel/compute/query.ts`
- Test: `api/_lib/kernel/compute/__tests__/query.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/compute/__tests__/query.test.ts
import { describe, it, expect } from 'vitest';
import { QueryESchema, computeQuery } from '../query';
import { createEmptyEntityTable } from '../../entityTable';
import { pointFromCoords, planeFromCoeffs } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

function scene() {
  const et = createEmptyEntityTable();
  et.points.set('A', pointFromCoords(ratVec(0n, 0n, 0n)));
  et.points.set('B', pointFromCoords(ratVec(2n, 1n, 2n)));
  et.points.set('S', pointFromCoords(ratVec(0n, 0n, 3n)));
  et.planes.set('P', planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n))); // z=0
  return et;
}

describe('QueryESchema', () => {
  it('nhận query hợp lệ, từ chối kind lạ', () => {
    expect(QueryESchema.safeParse({ kind: 'distance', a: 'A', b: 'B' }).success).toBe(true);
    expect(QueryESchema.safeParse({ kind: 'nope', a: 'A', b: 'B' }).success).toBe(false);
  });
});

describe('computeQuery', () => {
  it('distance điểm-điểm = 3', () => {
    const r = computeQuery({ kind: 'distance', a: 'A', b: 'B' }, scene());
    expect(r.ok).toBe(true);
    if (r.ok && r.answer.kind === 'distance') expect(r.answer.exact).toEqual(makeExact(3n, 1n, 1));
  });
  it('distance điểm-mặt (S tới z=0) = 3', () => {
    const r = computeQuery({ kind: 'distance', a: 'S', b: 'P' }, scene());
    expect(r.ok && r.answer.kind === 'distance' && r.answer.approx).toBeCloseTo(3, 9);
  });
  it('equation của mặt P', () => {
    const r = computeQuery({ kind: 'equation', target: 'P' }, scene());
    expect(r.ok && r.answer.kind === 'equation' && r.answer.text).toBe('z = 0');
  });
  it('volume tứ diện = 1/6', () => {
    const et = scene();
    et.points.set('X', pointFromCoords(ratVec(1n, 0n, 0n)));
    et.points.set('Y', pointFromCoords(ratVec(0n, 1n, 0n)));
    et.points.set('Z', pointFromCoords(ratVec(0n, 0n, 1n)));
    const r = computeQuery({ kind: 'volume', solid: 'tetrahedron', points: ['A', 'X', 'Y', 'Z'] }, et);
    expect(r.ok && r.answer.kind === 'volume' && r.answer.exact).toEqual(makeExact(1n, 6n, 1));
  });
  it('token không giải được → {ok:false}, không ném', () => {
    const r = computeQuery({ kind: 'distance', a: 'A', b: 'NOPE' }, scene());
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/query.test.ts`
Expected: FAIL "Cannot find module '../query'".

- [ ] **Step 3: Viết `query.ts`**

```ts
// api/_lib/kernel/compute/query.ts
import { z } from 'zod';
import type { EntityTable } from '../entityTable';
import type { Entity, PointE } from '../entities';
import { resolveEntityE } from '../resolveE';
import { type ComputeOutcome, type DistanceAnswer, type AngleAnswer, type ScalarAnswer } from './answer';
import { computeDistance } from './distance';
import { computeAngle } from './angle';
import { computeTetraVolume, computePyramidVolume } from './volume';
import { computeTriangleArea, computePolygonArea } from './area';
import { computeRelativePosition, type RelPosAnswer } from './relative';
import { computeIntersection, type IntersectionAnswer } from './intersect';
import { planeEquationText, sphereEquationText, lineEquationText } from './equation';

const Tok = z.string().min(1);

export const QueryESchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('distance'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('angle'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('relative_position'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('intersection'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('equation'), target: Tok }),
  z.object({ kind: z.literal('volume'), solid: z.enum(['tetrahedron', 'pyramid']), points: z.array(Tok).min(3), apex: Tok.optional() }),
  z.object({ kind: z.literal('area'), shape: z.enum(['triangle', 'polygon']), points: z.array(Tok).min(3) }),
]);

export type QueryE = z.infer<typeof QueryESchema>;

export type EquationAnswer = { kind: 'equation'; text: string };
export type QueryAnswer =
  | DistanceAnswer | AngleAnswer | ScalarAnswer | RelPosAnswer | IntersectionAnswer | EquationAnswer;

function asPoints(tokens: string[], et: EntityTable): PointE[] {
  return tokens.map((t) => {
    const e: Entity = resolveEntityE(t, et);
    if (e.kind !== 'point') throw new Error(`"${t}" must be a point`);
    return e;
  });
}

export function computeQuery(query: QueryE, et: EntityTable): ComputeOutcome<QueryAnswer> {
  try {
    switch (query.kind) {
      case 'distance': return computeDistance(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'angle': return computeAngle(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'relative_position': return computeRelativePosition(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'intersection': return computeIntersection(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'equation': {
        const e = resolveEntityE(query.target, et);
        const text = e.kind === 'plane' ? planeEquationText(e)
          : e.kind === 'sphere' ? sphereEquationText(e)
          : e.kind === 'line' ? lineEquationText(e)
          : null;
        if (text === null) return { ok: false, problem: `no equation for a ${e.kind}` };
        return { ok: true, answer: { kind: 'equation', text } };
      }
      case 'volume': {
        const pts = asPoints(query.points, et);
        if (query.solid === 'tetrahedron') {
          if (pts.length !== 4) return { ok: false, problem: 'tetrahedron needs exactly 4 points' };
          return computeTetraVolume(pts[0], pts[1], pts[2], pts[3]);
        }
        if (!query.apex) return { ok: false, problem: 'pyramid needs an apex' };
        return computePyramidVolume(pts, asPoints([query.apex], et)[0]);
      }
      case 'area': {
        const pts = asPoints(query.points, et);
        return query.shape === 'triangle' && pts.length === 3
          ? computeTriangleArea(pts[0], pts[1], pts[2])
          : computePolygonArea(pts);
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/query.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/compute/query.ts api/_lib/kernel/compute/__tests__/query.test.ts
git commit -m "feat(engine): query schema + dispatcher over the compute layer"
```

---

## Task 3: Verifier trên entity (qua compute)

**Files:**
- Create: `api/_lib/kernel/verifyE.ts`
- Test: `api/_lib/kernel/__tests__/verifyE.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/verifyE.test.ts
import { describe, it, expect } from 'vitest';
import { verifyAssertE } from '../verifyE';
import { createEmptyEntityTable } from '../entityTable';
import { pointFromCoords, planeFromCoeffs } from '../entities';
import { ratVec } from '../vec3s';
import { rat } from '../scalar';
import type { AssertOp } from '../planSchema';

function scene() {
  const et = createEmptyEntityTable();
  et.points.set('A', pointFromCoords(ratVec(0n, 0n, 0n)));
  et.points.set('B', pointFromCoords(ratVec(1n, 0n, 0n)));
  et.points.set('S', pointFromCoords(ratVec(0n, 0n, 3n)));
  et.planes.set('P', planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n))); // z=0
  return et;
}

describe('verifyAssertE', () => {
  it('on: A thuộc mặt z=0 → null (không vi phạm)', () => {
    expect(verifyAssertE({ relation: 'on', args: ['A', 'P'] } as AssertOp, scene())).toBeNull();
  });
  it('on: S không thuộc mặt z=0 → vi phạm', () => {
    expect(verifyAssertE({ relation: 'on', args: ['S', 'P'] } as AssertOp, scene())).not.toBeNull();
  });
  it('perp: SA vuông góc mặt z=0 → null', () => {
    expect(verifyAssertE({ relation: 'perp', args: ['SA', 'P'] } as AssertOp, scene())).toBeNull();
  });
  it('dist: dist(S,A)=3 → null; sai giá trị → vi phạm', () => {
    expect(verifyAssertE({ relation: 'dist', args: ['S', 'A'], value: 3 } as AssertOp, scene())).toBeNull();
    expect(verifyAssertE({ relation: 'dist', args: ['S', 'A'], value: 99 } as AssertOp, scene())).not.toBeNull();
  });
  it('coplanar: A,B,S,và điểm phẳng → tuỳ; A,B,(0,1,0) đồng phẳng z=0', () => {
    const et = scene();
    et.points.set('C', pointFromCoords(ratVec(0n, 1n, 0n)));
    et.points.set('D', pointFromCoords(ratVec(1n, 1n, 0n)));
    expect(verifyAssertE({ relation: 'coplanar', args: ['A', 'B', 'C', 'D'] } as AssertOp, et)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/verifyE.test.ts`
Expected: FAIL "Cannot find module '../verifyE'".

- [ ] **Step 3: Viết `verifyE.ts`**

```ts
// api/_lib/kernel/verifyE.ts
import type { AssertOp } from './planSchema';
import type { EntityTable } from './entityTable';
import type { Violation } from './types';
import type { PointE } from './entities';
import { resolveEntityE } from './resolveE';
import { computeDistance } from './compute/distance';
import { computeAngle } from './compute/angle';
import { coplanarityProblem } from './compute/answer';

const DIST_TOL = 1e-6;
const ANGLE_TOL = 1e-3;

function fail(relation: string, args: string[], message: string): Violation {
  return { kind: 'assert_failed', relation, args, message };
}

// Kiểm một assert trên EntityTable, tái dùng compute layer. Trả Violation | null.
// Có thể ném nếu token không giải được — caller (run) bọc try/catch.
export function verifyAssertE(assert: AssertOp, et: EntityTable): Violation | null {
  const args = assert.args;
  switch (assert.relation) {
    case 'on': {
      const r = computeDistance(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? DIST_TOL;
      if (!r.ok) return fail('on', args, r.problem);
      return r.answer.approx < tol ? null : fail('on', args, `${args[0]} not on ${args[1]} (distance ${r.answer.approx.toFixed(6)})`);
    }
    case 'dist': {
      const r = computeDistance(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? DIST_TOL;
      if (!r.ok) return fail('dist', args, r.problem);
      return Math.abs(r.answer.approx - assert.value!) < tol ? null : fail('dist', args, `dist(${args[0]},${args[1]})=${r.answer.approx.toFixed(6)}, expected ${assert.value}`);
    }
    case 'perp': {
      const r = computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? ANGLE_TOL;
      if (!r.ok) return fail('perp', args, r.problem);
      return Math.abs(r.answer.degrees - 90) < tol ? null : fail('perp', args, `${args[0]} not perpendicular to ${args[1]} (angle ${r.answer.degrees.toFixed(4)}°)`);
    }
    case 'parallel': {
      const r = computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? ANGLE_TOL;
      if (!r.ok) return fail('parallel', args, r.problem);
      return Math.abs(r.answer.degrees) < tol ? null : fail('parallel', args, `${args[0]} not parallel to ${args[1]} (angle ${r.answer.degrees.toFixed(4)}°)`);
    }
    case 'angle': {
      const r = computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? ANGLE_TOL;
      if (!r.ok) return fail('angle', args, r.problem);
      return Math.abs(r.answer.degrees - assert.value!) < tol ? null : fail('angle', args, `angle(${args[0]},${args[1]})=${r.answer.degrees.toFixed(4)}°, expected ${assert.value}°`);
    }
    case 'coplanar': {
      const pts = args.map((t) => resolveEntityE(t, et));
      if (pts.some((p) => p.kind !== 'point')) return fail('coplanar', args, 'coplanar requires point arguments');
      const cp = coplanarityProblem(pts.map((p) => (p as PointE).p), 'points');
      return cp ? fail('coplanar', args, cp) : null;
    }
  }
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/verifyE.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/verifyE.ts api/_lib/kernel/__tests__/verifyE.test.ts
git commit -m "feat(engine): entity verifier built on the compute layer"
```

---

## Task 4: `run(plan)` + kiểm chứng end-to-end

**Files:**
- Create: `api/_lib/kernel/run.ts`
- Modify: `api/_lib/kernel/index.ts`
- Test: `api/_lib/kernel/__tests__/run.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/run.test.ts
import { describe, it, expect } from 'vitest';
import { run } from '../run';
import { makeExact } from '../scalar';

const BASE = {
  solidName: 'test',
  ops: [
    { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
    { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
    { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
    { op: 'oxyz_plane', name: 'P', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
    { op: 'oxyz_point', name: 'S', at: [0, 0, 3] },
  ],
};

describe('run — end-to-end', () => {
  it('dựng + kiểm assert đúng + tính query đúng → ok', () => {
    const res = run({
      ...BASE,
      asserts: [{ relation: 'on', args: ['A', 'P'] }],
      queries: [{ kind: 'distance', a: 'S', b: 'P' }],
    });
    expect(res.ok).toBe(true);
    expect(res.violations).toHaveLength(0);
    expect(res.errors).toHaveLength(0);
    expect(res.answers[0].kind).toBe('distance');
    if (res.answers[0].kind === 'distance') expect(res.answers[0].exact).toEqual(makeExact(3n, 1n, 1));
    expect(res.entities.points.size).toBe(4);
  });

  it('assert sai → ok:false với violation, KHÔNG ném', () => {
    const res = run({ ...BASE, asserts: [{ relation: 'on', args: ['S', 'P'] }] });
    expect(res.ok).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });

  it('op tham chiếu điểm chưa định nghĩa → error có cấu trúc, KHÔNG ném', () => {
    const res = run({ solidName: 'bad', ops: [{ op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' }] });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('schema không hợp lệ → error, KHÔNG ném', () => {
    const res = run({ solidName: '', ops: [] });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('query token hỏng → error, các phần khác vẫn chạy', () => {
    const res = run({ ...BASE, queries: [{ kind: 'distance', a: 'S', b: 'NOPE' }] });
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/run.test.ts`
Expected: FAIL "Cannot find module '../run'".

- [ ] **Step 3: Viết `run.ts`**

```ts
// api/_lib/kernel/run.ts
import { z } from 'zod';
import { UnifiedOpSchema, executeUnifiedPlan } from './unifiedPlan';
import { AssertOpSchema } from './planSchema';
import { QueryESchema, computeQuery, type QueryAnswer } from './compute/query';
import { verifyAssertE } from './verifyE';
import { type EntityTable, createEmptyEntityTable } from './entityTable';
import type { Violation } from './types';

export const RunPlanSchema = z.object({
  solidName: z.string().min(1),
  ops: z.array(UnifiedOpSchema).min(1),
  asserts: z.array(AssertOpSchema).default([]),
  queries: z.array(QueryESchema).default([]),
});

export type RunPlan = z.infer<typeof RunPlanSchema>;
export type EngineError = { message: string };
export type EngineResult = {
  ok: boolean;
  entities: EntityTable;
  answers: QueryAnswer[];
  violations: Violation[];
  errors: EngineError[];
  trace: string[];
};

// Entrypoint hợp nhất. Không bao giờ ném với plan hợp lệ schema — mọi hỏng hóc thành
// violations/errors có cấu trúc.
export function run(rawPlan: unknown): EngineResult {
  const trace: string[] = [];
  const errors: EngineError[] = [];
  const violations: Violation[] = [];
  const answers: QueryAnswer[] = [];

  const parsed = RunPlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return { ok: false, entities: createEmptyEntityTable(), answers, violations, errors: [{ message: `Invalid plan: ${parsed.error.issues[0]?.message ?? 'schema error'}` }], trace };
  }
  const plan = parsed.data;

  let entities: EntityTable;
  try {
    entities = executeUnifiedPlan(plan);
    trace.push(`executed ${plan.ops.length} ops, ${entities.points.size} points`);
  } catch (e) {
    return { ok: false, entities: createEmptyEntityTable(), answers, violations, errors: [{ message: (e as Error).message }], trace };
  }

  for (const assert of plan.asserts) {
    try {
      const v = verifyAssertE(assert, entities);
      if (v) violations.push(v);
    } catch (e) {
      errors.push({ message: `assert ${assert.relation}(${assert.args.join(',')}): ${(e as Error).message}` });
    }
  }
  trace.push(`verified ${plan.asserts.length} asserts, ${violations.length} violation(s)`);

  for (const query of plan.queries) {
    const r = computeQuery(query, entities);
    if (r.ok) answers.push(r.answer);
    else errors.push({ message: `query ${query.kind}: ${r.problem}` });
  }
  trace.push(`computed ${answers.length}/${plan.queries.length} queries`);

  return { ok: violations.length === 0 && errors.length === 0, entities, answers, violations, errors, trace };
}
```

- [ ] **Step 4: Export `run` từ `index.ts`**

Thêm dòng vào cuối `api/_lib/kernel/index.ts`:

```ts
export { run, RunPlanSchema, type EngineResult } from './run';
```

- [ ] **Step 5: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/run.test.ts`
Expected: PASS.

- [ ] **Step 6: Kiểm chứng toàn cục**

Run: `npx vitest run`
Expected: PASS toàn bộ — 269 test trước + các test resolveE/query/verifyE/run mới, 0 fail.
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi.
Run: `npx eslint api/_lib/kernel --ext .ts`
Expected: sạch.

- [ ] **Step 7: Commit dấu mốc**

```bash
git add api/_lib/kernel/run.ts api/_lib/kernel/index.ts api/_lib/kernel/__tests__/run.test.ts
git commit -m "feat(engine): run(plan) capstone — execute + verify + compute, structured never-throw result"
```

---

## Success criteria cho G2-4

- [ ] `resolveEntityE` giải token → entity (tên đã đăng ký + ghép điểm + ngoặc), ném khi không giải được.
- [ ] `computeQuery` điều phối 7 loại truy vấn qua compute layer, bọc lỗi thành `{ok:false}`.
- [ ] `verifyAssertE` kiểm perp/parallel/on/dist/angle/coplanar **qua compute**, trả `Violation|null`.
- [ ] `run(plan)` chạy end-to-end: plan đúng → `ok:true` + đáp số đúng; assert sai → `violations`; op hỏng/schema sai/query hỏng → `errors`; **không bao giờ ném**.
- [ ] Toàn bộ test cũ xanh (269 → nhiều hơn); `tsc` + `eslint` sạch. **Engine hợp nhất hoàn chỉnh.**
```
