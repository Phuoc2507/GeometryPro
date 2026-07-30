import { describe, it, expect } from 'vitest';
import { computeCurveRenderData } from '../curveRender';
import type { Curve3D } from '@/types/geometry';

// Bất biến CHỐNG CRASH: drei <Line> nhận mảng rỗng ⇒ LineGeometry.setPositions([]) tính
// new Float32Array(2*(0-3)) = Float32Array(-6) ⇒ RangeError, sập cả canvas. Nên hàm dựng điểm
// PHẢI trả null khi không vẽ được — KHÔNG BAO GIỜ trả points có < 2 phần tử.
describe('computeCurveRenderData · không bao giờ để <Line> nhận mảng rỗng', () => {
  it('expr KHÔNG samples ⇒ null (không nổ Float32Array(-6))', () => {
    const c = { id: 'c', type: 'expr', params: { xMin: 0, xMax: 5 }, expr: 'exp(x)' } as unknown as Curve3D;
    expect(computeCurveRenderData(c, 1)).toBeNull();
  });

  it('type lạ LLM bịa (vd "exponential") KHÔNG samples ⇒ null', () => {
    const c = { id: 'c', type: 'exponential', params: { xMin: 0, xMax: 5 } } as unknown as Curve3D;
    expect(computeCurveRenderData(c, 1)).toBeNull();
  });

  it('expr CÓ samples ⇒ điểm ≥ 2', () => {
    const c = {
      id: 'c', type: 'expr', plane: 'xy',
      samples: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }],
    } as unknown as Curve3D;
    const data = computeCurveRenderData(c, 1);
    expect(data).not.toBeNull();
    expect(data!.points.length).toBeGreaterThanOrEqual(2);
  });

  it('parabola (analytic) ⇒ điểm ≥ 2', () => {
    const c = {
      id: 'c', type: 'parabola', plane: 'xy',
      params: { a: 1, b: 0, c: 0, xMin: -2, xMax: 2 },
    } as unknown as Curve3D;
    const data = computeCurveRenderData(c, 1);
    expect(data).not.toBeNull();
    expect(data!.points.length).toBeGreaterThanOrEqual(2);
  });

  it('progress=0 (đầu animation) vẫn cho ≥ 2 điểm, không mảng rỗng', () => {
    const c = {
      id: 'c', type: 'expr', plane: 'xy',
      samples: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }],
    } as unknown as Curve3D;
    const data = computeCurveRenderData(c, 0);
    expect(data).not.toBeNull();
    expect(data!.points.length).toBeGreaterThanOrEqual(2);
  });
});
