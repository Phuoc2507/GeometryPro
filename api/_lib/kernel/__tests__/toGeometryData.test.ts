// api/_lib/kernel/__tests__/toGeometryData.test.ts
import { describe, it, expect } from 'vitest';
import { toGeometryData } from '../toGeometryData';
import { executePlan } from '../execute';
import { PlanSchema } from '../planSchema';

describe('toGeometryData', () => {
  const plan = PlanSchema.parse({
    solidName: 'S.ABCD',
    ops: [
      { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 1 } },
      { op: 'perp_point', name: 'S', from: 'A', to: 'plane', target: 'ABCD', length: Math.sqrt(2) },
    ],
  });

  it('maps every symbol-table point to a Point3D with matching id/label/coords', () => {
    const symtab = executePlan(plan);
    const geo = toGeometryData(symtab, plan.solidName);
    expect(geo.name).toBe('S.ABCD');
    expect(geo.points).toHaveLength(5);
    const A = geo.points.find((p) => p.id === 'A')!;
    expect(A.label).toBe('A');
    expect(A.x).toBeCloseTo(symtab.points.get('A')!.x, 10);
    expect(A.y).toBeCloseTo(symtab.points.get('A')!.y, 10);
    expect(A.z).toBeCloseTo(symtab.points.get('A')!.z, 10);
  });

  it('maps every registered edge to a Line3D connecting the right point ids', () => {
    const symtab = executePlan(plan);
    const geo = toGeometryData(symtab, plan.solidName);
    const hasEdge = (a: string, b: string) =>
      geo.lines.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
    expect(hasEdge('A', 'B')).toBe(true);
    expect(hasEdge('C', 'D')).toBe(true);
    expect(geo.lines).toHaveLength(4); // just the square's 4 edges; S has no auto-edges in Phase 1
  });
});
