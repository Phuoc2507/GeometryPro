// api/_lib/kernel/__tests__/execute.test.ts
import { describe, it, expect } from 'vitest';
import { executePlan, createEmptySymbolTable, executeOp } from '../execute';
import { PlanSchema, type ConstructionOp } from '../planSchema';
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
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } } as ConstructionOp,
        symtab
      )
    ).not.toThrow();
    expect(() =>
      executeOp(
        { op: 'point', name: 'A', def: { kind: 'midpoint', of: ['B', 'C'] } } as ConstructionOp,
        symtab
      )
    ).toThrow(/already defined/);
  });

  it('throws a clear error referencing an unknown point', () => {
    const symtab = createEmptySymbolTable();
    expect(() =>
      executeOp({ op: 'point', name: 'M', def: { kind: 'midpoint', of: ['X', 'Y'] } } as ConstructionOp, symtab)
    ).toThrow(/Unknown point "X"/);
  });
});
