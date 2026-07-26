import { describe, it, expect } from 'vitest';
import { makeLabel } from '../geometryBuilder.js';

describe('makeLabel', () => {
  it("turns the 'p' prime convention into an apostrophe", () => {
    expect(makeLabel('Ap', ['A', 'Ap'])).toBe("A'");
    expect(makeLabel('Bp', ['B', 'Bp'])).toBe("B'");
  });

  it("turns a solid's top vertex A1 into A' when the base vertex exists", () => {
    const ids = ['A', 'B', 'C', 'A1', 'B1', 'C1'];
    expect(makeLabel('A1', ids)).toBe("A'");
    expect(makeLabel('B1', ids)).toBe("B'");
  });

  it('keeps genuine numbered points that are not solid tops', () => {
    // Special-point letters never become primes.
    expect(makeLabel('M1', ['M', 'M1'])).toBe('M1');
    expect(makeLabel('H2', ['H', 'H2'])).toBe('H2');
    // A1 with no base "A" is a real numbered point, not a prime.
    expect(makeLabel('A1', ['A1', 'A2'])).toBe('A1');
  });

  it('leaves bare letters and midpoints untouched', () => {
    expect(makeLabel('A', ['A', 'B'])).toBe('A');
    expect(makeLabel('M', ['A', 'M'])).toBe('M');
    expect(makeLabel('S', ['S', 'A'])).toBe('S');
  });
});
