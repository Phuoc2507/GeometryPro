// api/_lib/kernel/unifiedPlan.ts
import { z } from 'zod';
import { ConstructionOpSchema, type ConstructionOp } from './planSchema';
import { OxyzOpSchema, type OxyzOp, executeOxyzOp } from './dialects/oxyz';
import type { SymbolTable, Vec3 } from './types';
import { createEmptySymbolTable, executeOp } from './execute';
import { type EntityTable, createEmptyEntityTable } from './entityTable';
import { pointFromCoords, planeFromThreePoints } from './entities';
import { num } from './scalar';
import type { Vec3S } from './vec3s';

const OXYZ_OPS = new Set([
  'oxyz_point', 'oxyz_line', 'oxyz_plane', 'oxyz_sphere',
  'oxyz_midpoint', 'oxyz_ratio', 'oxyz_centroid', 'oxyz_reflect',
]);

// The Oxyz ops that introduce a named POINT (used to detect cross-dialect name clashes).
const OXYZ_POINT_OPS = new Set([
  'oxyz_point', 'oxyz_midpoint', 'oxyz_ratio', 'oxyz_centroid', 'oxyz_reflect',
]);

export const UnifiedOpSchema = z.union([ConstructionOpSchema, OxyzOpSchema]);

export const UnifiedPlanSchema = z.object({
  solidName: z.string().min(1),
  ops: z.array(UnifiedOpSchema).min(1),
});

export type UnifiedPlan = z.infer<typeof UnifiedPlanSchema>;

function floatVecToVec3S(v: Vec3): Vec3S {
  return { x: num(v.x), y: num(v.y), z: num(v.z) };
}

// Đồng bộ (bồi thêm) mọi điểm/mặt/cạnh mới của SymbolTable float sang EntityTable.
// Bỏ qua điểm Oxyz (đã được mirror vào symtab để op tổng hợp tham chiếu) — giữ bản EXACT
// trong et, không ghi đè bằng float. Va chạm định-nghĩa-lại được setPoint/setPointE bắt.
function syncSymtabToEntities(symtab: SymbolTable, et: EntityTable, oxyzPointNames: Set<string>): void {
  for (const [name, pos] of symtab.points) {
    if (oxyzPointNames.has(name)) continue; // điểm Oxyz mirror — bản exact đã ở et
    if (!et.points.has(name)) et.points.set(name, pointFromCoords(floatVecToVec3S(pos)));
  }
  for (const [key, verts] of symtab.namedPlanes) {
    et.faces.set(key, verts);
    if (verts.length >= 3 && !et.planes.has(key)) {
      const [a, b, c] = verts.map((n) => floatVecToVec3S(symtab.points.get(n)!));
      et.planes.set(key, planeFromThreePoints(a, b, c));
    }
  }
  for (const e of symtab.edges) et.edges.add(e);
  if (symtab.derivedPoints) for (const d of symtab.derivedPoints) et.derivedPoints.add(d);
}

export function executeUnifiedPlan(plan: UnifiedPlan): EntityTable {
  const symtab = createEmptySymbolTable();
  const et = createEmptyEntityTable();
  const oxyzPointNames = new Set<string>();
  for (const op of plan.ops) {
    const kind = (op as { op: string }).op;
    if (OXYZ_OPS.has(kind)) {
      executeOxyzOp(op as OxyzOp, et);
      if (OXYZ_POINT_OPS.has(kind)) {
        const name = (op as { name: string }).name;
        oxyzPointNames.add(name);
        // Mirror toạ độ float vào symtab để op tổng hợp sau (edge, foot…) tham chiếu được.
        const pe = et.points.get(name);
        if (pe) symtab.points.set(name, { x: pe.p.x.approx, y: pe.p.y.approx, z: pe.p.z.approx });
      }
    } else {
      executeOp(op as ConstructionOp, symtab);
      syncSymtabToEntities(symtab, et, oxyzPointNames);
    }
  }
  return et;
}
