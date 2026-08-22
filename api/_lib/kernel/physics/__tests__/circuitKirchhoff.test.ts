// Test tự kiểm tất định (circuitKirchhoff.ts §9) — K1..K4 residual exact-0 trên mạch mẫu;
// tiêm bảng hỏng (sửa 1 ô) ⇒ có check FAIL (residual ≠ 0).
import { describe, it, expect } from 'vitest';
import { rat } from '../../scalar';
import { solveCircuit, rowOf } from '../circuit';
import { selfChecks } from '../circuitKirchhoff';
import type { CircuitNode } from '../circuitSchema';

const R = (name: string, ohms: number): CircuitNode => ({ kind: 'resistor', name, ohms });
const S = (...items: CircuitNode[]): CircuitNode => ({ kind: 'series', items });
const P = (...items: CircuitNode[]): CircuitNode => ({ kind: 'parallel', items });

describe('circuitKirchhoff — residual exact-0 trên mạch đúng', () => {
  it('C6 lồng 3 tầng: mọi check K1..K4 pass, residual 0', () => {
    const solved = solveCircuit({ emf: 10, r: 1 }, S(R('R1', 2), P(R('R2', 3), S(R('R3', 2), R('R4', 4)))));
    const checks = selfChecks(solved, { efficiency: true });
    expect(checks.every((c) => c.pass)).toBe(true);
    expect(checks.every((c) => c.residual === 0)).toBe(true);
    // có đủ các dòng K1(a), K2 nút, K3, K4
    expect(checks.some((c) => c.kind === 'K1')).toBe(true);
    expect(checks.some((c) => c.kind === 'K2')).toBe(true);
    expect(checks.some((c) => c.kind === 'K3')).toBe(true);
    expect(checks.some((c) => c.kind === 'K4')).toBe(true);
  });

  it('C3 song song thuần: K2 nút ΣI = I chính', () => {
    const solved = solveCircuit({ emf: 6, r: 0 }, P(R('R1', 6), R('R2', 3)));
    expect(selfChecks(solved, {}).every((c) => c.pass)).toBe(true);
  });

  it('backsub bài nghịch: |I_chính − I_target| = 0', () => {
    const solved = solveCircuit({ emf: 12, r: 1 }, S(R('R1', 5), R('Rx', 4))); // đã thế Rx=4 ⇒ I=6/5
    const checks = selfChecks(solved, { backsub: { targetI: rat(6n, 5n), targetIN: 1.2 } });
    expect(checks.find((c) => c.kind === 'solve_backsub')?.pass).toBe(true);
  });
});

describe('circuitKirchhoff — tiêm bảng hỏng ⇒ FAIL', () => {
  it('sửa I qua R2 (C5) ⇒ K2 nút song song lệch', () => {
    const solved = solveCircuit({ emf: 12, r: 0 }, S(R('R1', 4), P(R('R2', 6), R('R3', 3))));
    rowOf(solved, 'R2').I = rat(99n); // phá ΣI nút
    const checks = selfChecks(solved, {});
    expect(checks.some((c) => !c.pass)).toBe(true);
  });

  it('sửa U mạch ngoài ⇒ K1 vòng lệch', () => {
    const solved = solveCircuit({ emf: 6, r: 0.5 }, S(R('R1', 1.5), R('R2', 4)));
    rowOf(solved).U = rat(999n); // phá U_N = E − I·r
    const checks = selfChecks(solved, {});
    expect(checks.some((c) => c.kind === 'K1' && !c.pass)).toBe(true);
  });
});
