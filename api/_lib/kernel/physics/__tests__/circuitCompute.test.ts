// Test tầng compute (circuitCompute.ts §8) — mỗi kind ra đúng SỐ + unit engine ghi; đổi đơn vị
// energy exact; efficiency %; lamp_check 3 verdict; input số lẻ → approximate:true trung thực.
import { describe, it, expect } from 'vitest';
import { solveCircuit } from '../circuit';
import { computeCircuitQuery } from '../circuitCompute';
import type { CircuitNode } from '../circuitSchema';
import type { CircuitQuery } from '../circuitSchema';

const R = (name: string, ohms: number, unit?: 'ohm' | 'kohm'): CircuitNode => ({ kind: 'resistor', name, ohms, unit: unit ?? 'ohm' });
const S = (...items: CircuitNode[]): CircuitNode => ({ kind: 'series', items });
const P = (...items: CircuitNode[]): CircuitNode => ({ kind: 'parallel', items });
const lamp = (name: string, ratedVolts: number, ratedWatts: number): CircuitNode => ({ kind: 'lamp', name, ratedVolts, ratedWatts });

// helper: chạy 1 query, ép ok, trả answer
const one = (solved: ReturnType<typeof solveCircuit>, q: CircuitQuery) => {
  const r = computeCircuitQuery(solved, q);
  if (r.ok === false) throw new Error(r.problem);
  return r.answer;
};

describe('circuitCompute — R/I/U/P + unit engine ghi', () => {
  const solved = solveCircuit({ emf: 12, r: 0 }, S(R('R1', 4), P(R('R2', 6), R('R3', 3)))); // C5

  it('resistance mạch ngoài → 6 Ω', () => {
    const a = one(solved, { kind: 'resistance' });
    expect([a.text, a.unit, a.approximate]).toEqual(['6', 'Ω', false]);
  });
  it('resistance của khối/lá: R2 → 6 Ω', () => {
    expect(one(solved, { kind: 'resistance', of: 'R2' }).text).toBe('6');
  });
  it('current mạch chính → 2 A', () => {
    const a = one(solved, { kind: 'current' });
    expect([a.text, a.unit]).toEqual(['2', 'A']);
  });
  it('current qua R2 → 2/3 A (approximate:false — hữu tỉ)', () => {
    const a = one(solved, { kind: 'current', of: 'R2' });
    expect([a.text, a.unit, a.approximate]).toEqual(['2/3', 'A', false]);
    expect(a.approx).toBeCloseTo(0.6667, 3);
  });
  it('voltage khối P23 → 4 V', () => {
    // P23 (khối song song) chưa đặt tên → kiểm U qua R2 (cùng hiệu điện thế).
    expect(one(solved, { kind: 'voltage', of: 'R2' }).text).toBe('4');
  });
  it('power của R1 → U·I = 8·2 = 16 W', () => {
    const a = one(solved, { kind: 'power', of: 'R1' });
    expect([a.text, a.unit]).toEqual(['16', 'W']);
  });
});

describe('circuitCompute — power_source 3 part', () => {
  it('total = E·I: C4 (E=9, I=3) → 27 W', () => {
    const solved = solveCircuit({ emf: 9, r: 1 }, P(R('R1', 6), R('R2', 12), R('R3', 4)));
    expect(one(solved, { kind: 'power_source', part: 'total' }).text).toBe('27');
  });
  it('internal = I²·r: C2 (I=1, r=0,5) → 1/2 W', () => {
    const solved = solveCircuit({ emf: 6, r: 0.5 }, S(R('R1', 1.5), R('R2', 4)));
    expect(one(solved, { kind: 'power_source', part: 'internal' }).text).toBe('1/2');
  });
  it('external = U_N·I: C7 → 63/4 W', () => {
    const solved = solveCircuit({ emf: 12, r: 1 }, S(R('R1', 3), P(R('R2', 4), R('R3', 12)), R('R4', 1)));
    expect(one(solved, { kind: 'power_source', part: 'external' }).text).toBe('63/4');
  });
});

