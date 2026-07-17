// api/_lib/kernel/__tests__/e2e-flagship.test.ts
// End-to-end integration: a real exam problem coordinatized and solved through run().
// Chóp S.ABCD, đáy vuông cạnh 2, SA ⊥ (ABCD), SA = 2.
// Hand-verified answers: d(A,(SCD)) = √2 ; V(S.ABCD) = 8/3 ; SA ⊥ đáy.
import { describe, it, expect } from 'vitest';
import { run } from '../run';
import { makeExact } from '../scalar';

describe('end-to-end: flagship pyramid S.ABCD solved via run()', () => {
  const plan = {
    solidName: 'S.ABCD',
    ops: [
      { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
      { op: 'oxyz_point', name: 'C', at: [2, 2, 0] },
      { op: 'oxyz_point', name: 'D', at: [0, 2, 0] },
      { op: 'oxyz_point', name: 'S', at: [0, 0, 2] },
      { op: 'oxyz_plane', name: 'BASE', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
      { op: 'oxyz_plane', name: 'SCD', by: { form: 'three_points', a: 'S', b: 'C', c: 'D' } },
    ],
    asserts: [
      { relation: 'perp', args: ['AS', 'BASE'] }, // SA ⊥ đáy
      { relation: 'on', args: ['A', 'BASE'] }, // A thuộc đáy
    ],
    queries: [
      { kind: 'distance', a: 'A', b: 'SCD' }, // d(A,(SCD)) = √2
      { kind: 'volume', solid: 'pyramid', points: ['A', 'B', 'C', 'D'], apex: 'S' }, // V = 8/3
    ],
  };

  it('runs clean (no violations, no errors)', () => {
    const res = run(plan);
    expect(res.errors).toHaveLength(0);
    expect(res.violations).toHaveLength(0);
    expect(res.ok).toBe(true);
  });

  it('distance A to plane (SCD) = √2, exact', () => {
    const res = run(plan);
    const d = res.answers.find((a) => a.kind === 'distance');
    expect(d).toBeDefined();
    if (d && d.kind === 'distance') {
      expect(d.exact).toEqual(makeExact(1n, 1n, 2)); // √2
      expect(d.text).toBe('√2');
      expect(d.approximate).toBe(false);
    }
  });

  it('volume S.ABCD = 8/3, exact', () => {
    const res = run(plan);
    const v = res.answers.find((a) => a.kind === 'volume');
    expect(v).toBeDefined();
    if (v && v.kind === 'volume') {
      expect(v.exact).toEqual(makeExact(8n, 3n, 1)); // 8/3
      expect(v.text).toBe('8/3');
    }
  });

  it('a WRONG assert is caught as a violation, not silently accepted', () => {
    const bad = { ...plan, asserts: [{ relation: 'perp', args: ['AB', 'BASE'] }] }; // AB lies IN the base, not ⊥
    const res = run(bad);
    expect(res.ok).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });
});
