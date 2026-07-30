import { describe, it, expect } from 'vitest';
import { curveThreePoints, curveWorldPoints, revolutionThreePoints, areaThreePoints, computeFitBounds } from '../fitBounds';

describe('curveThreePoints', () => {
  it('plane xy: (x,y) → (x,0,y); ≥2 mẫu giữ nguyên số điểm', () => {
    const pts = curveThreePoints([{ x: 1, y: 2 }, { x: 2, y: 3 }], 'xy', 1);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 1, y: 0, z: 2 });
  });
  it('cắt theo progress', () => {
    const s = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(curveThreePoints(s, 'xy', 0).length).toBe(1); // chỉ i=0 (t=0 ≤ 0)
  });
  it('loại non-finite; samples rỗng/undefined → []', () => {
    expect(curveThreePoints([{ x: 0, y: NaN }, { x: 1, y: 1 }], 'xy', 1)).toHaveLength(1);
    expect(curveThreePoints(undefined, 'xy', 1)).toEqual([]);
  });
});

describe('curveWorldPoints (toạ độ SAU <group rotation> — camera thấy)', () => {
  it('xy: (x,y) → (x,+y,0) khớp render rot[−π/2,0,0] (đồ thị TRÊN trục, trùng miền tô)', () => {
    expect(curveWorldPoints([{ x: 1, y: 2 }], 'xy')[0]).toEqual({ x: 1, y: 2, z: 0 });
  });
  it('xz: (x,y) → (x,y,0) (group không xoay)', () => {
    expect(curveWorldPoints([{ x: 1, y: 2 }], 'xz')[0]).toEqual({ x: 1, y: 2, z: 0 });
  });
  it('yz: (x,y) → (−x,y,0) khớp render rot[0,−π/2,0]', () => {
    expect(curveWorldPoints([{ x: 1, y: 2 }], 'yz')[0]).toEqual({ x: -1, y: 2, z: 0 });
  });
});

describe('revolutionThreePoints', () => {
  it('Ox: bao gồm bán kính ±R quanh axisY', () => {
    const pts = revolutionThreePoints({ samples: [{ x: 1, r: 2 }, { x: 3, r: 4 }], axis: 'Ox', axisY: 0 });
    const ys = pts.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(4, 9);
    expect(Math.min(...ys)).toBeCloseTo(-4, 9);
  });
  it('samples rỗng → []', () => {
    expect(revolutionThreePoints({ samples: [], axis: 'Ox' })).toEqual([]);
  });
});

describe('areaThreePoints', () => {
  it('{x,top,bot} → 2 điểm (x,top,0),(x,bot,0)', () => {
    const pts = areaThreePoints({ samples: [{ x: 1, top: 3, bot: 1 }] });
    expect(pts).toEqual([{ x: 1, y: 3, z: 0 }, { x: 1, y: 1, z: 0 }]);
  });
});

describe('computeFitBounds', () => {
  it('geometry CHỈ có solid (không point) → bounds hữu hạn, không NaN', () => {
    const b = computeFitBounds({
      name: 'x', points: [], lines: [],
      revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'x' }, domain: [1, 2], axis: 'Ox', method: 'disk', samples: [{ x: 1, r: 1 }, { x: 2, r: 2 }] }],
    });
    expect(b).not.toBeNull();
    expect(Number.isFinite(b.cx) && Number.isFinite(b.size) && Number.isFinite(b.R)).toBe(true);
    expect(b.size).toBeGreaterThanOrEqual(2);
  });
  it('geometry rỗng hoàn toàn → null', () => {
    expect(computeFitBounds({ name: 'x', points: [], lines: [] })).toBeNull();
  });
  it('gộp cả point lẫn samples (point ở xa mở rộng khung)', () => {
    const b = computeFitBounds({
      name: 'x',
      points: [{ id: 'P', label: 'P', x: 10, y: 0, z: 0 }],
      lines: [],
      curves: [{ id: 'c', type: 'expr', params: {}, plane: 'xy', samples: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
    });
    expect(b.cx).toBeCloseTo(5, 9); // (0..10)/2
  });
  it('đồ thị y=f(x) THUẦN trên xy: camera căn theo THẾ GIỚI (y→+y), đồ thị TRÊN trục', () => {
    // y∈[0,4] render tại world-Y∈[0,4] (rot[−π/2] ⇒ (x,0,y)→(x,+y,0)); tâm y ≈ +2, cùng hướng miền tô.
    const b = computeFitBounds({
      name: 'x', points: [], lines: [],
      curves: [{ id: 'c', type: 'expr', params: {}, plane: 'xy', samples: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }] }],
    })!;
    expect(b.cy).toBeCloseTo(2, 9);
    expect(b.cz).toBeCloseTo(0, 9); // toàn bộ đường nằm trên mặt z=0 sau xoay
  });
});
