import { describe, it, expect } from 'vitest';
import type { GeometryData, Curve3D } from '@/types/geometry';
import { scaleGeometry } from '../scaleGeometry';
import { computeCurveRenderData } from '../curveRender';

// Chống tái phát bug "đống rơm không thấy gì cả": engine giải đúng nhưng figure XƯA chỉ có 3 điểm
// trần B,C,V (entityTable không có 'curves') → hình rỗng. Nay runAnalysis ghép đồ thị parabol vào.
// Test này bám ĐÚNG shape geometry mà kernel trả (đã probe từ kernel-dist) rồi chạy qua CẢ đường
// render frontend (scaleGeometry → computeCurveRenderData) để chắc parabol ra polyline thật, tới đỉnh V.
describe('đống rơm · engine geometry → render parabol (không còn rỗng)', () => {
  // Shape khớp output runAnalysis cho Câu-1/Câu-8 "đống rơm": f(x) = -1/3 x² + 8/3 x trên [0,8].
  const engineGeometry: GeometryData = {
    name: 'haystack',
    points: [
      { id: 'B', label: 'B', x: 6, y: 4, z: 0 },
      { id: 'C', label: 'C', x: 9, y: 0, z: 0 },
      { id: 'V', label: 'V', x: 4, y: 16 / 3, z: 0 },
    ],
    lines: [],
    spheres: [],
    planes: [],
    curves: [
      { id: 'curve_f', type: 'parabola', params: { a: -1 / 3, b: 8 / 3, c: 0, xMin: 0, xMax: 8 } },
    ],
  } as unknown as GeometryData;

  it('scaleGeometry giữ nguyên (max toạ độ 9 ≤ 20) và giữ parabol', () => {
    const scaled = scaleGeometry(engineGeometry)!;
    expect(scaled.curves).toBeDefined();
    expect(scaled.curves!.length).toBe(1);
    const p = scaled.curves![0].params;
    // Không scale ⇒ hệ số parabol nguyên vẹn.
    expect(p.a).toBeCloseTo(-1 / 3, 6);
    expect(p.b).toBeCloseTo(8 / 3, 6);
    expect(p.xMin).toBeCloseTo(0, 6);
    expect(p.xMax).toBeCloseTo(8, 6);
  });

  it('parabol ra polyline THẬT (≥ 2 điểm) và chạm đỉnh V ≈ 5,33', () => {
    const scaled = scaleGeometry(engineGeometry)!;
    const data = computeCurveRenderData(scaled.curves![0] as Curve3D, 1);
    expect(data).not.toBeNull();
    expect(data!.points.length).toBeGreaterThanOrEqual(2);
    // plane 'xy': điểm dựng là (x, 0, y_math) ⇒ chiều cao đồ thị nằm ở toạ độ z.
    const maxHeight = Math.max(...data!.points.map((v) => v.z));
    expect(maxHeight).toBeCloseTo(16 / 3, 2); // đỉnh đống rơm, trùng V.y
  });
});
