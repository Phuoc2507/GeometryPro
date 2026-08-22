// Unit tầng GIẢI dao động (oscillation.ts) + schema (oscillationSchema.ts): guard OS-2/OS-5, so exact
// struct OS-3 (hữu tỉ vs mốc vô tỉ ⇒ mismatch → float trung thực), resolve nhiều nguồn + auto-assert,
// chuẩn hóa pha (−π,π], form sin→cos, từng query + tự kiểm. Chạy hàm THUẦN trực tiếp (không qua run).
import { describe, it, expect } from 'vitest';
import { OscillatorOp, OscillationPlanSchema } from '../oscillationSchema';
import { resolveModel, computeOscQuery, type Solved, type BaseLen } from '../oscillation';
import { approxP } from '../piScalar';

const okOp = (op: unknown): boolean => OscillatorOp.safeParse(op).success;
const opErr = (op: unknown): string => { const r = OscillatorOp.safeParse(op); return r.success ? '' : r.error.issues[0].message; };
function solveOp(op: Record<string, unknown>, base: BaseLen = 'cm'): Solved { return resolveModel(OscillatorOp.parse(op) as never, base); }
function q(solved: Solved, query: Record<string, unknown>, base: BaseLen = 'cm') { return computeOscQuery(solved, query as never, base); }

describe('schema OscillatorOp — guard OS-2 (nguồn rate > 0 sau quy đổi)', () => {
  it('T = 0 bị từ chối (divExact mẫu 0 xuyên pipeline)', () => {
    expect(okOp({ op: 'oscillator', name: 'v', A: 4, T: 0 })).toBe(false);
    expect(opErr({ op: 'oscillator', name: 'v', A: 4, T: 0 })).toMatch(/chu kỳ.*dương/);
  });
  it('f = 0 và ω âm bị từ chối (ω âm cho T/f/vmax âm mà hệ thức bình phương vẫn pass)', () => {
    expect(okOp({ op: 'oscillator', name: 'v', A: 4, f: { n: 0 } })).toBe(false);
    expect(okOp({ op: 'oscillator', name: 'v', A: 4, omega: { n: -10, pi: true } })).toBe(false);
    expect(opErr({ op: 'oscillator', name: 'v', A: 4, omega: { n: -10, pi: true } })).toMatch(/tần số góc.*dương/);
  });
  it('count.dt ≤ 0 bị từ chối; ω/T/f dương thì qua', () => {
    expect(okOp({ op: 'oscillator', name: 'v', A: 4, count: { n: 5, dt: 0 } })).toBe(false);
    expect(okOp({ op: 'oscillator', name: 'v', A: 4, omega: { n: 10, pi: true } })).toBe(true);
  });
});

describe('schema OscillatorOp — guard OS-5 (A > 0) + pendulum XOR', () => {
  it('initial x0=0 & v0=0 ⇒ từ chối sớm (A = 0)', () => {
    expect(okOp({ op: 'oscillator', name: 'v', omega: 10, initial: { x0: 0, v0: 0 } })).toBe(false);
    expect(opErr({ op: 'oscillator', name: 'v', omega: 10, initial: { x0: 0, v0: 0 } })).toMatch(/không dao động/);
  });
  it('A ≤ 0 bị chặn bởi zod positive()', () => {
    expect(okOp({ op: 'oscillator', name: 'v', A: 0, omega: 10 })).toBe(false);
    expect(okOp({ op: 'oscillator', name: 'v', A: -4, omega: 10 })).toBe(false);
  });
  it('pendulum: g XOR gAsPiSquared (cả hai / không cái nào ⇒ lỗi)', () => {
    expect(okOp({ op: 'oscillator', name: 'v', pendulum: { l: 1, g: 9.8, gAsPiSquared: true } })).toBe(false);
    expect(okOp({ op: 'oscillator', name: 'v', pendulum: { l: 1 } })).toBe(false);
    expect(okOp({ op: 'oscillator', name: 'v', pendulum: { l: 1, gAsPiSquared: true } })).toBe(true);
    expect(okOp({ op: 'oscillator', name: 'v', pendulum: { l: 1, g: 9.8 } })).toBe(true);
  });
});

