// Nón & trụ: thể tích / diện tích xung quanh–toàn phần / đường sinh — DẠNG π & CĂN chính xác.
import { describe, it, expect } from 'vitest';
import { run } from '../run';

const DUMMY = [{ op: 'oxyz_point', name: 'O', at: [0, 0, 0] }]; // plan cần ≥1 op; nón/trụ không dùng entity
const solve = (queries: unknown[]) => run({ solidName: 't', ops: DUMMY, queries } as never);
const texts = (queries: unknown[]) => solve(queries).answers.map((a) => a.text);

describe('nón', () => {
  it('r=3, h=4: V=12π, l=5, Sxq=15π, Stp=24π', () => {
    expect(texts([
      { kind: 'volume', solid: 'cone', r: 3, h: 4 },
      { kind: 'slant', r: 3, h: 4 },
      { kind: 'area', shape: 'cone', part: 'lateral', r: 3, h: 4 },
      { kind: 'area', shape: 'cone', part: 'total', r: 3, h: 4 },
    ])).toEqual(['12π', '5', '15π', '24π']);
  });
  it('r=1, h=1: đường sinh √2, Sxq = √2π', () => {
    expect(texts([
      { kind: 'slant', r: 1, h: 1 },
      { kind: 'area', shape: 'cone', part: 'lateral', r: 1, h: 1 },
    ])).toEqual(['√2', '√2π']);
  });
  it('r=√3, h=3: V = 3π', () => {
    expect(texts([{ kind: 'volume', solid: 'cone', r: 'sqrt(3)', h: 3 }])).toEqual(['3π']);
  });
});

describe('trụ', () => {
  it('r=2, h=5: V=20π, Sxq=20π, Stp=28π', () => {
    expect(texts([
      { kind: 'volume', solid: 'cylinder', r: 2, h: 5 },
      { kind: 'area', shape: 'cylinder', part: 'lateral', r: 2, h: 5 },
      { kind: 'area', shape: 'cylinder', part: 'total', r: 2, h: 5 },
    ])).toEqual(['20π', '20π', '28π']);
  });
  it('giá trị số khớp công thức', () => {
    const v = solve([{ kind: 'volume', solid: 'cylinder', r: 2, h: 5 }]).answers[0];
    expect(v.approx).toBeCloseTo(Math.PI * 4 * 5, 6);
    expect(v.approximate).toBe(false);
  });
});

describe('nón cụt', () => {
  it('R=5, r=2, h=4 (l=5): V=52π, l=5, Sxq=35π, Stp=64π', () => {
    expect(texts([
      { kind: 'volume', solid: 'cone_frustum', R: 5, r: 2, h: 4 },
      { kind: 'slant', R: 5, r: 2, h: 4 },
      { kind: 'area', shape: 'cone_frustum', part: 'lateral', R: 5, r: 2, h: 4 },
      { kind: 'area', shape: 'cone_frustum', part: 'total', R: 5, r: 2, h: 4 },
    ])).toEqual(['52π', '5', '35π', '64π']);
  });
  it('R=2, r=1, h=2: đường sinh √5, Sxq = 3√5π', () => {
    expect(texts([
      { kind: 'slant', R: 2, r: 1, h: 2 },
      { kind: 'area', shape: 'cone_frustum', part: 'lateral', R: 2, r: 1, h: 2 },
    ])).toEqual(['√5', '3√5π']);
  });
});

describe('chóp cụt (đáy S1, S2, cao h) — không π', () => {
  it('S1=9, S2=4, h=3: V = 19', () => {
    expect(texts([{ kind: 'volume', solid: 'pyramid_frustum', s1: 9, s2: 4, h: 3 }])).toEqual(['19']);
  });
  it('S1=3, S2=12, h=2: √(S1·S2)=6 ⇒ V = 14', () => {
    expect(texts([{ kind: 'volume', solid: 'pyramid_frustum', s1: 3, s2: 12, h: 2 }])).toEqual(['14']);
  });
});
