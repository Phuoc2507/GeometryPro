import { describe, it, expect } from 'vitest';
import {
  parseScalar, canonicalScalar, parsePoint, parsePlane, parseRatioExact,
} from '../normalize';

describe('parseScalar — đọc biểu thức vô hướng về SỐ', () => {
  it('đọc phân số và thập phân', () => {
    expect(parseScalar('1/2')).toBeCloseTo(0.5, 10);
    expect(parseScalar('0.8164')).toBeCloseTo(0.8164, 10);
    expect(parseScalar('3/2')).toBeCloseTo(1.5, 10);
  });

  it('đọc căn viết bằng "sqrt", "√" và "căn"', () => {
    expect(parseScalar('sqrt(6)/3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
    expect(parseScalar('√6/3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
    expect(parseScalar('căn 6 / 3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
  });

  it('hiểu phép nhân ngầm: 2√3 = 2*sqrt(3)', () => {
    expect(parseScalar('2√3')).toBeCloseTo(2 * Math.sqrt(3), 10);
    expect(parseScalar('sqrt(12)')).toBeCloseTo(Math.sqrt(12), 10);
  });

  it('thay biến chữ (vd a) bằng giá trị dò mặc định 1', () => {
    expect(parseScalar('a*sqrt(6)/3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
  });

  it('đọc dấu ":" của tỉ số như phép chia', () => {
    expect(parseScalar('1:2')).toBeCloseTo(0.5, 10);
  });

  it('chuỗi rác → null', () => {
    expect(parseScalar('không phải số')).toBeNull();
    expect(parseScalar('')).toBeNull();
    expect(parseScalar('1/0')).toBeNull(); // vô cực → không hợp lệ
  });
});

describe('canonicalScalar — quy về chuỗi chuẩn của engine', () => {
  it('các cách viết cùng một số cho cùng chuỗi chuẩn', () => {
    expect(canonicalScalar('√6/3')).toBe('√6/3');
    expect(canonicalScalar('sqrt(6)/3')).toBe('√6/3');
    expect(canonicalScalar('2√3')).toBe('2√3');
    expect(canonicalScalar('sqrt(12)')).toBe('2√3');
    expect(canonicalScalar('1/2')).toBe('1/2');
    expect(canonicalScalar('0.5')).toBe('1/2');
  });
  it('đọc được LaTeX model hay xuất: \\dfrac{\\sqrt{6}}{3}', () => {
    // \boxed thường bọc LaTeX; phần này kiểm bộ khử LaTeX lồng ngoặc trong toEvalString.
    expect(canonicalScalar('\\dfrac{\\sqrt{6}}{3}')).toBe('√6/3');
    expect(canonicalScalar('\\frac{1}{\\sqrt{2}}')).toBe('√2/2');
    expect(canonicalScalar('2\\sqrt{3}')).toBe('2√3');
  });
  it('chuỗi rác → null', () => {
    expect(canonicalScalar('xyz')).toBeNull();
  });
});

describe('parsePoint — đọc tọa độ điểm/vector', () => {
  it('đọc "(1,2,3)" và "(1, 2, 3)" như nhau', () => {
    expect(parsePoint('(1,2,3)')).toEqual([1, 2, 3]);
    expect(parsePoint('(1, 2, 3)')).toEqual([1, 2, 3]);
  });
  it('bỏ được ngoặc vuông/nhọn và có thành phần căn', () => {
    const p = parsePoint('[0, √3/2, 0]');
    expect(p).not.toBeNull();
    expect(p![1]).toBeCloseTo(Math.sqrt(3) / 2, 10);
  });
  it('chuỗi rác → null', () => {
    expect(parsePoint('abc')).toBeNull();
  });
});

describe('parsePlane — đọc hệ số phương trình mặt phẳng', () => {
  it('đọc "x+2y-2z+3=0"', () => {
    expect(parsePlane('x+2y-2z+3=0')).toEqual({ a: 1, b: 2, c: -2, d: 3 });
  });
  it('đọc bản đã nhân đôi "2x+4y-4z+6=0"', () => {
    expect(parsePlane('2x+4y-4z+6=0')).toEqual({ a: 2, b: 4, c: -4, d: 6 });
  });
  it('không có biến nào → null', () => {
    expect(parsePlane('3=0')).toBeNull();
  });
});

describe('parseRatioExact — rút gọn tỉ số nguyên bằng engine scalar', () => {
  it('1:2 và 2/4 cùng rút về "1/2"', () => {
    expect(parseRatioExact('1:2')).toBe('1/2');
    expect(parseRatioExact('2/4')).toBe('1/2');
  });
  it('không phải tỉ số nguyên → null', () => {
    expect(parseRatioExact('√6/3')).toBeNull();
  });
});
