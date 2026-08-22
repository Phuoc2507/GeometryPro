// Entry runWaves — hình dạng Result {ok, answers, checks, violations, errors, geometry, charts, meta},
// meta, queryIndex, propagate checks, OS-2 (KHÔNG bao giờ throw), KHÔNG bịa đáp khi violation/error;
// + phủ UNIT các nhánh ngoài 10 bài contract (spec §12 cuối): interference_point, standing_min_frequency,
// one-free, sound_level_difference, distance_for_level, power (I=P/4πr² PiScalar k=−1), displacement off-grid,
// nguồn dư auto-assert, query trỏ op sai loại.
import { describe, it, expect } from 'vitest';
import { runWaves, type WaveResult } from '../runWaves';

const CM = { length: 'cm' as const, time: 's' as const };
const M = { length: 'm' as const, time: 's' as const };

const W1 = { units: CM, ops: [{ op: 'wave', name: 's', f: 10, lambda: 20 }],
  queries: [{ kind: 'speed', of: 's', label: 'a' }, { kind: 'period', of: 's', label: 'b' }] };

describe('runWaves — hình dạng & meta', () => {
  it('parse lỗi ⇒ ok:false + errors, KHÔNG ném, answers rỗng, geometry null', () => {
    const r = runWaves({ problemName: '', ops: [], queries: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/Invalid wave plan/);
    expect(r.answers).toEqual([]);
    expect(r.geometry).toBeNull();
  });

  it('contract đủ khóa {ok, answers, checks, violations, errors, geometry, charts, meta}', () => {
    const r = runWaves(W1);
    expect(Object.keys(r).sort()).toEqual(['answers', 'charts', 'checks', 'errors', 'geometry', 'meta', 'ok', 'violations']);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.checks)).toBe(true);
    expect(r.checks.length).toBeGreaterThan(0); // self-check ghi vào checks[]
  });

  it('meta: unitsNote / length / models / tPhys', () => {
    const r = runWaves(W1);
    expect(r.meta.unitsNote).toBe('per-quantity');
    expect(r.meta.length).toBe('cm');
    expect(r.meta.models.map((m) => m.name)).toContain('s');
    expect(r.meta.tPhys).toBeGreaterThan(0);
  });

  it('queryIndex gắn đúng thứ tự plan', () => {
    const r = runWaves(W1);
    expect(r.answers.map((a) => a.queryIndex)).toEqual([0, 1]);
  });

  it('đơn vị đầu ra do engine ghi', () => {
    const r = runWaves(W1);
    expect(r.answers.map((a) => a.unit)).toEqual(['cm/s', 's']);
  });
});

describe('runWaves — OS-2 KHÔNG bao giờ throw', () => {
  it('input rác ⇒ ok:false, KHÔNG ném', () => {
    for (const bad of [null, undefined, 42, 'x', {}, { ops: 'no' }, { units: { length: 'inch' } }]) {
      expect(() => runWaves(bad)).not.toThrow();
      expect(runWaves(bad).ok).toBe(false);
    }
  });

  it('nhiều op dispatch đúng theo of', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 'a', f: 10, lambda: 4 }, { op: 'wave', name: 'b', f: 20, lambda: 5 }],
      queries: [{ kind: 'speed', of: 'a' }, { kind: 'speed', of: 'b' }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(40, 6); // 4·10
    expect(r.answers[1].approx).toBeCloseTo(100, 6); // 5·20
  });

  it('query trỏ op không tồn tại ⇒ error, KHÔNG ném', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', f: 10, lambda: 4 }], queries: [{ kind: 'speed', of: 'zzz' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('query trỏ op SAI LOẠI (sound_level trên wave) ⇒ error rõ', () => {
    const r = runWaves({ units: M, ops: [{ op: 'wave', name: 's', f: 10, lambda: 4 }], queries: [{ kind: 'sound_level', of: 's' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /sai loại|loại op|sound/i.test(e.message))).toBe(true);
  });
});

describe('runWaves — nguồn dư auto-assert (§6.2)', () => {
  it('f, λ, v KHỚP (v = λf) ⇒ ok:true, không violation', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', f: 10, lambda: 4, speed: 40 }], queries: [{ kind: 'speed', of: 's' }] });
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('f, λ, v LỆCH (v ≠ λf) ⇒ violation nguon-du-lech, KHÔNG bịa đáp', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', f: 10, lambda: 4, speed: 999 }], queries: [{ kind: 'speed', of: 's' }] });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'nguon-du-lech')).toBe(true);
    expect(r.answers).toEqual([]);
  });
});

