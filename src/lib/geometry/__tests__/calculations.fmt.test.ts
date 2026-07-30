import { describe, it, expect } from 'vitest';
import { fmt } from '../calculations';

describe('fmt · định dạng số an toàn (chống trắng bảng)', () => {
  it('số nguyên → không có phần thập phân', () => {
    expect(fmt(2)).toBe('2');
    expect(fmt(-5)).toBe('-5');
    expect(fmt(0)).toBe('0');
  });

  it('số thực → cắt số 0 thừa', () => {
    expect(fmt(2.5)).toBe('2.5');
    expect(fmt(2.50)).toBe('2.5');
    expect(fmt(3.14159)).toBe('3.14');
    expect(fmt(3.14159, 3)).toBe('3.142');
  });

  // Đây là hồi quy cho crash prod: toạ độ null lọt vào useState(() => fmt(value)) ở CoordInput
  // → null.toFixed → ném → React gỡ cả RightPanel → trắng màn. fmt PHẢI nuốt input lỗi.
  it('CHỐNG CRASH: null/undefined/NaN/Infinity KHÔNG ném, trả "0"', () => {
    expect(() => fmt(null as unknown as number)).not.toThrow();
    expect(fmt(null as unknown as number)).toBe('0');
    expect(fmt(undefined as unknown as number)).toBe('0');
    expect(fmt(NaN)).toBe('0');
    expect(fmt(Infinity)).toBe('0');
    expect(fmt(-Infinity)).toBe('0');
    expect(fmt('x' as unknown as number)).toBe('0');
  });
});
