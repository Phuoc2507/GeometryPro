// Test Task 1: planSchema + kinematics (nền Quad/Motion exact-first).
// Gồm test của plan Task 1 + bổ sung theo phản biện phiên 1: F2 (unit per-quantity,
// engine đổi hữu tỉ EXACT) và F11 (EXACT_TRIG góc âm; cos ±90 = 0 EXACT).
import { describe, it, expect } from 'vitest';
import { PhysicsPlanSchema } from '../planSchema';
import {
  scalarFromNumber, trigOf, motionOf, evalQuadS, evalQuadN, derivQuad, expandAbs, subQuad,
  rootsFor, mainAxis, qtyLength, qtyTime, qtyVelocity,
} from '../kinematics';
import { rat } from '../../scalar';

describe('planSchema', () => {
  it('nhan plan hop le, dien default (a=0, startAt=0, units m/s)', () => {
    const p = PhysicsPlanSchema.parse({
      problemName: 'x',
      ops: [{ op: 'mover1d', name: 'A', x0: 0, v0: 60 }],
      queries: [{ kind: 'position_at', of: 'A', t: 1.5 }],
    });
    expect(p.ops[0]).toMatchObject({ a: 0, startAt: 0, axis: 'x' });
    expect(p.units).toEqual({ length: 'm', time: 's' });
  });
  it('TU CHOI projectile/free_fall thieu g (khong hard-code g trong engine)', () => {
    expect(PhysicsPlanSchema.safeParse({
      problemName: 'x', ops: [{ op: 'free_fall', name: 'A', h0: 45 }],
      queries: [{ kind: 'time_to_ground', of: 'A' }],
    }).success).toBe(false);
  });
  it('F2: nhan v0Unit/xUnit/tUnit hop le; TU CHOI unit ngoai bang (mph)', () => {
    const p = PhysicsPlanSchema.parse({
      problemName: 'x',
      ops: [{ op: 'mover1d', name: 'A', x0: 2, xUnit: 'km', v0: 54, v0Unit: 'km/h', startAt: 30, tUnit: 'min' }],
      queries: [{ kind: 'time_when_velocity', of: 'A', value: 0 }],
    });
    expect(p.ops[0]).toMatchObject({ v0Unit: 'km/h', xUnit: 'km', tUnit: 'min' });
    expect(PhysicsPlanSchema.safeParse({
      problemName: 'x',
      ops: [{ op: 'mover1d', name: 'A', x0: 0, v0: 54, v0Unit: 'mph' }],
      queries: [{ kind: 'position_at', of: 'A', t: 1 }],
    }).success).toBe(false);
  });
});

