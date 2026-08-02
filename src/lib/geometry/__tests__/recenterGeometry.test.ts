import { describe, it, expect } from 'vitest';
import type { GeometryData } from '@/types/geometry';
import {
  getPrimarySphereCenter,
  hasSphere,
  recenterGeometry,
  recenterGeometryOnSphere,
} from '../recenterGeometry';
import { getScaleFactor, computeMaxExtent } from '../scaleGeometry';

// Bài mẫu: mặt cầu tâm I(1,2,-3) và vài điểm.
function sample(): GeometryData {
  return {
    name: 'test',
    points: [
      { id: 'A', label: 'A', x: 7, y: 2, z: -3 },
      { id: 'B', label: 'B', x: 1, y: 2, z: 0 },
      { id: 'I', label: 'I', x: 1, y: 2, z: -3 },
    ],
    lines: [{ id: 'AB', from: 'A', to: 'B' }],
    spheres: [{ id: 's1', center: { x: 1, y: 2, z: -3 }, radius: 3 }],
  };
}

describe('recenterGeometry · dời gốc về tâm mặt cầu', () => {
  it('getPrimarySphereCenter trả đúng tâm cầu', () => {
    expect(getPrimarySphereCenter(sample())).toEqual({ x: 1, y: 2, z: -3 });
  });

  it('không có cầu ⇒ tâm null, hasSphere false', () => {
    const g = { ...sample(), spheres: [] };
    expect(getPrimarySphereCenter(g)).toBeNull();
    expect(hasSphere(g)).toBe(false);
    expect(hasSphere(sample())).toBe(true);
  });

  it('dời trục: tâm cầu về gốc, mọi điểm trừ đi tâm', () => {
    const out = recenterGeometryOnSphere(sample())!;
    // Tâm cầu → (0,0,0)
    expect(out.spheres![0].center).toEqual({ x: 0, y: 0, z: 0 });
    // Bán kính bất biến với tịnh tiến
    expect(out.spheres![0].radius).toBe(3);
    // A(7,2,-3) - (1,2,-3) = (6,0,0)
    const A = out.points.find((p) => p.id === 'A')!;
    expect([A.x, A.y, A.z]).toEqual([6, 0, 0]);
    // I trùng tâm ⇒ về gốc
    const I = out.points.find((p) => p.id === 'I')!;
    expect([I.x, I.y, I.z]).toEqual([0, 0, 0]);
  });

  it('không có cầu ⇒ trả CHÍNH hình cũ (không tạo bản sao)', () => {
    const g = { ...sample(), spheres: undefined };
    expect(recenterGeometryOnSphere(g)).toBe(g);
  });

  it('tâm đã ở gốc ⇒ trả chính hình cũ', () => {
    const g = sample();
    g.spheres = [{ id: 's', center: { x: 0, y: 0, z: 0 }, radius: 1 }];
    expect(recenterGeometryOnSphere(g)).toBe(g);
  });

  it('tâm cầu là id điểm (payload cũ) ⇒ tra ngược ra toạ độ', () => {
    const g = sample();
    // ép center là id 'I'
    (g.spheres![0] as unknown as { center: string }).center = 'I';
    expect(getPrimarySphereCenter(g)).toEqual({ x: 1, y: 2, z: -3 });
    const out = recenterGeometryOnSphere(g)!;
    const A = out.points.find((p) => p.id === 'A')!;
    expect([A.x, A.y, A.z]).toEqual([6, 0, 0]);
  });

  it('không làm mất/đổi các mảng khác (lines giữ nguyên)', () => {
    const out = recenterGeometry(sample(), { x: 1, y: 2, z: -3 });
    expect(out.lines).toEqual([{ id: 'AB', from: 'A', to: 'B' }]);
  });
});

describe('getScaleFactor · khớp với ngưỡng scaleGeometry', () => {
  it('hình nhỏ (max ≤ 20) ⇒ hệ số 1', () => {
    expect(getScaleFactor(sample())).toBe(1);
  });

  it('hình lớn ⇒ hệ số = max/8', () => {
    const g = sample();
    g.points[0] = { id: 'A', label: 'A', x: 40, y: 0, z: 0 };
    expect(computeMaxExtent(g)).toBe(40);
    expect(getScaleFactor(g)).toBe(5);
  });

  it('sau khi dời về tâm cầu, hình nhỏ lại ⇒ hệ số 1 (số lưới đọc đúng gốc mới)', () => {
    const g = sample();
    // đẩy tâm ra xa để chưa dời thì bị scale
    g.spheres![0].center = { x: 30, y: 0, z: 0 };
    g.points = [{ id: 'A', label: 'A', x: 33, y: 0, z: 0 }];
    // max = 33 (điểm A) ⇒ bị scale khi CHƯA dời
    expect(getScaleFactor(g)).toBe(33 / 8);
    const out = recenterGeometryOnSphere(g)!;
    // sau khi dời: A(3,0,0), tâm(0,0,0), max = 3 ≤ 20 ⇒ không scale nữa
    expect(getScaleFactor(out)).toBe(1);
  });
});
