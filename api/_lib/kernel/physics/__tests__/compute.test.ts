// Test Task 2: compute — 12 query công thức đóng + certify + tự kiểm thay-ngược.
// Gồm test plan Task 2 + bổ sung phản biện phiên 1: F3 (time_when_velocity/position_when_velocity),
// F16 (meet inclusive t=t0 kèm dòng trace), F2 (đổi đơn vị tham số query).
import { describe, it, expect } from 'vitest';
import { motionOf, type Motion } from '../kinematics';
import { computePhysicsQuery } from '../compute';

const U = { length: 'm', time: 's' };
const map = (...ops: unknown[]): Map<string, Motion> => {
  const m = new Map<string, Motion>();
  for (const op of ops) { const mo = motionOf(op as never); m.set(mo.name, mo); }
  return m;
};
const fall45 = () => map({ op: 'free_fall', name: 'da', h0: 45, g: 10, x0: 0 });
const nemNgang = () => map({ op: 'projectile', name: 'vat', x0: 0, h0: 80, v0: 20, angleDeg: 0, g: 10 });
const nemXien45 = () => map({ op: 'projectile', name: 'bong', x0: 0, h0: 0, v0: 20, angleDeg: 45, g: 10 });
const nemXien60 = () => map({ op: 'projectile', name: 'bong', x0: 0, h0: 0, v0: 20, angleDeg: 60, g: 10 });

