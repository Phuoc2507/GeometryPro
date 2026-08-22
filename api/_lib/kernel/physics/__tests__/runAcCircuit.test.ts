// runAcCircuit — parse/superRefine (§6.3 + VỪA-1), pipeline KHÔNG throw (OS-2), asserts, layout shape.
import { describe, it, expect } from 'vitest';
import { runAcCircuit } from '../runAcCircuit';

const base = { R: 100, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true } };

describe('runAcCircuit — schema superRefine (§6.3) fail = lỗi dịch nhìn thấy', () => {
  it('thiếu cả f và omega ⇒ ok:false + error', () => {
    const r = runAcCircuit({ problemName: 'x', source: { U: 200 }, ...base, queries: [{ kind: 'impedance' }] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/tần số|f, omega/);
  });

  it('khai CẢ f và omega ⇒ ok:false', () => {
    const r = runAcCircuit({ problemName: 'x', source: { f: 50, omega: { n: 100, pi: true }, U: 200 }, ...base, queries: [{ kind: 'impedance' }] });
    expect(r.ok).toBe(false);
  });

  it('khai CẢ U và U0 ⇒ ok:false', () => {
    const r = runAcCircuit({ problemName: 'x', source: { f: 50, U: 200, U0: { n: 200, rad: 2 } }, ...base, queries: [{ kind: 'impedance' }] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/điện áp|U, U0/);
  });

  it('VỪA-1: is_resonance mạch RL (khuyết C) ⇒ ok:false + "cần cả L và C"', () => {
    const r = runAcCircuit({
      problemName: 'rl', source: { f: 50, U: 200 }, R: 50, L: { n: 1, overPi: true },
      queries: [{ kind: 'is_resonance' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/cần cả L và C/);
  });

  it('resonance_frequency khi khuyết C ⇒ ok:false', () => {
    const r = runAcCircuit({
      problemName: 'rl', source: { f: 50, U: 200 }, R: 50, L: { n: 1, overPi: true },
      queries: [{ kind: 'resonance_frequency' }],
    });
    expect(r.ok).toBe(false);
  });

  it('solve_resonance{target:C} khi khuyết L ⇒ ok:false', () => {
    const r = runAcCircuit({
      problemName: 'rc', source: { f: 50, U: 200 }, R: 50, C: { n: 1, exp: -4, overPi: true },
      queries: [{ kind: 'solve_resonance', target: 'C' }],
    });
    expect(r.ok).toBe(false);
  });

  it('voltage{of:L} khi mạch không có L ⇒ ok:false', () => {
    const r = runAcCircuit({
      problemName: 'rc', source: { f: 50, U: 200 }, R: 50, C: { n: 1, exp: -4, overPi: true },
      queries: [{ kind: 'voltage', of: 'L' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/không có phần tử L/);
  });

  it('mạch không có phần tử nào ⇒ ok:false', () => {
    const r = runAcCircuit({ problemName: 'x', source: { f: 50, U: 200 }, queries: [{ kind: 'impedance' }] });
    expect(r.ok).toBe(false);
  });
});

describe('runAcCircuit — pipeline KHÔNG BAO GIỜ throw (OS-2)', () => {
  it('nhánh C (L thập phân thuần, π KHÔNG triệt tiêu) ⇒ số trung thực approximate, không throw', () => {
    // §3.3: L = 0,5 H, C = 10⁻⁴ F (không có 1/π) ⇒ Z_L=50π, Z_C=100/π khác bậc ⇒ collapse float.
    let r: ReturnType<typeof runAcCircuit> | undefined;
    expect(() => { r = runAcCircuit({
      problemName: 'nhanh-c', source: { f: 50, U: 200 }, R: 100, L: 0.5, C: 1e-4,
      queries: [{ kind: 'impedance', label: 'a' }],
    }); }).not.toThrow();
    expect(r).toBeDefined();
    // Z dính π vô tỉ ⇒ approximate:true trung thực (recognize KHÔNG bịa).
    expect(r!.answers[0].approximate).toBe(true);
    expect(Number.isFinite(r!.answers[0].approx)).toBe(true);
  });
});

describe('runAcCircuit — asserts (dữ kiện DƯ đề, §4 phòng tuyến máy)', () => {
  const a4 = {
    problemName: 'a4', source: { f: 50, U: 260 }, R: 120,
    L: { n: 1, overPi: true }, C: { n: 2, exp: -4, overPi: true },
    queries: [{ kind: 'power', label: 'a' }],
  };
  it('assert power = 480 (đúng) ⇒ không violation, ok:true', () => {
    const r = runAcCircuit({ ...a4, asserts: [{ query: { kind: 'power' }, equals: 480 }] });
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
  });
  it('assert power = 481 (sai) ⇒ violation, ok:false', () => {
    const r = runAcCircuit({ ...a4, asserts: [{ query: { kind: 'power' }, equals: 481 }] });
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatchObject({ assert: 'power', expected: 481 });
  });
});

describe('runAcCircuit — scene/layout (§10)', () => {
  const r = runAcCircuit({
    problemName: 'rlc-z-i-nguyen', source: { omega: { n: 100, pi: true }, U: 250 },
    R: 75, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true },
    queries: [{ kind: 'impedance', label: 'b' }, { kind: 'current', label: 'c' }],
  });
  it('geometry RỖNG hợp lệ + tags', () => {
    expect(r.geometry).toEqual({ name: 'rlc-z-i-nguyen', points: [], lines: [], tags: ['physics', 'ac-circuit'] });
  });
  it('phasor: đủ 4 vectơ + bất biến |U|² = U_R²+(U_L−U_C)²', () => {
    expect(r.phasor!.vectors).toHaveLength(4);
    const U = r.phasor!.vectors.find((v) => v.name === 'U')!;
    const UR = r.phasor!.vectors.find((v) => v.name === 'U_R')!;
    const UL = r.phasor!.vectors.find((v) => v.name === 'U_L')!;
    const UC = r.phasor!.vectors.find((v) => v.name === 'U_C')!;
    const dy = UL.y + UC.y; // U_C nằm ở −y
    expect(U.x * U.x + U.y * U.y).toBeCloseTo(UR.x * UR.x + dy * dy, 6);
  });
  it('charts: u_t + i_t đều 129 mẫu', () => {
    expect(r.charts.map((c) => c.kind)).toEqual(['u_t', 'i_t']);
    expect(r.charts[0].series[0].samples).toHaveLength(129);
    expect(r.charts[1].series[0].samples).toHaveLength(129);
  });
  it('table: có hàng total với Z và P', () => {
    const total = r.table.find((t) => t.name === 'total')!;
    expect(total.Z!.text).toBe('125');
    expect(total.P).toBeDefined();
  });
});