describe('runWaves — giao thoa (đếm-hai-cách) + interference_point', () => {
  it('đếm cực đại ghi checks cách1/cách2 khớp', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', f: 10, speed: 40 }],
      queries: [{ kind: 'interference_count', of: 's', separation: 20, kind2: 'max' }] });
    expect(r.ok).toBe(true);
    expect(r.checks.some((c) => /cách1.*cách2|cach1.*cach2|giao thoa/i.test(c.detail))).toBe(true);
  });
  it('interference_point: δ = 2λ ⇒ cực đại bậc 2', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', lambda: 4 }],
      queries: [{ kind: 'interference_point', of: 's', d1: 0, d2: 8 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toMatch(/cực đại/);
    expect(r.answers[0].approx).toBeCloseTo(2, 6);
  });
  it('interference_point: δ = 1.5λ ⇒ cực tiểu', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', lambda: 4 }],
      queries: [{ kind: 'interference_point', of: 's', d1: 0, d2: 6 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toMatch(/cực tiểu/);
  });
  it('interference_point: δ = 1.25λ ⇒ không phải vân', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', lambda: 4 }],
      queries: [{ kind: 'interference_point', of: 's', d1: 0, d2: 5 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toMatch(/không phải vân/);
  });
});

describe('runWaves — sóng dừng one-free + min_frequency', () => {
  it('one-free: 4l/λ lẻ ⇒ bụng = nút = k', () => {
    // λ = 24, l = 18 ⇒ 4l/λ = 3 (lẻ) ⇒ k = (3+1)/2 = 2 bụng, 2 nút
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', lambda: 24 }],
      queries: [{ kind: 'standing_antinodes', of: 's', length: 18, boundary: 'one-free' },
                { kind: 'standing_nodes', of: 's', length: 18, boundary: 'one-free' }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('2');
    expect(r.answers[1].text).toBe('2');
  });
  it('two-fixed 2l/λ không nguyên ⇒ violation (không có sóng dừng ổn định)', () => {
    const r = runWaves({ units: CM, ops: [{ op: 'wave', name: 's', lambda: 7 }],
      queries: [{ kind: 'standing_antinodes', of: 's', length: 10, boundary: 'two-fixed' }] });
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });
  it('standing_min_frequency two-fixed: f₁ = v/(2l)', () => {
    // v = 20 m/s, l = 1 m ⇒ f₁ = 20/2 = 10 Hz
    const r = runWaves({ units: M, ops: [{ op: 'wave', name: 's', speed: 20, speedUnit: 'm/s' }],
      queries: [{ kind: 'standing_min_frequency', of: 's', length: 1, boundary: 'two-fixed' }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('10');
    expect(r.answers[0].unit).toBe('Hz');
  });
  it('standing_min_frequency one-free: f₁ = v/(4l)', () => {
    // v = 20, l = 1 ⇒ f₁ = 20/4 = 5 Hz
    const r = runWaves({ units: M, ops: [{ op: 'wave', name: 's', speed: 20, speedUnit: 'm/s' }],
      queries: [{ kind: 'standing_min_frequency', of: 's', length: 1, boundary: 'one-free' }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('5');
  });
});

describe('runWaves — sóng âm: khoảng cách & chênh mức', () => {
  it('sound_level_difference (nguồn điểm): r 1→10 m ⇒ ΔL = −20 dB (exact)', () => {
    const r = runWaves({ units: M, ops: [{ op: 'sound_source', name: 'ng', level: { L: 80, atDistance: 1 } }],
      queries: [{ kind: 'sound_level_difference', of: 'ng', fromDistance: 1, toDistance: 10 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('-20');
    expect(r.answers[0].unit).toBe('dB');
    expect(r.answers[0].approximate).toBe(false);
  });
  it('distance_for_level: L 80→60 dB nguồn điểm ⇒ r = 10 m (exact)', () => {
    const r = runWaves({ units: M, ops: [{ op: 'sound_source', name: 'ng', level: { L: 80, atDistance: 1 } }],
      queries: [{ kind: 'distance_for_level', of: 'ng', level: 60 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('10');
    expect(r.answers[0].unit).toBe('m');
  });
  it('intensity_from_level lẻ 5: L = 65 dB ⇒ I = 10⁻⁶·√10 (radicand 10, exact)', () => {
    const r = runWaves({ units: M, ops: [{ op: 'sound_source', name: 'x', level: { L: 65 } }],
      queries: [{ kind: 'sound_intensity', of: 'x' }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approximate).toBe(false);
    expect(r.answers[0].approx / (1e-12 * Math.pow(10, 6.5))).toBeCloseTo(1, 9);
  });
  it('sound_level lũy thừa √10: ratio 10⁶·√10 ⇒ 65 dB exact', () => {
    const r = runWaves({ units: M, ops: [{ op: 'sound_source', name: 'x', intensity: { I: { n: 1, exp: -12 } } },
        { op: 'sound_source', name: 'y', level: { L: 65 } }],
      queries: [{ kind: 'sound_level', of: 'y' }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('65');
    expect(r.answers[0].approximate).toBe(false);
  });
});

describe('runWaves — nguồn công suất (power) & displacement off-grid', () => {
  it('power: I = P/(4πr²) — nguồn điểm (PiScalar k=−1)', () => {
    // P = 100 W, r = 1 m ⇒ I = 100/(4π) = 25/π ≈ 7.9577 W/m²
    const r = runWaves({ units: M, ops: [{ op: 'sound_source', name: 'ng', power: 100 }],
      queries: [{ kind: 'sound_intensity', of: 'ng', atDistance: 1 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(100 / (4 * Math.PI), 6);
  });
  it('displacement off-grid (pha 2π/7 — vô tỉ bậc 3, recognize không vớt) ⇒ approximate:true, KHÔNG ném', () => {
    // ω = 2π, spaceCoeff = 2π/7 ⇒ λ = 7; pha(x=1,t=0) = −2π/7 (q=7 ngoài lưới; cos(2π/7) vô tỉ bậc 3) ⇒ số
    const r = runWaves({ units: M, ops: [{ op: 'wave', name: 's', A: 3, omega: { n: 2, pi: true }, spaceCoeff: { n: 2, d: 7, pi: true } }],
      queries: [{ kind: 'displacement_at', of: 's', x: 1, t: 0 }] });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approximate).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(3 * Math.cos(-2 * Math.PI / 7), 4);
  });
});
