import { describe, it, expect } from 'vitest';
import { sectionBasis, projectTo2D } from '../AnimatedSectionCut';

describe('AnimatedSectionCut — hàm thuần', () => {
  const poly: [number, number, number][] = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]];
  const normal: [number, number, number] = [1, 1, 1];
  it('sectionBasis trả u,v trực chuẩn & vuông góc normal', () => {
    const { u, v } = sectionBasis(poly, normal);
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(u, v)).toBeCloseTo(0, 6);
    expect(dot(u, normal)).toBeCloseTo(0, 6);
    expect(Math.hypot(...u)).toBeCloseTo(1, 6);
  });
  it('projectTo2D trả đúng số đỉnh', () => {
    const b = sectionBasis(poly, normal);
    expect(projectTo2D(poly, b).length).toBe(3);
  });
});
