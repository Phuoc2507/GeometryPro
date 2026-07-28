import { describe, it, expect } from 'vitest';
import { sectionShape, sliceSamplesForTest } from '../AnimatedSliceStack';

describe('AnimatedSliceStack · hình lát', () => {
  it('vuông cạnh 2: Shape có bbox 2×2 tâm gốc', () => {
    const shp = sectionShape('square', 2);
    const pts = shp.getPoints();
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2, 6);
  });
  it('nửa tròn cạnh 2 (bán kính 1): cao 1, rộng 2', () => {
    const pts = sectionShape('semicircle', 2).getPoints(32);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2, 1);
    expect(Math.max(...ys)).toBeCloseTo(1, 1);
  });
  it('sliceSamplesForTest lọc theo t≤ ngưỡng (Cách A quét lộ dần)', () => {
    const samples = [{ t: 0, side: 0 }, { t: 2, side: 1 }, { t: 4, side: 2 }];
    expect(sliceSamplesForTest(samples, [0, 4], 0.5).length).toBe(2); // t ≤ 2
  });
});
