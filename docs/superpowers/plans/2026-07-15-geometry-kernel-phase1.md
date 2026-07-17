# Geometry Kernel — Phase 1 (Kernel + Verifier Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure, deterministic TypeScript geometry kernel (`api/_lib/kernel/`) that executes a strictly-typed "Construction Plan" into exact 3D coordinates, verifies every stated geometric constraint numerically, detects degenerate constructions, and outputs data shaped exactly like the existing `GeometryData` type — with zero LLM involvement and 100% unit-test coverage of every formula. No production API route (`api/analyze-geometry.js`, `api/solve.js`, `api/modify-geometry.js`) is touched in this phase.

**Architecture:** A `Plan` (Zod-validated JSON: `{ solidName, ops[], asserts[], query? }`) is executed op-by-op against a `SymbolTable` (point name → `Vec3`, named planes, rendered edges) by `execute.ts`. The result is checked by `verify.ts` against every `assert` (perp/parallel/coplanar/on/dist/angle) plus a degeneracy pass (duplicate points, collinear/non-planar faces). A deterministic `repair.ts` can snap small numeric drift (≤1% of shape scale) back onto a constraint by re-projection; anything larger is left as a reported violation (semantic errors are Phase 2's LLM-repair problem, not this kernel's). `exactForm.ts` converts floats to textbook `p·√n/q` form. `toGeometryData.ts` maps the `SymbolTable` onto the real, existing `src/types/geometry.ts` types via a type-only import, so the frontend renderer needs zero changes.

**Tech Stack:** TypeScript (strict-ish, matching root `tsconfig.json`), Zod (already a dependency, `^3.25.76`) for schema validation, Vitest (new devDependency) for TDD, Node `environment: 'node'` — no DOM, no React, no network I/O anywhere in this module.

**Reference spec:** [`docs/superpowers/specs/2026-07-15-geometry-kernel-redesign-design.md`](../specs/2026-07-15-geometry-kernel-redesign-design.md) — this plan implements spec §4.1–§4.4 and §4.7 (Construction Plan schema, kernel executor, verifier, deterministic repair, exact-form), plus basic telemetry (§7.1 mục 5, "cơ bản" tier only). §4.5 (solve+narrator), §4.6 (vision→text), and fast-path (§4.0) are explicitly out of scope for Phase 1 (see spec §8, Pha 2/3).

---

## Design deviations from the spec (disclosed)

The spec's §4.1 illustrates `Op` as a single loose union for brevity. While implementing the Zod schema precisely, three refinements were necessary/beneficial and are called out here rather than silently diverging:

1. **`ConstructionOp` vs `AssertOp` are separate types**, not one shared `Op` union — `ops[]` and `asserts[]` have disjoint shapes (one constructs points, the other checks relations), so merging them added a fake shared discriminant with no benefit.
2. **`prism` uses `top: string[]`, `pyramid` uses `apex: string`** (not a single ambiguous `apexOrTop: string | string[]` field) — this makes each op's Zod schema and TypeScript type fully precise with no runtime `typeof` branching.
3. **`base` op's `dims` shape is cross-validated against `shape` via `superRefine`**, and exact vertex-count-per-shape is enforced there too (square/rectangle/rhombus = exactly 4, triangle = exactly 3, reg_polygon = exactly `dims.n`). This matters because in Phase 2 these Plans will sometimes come from an LLM — catching a shape/dims/vertex-count mismatch at the schema boundary (with a precise error) is strictly better than discovering it deep inside `execute.ts` as a confusing NaN.

