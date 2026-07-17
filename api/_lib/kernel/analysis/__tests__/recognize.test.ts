import { describe, it, expect } from 'vitest';
import { recognizeConstant } from '../recognize';

describe('recognizeConstant', () => {
  it('hữu tỉ', () => {
    expect(recognizeConstant(1.5)!.text).toBe('3/2');
    expect(recognizeConstant(4)!.text).toBe('4');
  });

  it('một căn a√b/c', () => {
    expect(recognizeConstant(Math.sqrt(7))!.text).toBe('√7');
    expect(recognizeConstant(Math.sqrt(3) / 2)!.text).toBe('√3/2');
    expect(recognizeConstant(2 * Math.sqrt(3))!.text).toBe('2√3');
  });

  it('nhị thức p+q√r (Câu 9: 10−2√7)', () => {
    const r = recognizeConstant(10 - 2 * Math.sqrt(7));
    expect(r).not.toBeNull();
    expect(r!.text).toBe('10 - 2√7');
    expect(r!.value).toBeCloseTo(4.7085, 4);
  });

  it('số không nhận dạng được → null', () => {
    expect(recognizeConstant(Math.PI * 1.234567)).toBeNull();
  });
});
