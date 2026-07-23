// Đường N-ẩn (N=3): optimize_multi tối thiểu hoá (a−1)²+(b−2)²+(c−3)² → 0; solve_multi tách biến a=3,b=5,c=7
// (đích trùng nút lưới ⇒ golden-section hội tụ ~1e-9 < gate 1e-4) → report a+b+c=15; và hệ VÔ NGHIỆM ⇒
// cổng residual TỪ CHỐI. Ràng buộc dạng expr (không hình học) để nhanh & tất định.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('analyze nhiều biến (N=3)', () => {
  it('optimize_multi 3 ẩn: min (a−1)²+(b−2)²+(c−3)² ≈ 0', () => {
    const r = runAnalysis({
      solidName: 'om3',
      parameters: [
        { name: 'a', domain: [0, 5] },
        { name: 'b', domain: [0, 5] },
        { name: 'c', domain: [0, 5] },
      ],
      analyze: {
        kind: 'optimize_multi', parameters: ['a', 'b', 'c'], sense: 'min',
        objective: { kind: 'expr', expr: '(a-1)^2 + (b-2)^2 + (c-3)^2' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(0, 3);
  });

  it('solve_multi 3 ẩn tách biến (a=3,b=5,c=7) → report a+b+c=15', () => {
    const r = runAnalysis({
      solidName: 'sm3',
      ops: [{ op: 'oxyz_point', name: 'A', at: [0, 0, 0] }], // 1 op vô hại: run() cuối cần ops≥1
      parameters: [
        { name: 'a', domain: [0, 12] },
        { name: 'b', domain: [0, 12] },
        { name: 'c', domain: [0, 12] },
      ],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b', 'c'],
        constraints: [
          { of: { kind: 'expr', expr: 'a' }, equals: 3 },
          { of: { kind: 'expr', expr: 'b' }, equals: 5 },
          { of: { kind: 'expr', expr: 'c' }, equals: 7 },
        ],
        report: { kind: 'expr', expr: 'a+b+c' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(15, 3);
  });

  it('solve_multi 3 ẩn VÔ NGHIỆM → cổng residual từ chối', () => {
    const r = runAnalysis({
      solidName: 'sm3x',
      ops: [{ op: 'oxyz_point', name: 'A', at: [0, 0, 0] }],
      parameters: [
        { name: 'a', domain: [0, 12] },
        { name: 'b', domain: [0, 12] },
        { name: 'c', domain: [0, 12] },
      ],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b', 'c'],
        constraints: [
          { of: { kind: 'expr', expr: 'a' }, equals: 3 },
          { of: { kind: 'expr', expr: 'b' }, equals: 5 },
          { of: { kind: 'expr', expr: 'a+b' }, equals: 100 },
        ],
        report: { kind: 'expr', expr: 'a+b+c' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain('không giải được (residual');
  });
});
