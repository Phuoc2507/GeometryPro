// Contract dao động điều hòa — 10 bài spec O1–O10 (§10) + 6 bài vàng DD01–DD06 (golden-problems §C).
// KHOÁ CỨNG text engine (exact-first) + cờ approximate + đơn vị. Đáp đã kiểm tay 2 vòng + script số học
// độc lập (Math.cos/PI, quét minimality first_time). Đây là hàng rào chống "đáp-sai-âm-thầm":
//   - DD01c v_at = "-30π√3" cm/s (dạng căn·π mà recognize KHÔNG cứu — phải exact nhờ PiScalar);
//   - DD04a period = "4" s (π triệt tiêu bằng đại số phân bậc, KHÔNG rơi float);
//   - DD06d first_time positive = "11/60" s (bẫy chọn nhánh −θ₀ + k=1 + t>0 nghiêm ngặt).
import { describe, it, expect } from 'vitest';
import { runOscillation } from '../runOscillation';

const U = { length: 'cm' as const, time: 's' as const };
type Expect = { kind: string; text: string; unit: string; approximate?: boolean; approx?: number };

// Chạy plan, khớp answers[] theo THỨ TỰ query với danh sách kỳ vọng (text + unit + cờ approximate).
function expectAnswers(raw: unknown, exp: Expect[]): void {
  const r = runOscillation(raw);
  expect(r.errors, `errors: ${JSON.stringify(r.errors)}`).toEqual([]);
  expect(r.violations, `violations: ${JSON.stringify(r.violations)}`).toEqual([]);
  expect(r.ok).toBe(true);
  expect(r.answers).toHaveLength(exp.length);
  exp.forEach((e, i) => {
    const a = r.answers[i];
    expect(a.kind, `#${i} kind`).toBe(e.kind);
    expect(a.text, `#${i} text (${e.kind})`).toBe(e.text);
    expect(a.unit, `#${i} unit (${e.kind})`).toBe(e.unit);
    expect(a.approximate, `#${i} approximate (${e.kind})`).toBe(e.approximate ?? false);
    if (e.approx !== undefined) expect(a.approx, `#${i} approx (${e.kind})`).toBeCloseTo(e.approx, 3);
  });
}

