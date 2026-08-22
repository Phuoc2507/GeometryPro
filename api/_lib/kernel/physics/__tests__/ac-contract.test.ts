// Contract test — 10 bài A1–A10 (spec §11). Plan CHÉP NGUYÊN từ tài liệu; đáp là HỢP ĐỒNG tính tay
// (exact "125", "100√2", "π/6", "12/13", "1152/5"…). Lệch thì SỬA CODE, KHÔNG sửa đáp. Chuẩn minus =
// '−' U+2212 (VỪA-2, khớp §11). Mọi bài: ok, checks pass hết; approximate:false trừ đúng φ off-grid A9.
import { describe, it, expect } from 'vitest';
import { runAcCircuit, type AcResult } from '../runAcCircuit';

const texts = (r: AcResult) => r.answers.map((a) => a.text);
const units = (r: AcResult) => r.answers.map((a) => a.unit);
const approxes = (r: AcResult) => r.answers.map((a) => a.approx);
const allExact = (r: AcResult) => r.answers.every((a) => !a.approximate);
const checksPass = (r: AcResult) => r.checks.every((c) => c.pass);

describe('AC contract — 10 bài SGK/đề thi VN điện xoay chiều RLC (spec §11)', () => {
  it('A1 Z nguyên: Z_L 200; Z_C 100; Z 125; I 2', () => {
    const r = runAcCircuit({
      problemName: 'rlc-z-i-nguyen',
      source: { omega: { n: 100, pi: true }, U: 250 },
      R: 75, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true },
      queries: [
        { kind: 'impedance', of: 'L', label: 'a1' },
        { kind: 'impedance', of: 'C', label: 'a2' },
        { kind: 'impedance', label: 'b' },
        { kind: 'current', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['200', '100', '125', '2']);
    expect(units(r)).toEqual(['Ω', 'Ω', 'Ω', 'A']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('A2 Z căn √2: Z 100√2 ≈141,42; I √2 ≈1,41', () => {
    const r = runAcCircuit({
      problemName: 'rlc-z-can-hai',
      source: { f: 50, U: 200 },
      R: 100, L: { n: 1, overPi: true }, C: { n: 1, d: 2, exp: -4, overPi: true },
      queries: [{ kind: 'impedance', label: 'a' }, { kind: 'current', label: 'b' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['100√2', '√2']);
    expect(units(r)).toEqual(['Ω', 'A']);
    expect(r.answers[0].approx).toBeCloseTo(141.4214, 3);
    expect(r.answers[1].approx).toBeCloseTo(1.4142, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('A3 độ lệch pha góc đẹp: Z 200; φ π/6 ≈0,5236; cosφ √3/2', () => {
    const r = runAcCircuit({
      problemName: 'rlc-pha-pi-6',
      source: { omega: { n: 100, pi: true }, U: 200 },
      R: { n: 100, rad: 3 }, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true },
      queries: [
        { kind: 'impedance', label: 'a' },
        { kind: 'phase_diff', label: 'b' },
        { kind: 'power_factor', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['200', 'π/6', '√3/2']);
    expect(units(r)).toEqual(['Ω', 'rad', '']);
    expect(r.answers[1].approx).toBeCloseTo(0.5236, 3);
    expect(r.answers[2].approx).toBeCloseTo(0.866, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('A4 công suất + cosφ: P 480 W; cosφ 12/13', () => {
    const r = runAcCircuit({
      problemName: 'rlc-cong-suat-cosphi',
      source: { f: 50, U: 260 },
      R: 120, L: { n: 1, overPi: true }, C: { n: 2, exp: -4, overPi: true },
      queries: [{ kind: 'power', label: 'a' }, { kind: 'power_factor', label: 'b' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['480', '12/13']);
    expect(units(r)).toEqual(['W', '']);
    expect(r.answers[1].approx).toBeCloseTo(0.9231, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('A5 cộng hưởng: f₀ 50 Hz; ratio 1 cong_huong; I 4 A', () => {
    const r = runAcCircuit({
      problemName: 'rlc-cong-huong',
      source: { f: 50, U: 200 },
      R: 50, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true },
      queries: [
        { kind: 'resonance_frequency', label: 'a' },
        { kind: 'is_resonance', label: 'b' },
        { kind: 'current', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['50', '1', '4']);
    expect(units(r)).toEqual(['Hz', '', 'A']);
    expect(r.answers[1].verdict).toBe('cong_huong');
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(r.meta.resonance).toBe(true);
  });

  it('A5b solve_resonance{C}: C = 1/(10000π) F', () => {
    const r = runAcCircuit({
      problemName: 'rlc-solve-c',
      source: { f: 50, U: 200 },
      R: 50, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true },
      queries: [{ kind: 'solve_resonance', target: 'C', label: 'a' }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('1/(10000π)');
    expect(r.answers[0].unit).toBe('F');
    expect(r.answers[0].approx).toBeCloseTo(3.1831e-5, 8);
    expect(r.answers[0].approximate).toBe(false);
    expect(r.checks.find((c) => c.kind === 'K5')?.pass).toBe(true);
    expect(r.checks.find((c) => c.kind === 'K5')?.residual).toBe(0);
  });

  it('A6 viết i tức thời: i = 2cos(100πt − π/4) (A)', () => {
    const r = runAcCircuit({
      problemName: 'rlc-viet-i',
      source: { omega: { n: 100, pi: true }, U0: { n: 200, rad: 2 }, phiU: { n: 0 } },
      R: 100, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true },
      queries: [{ kind: 'write_current', label: 'a' }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('i = 2cos(100πt − π/4) (A)');
    expect(r.answers[0].expr).toEqual({ amp: '2', omega: '100π', phase: '−π/4' });
    expect(r.answers[0].approx).toBeCloseTo(2, 6);
    expect(r.answers[0].unit).toBe('A');
    expect(r.answers[0].approximate).toBe(false);
    expect(checksPass(r)).toBe(true);
  });

  it('A7 U các phần tử: U_R 60; U_L 160; U_C 80; U 100 (K1 exact-0)', () => {
    const r = runAcCircuit({
      problemName: 'rlc-u-phan-tu',
      source: { f: 50, U: 100 },
      R: 30, L: { n: 8, d: 10, overPi: true }, C: { n: 25, d: 10, exp: -4, overPi: true },
      queries: [
        { kind: 'voltage', of: 'R', label: 'a' },
        { kind: 'voltage', of: 'L', label: 'b' },
        { kind: 'voltage', of: 'C', label: 'c' },
        { kind: 'voltage', of: 'source', label: 'd' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['60', '160', '80', '100']);
    expect(units(r)).toEqual(['V', 'V', 'V', 'V']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(r.checks.find((c) => c.kind === 'K1')?.residual).toBe(0);
  });

  it('A8 hiệu dụng ↔ cực đại: U 100; I 2; I₀ 2√2 ≈2,83', () => {
    const r = runAcCircuit({
      problemName: 'rlc-hieu-dung-cuc-dai',
      source: { omega: { n: 100, pi: true }, U0: { n: 100, rad: 2 } },
      R: 30, L: { n: 8, d: 10, overPi: true }, C: { n: 25, d: 10, exp: -4, overPi: true },
      queries: [
        { kind: 'voltage', of: 'source', peak: false, label: 'a' },
        { kind: 'current', peak: false, label: 'b' },
        { kind: 'current', peak: true, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['100', '2', '2√2']);
    expect(units(r)).toEqual(['V', 'A', 'A']);
    expect(r.answers[2].approx).toBeCloseTo(2.8284, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('A9 tổng hợp: Z/I/cosφ/P exact ĐỒNG THỜI φ off-grid → số approximate', () => {
    const r = runAcCircuit({
      problemName: 'rlc-tong-hop-phi-so',
      source: { f: 50, U: 120 },
      R: 40, L: { n: 6, d: 10, overPi: true }, C: { n: 1, d: 9, exp: -3, overPi: true },
      queries: [
        { kind: 'impedance', label: 'a' },
        { kind: 'current', label: 'b' },
        { kind: 'power_factor', label: 'c' },
        { kind: 'power', label: 'd' },
        { kind: 'phase_diff', label: 'e' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r).slice(0, 4)).toEqual(['50', '12/5', '4/5', '1152/5']);
    expect(units(r)).toEqual(['Ω', 'A', '', 'W', 'rad']);
    // Bốn đại lượng đầu exact; φ off-grid trung thực.
    expect(r.answers.slice(0, 4).every((a) => !a.approximate)).toBe(true);
    expect(r.answers[1].approx).toBeCloseTo(2.4, 6);
    expect(r.answers[4].approximate).toBe(true);
    expect(r.answers[4].approx).toBeCloseTo(-0.6435, 3);
    expect(r.answers[4].text.startsWith('−')).toBe(true); // U+2212 minus
    expect(checksPass(r)).toBe(true);
  });

  it('A10 tổng hợp cộng hưởng: ratio 1; Z 100; I 1; P 100; cosφ 1; i = √2cos(100πt)', () => {
    const r = runAcCircuit({
      problemName: 'rlc-tong-hop-cong-huong',
      source: { omega: { n: 100, pi: true }, U0: { n: 100, rad: 2 }, phiU: { n: 0 } },
      R: 100, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true },
      queries: [
        { kind: 'is_resonance', label: 'a' },
        { kind: 'impedance', label: 'b' },
        { kind: 'current', label: 'c' },
        { kind: 'power', label: 'd' },
        { kind: 'power_factor', label: 'e' },
        { kind: 'write_current', label: 'f' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r).slice(0, 5)).toEqual(['1', '100', '1', '100', '1']);
    expect(r.answers[0].verdict).toBe('cong_huong');
    expect(r.answers[5].text).toBe('i = √2cos(100πt) (A)');
    expect(r.answers[5].expr).toEqual({ amp: '√2', omega: '100π', phase: '0' });
    expect(r.answers[5].approx).toBeCloseTo(1.4142, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });
});
