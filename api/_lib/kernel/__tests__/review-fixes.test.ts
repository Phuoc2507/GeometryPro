// api/_lib/kernel/__tests__/review-fixes.test.ts
// Regression tests for the defects found by the adversarial review of Phase 1.
// Each describe block is tagged with the review finding it pins down.
import { describe, it, expect } from 'vitest';
import { verifyPlan, verifyAssert, checkDegeneracy } from '../verify';
import { attemptDeterministicRepair } from '../repair';
import { executePlan, createEmptySymbolTable } from '../execute';
import { toGeometryData } from '../toGeometryData';
import { PlanSchema, type AssertOp } from '../planSchema';
import { vec3, arePointsCoplanar } from '../vecMath';

describe('§2.1 parallel: line-vs-plane must not be inverted', () => {
  function squareSymtab() {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(1, 0, 0));
    symtab.points.set('C', vec3(1, 1, 0));
    symtab.points.set('D', vec3(0, 1, 0));
    symtab.namedPlanes.set('ABCD', ['A', 'B', 'C', 'D']);
    return symtab;
  }

  it('a line PERPENDICULAR to the plane is NOT reported parallel (regression: was falsely null)', () => {
    const symtab = squareSymtab();
    symtab.points.set('S', vec3(0, 0, 1));
    symtab.points.set('T', vec3(0, 0, 5)); // ST is along +z, perpendicular to the z=0 plane
    const v = verifyAssert({ relation: 'parallel', args: ['ST', 'ABCD'] } as AssertOp, symtab);
    expect(v).not.toBeNull();
    expect(v!.relation).toBe('parallel');
  });

  it('a line genuinely PARALLEL to the plane passes', () => {
    const symtab = squareSymtab();
    symtab.points.set('E', vec3(0, 0, 1));
    symtab.points.set('F', vec3(1, 0, 1)); // EF lies in the z=1 plane, parallel to z=0
    const v = verifyAssert({ relation: 'parallel', args: ['EF', 'ABCD'] } as AssertOp, symtab);
    expect(v).toBeNull();
  });

  it('line-vs-line parallel still works (unchanged behavior)', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'parallel', args: ['AB', 'DC'] } as AssertOp, symtab);
    expect(v).toBeNull();
  });
});

