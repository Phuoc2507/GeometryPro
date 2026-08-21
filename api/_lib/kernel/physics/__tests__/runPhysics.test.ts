// Test Task 3: runPhysics — entry parse → queries → asserts → T_phys (scene gắn ở Task 4).
import { describe, it, expect } from 'vitest';
import { runPhysics } from '../runPhysics';

const planP7 = (extra: object = {}) => ({
  problemName: 'hai-xe', units: { length: 'km', time: 'h' },
  ops: [
    { op: 'mover1d', name: 'oto', x0: 0, v0: 60 },
    { op: 'mover1d', name: 'khach', x0: 30, v0: 40 },
  ],
  queries: [
    { kind: 'meet_time', a: 'oto', b: 'khach', label: 'a' },
    { kind: 'meet_position', a: 'oto', b: 'khach', label: 'b' },
  ],
  ...extra,
});

describe('runPhysics', () => {
  it('P7: 2 dap theo thu tu queries, don vi dung, ok:true, checks pass', () => {
    const r = runPhysics(planP7());
    expect(r.ok).toBe(true);
    expect(r.answers.map((a) => a.text)).toEqual(['3/2 h', '90 km']);
    expect(r.answers[0].label).toBe('a');
    expect(r.checks.length).toBeGreaterThan(0);
    expect(r.checks.every((c) => c.pass)).toBe(true);
    expect(r.meta.tPhys).toBeCloseTo(1.5, 10);
  });
  it('assert du kien DU khop → ok giu true; sai → violations + ok:false (khong serve dap sai)', () => {
    const good = runPhysics(planP7({ asserts: [{ query: { kind: 'position_at', of: 'oto', t: 1 }, equals: 60 }] }));
    expect(good.ok).toBe(true);
    expect(good.violations).toHaveLength(0);
    const bad = runPhysics(planP7({ asserts: [{ query: { kind: 'position_at', of: 'oto', t: 1 }, equals: 75 }] }));
    expect(bad.ok).toBe(false);
    expect(bad.violations).toHaveLength(1);
    expect(bad.violations[0]).toMatchObject({ expected: 75 });
  });
  it('query khong tinh duoc → errors + ok:false, cac query khac van tra dap', () => {
    const r = runPhysics(planP7({ queries: [
      { kind: 'meet_time', a: 'oto', b: 'khach' },
      { kind: 'time_to_ground', of: 'oto' },   // mover1d không có
    ] }));
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.answers).toHaveLength(1);
  });
  it('plan sai schema → ok:false + message ro (khong nem)', () => {
    const r = runPhysics({ problemName: 'x', ops: [], queries: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain('Invalid physics plan');
  });
  it('hai vat trung ten → error', () => {
    const r = runPhysics(planP7({ ops: [
      { op: 'mover1d', name: 'oto', x0: 0, v0: 60 },
      { op: 'mover1d', name: 'oto', x0: 30, v0: 40 },
    ] }));
    expect(r.ok).toBe(false);
  });
  it('F2: he nen ngoai bang + op co khai unit → errors co cau truc, khong nem', () => {
    const r = runPhysics({
      problemName: 'nen-la', units: { length: 'cm', time: 's' },
      ops: [{ op: 'mover1d', name: 'xe', x0: 0, v0: 10, v0Unit: 'km/h' }],
      queries: [{ kind: 'position_at', of: 'xe', t: 1 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /ngoài bảng/.test(e.message))).toBe(true);
  });
});
