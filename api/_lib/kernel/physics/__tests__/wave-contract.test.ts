// Contract SÓNG CƠ & SÓNG ÂM — 10 bài vàng spec §12 (W1–W10). KHOÁ CỨNG text engine (exact-first)
// + cờ approximate + đơn vị. Đáp đã kiểm tay + đối chiếu float (đếm-hai-cách giao thoa, cos 5π/3→u=2,
// log10 lũy thừa 10 exact, nhánh dB SỐ trung thực). Hàng rào chống "đáp-sai-âm-thầm":
//   - W7 displacement = "2" cm (pha 5π/3 rút mod 2 ⇒ lưới 16 điểm ⇒ cos exact 1/2);
//   - W8b sound_level = "73.0103" dB (2·10⁷ KHÔNG lũy thừa 10 ⇒ nhánh SỐ, approximate:true);
//   - W3/W4 giao thoa = 9/10 (đếm nghiệm nguyên bigint, loại 2 mút nguồn).
import { describe, it, expect } from 'vitest';
import { runWaves } from '../runWaves';

const CM = { length: 'cm' as const, time: 's' as const };
const M = { length: 'm' as const, time: 's' as const };
type Expect = { kind: string; text: string; unit: string; approximate?: boolean; approx?: number };

function expectAnswers(raw: unknown, exp: Expect[]): void {
  const r = runWaves(raw);
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

describe('contract SÓNG W1–W10 (spec §12)', () => {
  it('W1 — đại lượng: v = λf = 200 cm/s; T = 1/f = 1/10 s', () => {
    expectAnswers(
      { problemName: 'song-dai-luong-1', units: CM, ops: [{ op: 'wave', name: 's', f: 10, lambda: 20 }],
        queries: [{ kind: 'speed', of: 's', label: 'a' }, { kind: 'period', of: 's', label: 'b' }] },
      [{ kind: 'speed', text: '200', unit: 'cm/s' }, { kind: 'period', text: '1/10', unit: 's', approx: 0.1 }]);
  });

  it('W2 — đại lượng: f = 1/T = 500 Hz; λ = v/f = 17/25 m', () => {
    expectAnswers(
      { problemName: 'song-dai-luong-2', units: M, ops: [{ op: 'wave', name: 's', speed: 340, speedUnit: 'm/s', T: 0.002 }],
        queries: [{ kind: 'frequency', of: 's', label: 'a' }, { kind: 'wavelength', of: 's', label: 'b' }] },
      [{ kind: 'frequency', text: '500', unit: 'Hz' }, { kind: 'wavelength', text: '17/25', unit: 'm', approx: 0.68 }]);
  });

  it('W3 — giao thoa cực đại (a = 5 nguyên, loại 2 mút) ⇒ 9', () => {
    expectAnswers(
      { problemName: 'giao-thoa-cuc-dai', units: CM, ops: [{ op: 'wave', name: 's', f: 10, speed: 40 }],
        queries: [{ kind: 'interference_count', of: 's', separation: 20, kind2: 'max' }] },
      [{ kind: 'interference_count', text: '9', unit: '' }]);
  });

  it('W4 — giao thoa cực tiểu (a = 16/3) ⇒ 10', () => {
    expectAnswers(
      { problemName: 'giao-thoa-cuc-tieu', units: CM, ops: [{ op: 'wave', name: 's', lambda: 3 }],
        queries: [{ kind: 'interference_count', of: 's', separation: 16, kind2: 'min' }] },
      [{ kind: 'interference_count', text: '10', unit: '' }]);
  });

  it('W5 — độ lệch pha Δφ = 2πd/λ = 2π/3 rad (PiScalar exact)', () => {
    expectAnswers(
      { problemName: 'do-lech-pha', units: CM, ops: [{ op: 'wave', name: 's', lambda: 24 }],
        queries: [{ kind: 'phase_difference', of: 's', d: 8 }] },
      [{ kind: 'phase_difference', text: '2π/3', unit: 'rad', approx: 2.0944 }]);
  });

  it('W6 — sóng dừng hai đầu cố định: 5 bụng, 6 nút', () => {
    expectAnswers(
      { problemName: 'song-dung-bung-nut', units: CM, ops: [{ op: 'wave', name: 's', lambda: 24 }],
        queries: [{ kind: 'standing_antinodes', of: 's', length: 60, boundary: 'two-fixed', label: 'bung' },
                  { kind: 'standing_nodes', of: 's', length: 60, boundary: 'two-fixed', label: 'nut' }] },
      [{ kind: 'standing_antinodes', text: '5', unit: '' }, { kind: 'standing_nodes', text: '6', unit: '' }]);
  });

  it('W7 — phương trình sóng: λ = 24 cm; v = 240 cm/s; li độ = 2 cm (cos 5π/3)', () => {
    expectAnswers(
      { problemName: 'phuong-trinh-song', units: CM,
        ops: [{ op: 'wave', name: 's', A: 4, omega: { n: 20, pi: true }, spaceCoeff: { n: 1, d: 12, pi: true }, direction: '+x', phi: { n: 0 } }],
        queries: [{ kind: 'wavelength', of: 's', label: 'a' }, { kind: 'speed', of: 's', label: 'b' },
                  { kind: 'displacement_at', of: 's', x: 4, t: 0.1, label: 'c' }] },
      [{ kind: 'wavelength', text: '24', unit: 'cm' }, { kind: 'speed', text: '240', unit: 'cm/s' },
       { kind: 'displacement_at', text: '2', unit: 'cm', approx: 2 }]);
  });

  it('W8 — mức cường độ âm: 70 dB (exact 10⁷) và 73.0103 dB (số, 2·10⁷)', () => {
    expectAnswers(
      { problemName: 'muc-cuong-do-am', units: M,
        ops: [{ op: 'sound_source', name: 'a', intensity: { I: { n: 1, exp: -5 } } },
              { op: 'sound_source', name: 'b', intensity: { I: { n: 2, exp: -5 } } }],
        queries: [{ kind: 'sound_level', of: 'a', label: 'a' }, { kind: 'sound_level', of: 'b', label: 'b' }] },
      [{ kind: 'sound_level', text: '70', unit: 'dB' },
       { kind: 'sound_level', text: '73.0103', unit: 'dB', approximate: true, approx: 73.0103 }]);
  });

  it('W9 — sóng dừng tổng hợp: λ = 3/5 m; 5 nút; f = 100/3 Hz', () => {
    expectAnswers(
      { problemName: 'song-dung-tong-hop', units: M, ops: [{ op: 'wave', name: 's', speed: 20, speedUnit: 'm/s' }],
        queries: [{ kind: 'standing_wavelength', of: 's', length: 1.2, loops: 4, boundary: 'two-fixed', label: 'a' },
                  { kind: 'standing_nodes', of: 's', length: 1.2, loops: 4, boundary: 'two-fixed', label: 'b' },
                  { kind: 'standing_frequency', of: 's', length: 1.2, loops: 4, boundary: 'two-fixed', label: 'c' }] },
      [{ kind: 'standing_wavelength', text: '3/5', unit: 'm', approx: 0.6 }, { kind: 'standing_nodes', text: '5', unit: '' },
       { kind: 'standing_frequency', text: '100/3', unit: 'Hz', approx: 33.3333 }]);
  });

  it('W10 — nguồn âm điểm: I = 1/10000 W/m²; 60 dB (NĐBP, lũy thừa 10); λ = 2/5 m', () => {
    expectAnswers(
      { problemName: 'nguon-am-diem-tong-hop', units: M,
        ops: [{ op: 'sound_source', name: 'ng', level: { L: 80, atDistance: 1 } },
              { op: 'wave', name: 's', f: 850, speed: 340, speedUnit: 'm/s' }],
        queries: [{ kind: 'sound_intensity', of: 'ng', atDistance: 1, label: 'a' },
                  { kind: 'sound_level', of: 'ng', atDistance: 10, label: 'b' },
                  { kind: 'wavelength', of: 's', label: 'c' }] },
      [{ kind: 'sound_intensity', text: '1/10000', unit: 'W/m²', approx: 0.0001 },
       { kind: 'sound_level', text: '60', unit: 'dB' }, { kind: 'wavelength', text: '2/5', unit: 'm', approx: 0.4 }]);
  });
});