describe('§2.2 perp-repair moves the free endpoint, never a base vertex', () => {
  function baseSquareSymtab() {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(1, 0, 0));
    symtab.points.set('C', vec3(1, 1, 0));
    symtab.points.set('D', vec3(0, 1, 0));
    symtab.namedPlanes.set('ABCD', ['A', 'B', 'C', 'D']);
    return symtab;
  }

  it('with apex-first token order "SA", repair moves S and leaves base vertex A untouched', () => {
    const symtab = baseSquareSymtab();
    symtab.points.set('S', vec3(0.005, 0, Math.sqrt(2))); // apex, slightly off the A-normal
    const violation = verifyAssert({ relation: 'perp', args: ['SA', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
    // A must NOT have been moved off the base plane.
    expect(symtab.points.get('A')).toEqual(vec3(0, 0, 0));
    // S is now exactly on the normal through A, so perp holds.
    const after = verifyAssert({ relation: 'perp', args: ['SA', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(after).toBeNull();
  });
});

describe('§2.6 perp-repair threshold is scale-invariant (dimensionless)', () => {
  function largeSquareSymtab(edge: number) {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(edge, 0, 0));
    symtab.points.set('C', vec3(edge, edge, 0));
    symtab.points.set('D', vec3(0, edge, 0));
    symtab.namedPlanes.set('ABCD', ['A', 'B', 'C', 'D']);
    return symtab;
  }

  it('declines a large angular error even on a large figure (was silently repaired)', () => {
    const edge = 1000;
    const symtab = largeSquareSymtab(edge);
    // Apex tilted ~10° off the A-normal: x-offset = height*tan(10°).
    const height = edge; // same scale as the figure
    const tilt = Math.tan((10 * Math.PI) / 180) * height;
    symtab.points.set('S', vec3(tilt, 0, height));
    const violation = verifyAssert({ relation: 'perp', args: ['AS', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(false);
  });

  it('still repairs genuine numeric noise regardless of figure scale', () => {
    const edge = 1000;
    const symtab = largeSquareSymtab(edge);
    const height = edge;
    // ~0.5° drift — small, real numeric drift (above the 1e-6 verify tolerance, below the
    // repair cap); must be repaired regardless of the figure's absolute scale.
    const tilt = Math.tan((0.5 * Math.PI) / 180) * height;
    symtab.points.set('S', vec3(tilt, 0, height));
    const violation = verifyAssert({ relation: 'perp', args: ['AS', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
  });
});

describe('§2.3 checkDegeneracy allows a derived point that legitimately lands on a vertex', () => {
  it('foot of the apex on the base landing exactly on A does not raise a degenerate violation', () => {
    const plan = PlanSchema.parse({
      solidName: 'S.ABCD',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
        { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: Math.sqrt(2) },
        { op: 'foot', name: 'H', from: 'S', onto: 'plane', target: 'ABCD' }, // H == A by construction
      ],
      asserts: [{ relation: 'on', args: ['H', 'ABCD'] }],
    });
    const symtab = executePlan(plan);
    // H really did land on A:
    expect(symtab.points.get('H')).toEqual(symtab.points.get('A'));
    const result = verifyPlan(plan, symtab);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('two structural (non-derived) points that coincide are still flagged', () => {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(0, 0, 0));
    const violations = checkDegeneracy(symtab);
    expect(violations.some((v) => v.kind === 'degenerate')).toBe(true);
  });
});

describe('§2.4 arePointsCoplanar handles collinear first three points', () => {
  it('returns true when the first three listed points are collinear but all are coplanar', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(0, 1, 0)];
    expect(arePointsCoplanar(pts)).toBe(true);
  });

  it('coplanar assert with collinear-first ordering does not raise a false violation', () => {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(1, 0, 0));
    symtab.points.set('C', vec3(2, 0, 0)); // A,B,C collinear
    symtab.points.set('D', vec3(0, 1, 0));
    const v = verifyAssert({ relation: 'coplanar', args: ['A', 'B', 'C', 'D'] } as AssertOp, symtab);
    expect(v).toBeNull();
  });

  it('still detects a genuinely non-coplanar set', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)];
    expect(arePointsCoplanar(pts)).toBe(false);
  });
});

describe('§2.7 prism op requires base and top to have equal vertex counts', () => {
  it('rejects a prism whose top has fewer vertices than its base', () => {
    expect(() =>
      PlanSchema.parse({
        solidName: 'bad-prism',
        ops: [
          { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
          { op: 'prism', base: ['A', 'B', 'C', 'D'], top: ['A1', 'B1', 'C1'], height: 2 },
        ],
      })
    ).toThrow();
  });

  it('accepts a prism with matching base/top counts', () => {
    expect(() =>
      PlanSchema.parse({
        solidName: 'good-prism',
        ops: [
          { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
          { op: 'prism', base: ['A', 'B', 'C', 'D'], top: ['A1', 'B1', 'C1', 'D1'], height: 2 },
        ],
      })
    ).not.toThrow();
  });
});

describe('§2.5 explicit edge op lets a pyramid declare its lateral edges', () => {
  it('emits SA, SB, SC, SD edges for the flagship S.ABCD pyramid', () => {
    const plan = PlanSchema.parse({
      solidName: 'S.ABCD',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
        { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: Math.sqrt(2) },
        { op: 'edge', from: 'S', to: 'A' },
        { op: 'edge', from: 'S', to: 'B' },
        { op: 'edge', from: 'S', to: 'C' },
        { op: 'edge', from: 'S', to: 'D' },
      ],
    });
    const symtab = executePlan(plan);
    const geo = toGeometryData(symtab, plan.solidName);
    const edgeSet = new Set(geo.lines.map((l) => [l.from, l.to].sort().join('')));
    expect(edgeSet.has('AS')).toBe(true);
    expect(edgeSet.has('BS')).toBe(true);
    expect(edgeSet.has('CS')).toBe(true);
    expect(edgeSet.has('DS')).toBe(true);
  });

  it('rejects an edge op referencing an undefined point', () => {
    const plan = PlanSchema.parse({
      solidName: 'bad-edge',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
        { op: 'edge', from: 'A', to: 'Z' }, // Z never defined
      ],
    });
    expect(() => executePlan(plan)).toThrow();
  });
});
