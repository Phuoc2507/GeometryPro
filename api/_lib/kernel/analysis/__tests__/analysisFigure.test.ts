import { describe, it, expect } from 'vitest';
import { buildAnalysisFigure } from '../analysisFigure';

describe('buildAnalysisFigure', () => {
  it('poly → curve + điểm mẫu (qua gate points>0)', () => {
    const g = buildAnalysisFigure('f', { polys: { f: [0, 0, -0.01, 0.008].slice(0, 3) }, polyDomains: { f: [0, 40] }, points: [], solids: {} });
    expect(g.curves!.length).toBe(1);
    expect(g.curves![0].type).toBe('parabola');
    expect(g.points.length).toBeGreaterThan(10); // có điểm mẫu
  });
  it('cylinder → khung dây có điểm + đường', () => {
    const g = buildAnalysisFigure('cyl', { polys: {}, polyDomains: {}, points: [], solids: { T: { kind: 'cylinder', cx: 0, cy: 0, radius: 2, from: 0, to: 4 } } });
    expect(g.points.length).toBeGreaterThan(20); // 2 vòng × 16
    expect(g.lines.length).toBeGreaterThan(0);
  });
  it('cone → có đỉnh + vòng đáy', () => {
    const g = buildAnalysisFigure('cone', { polys: {}, polyDomains: {}, points: [], solids: { N: { kind: 'cone', cx: 2, cy: 0, baseRadius: 2, baseZ: 0, apexZ: 4 } } });
    const apex = g.points.find((p) => Math.abs(p.z - 4) < 1e-6);
    expect(apex).toBeDefined();
  });
  it('điểm tường minh được giữ', () => {
    const g = buildAnalysisFigure('x', { polys: {}, polyDomains: {}, points: [{ id: 'M', x: 1, y: 2, z: 0 }], solids: {} });
    expect(g.points.find((p) => p.id === 'M')).toBeDefined();
  });
});
