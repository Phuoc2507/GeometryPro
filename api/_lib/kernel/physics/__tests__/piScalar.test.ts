// Test hạ tầng PiScalar — (hữu tỉ + một căn)·πᵏ. Phép toán phân bậc, EXACT_COS 16 điểm, display, certify.
import { describe, it, expect } from 'vitest';
import {
  type PiScalar, approxP, isZeroPi, mulP, divP, addP, subP, sqrtP, negP, scalarToPi, PI, TWO_PI,
  EXACT_COS, cosP, sinP, displayPiScalar, certifyPiScalar, toPiScalar,
} from '../piScalar';
import { rat, num, fromExact, makeExact } from '../../scalar';

const P = (n: number, d: number, k: number): PiScalar => ({ s: rat(BigInt(n), BigInt(d)), k });
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

describe('PiScalar — toPiScalar + approxP', () => {
  it('số trần ⇒ bậc 0', () => {
    const p = toPiScalar(5);
    expect(p.k).toBe(0);
    expect(p.s.exact).not.toBeNull();
    expect(close(approxP(p), 5)).toBe(true);
  });
  it('ω = 10π ⇒ {10, k:1}', () => {
    const p = toPiScalar({ n: 10, pi: true });
    expect(p.k).toBe(1);
    expect(close(approxP(p), 10 * Math.PI)).toBe(true);
  });
  it('φ = −π/6 ⇒ {−1/6, k:1}', () => {
    const p = toPiScalar({ n: -1, d: 6, pi: true });
    expect(close(approxP(p), -Math.PI / 6)).toBe(true);
    expect(displayPiScalar(p)).toBe('-π/6');
  });
  it('T = 0,2π ⇒ {1/5, k:1} exact (0.2 hữu hạn ⇒ hữu tỉ)', () => {
    const p = toPiScalar({ n: 0.2, pi: true });
    expect(p.s.exact).not.toBeNull();
    expect(displayPiScalar(p)).toBe('π/5');
  });
  it('t = 1/30 ⇒ {1/30, k:0} exact', () => {
    const p = toPiScalar({ n: 1, d: 30 });
    expect(p.k).toBe(0);
    expect(p.s.exact).not.toBeNull();
    expect(close(approxP(p), 1 / 30)).toBe(true);
  });
});

describe('PiScalar — mulP/divP giữ bậc + collapse', () => {
  it('ω·t: {10,1}·{1/30,0} = {1/3, 1} = π/3', () => {
    const r = mulP(P(10, 1, 1), P(1, 30, 0));
    expect(r.k).toBe(1);
    expect(displayPiScalar(r)).toBe('π/3');
  });
  it('ω²: {10,1}² = {100, 2}', () => {
    const w = P(10, 1, 1);
    const r = mulP(w, w);
    expect(r.k).toBe(2);
    expect(displayPiScalar(r)).toBe('100π²');
  });
  it('2π/T: divP({2,1},{1/5,1}) = {10, 0} — π triệt tiêu', () => {
    const r = divP(TWO_PI, P(1, 5, 1));
    expect(r.k).toBe(0);
    expect(displayPiScalar(r)).toBe('10');
  });
  it('|k| > 2 ⇒ collapse về float (approx đúng)', () => {
    const r = mulP(P(1, 1, 2), P(1, 1, 2)); // k = 4 > 2
    expect(r.k).toBe(0);
    expect(r.s.exact).toBeNull();
    expect(close(approxP(r), Math.PI ** 4)).toBe(true);
  });
  it('divP bậc âm: {1,0}/{1,2} = {1, −2}', () => {
    const r = divP(P(1, 1, 0), P(1, 1, 2));
    expect(r.k).toBe(-2);
    expect(close(approxP(r), 1 / Math.PI ** 2)).toBe(true);
  });
});

