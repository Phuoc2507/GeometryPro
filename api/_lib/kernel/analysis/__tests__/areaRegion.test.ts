import { describe, it, expect } from 'vitest';
import { planarArea, buildAreaRegion } from '../sliceVolume';

const line = { kind: 'poly', coeffs: [0, 1] } as const;    // y=x
const para = { kind: 'poly', coeffs: [0, 0, 1] } as const; // y=x²

describe('areaRegion — diện tích hình phẳng', () => {
  it('giữa y=x và y=x² trên [0,1] ⇒ 1/6', () => {
    expect(planarArea(line, para, [0, 1]).value).toBeCloseTo(1 / 6, 6);
  });
  it('|·| bất chấp thứ tự: đổi outer/inner vẫn 1/6', () => {
    expect(planarArea(para, line, [0, 1]).value).toBeCloseTo(1 / 6, 6);
  });
  it('builder gắn area verified + samples {x,top,bot}', () => {
    const r = buildAreaRegion('a1', line, [0, 1], para);
    expect(r.area!.verified).toBe(true);
    expect(r.area!.value).toBeCloseTo(1 / 6, 6);
    expect(r.samples![0]).toHaveProperty('top');
    expect(r.samples![0]).toHaveProperty('bot');
  });
  it('inner mặc định = 0 khi vắng', () => {
    const r = buildAreaRegion('a2', { kind: 'const', c: 3 }, [0, 2]); // ∫_0^2 3 dx = 6
    expect(r.area!.value).toBeCloseTo(6, 6);
    expect(r.inner).toEqual({ kind: 'const', c: 0 });
  });
});
