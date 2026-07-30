import { describe, it, expect } from 'vitest';
import { normalizeGeometryData } from '../normalizeGeometry.js';

describe('normalizeGeometryData · giữ revolutionSolids + areaRegions', () => {
  const input = {
    name: 'Câu 1',
    points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }],
    curves: [{ id: 'c1', type: 'expr', expr: 'exp(x/2)*sqrt(x)', params: { xMin: 1, xMax: 2 }, plane: 'xy' }],
    areaRegions: [{ id: 'ar1', outer: { kind: 'expr', expr: 'x' }, inner: { kind: 'const', c: 0 }, domain: [0, 1] }],
    revolutionSolids: [{ id: 'rs1', outer: { kind: 'expr', expr: 'exp(x/2)*sqrt(x)' }, domain: [1, 2], axis: 'Ox', method: 'disk' }],
  };

  it('curves (expr) sống sót nguyên vẹn', () => {
    const out = normalizeGeometryData(input);
    expect(out.curves).toHaveLength(1);
    expect(out.curves[0].expr).toBe('exp(x/2)*sqrt(x)');
  });
  it('areaRegions sống sót (trước đây bị nuốt)', () => {
    const out = normalizeGeometryData(input);
    expect(out.areaRegions).toHaveLength(1);
    expect(out.areaRegions[0].domain).toEqual([0, 1]);
  });
  it('revolutionSolids sống sót (trước đây bị nuốt)', () => {
    const out = normalizeGeometryData(input);
    expect(out.revolutionSolids).toHaveLength(1);
    expect(out.revolutionSolids[0].axis).toBe('Ox');
  });
  it('mảng rỗng bị xoá (không rác)', () => {
    const out = normalizeGeometryData({ name: 'x', points: [], revolutionSolids: [], areaRegions: [] });
    expect(out.revolutionSolids).toBeUndefined();
    expect(out.areaRegions).toBeUndefined();
  });
});