describe('contract O1–O10 (spec §10)', () => {
  it('O1 — đọc pt ω=10π, x/v/a tại t (a đổi m/s²)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } }],
        queries: [
          { kind: 'period', of: 'vat' }, { kind: 'frequency', of: 'vat' },
          { kind: 'x_at', of: 'vat', t: { n: 1, d: 30 } }, { kind: 'v_at', of: 'vat', t: { n: 1, d: 30 } },
          { kind: 'a_at', of: 'vat', t: { n: 1, d: 30 }, unit: 'm/s2' }] },
      [{ kind: 'period', text: '1/5', unit: 's' }, { kind: 'frequency', text: '5', unit: 'Hz' },
       { kind: 'x_at', text: '-2', unit: 'cm' }, { kind: 'v_at', text: '-20π√3', unit: 'cm/s', approx: -108.8280 },
       { kind: 'a_at', text: '2π²', unit: 'm/s2', approx: 19.7392 }]);
  });

  it('O2 — sin→cos, vmax/amax/pha đầu', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 5, omega: { n: 10, pi: true }, phi: { n: 0 }, form: 'sin' }],
        queries: [{ kind: 'vmax', of: 'vat' }, { kind: 'amax', of: 'vat', unit: 'm/s2' }, { kind: 'initial_phase', of: 'vat' }, { kind: 'x_at', of: 'vat', t: 0.05 }] },
      [{ kind: 'vmax', text: '50π', unit: 'cm/s', approx: 157.0796 }, { kind: 'amax', text: '5π²', unit: 'm/s2', approx: 49.3480 },
       { kind: 'initial_phase', text: '-π/2', unit: 'rad' }, { kind: 'x_at', text: '5', unit: 'cm' }]);
  });

  it('O3 — lò xo m,k + thả nhẹ (initial)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', spring: { k: 100 }, mass: 250, massUnit: 'g', initial: { x0: 4, v0: 0 } }],
        queries: [{ kind: 'omega', of: 'vat' }, { kind: 'period', of: 'vat' }, { kind: 'amplitude', of: 'vat' }, { kind: 'vmax', of: 'vat' }] },
      [{ kind: 'omega', text: '20', unit: 'rad/s' }, { kind: 'period', text: 'π/10', unit: 's', approx: 0.3142 },
       { kind: 'amplitude', text: '4', unit: 'cm' }, { kind: 'vmax', text: '80', unit: 'cm/s' }]);
  });

  it('O4 — con lắc đơn g=π² & g=9,8 + lUnit', () => {
    expectAnswers(
      { units: U, ops: [
        { op: 'oscillator', name: 'cl1', pendulum: { l: 1, gAsPiSquared: true } },
        { op: 'oscillator', name: 'cl2', pendulum: { l: 25, lUnit: 'cm', gAsPiSquared: true } },
        { op: 'oscillator', name: 'cl3', pendulum: { l: 1, g: 9.8 } }],
        queries: [{ kind: 'period', of: 'cl1' }, { kind: 'period', of: 'cl2' }, { kind: 'period', of: 'cl3' }, { kind: 'frequency', of: 'cl1' }] },
      [{ kind: 'period', text: '2', unit: 's' }, { kind: 'period', text: '1', unit: 's' },
       { kind: 'period', text: '2π√5/7', unit: 's', approx: 2.0071 }, { kind: 'frequency', text: '1/2', unit: 'Hz' }]);
  });

  it('O5 — ω/f từ đếm dao động + A từ L', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', count: { n: 20, dt: 10 }, L: 12 }],
        queries: [{ kind: 'frequency', of: 'vat' }, { kind: 'omega', of: 'vat' }, { kind: 'amplitude', of: 'vat' }] },
      [{ kind: 'frequency', text: '2', unit: 'Hz' }, { kind: 'omega', text: '4π', unit: 'rad/s', approx: 12.5664 }, { kind: 'amplitude', text: '6', unit: 'cm' }]);
  });

  it('O6 — hệ thức độc lập (T=0,2π)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', T: { n: 0.2, pi: true }, fromState: { x: 3, v: 40 } }],
        queries: [{ kind: 'amplitude', of: 'vat' }, { kind: 'speed_at_x', of: 'vat', x: 4 }, { kind: 'x_at_speed', of: 'vat', v: 30 }, { kind: 'vmax', of: 'vat' }] },
      [{ kind: 'amplitude', text: '5', unit: 'cm' }, { kind: 'speed_at_x', text: '30', unit: 'cm/s' },
       { kind: 'x_at_speed', text: '4', unit: 'cm' }, { kind: 'vmax', text: '50', unit: 'cm/s' }]);
  });

  it('O7 — năng lượng qua k', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', spring: { k: 100 }, A: 4 }],
        queries: [{ kind: 'energy_total', of: 'vat' }, { kind: 'energy_potential_at', of: 'vat', at: { x: 2 } }, { kind: 'energy_kinetic_at', of: 'vat', at: { x: 2 } }, { kind: 'x_where_energy_ratio', of: 'vat', ratio: 3 }] },
      [{ kind: 'energy_total', text: '2/25', unit: 'J' }, { kind: 'energy_potential_at', text: '1/50', unit: 'J' },
       { kind: 'energy_kinetic_at', text: '3/50', unit: 'J' }, { kind: 'x_where_energy_ratio', text: '2', unit: 'cm' }]);
  });

  it('O8 — năng lượng qua m, ω=4π (π² sống xuyên suốt) + Wđ tại t', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', mass: 200, massUnit: 'g', A: 5, omega: { n: 4, pi: true }, phi: { n: 0 } }],
        queries: [{ kind: 'energy_total', of: 'vat' }, { kind: 'vmax', of: 'vat' }, { kind: 'energy_kinetic_at', of: 'vat', at: { t: { n: 1, d: 24 } } }] },
      [{ kind: 'energy_total', text: 'π²/250', unit: 'J', approx: 0.0395 }, { kind: 'vmax', text: '20π', unit: 'cm/s', approx: 62.8319 },
       { kind: 'energy_kinetic_at', text: 'π²/1000', unit: 'J', approx: 0.0099 }]);
  });

  it('O9 — first_time đường lưới (ω=10π)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } }],
        queries: [
          { kind: 'first_time_at_x', of: 'vat', x: -2, direction: 'any' },
          { kind: 'first_time_at_x', of: 'vat', x: -2, direction: 'positive' },
          { kind: 'first_time_at_x', of: 'vat', x: 0, direction: 'any' }] },
      [{ kind: 'first_time_at_x', text: '1/30', unit: 's', approx: 0.0333 }, { kind: 'first_time_at_x', text: '1/10', unit: 's', approx: 0.1 },
       { kind: 'first_time_at_x', text: '1/60', unit: 's', approx: 0.0167 }]);
  });

  it('O10 — ω=2 không-π: đáp π + nhánh off-grid trung thực (approximate:true)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 5, omega: 2, phi: { n: 1, d: 6, pi: true } }],
        queries: [{ kind: 'period', of: 'vat' }, { kind: 'x_at', of: 'vat', t: 1 }, { kind: 'first_time_at_x', of: 'vat', x: 2.5, direction: 'any' }] },
      [{ kind: 'period', text: 'π', unit: 's', approx: 3.1416 },
       { kind: 'x_at', text: '-4.0752', unit: 'cm', approximate: true, approx: -4.0752 },
       { kind: 'first_time_at_x', text: 'π/12', unit: 's', approx: 0.2618 }]);
  });
});

