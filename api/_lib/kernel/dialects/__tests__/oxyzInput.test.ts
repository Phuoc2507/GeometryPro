// api/_lib/kernel/dialects/__tests__/oxyzInput.test.ts
import { describe, it, expect } from 'vitest';
import { parseRational, parseVec3S } from '../oxyzInput';
import { makeExact } from '../../scalar';
import { toApproxVec } from '../../vec3s';

describe('parseRational', () => {
  it('số nguyên', () => {
    expect(parseRational(5)).toEqual(makeExact(5n, 1n, 1));
    expect(parseRational(-3)).toEqual(makeExact(-3n, 1n, 1));
  });

  it('thập phân dạng number: 1.5 → 3/2', () => {
    expect(parseRational(1.5)).toEqual(makeExact(3n, 2n, 1));
    expect(parseRational(-0.25)).toEqual(makeExact(-1n, 4n, 1));
  });

  it('string phân số: "3/2", "-7/4"', () => {
    expect(parseRational('3/2')).toEqual(makeExact(3n, 2n, 1));
    expect(parseRational('-7/4')).toEqual(makeExact(-7n, 4n, 1));
  });

  it('string thập phân và nguyên', () => {
    expect(parseRational('1.5')).toEqual(makeExact(3n, 2n, 1));
    expect(parseRational('12')).toEqual(makeExact(12n, 1n, 1));
  });

  it('ném lỗi với number dạng mũ (gợi ý dùng string)', () => {
    expect(() => parseRational(1e-7)).toThrow();
  });

  it('căn: sqrt(3), √3, 2*sqrt(3), sqrt(3)/2, 2*sqrt(3)/3, -sqrt(5)/2', () => {
    expect(parseRational('sqrt(3)')).toEqual(makeExact(1n, 1n, 3));
    expect(parseRational('√3')).toEqual(makeExact(1n, 1n, 3));
    expect(parseRational('2*sqrt(3)')).toEqual(makeExact(2n, 1n, 3));
    expect(parseRational('sqrt(3)/2')).toEqual(makeExact(1n, 2n, 3));
    expect(parseRational('2*sqrt(3)/3')).toEqual(makeExact(2n, 3n, 3));
    expect(parseRational('-sqrt(5)/2')).toEqual(makeExact(-1n, 2n, 5));
    expect(parseRational('2√3')).toEqual(makeExact(2n, 1n, 3));
  });
});

describe('parseVec3S', () => {
  it('dựng vector từ toạ độ hỗn hợp number/string, gương float đúng', () => {
    const v = parseVec3S([1, '3/2', -2]);
    expect(toApproxVec(v)).toEqual({ x: 1, y: 1.5, z: -2 });
    expect(v.y.exact).toEqual(makeExact(3n, 2n, 1));
  });
});
