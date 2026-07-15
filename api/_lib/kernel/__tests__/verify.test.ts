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
