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
  });
});
