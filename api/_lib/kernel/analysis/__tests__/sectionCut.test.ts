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
