import { describe, it, expect } from 'vitest';
import { run } from '../../run';

describe('truy vấn point_coord', () => {
  it('đọc từng toạ độ, giữ exact khi có', () => {
    const res = run({
      solidName: 'p',
      ops: [{ op: 'oxyz_point', name: 'A', at: ['3/2', 'sqrt(2)', 5] }],
      queries: [
        { kind: 'point_coord', target: 'A', axis: 'x' },
        { kind: 'point_coord', target: 'A', axis: 'y' },
        { kind: 'point_coord', target: 'A', axis: 'z' },
      ],
    });
    expect(res.ok).toBe(true);
    expect((res.answers[0] as { text: string }).text).toBe('3/2');
    expect((res.answers[1] as { text: string }).text).toBe('√2');
    expect((res.answers[2] as { approx: number }).approx).toBeCloseTo(5, 12);
  });
});
