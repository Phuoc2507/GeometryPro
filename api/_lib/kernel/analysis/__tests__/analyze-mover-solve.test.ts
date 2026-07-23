// Vật chuyển động M(t)=A+t·(B−A). Engine tự tiêm oxyz_ratio M (không bắt LLM tính toạ độ). solve tìm t sao
// cho dist(M,A)=4: với A(0,0,0), B(10,0,0) ⇒ M=(10t,0,0), 10t=4 ⇒ t=0.4, report dist(M,A)=4.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('mover + solve (đơn tham số)', () => {
  it('giải t để dist(M,A)=4 trên đoạn A→B(10,0,0) → report 4', () => {
    const r = runAnalysis({
      solidName: 'mv',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [10, 0, 0] },
      ],
      parameters: [{ name: 't', domain: [0, 1] }],
      mover: { point: 'M', from: 'A', to: 'B' },
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'M', b: 'A' }, equals: 4 },
        report: { kind: 'distance', a: 'M', b: 'A' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(4, 3);
  });
});
