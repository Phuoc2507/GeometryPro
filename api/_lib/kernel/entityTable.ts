// api/_lib/kernel/entityTable.ts
import type { SymbolTable, Vec3 } from './types';
import type { PointE, LineE, PlaneE, SphereE } from './entities';
import { pointFromCoords, planeFromThreePoints } from './entities';
import { num } from './scalar';
import type { Vec3S } from './vec3s';

export type EntityTable = {
  points: Map<string, PointE>;
  lines: Map<string, LineE>;
  planes: Map<string, PlaneE>;
  spheres: Map<string, SphereE>;
  // Lớp mesh/render kế thừa Phase 1:
  faces: Map<string, string[]>;
  edges: Set<string>;
  derivedPoints: Set<string>;
};

export function createEmptyEntityTable(): EntityTable {
  return {
    points: new Map(),
    lines: new Map(),
    planes: new Map(),
    spheres: new Map(),
    faces: new Map(),
    edges: new Set(),
    derivedPoints: new Set(),
  };
}

// Vec3 float (Phase 1) → Vec3S float-only (exact = null, giữ nguyên giá trị dựng).
function floatVecToVec3S(v: Vec3): Vec3S {
  return { x: num(v.x), y: num(v.y), z: num(v.z) };
}

// Bồi thêm: dựng EntityTable từ SymbolTable đã execute của Phase 1. Điểm giữ float-only;
// mỗi face đăng ký thêm một PlaneE (qua 3 đỉnh đầu) bên cạnh lớp mesh.
export function symtabToEntityTable(symtab: SymbolTable): EntityTable {
  const et = createEmptyEntityTable();

  for (const [name, pos] of symtab.points) {
    et.points.set(name, pointFromCoords(floatVecToVec3S(pos)));
  }

  for (const [key, verts] of symtab.namedPlanes) {
    et.faces.set(key, verts);
    if (verts.length >= 3) {
      const [a, b, c] = verts.map((n) => floatVecToVec3S(symtab.points.get(n)!));
      et.planes.set(key, planeFromThreePoints(a, b, c));
    }
  }

  for (const e of symtab.edges) et.edges.add(e);
  if (symtab.derivedPoints) for (const d of symtab.derivedPoints) et.derivedPoints.add(d);

  return et;
}
