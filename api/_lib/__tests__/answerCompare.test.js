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

  // Ba dạng dưới đây trước đây đều trả null ⇒ vừa không viết được golden, vừa khiến
  // cross-check ở production im lặng bỏ qua đáp thay vì đối chiếu.
  it('toNumeric: đọc hạng π', () => {
    expect(toNumeric('π')).toBeCloseTo(Math.PI, 9);
    expect(toNumeric('16π')).toBeCloseTo(16 * Math.PI, 9);
    expect(toNumeric('32π/3')).toBeCloseTo(32 * Math.PI / 3, 9);
    expect(toNumeric('-π/2')).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('toNumeric: đọc tích chưa rút gọn (engine trả diện tích mặt cầu dạng "4π·4")', () => {
    expect(toNumeric('4π·4')).toBeCloseTo(16 * Math.PI, 9);
    expect(toNumeric('2·3')).toBeCloseTo(6, 9);
    expect(toNumeric('4π·x')).toBeNull();   // thừa số không đọc được ⇒ cả hạng tử null
  });

  it('toNumeric: bỏ ký hiệu độ ở đáp góc', () => {
    expect(toNumeric('90°')).toBe(90);
    expect(toNumeric('45°')).toBe(45);
    expect(toNumeric('-30°')).toBe(-30);
  });

  it('không phá các dạng đã đọc được từ trước', () => {
    expect(toNumeric('√2')).toBeCloseTo(Math.SQRT2, 9);
    expect(toNumeric('2√39/13')).toBeCloseTo(2 * Math.sqrt(39) / 13, 9);
    expect(toNumeric('10-2√7')).toBeCloseTo(10 - 2 * Math.sqrt(7), 9);
    expect(toNumeric('16/3')).toBeCloseTo(16 / 3, 9);
    expect(toNumeric('7.02')).toBeCloseTo(7.02, 9);
    expect(toNumeric('không phải số')).toBeNull();
  });
});
