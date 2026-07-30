import { describe, it, expect } from 'vitest';
import { integrate, refineBounds, fmtBound } from '../quadrature';

describe('integrate', () => {
  it('∫₀¹ x² dx = 1/3', () => {
    const r = integrate((x) => x * x, 0, 1);
    expect(r.value).toBeCloseTo(1 / 3, 10);
    expect(r.estimatedError).toBeLessThan(1e-8);
  });
  it('∫₀^π sin x dx = 2', () => {
    expect(integrate(Math.sin, 0, Math.PI).value).toBeCloseTo(2, 9);
  });
  it('Câu 4: ∫₀⁴⁰ 2·r(z)² dz ≈ 12949,33 (r(z)=-z²/100+0.4z+10)', () => {
    const r = (z: number) => -0.01 * z * z + 0.4 * z + 10;
    const v = integrate((z) => 2 * r(z) ** 2, 0, 40).value;
    expect(v).toBeCloseTo(12949.33, 1);
    expect(v / 1000).toBeCloseTo(12.95, 2); // lít
  });
  it('cận đảo chiều → dấu âm', () => {
    expect(integrate((x) => x * x, 1, 0).value).toBeCloseTo(-1 / 3, 10);
  });
});

describe('refineBounds — vá cận vô tỉ', () => {
  it('snap cận về nghiệm ±√2 của h=x²−2 từ gợi ý thập phân LLM', () => {
    const h = (x: number): number => x * x - 2;
    const [a, b] = refineBounds(h, [-1.41, 1.41]);
    expect(a).toBeCloseTo(-Math.SQRT2, 9);
    expect(b).toBeCloseTo(Math.SQRT2, 9);
  });
  it('rescue gợi ý LỆCH vừa (0→1.5) khi nghiệm √2 nằm trong cửa sổ ±25%', () => {
    const h = (x: number): number => x * x - 2;
    const [, b] = refineBounds(h, [0, 1.5]);   // cửa sổ quanh 1.5 rộng ±0.375 ⇒ chứa 1.414
    expect(b).toBeCloseTo(Math.SQRT2, 9);
  });
  it('GIỮ nguyên cận cho sẵn khi không có nghiệm cắt gần đó (fail-safe)', () => {
    const h = (x: number): number => x * x + 1;   // vô nghiệm thực ⇒ không dời
    expect(refineBounds(h, [0, 3])).toEqual([0, 3]);
  });
  it('biên miền sqrt (NaN một phía) vẫn an toàn: chỉ snap đầu mút có nghiệm', () => {
    const h = (x: number): number => Math.sqrt(x) - 1;   // nghiệm x=1; x<0 ⇒ NaN
    const [a, b] = refineBounds(h, [0, 1.1]);
    expect(a).toBe(0);             // trái: không có đổi dấu (h(0)=−1) ⇒ giữ nguyên, không dời ra miền âm
    expect(b).toBeCloseTo(1, 9);   // phải: snap về 1
  });
  it('khoảng suy biến (a=b) hoặc đảo ⇒ trả nguyên bản', () => {
    const h = (x: number): number => x * x - 2;
    expect(refineBounds(h, [1, 1])).toEqual([1, 1]);
  });
});

describe('fmtBound', () => {
  it('số nguyên giữ nguyên chuỗi', () => {
    expect(fmtBound(2)).toBe('2');
    expect(fmtBound(-3)).toBe('-3');
    expect(fmtBound(0)).toBe('0');
  });
  it('số thập phân làm tròn 3 chữ số (cận vô tỉ đã tinh chỉnh)', () => {
    expect(fmtBound(0.5)).toBe('0.5');
    expect(fmtBound(Math.SQRT2)).toBe('1.414');
    expect(fmtBound(-Math.SQRT2)).toBe('-1.414');
  });
});
