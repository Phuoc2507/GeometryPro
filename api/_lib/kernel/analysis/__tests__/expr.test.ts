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
  it('gọi hàm do người dùng truyền vào', () => {
    const f = (x: number) => -0.01 * x * x + 0.4 * x + 10;
    expect(evalExpr('2*f(z)^2', { z: 20 }, { f })).toBeCloseTo(392, 9);
    expect(evalExpr('f(0)+f(40)', {}, { f })).toBeCloseTo(20, 9);
    expect(evalExpr('sqrt(f(20))', {}, { f })).toBeCloseTo(Math.sqrt(14), 9);
  });
  it('hàm chưa khai báo → ném', () => {
    expect(() => evalExpr('g(1)')).toThrow();
  });
  it('tên trên Object.prototype KHÔNG rò rỉ thành hàm/hằng/biến', () => {
    for (const name of ['constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
      expect(() => evalExpr(`${name}(1)`)).toThrow(`Hàm lạ: ${name}`);
      expect(() => evalExpr(name, {})).toThrow(`Biến chưa gán: ${name}`);
    }
  });
});
