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

  it('geometry co agent (initialPos=from) + parametric_path he so dung', () => {
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
    const g = r.geometry as any;
    expect(g.agents?.[0]?.id).toBe('M');
    expect(g.agents[0].initialPosition).toEqual([4, 0, 0]);   // = D
    expect(g.timeline?.tracks?.[0]?.type).toBe('parametric_path');
    const path = g.timeline.tracks[0].params.path;
    expect(path).toContain('x(t)');
    // velocity=(E-D)/dur = (-4,4,0)/10 = (-0.4, 0.4, 0)
    expect(path).toMatch(/-0\.4\*t/);
    expect(path).toMatch(/0\.4\*t/);
  });

  it('KHONG mover -> KHONG co agents/timeline (khong hoi quy)', () => {
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 10] }],
      ops: [{ op: 'oxyz_point', name: 'O', at: [0, 0, 0] }, { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] }],
      analyze: { kind: 'solve', parameter: 't', constraint: { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 3 }, report: { kind: 'distance', a: 'O', b: 'P' } },
    });
    expect((r.geometry as any)?.agents).toBeUndefined();
  });
});
