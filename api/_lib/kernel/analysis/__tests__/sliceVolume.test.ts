import { describe, it, expect } from 'vitest';
import { buildSliceStack, sliceStackVolume } from '../sliceVolume';

const sqrtX = { kind: 'sqrt', a: 1, b: 0 } as const;   // side = √x ⇒ side² = x, ∫_0^4 x dx = 8

describe('sliceVolume — thiết diện đã biết', () => {
  it('vuông, đáy √x trên [0,4] ⇒ V=8', () => {
    expect(sliceStackVolume('square', sqrtX, [0, 4]).value).toBeCloseTo(8, 6);
  });
  it('nửa tròn ⇒ (π/8)·8 = π', () => {
    expect(sliceStackVolume('semicircle', sqrtX, [0, 4]).value).toBeCloseTo(Math.PI, 6);
  });
  it('tam giác đều ⇒ (√3/4)·8 = 2√3', () => {
    expect(sliceStackVolume('equilateral', sqrtX, [0, 4]).value).toBeCloseTo(2 * Math.sqrt(3), 6);
  });
  it('chữ nhật ratio=2 ⇒ 2·8 = 16', () => {
    expect(sliceStackVolume('rect', sqrtX, [0, 4], undefined, 2).value).toBeCloseTo(16, 6);
  });
  it('builder gắn volume verified + method + samples', () => {
    const s = buildSliceStack('s1', 'square', sqrtX, [0, 4]);
    expect(s.volume!.verified).toBe(true);
    expect(s.volume!.value).toBeCloseTo(8, 6);
    expect(s.section).toBe('square');
    expect(s.samples!.length).toBeGreaterThan(0);
    expect(s.samples![s.samples!.length - 1]).toMatchObject({ t: 4 });
    expect(s.samples![s.samples!.length - 1].side).toBeCloseTo(2, 6);
  });
  it('side dùng |outer-inner|: đáy giữa outer=2, inner=0 ⇒ vuông cạnh 2 trên [0,3] ⇒ V=4·3=12', () => {
    const v = sliceStackVolume('square', { kind: 'const', c: 2 }, [0, 3], { kind: 'const', c: 0 });
    expect(v.value).toBeCloseTo(12, 6);
  });
});
