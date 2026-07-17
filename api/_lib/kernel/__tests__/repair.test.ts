// api/_lib/kernel/__tests__/repair.test.ts
import { describe, it, expect } from 'vitest';
import { attemptDeterministicRepair } from '../repair';
import { createEmptySymbolTable } from '../execute';
import { verifyAssert } from '../verify';
import { vec3 } from '../vecMath';
import type { AssertOp } from '../planSchema';
import type { Violation } from '../types';

function baseSquareSymtab() {
  const symtab = createEmptySymbolTable();
  symtab.points.set('A', vec3(0, 0, 0));
  symtab.points.set('B', vec3(1, 0, 0));
  symtab.points.set('C', vec3(1, 1, 0));
  symtab.points.set('D', vec3(0, 1, 0));
  symtab.namedPlanes.set('ABCD', ['A', 'B', 'C', 'D']);
  return symtab;
}

describe('attemptDeterministicRepair — "on" violations', () => {
  it('snaps a point that is slightly off a line back onto it', () => {
    const symtab = baseSquareSymtab();
    symtab.points.set('M', vec3(0.5, 0.0003, 0)); // meant to be the midpoint of AB (on the line)
    const violation = verifyAssert({ relation: 'on', args: ['M', 'AB'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
    const after = verifyAssert({ relation: 'on', args: ['M', 'AB'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(after).toBeNull();
  });

  it('snaps a point that is slightly off a plane back onto it', () => {
    const symtab = baseSquareSymtab();
    symtab.points.set('P', vec3(0.5, 0.5, 0.0004));
    const violation = verifyAssert({ relation: 'on', args: ['P', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
    expect(symtab.points.get('P')!.z).toBeCloseTo(0, 6);
  });
});

describe('attemptDeterministicRepair — "perp" violations (line vs plane)', () => {
  it('re-anchors a nearly-perpendicular apex back onto the true normal', () => {
    const symtab = baseSquareSymtab();
    // S should be directly above A (perp to ABCD); nudge it slightly off-normal.
    symtab.points.set('S', vec3(0.005, 0, Math.sqrt(2)));
    const violation = verifyAssert({ relation: 'perp', args: ['AS', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(true);
    const after = verifyAssert({ relation: 'perp', args: ['AS', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(after).toBeNull();
  });
});

describe('attemptDeterministicRepair — declines out-of-scope or large errors', () => {
  it('declines when the violation is a large, likely-semantic error (not numeric noise)', () => {
    const symtab = baseSquareSymtab();
    symtab.points.set('S', vec3(5, 5, 5)); // wildly off, not "SA" at all
    const violation = verifyAssert({ relation: 'perp', args: ['SA', 'ABCD'], tolerance: 1e-6 } as AssertOp, symtab);
    expect(violation).not.toBeNull();
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('declines to repair a non-assert_failed (degenerate) violation', () => {
    const symtab = baseSquareSymtab();
    const result = attemptDeterministicRepair(
      { kind: 'degenerate', message: 'x' } as Violation,
      symtab
    );
    expect(result.repaired).toBe(false);
  });

  it('declines relations it does not implement (e.g. dist)', () => {
    const symtab = baseSquareSymtab();
    const violation = verifyAssert({ relation: 'dist', args: ['A', 'B'], value: 99 } as AssertOp, symtab);
    const result = attemptDeterministicRepair(violation!, symtab);
    expect(result.repaired).toBe(false);
  });
});
