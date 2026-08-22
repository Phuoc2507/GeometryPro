// acCircuit — tầng toán thuần: converter SurdRat/LCValue; resolve f↔ω; π TRIỆT TIÊU ở Z_L/Z_C; Z
// chính phương / căn √2 / căn-trong-R; nhánh C π-không-triệt-tiêu (approximate); f₀ + solve_resonance.
import { describe, it, expect } from 'vitest';
import { AcPlanSchema } from '../acSchema';
import {
  resolveModel, deriveAc, toSurd, toLC, resonanceFreq, solveResonance, signOfPi, SQRT2,
} from '../acCircuit';
import { displayPiScalar, approxP, isZeroPi } from '../piScalar';
import { displayScalar as dScalar } from '../../scalar';

const model = (raw: unknown) => resolveModel(AcPlanSchema.parse(raw));

describe('converters (§6.1)', () => {
  it('SurdRat: 100√3, 200√2, số trần', () => {
    expect(dScalar(toSurd({ n: 100, rad: 3 }))).toBe('100√3');
    expect(dScalar(toSurd({ n: 200, rad: 2 }))).toBe('200√2');
    expect(dScalar(toSurd(50))).toBe('50');
  });
  it('LCValue: 1/π (k=−1), 10⁻⁴/π, thập phân thuần (k=0)', () => {
    const L = toLC({ n: 1, overPi: true });
    expect(L.k).toBe(-1); expect(dScalar(L.s)).toBe('1');
    const C = toLC({ n: 1, exp: -4, overPi: true });
    expect(C.k).toBe(-1); expect(dScalar(C.s)).toBe('1/10000');
    const Ld = toLC(0.5);
    expect(Ld.k).toBe(0); expect(dScalar(Ld.s)).toBe('1/2');
  });
  it('SQRT2 radicand 2', () => { expect(dScalar(SQRT2)).toBe('√2'); });
});

describe('resolve ω (§7.1) — f ↔ omega cùng cho 100π', () => {
  it('f = 50 ⇒ ω = 100π', () => { expect(displayPiScalar(model({ problemName: 't', source: { f: 50, U: 200 }, R: 10, queries: [{ kind: 'omega' }] }).omega)).toBe('100π'); });
  it('omega {n:100,pi} ⇒ 100π', () => { expect(displayPiScalar(model({ problemName: 't', source: { omega: { n: 100, pi: true }, U: 200 }, R: 10, queries: [{ kind: 'omega' }] }).omega)).toBe('100π'); });
  it('U0 = 200√2 ⇒ U = 200 (rút căn)', () => {
    const m = model({ problemName: 't', source: { f: 50, U0: { n: 200, rad: 2 } }, R: 10, queries: [{ kind: 'omega' }] });
    expect(dScalar(m.U)).toBe('200');
  });
});

describe('π TRIỆT TIÊU ở Z_L, Z_C (§3.1) — khẳng định trung tâm', () => {
  const m = model({ problemName: 't', source: { f: 50, U: 200 }, R: 100, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true }, queries: [{ kind: 'impedance' }] });
  it('Z_L = ωL = 200 (k=0, hữu tỉ)', () => { expect(m.ZL.k).toBe(0); expect(displayPiScalar(m.ZL)).toBe('200'); });
  it('Z_C = 1/(ωC) = 100 (k=0, hữu tỉ)', () => { expect(m.ZC.k).toBe(0); expect(displayPiScalar(m.ZC)).toBe('100'); });
  it('π triệt tiêu độc lập f (f=60 ⇒ Z_L=120, Z_C=250/3 vẫn exact)', () => {
    const m60 = model({ problemName: 't', source: { f: 60, U: 200 }, R: 10, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true }, queries: [{ kind: 'impedance' }] });
    expect(displayPiScalar(m60.ZL)).toBe('120');
    expect(displayPiScalar(m60.ZC)).toBe('250/3');
    expect(m60.ZL.s.exact).not.toBeNull();
  });
});

describe('Z — chính phương / căn thuần √2 / căn-trong-R (§3.1)', () => {
  const Z = (raw: unknown) => displayPiScalar(deriveAc(model(raw)).Z);
  it('Z = 125 (chính phương)', () => { expect(Z({ problemName: 't', source: { f: 50, U: 200 }, R: 75, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true }, queries: [{ kind: 'impedance' }] })).toBe('125'); });
  it('Z = 100√2 (căn thuần radicand 2)', () => { expect(Z({ problemName: 't', source: { f: 50, U: 200 }, R: 100, L: { n: 1, overPi: true }, C: { n: 1, d: 2, exp: -4, overPi: true }, queries: [{ kind: 'impedance' }] })).toBe('100√2'); });
  it('Z = 200 (căn-trong-R triệt vào bình phương)', () => { expect(Z({ problemName: 't', source: { f: 50, U: 200 }, R: { n: 100, rad: 3 }, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true }, queries: [{ kind: 'impedance' }] })).toBe('200'); });
});

describe('nhánh C — π KHÔNG triệt tiêu (§3.3) rơi float TRUNG THỰC', () => {
  it('L,C thập phân thuần ⇒ dZ collapse ⇒ Z.s.exact null (approximate)', () => {
    const d = deriveAc(model({ problemName: 't', source: { f: 50, U: 200 }, R: 100, L: 0.5, C: 1e-4, queries: [{ kind: 'impedance' }] }));
    expect(d.Z.s.exact).toBeNull();
    expect(Number.isFinite(d.n.Z)).toBe(true);
  });
});

describe('cộng hưởng f₀ + solve_resonance (§3.2/§7.3)', () => {
  const m = model({ problemName: 't', source: { f: 50, U: 200 }, R: 50, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true }, queries: [{ kind: 'resonance_frequency' }] });
  it('f₀ = 50 (π triệt tiêu qua √LC)', () => { expect(displayPiScalar(resonanceFreq(m))).toBe('50'); expect(approxP(resonanceFreq(m))).toBeCloseTo(50, 6); });
  it('solve C = 1/(10000π) (k=−1)', () => { const s = solveResonance(m, 'C'); expect(displayPiScalar(s.pi)).toBe('1/(10000π)'); expect(s.pi.k).toBe(-1); });
  it('solve f = f₀ = 50', () => { expect(displayPiScalar(solveResonance(m, 'f').pi)).toBe('50'); });
  it('tại cộng hưởng dZ = 0 exact', () => { expect(isZeroPi(deriveAc(m).dZ)).toBe(true); });
});

describe('signOfPi (dấu π = dấu s)', () => {
  const m = model({ problemName: 't', source: { f: 50, U: 200 }, R: 40, L: { n: 6, d: 10, overPi: true }, C: { n: 1, d: 9, exp: -3, overPi: true }, queries: [{ kind: 'impedance' }] });
  it('dung kháng (Z_L<Z_C) ⇒ dZ < 0', () => { expect(signOfPi(deriveAc(m).dZ)).toBe(-1); });
});
