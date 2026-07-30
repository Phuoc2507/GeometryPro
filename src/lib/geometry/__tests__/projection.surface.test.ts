import { describe, it, expect } from 'vitest';
import { generateProjectedLatex, project3DTo2D } from '../projection';
import { revolutionPoint } from '../surfaceProfile';
import type { GeometryData, Surface3D } from '@/types/geometry';

// Cùng quy tắc format toạ độ như projection.ts (không export nên chép lại để so khớp chuỗi).
const fmt = (v: number): string => {
  if (Math.abs(v) < 0.005) return '0.00';
  const f = v.toFixed(2);
  return f === '-0.00' ? '0.00' : f;
};

const CAM: [number, number, number] = [8, 6, 10];
const TARGET: [number, number, number] = [0, 0, 0];

/** (H): quay y=x² (x∈[0,2]) quanh Ox ⇒ mặt tròn xoay nằm ngang, vành lớn r=4 tại x=2. */
const parabolaOx: Surface3D = {
  id: 'rev', type: 'revolution', center: { x: 0, y: 0, z: 0 },
  curve: 'parabola', axis: [1, 0, 0],
  params: { a: 1, b: 0, c: 0, xMin: 0, xMax: 2 },
};

const baseGeom = (surface: Surface3D): GeometryData => ({
  name: 'test', points: [], lines: [], surfaces: [surface],
} as unknown as GeometryData);

describe('revolutionPoint · ánh xạ trục quay', () => {
  it('trục ngang Ox: dọc-trục → x, bán kính quét trong mặt (y,z) — khớp B(2,4,0)/C(2,0,4)', () => {
    const B = revolutionPoint({ x: 0, y: 0, z: 0 }, 2, 4, 0, true);
    expect(B.x).toBeCloseTo(2, 9);
    expect(B.y).toBeCloseTo(4, 9);
    expect(B.z).toBeCloseTo(0, 9);
    const C = revolutionPoint({ x: 0, y: 0, z: 0 }, 2, 4, Math.PI / 2, true);
    expect(C.x).toBeCloseTo(2, 9);
    expect(C.y).toBeCloseTo(0, 9);
    expect(C.z).toBeCloseTo(4, 9);
  });

  it('trục đứng (mặc định): dọc-trục → z, bán kính quét trong mặt (x,y)', () => {
    const P = revolutionPoint({ x: 0, y: 0, z: 0 }, 3, 2, 0, false);
    expect(P.x).toBeCloseTo(2, 9);
    expect(P.y).toBeCloseTo(0, 9);
    expect(P.z).toBeCloseTo(3, 9);
  });

  it('tôn trọng tâm (center) — cộng offset', () => {
    const P = revolutionPoint({ x: 1, y: -2, z: 5 }, 2, 4, 0, true);
    expect(P.x).toBeCloseTo(3, 9);   // 1 + 2
    expect(P.y).toBeCloseTo(2, 9);   // -2 + 4
    expect(P.z).toBeCloseTo(5, 9);   // 5 + 0
  });
});

describe('generateProjectedLatex · mặt tròn xoay (BUG: trước đây không hiện)', () => {
  it('mặt revolution parabola quanh Ox SINH lệnh vẽ (vĩ tuyến + đường bao)', () => {
    const latex = generateProjectedLatex(baseGeom(parabolaOx), CAM, TARGET);
    expect(latex).toContain('Vẽ các mặt cong (Surfaces)');
    // Có ít nhất một vĩ tuyến (vòng kín) và hai đường bao silhouette.
    expect(latex).toMatch(/purple!55, thick\].*-- cycle/);
    expect((latex.match(/purple!70, thick\]/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('vành lớn B(2,4,0) tại x=2 nằm trong đường vẽ (toạ độ đã chiếu khớp)', () => {
    const latex = generateProjectedLatex(baseGeom(parabolaOx), CAM, TARGET);
    const b2d = project3DTo2D({ x: 2, y: 4, z: 0 }, CAM, TARGET);
    expect(latex).toContain(`(${fmt(b2d.x)}, ${fmt(b2d.y)})`);
  });

  it('mặt trục đứng (vắng axis) vẫn sinh lệnh vẽ, không rỗng', () => {
    const vertical: Surface3D = { ...parabolaOx, axis: undefined };
    const latex = generateProjectedLatex(baseGeom(vertical), CAM, TARGET);
    expect(latex).toMatch(/purple!(55|70), thick\]/);
  });

  it('CHỐNG CRASH: surface THIẾU center (lịch sử ẩn danh) KHÔNG throw, sập cả bảng', () => {
    const noCenter = { id: 'x', type: 'revolution', curve: 'parabola', axis: [1, 0, 0],
      params: { a: 1, b: 0, c: 0, xMin: 0, xMax: 2 } } as unknown as Surface3D; // center vắng
    expect(() => generateProjectedLatex(baseGeom(noCenter), CAM, TARGET)).not.toThrow();
  });

  it('CHỐNG CRASH: surface THIẾU params và hyperboloid thiếu center đều không throw', () => {
    const noParams = { id: 'y', type: 'revolution', center: { x: 0, y: 0, z: 0 } } as unknown as Surface3D;
    const hyperNoCenter = { id: 'z', type: 'hyperboloid', params: { a: 1, c: 1.5 } } as unknown as Surface3D;
    expect(() => generateProjectedLatex(baseGeom(noParams), CAM, TARGET)).not.toThrow();
    expect(() => generateProjectedLatex(baseGeom(hyperNoCenter), CAM, TARGET)).not.toThrow();
  });

  it('CHỐNG CRASH: phần tử surface null/không phải object bị bỏ qua', () => {
    const geom = { name: 't', points: [], lines: [], surfaces: [null, undefined, 'bad', parabolaOx] } as unknown as GeometryData;
    expect(() => generateProjectedLatex(geom, CAM, TARGET)).not.toThrow();
    // Mặt hợp lệ vẫn được vẽ dù có phần tử rác đứng trước.
    expect(generateProjectedLatex(geom, CAM, TARGET)).toMatch(/purple!(55|70), thick\]/);
  });

  it('hyperboloid GIỮ nhánh cũ (vẫn vẽ vòng + kinh tuyến purple)', () => {
    const hyper: Surface3D = {
      id: 'h', type: 'hyperboloid', center: { x: 0, y: 0, z: 0 },
      params: { a: 1, b: 1, c: 1.5, vMin: -0.3, vMax: 1.0 },
    };
    const latex = generateProjectedLatex(baseGeom(hyper), CAM, TARGET);
    expect(latex).toContain('purple!60, thick');   // vòng ngang của nhánh hyperboloid cũ
    expect(latex).toContain('purple!40, dashed');   // kinh tuyến của nhánh hyperboloid cũ
  });
});
