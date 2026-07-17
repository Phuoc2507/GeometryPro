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

  it('a√b/c với b lớn: 165√385/196', () => {
    const r = recognizeConstant(165 * Math.sqrt(385) / 196);
    expect(r).not.toBeNull();
    expect(r!.text).toBe('165√385/196');
  });
  it('dạng π: kπ/m và p+qπ', () => {
    expect(recognizeConstant(Math.PI / 3)!.text).toBe('π/3');
    expect(recognizeConstant(2 * Math.PI)!.text).toBe('2π');
    expect(recognizeConstant(1 + Math.PI)!.text).toBe('1 + π');
  });
  it('KHÔNG khớp giả: số ngẫu nhiên vẫn null', () => {
    expect(recognizeConstant(0.7234981123)).toBeNull();
    expect(recognizeConstant(Math.E * 1.37219)).toBeNull();
  });
  it('vẫn giữ các dạng cũ', () => {
    expect(recognizeConstant(Math.sqrt(7))!.text).toBe('√7');
    expect(recognizeConstant(10 - 2 * Math.sqrt(7))!.text).toBe('10 - 2√7');
    expect(recognizeConstant(1.5)!.text).toBe('3/2');
  });
});