describe('PiScalar — addP/subP cùng bậc + zero + khác bậc', () => {
  it('cùng bậc ⇒ exact: π/6 + π/6 = π/3', () => {
    const r = addP(P(1, 6, 1), P(1, 6, 1));
    expect(displayPiScalar(r)).toBe('π/3');
  });
  it('subP cùng bậc: π²/250 − 3π²/1000 = π²/1000 (bảo toàn năng lượng exact)', () => {
    const W = P(1, 250, 2);
    const Wt = P(3, 1000, 2);
    const Wd = subP(W, Wt);
    expect(Wd.s.exact).not.toBeNull();
    expect(displayPiScalar(Wd)).toBe('π²/1000');
  });
  it('vế 0 ⇒ vế kia (band-agnostic): 0(bậc0) − π/2(bậc1) = −π/2', () => {
    const r = subP(P(0, 1, 0), P(1, 2, 1));
    expect(displayPiScalar(r)).toBe('-π/2');
  });
  it('khác bậc ≠ 0 ⇒ collapse: 2 + π/6 float', () => {
    const r = addP(P(2, 1, 0), P(1, 6, 1));
    expect(r.s.exact).toBeNull();
    expect(close(approxP(r), 2 + Math.PI / 6)).toBe(true);
  });
});

describe('PiScalar — sqrtP', () => {
  it('k chẵn + s chính phương: √({1,−2}) = {1,−1}  (con lắc g=π²)', () => {
    const r = sqrtP(P(1, 1, -2));
    expect(r.k).toBe(-1);
    expect(displayPiScalar(r)).toBe('1/π');
  });
  it('l/g = {4,−2} ⇒ √ = {2,−1}; T = 2π·{2,−1} = {4,0} = 4 exact (DD04)', () => {
    const root = sqrtP(P(4, 1, -2)); // {2, -1}
    const T = mulP(TWO_PI, root);
    expect(T.k).toBe(0);
    expect(displayPiScalar(T)).toBe('4');
  });
  it('k lẻ ⇒ collapse float', () => {
    const r = sqrtP(P(4, 1, 1)); // √(4π) — π^(1/2) rời trường
    expect(r.s.exact).toBeNull();
    expect(close(approxP(r), Math.sqrt(4 * Math.PI))).toBe(true);
  });
});

