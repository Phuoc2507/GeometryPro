// Task 1 — nền hữu tỉ + bảng nguyên tử khối (plan 2026-08-21-chem-pack-v0 Task 1,
// đã áp review F15: bỏ Ar khỏi bảng; F22: chặn chuỗi phân cách nghìn "1.000").
import { describe, it, expect } from 'vitest';
import { rat, parseDecimal, addR, subR, mulR, divR, cmpR, ratToString, ratApprox } from '../rat';
import { atomicMassOf, ATOMIC_MASS } from '../atomicMass';

describe('parseDecimal', () => {
  it('chuỗi dấu phẩy VN: "5,6" → 28/5', () => {
    expect(parseDecimal('5,6')).toEqual(rat(28n, 5n));
  });
  it('chuỗi dấu chấm: "0.25" → 1/4', () => {
    expect(parseDecimal('0.25')).toEqual(rat(1n, 4n));
  });
  it('number qua toString (né rác nhị phân): 5.6 → 28/5 CHÍNH XÁC', () => {
    expect(parseDecimal(5.6)).toEqual(rat(28n, 5n));
  });
  it('số nguyên: 50 → 50/1; "24,79" → 2479/100', () => {
    expect(parseDecimal(50)).toEqual(rat(50n, 1n));
    expect(parseDecimal('24,79')).toEqual(rat(2479n, 100n));
  });
  it('chuỗi 3 chữ số thập phân hợp lệ vẫn qua: "2,479" → 2479/1000', () => {
    expect(parseDecimal('2,479')).toEqual(rat(2479n, 1000n));
  });
  it('từ chối NaN/Infinity/dạng mũ/chuỗi rác', () => {
    expect(() => parseDecimal(NaN)).toThrow();
    expect(() => parseDecimal(Infinity)).toThrow();
    expect(() => parseDecimal(1e21)).toThrow(); // toString ra "1e+21"
    expect(() => parseDecimal('abc')).toThrow();
    expect(() => parseDecimal('')).toThrow();
  });
  it('F22: cấm dấu phân cách nghìn kiểu VN "1.000"/"1,000" (mơ hồ), cấm nhiều dấu phân cách', () => {
    expect(() => parseDecimal('1.000')).toThrow(/nghìn|phân cách/);
    expect(() => parseDecimal('1,000')).toThrow(/nghìn|phân cách/);
    expect(() => parseDecimal('1.000.000')).toThrow();
    expect(() => parseDecimal('1.234,5')).toThrow();
  });
  it('số âm parse được (chặn ≤0 nằm ở tầng Qty/amount)', () => {
    expect(parseDecimal('-5,6')).toEqual(rat(-28n, 5n));
  });
});

describe('số học hữu tỉ đóng kín', () => {
  it('cộng trừ nhân chia + so sánh', () => {
    const a = parseDecimal('5,6'), b = rat(56n, 1n);
    expect(divR(a, b)).toEqual(rat(1n, 10n)); // n(Fe) bài 1
    expect(mulR(rat(1n, 10n), rat(64n, 1n))).toEqual(rat(32n, 5n)); // m(Cu)
    expect(cmpR(rat(1n, 10n), rat(3n, 20n))).toBe(-1); // 1/10 < 3/20 (limiting bài 6)
    expect(addR(rat(1n, 5n), rat(1n, 10n))).toEqual(rat(3n, 10n));
    expect(subR(rat(3n, 10n), rat(1n, 5n))).toEqual(rat(1n, 10n));
  });
  it('hiển thị: ratToString(32/5)="32/5", ratApprox=6.4', () => {
    expect(ratToString(rat(32n, 5n))).toBe('32/5');
    expect(ratToString(rat(28n, 1n))).toBe('28');
    expect(ratApprox(rat(32n, 5n))).toBeCloseTo(6.4, 12);
  });
  it('chia 0 → throw (stoich phải tự catch, không để xuyên runChem — F21)', () => {
    expect(() => divR(rat(1n, 1n), rat(0n, 1n))).toThrow();
  });
});

describe('atomicMass SGK VN', () => {
  it('số tròn đề thi: Fe=56, Cu=64, Cl=35,5 (71/2)', () => {
    expect(atomicMassOf('Fe')).toEqual(rat(56n, 1n));
    expect(atomicMassOf('Cu')).toEqual(rat(64n, 1n));
    expect(atomicMassOf('Cl')).toEqual(rat(71n, 2n));
  });
  it('F15: Ar KHÔNG có trong bảng (spec ghi 40 sai SGK; DB không dùng)', () => {
    expect(ATOMIC_MASS['Ar']).toBeUndefined();
    expect(() => atomicMassOf('Ar')).toThrow(/Ar/);
  });
  it('các NTK review đã xác nhận: Hg=201, Sn=119, Ni=59, Cr=52', () => {
    expect(atomicMassOf('Hg')).toEqual(rat(201n, 1n));
    expect(atomicMassOf('Sn')).toEqual(rat(119n, 1n));
    expect(atomicMassOf('Ni')).toEqual(rat(59n, 1n));
    expect(atomicMassOf('Cr')).toEqual(rat(52n, 1n));
  });
  it('nguyên tố lạ → throw có tên nguyên tố', () => {
    expect(() => atomicMassOf('Xy')).toThrow(/Xy/);
  });
});
