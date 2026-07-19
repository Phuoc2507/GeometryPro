import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('solve_multi', () => {
  // P=(a,b,0); dist(O,P)=5 & dist(A,P)=5 với O(0,0,0), A(6,0,0) → a=3,b=4 (miền b≥0). report a+b=7.
  it('2 rang buoc dist -> giai dung, report a+b=7', () => {
    const r = runAnalysis({
      solidName: 'sm', parameters: [{ name: 'a', domain: [0, 6] }, { name: 'b', domain: [0, 6] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'A', at: [6, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['a', 'b', 0] },
      ],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b'],
        constraints: [
          { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 5 },
          { of: { kind: 'distance', a: 'A', b: 'P' }, equals: 5 },
        ],
        report: { kind: 'expr', expr: 'a+b' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(7, 3);
  }, 20000); // solve_multi gọi run() mỗi eval nên chậm (~vài giây) — nới timeout so với mặc định 5s

  it('vo nghiem trong mien -> ok=false (khong serve-sai)', () => {
    const r = runAnalysis({
      solidName: 'sm', parameters: [{ name: 'a', domain: [0, 1] }, { name: 'b', domain: [0, 1] }],
      ops: [{ op: 'oxyz_point', name: 'O', at: [0, 0, 0] }, { op: 'oxyz_point', name: 'P', at: ['a', 'b', 0] }],
      analyze: { kind: 'solve_multi', parameters: ['a', 'b'],
        constraints: [{ of: { kind: 'distance', a: 'O', b: 'P' }, equals: 100 }],
        report: { kind: 'expr', expr: 'a+b' } },
    });
    expect(r.ok).toBe(false);
  }, 20000);

  it('assert vi pham tai nghiem -> ok=false + violation', () => {
    const r = runAnalysis({
      solidName: 'sm', parameters: [{ name: 'a', domain: [0, 6] }, { name: 'b', domain: [0, 6] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'A', at: [6, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['a', 'b', 0] },
      ],
      asserts: [{ relation: 'dist', args: ['O', 'P'], value: 99 }], // sai tại nghiệm (dist=5)
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b'],
        constraints: [
          { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 5 },
          { of: { kind: 'distance', a: 'A', b: 'P' }, equals: 5 },
        ],
        report: { kind: 'expr', expr: 'a+b' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  }, 20000);
});
