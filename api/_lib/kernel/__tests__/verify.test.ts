// api/_lib/kernel/__tests__/verify.test.ts
import { describe, it, expect } from 'vitest';
import { verifyPlan, verifyAssert, checkDegeneracy } from '../verify';
import { executePlan, createEmptySymbolTable } from '../execute';
import { PlanSchema, type AssertOp } from '../planSchema';
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
    const v = verifyAssert({ relation: 'parallel', args: ['AB', 'DC'] } as AssertOp, symtab);
    expect(v).toBeNull();
  });

  it('coplanar: all 4 square vertices are coplanar', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'coplanar', args: ['A', 'B', 'C', 'D'] } as AssertOp, symtab);
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
    const v = verifyAssert({ relation: 'on', args: ['M', 'AB'] } as AssertOp, symtab);
    expect(v).toBeNull();
  });

  it('angle: perpendicular lines report a 90 degree violation-free assert', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'angle', args: ['AB', 'AD'], value: 90 } as AssertOp, symtab);
    expect(v).toBeNull();
  });

  it('dist: wrong expected distance produces a violation with actual value reported', () => {
    const symtab = squareSymtab();
    const v = verifyAssert({ relation: 'dist', args: ['A', 'B'], value: 99 } as AssertOp, symtab);
    expect(v).not.toBeNull();
    expect(v!.actual).toBeCloseTo(2, 8);
    expect(v!.expected).toBe(99);
  });

  it('angle: two face diagonals of a unit cube sharing a vertex meet at 60 degrees (line-line, hand-verified)', () => {
    const symtab = createEmptySymbolTable();
    symtab.points.set('A', vec3(0, 0, 0));
    symtab.points.set('B', vec3(1, 0, 0));
    symtab.points.set('C', vec3(1, 1, 0));
    symtab.points.set('D', vec3(0, 1, 0));
    symtab.points.set('E', vec3(0, 0, 1));
    symtab.points.set('F', vec3(1, 0, 1));
    symtab.points.set('G', vec3(1, 1, 1));
    symtab.points.set('H', vec3(0, 1, 1));
    // AC = (1,1,0) is the bottom-face diagonal from A; AF = (1,0,1) is the front-face
    // diagonal from A. cos(theta) = (AC.AF)/(|AC||AF|) = 1/(sqrt(2)*sqrt(2)) = 1/2 => theta = 60deg.
    const v = verifyAssert({ relation: 'angle', args: ['AC', 'AF'], value: 60 } as AssertOp, symtab);
    expect(v).toBeNull();
  });
});

describe('verifyAssert — near-vertical plane normal sign does not affect perp/on/dist checks', () => {
  it('perp, on, and dist checks agree regardless of which vertex order registered the (near-vertical) plane', () => {
    const symtab = createEmptySymbolTable();
    symtab.points.set('P', vec3(0, 0, 0));
    symtab.points.set('Q', vec3(1, 0, 0));
    symtab.points.set('R', vec3(0, 0, 1));
    symtab.points.set('S', vec3(0, 0, 0));
    symtab.points.set('T', vec3(0, 5, 0));
    // PQR and PRQ describe the exact same geometric plane (y=0), but swapping the last
    // two vertices flips the raw cross-product sign; since z=0 for both orderings, the
    // +z-flip heuristic in planeNormal does NOT kick in, so these two named planes end up
    // with genuinely opposite-signed normals: (0,-1,0) vs (0,1,0).
    symtab.namedPlanes.set('PQR', ['P', 'Q', 'R']);
    symtab.namedPlanes.set('PRQ', ['P', 'R', 'Q']);

    // ST (direction (0,5,0)) is perpendicular to the y=0 plane, regardless of naming order.
    expect(verifyAssert({ relation: 'perp', args: ['ST', 'PQR'] } as AssertOp, symtab)).toBeNull();
    expect(verifyAssert({ relation: 'perp', args: ['ST', 'PRQ'] } as AssertOp, symtab)).toBeNull();

    // The midpoint of PQ lies in the y=0 plane, regardless of naming order.
    symtab.points.set('M', vec3(0.5, 0, 0));
    expect(verifyAssert({ relation: 'on', args: ['M', 'PQR'] } as AssertOp, symtab)).toBeNull();
    expect(verifyAssert({ relation: 'on', args: ['M', 'PRQ'] } as AssertOp, symtab)).toBeNull();

    // dist from an off-plane point is identical regardless of which normal sign is used internally.
    symtab.points.set('X', vec3(0, 3, 0));
    const distPQR = verifyAssert({ relation: 'dist', args: ['X', 'PQR'], value: 0 } as AssertOp, symtab);
    const distPRQ = verifyAssert({ relation: 'dist', args: ['X', 'PRQ'], value: 0 } as AssertOp, symtab);
    expect(distPQR!.actual).toBeCloseTo(3, 10);
    expect(distPRQ!.actual).toBeCloseTo(3, 10);
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
