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
