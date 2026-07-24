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

  it('uses explicit planes as the authoritative face source', () => {
    const extraTriangleLines: Line3D[] = [
      ...lines,
      { id: 'AE', from: 'A', to: 'E' },
      { id: 'BE', from: 'B', to: 'E' },
    ];

    expect(extractFaces(points, extraTriangleLines, geometry.planes)).toHaveLength(1);
    expect(createOcclusionModel({ ...geometry, lines: extraTriangleLines }).faces).toHaveLength(1);
  });

  it('does not silently infer graph faces when supplied planes are invalid', () => {
    const invalidPlanes = [{
      id: 'invalid',
      pointIds: ['A', 'missing', 'B'],
      points: [],
    }];

    expect(extractFaces(points, lines, invalidPlanes)).toEqual([]);
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
