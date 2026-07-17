import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 1 (đống rơm) qua runAnalysis', () => {
  it('thang dài 5 tiếp tuyến tại x=6 → đỉnh cao 16/3 m = 533 cm', () => {
    const r = runAnalysis({
      solidName: 'haystack',
      parameters: [{ name: 'a', domain: [-2, -0.01] }], // đống rơm mở xuống ⇒ a<0
      functions: [{ name: 'f', form: 'poly', degree: 2, through: [[0, 0], [8, 0]], leading: 'a' }],
      ops: [
        { op: 'curve_point', name: 'B', f: 'f', x: 6 },
        { op: 'tangent_line', name: 'T', f: 'f', x: 6 },       // ENGINE đạo hàm
        { op: 'oxyz_plane', name: 'G', by: { form: 'coeffs', a: 0, b: 1, c: 0, d: 0 } }, // mặt đất y=0
        { op: 'oxyz_intersect', name: 'C', a: 'T', b: 'G' },   // thang chạm đất
        { op: 'curve_extremum', name: 'V', f: 'f', domain: [0, 8] },
      ],
      analyze: {
        kind: 'solve', parameter: 'a',
        constraint: { of: { kind: 'distance', a: 'B', b: 'C' }, equals: 5 }, // thang dài 5
        report: { kind: 'point_coord', target: 'V', axis: 'y' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(-1 / 3, 5);  // a = -1/3
    expect(r.answer.approx).toBeCloseTo(16 / 3, 4);    // 5,3333 m
    expect(Math.round(r.answer.approx * 100)).toBe(533); // → 533 cm
  });
});
