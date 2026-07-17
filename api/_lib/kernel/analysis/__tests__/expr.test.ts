import { describe, it, expect } from 'vitest';
import { evalExpr } from '../expr';

describe('evalExpr', () => {
  it('số học + ưu tiên', () => {
    expect(evalExpr('1 + 2*3')).toBe(7);
    expect(evalExpr('(1+2)*3')).toBe(9);
    expect(evalExpr('2^3^2')).toBe(512); // ^ phải-kết-hợp
    expect(evalExpr('-5 + 2')).toBe(-3);
    // đơn nguyên - LỎNG hơn ^ (quy ước toán): -2^2 = -(2^2) = -4, không phải (-2)^2
    expect(evalExpr('-2^2')).toBe(-4);
    expect(evalExpr('2^-2')).toBe(0.25); // số mũ mang dấu
    expect(evalExpr('-(2^2)')).toBe(-4);
  });
  it('biến + hàm + hằng', () => {
    expect(evalExpr('3*cos(th)', { th: 0 })).toBeCloseTo(3, 12);
    expect(evalExpr('2*sqrt(3)')).toBeCloseTo(2 * Math.sqrt(3), 12);
    expect(evalExpr('pi/2')).toBeCloseTo(Math.PI / 2, 12);
    expect(evalExpr('a+b', { a: 1, b: 2 })).toBe(3);
  });
  it('biến chưa gán → ném', () => {
    expect(() => evalExpr('x+1')).toThrow();
  });
});
