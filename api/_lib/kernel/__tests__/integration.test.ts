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
  it('lăng trụ tam giác đều ABC.A1B1C1: builds foot(midpoint(A1,B1) -> plane ABC) and intersect(two medians)', () => {
    const plan = {
      solidName: 'ABC.A1B1C1',
      ops: [
        { op: 'base', shape: 'triangle', vertices: ['A', 'B', 'C'], dims: { triangleType: 'equilateral', edge: 2 } },
        { op: 'prism', base: ['A', 'B', 'C'], top: ['A1', 'B1', 'C1'], height: 4 },
        { op: 'point', name: 'K', def: { kind: 'midpoint', of: ['A1', 'B1'] } },
        { op: 'foot', name: 'H', from: 'K', onto: 'plane', target: 'ABC' },
        { op: 'point', name: 'M', def: { kind: 'midpoint', of: ['B', 'C'] } },
        { op: 'point', name: 'N', def: { kind: 'midpoint', of: ['A', 'C'] } },
        { op: 'intersect', name: 'G', a: 'AM', b: 'BN' },
      ],
      asserts: [
        { relation: 'on', args: ['H', 'ABC'] },
        { relation: 'on', args: ['G', 'BN'] },
      ],
    };
    const result = runPlan(plan);
    expect(result.verify.ok).toBe(true);
    expect(result.symtab.points.get('H')!.z).toBeCloseTo(0, 8);
  });
});
