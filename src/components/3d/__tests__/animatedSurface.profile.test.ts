import { describe, it, expect } from 'vitest';
import { profileOf, surfaceIsHorizontalAxis, surfaceLineOpacity } from '../AnimatedSurface';
import type { Surface3D } from '@/types/geometry';

/** Case Vẽ nhanh: paraboloid quanh Ox, y=x² trên [0,2] (Câu: quay (H): y=x², y=0, x=2 quanh Ox). */
const parabolaOx: Surface3D = {
  id: 's', type: 'revolution', center: { x: 0, y: 0, z: 0 },
  curve: 'parabola', axis: [1, 0, 0],
  params: { a: 1, b: 0, c: 0, xMin: 0, xMax: 2 },
};

describe('AnimatedSurface · đường sinh parabola', () => {
  it('vertex bán kính 0 tại gốc, mở tới r=4 ở x=2 (dọc trục = x)', () => {
    const f = profileOf(parabolaOx);
    expect(f(0).radius).toBeCloseTo(0, 9);
    expect(f(0).y).toBeCloseTo(0, 9);      // x = xMin = 0
    expect(f(1).radius).toBeCloseTo(4, 9); // 2² = 4 ⇒ khớp B/B'/C/C'
    expect(f(1).y).toBeCloseTo(2, 9);      // x = xMax = 2 ⇒ khớp A(2;0;0)
    expect(f(0.5).radius).toBeCloseTo(1, 9); // x=1 ⇒ r=1
  });

  it('KHÔNG còn fallback trụ đơn vị: giữa profile bán kính ≠ hằng 1', () => {
    const f = profileOf(parabolaOx);
    // Trụ default cũ cho radius=1 mọi t; parabola phải cho r tăng theo x².
    expect(f(0.25).radius).not.toBeCloseTo(1, 3);
    expect(f(1).radius).toBeGreaterThan(f(0.25).radius);
  });
});

describe('AnimatedSurface · nhận diện trục quay', () => {
  it('axis [1,0,0] và "Ox" ⇒ nằm ngang; vắng axis ⇒ đứng', () => {
    expect(surfaceIsHorizontalAxis(parabolaOx)).toBe(true);
    expect(surfaceIsHorizontalAxis({ ...parabolaOx, axis: 'Ox' })).toBe(true);
    expect(surfaceIsHorizontalAxis({ ...parabolaOx, axis: undefined })).toBe(false);
    expect(surfaceIsHorizontalAxis({ ...parabolaOx, axis: [0, 0, 1] })).toBe(false);
  });
});

describe('AnimatedSurface · độ rõ đường viền', () => {
  it('opacity thấp (0.15 từ LLM) được nâng sàn ≥0.6; opacity cao giữ nguyên', () => {
    expect(surfaceLineOpacity({ ...parabolaOx, opacity: 0.15 })).toBeCloseTo(0.6, 9);
    expect(surfaceLineOpacity({ ...parabolaOx, opacity: 0.9 })).toBeCloseTo(0.9, 9);
    expect(surfaceLineOpacity({ ...parabolaOx, opacity: undefined })).toBeCloseTo(1, 9);
  });
});

describe('AnimatedSurface · các type cũ KHÔNG bị đổi hành vi', () => {
  it('paraboloid (a,h) không có xMin/xMax ⇒ vẫn dùng nhánh cũ, không route sang parabola', () => {
    const old: Surface3D = {
      id: 'p', type: 'paraboloid', center: { x: 0, y: 0, z: 0 },
      params: { a: 2, h: 4 },
    };
    const f = profileOf(old);
    expect(f(0).radius).toBeCloseTo(0, 9); // a*t = 0
    expect(f(1).radius).toBeCloseTo(2, 9); // a*1 = 2
    expect(f(1).y).toBeCloseTo(4, 9);      // h*t² = 4
  });
});
