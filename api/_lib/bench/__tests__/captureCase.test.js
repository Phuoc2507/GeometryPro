import { describe, it, expect } from 'vitest';
import { buildGoldenFromSolve } from '../captureCase.js';

const okResult = (over = {}) => ({
  plan: { solidName: 'S.ABCD', ops: [], asserts: [], queries: [] },
  ok: true,
  representative: false,
  violations: [],
  answers: [{ kind: 'volume', text: '64/3' }],
  ...over,
});

describe('buildGoldenFromSolve', () => {
  it('giữ khi ok + có plan + đáp so được bằng số', () => {
    const r = buildGoldenFromSolve('cap-1', 'đề...', okResult());
    expect(r.kept).toBe(true);
    expect(r.golden.expect).toEqual({ ok: true, answers: [{ kind: 'volume', text: '64/3' }] });
    expect(r.golden.source).toBe('capture');
    expect(r.golden.plan.solidName).toBe('S.ABCD');
  });

  it('bỏ khi dịch hỏng (plan=null)', () => {
    const r = buildGoldenFromSolve('c', 'đề', okResult({ plan: null }));
    expect(r.kept).toBe(false);
    expect(r.reason).toContain('plan');
  });

  it('bỏ khi engine không giải được (ok:false)', () => {
    expect(buildGoldenFromSolve('c', 'đề', okResult({ ok: false })).kept).toBe(false);
  });

  it('bỏ khi đáp "đại diện" (representative)', () => {
    const r = buildGoldenFromSolve('c', 'đề', okResult({ representative: true }));
    expect(r.kept).toBe(false);
    expect(r.reason).toContain('đại diện');
  });

  it('bỏ khi có vi phạm ràng buộc', () => {
    expect(buildGoldenFromSolve('c', 'đề', okResult({ violations: [{ m: 'x' }] })).kept).toBe(false);
  });

  it('bỏ khi không có đáp nào', () => {
    expect(buildGoldenFromSolve('c', 'đề', okResult({ answers: [] })).kept).toBe(false);
  });

  it('bỏ khi một đáp KHÔNG so được bằng số (vd có chữ a)', () => {
    const r = buildGoldenFromSolve('c', 'đề', okResult({ answers: [{ kind: 'volume', text: 'a√3/3' }] }));
    expect(r.kept).toBe(false);
    expect(r.reason).toContain('không so được');
  });
});
