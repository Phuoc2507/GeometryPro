// api/_lib/kernel/__tests__/resolveE.test.ts
import { describe, it, expect } from 'vitest';
import { resolveEntityE } from '../resolveE';
import { createEmptyEntityTable } from '../entityTable';
import { pointFromCoords, lineFromPointDir } from '../entities';
import { ratVec, toApproxVec } from '../vec3s';

function et3() {
  const et = createEmptyEntityTable();
  et.points.set('A', pointFromCoords(ratVec(0n, 0n, 0n)));
  et.points.set('B', pointFromCoords(ratVec(1n, 0n, 0n)));
  et.points.set('C', pointFromCoords(ratVec(0n, 1n, 0n)));
  return et;
}

describe('resolveEntityE', () => {
  it('điểm có tên', () => {
    expect(resolveEntityE('A', et3()).kind).toBe('point');
  });
  it('ghép 2 chữ → đường', () => {
    const e = resolveEntityE('AB', et3());
    expect(e.kind).toBe('line');
    if (e.kind === 'line') expect(toApproxVec(e.dir)).toEqual({ x: 1, y: 0, z: 0 });
  });
  it('ghép 3 chữ → mặt', () => {
    expect(resolveEntityE('ABC', et3()).kind).toBe('plane');
  });
  it('entity có tên (đường Oxyz)', () => {
    const et = et3();
    et.lines.set('d', lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(0n, 0n, 1n)));
    expect(resolveEntityE('d', et).kind).toBe('line');
  });
  it('token ngoặc "(ABC)"', () => {
    expect(resolveEntityE('(ABC)', et3()).kind).toBe('plane');
  });
  it('token không giải được → ném', () => {
    expect(() => resolveEntityE('XYZ', et3())).toThrow();
  });
});
