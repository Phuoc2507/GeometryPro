import { describe, it, expect } from 'vitest';
import { scaleGeometry } from '../scaleGeometry';
import type { GeometryData } from '@/types/geometry';

describe('scaleGeometry · co samples đồng bộ với points', () => {
  // maximum = 40 (>20) ⇒ factor = 40/8 = 5.
  const g: GeometryData = {
    name: 'big', points: [{ id: 'A', label: 'A', x: 40, y: 0, z: 0 }], lines: [],
    curves: [{ id: 'c', type: 'expr', params: { xMin: 0, xMax: 40 }, plane: 'xy', samples: [{ x: 0, y: 0 }, { x: 40, y: 20 }] }],
    revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'x' }, domain: [0, 40], axis: 'Ox', method: 'disk', samples: [{ x: 0, r: 0 }, { x: 40, r: 10 }] }],
    areaRegions: [{ id: 'a', outer: { kind: 'expr', expr: 'x' }, inner: { kind: 'const', c: 0 }, domain: [0, 40], samples: [{ x: 0, top: 0, bot: 0 }, { x: 40, top: 20, bot: 0 }] }],
  };

  it('point co factor 5 (x:40→8)', () => {
    const out = scaleGeometry(g)!;
    expect(out.points[0].x).toBeCloseTo(8, 9);
  });
  it('curve.samples + params co cùng factor', () => {
    const out = scaleGeometry(g)!;
    expect(out.curves![0].samples![1]).toMatchObject({ x: 8, y: 4 });
    expect(out.curves![0].params.xMax).toBeCloseTo(8, 9);
  });
  it('solid.samples + domain co cùng factor', () => {
    const out = scaleGeometry(g)!;
    expect(out.revolutionSolids![0].samples![1]).toMatchObject({ x: 8, r: 2 });
    expect(out.revolutionSolids![0].domain).toEqual([0, 8]);
  });
  it('area.samples + domain co cùng factor', () => {
    const out = scaleGeometry(g)!;
    expect(out.areaRegions![0].samples![1]).toMatchObject({ x: 8, top: 4, bot: 0 });
    expect(out.areaRegions![0].domain).toEqual([0, 8]);
  });
  it('maximum ≤ 20 ⇒ không co (samples nguyên)', () => {
    const small = { ...g, points: [{ id: 'A', label: 'A', x: 4, y: 0, z: 0 }] };
    const out = scaleGeometry(small)!;
    expect(out.revolutionSolids![0].samples![1]).toMatchObject({ x: 40, r: 10 });
  });
  it('hình méo THIẾU domain (>20) không ném — giữ nguyên domain', () => {
    const broken = {
      name: 'big', points: [{ id: 'A', label: 'A', x: 40, y: 0, z: 0 }], lines: [],
      // domain bị bỏ (payload LLM méo); trước đây scaleDomain deref d[0] → ném NGOÀI ErrorBoundary.
      revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'x' }, axis: 'Ox', method: 'disk', samples: [{ x: 0, r: 0 }, { x: 40, r: 10 }] }],
      areaRegions: [{ id: 'a', outer: { kind: 'expr', expr: 'x' }, inner: { kind: 'const', c: 0 }, samples: [{ x: 0, top: 0, bot: 0 }, { x: 40, top: 20, bot: 0 }] }],
    } as unknown as GeometryData;
    expect(() => scaleGeometry(broken)).not.toThrow();
    const out = scaleGeometry(broken)!;
    expect(out.revolutionSolids![0].domain).toBeUndefined();
    expect(out.revolutionSolids![0].samples![1]).toMatchObject({ x: 8, r: 2 }); // samples vẫn co
  });
});
