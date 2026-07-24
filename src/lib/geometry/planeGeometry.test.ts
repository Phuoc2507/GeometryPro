import { describe, expect, it } from 'vitest';
import { buildPlanarPolygonGeometry } from './planeGeometry';

describe('buildPlanarPolygonGeometry', () => {
  it('triangulates a concave five-vertex polygon in its own plane', () => {
    const result = buildPlanarPolygonGeometry([
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
      { x: 3, y: 3, z: 0 },
      { x: 1.5, y: 1, z: 0 },
      { x: 0, y: 3, z: 0 },
    ]);

    expect(result).not.toBeNull();
    expect(result?.geometry.getAttribute('position').count).toBe(5);
    expect(result?.geometry.index?.count).toBe(9);
    expect(result?.edgePoints).toHaveLength(6);
    result?.geometry.dispose();
  });

  it('works for a tilted polygon with up to eight vertices', () => {
    const points = Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4;
      const x = Math.cos(angle) * 2;
      const y = Math.sin(angle) * 2;
      return { x, y, z: x + y + 1 };
    });
    const result = buildPlanarPolygonGeometry(points);
    expect(result?.geometry.index?.count).toBe(18);
    result?.geometry.dispose();
  });

  it('deduplicates repeated corners and rejects degenerate input', () => {
    const result = buildPlanarPolygonGeometry([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 0, y: 2, z: 0 },
    ]);
    expect(result?.geometry.getAttribute('position').count).toBe(3);
    result?.geometry.dispose();

    expect(buildPlanarPolygonGeometry([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 2, z: 2 },
    ])).toBeNull();
  });
});