describe('compute — cong thuc dong + exact + tu kiem', () => {
  it('P3a time_to_ground roi tu do 45m: 3 s exact, co check thay-nguoc pass', () => {
    const r = computePhysicsQuery(fall45(), { kind: 'time_to_ground', of: 'da' } as never, U);
    if (r.ok === false) throw new Error(r.problem);
    expect(r.answer.text).toBe('3 s');
    expect(r.answer.approximate).toBe(false);
    expect(r.checks[0].pass).toBe(true);
    expect(Math.abs(r.checks[0].residual)).toBeLessThan(1e-9);
  });
  it('P3b impact_velocity roi tu do: 30 m/s', () => {
    const r = computePhysicsQuery(fall45(), { kind: 'impact_velocity', of: 'da', component: 'speed' } as never, U);
    if (r.ok === false) throw new Error(r.problem);
    expect(r.answer.approx).toBeCloseTo(30, 8);
    expect(r.answer.text).toBe('30 m/s');
  });
  it('P4 nem ngang: t=4 s, range=80 m, impact=20√5 m/s ≈ 44.7214', () => {
    const t = computePhysicsQuery(nemNgang(), { kind: 'time_to_ground', of: 'vat' } as never, U);
    const rg = computePhysicsQuery(nemNgang(), { kind: 'range', of: 'vat' } as never, U);
    const iv = computePhysicsQuery(nemNgang(), { kind: 'impact_velocity', of: 'vat', component: 'speed' } as never, U);
    if (!t.ok || !rg.ok || !iv.ok) throw new Error('fail');
    expect(t.answer.text).toBe('4 s');
    expect(rg.answer.text).toBe('80 m');
    expect(iv.answer.text).toBe('20√5 m/s');
    expect(iv.answer.approx).toBeCloseTo(20 * Math.sqrt(5), 6);
  });
  it('P5 nem xien 45°: t_bay=2√2 s (LOAI nghiem t=0), range=40 m', () => {
    const t = computePhysicsQuery(nemXien45(), { kind: 'time_to_ground', of: 'bong' } as never, U);
    const rg = computePhysicsQuery(nemXien45(), { kind: 'range', of: 'bong' } as never, U);
    if (!t.ok || !rg.ok) throw new Error('fail');
    expect(t.answer.text).toBe('2√2 s');
    expect(t.answer.approx).toBeCloseTo(2 * Math.SQRT2, 8);
    expect(rg.answer.text).toBe('40 m');
  });
  it('P6a max_height 60°: 15 m + check dinh (v_y(τ*)=0) pass', () => {
    const r = computePhysicsQuery(nemXien60(), { kind: 'max_height', of: 'bong' } as never, U);
    if (r.ok === false) throw new Error(r.problem);
    expect(r.answer.text).toBe('15 m');
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });
  it('P6c velocity_at t=1: can LONG nhau → float trung thuc ≈12.3931, approximate:true', () => {
    const r = computePhysicsQuery(nemXien60(), { kind: 'velocity_at', of: 'bong', t: 1, component: 'speed' } as never, U);
    if (r.ok === false) throw new Error(r.problem);
    expect(r.answer.approx).toBeCloseTo(12.3931, 3);
    expect(r.answer.approximate).toBe(true);
  });
  it('P7 meet hai xe: t=3/2 h, x=90 km — check "x gap bang nhau" pass', () => {
    const two = map(
      { op: 'mover1d', name: 'oto', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'khach', x0: 30, v0: 40, a: 0, startAt: 0, axis: 'x' },
    );
    const KM = { length: 'km', time: 'h' };
    const t = computePhysicsQuery(two, { kind: 'meet_time', a: 'oto', b: 'khach' } as never, KM);
    const x = computePhysicsQuery(two, { kind: 'meet_position', a: 'oto', b: 'khach' } as never, KM);
    if (!t.ok || !x.ok) throw new Error('fail');
    expect(t.answer.text).toBe('3/2 h');
    expect(x.answer.text).toBe('90 km');
    expect(t.checks[0].pass).toBe(true);
  });
  it('P8 meet lech gio (startAt=0.5): t=3/2 ≥ 0.5; distance_between_at t=1 = 50 km (xe 2 DA xuat phat)', () => {
    const two = map(
      { op: 'mover1d', name: 'xe1', x0: 0, v0: 40, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'xe2', x0: 120, v0: -60, a: 0, startAt: 0.5, axis: 'x' },
    );
    const KM = { length: 'km', time: 'h' };
    const t = computePhysicsQuery(two, { kind: 'meet_time', a: 'xe1', b: 'xe2' } as never, KM);
    const d = computePhysicsQuery(two, { kind: 'distance_between_at', a: 'xe1', b: 'xe2', t: 1 } as never, KM);
    if (!t.ok || !d.ok) throw new Error('fail');
    expect(t.answer.approx).toBeCloseTo(1.5, 10);
    expect(d.answer.text).toBe('50 km');
  });
  it('distance_between_at TRUOC khi xe 2 xuat phat: xe 2 dau tai x0 (t=0.25 → |10−120|=110)', () => {
    const two = map(
      { op: 'mover1d', name: 'xe1', x0: 0, v0: 40, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'xe2', x0: 120, v0: -60, a: 0, startAt: 0.5, axis: 'x' },
    );
    const d = computePhysicsQuery(two, { kind: 'distance_between_at', a: 'xe1', b: 'xe2', t: 0.25 } as never, { length: 'km', time: 'h' });
    if (d.ok === false) throw new Error(d.problem);
    expect(d.answer.approx).toBeCloseTo(110, 10);
  });
  it('P9 time_when NDD: (1/4)t²=100 → 20 s (loai −20)', () => {
    const m = map({ op: 'mover1d', name: 'vat', x0: 0, v0: 0, a: 0.5, startAt: 0, axis: 'x' });
    const r = computePhysicsQuery(m, { kind: 'time_when', of: 'vat', position: 100 } as never, U);
    if (r.ok === false) throw new Error(r.problem);
    expect(r.answer.text).toBe('20 s');
  });
  it('loi RO RANG: time_to_ground cua mover1d; max_height khi khong nem len; vat chua khai bao', () => {
    const m = map({ op: 'mover1d', name: 'oto', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' });
    const r1 = computePhysicsQuery(m, { kind: 'time_to_ground', of: 'oto' } as never, U);
    expect(r1.ok).toBe(false);
    const r2 = computePhysicsQuery(m, { kind: 'max_height', of: 'oto' } as never, U);
    expect(r2.ok).toBe(false);
    const r3 = computePhysicsQuery(m, { kind: 'position_at', of: 'ma', t: 1 } as never, U);
    expect(r3.ok).toBe(false);
  });

  // ── F3: time_when_velocity / position_when_velocity (hãm phanh, đạt vận tốc cho trước) ──
  it('F3 ham phanh 15 m/s, a=−3: time_when_velocity 0 → 5 s exact; position_when_velocity 0 → 75/2 m', () => {
    const m = map({ op: 'mover1d', name: 'oto', x0: 0, v0: 15, a: -3, startAt: 0, axis: 'x' });
    const t = computePhysicsQuery(m, { kind: 'time_when_velocity', of: 'oto', value: 0 } as never, U);
    const x = computePhysicsQuery(m, { kind: 'position_when_velocity', of: 'oto', value: 0 } as never, U);
    if (!t.ok || !x.ok) throw new Error('fail');
    expect(t.answer.text).toBe('5 s');
    expect(t.answer.approximate).toBe(false);
    expect(t.checks[0].pass).toBe(true);          // thay-ngược v(5)=0
    expect(x.answer.text).toBe('75/2 m');
    expect(x.answer.approx).toBeCloseTo(37.5, 10);
  });
  it('F3 loi ro rang: v hang (a=0) khac value → error; dat v truoc luc xuat phat (sai chieu) → error', () => {
    const deu = map({ op: 'mover1d', name: 'xe', x0: 0, v0: 10, a: 0, startAt: 0, axis: 'x' });
    const r1 = computePhysicsQuery(deu, { kind: 'time_when_velocity', of: 'xe', value: 5 } as never, U);
    expect(r1.ok).toBe(false);
    if (r1.ok === false) expect(r1.problem).toContain('không');
    // v(t) = 10 + 2t, hỏi khi nào v=5 → τ = −5/2 < 0 ⇒ trước lúc xuất phát ⇒ error
    const tang = map({ op: 'mover1d', name: 'xe', x0: 0, v0: 10, a: 2, startAt: 0, axis: 'x' });
    const r2 = computePhysicsQuery(tang, { kind: 'time_when_velocity', of: 'xe', value: 5 } as never, U);
    expect(r2.ok).toBe(false);
  });
  // ── F16: meet inclusive t=t0 — hai mover cùng xuất phát cùng vị trí ──
  it('F16 hai xe cung xuat phat cung vi tri: meet_time = 0 (inclusive) + dong trace giai thich', () => {
    const two = map(
      { op: 'mover1d', name: 'a', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'b', x0: 0, v0: 40, a: 0, startAt: 0, axis: 'x' },
    );
    const t = computePhysicsQuery(two, { kind: 'meet_time', a: 'a', b: 'b' } as never, { length: 'km', time: 'h' });
    if (t.ok === false) throw new Error(t.problem);
    expect(t.answer.approx).toBe(0);
    expect(t.checks.every((c) => c.pass)).toBe(true);
    expect(t.checks.some((c) => c.kind === 'info' && /xuất phát/.test(c.detail))).toBe(true);
  });
  // ── F2: đổi đơn vị THAM SỐ QUERY (tUnit/xUnit/vUnit) ──
  it('F2 query tUnit: position_at t=30 min tren he km/h → x(1/2 h) = 30 km exact', () => {
    const m = map({ op: 'mover1d', name: 'xe', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' });
    const KM = { length: 'km', time: 'h' };
    const r = computePhysicsQuery(m, { kind: 'position_at', of: 'xe', t: 30, tUnit: 'min' } as never, KM);
    if (r.ok === false) throw new Error(r.problem);
    expect(r.answer.text).toBe('30 km');
    expect(r.answer.approximate).toBe(false);
    const v = computePhysicsQuery(m, { kind: 'time_when_velocity', of: 'xe', value: 60, vUnit: 'km/h' } as never, KM);
    if (v.ok === false) throw new Error(v.problem);   // v hằng = value ⇒ đạt ngay từ t0
    expect(v.answer.approx).toBe(0);
  });
});
