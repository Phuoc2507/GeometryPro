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

  it('geometry KÈM đường parabol của hàm (không chỉ điểm trần) — bài "đống rơm" hết rỗng', () => {
    // Cùng bài trên: engine giải đúng nhưng hình xưa CHỈ có điểm B,V (entityTable không có 'curves')
    // → user "không thấy gì cả". Figure phải kèm đồ thị f để lộ mặt cắt đống rơm.
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
        constraint: { of: { kind: 'point_coord', target: 'B', axis: 'y' }, equals: 4 },
        report: { kind: 'point_coord', target: 'V', axis: 'y' },
      },
    });
    expect(r.ok).toBe(true);
    const geo = r.geometry as { curves?: { type: string; params: Record<string, number> }[] } | null;
    expect(geo).toBeTruthy();
    const para = geo!.curves?.find((c) => c.type === 'parabola');
    expect(para).toBeDefined();
    // f(x) = -1/3 x² + 8/3 x, vẽ trên miền [0,8] (qua O và A).
    expect(para!.params.a).toBeCloseTo(-1 / 3, 5);
    expect(para!.params.b).toBeCloseTo(8 / 3, 5);
    expect(para!.params.c).toBeCloseTo(0, 6);
    expect(para!.params.xMin).toBeCloseTo(0, 6);
    expect(para!.params.xMax).toBeCloseTo(8, 6);
    // điểm tường minh vẫn còn (B, V).
    const geoP = r.geometry as { points: { id: string }[] };
    expect(geoP.points.find((p) => p.id === 'B')).toBeDefined();
    expect(geoP.points.find((p) => p.id === 'V')).toBeDefined();
  });
});