describe('schema plan — trùng tên op + of trỏ vật không tồn tại', () => {
  it('hai op trùng tên ⇒ lỗi', () => {
    const r = OscillationPlanSchema.safeParse({ units: { length: 'cm', time: 's' },
      ops: [{ op: 'oscillator', name: 'v', A: 4, omega: 10 }, { op: 'oscillator', name: 'v', A: 5, omega: 10 }],
      queries: [{ kind: 'amplitude', of: 'v' }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/khai báo 2 lần/);
  });
  it('query of trỏ vật lạ ⇒ lỗi', () => {
    const r = OscillationPlanSchema.safeParse({ units: { length: 'cm', time: 's' },
      ops: [{ op: 'oscillator', name: 'v', A: 4, omega: 10 }], queries: [{ kind: 'amplitude', of: 'xyz' }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/không tồn tại/);
  });
});

describe('resolveModel — nguồn ưu tiên + auto-assert dữ kiện dư (§5.2)', () => {
  it('ω ưu tiên hơn T/f; nguồn dư KHỚP ⇒ check pass, không violation', () => {
    // ω = 4π, T = 1/2 (= 2π/4π = 0,5), khớp ⇒ pass
    const s = solveOp({ op: 'oscillator', name: 'v', A: 5, omega: { n: 4, pi: true }, T: { n: 1, d: 2 } });
    expect(s.violations).toEqual([]);
    expect(s.checks.some((c) => c.kind === 'rate_redundant' && c.pass)).toBe(true);
    expect(approxP(s.model.omega!)).toBeCloseTo(4 * Math.PI, 6);
  });
  it('nguồn rate dư LỆCH ⇒ violation nguon-du-lech (dịch sai đề)', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', A: 5, omega: 10, T: 1 }); // ω=10 nhưng T=1 ⇒ ω phải 2π
    expect(s.violations.some((v) => v.id === 'nguon-du-lech')).toBe(true);
  });
  it('A ưu tiên hơn L/2; L=12 ⇒ A=6 khi A vắng', () => {
    expect(solveOp({ op: 'oscillator', name: 'v', L: 12, omega: 10 }).model.A!.approx).toBeCloseTo(6, 9);
    expect(solveOp({ op: 'oscillator', name: 'v', A: 4, L: 8, omega: 10 }).model.A!.approx).toBeCloseTo(4, 9); // A thắng
  });
  it('fromState: A = √(x²+(v/ω)²) exact (cặp 3,4,5 với ω=10)', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', omega: 10, fromState: { x: 3, v: 40 } });
    expect(s.model.A!.approx).toBeCloseTo(5, 9);
    expect(s.model.A!.exact).not.toBeNull(); // exact vì ω bậc 0
  });
});

describe('resolveModel — pha: form sin→cos, chuẩn hóa (−π,π], initial suy φ (OS-3)', () => {
  it('form sin ⇒ φ := φₛ − π/2', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', A: 5, omega: 10, phi: { n: 0 }, form: 'sin' });
    expect(approxP(s.model.phi!)).toBeCloseTo(-Math.PI / 2, 9);
  });
  it('chuẩn hóa pha ngoài (−π,π] về đại diện chính (7π/6 → −5π/6)', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', A: 5, omega: 10, phi: { n: 7, d: 6, pi: true } });
    expect(approxP(s.model.phi!)).toBeCloseTo(-5 * Math.PI / 6, 9);
  });
  it('initial "kéo ra x0>0 thả nhẹ" (v0=0) ⇒ φ = 0 exact (lưới)', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', omega: 10, initial: { x0: 4, v0: 0 } });
    expect(approxP(s.model.phi!)).toBeCloseTo(0, 9);
    expect(s.model.phi!.s.exact).not.toBeNull();
  });
  it('initial "truyền v0>0 tại VTCB" (x0=0) ⇒ φ = −π/2 exact (lưới)', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', omega: 10, initial: { x0: 0, v0: 40 } });
    expect(approxP(s.model.phi!)).toBeCloseTo(-Math.PI / 2, 9);
  });
});

