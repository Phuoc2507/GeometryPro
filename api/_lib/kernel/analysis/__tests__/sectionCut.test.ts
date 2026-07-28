import { describe, it, expect } from 'vitest';
import { buildPolyhedron, resolveSectionPoint, planeFrom3 } from '../sectionCut';

describe('sectionCut — khối chuẩn & giải điểm', () => {
  it('cube: 8 đỉnh, 12 cạnh, 6 mặt', () => {
    const p = buildPolyhedron('cube', { a: 2 });
    expect(Object.keys(p.vertices).length).toBe(8);
    expect(p.edges.length).toBe(12);
    expect(p.faces.length).toBe(6);
    expect(p.vertices['C']).toEqual([2, 2, 0]);
    expect(p.vertices["A'"]).toEqual([0, 0, 2]);
  });
  it('pyramid-quad: 5 đỉnh (có S), 8 cạnh, 5 mặt; S trên tâm đáy', () => {
    const p = buildPolyhedron('pyramid-quad', { a: 2, b: 2, h: 3 });
    expect(p.vertices['S']).toEqual([1, 1, 3]);
    expect(Object.keys(p.vertices).length).toBe(5);
    expect(p.edges.length).toBe(8);
  });
  it('pyramid-quad apexOver=A: đỉnh S nằm NGAY TRÊN A (SA⊥đáy), không phải trên tâm', () => {
    const p = buildPolyhedron('pyramid-quad', { a: 2, b: 2, h: 3, apexOver: 'A' });
    expect(p.vertices['S']).toEqual([0, 0, 3]);
  });
  it('prism-tri: 6 đỉnh, 9 cạnh', () => {
    const p = buildPolyhedron('prism-tri', { a: 2, h: 4 });
    expect(Object.keys(p.vertices).length).toBe(6);
    expect(p.edges.length).toBe(9);
  });
  it('resolveSectionPoint: đỉnh & trung điểm', () => {
    const p = buildPolyhedron('cube', { a: 2 });
    expect(resolveSectionPoint(p, { vertex: 'B' })).toEqual([2, 0, 0]);
    expect(resolveSectionPoint(p, { onEdge: ['A', 'B'], t: 0.5 })).toEqual([1, 0, 0]);
  });
  it('planeFrom3: 3 điểm thẳng hàng ⇒ null', () => {
    expect(planeFrom3([[0, 0, 0], [1, 0, 0], [2, 0, 0]])).toBeNull();
  });
  it('planeFrom3: pháp tuyến đúng phương', () => {
    const pl = planeFrom3([[0, 0, 0], [1, 0, 0], [0, 1, 0]])!;
    expect(Math.abs(pl.normal[0])).toBeLessThan(1e-9);
    expect(Math.abs(pl.normal[1])).toBeLessThan(1e-9);
    expect(Math.abs(pl.normal[2])).toBeGreaterThan(0);
  });
});

import { sliceConvexPolyhedron, polygonArea3D, buildSectionCut } from '../sectionCut';

describe('sectionCut — cắt & diện tích', () => {
  it('lập phương a=1 cắt qua 3 trung điểm AB,AD,AA\' ⇒ tam giác đều S=√3/8', () => {
    const p = buildPolyhedron('cube', { a: 1 });
    const pt = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]] as [number, number, number][];
    const pl = planeFrom3(pt)!;
    const polygon = sliceConvexPolyhedron(p, pl.point, pl.normal);
    expect(polygon.length).toBe(3);
    expect(polygonArea3D(polygon)).toBeCloseTo(Math.sqrt(3) / 8, 6);
  });
  it('mp song song đáy (z=1) cắt hộp 2×3×4 ⇒ hình chữ nhật S=6', () => {
    const p = buildPolyhedron('box', { a: 2, b: 3, c: 4 });
    const polygon = sliceConvexPolyhedron(p, [0, 0, 1], [0, 0, 1]);
    expect(polygon.length).toBe(4);
    expect(polygonArea3D(polygon)).toBeCloseTo(6, 6);
  });
  it('mp không cắt trong khối ⇒ []', () => {
    const p = buildPolyhedron('cube', { a: 1 });
    expect(sliceConvexPolyhedron(p, [0, 0, 5], [0, 0, 1]).length).toBe(0);
  });
  it('buildSectionCut: verified true + area đúng', () => {
    const r = buildSectionCut('sec1', 'cube', { a: 1 },
      [{ onEdge: ['A', 'B'], t: 0.5 }, { onEdge: ['A', 'D'], t: 0.5 }, { onEdge: ['A', "A'"], t: 0.5 }])!;
    expect(r.sectionCut.area!.verified).toBe(true);
    expect(r.sectionCut.area!.value).toBeCloseTo(Math.sqrt(3) / 8, 6);
    expect(r.sectionCut.polygon.length).toBe(3);
  });
  it('buildSectionCut: 3 điểm thẳng hàng ⇒ null', () => {
    const r = buildSectionCut('sec1', 'cube', { a: 1 },
      [{ vertex: 'A' }, { onEdge: ['A', 'B'], t: 0.5 }, { vertex: 'B' }]);
    expect(r).toBeNull();
  });
});
