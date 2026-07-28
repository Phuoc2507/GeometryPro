import { describe, it, expect } from 'vitest';
import { areaLoopForTest } from '../AnimatedAreaRegion';

describe('AnimatedAreaRegion · viền miền', () => {
  it('loop kín: đi top a→b rồi bot b→a, số đỉnh = 2·(n+1)', () => {
    const samples = [
      { x: 0, top: 0, bot: 0 }, { x: 0.5, top: 0.5, bot: 0.25 }, { x: 1, top: 1, bot: 1 },
    ];
    const loop = areaLoopForTest(samples);
    expect(loop.length).toBe(samples.length * 2);
    // Đỉnh đầu = (0, top0); đỉnh cuối = (0, bot0) (khép về x đầu).
    expect(loop[0]).toMatchObject({ x: 0 });
    expect(loop[loop.length - 1]).toMatchObject({ x: 0 });
  });
});
