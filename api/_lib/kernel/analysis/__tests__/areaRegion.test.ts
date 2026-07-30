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

describe('areaRegion — vá cận vô tỉ', () => {
  it('giữa y=x+1 và y=x²: cận snap về (1±√5)/2 từ gợi ý thập phân ⇒ S=5√5/6', () => {
    // Giao x+1=x² tại x=(1±√5)/2 ≈ −0.618, 1.618; S=(√5)³/6=5√5/6≈1.8634.
    const r = buildAreaRegion(
      'a3', { kind: 'poly', coeffs: [1, 1] }, [-0.62, 1.62], { kind: 'poly', coeffs: [0, 0, 1] },
    );
    expect(r.domain[0]).toBeCloseTo((1 - Math.sqrt(5)) / 2, 6);
    expect(r.domain[1]).toBeCloseTo((1 + Math.sqrt(5)) / 2, 6);
    expect(r.area!.value).toBeCloseTo((5 * Math.sqrt(5)) / 6, 5);
    expect(r.area!.verified).toBe(true);
  });
  it('giữa y=3−x² và Ox: cận snap về ±√3 từ gợi ý 1.73 ⇒ S=4√3', () => {
    // 3−x²=0 tại x=±√3; S=∫_{−√3}^{√3}(3−x²)dx=4√3≈6.9282. inner vắng ⇒ mốc = Ox.
    const r = buildAreaRegion('a4', { kind: 'poly', coeffs: [3, 0, -1] }, [-1.73, 1.73]);
    expect(r.domain[0]).toBeCloseTo(-Math.sqrt(3), 6);
    expect(r.domain[1]).toBeCloseTo(Math.sqrt(3), 6);
    expect(r.area!.value).toBeCloseTo(4 * Math.sqrt(3), 5);
    expect(r.area!.verified).toBe(true);
  });
});
