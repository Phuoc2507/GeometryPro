import { describe, expect, it } from 'vitest';
import { cleanPointLabel } from './pointLabel';

describe('cleanPointLabel', () => {
  it('strips coordinates appended to a vertex name', () => {
    expect(cleanPointLabel('A(8;0)')).toBe('A');
    expect(cleanPointLabel('O(0;0)')).toBe('O');
    expect(cleanPointLabel('M(4; 16/3)')).toBe('M');
  });

  it('strips a trailing description', () => {
    expect(cleanPointLabel('S (đỉnh)')).toBe('S');
    expect(cleanPointLabel('D (máy bay)')).toBe('D');
  });

  it('keeps a bare letter and normalises primes', () => {
    expect(cleanPointLabel('A')).toBe('A');
    expect(cleanPointLabel("A'")).toBe("A'");
    expect(cleanPointLabel('A′')).toBe("A'"); // unicode prime → apostrophe
    expect(cleanPointLabel("B''")).toBe("B''");
  });

  it('rewrites a trailing index as primes (no digits in names)', () => {
    expect(cleanPointLabel('S1')).toBe("S'");
    expect(cleanPointLabel('S_1')).toBe("S'");
    expect(cleanPointLabel('S₁')).toBe("S'");
    expect(cleanPointLabel('A2')).toBe("A''");
    expect(cleanPointLabel('M1')).toBe("M'"); // old figure: at least digit-free & distinct
  });

  it('is safe on empty / whitespace input', () => {
    expect(cleanPointLabel('')).toBe('');
    expect(cleanPointLabel('   ')).toBe('');
  });
});
