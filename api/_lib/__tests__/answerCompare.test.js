import { describe, it, expect } from 'vitest';
import { toNumeric, answersAgree } from '../answerCompare.js';
describe('answerCompare', () => {
  it('toNumeric: đọc số từ text đáp engine', () => {
    expect(toNumeric('√2')).toBeCloseTo(Math.SQRT2, 6);
    expect(toNumeric('2√39/13')).toBeCloseTo(2 * Math.sqrt(39) / 13, 6);
    expect(toNumeric('16/3')).toBeCloseTo(16 / 3, 6);
    expect(toNumeric('7.02')).toBeCloseTo(7.02, 6);
    expect(toNumeric('không phải số')).toBeNull();
  });
  it('answersAgree: khớp trong dung sai tương đối', () => {
    expect(answersAgree('√2', 1.41421356, 1e-3)).toBe(true);
    expect(answersAgree('√2', 2.0, 1e-3)).toBe(false);
    expect(answersAgree('không phải số', 1, 1e-3)).toBeNull(); // không so được
  });
});