describe('circuitCompute — energy đổi đơn vị exact', () => {
  it('energy_source C2: t=10 min, kJ → 18/5', () => {
    const solved = solveCircuit({ emf: 6, r: 0.5 }, S(R('R1', 1.5), R('R2', 4)));
    const a = one(solved, { kind: 'energy_source', t: 10, tUnit: 'min', unit: 'kJ' });
    expect([a.text, a.unit, a.approximate]).toEqual(['18/5', 'kJ', false]);
  });
  it('energy C9 bếp: t=30 min, J → 1 980 000', () => {
    const solved = solveCircuit({ emf: 220, r: 0 }, R('bep', 44));
    expect(one(solved, { kind: 'energy', of: 'bep', t: 30, tUnit: 'min', unit: 'J' }).text).toBe('1980000');
  });
  it('energy C9 bếp: cùng lượng, kWh → 11/20', () => {
    const solved = solveCircuit({ emf: 220, r: 0 }, R('bep', 44));
    const a = one(solved, { kind: 'energy', of: 'bep', t: 30, tUnit: 'min', unit: 'kWh' });
    expect([a.text, a.approx]).toEqual(['11/20', 0.55]);
  });
  it('energy Wh: P=1100 W trong 1 h → 11/10 kWh và 1100 Wh', () => {
    const solved = solveCircuit({ emf: 220, r: 0 }, R('bep', 44));
    expect(one(solved, { kind: 'energy', of: 'bep', t: 1, tUnit: 'h', unit: 'Wh' }).text).toBe('1100');
  });
});

describe('circuitCompute — efficiency %', () => {
  it('C6 (U_N=8, E=10) → 80 %', () => {
    const solved = solveCircuit({ emf: 10, r: 1 }, S(R('R1', 2), P(R('R2', 3), S(R('R3', 2), R('R4', 4)))));
    const a = one(solved, { kind: 'efficiency' });
    expect([a.text, a.unit]).toEqual(['80', '%']);
  });
});

describe('circuitCompute — lamp_check 3 verdict', () => {
  it('sáng bình thường: E=9 ⇒ ratio 1', () => {
    const solved = solveCircuit({ emf: 9, r: 0 }, S(lamp('den', 6, 3), R('Rb', 6)));
    const a = one(solved, { kind: 'lamp_check', of: 'den' });
    expect([a.text, a.unit, a.verdict]).toEqual(['1', '', 'sang_binh_thuong']);
  });
  it('sáng yếu: E=8 ⇒ ratio 8/9 < 1', () => {
    const solved = solveCircuit({ emf: 8, r: 0 }, S(lamp('den', 6, 3), R('Rb', 6)));
    const a = one(solved, { kind: 'lamp_check', of: 'den' });
    expect([a.text, a.verdict]).toEqual(['8/9', 'sang_yeu']);
  });
  it('sáng mạnh: E=12 ⇒ ratio 4/3 > 1', () => {
    const solved = solveCircuit({ emf: 12, r: 0 }, S(lamp('den', 6, 3), R('Rb', 6)));
    const a = one(solved, { kind: 'lamp_check', of: 'den' });
    expect([a.text, a.verdict]).toEqual(['4/3', 'sang_manh']);
  });
});

describe('circuitCompute — input số lẻ → approximate:true trung thực', () => {
  it('resistor ohms số lẻ (10 chữ số) không hữu tỉ hóa được ⇒ approximate:true', () => {
    const solved = solveCircuit({ emf: 1, r: 0 }, R('Rugly', 0.1234567891));
    const a = one(solved, { kind: 'resistance', of: 'Rugly' });
    expect(a.approximate).toBe(true);
    expect(a.approx).toBeCloseTo(0.1234567891, 9);
  });
});
