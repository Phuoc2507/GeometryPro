import { describe, it, expect } from 'vitest';
import { diskAt, lensArea, intersectionVolume, type Solid } from '../solids';

const CYL: Solid = { kind: 'cylinder', cx: 0, cy: 0, radius: 2, from: 0, to: 4 };
const CONE: Solid = { kind: 'cone', cx: 2, cy: 0, baseRadius: 2, baseZ: 0, apexZ: 4 };

describe('solids', () => {
  it('diskAt: trụ không đổi; nón thu nhỏ tuyến tính về đỉnh', () => {
    expect(diskAt(CYL, 2).r).toBeCloseTo(2, 12);
    expect(diskAt(CYL, 9).r).toBe(0);          // ngoài khối
    expect(diskAt(CONE, 0).r).toBeCloseTo(2, 12);  // đáy
    expect(diskAt(CONE, 4).r).toBeCloseTo(0, 12);  // đỉnh
    expect(diskAt(CONE, 2).r).toBeCloseTo(1, 12);  // giữa
    expect(diskAt(CONE, 2).cx).toBeCloseTo(2, 12);
  });

  it('lensArea: các ca biên + ca chuẩn', () => {
    expect(lensArea(2, 2, 0)).toBeCloseTo(Math.PI * 4, 10);   // trùng tâm, bằng nhau
    expect(lensArea(2, 2, 4)).toBe(0);                        // tiếp xúc ngoài
    expect(lensArea(2, 2, 5)).toBe(0);                        // rời
    expect(lensArea(2, 1, 0.5)).toBeCloseTo(Math.PI, 10);     // tròn nhỏ nằm trọn trong
    expect(lensArea(1, 1, 1)).toBeCloseTo(2 * Math.PI / 3 - Math.sqrt(3) / 2, 10);
  });

  it('intersectionVolume: trụ lồng trụ = π·1²·4', () => {
    const inner: Solid = { kind: 'cylinder', cx: 0, cy: 0, radius: 1, from: 0, to: 4 };
    expect(intersectionVolume(CYL, inner).value).toBeCloseTo(4 * Math.PI, 6);
  });

  it('Câu 8: trụ ∩ nón = 64π/9 − 512/9 + 24√3 ≈ 7,0205', () => {
    const v = intersectionVolume(CYL, CONE).value;
    expect(v).toBeCloseTo(64 * Math.PI / 9 - 512 / 9 + 24 * Math.sqrt(3), 5);
    expect(v).toBeCloseTo(7.0205, 4);
  });

  it('không chồng độ cao → 0', () => {
    const above: Solid = { kind: 'cylinder', cx: 0, cy: 0, radius: 2, from: 10, to: 12 };
    expect(intersectionVolume(CYL, above).value).toBe(0);
  });
});
