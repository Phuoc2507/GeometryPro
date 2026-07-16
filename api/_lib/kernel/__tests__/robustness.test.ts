// api/_lib/kernel/__tests__/robustness.test.ts
// Robustness improvements from review group §3 (code was correct for the current domain;
// these lock in scale-invariance, degeneracy guards, and wider exact-form recognition).
import { describe, it, expect } from 'vitest';
import { areCollinear, angleBetween, vec3 } from '../vecMath';
import { extrudePyramidApex } from '../ops/extrude';
import { intersectLineLine } from '../ops/points';
import { toExactForm } from '../exactForm';
import { PlanSchema, QuerySchema } from '../planSchema';

describe('§3 areCollinear is scale-invariant', () => {
  it('a well-proportioned small triangle is NOT collinear (raw-area test would misflag it)', () => {
    // cross-product magnitude here is 8e-7 (< the old 1e-6 area threshold) but the angle is large.
    const a = vec3(0, 0, 0);
    const b = vec3(0.001, 0, 0);
    const c = vec3(0.0005, 0.0008, 0);
    expect(areCollinear(a, b, c)).toBe(false);
  });

  it('still flags a genuinely collinear triple at any scale', () => {
    expect(areCollinear(vec3(0, 0, 0), vec3(1000, 0, 0), vec3(2000, 0, 0))).toBe(true);
  });
});

describe('§3 intersectLineLine parallel gate is scale-invariant', () => {
  it('finds the intersection of two small-magnitude non-parallel lines (was falsely "parallel")', () => {
    // Two short segments (~0.03 long) crossing at a real point; the raw |d1×d2|² is ~2e-7,
    // below the old absolute 1e-6 gate, so this used to be wrongly rejected as parallel.
    const p = intersectLineLine(
      vec3(0, 0, 0), vec3(0.03, 0, 0),
      vec3(0.015, -0.015, 0), vec3(0.015, 0.015, 0)
    );
    expect(p.x).toBeCloseTo(0.015, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });

  it('still throws for genuinely parallel small-magnitude lines', () => {
    expect(() =>
      intersectLineLine(vec3(0, 0, 0), vec3(0.03, 0, 0), vec3(0, 0.01, 0), vec3(0.03, 0.01, 0))
    ).toThrow();
  });
});

describe('§3 angleBetween guards against degenerate (zero-length) vectors', () => {
  it('throws instead of silently returning NaN', () => {
    expect(() => angleBetween(vec3(0, 0, 0), vec3(1, 0, 0))).toThrow();
  });

  it('unaffected for normal vectors', () => {
    expect(angleBetween(vec3(1, 0, 0), vec3(0, 1, 0))).toBeCloseTo(90, 8);
  });
});

describe('§3 extrudePyramidApex offsets along the base normal (relative, not absolute z)', () => {
  it('places the apex height units above a base that does not sit on z=0', () => {
    // Square base lifted to z=5 (e.g. reused prism top face).
    const base = [vec3(-1, -1, 5), vec3(1, -1, 5), vec3(1, 1, 5), vec3(-1, 1, 5)];
    const apex = extrudePyramidApex(base, 3);
    expect(apex.x).toBeCloseTo(0, 10);
    expect(apex.y).toBeCloseTo(0, 10);
    expect(apex.z).toBeCloseTo(8, 10); // 5 + 3, not the old absolute 3
  });
});

describe('§3 toExactForm recognizes larger exact values', () => {
  it('recognizes a large exact integer (cube volume 512)', () => {
    const r = toExactForm(512);
    expect(r.isExact).toBe(true);
    expect(r.text).toBe('512');
  });

  it('recognizes 36√3 (area of an equilateral triangle with edge 12)', () => {
    const r = toExactForm(36 * Math.sqrt(3));
    expect(r.isExact).toBe(true);
    expect(r.text).toBe('36√3');
  });

  it('canonicalizes 32√2 with a square-free radicand, not 16√8', () => {
    const r = toExactForm(32 * Math.sqrt(2));
    expect(r.isExact).toBe(true);
    expect(r.text).toBe('32√2');
  });

  it('still flags a value with no clean closed form (π)', () => {
    const r = toExactForm(Math.PI);
    expect(r.isExact).toBe(false);
  });
});

describe('§3 schema hardening', () => {
  it('rejects a distance query with no operands', () => {
    expect(() => QuerySchema.parse({ kind: 'distance' })).toThrow();
  });

  it('accepts a well-formed distance query', () => {
    expect(() => QuerySchema.parse({ kind: 'distance', a: 'A', b: 'B' })).not.toThrow();
  });

  it('accepts a well-formed volume query', () => {
    expect(() => QuerySchema.parse({ kind: 'volume', target: 'S.ABCD' })).not.toThrow();
  });

  it('rejects a reg_polygon with an absurd side count', () => {
    expect(() =>
      PlanSchema.parse({
        solidName: 'ngon',
        ops: [
          {
            op: 'base',
            shape: 'reg_polygon',
            vertices: Array.from({ length: 100 }, (_, i) => `A${i}`),
            dims: { n: 100, edge: 1 },
          },
        ],
      })
    ).toThrow();
  });
});
