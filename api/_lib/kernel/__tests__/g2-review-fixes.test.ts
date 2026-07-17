// api/_lib/kernel/__tests__/g2-review-fixes.test.ts
// Regression tests for defects found by the adversarial review of the G2-1/G2-2 foundation.
import { describe, it, expect } from 'vitest';
import { makeExact, mulExact, divExact, sqrtExact, addExact, mul, fromExact, displayExact } from '../scalar';
import { parseRational } from '../dialects/oxyzInput';
import { executeOxyzPlan } from '../dialects/oxyz';
import { UnifiedPlanSchema, executeUnifiedPlan } from '../unifiedPlan';

describe('§2.3/2.4 exact arithmetic guards against radicand overflow / CPU blowup', () => {
  it('mulExact returns null when the radicand product exceeds the safe cap', () => {
    // Directly constructed Exacts (need not be canonical) to hit the guard threshold.
    const a = { num: 1n, den: 1n, radicand: 2000000 };
    const b = { num: 1n, den: 1n, radicand: 2000000 }; // product 4e12 > 1e12 cap
    expect(mulExact(a, b)).toBeNull();
  });

  it('divExact returns null when the radicand product exceeds the safe cap', () => {
    const a = { num: 1n, den: 1n, radicand: 2000000 };
    const b = { num: 1n, den: 1n, radicand: 2000000 };
    expect(divExact(a, b)).toBeNull();
  });

  it('sqrtExact returns null (no CPU blowup) for a huge radicand rational', () => {
    expect(sqrtExact(makeExact(2000000000000n, 1n))).toBeNull(); // radicand 2e12 > cap
  });

  it('small radicands still compute exactly (√2·√6 = 2√3)', () => {
    expect(mulExact(makeExact(1n, 1n, 2), makeExact(1n, 1n, 6))).toEqual(makeExact(2n, 1n, 3));
  });

  it('Scalar mul over the cap falls back to float (exact null, approx correct)', () => {
    const s = mul(fromExact({ num: 1n, den: 1n, radicand: 2000000 }), fromExact({ num: 1n, den: 1n, radicand: 2000000 }));
    expect(s.exact).toBeNull();
    expect(s.approx).toBeCloseTo(2000000, 0);
  });
});

describe('§2 exact arithmetic — extra field-closure coverage', () => {
  it('√6 / √2 = √3 (division stays in the field)', () => {
    expect(divExact(makeExact(1n, 1n, 6), makeExact(1n, 1n, 2))).toEqual(makeExact(1n, 1n, 3));
  });
  it('√2 + √3 leaves the field ⇒ null', () => {
    expect(addExact(makeExact(1n, 1n, 2), makeExact(1n, 1n, 3))).toBeNull();
  });
  it('negative surd displays correctly', () => {
    expect(displayExact(makeExact(-1n, 1n, 2))).toBe('-√2');
  });
});

describe('§2.2/2.5/2.6 parseRational rejects malformed / unsafe input', () => {
  it('rejects a fraction with extra segments "1/2/3"', () => {
    expect(() => parseRational('1/2/3')).toThrow();
  });
  it('rejects an empty numerator "/2"', () => {
    expect(() => parseRational('/2')).toThrow();
  });
  it('rejects a non-numeric fraction part "a/2"', () => {
    expect(() => parseRational('a/2')).toThrow();
  });
  it('rejects a zero denominator "3/0"', () => {
    expect(() => parseRational('3/0')).toThrow();
  });
  it('rejects an unsafe large integer number (must pass as string)', () => {
    expect(() => parseRational(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
  it('still accepts a well-formed fraction "-7/4"', () => {
    expect(parseRational('-7/4')).toEqual(makeExact(-7n, 4n, 1));
  });
});

describe('§3.4/3.5 Oxyz dedup: redefining a named line/plane/sphere throws', () => {
  it('two oxyz_line with the same name throws instead of silently overwriting', () => {
    expect(() =>
      executeOxyzPlan([
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
        { op: 'oxyz_line', name: 'd', by: { form: 'two_points', a: 'A', b: 'B' } },
        { op: 'oxyz_line', name: 'd', by: { form: 'two_points', a: 'A', b: 'C' } },
      ])
    ).toThrow();
  });
});

describe('§3.7 Oxyz derived points are marked in derivedPoints', () => {
  it('a midpoint is recorded as derived (so degeneracy handling matches the synthetic dialect)', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
      { op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' },
    ]);
    expect(et.derivedPoints.has('M')).toBe(true);
    expect(et.derivedPoints.has('A')).toBe(false); // a declared point is NOT derived
  });
});

describe('§2.1 unified plan rejects cross-dialect point-name collisions', () => {
  it('synthetic op that reuses an Oxyz point name throws (no silent inconsistent table)', () => {
    expect(() =>
      executeUnifiedPlan(
        UnifiedPlanSchema.parse({
          solidName: 'clash',
          ops: [
            { op: 'oxyz_point', name: 'A', at: [0, 0, 10] },
            { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } },
          ],
        })
      )
    ).toThrow();
  });

  it('Oxyz op that reuses a synthetic point name throws', () => {
    expect(() =>
      executeUnifiedPlan(
        UnifiedPlanSchema.parse({
          solidName: 'clash2',
          ops: [
            { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } },
            { op: 'oxyz_point', name: 'A', at: [0, 0, 10] },
          ],
        })
      )
    ).toThrow();
  });

  it('distinct names across dialects still work', () => {
    const et = executeUnifiedPlan(
      UnifiedPlanSchema.parse({
        solidName: 'ok',
        ops: [
          { op: 'base', shape: 'square', vertices: ['P', 'Q', 'R', 'T'], dims: { edge: 2 } },
          { op: 'oxyz_point', name: 'A', at: [3, 4, 0] },
        ],
      })
    );
    expect(et.points.size).toBe(5);
  });
});

describe('§3.3 sphereFromEquation with a fractional center (exact)', () => {
  it('x²+y²+z² −x −y −z = 0 ⇒ center (1/2,1/2,1/2), R²=3/4', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_sphere', name: 'S', by: { form: 'equation', a: -1, b: -1, c: -1, d: 0 } },
    ]);
    const S = et.spheres.get('S')!;
    expect(S.center.x.exact).toEqual(makeExact(1n, 2n, 1));
    expect(S.r2.exact).toEqual(makeExact(3n, 4n, 1));
  });
});
