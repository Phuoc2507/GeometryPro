// Task 2 — parser công thức + khối lượng mol (plan Task 2, bám spec §5).
import { describe, it, expect } from 'vitest';
import { parseFormula, molarMass } from '../formula';
import { rat } from '../rat';

const m = (o: Record<string, number>) => new Map(Object.entries(o));

describe('parseFormula', () => {
  it('đơn giản: Fe, O2, NaOH', () => {
    expect(parseFormula('Fe')).toEqual(m({ Fe: 1 }));
    expect(parseFormula('O2')).toEqual(m({ O: 2 }));
    expect(parseFormula('NaOH')).toEqual(m({ Na: 1, O: 1, H: 1 }));
  });
  it('ngoặc: Fe2(SO4)3 → {Fe:2,S:3,O:12}; Ca(OH)2; (NH4)2SO4', () => {
    expect(parseFormula('Fe2(SO4)3')).toEqual(m({ Fe: 2, S: 3, O: 12 }));
    expect(parseFormula('Ca(OH)2')).toEqual(m({ Ca: 1, O: 2, H: 2 }));
    expect(parseFormula('(NH4)2SO4')).toEqual(m({ N: 2, H: 8, S: 1, O: 4 }));
  });
  it('ngoặc LỒNG (đệ quy thật): Ca3(PO4)2', () => {
    expect(parseFormula('Ca3(PO4)2')).toEqual(m({ Ca: 3, P: 2, O: 8 }));
  });
  it('hydrat cả "." lẫn "·": CuSO4.5H2O → {Cu:1,S:1,O:9,H:10}', () => {
    expect(parseFormula('CuSO4.5H2O')).toEqual(m({ Cu: 1, S: 1, O: 9, H: 10 }));
    expect(parseFormula('CuSO4·5H2O')).toEqual(m({ Cu: 1, S: 1, O: 9, H: 10 }));
  });
  it('lỗi rõ ràng: nguyên tố lạ, ngoặc lệch, chỉ số 0, rỗng', () => {
    expect(() => parseFormula('Xy2')).toThrow(/Xy/);
    expect(() => parseFormula('Fe2(SO4')).toThrow();
    expect(() => parseFormula('H0')).toThrow();
    expect(() => parseFormula('')).toThrow();
  });
});

describe('molarMass (hữu tỉ exact, khớp SGK)', () => {
  it('Fe2(SO4)3=400 · CuSO4.5H2O=250 · HCl=36,5 · AgCl=143,5', () => {
    expect(molarMass('Fe2(SO4)3')).toEqual(rat(400n, 1n));
    expect(molarMass('CuSO4.5H2O')).toEqual(rat(250n, 1n));
    expect(molarMass('HCl')).toEqual(rat(73n, 2n));
    expect(molarMass('AgCl')).toEqual(rat(287n, 2n));
  });
  it('đối chiếu thêm bảng M spec §6: (NH4)2SO4=132, Ca3(PO4)2=310, AlCl3=133,5', () => {
    expect(molarMass('(NH4)2SO4')).toEqual(rat(132n, 1n));
    expect(molarMass('Ca3(PO4)2')).toEqual(rat(310n, 1n));
    expect(molarMass('AlCl3')).toEqual(rat(267n, 2n));
  });
});
