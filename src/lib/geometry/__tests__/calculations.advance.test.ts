import { describe, it, expect } from 'vitest';
import { computeProperties, isAnalysisFigure } from '../calculations';
import type { GeometryData } from '@/types/geometry';

// ── Bối cảnh ────────────────────────────────────────────────────────────────
// Cảnh Advance GIẢI TÍCH (tròn xoay / thiết diện / hình phẳng) có base chứa RẤT NHIỀU
// điểm mẫu đường sinh + khung dây, TẤT CẢ z=0 (buildAnalysisFigure rải ~25 điểm r_s* để
// qua gate points>0). Bộ phân loại đa diện của computeProperties từng coi chúng là
// "Đa giác phẳng" và tính "Diện tích đáy" bằng shoelace → SAI (người dùng báo "làm sai":
// bài quay y=2x−x² quanh Ox hiện "Đa giác phẳng • 25 đỉnh • Diện tích đáy 1.33").
// Sau vá: nhận diện field giải tích ⇒ trả loại hình đúng, KHÔNG đo trên điểm mẫu.

// n+1 điểm dọc y = 2x − x² trên [0,2], mọi z=0 — giống hệt điểm mẫu buildAnalysisFigure sinh.
function sampleCurvePoints(n: number) {
  const pts: { id: string; label: string; x: number; y: number; z: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const x = (2 * k) / n;
    pts.push({ id: `r_s${k}`, label: '', x, y: 2 * x - x * x, z: 0 });
  }
  return pts;
}

describe('computeProperties · cảnh GIẢI TÍCH Advance không bị nhầm là đa giác phẳng', () => {
  it('có revolutionSolids (Ox) ⇒ "Khối tròn xoay quanh Ox", KHÔNG có "Diện tích đáy" rác', () => {
    const geom = {
      name: 'Tròn xoay quanh Ox',
      points: sampleCurvePoints(24), // 25 điểm mẫu, tất cả z=0 — TRƯỚC vá ⇒ "Đa giác phẳng"
      lines: [],
      curves: [{ id: 'curve_r', type: 'parabola', params: { a: -1, b: 2, c: 0, xMin: 0, xMax: 2 } }],
      revolutionSolids: [{
        id: 'rev1', outer: { kind: 'poly', coeffs: [0, 2, -1] }, axis: 'Ox',
        domain: [0, 2], method: 'disk',
        volume: { value: 3.351, latex: '\\frac{16\\pi}{15}', verified: true },
      }],
    } as unknown as GeometryData;

    const props = computeProperties(geom);
    expect(props.shapeType).toBe('Khối tròn xoay quanh Ox');
    expect(props.baseArea).toBeNull();          // KHÔNG shoelace điểm mẫu (đây là lỗi "1.33")
    expect(props.height).toBeNull();
    expect(props.volume).toBeNull();            // đáp số chính xác ở tab Giải bài, không đo trên hình
    expect(props.edgeLengths).toHaveLength(0);
  });

  it('có revolutionSolids (Oy) ⇒ nhãn "Khối tròn xoay quanh Oy"', () => {
    const geom = {
      name: 'x', points: sampleCurvePoints(10), lines: [],
      revolutionSolids: [{ id: 'r', outer: { kind: 'poly', coeffs: [0, 1] }, axis: 'Oy', domain: [0, 3], method: 'shell' }],
    } as unknown as GeometryData;
    expect(computeProperties(geom).shapeType).toBe('Khối tròn xoay quanh Oy');
  });

  it('areaRegions ⇒ "Hình phẳng" (KHÔNG phải đa giác phẳng)', () => {
    const geom = {
      name: 'x', points: sampleCurvePoints(12), lines: [],
      areaRegions: [{ id: 'a', outer: { kind: 'poly', coeffs: [0, 2, -1] }, inner: { kind: 'const', c: 0 }, domain: [0, 2] }],
    } as unknown as GeometryData;
    expect(computeProperties(geom).shapeType).toBe('Hình phẳng');
  });

  it('sliceStacks ⇒ "Vật thể (thiết diện)"', () => {
    const geom = {
      name: 'x', points: sampleCurvePoints(12), lines: [],
      sliceStacks: [{ id: 's', axis: 'Ox', domain: [0, 2], outer: { kind: 'poly', coeffs: [0, 2, -1] }, section: 'square' }],
    } as unknown as GeometryData;
    expect(computeProperties(geom).shapeType).toBe('Vật thể (thiết diện)');
  });

  it('sectionCuts ⇒ "Thiết diện"', () => {
    const geom = {
      name: 'x', points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }], lines: [],
      sectionCuts: [{ id: 'c', targetKind: 'cube', polygon: [[0, 0, 0], [1, 0, 0], [1, 1, 0]], plane: { point: [0, 0, 0], normal: [0, 0, 1] } }],
    } as unknown as GeometryData;
    expect(computeProperties(geom).shapeType).toBe('Thiết diện');
  });

  it('KHÔNG hồi quy: khối đa diện thường (không field giải tích) vẫn phân loại như cũ', () => {
    // Chóp tứ giác: 4 đỉnh đáy z=0 + 1 đỉnh z=3.
    const geom = {
      name: 'chóp',
      points: [
        { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
        { id: 'B', label: 'B', x: 2, y: 0, z: 0 },
        { id: 'C', label: 'C', x: 2, y: 2, z: 0 },
        { id: 'D', label: 'D', x: 0, y: 2, z: 0 },
        { id: 'S', label: 'S', x: 1, y: 1, z: 3 },
      ],
      lines: [],
    } as unknown as GeometryData;
    const props = computeProperties(geom);
    expect(props.shapeType).toContain('Hình chóp');
    expect(props.baseArea).not.toBeNull(); // đa giác đáy thật vẫn tính diện tích
  });
});

describe('isAnalysisFigure · nhận diện cảnh giải tích', () => {
  it('true khi có revolutionSolids / areaRegions / sliceStacks / sectionCuts', () => {
    expect(isAnalysisFigure({ revolutionSolids: [{ id: 'r' }] } as unknown as GeometryData)).toBe(true);
    expect(isAnalysisFigure({ areaRegions: [{ id: 'a' }] } as unknown as GeometryData)).toBe(true);
    expect(isAnalysisFigure({ sliceStacks: [{ id: 's' }] } as unknown as GeometryData)).toBe(true);
    expect(isAnalysisFigure({ sectionCuts: [{ id: 'c' }] } as unknown as GeometryData)).toBe(true);
  });
  it('false cho hình cổ điển (chỉ điểm + đường)', () => {
    expect(isAnalysisFigure({ points: [{ id: 'A' }], lines: [] } as unknown as GeometryData)).toBe(false);
    expect(isAnalysisFigure({ revolutionSolids: [], areaRegions: [] } as unknown as GeometryData)).toBe(false);
  });
});
