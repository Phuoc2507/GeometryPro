import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 9 & Câu 10 qua runAnalysis', () => {
  it('Câu 9 (solve): quả cầu tựa 3 cột, đỉnh cao 14 → R = 10−2√7', () => {
    const r = runAnalysis({
      solidName: 'poles',
      parameters: [{ name: 't', domain: [0, 20] }],
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 10] },
        { op: 'oxyz_point', name: 'B', at: [4, 0, 6] },
        { op: 'oxyz_point', name: 'C', at: [0, 4, 6] },
        { op: 'oxyz_circumsphere_offset', name: 'S', of: ['A', 'B', 'C'], t: 't' },
      ],
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'sphere_metric', target: 'S', what: 'top_z' }, equals: 14 },
        report: { kind: 'sphere_metric', target: 'S', what: 'radius' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(10 - 2 * Math.sqrt(7), 4);
    expect(r.answer.text).toBe('10 - 2√7');
  });

  it('Câu 10 (optimize): bóng tấm pin, max diện tích hình thang', () => {
    const r = runAnalysis({
      solidName: 'panel',
      parameters: [{ name: 'th', domain: [0.02, 1.55] }], // (0, π/2)
      ops: [
        { op: 'oxyz_point', name: 'A', at: [-1, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'S', at: [0, 0, 4] },
        { op: 'oxyz_point', name: 'C', at: [1, '3*cos(th)', '3*sin(th)'] },
        { op: 'oxyz_point', name: 'D', at: [-1, '3*cos(th)', '3*sin(th)'] },
        { op: 'oxyz_plane', name: 'ground', by: { form: 'coeffs', a: 0, b: 0, c: 1, d: 0 } },
        { op: 'oxyz_line', name: 'SC', by: { form: 'two_points', a: 'S', b: 'C' } },
        { op: 'oxyz_line', name: 'SD', by: { form: 'two_points', a: 'S', b: 'D' } },
        { op: 'oxyz_intersect', name: 'C1', a: 'SC', b: 'ground' },
        { op: 'oxyz_intersect', name: 'D1', a: 'SD', b: 'ground' },
      ],
      analyze: {
        kind: 'optimize', parameter: 'th', sense: 'max',
        objective: { kind: 'area', shape: 'polygon', points: ['A', 'B', 'C1', 'D1'] },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(16.518, 2); // ≈ 16,5 m²
    expect(Math.sin(r.parameter.value)).toBeCloseTo(0.878, 2);
  });
});
