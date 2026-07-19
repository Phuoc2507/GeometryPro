import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('kinematic', () => {
  // O(0,0,0). Vật M chạy D(4,0,0)→E(0,4,0): M(t)=D+t(E-D). min dist(O,M) tại t=0.5 → M=(2,2,0), dist=2√2.
  it('mover D->E, min distance(O,M) = 2 can 2', () => {
    const r = runAnalysis({
      solidName: 'kin', parameters: [{ name: 't', domain: [0, 1] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'D', at: [4, 0, 0] },
        { op: 'oxyz_point', name: 'E', at: [0, 4, 0] },
      ],
      mover: { point: 'M', from: 'D', to: 'E', label: 'May bay', durationSec: 10 },
      analyze: { kind: 'optimize', parameter: 't', sense: 'min', objective: { kind: 'distance', a: 'O', b: 'M' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(2 * Math.SQRT2, 3);
  });
});