describe('EXACT_COS — 16 điểm khớp Math.cos/sin', () => {
  const grid: [number, number][] = [
    [0, 1], [1, 6], [1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [5, 6], [1, 1],
    [7, 6], [5, 4], [4, 3], [3, 2], [5, 3], [7, 4], [11, 6],
  ];
  for (const [n, d] of grid) {
    it(`${n}/${d}·π: cos/sin exact khớp float`, () => {
      const pha = P(n, d, 1);
      const g = EXACT_COS(pha);
      expect(g).not.toBeNull();
      expect(g!.cos.exact).not.toBeNull();
      expect(g!.sin.exact).not.toBeNull();
      expect(close(g!.cos.approx, Math.cos((n / d) * Math.PI))).toBe(true);
      expect(close(g!.sin.approx, Math.sin((n / d) * Math.PI))).toBe(true);
    });
  }
  it('cos(2π/3) = −1/2 exact', () => {
    const g = EXACT_COS(P(2, 3, 1));
    expect(g!.cos.exact).toEqual(makeExact(-1n, 2n, 1));
  });
  it('sin(4π/3) = −√3/2 exact', () => {
    const g = EXACT_COS(P(4, 3, 1));
    expect(g!.sin.exact).toEqual(makeExact(-1n, 2n, 3));
  });
  it('pha > 2π rút gọn mod 2: 5π/3 + 2π = 11π/3 ≡ 5π/3', () => {
    const g = EXACT_COS(P(11, 3, 1));
    expect(g!.cos.exact).toEqual(makeExact(1n, 2n, 1)); // cos(5π/3) = 1/2
  });
  it('ngoài lưới ⇒ null: π/5, π/12', () => {
    expect(EXACT_COS(P(1, 5, 1))).toBeNull();
    expect(EXACT_COS(P(1, 12, 1))).toBeNull();
  });
  it('bậc ≠ 1 ⇒ null', () => {
    expect(EXACT_COS(P(1, 3, 0))).toBeNull();
    expect(EXACT_COS(P(1, 3, 2))).toBeNull();
  });
  it('hệ số vô tỉ (√·π) ⇒ null', () => {
    const irr: PiScalar = { s: fromExact(makeExact(1n, 1n, 2)), k: 1 }; // √2·π
    expect(EXACT_COS(irr)).toBeNull();
  });
});

describe('cosP/sinP — grid + zero + off-grid', () => {
  it('cosP(0·π) = 1 exact', () => {
    expect(cosP(P(0, 1, 1)).exact).toEqual(makeExact(1n, 1n, 1));
    expect(sinP(P(0, 1, 1)).exact.num).toBe(0n);
  });
  it('cosP(π/3) = 1/2; sinP(π/3) = √3/2', () => {
    expect(cosP(P(1, 3, 1)).exact).toEqual(makeExact(1n, 2n, 1));
    expect(sinP(P(1, 3, 1)).exact).toEqual(makeExact(1n, 2n, 3));
  });
  it('off-grid (collapse float) ⇒ cos float, exact null', () => {
    const pha = addP(P(2, 1, 0), P(1, 6, 1)); // 2 + π/6
    expect(cosP(pha).exact).toBeNull();
    expect(close(cosP(pha).approx, Math.cos(2 + Math.PI / 6))).toBe(true);
  });
});

describe('displayPiScalar — §3.3 mọi mẫu', () => {
  const cases: [PiScalar, string][] = [
    [P(1, 5, 1), 'π/5'],
    [P(-1, 2, 1), '-π/2'],
    [{ s: fromExact(makeExact(2n, 7n, 5)), k: 1 }, '2π√5/7'],
    [{ s: fromExact(makeExact(-20n, 1n, 3)), k: 1 }, '-20π√3'],
    [{ s: fromExact(makeExact(-30n, 1n, 3)), k: 1 }, '-30π√3'],
    [P(1, 250, 2), 'π²/250'],
    [P(200, 1, 2), '200π²'],
    [P(3, 1000, 2), '3π²/1000'],
    [P(4, 1, 1), '4π'],
    [P(1, 10, 1), 'π/10'],
    [P(5, 2, -1), '5/(2π)'],
    [P(1, 1, -2), '1/π²'],
    [P(7, 1, 0), '7'],       // bậc 0 ⇒ displayScalar
    [P(0, 1, 1), '0'],       // 0·π
  ];
  for (const [p, want] of cases) {
    it(`${want}`, () => expect(displayPiScalar(p)).toBe(want));
  }
});

describe('certifyPiScalar — 3 tầng', () => {
  it('exact khớp float ⇒ displayPiScalar, approximate:false', () => {
    const p = P(-30, 1, 1); // −30π (đại diện; DD01 thực tế −30π√3)
    const c = certifyPiScalar(p, -30 * Math.PI);
    expect(c.approximate).toBe(false);
    expect(c.text).toBe('-30π');
  });
  it('−30π√3 giữ exact', () => {
    const p: PiScalar = { s: fromExact(makeExact(-30n, 1n, 3)), k: 1 };
    const c = certifyPiScalar(p, -30 * Math.sqrt(3) * Math.PI);
    expect(c.approximate).toBe(false);
    expect(c.text).toBe('-30π√3');
  });
  it('exact chết + float là kπ/m ⇒ recognize vớt (approximate:false)', () => {
    const p: PiScalar = { s: num(4 * Math.PI), k: 0 }; // collapsed nhưng = 4π
    const c = certifyPiScalar(p, 4 * Math.PI);
    expect(c.text).toBe('4π');
    expect(c.approximate).toBe(false);
  });
  it('exact chết + float không nhận ⇒ thập phân, approximate:true', () => {
    const p: PiScalar = { s: num(-4.0752), k: 0 };
    const c = certifyPiScalar(p, -4.0752);
    expect(c.approximate).toBe(true);
  });
});
