import { describe, it, expect } from 'vitest';
import { run } from '../../run';

describe('oxyz_circumsphere_offset + sphere_metric', () => {
  it('mặt cầu qua 3 điểm, lệch t theo pháp tuyến; đọc bán kính & đỉnh', () => {
    // 3 đỉnh cột A(0,0,10),B(4,0,6),C(0,4,6); t=0 ⇒ cầu tâm = tâm ngoại tiếp, R=4√6/3≈3.266.
    const res = run({
      solidName: 'poles',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 10] },
        { op: 'oxyz_point', name: 'B', at: [4, 0, 6] },
        { op: 'oxyz_point', name: 'C', at: [0, 4, 6] },
        { op: 'oxyz_circumsphere_offset', name: 'S', of: ['A', 'B', 'C'], t: 0 },
      ],
      queries: [
        { kind: 'sphere_metric', target: 'S', what: 'radius' },
        { kind: 'sphere_metric', target: 'S', what: 'top_z' },
      ],
    });
    expect(res.ok).toBe(true);
    expect((res.answers[0] as { approx: number }).approx).toBeCloseTo(4 * Math.sqrt(6) / 3, 6);
    // t=0: tâm=(4/3,4/3,22/3), top_z = 22/3 + 4√6/3
    expect((res.answers[1] as { approx: number }).approx).toBeCloseTo(22 / 3 + 4 * Math.sqrt(6) / 3, 6);
  });
});