describe('computeOscQuery — từng query + đường exact / float trung thực (OS-3)', () => {
  const base = solveOp({ op: 'oscillator', name: 'v', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } });

  it('x_at trên lưới ⇒ exact + check |x|≤A và hệ thức độc lập', () => {
    const r = q(base, { kind: 'x_at', of: 'v', t: { n: 1, d: 30 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.text).toBe('-2'); expect(r.answer.approximate).toBe(false);
      expect(r.checks.some((c) => c.kind === 'indep_relation' && c.pass)).toBe(true);
      expect(r.checks.some((c) => c.kind === 'x_bound' && c.pass)).toBe(true);
    }
  });
  it('OS-3: pha bậc-0 + φ bậc-1 (ω=2) off-grid ⇒ addP collapse ⇒ float approximate:true', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', A: 5, omega: 2, phi: { n: 1, d: 6, pi: true } });
    const r = q(s, { kind: 'x_at', of: 'v', t: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.approximate).toBe(true); expect(r.answer.approx).toBeCloseTo(-4.0752, 3); }
  });
  it('v_at đại số căn·π exact (-20π√3) + check |v|≤vmax', () => {
    const r = q(base, { kind: 'v_at', of: 'v', t: { n: 1, d: 30 } });
    if (r.ok) { expect(r.answer.text).toBe('-20π√3'); expect(r.answer.approximate).toBe(false); expect(r.checks.some((c) => c.kind === 'v_bound' && c.pass)).toBe(true); }
  });
  it('a_at đơn vị override m/s² đổi ×1/100 exact (2π²)', () => {
    const r = q(base, { kind: 'a_at', of: 'v', t: { n: 1, d: 30 }, unit: 'm/s2' });
    if (r.ok) { expect(r.answer.text).toBe('2π²'); expect(r.answer.unit).toBe('m/s2'); expect(r.answer.approximate).toBe(false); }
  });
  it('speed_at_x |x|>A ⇒ ok:false li độ ngoài biên (KHÔNG bịa đáp)', () => {
    const r = q(base, { kind: 'speed_at_x', of: 'v', x: 5 });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.problem).toMatch(/ngoài biên/);
  });
  it('x_at_speed v=0 hợp lệ ⇒ |x| = A (biên) — OS-6', () => {
    const r = q(base, { kind: 'x_at_speed', of: 'v', v: 0 });
    if (r.ok) expect(r.answer.text).toBe('4');
  });
  it('x_at_speed v>vmax ⇒ ok:false vượt tốc độ cực đại', () => {
    const r = q(base, { kind: 'x_at_speed', of: 'v', v: 999 });
    expect(r.ok).toBe(false);
  });
  it('query cần ω/A/φ mà model thiếu ⇒ ok:false với message rõ (không bịa)', () => {
    const noPhi = solveOp({ op: 'oscillator', name: 'v', A: 4, omega: 10 }); // thiếu φ
    const r = q(noPhi, { kind: 'x_at', of: 'v', t: 0.1 });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.problem).toMatch(/pha ban đầu/);
    const noA = solveOp({ op: 'oscillator', name: 'v', omega: 10, phi: { n: 0 } }); // thiếu A
    const r2 = q(noA, { kind: 'vmax', of: 'v' });
    expect(r2.ok).toBe(false);
  });
});

describe('computeOscQuery — năng lượng: bảo toàn exact + first_time tự kiểm', () => {
  it('energy qua k: Wđ + Wt = W exact (bảo toàn) + Wđ = W − Wt', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', spring: { k: 100 }, A: 4 });
    const wt = q(s, { kind: 'energy_potential_at', of: 'v', at: { x: 2 } });
    const wd = q(s, { kind: 'energy_kinetic_at', of: 'v', at: { x: 2 } });
    if (wt.ok && wd.ok) {
      expect(wt.answer.text).toBe('1/50'); expect(wd.answer.text).toBe('3/50');
      expect(wd.checks.some((c) => c.kind === 'energy_conserve' && c.pass)).toBe(true);
    }
  });
  it('first_time đường lưới ⇒ check mode=lưới + thay-ngược + minimality pass', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } });
    const r = q(s, { kind: 'first_time_at_x', of: 'v', x: -2, direction: 'positive' });
    if (r.ok) {
      expect(r.answer.text).toBe('1/10');
      expect(r.checks.some((c) => c.detail.includes('đường lưới'))).toBe(true);
      expect(r.checks.some((c) => c.kind === 'first_time_x' && c.pass)).toBe(true);
      expect(r.checks.some((c) => c.kind === 'first_time_minimal' && c.pass)).toBe(true);
      expect(r.checks.some((c) => c.kind === 'first_time_dir' && c.pass)).toBe(true);
    }
  });
  it('first_time x ngoài [−A,A] ⇒ ok:false', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', A: 4, omega: { n: 10, pi: true }, phi: { n: 0 } });
    expect(q(s, { kind: 'first_time_at_x', of: 'v', x: 9, direction: 'any' }).ok).toBe(false);
  });
  it('first_time biên (|x|=A) + direction ≠ any ⇒ ok:false (không có chiều qua)', () => {
    const s = solveOp({ op: 'oscillator', name: 'v', A: 4, omega: { n: 10, pi: true }, phi: { n: 0 } });
    expect(q(s, { kind: 'first_time_at_x', of: 'v', x: 4, direction: 'positive' }).ok).toBe(false);
  });
});
