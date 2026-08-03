import { describe, it, expect } from 'vitest';
import type { GeometryData } from '@/types/geometry';
import {
  getPrimarySphereCenter,
  hasSphere,
  recenterGeometry,
  recenterGeometryOnSphere,
  getBaseFaceCenter,
  hasBaseFace,
  detectBaseFace,
  recenterGeometryOnBase,
} from '../recenterGeometry';
import { getScaleFactor, computeMaxExtent } from '../scaleGeometry';

// Tiện ích dựng hình chóp từ các đỉnh đáy + đỉnh chóp (đáy nối vòng, cạnh bên tới đỉnh).
function pyramid(base: Array<[string, number, number, number]>, apex: [string, number, number, number]): GeometryData {
  const points = [
    ...base.map(([id, x, y, z]) => ({ id, label: id, x, y, z })),
    { id: apex[0], label: apex[0], x: apex[1], y: apex[2], z: apex[3] },
  ];
  const lines = base.map((b, i) => ({ id: `${b[0]}${base[(i + 1) % base.length][0]}`, from: b[0], to: base[(i + 1) % base.length][0] }));
  return { name: 'pyramid', points, lines };
}

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

describe('getBaseFaceCenter · dời gốc về tâm mặt phẳng đáy', () => {
  it('chóp tứ giác z-up: tâm đáy = giao 2 đường chéo, dời đúng', () => {
    const g = pyramid(
      [['A', 0, 0, 0], ['B', 4, 0, 0], ['C', 4, 4, 0], ['D', 0, 4, 0]],
      ['S', 2, 2, 6],
    );
    expect(hasBaseFace(g)).toBe(true);
    expect(getBaseFaceCenter(g)).toEqual({ x: 2, y: 2, z: 0 });
    const out = recenterGeometryOnBase(g)!;
    // Đỉnh chóp về đúng trên trục đứng qua gốc; đáy đối xứng quanh O.
    const S = out.points.find((p) => p.id === 'S')!;
    expect([S.x, S.y, S.z]).toEqual([0, 0, 6]);
    const A = out.points.find((p) => p.id === 'A')!;
    expect([A.x, A.y, A.z]).toEqual([-2, -2, 0]);
  });

  it('TRỤC ĐỨNG LÀ Oy (không phải z): vẫn dò đúng mặt đáy', () => {
    // Đáy nằm trên mặt y=2, đỉnh theo Oy — kiểu dữ liệu mock chóp của app.
    const g = pyramid(
      [['A', 1, 2, 1], ['B', 5, 2, 1], ['C', 5, 2, 5], ['D', 1, 2, 5]],
      ['S', 3, 7, 3],
    );
    const bf = detectBaseFace(g)!;
    expect(bf.axis).toBe(1); // trục y
    expect(getBaseFaceCenter(g)).toEqual({ x: 3, y: 2, z: 3 });
    const out = recenterGeometryOnBase(g)!;
    const S = out.points.find((p) => p.id === 'S')!;
    expect([S.x, S.y, S.z]).toEqual([0, 5, 0]);
  });

  it('chóp tam giác (tứ diện): tâm đáy = trọng tâm tam giác', () => {
    const g = pyramid([['A', 0, 0, 0], ['B', 6, 0, 0], ['C', 0, 6, 0]], ['S', 2, 2, 9]);
    expect(getBaseFaceCenter(g)).toEqual({ x: 2, y: 2, z: 0 });
  });

  it('đáy HÌNH THANG: dùng trọng tâm DIỆN TÍCH (khác trung bình đỉnh)', () => {
    // Hình thang cân: cạnh y=0 dài 8, cạnh y=4 dài 4. Trung bình đỉnh ȳ=2, nhưng
    // trọng tâm diện tích ȳ = h(2b+a)/(3(a+b)) = 4·16/36 = 16/9 ≈ 1.778.
    const g = pyramid(
      [['A', 0, 0, 0], ['B', 8, 0, 0], ['C', 6, 4, 0], ['D', 2, 4, 0]],
      ['S', 4, 2, 10],
    );
    const c = getBaseFaceCenter(g)!;
    expect(c.x).toBeCloseTo(4, 6);
    expect(c.y).toBeCloseTo(16 / 9, 6); // ≈1.7778, KHÔNG phải 2
    expect(c.z).toBeCloseTo(0, 6);
  });

  it('tâm đáy KHÔNG phụ thuộc thứ tự nhập đỉnh (tự sắp theo góc)', () => {
    const ordered = pyramid(
      [['A', 0, 0, 0], ['B', 8, 0, 0], ['C', 6, 4, 0], ['D', 2, 4, 0]],
      ['S', 4, 2, 10],
    );
    const shuffled = pyramid(
      [['C', 6, 4, 0], ['A', 0, 0, 0], ['D', 2, 4, 0], ['B', 8, 0, 0]],
      ['S', 4, 2, 10],
    );
    const a = getBaseFaceCenter(ordered)!;
    const b = getBaseFaceCenter(shuffled)!;
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
  });

  it('lăng trụ tam giác KHÔNG phải chóp ⇒ không hiện (hai đáy bằng nhau, không có đỉnh)', () => {
    const g: GeometryData = {
      name: 'prism',
      points: [
        { id: 'A', label: 'A', x: 0, y: 0, z: 0 }, { id: 'B', label: 'B', x: 4, y: 0, z: 0 }, { id: 'C', label: 'C', x: 0, y: 4, z: 0 },
        { id: 'A2', label: "A'", x: 0, y: 0, z: 5 }, { id: 'B2', label: "B'", x: 4, y: 0, z: 5 }, { id: 'C2', label: "C'", x: 0, y: 4, z: 5 },
      ],
      lines: [],
    };
    expect(hasBaseFace(g)).toBe(false);
  });

  it('hình lập phương KHÔNG phải chóp ⇒ không hiện', () => {
    const pts: GeometryData['points'] = [];
    let i = 0;
    for (const x of [0, 4]) for (const y of [0, 4]) for (const z of [0, 4]) {
      pts.push({ id: `P${i}`, label: `P${i}`, x, y, z }); i++;
    }
    expect(hasBaseFace({ name: 'cube', points: pts, lines: [] })).toBe(false);
  });

  it('BỎ QUA điểm tâm đáy H nằm trong đáy (bao lồi) ⇒ tâm vẫn đúng', () => {
    // Chóp S.ABCD kèm H = tâm đáy ở (2,2,0) — điểm nội đáy hay gặp trong đề.
    const g = pyramid(
      [['A', 0, 0, 0], ['B', 4, 0, 0], ['C', 4, 4, 0], ['D', 0, 4, 0]],
      ['S', 2, 2, 6],
    );
    g.points.push({ id: 'H', label: 'H', x: 2, y: 2, z: 0 });
    expect(getBaseFaceCenter(g)).toEqual({ x: 2, y: 2, z: 0 });
  });

  it('đa giác PHẲNG (không có đỉnh) ⇒ không coi là chóp', () => {
    const g: GeometryData = {
      name: 'flat',
      points: [
        { id: 'A', label: 'A', x: 0, y: 0, z: 0 }, { id: 'B', label: 'B', x: 4, y: 0, z: 0 },
        { id: 'C', label: 'C', x: 4, y: 4, z: 0 }, { id: 'D', label: 'D', x: 0, y: 4, z: 0 },
      ],
      lines: [],
    };
    expect(hasBaseFace(g)).toBe(false);
    expect(getBaseFaceCenter(g)).toBeNull();
    expect(recenterGeometryOnBase(g)).toBe(g); // trả chính hình cũ
  });

  it('bài mặt cầu (ít điểm, không có đáy) ⇒ hasBaseFace false', () => {
    expect(hasBaseFace(sample())).toBe(false);
  });

  it('tâm đáy đã ở gốc ⇒ trả chính hình cũ (không bản sao thừa)', () => {
    const g = pyramid(
      [['A', -2, 0, -2], ['B', 2, 0, -2], ['C', 2, 0, 2], ['D', -2, 0, 2]],
      ['S', 0, 5, 0],
    );
    expect(getBaseFaceCenter(g)).toEqual({ x: 0, y: 0, z: 0 });
    expect(recenterGeometryOnBase(g)).toBe(g);
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
