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
