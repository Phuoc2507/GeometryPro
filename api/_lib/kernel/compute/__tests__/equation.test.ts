// api/_lib/kernel/compute/__tests__/equation.test.ts
import { describe, it, expect } from 'vitest';
import { planeEquationText, sphereEquationText } from '../equation';
import { planeFromCoeffs, planeFromThreePoints, sphereFromEquation } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat } from '../../scalar';

describe('planeEquationText', () => {
  it('hệ số nguyên: 2x − y + 2z − 3 = 0', () => {
    const pl = planeFromCoeffs(rat(2n), rat(-1n), rat(2n), rat(-3n));
    expect(planeEquationText(pl)).toBe('2x - y + 2z - 3 = 0');
  });
  it('mặt z=0 từ 3 điểm', () => {
    const pl = planeFromThreePoints(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(planeEquationText(pl)).toBe('z = 0');
  });
  it('khử mẫu về hệ số nguyên: (1/2)x + y = 0 → x + 2y = 0', () => {
    const pl = planeFromCoeffs(rat(1n, 2n), rat(1n), rat(0n), rat(0n));
    expect(planeEquationText(pl)).toBe('x + 2y = 0');
  });
});

describe('sphereEquationText', () => {
  it('tâm (1,2,3), R²=9', () => {
    const s = sphereFromEquation(rat(-2n), rat(-4n), rat(-6n), rat(5n));
    expect(sphereEquationText(s)).toBe('(x - 1)² + (y - 2)² + (z - 3)² = 9');
  });
});

import { lineEquationText } from '../equation';
import { lineFromPointDir } from '../../entities';

describe('lineEquationText (tham số)', () => {
  it('điểm (1,0,0), chỉ phương (2,1,-1)', () => {
    const l = lineFromPointDir(ratVec(1n, 0n, 0n), ratVec(2n, 1n, -1n));
    const txt = lineEquationText(l);
    expect(txt).toContain('x = 1 + 2t');
    expect(txt).toContain('z = 0 - 1t');
  });
});
