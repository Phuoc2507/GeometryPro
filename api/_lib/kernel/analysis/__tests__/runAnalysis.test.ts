import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis', () => {
  it('solve: điểm P=(t,0,0), tìm t sao cho d(O,P)=3 → t=3', () => {
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 10] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 3 },
        report: { kind: 'distance', a: 'O', b: 'P' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(3, 6);
    expect(r.answer.approx).toBeCloseTo(3, 6);
  });

  it('optimize: điểm P=(t,0,0), max của −(t−2)² qua diện… dùng khoảng cách', () => {
    // max âm-bình-phương: điểm P=(t,0,0), tối thiểu d(P,(2,0,0)) ⇔ t=2.
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 5] }],
      ops: [
        { op: 'oxyz_point', name: 'Q', at: [2, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      analyze: { kind: 'optimize', parameter: 't', sense: 'min', objective: { kind: 'distance', a: 'P', b: 'Q' } },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(2, 5);
  });
});
