// Test THUẦN tầng giải mạch exact (circuit.ts §7) — thu gọn R_tđ, phân bố bảng, Möbius bài nghịch.
// Đáp khóa CỨNG theo tính tay của spec §11 (exact, radicand luôn 1).
import { describe, it, expect } from 'vitest';
import { displayScalar } from '../../scalar';
import { reduceR, reduceRN, solveCircuit, rowOf, mobius, solveUnknown, type CircuitSource } from '../circuit';
import type { CircuitNode } from '../circuitSchema';

const R = (name: string, ohms: number, unit?: 'ohm' | 'kohm'): CircuitNode => ({ kind: 'resistor', name, ohms, unit: unit ?? 'ohm' });
const S = (...items: CircuitNode[]): CircuitNode => ({ kind: 'series', items });
const P = (...items: CircuitNode[]): CircuitNode => ({ kind: 'parallel', items });

describe('circuit.ts — thu gọn R_tđ exact', () => {
  it('nối tiếp thuần: 4 + 8 = 12', () => {
    const r = reduceR(S(R('R1', 4), R('R2', 8)));
    expect(displayScalar(r)).toBe('12');
    expect(reduceRN(S(R('R1', 4), R('R2', 8)))).toBeCloseTo(12, 10);
  });

  it('song song 2 nhánh: 6 // 3 = 2', () => {
    expect(displayScalar(reduceR(P(R('R1', 6), R('R2', 3))))).toBe('2');
  });

  it('song song 3 nhánh: 6 // 12 // 4 = 2', () => {
    expect(displayScalar(reduceR(P(R('R1', 6), R('R2', 12), R('R3', 4))))).toBe('2');
  });

  it('hỗn hợp C5: R1 nt (R2 // R3) = 4 + 2 = 6', () => {
    const tree = S(R('R1', 4), P(R('R2', 6), R('R3', 3)));
    expect(displayScalar(reduceR(tree))).toBe('6');
  });

  it('hỗn hợp lồng 3 tầng C6: 2 nt (3 // (2 nt 4)) = 2 + 2 = 4', () => {
    const tree = S(R('R1', 2), P(R('R2', 3), S(R('R3', 2), R('R4', 4))));
    expect(displayScalar(reduceR(tree))).toBe('4');
  });

  it('STRESS 8 lá sâu 4 tầng: ((1nt5)//(2nt4)) nt (6//6//3) nt 0,5 = 3 + 3/2 + 1/2 = 5', () => {
    const tree = S(
      P(S(R('a1', 1), R('a5', 5)), S(R('b2', 2), R('b4', 4))), // 6 // 6 = 3
      P(R('c6', 6), R('c6b', 6), R('c3', 3)),                  // 3/2
      R('d', 0.5),
    );
    expect(displayScalar(reduceR(tree))).toBe('5');
    expect(reduceRN(tree)).toBeCloseTo(5, 10);
  });

  it('kohm ×1000 exact: 2 kΩ = 2000 Ω', () => {
    expect(displayScalar(reduceR(R('Rk', 2, 'kohm')))).toBe('2000');
  });

  it('đèn: R = U_đm²/P_đm = 36/3 = 12', () => {
    const lamp: CircuitNode = { kind: 'lamp', name: 'den', ratedVolts: 6, ratedWatts: 3 };
    expect(displayScalar(reduceR(lamp))).toBe('12');
  });

  it('thập phân đề vào hữu tỉ exact: 1,5 nt 4 = 11/2', () => {
    expect(displayScalar(reduceR(S(R('R1', 1.5), R('R2', 4))))).toBe('11/2');
  });
});