Also disclosed: `perp_point`'s `to` field only accepts the literal `'plane'` (not `'line'`) in Phase 1 — projecting a point perpendicular to a *line* (as opposed to a plane) essentially never occurs in the "S is the apex, SA ⊥ (ABCD)" family of problems this phase targets, and `foot`'s `onto:'line'` already covers the one real use case (foot of a perpendicular onto an edge). This is enforced at the schema level (not just skipped in `execute.ts`) so an out-of-scope Plan fails fast with a clear message instead of silently doing the wrong thing. Similarly, `intersect` only supports line∩line and line∩plane, not plane∩plane (spec's own §9 risk list defers this along with `section`).

The "degrees-of-freedom / underconstrained" violation kind from spec §4.3 is kept in the `Violation` type (for forward API compatibility with Phase 5's constraint solver) but **no code path produces it in Phase 1** — every Phase-1 construction op (`base`, `prism`, `pyramid`, `point`, `perp_point`, `foot`, `intersect`) fully determines its output point from already-known inputs; there is no "free parameter" op yet, so a DOF violation is structurally unreachable until Phase 5 introduces one. Building unreachable detection logic now would be untestable dead code.

---

## File Structure

```
api/_lib/kernel/
  types.ts                 # Vec3, SymbolTable, ResolvedEntity, Violation, VerifyResult
  vecMath.ts                # Pure vector/plane/line math primitives
  resolve.ts                 # Token -> point/line/plane resolution against a SymbolTable
  ops/
    shapes.ts                 # base-shape builders (square/rectangle/rhombus/reg_polygon/triangle)
    extrude.ts                 # prism/pyramid extrusion
    points.ts                   # derived-point builders (midpoint/centroid/ratio/reflect/perp_point/foot/intersect)
  planSchema.ts               # Zod schema: ConstructionOp, AssertOp, Query, Plan
  execute.ts                    # Interprets ops[] against a SymbolTable
  verify.ts                       # Checks asserts[] + degeneracy pass
  repair.ts                        # Deterministic (non-LLM) repair of small numeric violations
  exactForm.ts                      # float -> textbook exact form (p*sqrt(n)/q)
  trace.ts                            # Minimal structured telemetry collector (no I/O, caller-timestamped)
  toGeometryData.ts                     # SymbolTable -> real src/types/geometry.ts GeometryData
  index.ts                                # Public API: runPlan() + re-exports
  __tests__/
    vecMath.test.ts
    resolve.test.ts
    planSchema.test.ts
    shapes.test.ts
    extrude.test.ts
    points.test.ts
    execute.test.ts
    verify.test.ts
    repair.test.ts
    exactForm.test.ts
    trace.test.ts
    toGeometryData.test.ts
    integration.test.ts        # spec §5 worked example, end to end
vitest.config.ts               # new, root-level
package.json                   # + devDependency vitest, + "test"/"test:watch" scripts
```

No existing file is modified except `package.json` (adding a devDependency + two scripts). Nothing under `src/` or the existing `api/*.js` route handlers changes.

---

### Task 0: Vitest setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest as a devDependency**

Run: `npm install -D vitest`

Expected: `package.json`'s `devDependencies` gains `"vitest": "^<version>"`, `node_modules/vitest` exists, no changes to `dependencies`.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

(Keep existing `dev`/`build`/`lint`/`preview` scripts unchanged.)

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['api/_lib/kernel/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Verify the runner works with zero tests**

Run: `npm test`

Expected: Vitest starts, reports "No test files found" (or exits 0) — confirms config/glob is valid before any kernel code exists.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for geometry kernel TDD"
```

---

### Task 1: `types.ts` + `vecMath.ts`

**Files:**
- Create: `api/_lib/kernel/types.ts`
- Create: `api/_lib/kernel/vecMath.ts`
- Test: `api/_lib/kernel/__tests__/vecMath.test.ts`

- [ ] **Step 1: Write `types.ts`** (no tests needed — pure type declarations)

```typescript
export type Vec3 = { x: number; y: number; z: number };

export type SymbolTable = {
  points: Map<string, Vec3>;
  namedPlanes: Map<string, string[]>;
  edges: Set<string>; // canonical "A|B" key, A < B lexicographically
};

export type ResolvedEntity =
  | { type: 'point'; name: string; pos: Vec3 }
  | { type: 'line'; a: string; b: string; posA: Vec3; posB: Vec3 }
  | { type: 'plane'; points: string[]; positions: Vec3[] };

export type Violation = {
  kind: 'assert_failed' | 'degenerate' | 'underconstrained';
  relation?: string;
  args?: string[];
  expected?: number;
  actual?: number;
  message: string;
};

export type VerifyResult = {
  ok: boolean;
  violations: Violation[];
};
```

- [ ] **Step 2: Write the failing test for `vecMath.ts`**

```typescript
// api/_lib/kernel/__tests__/vecMath.test.ts
import { describe, it, expect } from 'vitest';
import {
  vec3, add, sub, scale, dot, cross, length, normalize, lerp,
  centroidOf, distance, planeNormal, distancePointToPlane,
  projectPointOntoPlane, distancePointToLine, projectPointOntoLine,
  angleBetween, scalarTriple, areCollinear, arePointsCoplanar,
  tetrahedronVolume, EPS,
} from '../vecMath';

describe('basic vector ops', () => {
  it('add/sub/scale/dot/cross/length are correct', () => {
    const a = vec3(1, 2, 3);
    const b = vec3(4, 5, 6);
    expect(add(a, b)).toEqual({ x: 5, y: 7, z: 9 });
    expect(sub(b, a)).toEqual({ x: 3, y: 3, z: 3 });
    expect(scale(a, 2)).toEqual({ x: 2, y: 4, z: 6 });
    expect(dot(a, b)).toBe(32);
    expect(cross(a, b)).toEqual({ x: -3, y: 6, z: -3 });
    expect(length(vec3(3, 4, 0))).toBeCloseTo(5, 10);
  });

  it('normalize throws on zero vector, otherwise returns unit length', () => {
    expect(() => normalize(vec3(0, 0, 0))).toThrow();
    const n = normalize(vec3(3, 4, 0));
    expect(length(n)).toBeCloseTo(1, 10);
    expect(n).toEqual({ x: 0.6, y: 0.8, z: 0 });
  });

  it('lerp interpolates linearly, centroidOf averages', () => {
    expect(lerp(vec3(0, 0, 0), vec3(10, 0, 0), 0.5)).toEqual({ x: 5, y: 0, z: 0 });
    expect(centroidOf([vec3(0, 0, 0), vec3(6, 0, 0), vec3(0, 6, 0)])).toEqual({ x: 2, y: 2, z: 0 });
    expect(() => centroidOf([])).toThrow();
  });

  it('distance is Euclidean', () => {
    expect(distance(vec3(0, 0, 0), vec3(3, 4, 0))).toBeCloseTo(5, 10);
  });
});

describe('plane geometry — hand-verified against plane x+y+z=3 through (3,0,0),(0,3,0),(0,0,3)', () => {
  const p1 = vec3(3, 0, 0);
  const p2 = vec3(0, 3, 0);
  const p3 = vec3(0, 0, 3);

  it('planeNormal returns the unit normal (1,1,1)/sqrt(3), oriented toward +z', () => {
    const n = planeNormal(p1, p2, p3);
    const expected = 1 / Math.sqrt(3);
    expect(n.x).toBeCloseTo(expected, 10);
    expect(n.y).toBeCloseTo(expected, 10);
    expect(n.z).toBeCloseTo(expected, 10);
  });

  it('distancePointToPlane(origin, this plane) = sqrt(3) (hand-verified: |0+0+0-3|/sqrt(3))', () => {
    const n = planeNormal(p1, p2, p3);
    expect(distancePointToPlane(vec3(0, 0, 0), p1, n)).toBeCloseTo(Math.sqrt(3), 8);
  });

  it('projectPointOntoPlane(origin) lands on the plane (x+y+z=3) and is closer than the origin', () => {
    const n = planeNormal(p1, p2, p3);
    const proj = projectPointOntoPlane(vec3(0, 0, 0), p1, n);
    expect(proj.x + proj.y + proj.z).toBeCloseTo(3, 8);
    expect(distancePointToPlane(proj, p1, n)).toBeCloseTo(0, 8);
  });

  it('throws when the three points are collinear', () => {
    expect(() => planeNormal(vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0))).toThrow();
  });
});

describe('line geometry', () => {
  it('distancePointToLine: point (0,5,0) to the x-axis is 5', () => {
    expect(distancePointToLine(vec3(0, 5, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toBeCloseTo(5, 10);
  });

  it('projectPointOntoLine: (3,5,0) onto the x-axis is (3,0,0)', () => {
    const proj = projectPointOntoLine(vec3(3, 5, 0), vec3(0, 0, 0), vec3(1, 0, 0));
    expect(proj.x).toBeCloseTo(3, 10);
    expect(proj.y).toBeCloseTo(0, 10);
    expect(proj.z).toBeCloseTo(0, 10);
  });
});

describe('angleBetween', () => {
  it('perpendicular vectors -> 90 degrees', () => {
    expect(angleBetween(vec3(1, 0, 0), vec3(0, 1, 0))).toBeCloseTo(90, 8);
  });
  it('parallel same-direction vectors -> 0 degrees', () => {
    expect(angleBetween(vec3(2, 0, 0), vec3(5, 0, 0))).toBeCloseTo(0, 8);
  });
  it('opposite vectors -> 180 degrees', () => {
    expect(angleBetween(vec3(1, 0, 0), vec3(-3, 0, 0))).toBeCloseTo(180, 8);
  });
});

describe('degeneracy helpers', () => {
  it('areCollinear detects collinear triples and rejects a real triangle', () => {
    expect(areCollinear(vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0))).toBe(true);
    expect(areCollinear(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0))).toBe(false);
  });

  it('arePointsCoplanar: 4 points on x+y+z=3 are coplanar; a 5th off-plane point is not', () => {
    const onPlane = [vec3(3, 0, 0), vec3(0, 3, 0), vec3(0, 0, 3), vec3(1, 1, 1)];
    expect(arePointsCoplanar(onPlane)).toBe(true);
    expect(arePointsCoplanar([...onPlane, vec3(0, 0, 0)])).toBe(false);
  });

  it('tetrahedronVolume: unit right-tetrahedron at origin has volume 1/6', () => {
    const v = tetrahedronVolume(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1));
    expect(v).toBeCloseTo(1 / 6, 10);
  });

  it('scalarTriple is zero for coplanar vectors', () => {
    expect(scalarTriple(vec3(1, 0, 0), vec3(0, 1, 0), vec3(1, 1, 0))).toBeCloseTo(0, 10);
  });
});

describe('EPS', () => {
  it('is a small positive tolerance', () => {
    expect(EPS).toBeGreaterThan(0);
    expect(EPS).toBeLessThan(1e-3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/vecMath.test.ts`
Expected: FAIL — `Cannot find module '../vecMath'` (module doesn't exist yet).

- [ ] **Step 4: Write `vecMath.ts`**

```typescript
export type Vec3 = { x: number; y: number; z: number };

export const EPS = 1e-6;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (len < EPS) throw new Error('Cannot normalize a zero-length vector');
  return scale(a, 1 / len);
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return add(a, scale(sub(b, a), t));
}

export function centroidOf(points: Vec3[]): Vec3 {
  if (points.length === 0) throw new Error('Cannot compute centroid of an empty point list');
  const sum = points.reduce((acc, p) => add(acc, p), vec3(0, 0, 0));
  return scale(sum, 1 / points.length);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

/**
 * Unit normal of the plane through p1,p2,p3, flipped toward +z when the
 * plane isn't (near-)vertical. This disambiguates "which side" for
 * perp_point on the common z=0 base-plane case; for planes where z ~ 0
 * (vertical planes) the sign is not semantically meaningful anyway, since
 * dot-product-based perp/parallel checks are sign-invariant.
 */
export function planeNormal(p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {
  const n = cross(sub(p2, p1), sub(p3, p1));
  const len = length(n);
  if (len < EPS) throw new Error('Cannot compute a plane normal: the three points are collinear');
  let unit = scale(n, 1 / len);
  if (unit.z < -EPS) unit = scale(unit, -1);
  return unit;
}

export function distancePointToPlane(p: Vec3, planePoint: Vec3, normal: Vec3): number {
  return Math.abs(dot(sub(p, planePoint), normal));
}

export function projectPointOntoPlane(p: Vec3, planePoint: Vec3, normal: Vec3): Vec3 {
  const d = dot(sub(p, planePoint), normal);
  return sub(p, scale(normal, d));
}

export function distancePointToLine(p: Vec3, a: Vec3, b: Vec3): number {
  const d = normalize(sub(b, a));
  const ap = sub(p, a);
  const proj = scale(d, dot(ap, d));
  return length(sub(ap, proj));
}

export function projectPointOntoLine(p: Vec3, a: Vec3, b: Vec3): Vec3 {
  const d = normalize(sub(b, a));
  const t = dot(sub(p, a), d);
  return add(a, scale(d, t));
}

/** Angle in degrees between two vectors, result in [0,180]. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const cosT = dot(a, b) / (length(a) * length(b));
  const clamped = Math.max(-1, Math.min(1, cosT));
  return (Math.acos(clamped) * 180) / Math.PI;
}

export function scalarTriple(a: Vec3, b: Vec3, c: Vec3): number {
  return dot(a, cross(b, c));
}

export function areCollinear(a: Vec3, b: Vec3, c: Vec3, eps = EPS): boolean {
  return length(cross(sub(b, a), sub(c, a))) < eps;
}

export function arePointsCoplanar(points: Vec3[], eps = EPS): boolean {
  if (points.length <= 3) return true;
  const [p0, p1, p2] = points;
  let normal: Vec3;
  try {
    normal = planeNormal(p0, p1, p2);
  } catch {
    return false;
  }
  return points.slice(3).every((p) => distancePointToPlane(p, p0, normal) < eps);
}

export function tetrahedronVolume(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  return Math.abs(scalarTriple(sub(b, a), sub(c, a), sub(d, a))) / 6;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/vecMath.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/types.ts api/_lib/kernel/vecMath.ts api/_lib/kernel/__tests__/vecMath.test.ts
git commit -m "feat(kernel): add core types and pure vector/plane/line math"
```

---

### Task 2: `resolve.ts`

**Files:**
- Create: `api/_lib/kernel/resolve.ts`
- Test: `api/_lib/kernel/__tests__/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/resolve.test.ts
import { describe, it, expect } from 'vitest';
import { resolveEntity } from '../resolve';
import type { SymbolTable } from '../types';
import { vec3 } from '../vecMath';

function makeSymtab(): SymbolTable {
  const points = new Map([
    ['A', vec3(0, 0, 0)],
    ['B', vec3(1, 0, 0)],
    ['C', vec3(1, 1, 0)],
    ['D', vec3(0, 1, 0)],
    ["A'", vec3(0, 0, 2)],
    ["B'", vec3(1, 0, 2)],
    ["C'", vec3(1, 1, 2)],
    ['S', vec3(0, 0, 3)],
  ]);
  const namedPlanes = new Map([['ABCD', ['A', 'B', 'C', 'D']]]);
  return { points, namedPlanes, edges: new Set() };
}

describe('resolveEntity', () => {
  it('resolves a single known point name', () => {
    const st = makeSymtab();
    const r = resolveEntity('A', st);
    expect(r).toEqual({ type: 'point', name: 'A', pos: vec3(0, 0, 0) });
  });

  it('resolves a two-letter compound token as a line', () => {
    const st = makeSymtab();
    const r = resolveEntity('SA', st);
    expect(r.type).toBe('line');
    if (r.type === 'line') {
      expect(r.a).toBe('S');
      expect(r.b).toBe('A');
      expect(r.posA).toEqual(vec3(0, 0, 3));
      expect(r.posB).toEqual(vec3(0, 0, 0));
    }
  });

  it('resolves a 3+ letter compound token as a plane (positions in token order)', () => {
    const st = makeSymtab();
    const r = resolveEntity('ABC', st);
    expect(r.type).toBe('plane');
    if (r.type === 'plane') {
      expect(r.points).toEqual(['A', 'B', 'C']);
      expect(r.positions).toEqual([vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0)]);
    }
  });

  it('resolves a parenthesized token, e.g. "(ABCD)", to the registered named plane', () => {
    const st = makeSymtab();
    const r = resolveEntity('(ABCD)', st);
    expect(r.type).toBe('plane');
    if (r.type === 'plane') {
      expect(r.points).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('greedily tokenizes compound names containing primed points, e.g. "A\'B\'"', () => {
    const st = makeSymtab();
    const r = resolveEntity("A'B'", st);
    expect(r.type).toBe('line');
    if (r.type === 'line') {
      expect(r.a).toBe("A'");
      expect(r.b).toBe("B'");
    }
  });

  it('throws a clear error for an unresolvable token', () => {
    const st = makeSymtab();
    expect(() => resolveEntity('XYZ', st)).toThrow(/Cannot resolve entity "XYZ"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/resolve.test.ts`
Expected: FAIL — `Cannot find module '../resolve'`.

- [ ] **Step 3: Write `resolve.ts`**

```typescript
import type { SymbolTable, ResolvedEntity, Vec3 } from './types';

const PAREN_RE = /^\((.+)\)$/;

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

function requirePoint(symtab: SymbolTable, name: string): Vec3 {
  const p = symtab.points.get(name);
  if (!p) throw new Error(`Unknown point "${name}"`);
  return p;
}

export function resolveEntity(token: string, symtab: SymbolTable): ResolvedEntity {
  const parenMatch = token.match(PAREN_RE);
  const inner = parenMatch ? parenMatch[1] : token;

  if (symtab.points.has(inner)) {
    return { type: 'point', name: inner, pos: requirePoint(symtab, inner) };
  }

  if (symtab.namedPlanes.has(inner)) {
    const names = symtab.namedPlanes.get(inner)!;
    return { type: 'plane', points: names, positions: names.map((n) => requirePoint(symtab, n)) };
  }

  const known = new Set(symtab.points.keys());
  const tokens = tokenizePointNames(inner, known);
  if (!tokens) {
    throw new Error(
      `Cannot resolve entity "${token}": it is not a known point, a registered named plane, or a compound of known point names`
    );
  }
  if (tokens.length === 1) {
    return { type: 'point', name: tokens[0], pos: requirePoint(symtab, tokens[0]) };
  }
  if (tokens.length === 2) {
    return {
      type: 'line',
      a: tokens[0],
      b: tokens[1],
      posA: requirePoint(symtab, tokens[0]),
      posB: requirePoint(symtab, tokens[1]),
    };
  }
  return { type: 'plane', points: tokens, positions: tokens.map((n) => requirePoint(symtab, n)) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/resolve.ts api/_lib/kernel/__tests__/resolve.test.ts
git commit -m "feat(kernel): add entity token resolver (point/line/plane)"
```

---

### Task 3: `ops/shapes.ts`

**Files:**
- Create: `api/_lib/kernel/ops/shapes.ts`
- Test: `api/_lib/kernel/__tests__/shapes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/shapes.test.ts
import { describe, it, expect } from 'vitest';
import { buildSquare, buildRectangle, buildRhombus, buildRegPolygon, buildTriangle } from '../ops/shapes';
import { distance } from '../vecMath';

describe('buildSquare', () => {
  it('produces 4 coplanar (z=0) vertices with the given edge length, centered at origin', () => {
    const pts = buildSquare(2);
    expect(pts).toHaveLength(4);
    pts.forEach((p) => expect(p.z).toBe(0));
    expect(distance(pts[0], pts[1])).toBeCloseTo(2, 10);
    expect(distance(pts[1], pts[2])).toBeCloseTo(2, 10);
    const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
    const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
    expect(cx).toBeCloseTo(0, 10);
    expect(cy).toBeCloseTo(0, 10);
  });
});

describe('buildRectangle', () => {
  it('produces 4 vertices with the given width/height', () => {
    const pts = buildRectangle(4, 2);
    expect(distance(pts[0], pts[1])).toBeCloseTo(4, 10);
    expect(distance(pts[1], pts[2])).toBeCloseTo(2, 10);
  });
});

describe('buildRhombus', () => {
  it('produces 4 vertices whose diagonals match diag1/diag2 and all sides equal', () => {
    const pts = buildRhombus(6, 8);
    // diag1 spans pts[0]-pts[2], diag2 spans pts[1]-pts[3]
    expect(distance(pts[0], pts[2])).toBeCloseTo(6, 10);
    expect(distance(pts[1], pts[3])).toBeCloseTo(8, 10);
    const side = distance(pts[0], pts[1]);
    expect(distance(pts[1], pts[2])).toBeCloseTo(side, 10);
    expect(distance(pts[2], pts[3])).toBeCloseTo(side, 10);
    expect(distance(pts[3], pts[0])).toBeCloseTo(side, 10);
    expect(side).toBeCloseTo(5, 10); // 3-4-5 right triangle halves
  });
});

describe('buildRegPolygon', () => {
  it('produces n vertices with the given edge length, equidistant from centroid', () => {
    const pts = buildRegPolygon(6, 3);
    expect(pts).toHaveLength(6);
    expect(distance(pts[0], pts[1])).toBeCloseTo(3, 8);
    const R = distance(pts[0], { x: 0, y: 0, z: 0 });
    pts.forEach((p) => expect(distance(p, { x: 0, y: 0, z: 0 })).toBeCloseTo(R, 8));
  });

  it('throws for n < 3', () => {
    expect(() => buildRegPolygon(2, 1)).toThrow();
  });
});

describe('buildTriangle', () => {
  it('equilateral: all 3 sides equal the given edge', () => {
    const pts = buildTriangle({ triangleType: 'equilateral', edge: 4 });
    expect(distance(pts[0], pts[1])).toBeCloseTo(4, 8);
    expect(distance(pts[1], pts[2])).toBeCloseTo(4, 8);
    expect(distance(pts[2], pts[0])).toBeCloseTo(4, 8);
  });

  it('right: legs meet at pts[0] with a true 90 degree angle', () => {
    const pts = buildTriangle({ triangleType: 'right', leg1: 3, leg2: 4 });
    expect(distance(pts[0], pts[1])).toBeCloseTo(3, 8);
    expect(distance(pts[0], pts[2])).toBeCloseTo(4, 8);
    expect(distance(pts[1], pts[2])).toBeCloseTo(5, 8); // 3-4-5 hypotenuse
  });

  it('isosceles: two legs equal legLength, base equals base', () => {
    const pts = buildTriangle({ triangleType: 'isosceles', base: 6, legLength: 5 });
    expect(distance(pts[1], pts[2])).toBeCloseTo(6, 8); // base
    expect(distance(pts[0], pts[1])).toBeCloseTo(5, 8);
    expect(distance(pts[0], pts[2])).toBeCloseTo(5, 8);
  });

  it('isosceles: throws when legLength is too short for the base', () => {
    expect(() => buildTriangle({ triangleType: 'isosceles', base: 10, legLength: 2 })).toThrow();
  });

  it('sss: reproduces all three given side lengths exactly', () => {
    const pts = buildTriangle({ triangleType: 'sss', p1p2: 5, p1p3: 6, p2p3: 7 });
    expect(distance(pts[0], pts[1])).toBeCloseTo(5, 8);
    expect(distance(pts[0], pts[2])).toBeCloseTo(6, 8);
    expect(distance(pts[1], pts[2])).toBeCloseTo(7, 8);
  });

  it('sss: throws on triangle-inequality violation', () => {
    expect(() => buildTriangle({ triangleType: 'sss', p1p2: 1, p1p3: 1, p2p3: 10 })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/shapes.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `ops/shapes.ts`**

```typescript
import { type Vec3, vec3 } from '../vecMath';

export type TriangleDims =
  | { triangleType: 'equilateral'; edge: number }
  | { triangleType: 'right'; leg1: number; leg2: number }
  | { triangleType: 'isosceles'; base: number; legLength: number }
  | { triangleType: 'sss'; p1p2: number; p1p3: number; p2p3: number };

export function buildSquare(edge: number): Vec3[] {
  const h = edge / 2;
  return [vec3(-h, -h, 0), vec3(h, -h, 0), vec3(h, h, 0), vec3(-h, h, 0)];
}

export function buildRectangle(width: number, height: number): Vec3[] {
  const hw = width / 2;
  const hh = height / 2;
  return [vec3(-hw, -hh, 0), vec3(hw, -hh, 0), vec3(hw, hh, 0), vec3(-hw, hh, 0)];
}

export function buildRhombus(diag1: number, diag2: number): Vec3[] {
  const h1 = diag1 / 2;
  const h2 = diag2 / 2;
  return [vec3(-h1, 0, 0), vec3(0, -h2, 0), vec3(h1, 0, 0), vec3(0, h2, 0)];
}

export function buildRegPolygon(n: number, edge: number): Vec3[] {
  if (n < 3) throw new Error(`reg_polygon requires n >= 3, got ${n}`);
  const R = edge / (2 * Math.sin(Math.PI / n));
  const pts: Vec3[] = [];
  for (let k = 0; k < n; k++) {
    const theta = (2 * Math.PI * k) / n;
    pts.push(vec3(R * Math.cos(theta), R * Math.sin(theta), 0));
  }
  return pts;
}

export function buildTriangle(dims: TriangleDims): Vec3[] {
  switch (dims.triangleType) {
    case 'equilateral': {
      const a = dims.edge;
      return [vec3(0, (a * Math.sqrt(3)) / 2, 0), vec3(-a / 2, 0, 0), vec3(a / 2, 0, 0)];
    }
    case 'right': {
      const { leg1, leg2 } = dims;
      return [vec3(0, 0, 0), vec3(leg1, 0, 0), vec3(0, leg2, 0)];
    }
    case 'isosceles': {
      const { base, legLength } = dims;
      const half = base / 2;
      const hSq = legLength * legLength - half * half;
      if (hSq <= 0) {
        throw new Error(`Invalid isosceles triangle: legLength (${legLength}) too short for base (${base})`);
      }
      const h = Math.sqrt(hSq);
      return [vec3(0, h, 0), vec3(-half, 0, 0), vec3(half, 0, 0)];
    }
    case 'sss': {
      const { p1p2, p1p3, p2p3 } = dims;
      if (p1p2 + p1p3 <= p2p3 || p1p2 + p2p3 <= p1p3 || p1p3 + p2p3 <= p1p2) {
        throw new Error(`Invalid triangle sides (${p1p2}, ${p1p3}, ${p2p3}): violate the triangle inequality`);
      }
      const p1 = vec3(0, 0, 0);
      const p2 = vec3(p1p2, 0, 0);
      const cosAngle = (p1p2 * p1p2 + p1p3 * p1p3 - p2p3 * p2p3) / (2 * p1p2 * p1p3);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      const p3 = vec3(p1p3 * Math.cos(angle), p1p3 * Math.sin(angle), 0);
      return [p1, p2, p3];
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/shapes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/ops/shapes.ts api/_lib/kernel/__tests__/shapes.test.ts
git commit -m "feat(kernel): add base-shape builders (square/rectangle/rhombus/reg_polygon/triangle)"
```

---

### Task 4: `ops/extrude.ts`

**Files:**
- Create: `api/_lib/kernel/ops/extrude.ts`
- Test: `api/_lib/kernel/__tests__/extrude.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/extrude.test.ts
import { describe, it, expect } from 'vitest';
import { extrudePrism, extrudePyramidApex } from '../ops/extrude';
import { buildSquare } from '../ops/shapes';

describe('extrudePrism', () => {
  it('translates every base vertex by height along +z, preserving x/y', () => {
    const base = buildSquare(2);
    const top = extrudePrism(base, 5);
    top.forEach((p, i) => {
      expect(p.x).toBeCloseTo(base[i].x, 10);
      expect(p.y).toBeCloseTo(base[i].y, 10);
      expect(p.z).toBeCloseTo(5, 10);
    });
  });
});

describe('extrudePyramidApex', () => {
  it('places the apex directly above the centroid of the base, at the given height', () => {
    const base = buildSquare(2); // centroid (0,0,0)
    const apex = extrudePyramidApex(base, 3);
    expect(apex.x).toBeCloseTo(0, 10);
    expect(apex.y).toBeCloseTo(0, 10);
    expect(apex.z).toBeCloseTo(3, 10);
  });

  it('follows an off-center base centroid too (e.g. a translated triangle)', () => {
    const base = [
      { x: 1, y: 1, z: 0 },
      { x: 4, y: 1, z: 0 },
      { x: 1, y: 5, z: 0 },
    ];
    const apex = extrudePyramidApex(base, 2);
    expect(apex.x).toBeCloseTo(2, 10); // (1+4+1)/3
    expect(apex.y).toBeCloseTo(7 / 3, 10); // (1+1+5)/3
    expect(apex.z).toBeCloseTo(2, 10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/extrude.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `ops/extrude.ts`**

```typescript
import { type Vec3, vec3, centroidOf, add } from '../vecMath';

export function extrudePrism(basePositions: Vec3[], height: number): Vec3[] {
  return basePositions.map((p) => add(p, vec3(0, 0, height)));
}

/** Apex directly above the base centroid — only valid for regular ("chóp đều") pyramids. */
export function extrudePyramidApex(basePositions: Vec3[], height: number): Vec3 {
  const c = centroidOf(basePositions);
  return vec3(c.x, c.y, height);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/extrude.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/ops/extrude.ts api/_lib/kernel/__tests__/extrude.test.ts
git commit -m "feat(kernel): add prism/pyramid extrusion ops"
```

---

### Task 5: `ops/points.ts`

**Files:**
- Create: `api/_lib/kernel/ops/points.ts`
- Test: `api/_lib/kernel/__tests__/points.test.ts`

**Note:** This is where the `pyramid`-vs-`perp_point` distinction matters most — `perpPointFromPlane` is how "SA ⊥ (ABCD)" (apex above a *specific vertex*, not the centroid) gets built.

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/points.test.ts
import { describe, it, expect } from 'vitest';
import {
  midpoint, centroidPoint, ratioPoint, reflectPoint,
  perpPointFromPlane, footOnPlane, footOnLine,
  intersectLineLine, intersectLinePlane,
} from '../ops/points';
import { vec3, distance } from '../vecMath';

describe('midpoint / centroidPoint / ratioPoint / reflectPoint', () => {
  it('midpoint is the average of two points', () => {
    expect(midpoint(vec3(0, 0, 0), vec3(4, 6, 8))).toEqual(vec3(2, 3, 4));
  });

  it('centroidPoint averages any number of points', () => {
    expect(centroidPoint([vec3(0, 0, 0), vec3(3, 0, 0), vec3(0, 3, 0)])).toEqual(vec3(1, 1, 0));
  });

  it('ratioPoint(from, to, t) divides the segment at parameter t', () => {
    expect(ratioPoint(vec3(0, 0, 0), vec3(10, 0, 0), 0.25)).toEqual(vec3(2.5, 0, 0));
    expect(ratioPoint(vec3(0, 0, 0), vec3(10, 0, 0), 0)).toEqual(vec3(0, 0, 0));
    expect(ratioPoint(vec3(0, 0, 0), vec3(10, 0, 0), 1)).toEqual(vec3(10, 0, 0));
  });

  it('reflectPoint mirrors a point through a center', () => {
    expect(reflectPoint(vec3(1, 1, 1), vec3(0, 0, 0))).toEqual(vec3(-1, -1, -1));
    expect(reflectPoint(vec3(0, 0, 0), vec3(2, 3, 4))).toEqual(vec3(4, 6, 8));
  });
});

describe('perpPointFromPlane — the S.ABCD "SA perp base" case', () => {
  it('places the new point directly above `from`, at `length` along the plane normal', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)]; // z=0 base plane
    const S = perpPointFromPlane(vec3(0, 0, 0), base, Math.sqrt(2));
    expect(S.x).toBeCloseTo(0, 10);
    expect(S.y).toBeCloseTo(0, 10);
    expect(S.z).toBeCloseTo(Math.sqrt(2), 10);
    expect(distance(S, vec3(0, 0, 0))).toBeCloseTo(Math.sqrt(2), 10);
  });
});

describe('footOnPlane / footOnLine', () => {
  it('footOnPlane projects a point straight onto the z=0 base plane', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)];
    const foot = footOnPlane(vec3(0.5, 0.5, 3), base);
    expect(foot).toEqual(vec3(0.5, 0.5, 0));
  });

  it('footOnLine projects a point onto a line segment', () => {
    const foot = footOnLine(vec3(3, 5, 0), vec3(0, 0, 0), vec3(1, 0, 0));
    expect(foot.x).toBeCloseTo(3, 10);
    expect(foot.y).toBeCloseTo(0, 10);
  });
});

describe('intersectLineLine', () => {
  it('finds the intersection of two coplanar, non-parallel lines', () => {
    const p = intersectLineLine(vec3(0, 0, 0), vec3(4, 4, 0), vec3(0, 4, 0), vec3(4, 0, 0));
    expect(p.x).toBeCloseTo(2, 8);
    expect(p.y).toBeCloseTo(2, 8);
  });

  it('throws for parallel lines', () => {
    expect(() =>
      intersectLineLine(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(1, 1, 0))
    ).toThrow();
  });

  it('throws for skew (non-coplanar) lines', () => {
    expect(() =>
      intersectLineLine(vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 1), vec3(1, 1, 1))
    ).toThrow();
  });
});

describe('intersectLinePlane', () => {
  it('finds where a line crosses the z=0 plane', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)];
    const p = intersectLinePlane(vec3(0, 0, 5), vec3(2, 2, -5), base);
    expect(p.z).toBeCloseTo(0, 8);
    expect(p.x).toBeCloseTo(1, 8);
    expect(p.y).toBeCloseTo(1, 8);
  });

  it('throws when the line is parallel to the plane', () => {
    const base = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)];
    expect(() => intersectLinePlane(vec3(0, 0, 5), vec3(1, 1, 5), base)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/points.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `ops/points.ts`**

```typescript
import {
  type Vec3, add, sub, scale, dot, cross, length, planeNormal,
  projectPointOntoPlane, projectPointOntoLine, EPS,
} from '../vecMath';

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

export function centroidPoint(points: Vec3[]): Vec3 {
  const sum = points.reduce((acc, p) => add(acc, p), { x: 0, y: 0, z: 0 });
  return scale(sum, 1 / points.length);
}

export function ratioPoint(from: Vec3, to: Vec3, t: number): Vec3 {
  return add(from, scale(sub(to, from), t));
}

export function reflectPoint(point: Vec3, about: Vec3): Vec3 {
  return sub(scale(about, 2), point);
}

/** perp_point: the new point is `fromPos` moved `length` along the normal of `planePositions`. */
export function perpPointFromPlane(fromPos: Vec3, planePositions: Vec3[], length_: number): Vec3 {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  return add(fromPos, scale(n, length_));
}

export function footOnPlane(fromPos: Vec3, planePositions: Vec3[]): Vec3 {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  return projectPointOntoPlane(fromPos, p1, n);
}

export function footOnLine(fromPos: Vec3, a: Vec3, b: Vec3): Vec3 {
  return projectPointOntoLine(fromPos, a, b);
}

export function intersectLineLine(a1: Vec3, a2: Vec3, b1: Vec3, b2: Vec3): Vec3 {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const r = sub(b1, a1);
  const cross12 = cross(d1, d2);
  const denom = dot(cross12, cross12);
  if (denom < EPS) {
    throw new Error('Lines are parallel; no unique intersection point exists');
  }
  const scaleRef = Math.max(1, length(d1), length(d2), length(r));
  if (Math.abs(dot(r, cross12)) > EPS * scaleRef) {
    throw new Error('Lines are skew (not coplanar); no intersection point exists');
  }
  const t = dot(cross(r, d2), cross12) / denom;
  return add(a1, scale(d1, t));
}

export function intersectLinePlane(a: Vec3, b: Vec3, planePositions: Vec3[]): Vec3 {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  const d = sub(b, a);
  const denom = dot(n, d);
  if (Math.abs(denom) < EPS) {
    throw new Error('Line is parallel to the plane; no unique intersection point exists');
  }
  const t = dot(n, sub(p1, a)) / denom;
  return add(a, scale(d, t));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/points.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/ops/points.ts api/_lib/kernel/__tests__/points.test.ts
git commit -m "feat(kernel): add derived-point ops (midpoint/centroid/ratio/reflect/perp/foot/intersect)"
```

---

### Task 6: `planSchema.ts`

**Files:**
- Create: `api/_lib/kernel/planSchema.ts`
- Test: `api/_lib/kernel/__tests__/planSchema.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/planSchema.test.ts
import { describe, it, expect } from 'vitest';
import { PlanSchema } from '../planSchema';

const validSABCDPlan = {
  solidName: 'S.ABCD',
  ops: [
    { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
    { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: Math.sqrt(2) },
  ],
  asserts: [
    { relation: 'perp', args: ['SA', 'ABCD'] },
    { relation: 'dist', args: ['S', 'A'], value: Math.sqrt(2) },
  ],
};

describe('PlanSchema — valid plans', () => {
  it('accepts a well-formed S.ABCD plan', () => {
    const result = PlanSchema.safeParse(validSABCDPlan);
    expect(result.success).toBe(true);
  });

  it('accepts a plan with no asserts and no query (both optional/defaulted)', () => {
    const result = PlanSchema.safeParse({
      solidName: 'minimal',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.asserts).toEqual([]);
  });

  it('accepts a prism op with `top` and a pyramid op with `apex`', () => {
    const result = PlanSchema.safeParse({
      solidName: 'prism-and-pyramid',
      ops: [
        { op: 'base', shape: 'triangle', vertices: ['A', 'B', 'C'], dims: { triangleType: 'equilateral', edge: 2 } },
        { op: 'prism', base: ['A', 'B', 'C'], top: ["A'", "B'", "C'"], height: 3 },
        { op: 'pyramid', base: ['A', 'B', 'C'], apex: 'S', height: 4 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('PlanSchema — rejects malformed input with clear errors', () => {
  it('rejects a square base with the wrong vertex count', () => {
    const result = PlanSchema.safeParse({
      solidName: 'bad',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C'], dims: { edge: 1 } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects dims that do not match the declared shape', () => {
    const result = PlanSchema.safeParse({
      solidName: 'bad',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { diag1: 1, diag2: 2 } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a point name that is not a valid label', () => {
    const result = PlanSchema.safeParse({
      solidName: 'bad',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'notaname'], dims: { edge: 1 } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects perp_point with to:"line" (out of scope for Phase 1)', () => {
    const result = PlanSchema.safeParse({
      solidName: 'bad',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
        { op: 'perp_point', name: 'S', from: 'A', to: 'line', target: 'BC', length: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a perp/dist/angle assert with the wrong arg count', () => {
    const result = PlanSchema.safeParse({
      solidName: 'bad',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } }],
      asserts: [{ relation: 'perp', args: ['AB'] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a dist/angle assert missing "value"', () => {
    const result = PlanSchema.safeParse({
      solidName: 'bad',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } }],
      asserts: [{ relation: 'dist', args: ['A', 'B'] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a coplanar assert with fewer than 4 args', () => {
    const result = PlanSchema.safeParse({
      solidName: 'bad',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } }],
      asserts: [{ relation: 'coplanar', args: ['A', 'B', 'C'] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty ops array', () => {
    const result = PlanSchema.safeParse({ solidName: 'bad', ops: [] });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/planSchema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `planSchema.ts`**

```typescript
import { z } from 'zod';

const PointName = z
  .string()
  .regex(/^[A-Z]\d*'?$/, "Point names must be an uppercase letter, optional digits, optional trailing prime, e.g. \"A\", \"A1\", \"A'\"");

export const TriangleDimsSchema = z.discriminatedUnion('triangleType', [
  z.object({ triangleType: z.literal('equilateral'), edge: z.number().positive() }),
  z.object({ triangleType: z.literal('right'), leg1: z.number().positive(), leg2: z.number().positive() }),
  z.object({ triangleType: z.literal('isosceles'), base: z.number().positive(), legLength: z.number().positive() }),
  z.object({
    triangleType: z.literal('sss'),
    p1p2: z.number().positive(),
    p1p3: z.number().positive(),
    p2p3: z.number().positive(),
  }),
]);

const SquareDims = z.object({ edge: z.number().positive() });
const RectangleDims = z.object({ width: z.number().positive(), height: z.number().positive() });
const RhombusDims = z.object({ diag1: z.number().positive(), diag2: z.number().positive() });
const RegPolygonDims = z.object({ n: z.number().int().min(3), edge: z.number().positive() });

export const BaseOpSchema = z
  .object({
    op: z.literal('base'),
    shape: z.enum(['square', 'rectangle', 'triangle', 'reg_polygon', 'rhombus']),
    vertices: z.array(PointName).min(3),
    dims: z.union([SquareDims, RectangleDims, RhombusDims, RegPolygonDims, TriangleDimsSchema]),
  })
  .superRefine((val, ctx) => {
    const fixedCount: Record<string, number | undefined> = { square: 4, rectangle: 4, rhombus: 4, triangle: 3 };
    const expected = val.shape === 'reg_polygon' ? (val.dims as { n?: number }).n : fixedCount[val.shape];
    if (typeof expected === 'number' && val.vertices.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `shape "${val.shape}" requires exactly ${expected} vertices, got ${val.vertices.length}`,
        path: ['vertices'],
      });
    }
    const has = (key: string) => Object.prototype.hasOwnProperty.call(val.dims, key);
    const shapeMatchesDims: Record<string, boolean> = {
      square: has('edge') && !has('n') && !has('width'),
      rectangle: has('width') && has('height'),
      rhombus: has('diag1') && has('diag2'),
      reg_polygon: has('n') && has('edge'),
      triangle: has('triangleType'),
    };
    if (!shapeMatchesDims[val.shape]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `dims do not match shape "${val.shape}"`, path: ['dims'] });
    }
  });

export const PrismOpSchema = z.object({
  op: z.literal('prism'),
  base: z.array(PointName).min(3),
  top: z.array(PointName).min(3),
  height: z.number().positive(),
});

export const PyramidOpSchema = z.object({
  op: z.literal('pyramid'),
  base: z.array(PointName).min(3),
  apex: PointName,
  height: z.number().positive(),
});

export const PointOpSchema = z.object({
  op: z.literal('point'),
  name: PointName,
  def: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('midpoint'), of: z.tuple([PointName, PointName]) }),
    z.object({ kind: z.literal('centroid'), of: z.array(PointName).min(2) }),
    z.object({ kind: z.literal('ratio'), from: PointName, to: PointName, t: z.number() }),
    z.object({ kind: z.literal('reflect'), point: PointName, about: PointName }),
  ]),
});

export const PerpPointOpSchema = z.object({
  op: z.literal('perp_point'),
  name: PointName,
  from: PointName,
  to: z.literal('plane'),
  target: z.string().min(1),
  length: z.number().positive(),
});

export const FootOpSchema = z.object({
  op: z.literal('foot'),
  name: PointName,
  from: PointName,
  onto: z.enum(['plane', 'line']),
  target: z.string().min(1),
});

export const IntersectOpSchema = z.object({
  op: z.literal('intersect'),
  name: PointName,
  a: z.string().min(1),
  b: z.string().min(1),
});

export const ConstructionOpSchema = z.discriminatedUnion('op', [
  BaseOpSchema,
  PrismOpSchema,
  PyramidOpSchema,
  PointOpSchema,
  PerpPointOpSchema,
  FootOpSchema,
  IntersectOpSchema,
]);

export const AssertOpSchema = z
  .object({
    relation: z.enum(['perp', 'parallel', 'coplanar', 'on', 'dist', 'angle']),
    args: z.array(z.string().min(1)).min(1),
    value: z.number().optional(),
    tolerance: z.number().positive().optional(),
  })
  .superRefine((val, ctx) => {
    const needsExactly2 = ['perp', 'parallel', 'on', 'dist', 'angle'];
    if (needsExactly2.includes(val.relation) && val.args.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `relation "${val.relation}" requires exactly 2 args, got ${val.args.length}`,
        path: ['args'],
      });
    }
    if (val.relation === 'coplanar' && val.args.length < 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'relation "coplanar" requires at least 4 args', path: ['args'] });
    }
    if ((val.relation === 'dist' || val.relation === 'angle') && val.value === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `relation "${val.relation}" requires a "value"`, path: ['value'] });
    }
  });

export const QuerySchema = z.object({
  kind: z.enum(['distance', 'angle', 'volume', 'area']),
  a: z.string().min(1).optional(),
  b: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
});

export const PlanSchema = z.object({
  solidName: z.string().min(1),
  ops: z.array(ConstructionOpSchema).min(1),
  asserts: z.array(AssertOpSchema).default([]),
  query: QuerySchema.optional(),
});

export type ConstructionOp = z.infer<typeof ConstructionOpSchema>;
export type AssertOp = z.infer<typeof AssertOpSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type Plan = z.infer<typeof PlanSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/planSchema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/planSchema.ts api/_lib/kernel/__tests__/planSchema.test.ts
git commit -m "feat(kernel): add Zod Construction Plan schema with cross-field validation"
```

---

### Task 7: `execute.ts`

**Files:**
- Create: `api/_lib/kernel/execute.ts`
- Test: `api/_lib/kernel/__tests__/execute.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/execute.test.ts
import { describe, it, expect } from 'vitest';
import { executePlan, createEmptySymbolTable, executeOp } from '../execute';
import { PlanSchema } from '../planSchema';
import { distance } from '../vecMath';

describe('executePlan — S.ABCD (SA perp base)', () => {
  const plan = PlanSchema.parse({
    solidName: 'S.ABCD',
    ops: [
      { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
      { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: Math.sqrt(2) },
    ],
  });

  it('defines all 5 points', () => {
    const symtab = executePlan(plan);
    expect(symtab.points.size).toBe(5);
    ['A', 'B', 'C', 'D', 'S'].forEach((n) => expect(symtab.points.has(n)).toBe(true));
  });

  it('S sits exactly above A at height sqrt(2)', () => {
    const symtab = executePlan(plan);
    const A = symtab.points.get('A')!;
    const S = symtab.points.get('S')!;
    expect(S.x).toBeCloseTo(A.x, 8);
    expect(S.y).toBeCloseTo(A.y, 8);
    expect(distance(S, A)).toBeCloseTo(Math.sqrt(2), 8);
  });

  it('registers the ABCD base as a named plane with cyclic edges', () => {
    const symtab = executePlan(plan);
    expect(symtab.namedPlanes.get('ABCD')).toEqual(['A', 'B', 'C', 'D']);
    expect(symtab.edges.has('A|B')).toBe(true);
    expect(symtab.edges.has('C|D')).toBe(true);
    expect(symtab.edges.has('A|D')).toBe(true);
  });
});

describe('executePlan — prism registers vertical + top edges', () => {
  const plan = PlanSchema.parse({
    solidName: 'ABC.A1B1C1',
    ops: [
      { op: 'base', shape: 'triangle', vertices: ['A', 'B', 'C'], dims: { triangleType: 'equilateral', edge: 2 } },
      { op: 'prism', base: ['A', 'B', 'C'], top: ['A1', 'B1', 'C1'], height: 5 },
    ],
  });

  it('top vertices sit 5 above their base counterparts', () => {
    const symtab = executePlan(plan);
    const A = symtab.points.get('A')!;
    const A1 = symtab.points.get('A1')!;
    expect(A1.x).toBeCloseTo(A.x, 8);
    expect(A1.y).toBeCloseTo(A.y, 8);
    expect(A1.z).toBeCloseTo(A.z + 5, 8);
  });

  it('registers vertical edges A-A1, B-B1, C-C1 and top-face edges', () => {
    const symtab = executePlan(plan);
    expect(symtab.edges.has('A|A1')).toBe(true);
    expect(symtab.edges.has('B|B1')).toBe(true);
    expect(symtab.edges.has('A1|B1')).toBe(true);
  });
});

describe('executePlan — pyramid apex above centroid, with lateral edges', () => {
  const plan = PlanSchema.parse({
    solidName: 'S.ABC-regular',
    ops: [
      { op: 'base', shape: 'triangle', vertices: ['A', 'B', 'C'], dims: { triangleType: 'equilateral', edge: 3 } },
      { op: 'pyramid', base: ['A', 'B', 'C'], apex: 'S', height: 6 },
    ],
  });

  it('apex sits above the base centroid', () => {
    const symtab = executePlan(plan);
    const [A, B, C] = ['A', 'B', 'C'].map((n) => symtab.points.get(n)!);
    const S = symtab.points.get('S')!;
    expect(S.x).toBeCloseTo((A.x + B.x + C.x) / 3, 8);
    expect(S.y).toBeCloseTo((A.y + B.y + C.y) / 3, 8);
    expect(S.z).toBeCloseTo(6, 8);
  });

  it('registers lateral edges S-A, S-B, S-C', () => {
    const symtab = executePlan(plan);
    expect(symtab.edges.has('A|S')).toBe(true);
    expect(symtab.edges.has('B|S')).toBe(true);
    expect(symtab.edges.has('C|S')).toBe(true);
  });
});

describe('executePlan — derived points and errors', () => {
  it('supports point/midpoint referencing earlier points', () => {
    const plan = PlanSchema.parse({
      solidName: 'midpoint-test',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } },
        { op: 'point', name: 'M', def: { kind: 'midpoint', of: ['A', 'B'] } },
      ],
    });
    const symtab = executePlan(plan);
    const A = symtab.points.get('A')!;
    const B = symtab.points.get('B')!;
    const M = symtab.points.get('M')!;
    expect(M.x).toBeCloseTo((A.x + B.x) / 2, 8);
    expect(M.y).toBeCloseTo((A.y + B.y) / 2, 8);
  });

  it('throws when a point is defined twice', () => {
    const symtab = createEmptySymbolTable();
    expect(() =>
      executeOp(
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } } as any,
        symtab
      )
    ).not.toThrow();
    expect(() =>
      executeOp(
        { op: 'point', name: 'A', def: { kind: 'midpoint', of: ['B', 'C'] } } as any,
        symtab
      )
    ).toThrow(/already defined/);
  });

  it('throws a clear error referencing an unknown point', () => {
    const symtab = createEmptySymbolTable();
    expect(() =>
      executeOp({ op: 'point', name: 'M', def: { kind: 'midpoint', of: ['X', 'Y'] } } as any, symtab)
    ).toThrow(/Unknown point "X"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/execute.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `execute.ts`**

```typescript
import type { ConstructionOp, Plan } from './planSchema';
import type { SymbolTable, Vec3 } from './types';
import { resolveEntity } from './resolve';
import { buildSquare, buildRectangle, buildRhombus, buildRegPolygon, buildTriangle } from './ops/shapes';
import { extrudePrism, extrudePyramidApex } from './ops/extrude';
import {
  midpoint, centroidPoint, ratioPoint, reflectPoint,
  perpPointFromPlane, footOnPlane, footOnLine,
  intersectLineLine, intersectLinePlane,
} from './ops/points';

export function createEmptySymbolTable(): SymbolTable {
  return { points: new Map(), namedPlanes: new Map(), edges: new Set() };
}

function requirePoint(symtab: SymbolTable, name: string): Vec3 {
  const p = symtab.points.get(name);
  if (!p) throw new Error(`Unknown point "${name}" referenced before it was defined`);
  return p;
}

function setPoint(symtab: SymbolTable, name: string, pos: Vec3) {
  if (symtab.points.has(name)) {
    throw new Error(`Point "${name}" is already defined`);
  }
  symtab.points.set(name, pos);
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function addEdge(symtab: SymbolTable, a: string, b: string) {
  symtab.edges.add(edgeKey(a, b));
}

function addCyclicEdges(symtab: SymbolTable, verts: string[]) {
  for (let i = 0; i < verts.length; i++) {
    addEdge(symtab, verts[i], verts[(i + 1) % verts.length]);
  }
}

export function executeOp(op: ConstructionOp, symtab: SymbolTable): void {
  switch (op.op) {
    case 'base': {
      let positions: Vec3[];
      switch (op.shape) {
        case 'square':
          positions = buildSquare((op.dims as { edge: number }).edge);
          break;
        case 'rectangle': {
          const d = op.dims as { width: number; height: number };
          positions = buildRectangle(d.width, d.height);
          break;
        }
        case 'rhombus': {
          const d = op.dims as { diag1: number; diag2: number };
          positions = buildRhombus(d.diag1, d.diag2);
          break;
        }
        case 'reg_polygon': {
          const d = op.dims as { n: number; edge: number };
          positions = buildRegPolygon(d.n, d.edge);
          break;
        }
        case 'triangle':
          positions = buildTriangle(op.dims as any);
          break;
      }
      op.vertices.forEach((name, i) => setPoint(symtab, name, positions[i]));
      symtab.namedPlanes.set(op.vertices.join(''), op.vertices);
      addCyclicEdges(symtab, op.vertices);
      break;
    }
    case 'prism': {
      const basePositions = op.base.map((n) => requirePoint(symtab, n));
      const topPositions = extrudePrism(basePositions, op.height);
      op.top.forEach((name, i) => setPoint(symtab, name, topPositions[i]));
      symtab.namedPlanes.set(op.top.join(''), op.top);
      addCyclicEdges(symtab, op.top);
      op.base.forEach((baseName, i) => addEdge(symtab, baseName, op.top[i]));
      break;
    }
    case 'pyramid': {
      const basePositions = op.base.map((n) => requirePoint(symtab, n));
      const apexPos = extrudePyramidApex(basePositions, op.height);
      setPoint(symtab, op.apex, apexPos);
      op.base.forEach((baseName) => addEdge(symtab, op.apex, baseName));
      break;
    }
    case 'point': {
      let pos: Vec3;
      switch (op.def.kind) {
        case 'midpoint':
          pos = midpoint(requirePoint(symtab, op.def.of[0]), requirePoint(symtab, op.def.of[1]));
          break;
        case 'centroid':
          pos = centroidPoint(op.def.of.map((n) => requirePoint(symtab, n)));
          break;
        case 'ratio':
          pos = ratioPoint(requirePoint(symtab, op.def.from), requirePoint(symtab, op.def.to), op.def.t);
          break;
        case 'reflect':
          pos = reflectPoint(requirePoint(symtab, op.def.point), requirePoint(symtab, op.def.about));
          break;
      }
      setPoint(symtab, op.name, pos);
      break;
    }
    case 'perp_point': {
      const fromPos = requirePoint(symtab, op.from);
      const plane = resolveEntity(op.target, symtab);
      if (plane.type !== 'plane') {
        throw new Error(`perp_point target "${op.target}" must resolve to a plane, got "${plane.type}"`);
      }
      setPoint(symtab, op.name, perpPointFromPlane(fromPos, plane.positions.slice(0, 3), op.length));
      break;
    }
    case 'foot': {
      const fromPos = requirePoint(symtab, op.from);
      const target = resolveEntity(op.target, symtab);
      let pos: Vec3;
      if (op.onto === 'plane') {
        if (target.type !== 'plane') throw new Error(`foot onto plane: "${op.target}" must resolve to a plane`);
        pos = footOnPlane(fromPos, target.positions.slice(0, 3));
      } else {
        if (target.type !== 'line') throw new Error(`foot onto line: "${op.target}" must resolve to a line`);
        pos = footOnLine(fromPos, target.posA, target.posB);
      }
      setPoint(symtab, op.name, pos);
      break;
    }
    case 'intersect': {
      const a = resolveEntity(op.a, symtab);
      const b = resolveEntity(op.b, symtab);
      let pos: Vec3;
      if (a.type === 'line' && b.type === 'line') {
        pos = intersectLineLine(a.posA, a.posB, b.posA, b.posB);
      } else if (a.type === 'line' && b.type === 'plane') {
        pos = intersectLinePlane(a.posA, a.posB, b.positions.slice(0, 3));
      } else if (a.type === 'plane' && b.type === 'line') {
        pos = intersectLinePlane(b.posA, b.posB, a.positions.slice(0, 3));
      } else {
        throw new Error(
          `intersect: unsupported combination "${a.type}" x "${b.type}" (plane-plane intersection is out of scope for Phase 1)`
        );
      }
      setPoint(symtab, op.name, pos);
      break;
    }
  }
}

export function executePlan(plan: Plan): SymbolTable {
  const symtab = createEmptySymbolTable();
  for (const op of plan.ops) {
    executeOp(op, symtab);
  }
  return symtab;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/execute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/execute.ts api/_lib/kernel/__tests__/execute.test.ts
git commit -m "feat(kernel): add Construction Plan executor/dispatcher"
```

---

### Task 8: `verify.ts`

**Files:**
- Create: `api/_lib/kernel/verify.ts`
- Test: `api/_lib/kernel/__tests__/verify.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/verify.test.ts
import { describe, it, expect } from 'vitest';
import { verifyPlan, verifyAssert, checkDegeneracy } from '../verify';
import { executePlan, createEmptySymbolTable } from '../execute';
import { PlanSchema } from '../planSchema';
import { vec3 } from '../vecMath';

describe('verifyPlan — correct S.ABCD passes with zero violations', () => {
  it('SA perp (ABCD) and dist(S,A)=sqrt(2) both hold', () => {
    const plan = PlanSchema.parse({
      solidName: 'S.ABCD',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
        { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: Math.sqrt(2) },
      ],
      asserts: [
        { relation: 'perp', args: ['SA', 'ABCD'] },
        { relation: 'dist', args: ['S', 'A'], value: Math.sqrt(2) },
      ],
    });
    const symtab = executePlan(plan);
    const result = verifyPlan(plan, symtab);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe('verifyPlan — catches a genuinely wrong construction', () => {
  it('flags perp violation when the "apex" is actually in the base plane', () => {
    const plan = PlanSchema.parse({
      solidName: 'S.ABCD-bad',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
        { op: 'point', name: 'S', def: { kind: 'ratio', from: 'A', to: 'B', t: 0.3 } },
      ],
      asserts: [{ relation: 'perp', args: ['SA', 'ABCD'] }],
    });
    const symtab = executePlan(plan);
    const result = verifyPlan(plan, symtab);
    expect(result.ok).toBe(false);
    expect(result.violations[0].relation).toBe('perp');
  });
});

describe('verifyAssert — each relation', () => {
  function squareSymtab() {
    const plan = PlanSchema.parse({
      solidName: 'sq',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } }],
    });
    return executePlan(plan);
  }

  it('parallel: AB is parallel to DC in a square', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'parallel', args: ['AB', 'DC'] } as any, symtab);
    expect(v).toBeNull();
  });

  it('coplanar: all 4 square vertices are coplanar', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'coplanar', args: ['A', 'B', 'C', 'D'] } as any, symtab);
    expect(v).toBeNull();
  });

  it('on: midpoint of AB lies on line AB', () => {
    const plan = PlanSchema.parse({
      solidName: 'sq',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } },
        { op: 'point', name: 'M', def: { kind: 'midpoint', of: ['A', 'B'] } },
      ],
    });
    const symtab = executePlan(plan);
    const v = verifyAssert({ relation: 'on', args: ['M', 'AB'] } as any, symtab);
    expect(v).toBeNull();
  });

  it('angle: perpendicular lines report a 90 degree violation-free assert', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'angle', args: ['AB', 'AD'], value: 90 } as any, symtab);
    expect(v).toBeNull();
  });

  it('dist: wrong expected distance produces a violation with actual value reported', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'dist', args: ['A', 'B'], value: 99 } as any, symtab);
    expect(v).not.toBeNull();
    expect(v!.actual).toBeCloseTo(2, 8);
    expect(v!.expected).toBe(99);
  });
});

describe('checkDegeneracy', () => {
  it('flags duplicate points at the same position under different names', () => {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(0, 0, 0));
    const violations = checkDegeneracy(symtab);
    expect(violations.some((v) => v.kind === 'degenerate')).toBe(true);
  });

  it('flags a named face whose first three vertices are collinear', () => {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(1, 0, 0));
    symtab.points.set('C', vec3(2, 0, 0));
    symtab.namedPlanes.set('ABC', ['A', 'B', 'C']);
    const violations = checkDegeneracy(symtab);
    expect(violations.some((v) => v.kind === 'degenerate')).toBe(true);
  });

  it('reports zero violations for a well-formed square', () => {
    const plan = PlanSchema.parse({
      solidName: 'sq',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } }],
    });
    const symtab = executePlan(plan);
    expect(checkDegeneracy(symtab)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/verify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `verify.ts`**

```typescript
import type { AssertOp, Plan } from './planSchema';
import type { SymbolTable, Violation, VerifyResult, ResolvedEntity } from './types';
import { resolveEntity } from './resolve';
import {
  type Vec3, sub, dot, cross, length, normalize, distance,
  distancePointToLine, distancePointToPlane, planeNormal,
  angleBetween, arePointsCoplanar, areCollinear, EPS,
} from './vecMath';

const DEFAULT_DIST_TOLERANCE = 1e-6;
const DEFAULT_ANGLE_TOLERANCE_DEG = 1e-3;

function directionOf(entity: ResolvedEntity): Vec3 {
  if (entity.type === 'line') return sub(entity.posB, entity.posA);
  if (entity.type === 'plane') return planeNormal(entity.positions[0], entity.positions[1], entity.positions[2]);
  throw new Error(`Cannot get a direction/normal for entity of type "${entity.type}"`);
}

export function verifyAssert(assertOp: AssertOp, symtab: SymbolTable): Violation | null {
  const tol = assertOp.tolerance ?? DEFAULT_DIST_TOLERANCE;
  const angleTol = assertOp.tolerance ?? DEFAULT_ANGLE_TOLERANCE_DEG;
  const [argA, argB] = assertOp.args;

  switch (assertOp.relation) {
    case 'perp': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const actual = Math.abs(dot(normalize(directionOf(a)), normalize(directionOf(b))));
      if (actual < tol) return null;
      return {
        kind: 'assert_failed', relation: 'perp', args: assertOp.args, expected: 0, actual,
        message: `Expected ${argA} ⊥ ${argB}, but |cos angle| = ${actual.toFixed(6)}`,
      };
    }
    case 'parallel': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const actual = length(cross(normalize(directionOf(a)), normalize(directionOf(b))));
      if (actual < tol) return null;
      return {
        kind: 'assert_failed', relation: 'parallel', args: assertOp.args, expected: 0, actual,
        message: `Expected ${argA} ∥ ${argB}, but |cross product| = ${actual.toFixed(6)}`,
      };
    }
    case 'coplanar': {
      const positions = assertOp.args.map((tok) => {
        const e = resolveEntity(tok, symtab);
        if (e.type !== 'point') throw new Error(`coplanar assert requires point args, got "${e.type}" for "${tok}"`);
        return e.pos;
      });
      if (arePointsCoplanar(positions, tol)) return null;
      return {
        kind: 'assert_failed', relation: 'coplanar', args: assertOp.args,
        message: `Points ${assertOp.args.join(', ')} are not coplanar`,
      };
    }
    case 'on': {
      const [pointTok, entityTok] = assertOp.args;
      const p = resolveEntity(pointTok, symtab);
      const e = resolveEntity(entityTok, symtab);
      if (p.type !== 'point') throw new Error(`"on" assert requires first arg to be a point, got "${p.type}"`);
      let actual: number;
      if (e.type === 'line') actual = distancePointToLine(p.pos, e.posA, e.posB);
      else if (e.type === 'plane') actual = distancePointToPlane(p.pos, e.positions[0], planeNormal(e.positions[0], e.positions[1], e.positions[2]));
      else throw new Error(`"on" assert requires second arg to be a line or plane, got "${e.type}"`);
      if (actual < tol) return null;
      return {
        kind: 'assert_failed', relation: 'on', args: assertOp.args, expected: 0, actual,
        message: `Expected ${pointTok} on ${entityTok}, but distance = ${actual.toFixed(6)}`,
      };
    }
    case 'dist': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const expected = assertOp.value!;
      let actual: number;
      if (a.type === 'point' && b.type === 'point') actual = distance(a.pos, b.pos);
      else if (a.type === 'point' && b.type === 'line') actual = distancePointToLine(a.pos, b.posA, b.posB);
      else if (a.type === 'line' && b.type === 'point') actual = distancePointToLine(b.pos, a.posA, a.posB);
      else if (a.type === 'point' && b.type === 'plane') actual = distancePointToPlane(a.pos, b.positions[0], planeNormal(b.positions[0], b.positions[1], b.positions[2]));
      else if (a.type === 'plane' && b.type === 'point') actual = distancePointToPlane(b.pos, a.positions[0], planeNormal(a.positions[0], a.positions[1], a.positions[2]));
      else throw new Error(`Unsupported dist combination: "${a.type}" x "${b.type}"`);
      if (Math.abs(actual - expected) < tol) return null;
      return {
        kind: 'assert_failed', relation: 'dist', args: assertOp.args, expected, actual,
        message: `Expected dist(${argA}, ${argB}) = ${expected}, got ${actual.toFixed(6)}`,
      };
    }
    case 'angle': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const expected = assertOp.value!;
      let actual = angleBetween(directionOf(a), directionOf(b));
      const isLinePlane = (a.type === 'line' && b.type === 'plane') || (a.type === 'plane' && b.type === 'line');
      if (isLinePlane) {
        actual = 90 - actual;
      } else if (actual > 90) {
        actual = 180 - actual;
      }
      if (Math.abs(actual - expected) < angleTol) return null;
      return {
        kind: 'assert_failed', relation: 'angle', args: assertOp.args, expected, actual,
        message: `Expected angle(${argA}, ${argB}) = ${expected}°, got ${actual.toFixed(4)}°`,
      };
    }
  }
}

export function checkDegeneracy(symtab: SymbolTable): Violation[] {
  const violations: Violation[] = [];
  const names = Array.from(symtab.points.keys());

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const pi = symtab.points.get(names[i])!;
      const pj = symtab.points.get(names[j])!;
      const d = distance(pi, pj);
      if (d < EPS) {
        violations.push({
          kind: 'degenerate',
          message: `Points "${names[i]}" and "${names[j]}" coincide (distance ${d.toExponential(2)})`,
        });
      }
    }
  }

  for (const [key, verts] of symtab.namedPlanes.entries()) {
    if (verts.length < 3) continue;
    const positions = verts.map((n) => symtab.points.get(n)!);
    const [p0, p1, p2] = positions;
    if (areCollinear(p0, p1, p2)) {
      violations.push({ kind: 'degenerate', message: `Face "${key}" (${verts.join(',')}) is degenerate: first three vertices are collinear` });
    } else if (!arePointsCoplanar(positions)) {
      violations.push({ kind: 'degenerate', message: `Face "${key}" (${verts.join(',')}) is not planar` });
    }
  }

  return violations;
}

export function verifyPlan(plan: Plan, symtab: SymbolTable): VerifyResult {
  const violations: Violation[] = [];
  for (const assertOp of plan.asserts) {
    const v = verifyAssert(assertOp, symtab);
    if (v) violations.push(v);
  }
  violations.push(...checkDegeneracy(symtab));
  return { ok: violations.length === 0, violations };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/verify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/verify.ts api/_lib/kernel/__tests__/verify.test.ts
git commit -m "feat(kernel): add constraint verifier + degeneracy detector"
```

---

### Task 9: `repair.ts`

**Files:**
- Create: `api/_lib/kernel/repair.ts`
- Test: `api/_lib/kernel/__tests__/repair.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/repair.test.ts
import { describe, it, expect } from 'vitest';
import { attemptDeterministicRepair } from '../repair';
import { createEmptySymbolTable } from '../execute';
import { verifyAssert } from '../verify';
import { vec3 } from '../vecMath';

function baseSquareSymtab() {
  const symtab = createEmptySymbolTable();
  symtab.points.set('A', vec3(0, 0, 0));
  symtab.points.set('B', vec3(1, 0, 0));
  symtab.points.set('C', vec3(1, 1, 0));
  symtab.points.set('D', vec3(0, 1, 0));
  symtab.namedPlanes.set('ABCD', ['A', 'B', 'C', 'D']);
  return symtab;
}

describe('attemptDeterministicRepair — "on" violations', () => {
  it('snaps a point that is slightly off a line back onto it', () => {
    const symtab = baseSquareSymtab();
    symtab.points.set('M', vec3(0.5, 0.0003, 0)); // meant to be the midpoint of AB (on the line)
    const violation = verifyAssert({ relation: 'on', args: ['M', 'AB'], tolerance: 1e-6 } as any, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
    const after = verifyAssert({ relation: 'on', args: ['M', 'AB'], tolerance: 1e-6 } as any, symtab);
    expect(after).toBeNull();
  });

  it('snaps a point that is slightly off a plane back onto it', () => {
    const symtab = baseSquareSymtab();
    symtab.points.set('P', vec3(0.5, 0.5, 0.0004));
    const violation = verifyAssert({ relation: 'on', args: ['P', 'ABCD'], tolerance: 1e-6 } as any, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
    expect(symtab.points.get('P')!.z).toBeCloseTo(0, 6);
  });
});

describe('attemptDeterministicRepair — "perp" violations (line vs plane)', () => {
  it('re-anchors a nearly-perpendicular apex back onto the true normal', () => {
    const symtab = baseSquareSymtab();
    // S should be directly above A (perp to ABCD); nudge it slightly off-normal.
    symtab.points.set('S', vec3(0.0005, 0, Math.sqrt(2)));
    const violation = verifyAssert({ relation: 'perp', args: ['SA', 'ABCD'], tolerance: 1e-6 } as any, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
    const after = verifyAssert({ relation: 'perp', args: ['SA', 'ABCD'], tolerance: 1e-6 } as any, symtab);
    expect(after).toBeNull();
  });
});

describe('attemptDeterministicRepair — declines out-of-scope or large errors', () => {
  it('declines when the violation is a large, likely-semantic error (not numeric noise)', () => {
    const symtab = baseSquareSymtab();
    symtab.points.set('S', vec3(5, 5, 5)); // wildly off, not "SA" at all
    const violation = verifyAssert({ relation: 'perp', args: ['SA', 'ABCD'], tolerance: 1e-6 } as any, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('declines to repair a non-assert_failed (degenerate) violation', () => {
    const symtab = baseSquareSymtab();
    const result = attemptDeterministicRepair(
      { kind: 'degenerate', message: 'x' } as any,
      symtab
    );
    expect(result.repaired).toBe(false);
  });

  it('declines relations it does not implement (e.g. dist)', () => {
    const symtab = baseSquareSymtab();
    const violation = verifyAssert({ relation: 'dist', args: ['A', 'B'], value: 99 } as any, symtab);
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/repair.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `repair.ts`**

```typescript
import type { Violation, SymbolTable } from './types';
import { resolveEntity } from './resolve';
import { add, sub, scale, planeNormal, projectPointOntoPlane, projectPointOntoLine, length } from './vecMath';

/** Beyond this fraction of the shape's own scale, an "on"/"perp" miss is treated as a
 * likely semantic construction error, not numeric noise — repair is declined so the
 * violation surfaces for LLM-targeted repair instead of being silently papered over. */
export const REPAIR_MAX_RELATIVE_ERROR = 0.01;

export type RepairResult = { repaired: boolean; reason?: string };

function referenceScale(symtab: SymbolTable): number {
  const positions = Array.from(symtab.points.values());
  let maxDist = 0;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      maxDist = Math.max(maxDist, length(sub(positions[i], positions[j])));
    }
  }
  return maxDist || 1;
}

export function attemptDeterministicRepair(violation: Violation, symtab: SymbolTable): RepairResult {
  if (violation.kind !== 'assert_failed') {
    return { repaired: false, reason: 'Only assert_failed violations are eligible for deterministic repair' };
  }
  if (violation.relation !== 'on' && violation.relation !== 'perp') {
    return { repaired: false, reason: `Deterministic repair is not implemented for relation "${violation.relation}"` };
  }
  if (!violation.args || violation.args.length !== 2) {
    return { repaired: false, reason: 'Expected exactly 2 args for on/perp repair' };
  }
  const scale_ = referenceScale(symtab);
  if (violation.actual !== undefined && violation.actual / scale_ > REPAIR_MAX_RELATIVE_ERROR) {
    return { repaired: false, reason: 'Error exceeds the deterministic-repair threshold; likely a semantic mistake, not numeric noise' };
  }

  if (violation.relation === 'on') {
    const [pointTok, entityTok] = violation.args;
    const point = resolveEntity(pointTok, symtab);
    const entity = resolveEntity(entityTok, symtab);
    if (point.type !== 'point') return { repaired: false, reason: `"${pointTok}" is not a point` };
    if (entity.type === 'plane') {
      const n = planeNormal(entity.positions[0], entity.positions[1], entity.positions[2]);
      symtab.points.set(point.name, projectPointOntoPlane(point.pos, entity.positions[0], n));
      return { repaired: true };
    }
    if (entity.type === 'line') {
      symtab.points.set(point.name, projectPointOntoLine(point.pos, entity.posA, entity.posB));
      return { repaired: true };
    }
    return { repaired: false, reason: `Cannot project onto entity of type "${entity.type}"` };
  }

  // relation === 'perp': re-anchor the second point of the "line" arg so the line
  // becomes exactly perpendicular to the "other" plane, preserving distance from the anchor.
  const [lineTok, otherTok] = violation.args;
  const lineEntity = resolveEntity(lineTok, symtab);
  const otherEntity = resolveEntity(otherTok, symtab);
  if (lineEntity.type !== 'line') {
    return { repaired: false, reason: `Deterministic perp-repair requires the first arg to be a line, got "${lineEntity.type}"` };
  }
  if (otherEntity.type !== 'plane') {
    return { repaired: false, reason: 'Deterministic perp-repair for line-vs-line is not implemented in Phase 1' };
  }
  const anchorLen = length(sub(lineEntity.posB, lineEntity.posA));
  const normal = planeNormal(otherEntity.positions[0], otherEntity.positions[1], otherEntity.positions[2]);
  const newB = add(lineEntity.posA, scale(normal, anchorLen));
  symtab.points.set(lineEntity.b, newB);
  return { repaired: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/repair.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/repair.ts api/_lib/kernel/__tests__/repair.test.ts
git commit -m "feat(kernel): add deterministic repair for small numeric on/perp drift"
```

---

### Task 10: `exactForm.ts`

**Files:**
- Create: `api/_lib/kernel/exactForm.ts`
- Test: `api/_lib/kernel/__tests__/exactForm.test.ts`

**Note on testing approach:** `toExactForm` is a best-effort search heuristic (it searches over a bounded set of `p/q · √n` candidates). Rather than hand-guessing the exact output string and risking an assertion that's wrong for reasons unrelated to a real bug, the test file includes a small self-contained `parseBack` helper that turns the returned text back into a number, and asserts the round trip is numerically correct. This is more robust than string-matching and still catches real bugs (wrong radicand, wrong fraction, `isExact` mis-set).

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/exactForm.test.ts
import { describe, it, expect } from 'vitest';
import { toExactForm } from '../exactForm';

/** Test-only helper: parses "p", "p/q", "√n", "p√n", "p√n/q", with optional leading "-". */
function parseBack(text: string): number {
  const m = text.match(/^(-)?(\d+)?(?:√(\d+))?(?:\/(\d+))?$/);
  if (!m) throw new Error(`Cannot parse exact-form text for test verification: "${text}"`);
  const sign = m[1] ? -1 : 1;
  const p = m[2] ? Number(m[2]) : 1;
  const n = m[3] ? Math.sqrt(Number(m[3])) : 1;
  const q = m[4] ? Number(m[4]) : 1;
  return (sign * p * n) / q;
}

describe('toExactForm', () => {
  it('recognizes an exact integer', () => {
    const r = toExactForm(45);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(45, 6);
  });

  it('recognizes an exact simple fraction', () => {
    const r = toExactForm(1.5);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(1.5, 6);
  });

  it('recognizes sqrt(2)', () => {
    const r = toExactForm(Math.sqrt(2));
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(Math.sqrt(2), 4);
  });

  it('recognizes sqrt(6)/3 (a common distance-to-plane answer)', () => {
    const r = toExactForm(Math.sqrt(6) / 3);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(Math.sqrt(6) / 3, 4);
  });

  it('recognizes 2*sqrt(3)/3', () => {
    const r = toExactForm((2 * Math.sqrt(3)) / 3);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo((2 * Math.sqrt(3)) / 3, 4);
  });

  it('handles negative values, preserving sign through the round trip', () => {
    const r = toExactForm(-1.5);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(-1.5, 6);
  });

  it('treats values within eps of zero as exact zero', () => {
    const r = toExactForm(0.00000001);
    expect(r.isExact).toBe(true);
    expect(r.text).toBe('0');
  });

  it('falls back to a flagged decimal for a value with no clean closed form in the search space', () => {
    const r = toExactForm(Math.PI);
    expect(r.isExact).toBe(false);
    expect(Number(r.text)).toBeCloseTo(Math.PI, 3);
  });

  it('value field always echoes the original input', () => {
    const r = toExactForm(7.25);
    expect(r.value).toBe(7.25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/exactForm.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `exactForm.ts`**

```typescript
export type ExactFormResult = { text: string; isExact: boolean; value: number };

const EPS = 1e-4;
const SQUAREFREE_RADICANDS = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24, 26, 29, 30];
const MAX_DENOM = 12;
const MAX_NUMER = 30;

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function toExactForm(value: number, eps = EPS): ExactFormResult {
  if (Math.abs(value) < eps) return { text: '0', isExact: true, value };
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);

  for (let q = 1; q <= MAX_DENOM; q++) {
    const p = Math.round(v * q);
    if (p > 0 && p <= MAX_NUMER * MAX_DENOM && Math.abs(v - p / q) < eps) {
      const g = gcd(p, q);
      const pp = p / g;
      const qq = q / g;
      const text = qq === 1 ? `${pp}` : `${pp}/${qq}`;
      return { text: sign < 0 ? `-${text}` : text, isExact: true, value };
    }
  }

  let best: { p: number; q: number; n: number } | null = null;
  for (const n of SQUAREFREE_RADICANDS) {
    const sq = Math.sqrt(n);
    for (let q = 1; q <= MAX_DENOM; q++) {
      const p = Math.round((v * q) / sq);
      if (p <= 0 || p > MAX_NUMER) continue;
      const candidate = (p * sq) / q;
      if (Math.abs(candidate - v) < eps) {
        if (!best || q < best.q || (q === best.q && n < best.n)) {
          const g = gcd(p, q);
          best = { p: p / g, q: q / g, n };
        }
      }
    }
  }
  if (best) {
    const sqrtPart = `√${best.n}`;
    const numer = best.p === 1 ? sqrtPart : `${best.p}${sqrtPart}`;
    const text = best.q === 1 ? numer : `${numer}/${best.q}`;
    return { text: sign < 0 ? `-${text}` : text, isExact: true, value };
  }

  return { text: (sign * v).toFixed(4), isExact: false, value };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/exactForm.test.ts`
Expected: PASS. **If any case fails** (the search heuristic is order-dependent — e.g. it finds a different, still-valid `p·√n/q` than anticipated, or an eps boundary needs adjusting), inspect the actual returned `text`/`isExact`, confirm `parseBack(text)` is in fact numerically correct for that alternate form, and if so the test already passes as written (it doesn't pin the exact string). Only change `MAX_DENOM`/`SQUAREFREE_RADICANDS`/`eps` if a case is genuinely unrecognized that should be (e.g. widen `SQUAREFREE_RADICANDS` if a common textbook radicand like 33 or 35 is missing).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/exactForm.ts api/_lib/kernel/__tests__/exactForm.test.ts
git commit -m "feat(kernel): add float-to-exact-form conversion (p*sqrt(n)/q)"
```

---

### Task 11: `trace.ts`

**Files:**
- Create: `api/_lib/kernel/trace.ts`
- Test: `api/_lib/kernel/__tests__/trace.test.ts`

**Note:** Deliberately has zero I/O and never calls `Date.now()` — the kernel must stay pure and trivially testable; callers (Phase 2 API routes) attach their own wall-clock timing around kernel calls.

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/trace.test.ts
import { describe, it, expect } from 'vitest';
import { Trace } from '../trace';

describe('Trace', () => {
  it('records events in order with stage/message/data', () => {
    const trace = new Trace();
    trace.log('execute', 'started', { opCount: 3 });
    trace.log('verify', 'passed');
    expect(trace.events).toHaveLength(2);
    expect(trace.events[0]).toMatchObject({ stage: 'execute', message: 'started', data: { opCount: 3 } });
    expect(trace.events[1]).toMatchObject({ stage: 'verify', message: 'passed' });
  });

  it('summary() counts events per stage', () => {
    const trace = new Trace();
    trace.log('execute', 'a');
    trace.log('execute', 'b');
    trace.log('verify', 'c');
    const summary = trace.summary();
    expect(summary.totalEvents).toBe(3);
    expect(summary.byStage).toEqual({ execute: 2, verify: 1 });
  });

  it('starts empty', () => {
    const trace = new Trace();
    expect(trace.events).toHaveLength(0);
    expect(trace.summary().totalEvents).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/trace.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `trace.ts`**

```typescript
export type TraceStage = 'execute' | 'verify' | 'repair' | 'exactForm';

export type TraceEvent = {
  stage: TraceStage;
  message: string;
  data?: Record<string, unknown>;
};

/** Pure, I/O-free event log — no wall-clock timestamps, so the kernel stays deterministic
 * and trivially testable. Callers attach their own timing around kernel calls. */
export class Trace {
  events: TraceEvent[] = [];

  log(stage: TraceStage, message: string, data?: Record<string, unknown>): void {
    this.events.push({ stage, message, data });
  }

  summary(): { totalEvents: number; byStage: Record<string, number> } {
    return {
      totalEvents: this.events.length,
      byStage: this.events.reduce<Record<string, number>>((acc, e) => {
        acc[e.stage] = (acc[e.stage] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/trace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/trace.ts api/_lib/kernel/__tests__/trace.test.ts
git commit -m "feat(kernel): add minimal pure telemetry event collector"
```

---

### Task 12: `toGeometryData.ts`

**Files:**
- Create: `api/_lib/kernel/toGeometryData.ts`
- Test: `api/_lib/kernel/__tests__/toGeometryData.test.ts`

**Before writing this task**, read [`src/types/geometry.ts`](../../../src/types/geometry.ts) to confirm the current exact shape of `Point3D`, `Line3D`, and `GeometryData` (an earlier exploration of this file found `Point3D { id, label, x, y, z, color?, hidden? }`, `Line3D { id, from, to, style?, color? }`, `GeometryData { name, points, lines, ...other optional fields }` — confirm this is still accurate; if the real field names differ, use the real ones instead of what's written here, and note the discrepancy when reporting back).

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/toGeometryData.test.ts
import { describe, it, expect } from 'vitest';
import { toGeometryData } from '../toGeometryData';
import { executePlan } from '../execute';
import { PlanSchema } from '../planSchema';

describe('toGeometryData', () => {
  const plan = PlanSchema.parse({
    solidName: 'S.ABCD',
    ops: [
      { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
      { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: Math.sqrt(2) },
    ],
  });

  it('maps every symbol-table point to a Point3D with matching id/label/coords', () => {
    const symtab = executePlan(plan);
    const geo = toGeometryData(symtab, plan.solidName);
    expect(geo.name).toBe('S.ABCD');
    expect(geo.points).toHaveLength(5);
    const A = geo.points.find((p) => p.id === 'A')!;
    expect(A.label).toBe('A');
    expect(A.x).toBeCloseTo(symtab.points.get('A')!.x, 10);
    expect(A.y).toBeCloseTo(symtab.points.get('A')!.y, 10);
    expect(A.z).toBeCloseTo(symtab.points.get('A')!.z, 10);
  });

  it('maps every registered edge to a Line3D connecting the right point ids', () => {
    const symtab = executePlan(plan);
    const geo = toGeometryData(symtab, plan.solidName);
    const hasEdge = (a: string, b: string) =>
      geo.lines.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
    expect(hasEdge('A', 'B')).toBe(true);
    expect(hasEdge('C', 'D')).toBe(true);
    expect(geo.lines).toHaveLength(4); // just the square's 4 edges; S has no auto-edges in Phase 1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/toGeometryData.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `toGeometryData.ts`**

```typescript
import type { SymbolTable } from './types';
import type { GeometryData } from '../../../src/types/geometry';

export function toGeometryData(symtab: SymbolTable, name: string): GeometryData {
  const points = Array.from(symtab.points.entries()).map(([label, pos]) => ({
    id: label,
    label,
    x: pos.x,
    y: pos.y,
    z: pos.z,
  }));

  const lines = Array.from(symtab.edges).map((key) => {
    const [from, to] = key.split('|');
    return { id: `${from}${to}`, from, to, style: 'solid' as const };
  });

  return { name, points, lines } as GeometryData;
}
```

**If `src/types/geometry.ts`'s actual field names differ from `{id,label,x,y,z}`/`{id,from,to,style}`** (e.g. required fields this literal doesn't supply), adjust the object literal to match the real type — remove the `as GeometryData` cast once the shape lines up naturally; the cast here is a safety net only for optional fields (e.g. `color?`, `hidden?`) that this Phase-1 mapping intentionally leaves unset.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/toGeometryData.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/toGeometryData.ts api/_lib/kernel/__tests__/toGeometryData.test.ts
git commit -m "feat(kernel): map SymbolTable onto the existing frontend GeometryData type"
```

---

### Task 13: `index.ts` + end-to-end integration tests

**Files:**
- Create: `api/_lib/kernel/index.ts`
- Test: `api/_lib/kernel/__tests__/integration.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// api/_lib/kernel/__tests__/integration.test.ts
import { describe, it, expect } from 'vitest';
import { runPlan } from '../index';

describe('end-to-end: spec worked example — S.ABCD, SA perp base, SA=a*sqrt(2), angle(SC,base)=45deg', () => {
  it('constructs correct coordinates and verifies with zero violations', () => {
    const a = 1;
    const plan = {
      solidName: 'S.ABCD',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: a } },
        { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: a * Math.sqrt(2) },
      ],
      asserts: [
        { relation: 'perp', args: ['SA', 'ABCD'] },
        { relation: 'dist', args: ['S', 'A'], value: a * Math.sqrt(2) },
        { relation: 'angle', args: ['SC', 'ABCD'], value: 45 },
      ],
    };

    const result = runPlan(plan);
    expect(result.verify.ok).toBe(true);
    expect(result.verify.violations).toHaveLength(0);
    expect(result.geometry.points).toHaveLength(5);
    expect(result.geometry.name).toBe('S.ABCD');
    expect(result.trace.summary().totalEvents).toBeGreaterThan(0);
  });

  it('rejects a plan whose stated angle does not actually hold', () => {
    const plan = {
      solidName: 'S.ABCD-wrong-angle',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
        { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: 1 },
      ],
      asserts: [{ relation: 'angle', args: ['SC', 'ABCD'], value: 60 }], // actually ~35.26deg for height=1, diag=sqrt(2)
    };
    const result = runPlan(plan);
    expect(result.verify.ok).toBe(false);
    expect(result.verify.violations.some((v) => v.relation === 'angle')).toBe(true);
  });

  it('throws a Zod validation error for a malformed raw plan (never silently constructs garbage)', () => {
    const badPlan = { solidName: 'bad', ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B'], dims: { edge: 1 } }] };
    expect(() => runPlan(badPlan)).toThrow();
  });
});

describe('end-to-end: prism with a foot-of-perpendicular and an intersect op', () => {
  it('lăng trụ tam giác đều ABC.A1B1C1: builds foot(A1 -> plane ABC) and intersect(medians)', () => {
    const plan = {
      solidName: 'ABC.A1B1C1',
      ops: [
        { op: 'base', shape: 'triangle', vertices: ['A', 'B', 'C'], dims: { triangleType: 'equilateral', edge: 2 } },
        { op: 'prism', base: ['A', 'B', 'C'], top: ['A1', 'B1', 'C1'], height: 4 },
        { op: 'foot', name: 'H', from: 'A1', onto: 'plane', target: 'ABC' },
        { op: 'point', name: 'M', def: { kind: 'midpoint', of: ['B', 'C'] } },
        { op: 'intersect', name: 'G', a: 'AM', b: 'BC' },
      ],
      asserts: [
        { relation: 'on', args: ['H', 'ABC'] },
        { relation: 'on', args: ['G', 'BC'] },
      ],
    };
    const result = runPlan(plan);
    expect(result.verify.ok).toBe(true);
    expect(result.symtab.points.get('H')!.z).toBeCloseTo(0, 8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/_lib/kernel/__tests__/integration.test.ts`
Expected: FAIL — module not found (`../index`).

- [ ] **Step 3: Write `index.ts`**

```typescript
import { PlanSchema, type Plan } from './planSchema';
import { executePlan } from './execute';
import { verifyPlan } from './verify';
import { toGeometryData } from './toGeometryData';
import { Trace } from './trace';
import type { SymbolTable, VerifyResult } from './types';
import type { GeometryData } from '../../../src/types/geometry';

export type KernelRunResult = {
  plan: Plan;
  symtab: SymbolTable;
  geometry: GeometryData;
  verify: VerifyResult;
  trace: Trace;
};

export function runPlan(rawPlan: unknown): KernelRunResult {
  const trace = new Trace();
  const plan = PlanSchema.parse(rawPlan);
  trace.log('execute', `Executing plan "${plan.solidName}" with ${plan.ops.length} ops`);
  const symtab = executePlan(plan);
  trace.log('execute', `Executed successfully: ${symtab.points.size} points defined`);
  const verify = verifyPlan(plan, symtab);
  trace.log('verify', `Verification ${verify.ok ? 'passed' : 'failed'}: ${verify.violations.length} violation(s)`);
  const geometry = toGeometryData(symtab, plan.solidName);
  return { plan, symtab, geometry, verify, trace };
}

export * from './planSchema';
export * from './types';
export * from './exactForm';
export { verifyPlan, verifyAssert, checkDegeneracy } from './verify';
export { attemptDeterministicRepair, REPAIR_MAX_RELATIVE_ERROR } from './repair';
export { executePlan, executeOp, createEmptySymbolTable } from './execute';
export { resolveEntity } from './resolve';
export { toGeometryData } from './toGeometryData';
export { Trace } from './trace';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/_lib/kernel/__tests__/integration.test.ts`
Expected: PASS.

**Manually double-check the second test's math before trusting it:** for a unit square base (edge 1) with S directly above A at height 1: C is the opposite corner, so AC (the base diagonal) has length √2, and SC has length √(1² + (√2)²) = √3. The angle between SC and the base plane satisfies sin(angle) = height/|SC| = 1/√3, so angle = arcsin(1/√3) ≈ 35.26°. The test asserts the plan (which claims 60°) is correctly rejected — 35.26° ≠ 60°, so this is correct as written.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: All test files pass (13 files, 100+ tests). Zero failures.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/kernel/index.ts api/_lib/kernel/__tests__/integration.test.ts
git commit -m "feat(kernel): add public API (runPlan) + end-to-end integration tests"
```

---

### Task 14: Final verification pass

**Files:** none created — this task only runs checks and, if needed, fixes issues found.

- [ ] **Step 1: Run the full test suite one more time, clean**

Run: `npm test`
Expected: All tests pass. Record the total test/file count.

- [ ] **Step 2: Run the existing lint check to confirm nothing under `api/_lib/kernel/` violates project lint rules**

Run: `npm run lint`
Expected: No new errors attributable to files under `api/_lib/kernel/`. (Pre-existing lint issues elsewhere in the repo, if any, are out of scope — do not fix unrelated files.)

- [ ] **Step 3: Type-check the kernel in isolation**

Run: `npx tsc --noEmit -p tsconfig.json --skipLibCheck api/_lib/kernel/index.ts api/_lib/kernel/**/*.ts` — if this invocation doesn't cleanly pick up the project's path aliases/module resolution, instead run `npx tsc --noEmit --strict false --target ES2022 --module ESNext --moduleResolution bundler --esModuleInterop api/_lib/kernel/index.ts` as a fallback. Either way, the goal is: zero TypeScript errors in `api/_lib/kernel/**`.
Expected: No type errors.

- [ ] **Step 4: Adversarial self-review of the kernel math**

Re-read every formula in `vecMath.ts`, `ops/shapes.ts`, `ops/points.ts`, and `verify.ts` against these specific known-tricky cases, and add a regression test in the relevant `__tests__` file for any case not already covered:
- `planeNormal`'s z-flip: confirm a plane that is nearly vertical (e.g. through `(0,0,0),(1,0,0),(0,0,1)`, normal ≈ `(0,-1,0)` before any flip since z-component is 0) does not cause `perp`/`parallel`/`dist` checks to give a wrong answer due to sign (they shouldn't — those checks use `abs()` or squared/cross-product magnitudes, not raw signed dot products; confirm this is actually true in the code, not just asserted here).
- `intersectLineLine`'s skew-detection epsilon scaling: verify it doesn't false-positive-reject two lines that are genuinely coplanar but far from the origin (large coordinate magnitudes) — add a test with points at e.g. magnitude ~1000 to confirm the `scaleRef`-relative tolerance still works correctly.
- `checkAngle`'s line-plane vs line-line/plane-plane branching in `verify.ts`: confirm the 45°/perpendicular-base worked example from Task 13 and at least one additional hand-computed line-line angle case (e.g. two face diagonals of a cube) both come out right.

If any of these turns up a real bug, fix it, add the regression test, and re-run `npm test` to confirm everything is still green.

- [ ] **Step 5: Commit any fixes from the adversarial review**

If Step 4 found and fixed anything:

```bash
git add api/_lib/kernel/
git commit -m "fix(kernel): address issues found in adversarial self-review"
```

If Step 4 found nothing to fix, skip this commit (no empty commits).

---

## Success criteria for Phase 1 (from spec §7)

- [ ] `npm test` passes with zero failures across all 13 test files.
- [ ] Every formula in `vecMath.ts` has at least one hand-verified (not just internally-consistent) test case, per Task 1.
- [ ] The spec §5 worked example (S.ABCD, SA⊥(ABCD), SA=a√2, angle(SC,(ABCD))=45°) passes end-to-end via `runPlan()`, per Task 13.
- [ ] The verifier demonstrably rejects at least 3 distinct classes of wrong construction across the suite: a wrong-perpendicularity apex (Task 8), a wrong stated angle (Task 13), and degenerate geometry — duplicate points and collinear faces (Task 8).
- [ ] `PlanSchema.parse()` rejects every malformed-Plan case listed in Task 6 with a Zod error, never silently coercing bad input.
- [ ] Deterministic repair (Task 9) successfully fixes small (<1% of shape scale) numeric "on"/"perp" drift and explicitly declines (with a stated reason) anything larger or out of its scope — never silently "fixes" something it shouldn't.
- [ ] `toGeometryData()`'s output is structurally assignable to the real `src/types/geometry.ts` `GeometryData` type with no frontend code touched.
- [ ] No file outside `api/_lib/kernel/`, `vitest.config.ts`, and `package.json`/`package-lock.json` was modified.
- [ ] All work is committed to the local `claude/project-reading-e990ce` branch only — nothing pushed, nothing deployed.
