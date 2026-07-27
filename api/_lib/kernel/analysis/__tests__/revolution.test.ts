import { describe, it, expect } from 'vitest';
import { evalProfile, revolutionVolumeDisk } from '../revolution';

describe('evalProfile', () => {
  it('poly: c0 + c1·x + c2·x²', () => {
    expect(evalProfile({ kind: 'poly', coeffs: [1, 2, 3] }, 2)).toBeCloseTo(1 + 4 + 12, 12);
  });
  it('sqrt: a·√x + b', () => {
    expect(evalProfile({ kind: 'sqrt', a: 2, b: 1 }, 9)).toBeCloseTo(7, 12);
  });
  it('const', () => {
    expect(evalProfile({ kind: 'const', c: 5 }, 123)).toBe(5);
  });
});

describe('revolutionVolumeDisk', () => {
  it('y=√x quay quanh Ox trên [0,4] → 8π', () => {
    const { value, estimatedError } = revolutionVolumeDisk(
      { kind: 'sqrt', a: 1, b: 0 },
      [0, 4],
    );
    expect(value).toBeCloseTo(8 * Math.PI, 6);
    expect(estimatedError).toBeLessThan(1e-6);
  });
});
