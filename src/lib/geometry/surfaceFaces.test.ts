import { describe, expect, it } from 'vitest';
import type { Line3D, Plane3D, Point3D } from '@/types/geometry';
import {
  deriveSectionEdgeIds,
  deriveSectionPlanes,
  deriveSurfaceFaces,
  deriveSurfacePlanes,
} from './surfaceFaces';

const edge = (from: string, to: string): Line3D => ({ id: `${from}${to}`, from, to });

function faceKeys(faces: { pointIds?: string[] }[]): string[] {
  return faces.map((face) => [...(face.pointIds ?? [])].sort().join(''));
}

function coordsOf(points: Point3D[], ids: string[]) {
  const byId = new Map(points.map((point) => [point.id, point]));
  return ids.map((id) => {
    const point = byId.get(id)!;
    return { x: point.x, y: point.y, z: point.z };
  });
}

/** Unit cube A B C D (bottom) / E F G H (top), fully wired with 12 edges. */
function buildCube() {
  const points: Point3D[] = [
    { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
    { id: 'B', label: 'B', x: 2, y: 0, z: 0 },
    { id: 'C', label: 'C', x: 2, y: 2, z: 0 },
    { id: 'D', label: 'D', x: 0, y: 2, z: 0 },
    { id: 'E', label: 'E', x: 0, y: 0, z: 2 },
    { id: 'F', label: 'F', x: 2, y: 0, z: 2 },
    { id: 'G', label: 'G', x: 2, y: 2, z: 2 },
    { id: 'H', label: 'H', x: 0, y: 2, z: 2 },
  ];
  const lines: Line3D[] = [
    edge('A', 'B'), edge('B', 'C'), edge('C', 'D'), edge('D', 'A'),
    edge('E', 'F'), edge('F', 'G'), edge('G', 'H'), edge('H', 'E'),
    edge('A', 'E'), edge('B', 'F'), edge('C', 'G'), edge('D', 'H'),
  ];
  return { points, lines };
}

describe('deriveSurfaceFaces', () => {
  it('derives exactly six faces for a cube from its edge graph', () => {
    const { points, lines } = buildCube();
    const faces = deriveSurfaceFaces({ points, lines, planes: [] });
    expect(faces).toHaveLength(6);
    // Every face is a quad; the whole surface is a closed manifold.
    expect(faces.every((face) => face.vertices.length === 4)).toBe(true);
  });

  it('drops an interior cross-section of a pyramid', () => {
    const points: Point3D[] = [
      { id: 'A', label: 'A', x: -1, y: -1, z: 0 },
      { id: 'B', label: 'B', x: 1, y: -1, z: 0 },
      { id: 'C', label: 'C', x: 1, y: 1, z: 0 },
      { id: 'D', label: 'D', x: -1, y: 1, z: 0 },
      { id: 'S', label: 'S', x: 0, y: 0, z: 2 },
    ];
    const lines: Line3D[] = [
      edge('A', 'B'), edge('B', 'C'), edge('C', 'D'), edge('D', 'A'),
      edge('S', 'A'), edge('S', 'B'), edge('S', 'C'), edge('S', 'D'),
    ];
    // (SAC) is a plane cutting through the solid — it must not survive.
    const planes: Plane3D[] = [
      { id: 'SAC', pointIds: ['S', 'A', 'C'], points: coordsOf(points, ['S', 'A', 'C']) },
    ];

    const keys = faceKeys(deriveSurfaceFaces({ points, lines, planes }));
    expect(keys).toHaveLength(5);
    expect(keys).toContain('ABCD'); // base
    expect(keys).toContain('ABS'); // a side face
    expect(keys).not.toContain('ACS'); // the interior cut is gone
  });

  it('keeps a standalone flat figure that has no surrounding solid', () => {
    const points: Point3D[] = [
      { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
      { id: 'B', label: 'B', x: 2, y: 0, z: 0 },
      { id: 'C', label: 'C', x: 2, y: 2, z: 0 },
      { id: 'D', label: 'D', x: 0, y: 2, z: 0 },
    ];
    const planes: Plane3D[] = [
      { id: 'flat', pointIds: ['A', 'B', 'C', 'D'], points: coordsOf(points, ['A', 'B', 'C', 'D']) },
    ];
    expect(faceKeys(deriveSurfaceFaces({ points, lines: [], planes }))).toEqual(['ABCD']);
  });

  it('rescues the reflex faces of a concave L-shaped prism', () => {
    // Hexagonal L cross-section extruded along z; a closed 8-face manifold.
    const profile = [
      { n: 'A', x: 0, y: 0 },
      { n: 'B', x: 3, y: 0 },
      { n: 'C', x: 3, y: 1 },
      { n: 'D', x: 1, y: 1 },
      { n: 'E', x: 1, y: 3 },
      { n: 'F', x: 0, y: 3 },
    ];
    const levels = [{ suffix: '0', z: 0 }, { suffix: '1', z: 2 }];
    const points: Point3D[] = [];
    for (const level of levels) {
      for (const p of profile) {
        points.push({ id: `${p.n}${level.suffix}`, label: `${p.n}${level.suffix}`, x: p.x, y: p.y, z: level.z });
      }
    }
    const names = profile.map((p) => p.n);
    const lines: Line3D[] = [];
    for (let index = 0; index < names.length; index++) {
      const a = names[index];
      const b = names[(index + 1) % names.length];
      lines.push(edge(`${a}0`, `${b}0`), edge(`${a}1`, `${b}1`), edge(`${a}0`, `${a}1`));
    }
    const caps: Plane3D[] = levels.map((level) => ({
      id: `cap${level.suffix}`,
      pointIds: names.map((n) => `${n}${level.suffix}`),
      points: coordsOf(points, names.map((n) => `${n}${level.suffix}`)),
    }));

    const faces = deriveSurfaceFaces({ points, lines, planes: caps });
    // 6 rectangular sides + 2 hexagonal caps — none dropped even though the
    // inner-corner sides fail the half-space test on a concave body.
    expect(faces).toHaveLength(8);
  });
});

describe('deriveSectionPlanes', () => {
  const points: Point3D[] = [
    { id: 'A', label: 'A', x: -1, y: -1, z: 0 },
    { id: 'B', label: 'B', x: 1, y: -1, z: 0 },
    { id: 'C', label: 'C', x: 1, y: 1, z: 0 },
    { id: 'D', label: 'D', x: -1, y: 1, z: 0 },
    { id: 'S', label: 'S', x: 0, y: 0, z: 2 },
  ];
  const lines: Line3D[] = [
    edge('A', 'B'), edge('B', 'C'), edge('C', 'D'), edge('D', 'A'),
    edge('S', 'A'), edge('S', 'B'), edge('S', 'C'), edge('S', 'D'),
  ];
  // (SAC) cuts through the pyramid — an intentional cross-section.
  const section: Plane3D = {
    id: 'SAC', color: '#22d3ee', opacity: 0.3,
    pointIds: ['S', 'A', 'C'], points: coordsOf(points, ['S', 'A', 'C']),
  };

  it('returns the supplied interior cut as a cross-section, not a hull face', () => {
    const geometry = { points, lines, planes: [section] };
    expect(faceKeys(deriveSurfaceFaces(geometry))).not.toContain('ACS');

    const sections = deriveSectionPlanes(geometry);
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe('SAC');
    expect(sections[0].color).toBe('#22d3ee'); // styling preserved
    expect(sections[0].opacity).toBe(0.3);
  });

  it('marks the section boundary edges that exist as lines (for solid strokes)', () => {
    const ids = deriveSectionEdgeIds({ points, lines, planes: [section] });
    // S-A and S-C are drawn; the base diagonal A-C is not a line.
    expect(ids.has('SA')).toBe(true);
    expect(ids.has('SC')).toBe(true);
    expect(ids.has('AC')).toBe(false);
  });

  it('reports no sections for a plain hull face', () => {
    const { points: cubePoints, lines: cubeLines } = buildCube();
    expect(deriveSectionPlanes({ points: cubePoints, lines: cubeLines, planes: [] })).toEqual([]);
  });
});

describe('deriveSurfacePlanes', () => {
  it('preserves the id, colour and opacity of a matched plane', () => {
    const { points, lines } = buildCube();
    const supplied: Plane3D = {
      id: 'topFace',
      pointIds: ['E', 'F', 'G', 'H'],
      points: coordsOf(points, ['E', 'F', 'G', 'H']),
      color: '#123456',
      opacity: 0.5,
    };

    const planes = deriveSurfacePlanes({ points, lines, planes: [supplied] });
    expect(planes).toHaveLength(6);

    const top = planes.find((plane) => plane.id === 'topFace');
    expect(top).toBeDefined();
    expect(top?.color).toBe('#123456');
    expect(top?.opacity).toBe(0.5);

    // The five faces the producer never supplied get fresh, deterministic ids.
    const generated = planes.filter((plane) => plane.id !== 'topFace');
    expect(generated).toHaveLength(5);
    expect(generated.every((plane) => plane.id.startsWith('surface-'))).toBe(true);
  });
});
