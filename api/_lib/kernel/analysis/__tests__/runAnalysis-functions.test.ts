import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis — tầng hàm số', () => {
  it('curve_point + tangent_line + curve_extremum (hàm cố định, không tham số hoá hệ số)', () => {
    // f = parabol qua (0,0),(8,0) với hệ số đầu ghim bằng tham số a; ở đây khoá a bằng miền hẹp quanh -1/3.
    const r = runAnalysis({
      solidName: 'f',
      parameters: [{ name: 'a', domain: [-2, -0.01] }],
      functions: [{ name: 'f', form: 'poly', degree: 2, through: [[0, 0], [8, 0]], leading: 'a' }],
      ops: [
        { op: 'curve_point', name: 'B', f: 'f', x: 6 },
        { op: 'curve_extremum', name: 'V', f: 'f', domain: [0, 8] },
      ],
      analyze: {
        kind: 'solve', parameter: 'a',
        constraint: { of: { kind: 'point_coord', target: 'B', axis: 'y' }, equals: 4 }, // f(6)=4 ⇔ a=-1/3
        report: { kind: 'point_coord', target: 'V', axis: 'y' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(-1 / 3, 6);
    expect(r.answer.approx).toBeCloseTo(16 / 3, 5); // đỉnh
  });
});
