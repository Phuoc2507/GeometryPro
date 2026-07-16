// api/_lib/kernel/__tests__/run.test.ts
import { describe, it, expect } from 'vitest';
import { run } from '../run';
import { makeExact } from '../scalar';

const BASE = {
  solidName: 'test',
  ops: [
    { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
    { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
    { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
    { op: 'oxyz_plane', name: 'P', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
    { op: 'oxyz_point', name: 'S', at: [0, 0, 3] },
  ],
};

describe('run — end-to-end', () => {
  it('dựng + kiểm assert đúng + tính query đúng → ok', () => {
    const res = run({
      ...BASE,
      asserts: [{ relation: 'on', args: ['A', 'P'] }],
      queries: [{ kind: 'distance', a: 'S', b: 'P' }],
    });
    expect(res.ok).toBe(true);
    expect(res.violations).toHaveLength(0);
    expect(res.errors).toHaveLength(0);
    expect(res.answers[0].kind).toBe('distance');
    if (res.answers[0].kind === 'distance') expect(res.answers[0].exact).toEqual(makeExact(3n, 1n, 1));
    expect(res.entities.points.size).toBe(4);
  });

  it('assert sai → ok:false với violation, KHÔNG ném', () => {
    const res = run({ ...BASE, asserts: [{ relation: 'on', args: ['S', 'P'] }] });
    expect(res.ok).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });

  it('op tham chiếu điểm chưa định nghĩa → error có cấu trúc, KHÔNG ném', () => {
    const res = run({ solidName: 'bad', ops: [{ op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' }] });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('schema không hợp lệ → error, KHÔNG ném', () => {
    const res = run({ solidName: '', ops: [] });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('query token hỏng → error, các phần khác vẫn chạy', () => {
    const res = run({ ...BASE, queries: [{ kind: 'distance', a: 'S', b: 'NOPE' }] });
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
