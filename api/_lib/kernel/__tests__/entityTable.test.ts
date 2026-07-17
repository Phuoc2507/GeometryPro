// api/_lib/kernel/__tests__/entityTable.test.ts
import { describe, it, expect } from 'vitest';
import { createEmptyEntityTable, symtabToEntityTable } from '../entityTable';
import { toApproxVec } from '../vec3s';
import { executePlan } from '../execute';
import { PlanSchema } from '../planSchema';

describe('createEmptyEntityTable', () => {
  it('khởi tạo rỗng đủ các map', () => {
    const et = createEmptyEntityTable();
    expect(et.points.size).toBe(0);
    expect(et.planes.size).toBe(0);
    expect(et.spheres.size).toBe(0);
    expect(et.lines.size).toBe(0);
  });
});

describe('symtabToEntityTable — cầu nối Phase 1', () => {
  it('chuyển điểm và face của một hình vuông sang entity', () => {
    const plan = PlanSchema.parse({
      solidName: 'sq',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } }],
    });
    const symtab = executePlan(plan);
    const et = symtabToEntityTable(symtab);

    // 4 điểm chuyển thành PointE (approx = toạ độ float Phase 1, exact = null)
    expect(et.points.size).toBe(4);
    const A = et.points.get('A')!;
    expect(A.kind).toBe('point');
    expect(A.p.x.exact).toBeNull(); // Phase 1 float-only

    // face ABCD đăng ký một PlaneE
    expect(et.planes.has('ABCD')).toBe(true);
    const plane = et.planes.get('ABCD')!;
    expect(plane.kind).toBe('plane');
    // hình vuông nằm trong z=0 ⇒ pháp tuyến ‖ trục z
    const n = toApproxVec(plane.n);
    expect(Math.abs(n.x)).toBeCloseTo(0, 9);
    expect(Math.abs(n.y)).toBeCloseTo(0, 9);
    expect(Math.abs(n.z)).toBeGreaterThan(0);

    // lớp mesh/render kế thừa
    expect(et.faces.has('ABCD')).toBe(true);
    expect(et.edges.size).toBe(4);
  });
});
