import { describe, it, expect } from 'vitest';
import { optimizeParam, solveParam } from '../paramsolve';

describe('optimizeParam', () => {
  it('max của x(4−x) trên [0,4] = 4 tại x=2', () => {
    const r = optimizeParam((x) => x * (4 - x), 0, 4, 'max');
    expect(r.x).toBeCloseTo(2, 6);
    expect(r.value).toBeCloseTo(4, 6);
  });
  it('min của (x−1)² trên [−2,4] = 0 tại x=1', () => {
    const r = optimizeParam((x) => (x - 1) ** 2, -2, 4, 'min');
    expect(r.x).toBeCloseTo(1, 6);
  });
});

describe('solveParam', () => {
  it('x²=7 trên [0,5] → √7', () => {
    const r = solveParam((x) => x * x, 7, 0, 5);
    expect(r).not.toBeNull();
    expect(r!.x).toBeCloseTo(Math.sqrt(7), 8);
  });
  it('không đổi dấu → null', () => {
    expect(solveParam((x) => x * x + 1, 0, 0, 5)).toBeNull();
  });
});

import { optimizeMulti } from '../paramsolve';

describe('optimizeMulti', () => {
  it('min của (x−1)² + (y+2)² trên [-5,5]² → (1,−2), giá trị 0', () => {
    const r = optimizeMulti((v) => (v[0] - 1) ** 2 + (v[1] + 2) ** 2, [-5, -5], [5, 5], 'min');
    expect(r.xs[0]).toBeCloseTo(1, 5);
    expect(r.xs[1]).toBeCloseTo(-2, 5);
    expect(r.value).toBeCloseTo(0, 8);
  });

  it('max của −(x−2)² − (y−3)² + 7 → 7 tại (2,3)', () => {
    const r = optimizeMulti((v) => -((v[0] - 2) ** 2) - ((v[1] - 3) ** 2) + 7, [0, 0], [5, 5], 'max');
    expect(r.value).toBeCloseTo(7, 8);
  });

  it('Câu 5: khoảng cách ngắn nhất giữa f=-x³+3x² và g=(x+1)/(x−2) (đơn vị ×10 m)', () => {
    const f = (x: number) => -(x ** 3) + 3 * x * x;
    const g = (x: number) => (x + 1) / (x - 2);
    const r = optimizeMulti((v) => 10 * Math.hypot(v[0] - v[1], f(v[0]) - g(v[1])), [2, 2.05], [3, 7], 'min');
    expect(r.value).toBeCloseTo(7.485, 2);
    expect(r.xs[0]).toBeCloseTo(2.369, 2);
    expect(r.xs[1]).toBeCloseTo(3.069, 2);
  });
});
