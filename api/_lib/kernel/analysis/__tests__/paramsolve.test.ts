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
