// api/_lib/kernel/entityToGeometry.ts
// Chuyển EntityTable (kết quả run()) sang GeometryData của frontend để render.
import type { EntityTable } from './entityTable';
import type { GeometryData } from '../../../src/types/geometry';

export function entityTableToGeometryData(et: EntityTable, name: string): GeometryData {
  const points = Array.from(et.points.entries()).map(([label, pe]) => ({
    id: label,
    label,
    x: pe.p.x.approx,
    y: pe.p.y.approx,
    z: pe.p.z.approx,
  }));

  const lines = Array.from(et.edges).map((key) => {
    const [from, to] = key.split('|');
    return { id: `${from}${to}`, from, to, style: 'solid' as const };
  });

  const spheres = Array.from(et.spheres.entries()).map(([label, s]) => ({
    id: label,
    label,
    center: { x: s.center.x.approx, y: s.center.y.approx, z: s.center.z.approx },
    radius: Math.sqrt(Math.max(0, s.r2.approx)),
  }));

  // Mặt hiển thị lấy từ face (đa giác có tên) — góc mặt là các đỉnh.
  const planes = Array.from(et.faces.entries())
    .filter(([, verts]) => verts.length >= 3)
    .map(([key, verts]) => ({
      id: key,
      label: key,
      points: verts.map((n) => {
        const p = et.points.get(n)!;
        return { x: p.p.x.approx, y: p.p.y.approx, z: p.p.z.approx };
      }),
    }));

  return { name, points, lines, spheres, planes } as GeometryData;
}
