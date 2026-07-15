// api/_lib/kernel/__tests__/exactForm.test.ts
import { describe, it, expect } from 'vitest';
import { toExactForm } from '../exactForm';

/** Test-only helper: parses "p", "p/q", "√n", "p√n", "p√n/q", with optional leading "-". */
function parseBack(text: string): number {
  const m = text.match(/^(-)?(\d+)?(?:√(\d+))?(?:\/(\d+))?$/);
  if (!m) throw new Error(`Cannot parse exact-form text for test verification: "${text}"`);
  const sign = m[1] ? -1 : 1;
  const p = m[2] ? Number(m[2]) : 1;
  const n = m[3] ? Math.sqrt(Number(m[3])) : 1;
  const q = m[4] ? Number(m[4]) : 1;
  return (sign * p * n) / q;
}

describe('toExactForm', () => {
  it('recognizes an exact integer', () => {
    const r = toExactForm(45);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(45, 6);
  });

  it('recognizes an exact simple fraction', () => {
    const r = toExactForm(1.5);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(1.5, 6);
  });

  it('recognizes sqrt(2)', () => {
    const r = toExactForm(Math.sqrt(2));
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(Math.sqrt(2), 4);
  });

  it('recognizes sqrt(6)/3 (a common distance-to-plane answer)', () => {
    const r = toExactForm(Math.sqrt(6) / 3);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(Math.sqrt(6) / 3, 4);
  });

  it('recognizes 2*sqrt(3)/3', () => {
    const r = toExactForm((2 * Math.sqrt(3)) / 3);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo((2 * Math.sqrt(3)) / 3, 4);
  });

  it('handles negative values, preserving sign through the round trip', () => {
    const r = toExactForm(-1.5);
    expect(r.isExact).toBe(true);
    expect(parseBack(r.text)).toBeCloseTo(-1.5, 6);
  });

  it('treats values within eps of zero as exact zero', () => {
    const r = toExactForm(0.00000001);
    expect(r.isExact).toBe(true);
    expect(r.text).toBe('0');
  });

  it('falls back to a flagged decimal for a value with no clean closed form in the search space', () => {
    const r = toExactForm(Math.PI);
    expect(r.isExact).toBe(false);
    expect(Number(r.text)).toBeCloseTo(Math.PI, 3);
  });

  it('value field always echoes the original input', () => {
    const r = toExactForm(7.25);
    expect(r.value).toBe(7.25);
  });
});
