import { describe, it, expect } from 'vitest';
import {
  vesselSegmentVolume,
  validateVesselSegments,
  vesselVolume,
  buildVesselSolid,
  sampleVesselProfile,
} from '../vessel';
import type { VesselSegment } from '../../../../../src/types/geometry';

const PI = Math.PI;

describe('vesselSegmentVolume — công thức đóng từng khúc', () => {
  it('trụ: V = π r² h', () => {
    expect(vesselSegmentVolume({ type: 'cylinder', x0: 0, x1: 5, r: 2 })).toBeCloseTo(20 * PI, 9);
  });

  it('nón cụt: V = π h/3 (r0²+r0r1+r1²)', () => {
    expect(vesselSegmentVolume({ type: 'frustum', x0: 0, x1: 4, r0: 3, r1: 1 })).toBeCloseTo((52 * PI) / 3, 9);
  });

  it('nón đặc (frustum r1=0): V = π R² h / 3', () => {
    expect(vesselSegmentVolume({ type: 'frustum', x0: 0, x1: 6, r0: 3, r1: 0 })).toBeCloseTo(18 * PI, 9);
  });

  it('cầu đầy đủ (sphereZone toàn cầu): V = 4/3 π R³', () => {
    // R=3, tâm c=3, đoạn [0,6] = cả đường kính ⇒ 4/3·π·27 = 36π.
    expect(vesselSegmentVolume({ type: 'sphereZone', x0: 0, x1: 6, R: 3, c: 3 })).toBeCloseTo(36 * PI, 9);
  });

  it('chỏm/nửa cầu (sphereZone [0,R]): V = 2/3 π R³', () => {
    // R=3, tâm c=0, đoạn [0,3] = nửa cầu ⇒ 2/3·π·27 = 18π.
    expect(vesselSegmentVolume({ type: 'sphereZone', x0: 0, x1: 3, R: 3, c: 0 })).toBeCloseTo(18 * PI, 9);
  });
});

describe('validateVesselSegments — chống mô hình vô lý', () => {
  it('danh sách rỗng → không hợp lệ', () => {
    expect(validateVesselSegments([]).ok).toBe(false);
  });

  it('hai khúc HỞ nhau (không tiếp giáp) → không hợp lệ', () => {
    const segs: VesselSegment[] = [
      { type: 'cylinder', x0: 0, x1: 4, r: 2 },
      { type: 'cylinder', x0: 5, x1: 8, r: 2 }, // đáng lẽ x0 phải = 4
    ];
    expect(validateVesselSegments(segs).ok).toBe(false);
  });

  it('sphereZone vượt ra ngoài mặt cầu → không hợp lệ', () => {
    // R=2, tâm c=0 ⇒ chỉ hợp lệ trong [-2,2]; x1=5 vượt.
    expect(validateVesselSegments([{ type: 'sphereZone', x0: 0, x1: 5, R: 2, c: 0 }]).ok).toBe(false);
  });

  it('bình rượu (nón cụt + đới cầu tiếp giáp) → hợp lệ', () => {
    const segs: VesselSegment[] = [
      { type: 'frustum', x0: 0, x1: 4, r0: 5, r1: 3 },
      { type: 'sphereZone', x0: 4, x1: 8, R: 5, c: 8 }, // r(4)=√(25−16)=3 khớp đáy nón cụt
    ];
    expect(validateVesselSegments(segs).ok).toBe(true);
  });
});

describe('vesselVolume — đối chiếu công thức đóng vs tích phân số', () => {
  it('vật thể ghép: hai cách khớp nhau ⇒ verified', () => {
    const segs: VesselSegment[] = [
      { type: 'frustum', x0: 0, x1: 4, r0: 5, r1: 3 },
      { type: 'sphereZone', x0: 4, x1: 8, R: 5, c: 8 },
    ];
    const v = vesselVolume(segs);
    expect(v.verified).toBe(true);
    // đáp số đóng = tổng hai khúc
    const expected =
      vesselSegmentVolume(segs[0]) + vesselSegmentVolume(segs[1]);
    expect(v.value).toBeCloseTo(expected, 6);
    // tích phân số bám sát công thức đóng
    expect(v.gap).toBeLessThan(1e-4 * Math.max(1, expected));
  });

  it('mô hình hở → verified=false (không bịa đáp)', () => {
    const segs: VesselSegment[] = [
      { type: 'cylinder', x0: 0, x1: 4, r: 2 },
      { type: 'cylinder', x0: 5, x1: 8, r: 2 },
    ];
    expect(vesselVolume(segs).verified).toBe(false);
  });
});

describe('buildVesselSolid — RevolutionSolid tái dùng renderer', () => {
  const segs: VesselSegment[] = [
    { type: 'frustum', x0: 0, x1: 4, r0: 5, r1: 3 },
    { type: 'sphereZone', x0: 4, x1: 8, R: 5, c: 8 },
  ];

  it('trả solid có volume verified + domain đúng + axis Oy mặc định', () => {
    const solid = buildVesselSolid('v1', segs);
    expect(solid.volume?.verified).toBe(true);
    expect(solid.domain).toEqual([0, 8]);
    expect(solid.axis).toBe('Oy');
    expect(solid.method).toBe('disk');
  });

  it('samples đường sinh: x tăng dần, r ≥ 0, khúc cầu được lấy dày (cong mượt)', () => {
    const solid = buildVesselSolid('v1', segs);
    const s = solid.samples ?? [];
    expect(s.length).toBeGreaterThan(20); // khúc cầu ~24 điểm ⇒ tổng phải nhiều
    for (let i = 1; i < s.length; i++) expect(s[i].x).toBeGreaterThanOrEqual(s[i - 1].x - 1e-9);
    for (const p of s) expect(p.r).toBeGreaterThanOrEqual(0);
  });
});

describe('sampleVesselProfile — vai phẳng (bậc bán kính) được giữ', () => {
  it('bậc bán kính giữa hai trụ khác r → có hai điểm cùng x khác r', () => {
    const segs: VesselSegment[] = [
      { type: 'cylinder', x0: 0, x1: 3, r: 2 },
      { type: 'cylinder', x0: 3, x1: 6, r: 4 }, // vai phẳng tại x=3: r nhảy 2→4
    ];
    const s = sampleVesselProfile(segs);
    const atX3 = s.filter((p) => Math.abs(p.x - 3) < 1e-9).map((p) => p.r).sort((a, b) => a - b);
    expect(atX3).toEqual([2, 4]);
  });
});
