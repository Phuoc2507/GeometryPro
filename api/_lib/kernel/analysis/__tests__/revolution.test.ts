import { describe, it, expect } from 'vitest';
import { evalProfile, revolutionVolumeDisk, buildRevolutionSolidOx } from '../revolution';

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

describe('buildRevolutionSolidOx', () => {
  it('gói khối với volume đã verified + latex', () => {
    const s = buildRevolutionSolidOx('rev1', { kind: 'sqrt', a: 1, b: 0 }, [0, 4], '#6366f1');
    expect(s.id).toBe('rev1');
    expect(s.axis).toBe('Ox');
    expect(s.method).toBe('disk');
    expect(s.domain).toEqual([0, 4]);
    expect(s.color).toBe('#6366f1');
    expect(s.volume?.value).toBeCloseTo(8 * Math.PI, 6);
    expect(s.volume?.verified).toBe(true);
    expect(s.volume?.latex).toContain('\\pi');
    expect(s.volume?.latex).toContain('\\int');
  });
});
