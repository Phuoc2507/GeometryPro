// CHỐNG BỊA: oxyz_intersect trên đường×đường suy biến (song song/trùng/chéo) PHẢI báo lỗi, KHÔNG dựng
// điểm. run() bắt lỗi op → ok:false, errors có thông điệp tiếng Việt, và KHÔNG có điểm nào được đặt.
import { describe, it, expect } from 'vitest';
import { run } from '../../run';

function intersectTwoLines(
  d1: { base: [number, number, number]; dir: [number, number, number] },
  d2: { base: [number, number, number]; dir: [number, number, number] },
) {
  return run({
    solidName: 'll',
    ops: [
      { op: 'oxyz_line', name: 'd1', by: { form: 'point_dir', base: d1.base, dir: d1.dir } },
      { op: 'oxyz_line', name: 'd2', by: { form: 'point_dir', base: d2.base, dir: d2.dir } },
      { op: 'oxyz_intersect', name: 'X', a: 'd1', b: 'd2' },
    ],
  });
}

describe('oxyz_intersect đường×đường — chống bịa điểm', () => {
  it('cắt nhau → dựng ĐƯỢC điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 1, 0] },
      { base: [2, 0, 0], dir: [-1, 1, 0] },
    );
    expect(res.ok).toBe(true);
    expect(res.entities.points.has('X')).toBe(true);
  });

  it('song song → BÁO LỖI, không có điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 0, 0] },
      { base: [0, 1, 0], dir: [2, 0, 0] },
    );
    expect(res.ok).toBe(false);
    expect(res.entities.points.has('X')).toBe(false);
    expect(res.errors[0].message).toContain('song song');
  });

  it('trùng nhau → BÁO LỖI, không có điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 0, 0] },
      { base: [3, 0, 0], dir: [2, 0, 0] },
    );
    expect(res.ok).toBe(false);
    expect(res.entities.points.has('X')).toBe(false);
    expect(res.errors[0].message).toContain('trùng');
  });

  it('chéo nhau (3D) → BÁO LỖI, không có điểm X', () => {
    const res = intersectTwoLines(
      { base: [0, 0, 0], dir: [1, 0, 0] },
      { base: [0, 0, 1], dir: [0, 1, 0] },
    );
    expect(res.ok).toBe(false);
    expect(res.entities.points.has('X')).toBe(false);
    expect(res.errors[0].message).toContain('chéo');
  });
});
