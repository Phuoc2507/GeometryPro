// api/_lib/kernel/__tests__/entityToGeometry.test.ts
import { describe, it, expect } from 'vitest';
import { entityTableToGeometryData } from '../entityToGeometry';
import { run } from '../run';

describe('entityTableToGeometryData', () => {
  it('turns a run() EntityTable into frontend GeometryData (points, faces, spheres)', () => {
    const res = run({
      solidName: 'S.ABCD',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
        { op: 'oxyz_point', name: 'C', at: [2, 2, 0] },
        { op: 'oxyz_point', name: 'D', at: [0, 2, 0] },
        { op: 'oxyz_plane', name: 'ABCD', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
        { op: 'oxyz_point', name: 'I', at: [1, 1, 0] },
        { op: 'oxyz_sphere', name: 'S', by: { form: 'center_radius', center: 'I', radius: 3 } },
      ],
    });
    expect(res.ok).toBe(true);
    const geo = entityTableToGeometryData(res.entities, 'S.ABCD');

    expect(geo.name).toBe('S.ABCD');
    expect(geo.points).toHaveLength(5); // A B C D I
    expect(geo.points.find((p) => p.id === 'A')).toMatchObject({ x: 0, y: 0, z: 0 });

    // sphere rendered with numeric center + radius
    expect(geo.spheres).toHaveLength(1);
    expect(geo.spheres![0]).toMatchObject({ id: 'S', radius: 3 });
    expect(geo.spheres![0].center).toEqual({ x: 1, y: 1, z: 0 });
  });

  it('renders synthetic edges as lines', () => {
    const res = run({
      solidName: 'sq',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } }],
    });
    const geo = entityTableToGeometryData(res.entities, 'sq');
    expect(geo.lines.length).toBe(4); // 4 base edges
    expect(geo.points).toHaveLength(4);
    expect(geo.planes?.[0].pointIds).toEqual(['A', 'B', 'C', 'D']);
  });
});

// Đường VÔ HẠN (line entity: tiếp tuyến, trục, đường qua 2 điểm) không bao giờ thành edge nên xưa nay
// KHÔNG được vẽ — bài "đống rơm" mất đoạn thang B→C dù engine dựng đúng tiếp tuyến. Nối các điểm-có-tên
// nằm TRÊN mỗi line-entity thành một đoạn (2 điểm cực biên) để hình hiện, generic cho mọi bài.
describe('entityTableToGeometryData — line entities → visible segments', () => {
  const pairKey = (l: { from: string; to: string }) => [l.from, l.to].sort().join('');

  it('draws the ladder B→C: connects the two named points lying on a tangent line, skips off-line points', () => {
    const res = run({
      solidName: 'haystack',
      ops: [
        { op: 'oxyz_point', name: 'B', at: [6, 4, 0] }, // điểm tiếp xúc trên parabol
        { op: 'oxyz_point', name: 'C', at: [9, 0, 0] }, // chân thang trên mặt đất
        { op: 'oxyz_point', name: 'V', at: [4, 5.333, 0] }, // đỉnh — KHÔNG nằm trên tiếp tuyến
        { op: 'oxyz_line', name: 'T', by: { form: 'point_dir', base: [6, 4, 0], dir: [3, -4, 0] } },
      ],
    });
    expect(res.ok).toBe(true);
    const geo = entityTableToGeometryData(res.entities, 'haystack');
    // Đoạn thang B–C được vẽ...
    expect(geo.lines.map(pairKey)).toContain('BC');
    // ...và V (lệch đường) KHÔNG bao giờ bị nối.
    expect(geo.lines.some((l) => l.from === 'V' || l.to === 'V')).toBe(false);
  });

  it('does not invent a segment when fewer than two named points lie on the line', () => {
    const res = run({
      solidName: 'oneOnLine',
      ops: [
        { op: 'oxyz_point', name: 'B', at: [6, 4, 0] }, // duy nhất 1 điểm trên đường
        { op: 'oxyz_point', name: 'V', at: [4, 5.333, 0] }, // lệch đường
        { op: 'oxyz_line', name: 'T', by: { form: 'point_dir', base: [6, 4, 0], dir: [3, -4, 0] } },
      ],
    });
    const geo = entityTableToGeometryData(res.entities, 'oneOnLine');
    expect(geo.lines).toHaveLength(0);
  });

  it('draws the defining segment of a two-point line entity', () => {
    const res = run({
      solidName: 'seg',
      ops: [
        { op: 'oxyz_point', name: 'P', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'Q', at: [3, 0, 0] },
        { op: 'oxyz_line', name: 'L', by: { form: 'two_points', a: 'P', b: 'Q' } },
      ],
    });
    const geo = entityTableToGeometryData(res.entities, 'seg');
    expect(geo.lines.map(pairKey)).toContain('PQ');
  });

  it('connects the two extremes when three named points are collinear on a line', () => {
    const res = run({
      solidName: 'three',
      ops: [
        { op: 'oxyz_point', name: 'P', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'M', at: [2, 0, 0] }, // ở GIỮA
        { op: 'oxyz_point', name: 'Q', at: [5, 0, 0] },
        { op: 'oxyz_line', name: 'L', by: { form: 'point_dir', base: [0, 0, 0], dir: [1, 0, 0] } },
      ],
    });
    const geo = entityTableToGeometryData(res.entities, 'three');
    // Một đoạn duy nhất nối 2 điểm cực biên P–Q (M nằm trên đoạn đó).
    const onLine = geo.lines.filter((l) => pairKey(l) === 'PQ');
    expect(onLine).toHaveLength(1);
    expect(geo.lines.some((l) => l.from === 'M' || l.to === 'M')).toBe(false);
  });
});
