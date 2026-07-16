// api/_lib/kernel/__tests__/scalar.test.ts
import { describe, it, expect } from 'vitest';
import { makeExact, exactToApprox, displayExact } from '../scalar';

describe('makeExact — chuẩn hoá', () => {
  it('rút gọn phân số và đưa dấu về tử', () => {
    const e = makeExact(4n, -8n, 1);
    expect(e).toEqual({ num: -1n, den: 2n, radicand: 1 });
  });

  it('rút thừa số chính phương khỏi radicand (√8 → 2√2)', () => {
    const e = makeExact(1n, 1n, 8);
    expect(e).toEqual({ num: 2n, den: 1n, radicand: 2 });
  });

  it('radicand = 1 giữ nguyên là số hữu tỷ', () => {
    expect(makeExact(3n, 1n, 1)).toEqual({ num: 3n, den: 1n, radicand: 1 });
  });

  it('num = 0 chuẩn hoá về 0 hữu tỷ bất kể radicand', () => {
    expect(makeExact(0n, 5n, 7)).toEqual({ num: 0n, den: 1n, radicand: 1 });
  });
});

describe('exactToApprox', () => {
  it('cho giá trị float đúng', () => {
    expect(exactToApprox(makeExact(3n, 14n, 14))).toBeCloseTo((3 / 14) * Math.sqrt(14), 12);
    expect(exactToApprox(makeExact(1n, 1n, 8))).toBeCloseTo(Math.sqrt(8), 12);
  });
});

describe('displayExact', () => {
  it('số nguyên và phân số', () => {
    expect(displayExact(makeExact(5n, 1n, 1))).toBe('5');
    expect(displayExact(makeExact(3n, 2n, 1))).toBe('3/2');
    expect(displayExact(makeExact(-3n, 2n, 1))).toBe('-3/2');
  });

  it('căn thuần và có hệ số', () => {
    expect(displayExact(makeExact(1n, 1n, 2))).toBe('√2');
    expect(displayExact(makeExact(3n, 14n, 14))).toBe('3√14/14');
    expect(displayExact(makeExact(2n, 1n, 3))).toBe('2√3');
  });
});
