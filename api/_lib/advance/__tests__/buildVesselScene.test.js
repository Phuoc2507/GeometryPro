import { describe, it, expect } from 'vitest';
import { buildVesselScene } from '../buildVesselScene.js';

// Bình = trụ (r=4, cao 10) + chỏm cầu (nửa trên mặt cầu R=4, tâm ở đỉnh trụ c=10).
const segments = [
  { type: 'cylinder', x0: 0, x1: 10, r: 4 },
  { type: 'sphereZone', x0: 10, x1: 14, R: 4, c: 10 },
];

describe('buildVesselScene', () => {
  const scene = buildVesselScene({ segments });

  it('dựng được scene khi mô hình hợp lệ (tự kiểm đạt)', () => {
    expect(scene).not.toBeNull();
  });

  it('base có điểm mẫu (qua gate points>0) + đúng 1 khối, axis Oy', () => {
    expect(scene.base.points.length).toBeGreaterThan(0);
    expect(scene.base.revolutionSolids).toHaveLength(1);
    expect(scene.base.revolutionSolids[0].axis).toBe('Oy');
  });

  it('2 bước; Câu thể tích có đáp án VERIFIED đúng giá trị (160π + 128π/3)', () => {
    expect(scene.steps).toHaveLength(2);
    const revId = scene.base.revolutionSolids[0].id;
    expect(scene.steps[0].visibleIds).toContain(revId);
    const ans = scene.steps[1].answer;
    expect(ans.verified).toBe(true);
    const expected = 160 * Math.PI + (128 * Math.PI) / 3; // trụ + nửa cầu
    expect(ans.approx).toBeCloseTo(expected, 4);
  });

  it('mô hình HỞ (không tự kiểm được) → trả null (chống bịa)', () => {
    const bad = [
      { type: 'cylinder', x0: 0, x1: 4, r: 2 },
      { type: 'cylinder', x0: 5, x1: 8, r: 2 }, // hở giữa 4 và 5
    ];
    expect(buildVesselScene({ segments: bad })).toBeNull();
  });

  it('segments rỗng/thiếu → null', () => {
    expect(buildVesselScene({ segments: [] })).toBeNull();
    expect(buildVesselScene({})).toBeNull();
  });
});
