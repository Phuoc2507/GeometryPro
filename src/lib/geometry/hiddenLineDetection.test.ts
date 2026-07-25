import { describe, expect, it } from 'vitest';
import type { GeometryData, Line3D, Point3D } from '@/types/geometry';
import { extractFaces } from './extractFaces';
import {
  createHiddenLineDetector,
  createOcclusionModel,
  getDesiredHiddenState,
  getOcclusionEpsilon,
  isLineDashed,
  mergeLineDashStyles,
} from './hiddenLineDetection';

const points: Point3D[] = [
  { id: 'A', label: 'A', x: -2, y: 1, z: -2 },
  { id: 'B', label: 'B', x: 2, y: 1, z: -2 },
  { id: 'C', label: 'C', x: 2, y: 1, z: 2 },
  { id: 'D', label: 'D', x: -2, y: 1, z: 2 },
  { id: 'E', label: 'E', x: -0.5, y: 0, z: 0 },
  { id: 'F', label: 'F', x: 0.5, y: 0, z: 0 },
];

const lines: Line3D[] = [
  { id: 'AB', from: 'A', to: 'B' },
  { id: 'BC', from: 'B', to: 'C' },
  { id: 'CD', from: 'C', to: 'D' },
  { id: 'DA', from: 'D', to: 'A' },
  { id: 'EF', from: 'E', to: 'F' },
];

const geometry: GeometryData = {
  name: 'explicit occluder',
  points,
  lines,
  planes: [{
    id: 'ABCD',
    pointIds: ['A', 'B', 'C', 'D'],
    points: points.slice(0, 4).map(({ x, y, z }) => ({ x, y, z })),
  }],
};

describe('shared hidden-line detection', () => {
  it('uses explicit planes in the export detector', () => {
    const result = createHiddenLineDetector(geometry).detect([0, 0, 5]);

    expect(result.get('EF')).toBe(true);
    expect(result.get('AB')).toBe(false);
  });

  it('derives faces from the edge graph in addition to supplied planes', () => {
    // Adding A-E and B-E closes a triangle A-B-E in the graph. The surface is
    // now derived from geometry, so both the base quad and that triangle become
    // faces of the solid rather than the plane list being taken verbatim.
    const extraTriangleLines: Line3D[] = [
      ...lines,
      { id: 'AE', from: 'A', to: 'E' },
      { id: 'BE', from: 'B', to: 'E' },
    ];

    const faces = extractFaces(points, extraTriangleLines, geometry.planes);
    const keys = faces.map((face) => [...(face.pointIds ?? [])].sort().join(''));
    expect(keys).toContain('ABCD');
    expect(keys).toContain('ABE');
    expect(faces).toHaveLength(2);
    expect(createOcclusionModel({ ...geometry, lines: extraTriangleLines }).faces).toHaveLength(2);
  });

  it('falls back to graph faces when a supplied plane is malformed', () => {
    // A plane whose points cannot be resolved is discarded, but the genuine
    // base quad is still recovered from the edge graph instead of vanishing.
    const invalidPlanes = [{
      id: 'invalid',
      pointIds: ['A', 'missing', 'B'],
      points: [],
    }];

    const faces = extractFaces(points, lines, invalidPlanes);
    expect(faces).toHaveLength(1);
    expect([...(faces[0].pointIds ?? [])].sort().join('')).toBe('ABCD');
  });

  it('dashes an edge that passes behind a sphere, keeps a side edge solid', () => {
    // AB sits directly behind a sphere from the camera; XY is off to the side.
    const occluderPoints: Point3D[] = [
      { id: 'A', label: 'A', x: -1, y: -5, z: 0 },
      { id: 'B', label: 'B', x: 1, y: -5, z: 0 },
      { id: 'X', label: 'X', x: 5, y: 5, z: 5 },
      { id: 'Y', label: 'Y', x: 6, y: 5, z: 5 },
    ];
    const occluderLines: Line3D[] = [
      { id: 'AB', from: 'A', to: 'B' },
      { id: 'XY', from: 'X', to: 'Y' },
    ];
    const withSphere: GeometryData = {
      name: 'sphere occluder',
      points: occluderPoints,
      lines: occluderLines,
      planes: [],
      spheres: [{ id: 's', center: { x: 0, y: 0, z: 0 }, radius: 2 }],
    };

    const result = createHiddenLineDetector(withSphere).detect([0, 0, 10]);
    expect(result.get('AB')).toBe(true); // hidden behind the sphere
    expect(result.get('XY')).toBe(false); // clear line of sight
  });

  it('never lets a dynamic false override an explicit dashed style', () => {
    const dashed: Line3D = { id: 'EF', from: 'E', to: 'F', style: 'dashed' };
    const dynamic = new Map([['EF', false], ['AB', true]]);

    expect(isLineDashed(dashed, dynamic)).toBe(true);
    expect(mergeLineDashStyles([dashed, lines[0]], dynamic)).toEqual(
      new Map([['EF', true], ['AB', true]]),
    );
  });

  it('uses the same 3/4 threshold for deterministic export classification', () => {
    expect(getDesiredHiddenState(false, 2, 4)).toBe(false);
    expect(getDesiredHiddenState(false, 3, 4)).toBe(true);
    expect(getDesiredHiddenState(true, 2, 4)).toBe(true);
    expect(getDesiredHiddenState(true, 1, 4)).toBe(false);
  });

  it('uses a small scale-relative raycast epsilon', () => {
    expect(getOcclusionEpsilon(10)).toBeCloseTo(0.001);
    expect(getOcclusionEpsilon(100)).toBeCloseTo(0.01);
  });
});
