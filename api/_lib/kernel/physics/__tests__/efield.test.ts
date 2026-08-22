// Unit test tầng THUẦN efield.ts + luật hiển thị §6 (displayEField). Khoá hành vi exact-first + GATE.
import { describe, it, expect } from 'vitest';
import { rat, fromExact, makeExact, mul, exactToApprox } from '../../scalar';
import { displayEField } from '../efieldCompute';
import { K, classify, qtyLength, qtyCharge, type SrcXYQ } from '../efield';

const P = (x: number, y: number) => ({ x: qtyLength(x, 'cm'), y: qtyLength(y, 'cm') });
const src = (x: number, y: number, val: number, unit = 'nC'): SrcXYQ => ({ x: qtyLength(x, 'cm'), y: qtyLength(y, 'cm'), q: qtyCharge(val, unit) });

describe('efield.ts — hằng K & giữ exact', () => {
  it('K = 9·10⁹ biểu diễn exact (BigInt), exactToApprox khớp bit 9e9', () => {
    expect(K.exact).not.toBe(null);
    expect(exactToApprox(K.exact!)).toBe(9e9);
  });

  it('R4: mantissa+unit {0.5,"nC"} GIỮ exact; {5e-10,"C"} thô MẤT exact (sàn scalarFromNumber ~1e-9)', () => {
    expect(qtyCharge(0.5, 'nC').exact).not.toBe(null); // 0,5 nC = (1/2)·10⁻⁹ EXACT
    expect(qtyCharge(5e-10, 'C').exact).toBe(null); // 5·10⁻¹⁰ thô: round(0.5)=1 lệch >1e-3 ⇒ float
  });
});

describe('displayEField — luật hiển thị §6 (khoa học/thập phân/phân số/căn)', () => {
  it('nguyên nhỏ giữ nguyên: 40, 80, 10', () => {
    expect(displayEField(rat(40n))).toBe('40');
    expect(displayEField(rat(80n))).toBe('80');
    expect(displayEField(rat(10n))).toBe('10');
  });
  it('|v| ≥ 10⁴ ⇒ khoa học: 900000→9·10⁵, 144000→1,44·10⁵, 180000→1,8·10⁵, 100000→10⁵', () => {
    expect(displayEField(rat(900000n))).toBe('9·10⁵');
    expect(displayEField(rat(144000n))).toBe('1,44·10⁵');
    expect(displayEField(rat(180000n))).toBe('1,8·10⁵');
    expect(displayEField(rat(100000n))).toBe('10⁵');
  });
  it('|v| < 10⁻² terminating ⇒ khoa học: 27/50000→5,4·10⁻⁴, 1/10000→10⁻⁴, 1/250000→4·10⁻⁶, 1/5000→2·10⁻⁴', () => {
    expect(displayEField(fromExact(makeExact(27n, 50000n)))).toBe('5,4·10⁻⁴');
    expect(displayEField(fromExact(makeExact(1n, 10000n)))).toBe('10⁻⁴');
    expect(displayEField(fromExact(makeExact(1n, 250000n)))).toBe('4·10⁻⁶');
    expect(displayEField(fromExact(makeExact(1n, 5000n)))).toBe('2·10⁻⁴');
  });
  it('thập phân hữu hạn tầm trung ⇒ dấu phẩy VN: 9/250→0,036', () => {
    expect(displayEField(fromExact(makeExact(9n, 250n)))).toBe('0,036');
  });
  it('mẫu có ước ≠{2,5} ⇒ GIỮ phân số: 1/3, 9/7', () => {
    expect(displayEField(fromExact(makeExact(1n, 3n)))).toBe('1/3');
    expect(displayEField(fromExact(makeExact(9n, 7n)))).toBe('9/7');
  });
  it('radicand>1 ⇒ displayExact: 300000√3, 2√5/5', () => {
    expect(displayEField(mul(rat(300000n), fromExact(makeExact(1n, 1n, 3))))).toBe('300000√3');
    expect(displayEField(fromExact(makeExact(2n, 5n, 5)))).toBe('2√5/5');
  });
  it('số âm giữ dấu: -5,4·10⁻⁴', () => {
    expect(displayEField(fromExact(makeExact(-27n, 50000n)))).toBe('-5,4·10⁻⁴');
  });
});

describe('classify — GATE §7.3 (a)/(b)/(c)', () => {
  it('single (1 nguồn) ⇒ "single"', () => {
    expect(classify(P(2, 0), [src(0, 0, 40)])).toBe('single');
  });
  it('thẳng hàng (C5: trung điểm trên trục Ox) ⇒ "collinear"', () => {
    expect(classify(P(5, 0), [src(0, 0, 90), src(10, 0, 40)])).toBe('collinear');
  });
  it('cặp đối xứng 3-4-5 (r=5 cm hữu tỉ) ⇒ "symmetric_rational"', () => {
    expect(classify(P(4, 3), [src(0, 0, 10), src(8, 0, 10)])).toBe('symmetric_rational');
  });
  it('tam giác ĐỀU đỉnh toạ-độ-VÔ-TỈ (1.5, 2.598) ⇒ "none" (buộc field_symmetric)', () => {
    expect(classify(P(1.5, 2.598), [src(0, 0, 30), src(3, 0, 30)])).toBe('none');
  });
  it('cặp đối xứng nhưng r VÔ TỈ (P(0,3) với A(-4,0)B(4,0): r=5 ⇒ hữu tỉ; P(0,1): r=√17 vô tỉ) ⇒ "none"', () => {
    expect(classify(P(0, 1), [src(-4, 0, 10), src(4, 0, 10)])).toBe('none'); // r²=17, √17 vô tỉ
    expect(classify(P(0, 3), [src(-4, 0, 10), src(4, 0, 10)])).toBe('symmetric_rational'); // r=5 hữu tỉ
  });
  it('3 điện tích bất đối xứng, điểm ngoài trục ⇒ "none"', () => {
    expect(classify(P(3, 1), [src(0, 0, 10), src(5, 0, 20), src(2, 4, 7)])).toBe('none');
  });
  it('cặp đẳng cự nhưng |q| KHÁC nhau ⇒ "none" (không đối xứng đẳng nguồn)', () => {
    expect(classify(P(4, 3), [src(0, 0, 10), src(8, 0, 20)])).toBe('none');
  });
});
