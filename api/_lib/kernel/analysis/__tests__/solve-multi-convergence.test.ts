import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

// Bài "đường thẳng qua A, cắt 2 đường d1,d2" — hệ 2 ẩn / 2 ràng buộc hình học.
// Trước fix: optimizeMulti (hạ toạ độ) kẹt ở thung lũng chéo → residual cao → ok=false.
// Sau fix (Nelder-Mead polish): hội tụ residual≈0 → serve đúng a+b.
describe('solve_multi hội tụ trên hệ giao tuyến (Nelder-Mead polish)', () => {
  const linePlan = (name: string, base: [number, number, number], dir: (number | string)[]) => ({
    op: 'oxyz_line', name, by: { form: 'point_dir', base, dir },
  });

  it('D3: Δ qua A(0,2,1) dir(a,b,1) cắt d1,d2 → a+b = 4', () => {
    const r = runAnalysis({
      solidName: 'd3',
      parameters: [{ name: 'a', domain: [-10, 10] }, { name: 'b', domain: [-10, 10] }],
      ops: [
        linePlan('T', [0, 2, 1], ['a', 'b', 1]),
        linePlan('D1', [3, 3, 2], [1, 2, 2]),
        linePlan('D2', [-3, 1, 0], [2, 1, -1]),
      ],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b'],
        constraints: [
          { of: { kind: 'distance', a: 'T', b: 'D1' }, equals: 0 },
          { of: { kind: 'distance', a: 'T', b: 'D2' }, equals: 0 },
        ],
        report: { kind: 'expr', expr: 'a+b' },
      },
    } as unknown as Parameters<typeof runAnalysis>[0]);
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(4, 2);
  }, 30000);

  it('D2: Δ qua M(0,1,-1) dir(a,1,b) cắt d & ⊥ e(x=y=z) → a+b = -1', () => {
    const r = runAnalysis({
      solidName: 'd2',
      parameters: [{ name: 'a', domain: [-10, 10] }, { name: 'b', domain: [-10, 10] }],
      ops: [
        linePlan('T', [0, 1, -1], ['a', 1, 'b']),
        linePlan('D', [1, 2, -3], [1, 0, 2]),
        linePlan('E', [0, 0, 0], [1, 1, 1]),
      ],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b'],
        constraints: [
          { of: { kind: 'distance', a: 'T', b: 'D' }, equals: 0 },
          { of: { kind: 'angle', a: 'T', b: 'E' }, equals: 90 },
        ],
        report: { kind: 'expr', expr: 'a+b' },
      },
    } as unknown as Parameters<typeof runAnalysis>[0]);
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(-1, 2);
  }, 30000);
});
