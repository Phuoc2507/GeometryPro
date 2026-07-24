import { describe, expect, it } from 'vitest';
import { collectPlanePointIds, planeReferencesPoint } from './planeReferences';
import { initialGeometryState, rawGeometryReducer } from '@/context/GeometryContext';
import type { GeometryData, Point3D } from '@/types/geometry';

const points: Point3D[] = [
  { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
  { id: 'B', label: 'B', x: 1, y: 0, z: 0 },
  { id: 'C', label: 'C', x: 0, y: 1, z: 0 },
  { id: 'D', label: 'D', x: 0, y: 0, z: 1 },
];

describe('Plane3D point references', () => {
  it('prefers explicit pointIds for new planes', () => {
    const plane = {
      id: 'plane_ABC',
      pointIds: ['A', 'B', 'C'],
      points: [{ x: 99, y: 99, z: 99 }],
    };

    expect([...collectPlanePointIds(plane, points)]).toEqual(['A', 'B', 'C']);
    expect(planeReferencesPoint(plane, points[0])).toBe(true);
    expect(planeReferencesPoint(plane, points[3])).toBe(false);
  });

  it('resolves legacy coordinate-only planes with a 1e-6 tolerance', () => {
    const plane = {
      id: 'legacy',
      points: [
        { x: 0.0000005, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ],
    };

    expect([...collectPlanePointIds(plane, points)]).toEqual(['A', 'B', 'C']);
  });

  it('removes planes that reference a deleted point', () => {
    const geometry: GeometryData = {
      name: 'tetrahedron',
      points,
      lines: [],
      planes: [{
        id: 'plane_ABC',
        pointIds: ['A', 'B', 'C'],
        points: points.slice(0, 3).map(({ x, y, z }) => ({ x, y, z })),
      }],
    };
    const state = { ...initialGeometryState, geometry };

    const next = rawGeometryReducer(state, {
      type: 'REMOVE_ELEMENT', elementType: 'point', elementId: 'A',
    });

    expect(next.geometry?.points.map(point => point.id)).toEqual(['B', 'C', 'D']);
    expect(next.geometry?.planes).toEqual([]);
  });
});
