// Entry runOscillation — hình dạng Result (mirror runDynamics §12), meta, queryIndex, propagate checks,
// KHÔNG serve đáp khi violation vật lý, assert dữ kiện dư, OS-2 không bao giờ throw.
import { describe, it, expect } from 'vitest';
import { runOscillation, type OscillationResult } from '../runOscillation';

const U = { length: 'cm' as const, time: 's' as const };
const O1 = { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } }],
  queries: [{ kind: 'period', of: 'vat', label: 'a' }, { kind: 'x_at', of: 'vat', t: { n: 1, d: 30 }, label: 'b' }] };

describe('runOscillation — hình dạng & meta', () => {
  it('parse lỗi ⇒ ok:false + errors có path, KHÔNG ném, answers rỗng', () => {
    const r = runOscillation({ problemName: '', ops: [], queries: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/Invalid oscillation plan/);
    expect(r.answers).toEqual([]);
    expect(r.geometry).toBeNull();
  });

  it('contract có đủ mọi khóa {ok, answers, checks, violations, errors, geometry, charts, meta}', () => {
    const r = runOscillation(O1);
    const keys = Object.keys(r).sort();
    expect(keys).toEqual(['answers', 'charts', 'checks', 'errors', 'geometry', 'meta', 'ok', 'violations']);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.checks)).toBe(true);
    expect(r.checks.length).toBeGreaterThan(0); // self-check ghi vào checks[]
  });

  it('meta: tPhys / playback / unitsNote / length / models (trace)', () => {
    const r = runOscillation(O1);
    expect(r.meta.unitsNote).toBe('per-quantity');
    expect(r.meta.length).toBe('cm');
    expect(r.meta.tPhys).toBeCloseTo(0.4, 9); // 2T = 2·(1/5) = 0,4
    expect(r.meta.playback.durationSec).toBeGreaterThan(0);
    expect(r.meta.models).toEqual([{ name: 'vat', hasA: true, hasOmega: true, hasPhase: true, animated: true }]);
  });

  it('meta.models phản ánh con lắc đơn (không A, không phase, không animate)', () => {
    const r = runOscillation({ units: U, ops: [{ op: 'oscillator', name: 'cl', pendulum: { l: 4, gAsPiSquared: true } }], queries: [{ kind: 'period', of: 'cl' }] });
    expect(r.meta.models[0]).toEqual({ name: 'cl', hasA: false, hasOmega: true, hasPhase: false, animated: false });
  });

  it('queryIndex gắn đúng thứ tự plan', () => {
    const r = runOscillation(O1);
    expect(r.answers.map((a) => a.queryIndex)).toEqual([0, 1]);
  });

  it('đơn vị đầu ra do engine ghi (per-quantity)', () => {
    const r = runOscillation({ units: U, ops: [{ op: 'oscillator', name: 'v', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } }],
      queries: [{ kind: 'period', of: 'v' }, { kind: 'frequency', of: 'v' }, { kind: 'v_at', of: 'v', t: { n: 1, d: 30 } }, { kind: 'a_at', of: 'v', t: { n: 1, d: 30 }, unit: 'm/s2' }, { kind: 'initial_phase', of: 'v' }] });
    expect(r.answers.map((a) => a.unit)).toEqual(['s', 'Hz', 'cm/s', 'm/s2', 'rad']);
  });
});

describe('runOscillation — không serve đáp khi violation vật lý', () => {
  it('nguồn dư LỆCH ⇒ violation nguon-du-lech, answers RỖNG, ok:false', () => {
    const r = runOscillation({ units: U, ops: [{ op: 'oscillator', name: 'v', A: 4, omega: 10, T: 1 }], queries: [{ kind: 'omega', of: 'v' }] });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'nguon-du-lech')).toBe(true);
    expect(r.answers).toEqual([]); // KHÔNG bịa đáp
    expect(r.geometry).toBeNull();
  });

  it('query li độ ngoài biên ⇒ errors, ok:false', () => {
    const r = runOscillation({ units: U, ops: [{ op: 'oscillator', name: 'v', A: 4, omega: 10 }], queries: [{ kind: 'speed_at_x', of: 'v', x: 9 }] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.message.includes('ngoài biên'))).toBe(true);
  });
});

describe('runOscillation — asserts dữ kiện dư (§8.2)', () => {
  it('assert KHỚP ⇒ ok:true, không violation', () => {
    const r = runOscillation({ units: U, ...{ ops: O1.ops }, queries: [{ kind: 'period', of: 'vat' }],
      asserts: [{ query: { kind: 'frequency', of: 'vat' }, equals: 5 }] });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it('assert LỆCH ⇒ violation (assert), ok:false, nhưng đáp VẪN serve (engine tính đúng)', () => {
    const r = runOscillation({ units: U, ...{ ops: O1.ops }, queries: [{ kind: 'period', of: 'vat' }],
      asserts: [{ query: { kind: 'frequency', of: 'vat' }, equals: 99 }] });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.assert === 'frequency')).toBe(true);
    expect(r.answers).toHaveLength(1); // assert-sai KHÔNG xoá đáp (khác violation vật lý)
  });
  it('gAsPiSquared: assert tol override 0.02 (§5.4 — engine KHÔNG tự nới; đề "g=10, π²=10")', () => {
    // con lắc l=1, gAsPiSquared ⇒ T = 2 s exact (g≈9,8696). Đề dư "f≈0,5 với g=10" lệch ~0,66% > 1e-3.
    // period exact 2 s: f = 0,5 khớp; nhưng nếu đề khai f theo g=10 số thuần cần tol nới — mô phỏng bằng
    // assert period=2 với tol lớn cho qua, tol chuẩn cho lệch nhỏ giả định.
    const plan = { units: U, ops: [{ op: 'oscillator', name: 'cl', pendulum: { l: 1, gAsPiSquared: true } }], queries: [{ kind: 'period', of: 'cl' }] };
    const strict = runOscillation({ ...plan, asserts: [{ query: { kind: 'period', of: 'cl' }, equals: 2.01 }] });
    expect(strict.violations.some((v) => v.assert === 'period')).toBe(true); // tol chuẩn 1e-3 ⇒ lệch 0,01 > tol
    const loose = runOscillation({ ...plan, asserts: [{ query: { kind: 'period', of: 'cl' }, equals: 2.01, tol: 0.02 }] });
    expect(loose.violations).toEqual([]); // override tol 0,02 ⇒ qua
  });
});

describe('runOscillation — OS-2 không bao giờ throw', () => {
  it('mọi input rác ⇒ trả object có ok:false, KHÔNG ném', () => {
    for (const bad of [null, undefined, 42, 'x', {}, { ops: 'no' }, { units: { length: 'inch' } }]) {
      expect(() => runOscillation(bad)).not.toThrow();
      expect(runOscillation(bad).ok).toBe(false);
    }
  });
  it('nhiều op dispatch đúng theo of', () => {
    const r = runOscillation({ units: U, ops: [
      { op: 'oscillator', name: 'a', A: 4, omega: 10 }, { op: 'oscillator', name: 'b', A: 6, omega: 20 }],
      queries: [{ kind: 'vmax', of: 'a' }, { kind: 'vmax', of: 'b' }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(40, 6); // 4·10
    expect(r.answers[1].approx).toBeCloseTo(120, 6); // 6·20
  });
});
