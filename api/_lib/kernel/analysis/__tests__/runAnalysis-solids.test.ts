import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis — khối tròn xoay', () => {
  it('eval + solid_volume: trụ lồng trụ = 4π', () => {
    const r = runAnalysis({
      solidName: 'two-cyl',
      solids: [
        { name: 'A', kind: 'cylinder', center: [0, 0], radius: 2, from: 0, to: 4 },
        { name: 'B', kind: 'cylinder', center: [0, 0], radius: 1, from: 0, to: 4 },
      ],
      analyze: { kind: 'eval', of: { kind: 'solid_volume', of: ['A', 'B'], mode: 'intersection' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(4 * Math.PI, 5);
  });

  it('khối chưa khai báo → ok=false', () => {
    const r = runAnalysis({
      solidName: 'x',
      solids: [{ name: 'A', kind: 'cylinder', center: [0, 0], radius: 1, from: 0, to: 1 }],
      analyze: { kind: 'eval', of: { kind: 'solid_volume', of: ['A', 'Z'], mode: 'intersection' } },
    });
    expect(r.ok).toBe(false);
  });
});
