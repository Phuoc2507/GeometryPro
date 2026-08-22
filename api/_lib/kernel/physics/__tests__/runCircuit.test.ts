// Test entry runCircuit — parse fail (superRefine §6.3), asserts, geometry rỗng, C10 nhánh error.
import { describe, it, expect } from 'vitest';
import { runCircuit } from '../runCircuit';

describe('runCircuit — superRefine fail (lỗi dịch nhìn thấy được)', () => {
  it('tên trùng ⇒ ok:false + error parse', () => {
    const r = runCircuit({
      problemName: 'p', source: { emf: 12 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 4 }, { kind: 'resistor', name: 'R1', ohms: 8 }] },
      queries: [{ kind: 'resistance' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('of trỏ tên lạ ⇒ ok:false', () => {
    const r = runCircuit({
      problemName: 'p', source: { emf: 12 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 4 }, { kind: 'resistor', name: 'R2', ohms: 8 }] },
      queries: [{ kind: 'voltage', of: 'R9' }],
    });
    expect(r.ok).toBe(false);
  });

  it('9 lá ⇒ vượt trần 8', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ kind: 'resistor', name: `R${i}`, ohms: i + 1 }));
    const r = runCircuit({ problemName: 'p', source: { emf: 12 }, circuit: { kind: 'series', items }, queries: [{ kind: 'resistance' }] });
    expect(r.ok).toBe(false);
  });

  it('có unknown_resistor nhưng thiếu solve_resistance ⇒ fail', () => {
    const r = runCircuit({
      problemName: 'p', source: { emf: 12 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 5 }, { kind: 'unknown_resistor', name: 'Rx' }] },
      queries: [{ kind: 'resistance' }],
    });
    expect(r.ok).toBe(false);
  });

  it('lamp_check.of không phải đèn ⇒ fail', () => {
    const r = runCircuit({
      problemName: 'p', source: { emf: 9 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 6 }, { kind: 'resistor', name: 'R2', ohms: 6 }] },
      queries: [{ kind: 'lamp_check', of: 'R1' }],
    });
    expect(r.ok).toBe(false);
  });
});

describe('runCircuit — asserts (dữ kiện dư), geometry rỗng, meta', () => {
  const C5 = {
    problemName: 'hon-hop', source: { emf: 12 },
    circuit: { kind: 'series', items: [
      { kind: 'resistor', name: 'R1', ohms: 4 },
      { kind: 'parallel', name: 'P23', items: [{ kind: 'resistor', name: 'R2', ohms: 6 }, { kind: 'resistor', name: 'R3', ohms: 3 }] },
    ] },
    queries: [{ kind: 'current', of: 'R1', label: 'b' }],
  } as const;

  it('assert current(R1) = 2 (đúng) ⇒ ok, không violation', () => {
    const r = runCircuit({ ...C5, asserts: [{ query: { kind: 'current', of: 'R1' }, equals: 2 }] });
    expect(r.ok).toBe(true);
    expect(r.violations.length).toBe(0);
  });

  it('assert current(R1) = 2,1 (lệch) ⇒ violation + ok:false', () => {
    const r = runCircuit({ ...C5, asserts: [{ query: { kind: 'current', of: 'R1' }, equals: 2.1 }] });
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBe(1);
    expect(r.violations[0].expected).toBe(2.1);
  });

  it('geometry rỗng đúng shape {name, points:[], lines:[], tags:[physics,circuit]}', () => {
    const r = runCircuit(C5);
    expect(r.geometry).toEqual({ name: 'hon-hop', points: [], lines: [], tags: ['physics', 'circuit'] });
  });

  it('meta có iMain/uExternal/rTotal + unitsNote SI; circuitLayout + table không rỗng', () => {
    const r = runCircuit(C5);
    expect(r.meta.rTotal.text).toBe('6');
    expect(r.meta.iMain.text).toBe('2');
    expect(r.meta.unitsNote).toBe('SI');
    expect(r.circuitLayout.elements.length).toBeGreaterThan(0);
    expect(r.table.length).toBeGreaterThan(0);
  });
});

describe('runCircuit — bài nghịch C10 + nhánh error', () => {
  const base = {
    problemName: 'tim-r', source: { emf: 12, r: 1 },
    circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 5 }, { kind: 'unknown_resistor', name: 'Rx' }] },
  } as const;

  it('I = 1,2 A ⇒ Rx = 4 Ω, backsub pass, ok', () => {
    const r = runCircuit({ ...base, queries: [{ kind: 'solve_resistance', of: 'Rx', targetCurrent: 1.2 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('4');
    expect(r.checks.find((c) => c.kind === 'solve_backsub')?.pass).toBe(true);
  });

  it('I = 2,5 A ⇒ Rx âm ⇒ error, ok:false, KHÔNG serve', () => {
    const r = runCircuit({ ...base, queries: [{ kind: 'solve_resistance', of: 'Rx', targetCurrent: 2.5 }] });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.answers.length).toBe(0);
  });

  it('đèn ⇒ có check assumption "R đèn coi như không đổi"', () => {
    const r = runCircuit({
      problemName: 'den', source: { emf: 9 },
      circuit: { kind: 'series', items: [{ kind: 'lamp', name: 'den', ratedVolts: 6, ratedWatts: 3 }, { kind: 'resistor', name: 'Rb', ohms: 6 }] },
      queries: [{ kind: 'lamp_check', of: 'den' }],
    });
    expect(r.checks.some((c) => c.kind === 'assumption')).toBe(true);
  });
});
