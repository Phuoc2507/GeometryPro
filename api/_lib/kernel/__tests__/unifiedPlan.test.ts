// api/_lib/kernel/__tests__/unifiedPlan.test.ts
import { describe, it, expect } from 'vitest';
import { UnifiedPlanSchema, executeUnifiedPlan } from '../unifiedPlan';
import { toApproxVec } from '../vec3s';
import { makeExact } from '../scalar';

describe('UnifiedPlanSchema', () => {
  it('chấp nhận plan trộn op tổng hợp và op Oxyz', () => {
    const r = UnifiedPlanSchema.safeParse({
      solidName: 'mix',
      ops: [
        { op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } },
        { op: 'oxyz_sphere', name: 'S', by: { form: 'center_point', center: 'A', through: 'B' } },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe('executeUnifiedPlan', () => {
  it('dựng hình tổng hợp (float) và entity Oxyz (exact) trong cùng một bảng', () => {
    const et = executeUnifiedPlan({
      solidName: 'mix',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 2, 2] },
        { op: 'oxyz_sphere', name: 'S', by: { form: 'center_point', center: 'A', through: 'B' } },
        { op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' },
      ],
    });
    // Sphere R² = |B−A|² = 1+4+4 = 9, exact
    expect(et.spheres.get('S')!.r2.exact).toEqual(makeExact(9n, 1n, 1));
    // M exact = (1/2, 1, 1)
    expect(et.points.get('M')!.p.x.exact).toEqual(makeExact(1n, 2n, 1));
  });

  it('op tổng hợp và Oxyz cùng tồn tại; điểm tổng hợp là float, điểm Oxyz là exact', () => {
    const et = executeUnifiedPlan({
      solidName: 'mix2',
      ops: [
        { op: 'base', shape: 'square', vertices: ['P', 'Q', 'R', 'T'], dims: { edge: 2 } },
        { op: 'oxyz_point', name: 'A', at: [3, 4, 0] },
      ],
    });
    // 4 đỉnh hình vuông (float) + điểm A (exact) = 5 điểm
    expect(et.points.size).toBe(5);
    expect(et.points.get('P')!.p.x.exact).toBeNull(); // tổng hợp: float-only
    expect(et.points.get('A')!.p.x.exact).toEqual(makeExact(3n, 1n, 1)); // Oxyz: exact
    // face của hình vuông đăng ký thành PlaneE
    expect(et.planes.has('PQRT')).toBe(true);
  });
});