describe('circuit.ts — bảng phân bố U/I/P (§7.3)', () => {
  it('C5 chia dòng nút: I qua R2 = 2/3 A, R_tđ = 6, I_chính = 2', () => {
    const tree = S(R('R1', 4), P(R('R2', 6), R('R3', 3)));
    const src: CircuitSource = { emf: 12, r: 0 };
    const solved = solveCircuit(src, tree);
    expect(displayScalar(solved.rTotal)).toBe('6');
    expect(displayScalar(solved.iMain)).toBe('2');
    expect(displayScalar(rowOf(solved).U)).toBe('12'); // U mạch ngoài (root) = E (r=0)
    expect(displayScalar(rowOf(solved, 'R1').I)).toBe('2'); // R1 nối tiếp ⇒ I chính
    expect(displayScalar(rowOf(solved, 'R2').I)).toBe('2/3');
    expect(displayScalar(rowOf(solved, 'R3').I)).toBe('4/3');
  });

  it('C7 U_MN + I3 + P ngoài: U_MN = 9/2, I3 = 3/8', () => {
    const tree = S(R('R1', 3), P(R('R2', 4), R('R3', 12)), R('R4', 1));
    (tree as { kind: 'series'; items: CircuitNode[]; name?: string }).items[1].name = 'MN';
    const solved = solveCircuit({ emf: 12, r: 1 }, tree);
    expect(displayScalar(solved.iMain)).toBe('3/2');
    expect(displayScalar(rowOf(solved, 'MN').U)).toBe('9/2');
    expect(displayScalar(rowOf(solved, 'R3').I)).toBe('3/8');
  });

  it('r = 0 biên: một lá (bếp) 44 Ω, U = 220 ⇒ I = 5', () => {
    const solved = solveCircuit({ emf: 220, r: 0 }, R('bep', 44));
    expect(displayScalar(solved.iMain)).toBe('5');
    expect(displayScalar(rowOf(solved, 'bep').P)).toBe('1100');
  });
});

describe('circuit.ts — Möbius bài nghịch (§7.5)', () => {
  const U = (name: string): CircuitNode => ({ kind: 'unknown_resistor', name });

  it('series(5, x) mob = (1,5,0,1)', () => {
    const m = mobius(S(R('R1', 5), U('Rx')));
    expect([displayScalar(m.a), displayScalar(m.b), displayScalar(m.c), displayScalar(m.d)]).toEqual(['1', '5', '0', '1']);
  });

  it('parallel(x, 6) mob = (6,0,1,6)', () => {
    const m = mobius(P(U('Rx'), R('R6', 6)));
    expect([displayScalar(m.a), displayScalar(m.b), displayScalar(m.c), displayScalar(m.d)]).toEqual(['6', '0', '1', '6']);
  });

  it('C10: series(5, x), E=12 r=1 I=1,2 ⇒ Rx = 4', () => {
    const res = solveUnknown({ emf: 12, r: 1 }, S(R('R1', 5), U('Rx')), 'Rx', 1.2);
    expect(res.ok).toBe(true);
    if (res.ok) expect(displayScalar(res.x)).toBe('4');
  });

  it('x ∥ 6, R_cần = 2 ⇒ x = 3 (nghiệm trong nhánh parallel)', () => {
    const res = solveUnknown({ emf: 2, r: 0 }, P(U('Rx'), R('R6', 6)), 'Rx', 1); // Rneed = 2/1 = 2
    expect(res.ok).toBe(true);
    if (res.ok) expect(displayScalar(res.x)).toBe('3');
  });

  it('suy biến: x ∥ 6, R_cần = 6 (không đạt được) ⇒ error', () => {
    const res = solveUnknown({ emf: 6, r: 0 }, P(U('Rx'), R('R6', 6)), 'Rx', 1); // Rneed = 6 = C ⇒ mẫu = 0
    expect(res.ok).toBe(false);
  });

  it('nghiệm âm: series(5, x), R_cần = 3,8 < 5 ⇒ error không dương', () => {
    const res = solveUnknown({ emf: 12, r: 1 }, S(R('R1', 5), U('Rx')), 'Rx', 2.5); // Rneed = 4,8 − 1 = 3,8
    expect(res.ok).toBe(false);
  });

  it('I quá lớn: R_cần ≤ 0 ⇒ error', () => {
    const res = solveUnknown({ emf: 12, r: 1 }, S(R('R1', 5), U('Rx')), 'Rx', 20); // Rneed = 0,6 − 1 < 0
    expect(res.ok).toBe(false);
  });
});
