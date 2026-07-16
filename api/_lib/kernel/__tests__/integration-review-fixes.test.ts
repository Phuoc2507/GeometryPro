// api/_lib/kernel/__tests__/integration-review-fixes.test.ts
// Regression tests for defects found by the whole-engine INTEGRATION review.
import { describe, it, expect } from 'vitest';
import { run } from '../run';
import { computeQuery } from '../compute/query';
import { verifyAssertE } from '../verifyE';
import { createEmptyEntityTable } from '../entityTable';
import { planeFromCoeffs } from '../entities';
import { num, makeExact } from '../scalar';
import type { AssertOp } from '../planSchema';

const PTS = (extra: object[] = []) => [
  { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
  { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
  { op: 'oxyz_point', name: 'E', at: [0, 1, 0] },
  { op: 'oxyz_point', name: 'S', at: [0, 0, 1] },
  { op: 'oxyz_point', name: 'C', at: [1, 1, 0] },
  { op: 'oxyz_plane', name: 'BASE', by: { form: 'three_points', a: 'A', b: 'B', c: 'E' } }, // z=0
  ...extra,
];

describe('§2.1 on(line, plane) means CONTAINMENT, not just intersection', () => {
  it('a line that only pierces the base is NOT "on" it → violation', () => {
    const res = run({ solidName: 't', ops: PTS(), asserts: [{ relation: 'on', args: ['SC', 'BASE'] }] });
    expect(res.ok).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });
  it('a line lying in the base IS "on" it → no violation', () => {
    const res = run({ solidName: 't', ops: PTS(), asserts: [{ relation: 'on', args: ['AB', 'BASE'] }] });
    expect(res.violations).toHaveLength(0);
    expect(res.errors).toHaveLength(0);
  });
});

describe('§3.2 an un-evaluable assert becomes an ERROR, not a false violation', () => {
  it('perp between two points → errors (cannot evaluate), not a violation', () => {
    const res = run({ solidName: 't', ops: PTS(), asserts: [{ relation: 'perp', args: ['A', 'B'] }] });
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.violations).toHaveLength(0);
  });
});

describe('§2.5 Oxyz point names use the strict grammar (no multi-letter names)', () => {
  it('an oxyz_point named "BC" is rejected at schema time', () => {
    const res = run({ solidName: 't', ops: [{ op: 'oxyz_point', name: 'BC', at: [0, 0, 0] }] });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe('§2.6 a name cannot be reused across entity kinds', () => {
  it('naming a line the same as an existing point → error', () => {
    const res = run({
      solidName: 't',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_line', name: 'A', by: { form: 'two_points', a: 'A', b: 'B' } },
      ],
    });
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe('§2.7 a compound "ABCD" whose points are not coplanar → error, not a silent wrong plane', () => {
  it('equation of a non-coplanar compound face fails cleanly', () => {
    const res = run({
      solidName: 't',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
        { op: 'oxyz_point', name: 'D', at: [0, 0, 1] }, // NOT coplanar with A,B,C
      ],
      queries: [{ kind: 'equation', target: 'ABCD' }],
    });
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe('§3.3 area(triangle) with != 3 points is rejected', () => {
  it('triangle area with 4 points → {ok:false}', () => {
    const et = createEmptyEntityTable();
    const res = computeQuery({ kind: 'area', shape: 'triangle', points: ['A', 'B', 'C', 'D'] }, et);
    expect(res.ok).toBe(false);
  });
});

describe('§2.4 volume ratio is reachable through the query dispatcher', () => {
  it('ratio of two tetrahedra = 1/8, exact', () => {
    const res = run({
      solidName: 't',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'X', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'Y', at: [0, 1, 0] },
        { op: 'oxyz_point', name: 'Z', at: [0, 0, 1] },
        { op: 'oxyz_point', name: 'P', at: [2, 0, 0] },
        { op: 'oxyz_point', name: 'Q', at: [0, 2, 0] },
        { op: 'oxyz_point', name: 'R', at: [0, 0, 2] },
      ],
      queries: [{
        kind: 'volume_ratio',
        a: { solid: 'tetrahedron', points: ['A', 'X', 'Y', 'Z'] },
        b: { solid: 'tetrahedron', points: ['A', 'P', 'Q', 'R'] },
      }],
    });
    expect(res.ok).toBe(true);
    const r = res.answers.find((a) => a.kind === 'ratio');
    expect(r).toBeDefined();
    if (r && 'exact' in r) expect(r.exact).toEqual(makeExact(1n, 8n, 1)); // (1/6)/(4/3)
  });
});

describe('§2.3 equation answer carries an approximate flag', () => {
  it('a float-only plane equation is flagged approximate', () => {
    const et = createEmptyEntityTable();
    et.planes.set('F', planeFromCoeffs(num(1), num(-2), num(3), num(-4))); // float coeffs
    const res = computeQuery({ kind: 'equation', target: 'F' }, et);
    expect(res.ok).toBe(true);
    if (res.ok && res.answer.kind === 'equation') expect(res.answer.approximate).toBe(true);
  });
});

describe('existing verifyE point-on-plane path unaffected', () => {
  it('point on plane still verified via distance', () => {
    const et = createEmptyEntityTable();
    const plan = { relation: 'on', args: ['A', 'P'] } as AssertOp;
    // Reuse a minimal scene where A lies on plane P.
    const built = run({
      solidName: 't',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
        { op: 'oxyz_plane', name: 'P', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
      ],
      asserts: [{ relation: 'on', args: ['A', 'P'] }],
    });
    expect(built.violations).toHaveLength(0);
    expect(verifyAssertE(plan, et.points.size ? et : built.entities)).toBeNull();
  });
});
