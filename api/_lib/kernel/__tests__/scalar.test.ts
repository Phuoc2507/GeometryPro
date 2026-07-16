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

// append to api/_lib/kernel/__tests__/scalar.test.ts
import { addExact, mulExact, divExact, negExact, sqrtExact } from '../scalar';

describe('số học Exact', () => {
  it('cộng hai hữu tỷ', () => {
    expect(addExact(makeExact(1n, 2n), makeExact(1n, 3n))).toEqual(makeExact(5n, 6n));
  });

  it('cộng hai căn cùng radicand', () => {
    // √2 + 3√2 = 4√2
    expect(addExact(makeExact(1n, 1n, 2), makeExact(3n, 1n, 2))).toEqual(makeExact(4n, 1n, 2));
  });

  it('cộng khác radicand (khác 0) ra ngoài trường ⇒ null', () => {
    expect(addExact(makeExact(1n, 1n, 2), makeExact(1n, 1n, 3))).toBeNull();
  });

  it('cộng với 0 trả về số kia', () => {
    expect(addExact(makeExact(0n, 1n), makeExact(1n, 1n, 3))).toEqual(makeExact(1n, 1n, 3));
  });

  it('nhân hai căn: √2·√6 = 2√3', () => {
    expect(mulExact(makeExact(1n, 1n, 2), makeExact(1n, 1n, 6))).toEqual(makeExact(2n, 1n, 3));
  });

  it('chia: 3 / √14 = 3√14/14', () => {
    expect(divExact(makeExact(3n, 1n, 1), makeExact(1n, 1n, 14))).toEqual(makeExact(3n, 14n, 14));
  });

  it('sqrt của hữu tỷ: √(9/4) = 3/2', () => {
    expect(sqrtExact(makeExact(9n, 4n, 1))).toEqual(makeExact(3n, 2n, 1));
  });

  it('sqrt của hữu tỷ không chính phương: √2', () => {
    expect(sqrtExact(makeExact(2n, 1n, 1))).toEqual(makeExact(1n, 1n, 2));
  });

  it('sqrt của số âm hoặc của một căn ⇒ null', () => {
    expect(sqrtExact(makeExact(-1n, 1n, 1))).toBeNull();
    expect(sqrtExact(makeExact(1n, 1n, 2))).toBeNull();
  });

  it('neg đảo dấu', () => {
    expect(negExact(makeExact(3n, 2n, 5))).toEqual(makeExact(-3n, 2n, 5));
  });
});

// append to api/_lib/kernel/__tests__/scalar.test.ts
import { num, fromExact, add, mul, div, sqrt, displayScalar } from '../scalar';

describe('Scalar lai', () => {
  it('num() tạo scalar float-only (exact null)', () => {
    const s = num(1.5);
    expect(s.approx).toBe(1.5);
    expect(s.exact).toBeNull();
  });

  it('fromExact() giữ cả exact lẫn approx', () => {
    const s = fromExact(makeExact(3n, 2n, 1));
    expect(s.approx).toBeCloseTo(1.5, 12);
    expect(s.exact).toEqual(makeExact(3n, 2n, 1));
  });

  it('add hai exact giữ exact', () => {
    const s = add(fromExact(makeExact(1n, 2n)), fromExact(makeExact(1n, 3n)));
    expect(s.exact).toEqual(makeExact(5n, 6n));
    expect(s.approx).toBeCloseTo(5 / 6, 12);
  });

  it('add khi một toán hạng float-only ⇒ exact null, approx vẫn đúng', () => {
    const s = add(num(0.5), fromExact(makeExact(1n, 2n)));
    expect(s.exact).toBeNull();
    expect(s.approx).toBeCloseTo(1, 12);
  });

  it('add hai exact ra ngoài trường ⇒ exact null nhưng approx đúng', () => {
    const s = add(fromExact(makeExact(1n, 1n, 2)), fromExact(makeExact(1n, 1n, 3)));
    expect(s.exact).toBeNull();
    expect(s.approx).toBeCloseTo(Math.sqrt(2) + Math.sqrt(3), 12);
  });

  it('mul/div/sqrt lan truyền exact khi ở trong trường', () => {
    expect(mul(fromExact(makeExact(1n, 1n, 2)), fromExact(makeExact(1n, 1n, 6))).exact)
      .toEqual(makeExact(2n, 1n, 3));
    expect(div(fromExact(makeExact(3n, 1n)), fromExact(makeExact(1n, 1n, 14))).exact)
      .toEqual(makeExact(3n, 14n, 14));
    expect(sqrt(fromExact(makeExact(9n, 4n))).exact).toEqual(makeExact(3n, 2n, 1));
  });

  it('displayScalar dùng exact nếu có, ngược lại decimal', () => {
    expect(displayScalar(fromExact(makeExact(3n, 14n, 14)))).toBe('3√14/14');
    expect(displayScalar(num(Math.PI))).toBe(Math.PI.toFixed(4));
  });
});