describe('kinematics — exact-first', () => {
  it('scalarFromNumber: 9.8 → 49/5 exact; 0.5 → 1/2', () => {
    const g = scalarFromNumber(9.8);
    expect(g.exact).toEqual({ num: 49n, den: 5n, radicand: 1 });
    expect(scalarFromNumber(0.5).exact).toEqual({ num: 1n, den: 2n, radicand: 1 });
  });
  it('trigOf goc dep EXACT: sin60=(1/2)√3, cos45=(1/2)√2; goc la → float', () => {
    expect(trigOf(60).sin.exact).toEqual({ num: 1n, den: 2n, radicand: 3 });
    expect(trigOf(45).cos.exact).toEqual({ num: 1n, den: 2n, radicand: 2 });
    const t37 = trigOf(37);
    expect(t37.cos.exact).toBeNull();
    expect(t37.cos.approx).toBeCloseTo(Math.cos((37 * Math.PI) / 180), 12);
  });
  it('F11: goc am — sin LE, cos CHAN, exact: sin(−30)=−1/2, cos(−60)=1/2, sin(−90)=−1', () => {
    expect(trigOf(-30).sin.exact).toEqual({ num: -1n, den: 2n, radicand: 1 });
    expect(trigOf(-30).cos.exact).toEqual({ num: 1n, den: 2n, radicand: 3 });
    expect(trigOf(-60).cos.exact).toEqual({ num: 1n, den: 2n, radicand: 1 });
    expect(trigOf(-45).sin.exact).toEqual({ num: -1n, den: 2n, radicand: 2 });
    expect(trigOf(-90).sin.exact).toEqual({ num: -1n, den: 1n, radicand: 1 });
  });
  it('F11: cos(±90) = 0 EXACT (KHONG phai float ~6e-17)', () => {
    const p90 = trigOf(90), m90 = trigOf(-90);
    expect(p90.cos.exact).toEqual({ num: 0n, den: 1n, radicand: 1 });
    expect(p90.cos.approx).toBe(0);
    expect(m90.cos.exact).toEqual({ num: 0n, den: 1n, radicand: 1 });
    expect(m90.cos.approx).toBe(0);
  });
  it('motionOf projectile 45°: v0x=v0y=10√2 exact; k2 = −g/2 = −5', () => {
    const m = motionOf({ op: 'projectile', name: 'b', x0: 0, h0: 0, v0: 20, angleDeg: 45, g: 10 } as never);
    expect(m.x.k1.approx).toBeCloseTo(10 * Math.SQRT2, 10);
    expect(m.x.k1.exact?.radicand).toBe(2);
    expect(m.y.k2.exact).toEqual({ num: -5n, den: 1n, radicand: 1 });
    expect(mainAxis(m)).toBe('x');
  });
  it('motionOf mover1d a=2: k2=1 exact; free_fall mainAxis=y', () => {
    const m = motionOf({ op: 'mover1d', name: 'o', x0: 0, v0: 10, a: 2, startAt: 0, axis: 'x' } as never);
    expect(m.x.k2.exact).toEqual({ num: 1n, den: 1n, radicand: 1 });
    const f = motionOf({ op: 'free_fall', name: 'd', h0: 45, g: 10, x0: 0 } as never);
    expect(mainAxis(f)).toBe('y');
    expect(evalQuadN(f.y, 3)).toBeCloseTo(0, 12); // 45 − 5·9 = 0
  });
  it('F2: motionOf doi don vi EXACT — 54 km/h nen m/s → dung 15 exact; startAt 30 min nen h → 1/2', () => {
    const m = motionOf(
      { op: 'mover1d', name: 'o', x0: 0, v0: 54, v0Unit: 'km/h', a: -3, startAt: 0, axis: 'x' } as never,
      { length: 'm', time: 's' },
    );
    expect(m.x.k1.exact).toEqual({ num: 15n, den: 1n, radicand: 1 }); // 54·5/18 = 15 EXACT
    const tre = motionOf(
      { op: 'mover1d', name: 'b', x0: 2, xUnit: 'km', v0: 40, a: 0, startAt: 30, tUnit: 'min', axis: 'x' } as never,
      { length: 'km', time: 'h' },
    );
    expect(tre.t0.exact).toEqual({ num: 1n, den: 2n, radicand: 1 });   // 30 min → 1/2 h EXACT
    expect(tre.x.k0.exact).toEqual({ num: 2n, den: 1n, radicand: 1 }); // km nen km: factor 1
  });
  it('F2: qty helpers — khong khai unit giu nguyen; nen ngoai bang + co unit → throw ro rang', () => {
    expect(qtyVelocity(60, undefined, { length: 'km', time: 'h' }).exact)
      .toEqual({ num: 60n, den: 1n, radicand: 1 });
    expect(qtyLength(3, 'km', { length: 'm', time: 's' }).exact)
      .toEqual({ num: 3000n, den: 1n, radicand: 1 });
    expect(qtyTime(45, 'min', { length: 'km', time: 'h' }).exact)
      .toEqual({ num: 3n, den: 4n, radicand: 1 }); // 45 min = 3/4 h
    expect(() => qtyVelocity(10, 'km/h', { length: 'cm', time: 's' })).toThrow(/ngoài bảng/);
  });
  it('evalQuadS/derivQuad exact: x(5)=75, v(5)=20 (bai P2)', () => {
    const m = motionOf({ op: 'mover1d', name: 'o', x0: 0, v0: 10, a: 2, startAt: 0, axis: 'x' } as never);
    const t5 = scalarFromNumber(5);
    expect(evalQuadS(m.x, t5).exact).toEqual({ num: 75n, den: 1n, radicand: 1 });
    expect(evalQuadS(derivQuad(m.x), t5).exact).toEqual({ num: 20n, den: 1n, radicand: 1 });
  });
  it('expandAbs t0=1/2 tren xe2 P8: 120 − 60(t−1/2) → {150, −60, 0} exact', () => {
    const m = motionOf({ op: 'mover1d', name: 'x2', x0: 120, v0: -60, a: 0, startAt: 0.5, axis: 'x' } as never);
    const q = expandAbs(m.x, m.t0);
    expect(q.k0.exact).toEqual({ num: 150n, den: 1n, radicand: 1 });
    expect(q.k1.exact).toEqual({ num: -60n, den: 1n, radicand: 1 });
  });
  it('rootsFor giu exact: y={0,10√2,−5} co nghiem 0 va 2√2 (bai P5)', () => {
    const m = motionOf({ op: 'projectile', name: 'b', x0: 0, h0: 0, v0: 20, angleDeg: 45, g: 10 } as never);
    const roots = rootsFor(m.y, rat(0n));
    expect(roots).toHaveLength(2);
    expect(roots[0].approx).toBeCloseTo(0, 10);
    expect(roots[1].approx).toBeCloseTo(2 * Math.SQRT2, 10);
    expect(roots[1].exact).toEqual({ num: 2n, den: 1n, radicand: 2 });
  });
  it('subQuad: hieu hai xe P7 → {−30, 20, 0}', () => {
    const a = motionOf({ op: 'mover1d', name: 'a', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' } as never);
    const b = motionOf({ op: 'mover1d', name: 'b', x0: 30, v0: 40, a: 0, startAt: 0, axis: 'x' } as never);
    const d = subQuad(expandAbs(a.x, a.t0), expandAbs(b.x, b.t0));
    expect(d.k0.approx).toBe(-30);
    expect(d.k1.approx).toBe(20);
  });
});