describe('contract vàng DD01–DD06 (golden-problems §C — khoá đáp CỨNG)', () => {
  it('DD01 — ω=10π, x/v/a tại t; v_at = -30π√3 (căn·π exact, KHÔNG rơi float)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 6, omega: { n: 10, pi: true }, phi: { n: 1, d: 6, pi: true } }],
        queries: [
          { kind: 'period', of: 'vat', label: 'a1' }, { kind: 'frequency', of: 'vat', label: 'a2' },
          { kind: 'x_at', of: 'vat', t: { n: 1, d: 60 }, label: 'b' },
          { kind: 'v_at', of: 'vat', t: { n: 1, d: 60 }, label: 'c' },
          { kind: 'a_at', of: 'vat', t: { n: 1, d: 60 }, unit: 'm/s2', label: 'd' }] },
      [{ kind: 'period', text: '1/5', unit: 's' }, { kind: 'frequency', text: '5', unit: 'Hz' },
       { kind: 'x_at', text: '3', unit: 'cm' },
       { kind: 'v_at', text: '-30π√3', unit: 'cm/s', approx: -163.2419 }, // -30√3·π chính xác (golden doc ghi -163,2436 là làm tròn lệch; text exact mới là chốt)
       { kind: 'a_at', text: '-3π²', unit: 'm/s2', approx: -29.6088 }]);
  });

  it('DD02 — sin→cos: pha đầu · vmax · amax (80π² cm/s²) · x tại t', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 5, omega: { n: 4, pi: true }, phi: { n: 0 }, form: 'sin' }],
        queries: [{ kind: 'initial_phase', of: 'vat' }, { kind: 'vmax', of: 'vat' }, { kind: 'amax', of: 'vat' }, { kind: 'x_at', of: 'vat', t: 0.125 }] },
      [{ kind: 'initial_phase', text: '-π/2', unit: 'rad' }, { kind: 'vmax', text: '20π', unit: 'cm/s', approx: 62.8319 },
       { kind: 'amax', text: '80π²', unit: 'cm/s2', approx: 789.5684 }, { kind: 'x_at', text: '5', unit: 'cm' }]);
  });

  it('DD03 — hệ thức độc lập (T=π/10): ω triệt π → 20; A=10; cặp (6,8,10)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', T: { n: 1, d: 10, pi: true }, fromState: { x: 6, v: 160 } }],
        queries: [{ kind: 'omega', of: 'vat' }, { kind: 'amplitude', of: 'vat' }, { kind: 'speed_at_x', of: 'vat', x: 8 }, { kind: 'x_at_speed', of: 'vat', v: 120 }] },
      [{ kind: 'omega', text: '20', unit: 'rad/s' }, { kind: 'amplitude', text: '10', unit: 'cm' },
       { kind: 'speed_at_x', text: '120', unit: 'cm/s' }, { kind: 'x_at_speed', text: '8', unit: 'cm' }]);
  });

  it('DD04 — con lắc đơn g=π²: chu kỳ "4" s EXACT (π triệt tiêu) · 1/4 Hz · 1 s', () => {
    expectAnswers(
      { units: U, ops: [
        { op: 'oscillator', name: 'cl1', pendulum: { l: 4, gAsPiSquared: true } },
        { op: 'oscillator', name: 'cl2', pendulum: { l: 0.25, gAsPiSquared: true } }],
        queries: [{ kind: 'period', of: 'cl1' }, { kind: 'frequency', of: 'cl1' }, { kind: 'period', of: 'cl2' }] },
      [{ kind: 'period', text: '4', unit: 's' }, { kind: 'frequency', text: '1/4', unit: 'Hz' }, { kind: 'period', text: '1', unit: 's' }]);
  });

  it('DD05 — năng lượng qua k (không cần m, ω): 9/100 · 9/400 · 27/400 J · 3 cm', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', spring: { k: 50 }, A: 6 }],
        queries: [{ kind: 'energy_total', of: 'vat' }, { kind: 'energy_potential_at', of: 'vat', at: { x: 3 } }, { kind: 'energy_kinetic_at', of: 'vat', at: { x: 3 } }, { kind: 'x_where_energy_ratio', of: 'vat', ratio: 3 }] },
      [{ kind: 'energy_total', text: '9/100', unit: 'J' }, { kind: 'energy_potential_at', text: '9/400', unit: 'J' },
       { kind: 'energy_kinetic_at', text: '27/400', unit: 'J' }, { kind: 'x_where_energy_ratio', text: '3', unit: 'cm' }]);
  });

  it('DD06 — first_time bẫy nặng: any=1/20, positive=11/60 (nhánh −θ₀, k=1, t>0 nghiêm ngặt)', () => {
    expectAnswers(
      { units: U, ops: [{ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: -1, d: 6, pi: true } }],
        queries: [
          { kind: 'period', of: 'vat', label: 'a' }, { kind: 'x_at', of: 'vat', t: { n: 1, d: 60 }, label: 'b' },
          { kind: 'first_time_at_x', of: 'vat', x: 2, direction: 'any', label: 'c' },
          { kind: 'first_time_at_x', of: 'vat', x: 2, direction: 'positive', label: 'd' }] },
      [{ kind: 'period', text: '1/5', unit: 's' }, { kind: 'x_at', text: '4', unit: 'cm' },
       { kind: 'first_time_at_x', text: '1/20', unit: 's', approx: 0.05 },
       { kind: 'first_time_at_x', text: '11/60', unit: 's', approx: 0.18333 }]);
  });

  it('DD06d KHOÁ RIÊNG — positive KHÁC any (không trả nhầm 1/20 cho cả hai)', () => {
    const r = runOscillation({ units: U, ops: [{ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: -1, d: 6, pi: true } }],
      queries: [{ kind: 'first_time_at_x', of: 'vat', x: 2, direction: 'any' }, { kind: 'first_time_at_x', of: 'vat', x: 2, direction: 'positive' }] });
    expect(r.answers[0].text).toBe('1/20');
    expect(r.answers[1].text).toBe('11/60');
    expect(r.answers[0].text).not.toBe(r.answers[1].text); // bẫy: engine dễ trả cùng 1/20
  });
});
