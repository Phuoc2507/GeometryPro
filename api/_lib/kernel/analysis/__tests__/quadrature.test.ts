import { describe, it, expect } from 'vitest';
import { integrate } from '../quadrature';

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
