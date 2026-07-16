// api/_lib/kernel/dialects/__tests__/oxyz.test.ts
import { describe, it, expect } from 'vitest';
import { OxyzOpSchema } from '../oxyz';

describe('OxyzOpSchema — hợp lệ', () => {
  it('điểm bằng toạ độ', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_point', name: 'A', at: [1, 2, 3] }).success).toBe(true);
  });
  it('đường qua 2 điểm và đường điểm+chỉ phương', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_line', name: 'd', by: { form: 'two_points', a: 'A', b: 'B' } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_line', name: 'd', by: { form: 'point_dir', base: [0, 0, 0], dir: [1, 0, -1] } }).success).toBe(true);
  });
  it('mặt: 3 điểm / điểm+pháp tuyến / hệ số', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_plane', name: 'P', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_plane', name: 'P', by: { form: 'point_normal', point: 'A', normal: [2, -1, 2] } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_plane', name: 'P', by: { form: 'coeffs', a: 2, b: -1, c: 2, d: '-3' } }).success).toBe(true);
  });
  it('cầu: tâm+bán kính / tâm+điểm / phương trình', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_sphere', name: 'S', by: { form: 'center_radius', center: 'I', radius: 2 } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_sphere', name: 'S', by: { form: 'center_point', center: 'I', through: 'A' } }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_sphere', name: 'S', by: { form: 'equation', a: -2, b: -4, c: -6, d: 5 } }).success).toBe(true);
  });
  it('dẫn xuất: midpoint / ratio / centroid / reflect', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_ratio', name: 'G', a: 'A', b: 'B', t: '1/3' }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_centroid', name: 'G', of: ['A', 'B', 'C'] }).success).toBe(true);
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_reflect', name: "A'", point: 'A', about: 'I' }).success).toBe(true);
  });
});

describe('OxyzOpSchema — không hợp lệ', () => {
  it('điểm thiếu toạ độ', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_point', name: 'A' }).success).toBe(false);
  });
  it('op không tồn tại', () => {
    expect(OxyzOpSchema.safeParse({ op: 'oxyz_nope', name: 'A' }).success).toBe(false);
  });
});
