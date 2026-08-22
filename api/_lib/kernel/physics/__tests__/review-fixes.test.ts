// Test KHOÁ cho đợt vá theo review 2026-08-21-physics-code-review.md (TDD: viết ĐỎ trước, vá sau).
// CAO-1 (miền tin cậy sau-dừng/sau-chạm-đất), VỪA-1..6, THẤP (2)(5)(6)(7)(9) + THẤP-1/3/4.
import { describe, it, expect } from 'vitest';
import { runPhysics } from '../runPhysics';
import { computePhysicsQuery, fmtNum, type Check } from '../compute';
import { motionOf, type Motion } from '../kinematics';
import { PhysicsPlanSchema } from '../planSchema';
import type { GeometryData } from '../../../../../src/types/geometry';
import type { PhysicsChart } from '../scene';

const U = { length: 'm', time: 's' };
const map = (...ops: unknown[]): Map<string, Motion> => {
  const m = new Map<string, Motion>();
  for (const op of ops) { const mo = motionOf(op as never); m.set(mo.name, mo); }
  return m;
};
// Bài hãm phanh chuẩn của review: v0=15, a=−3 ⇒ dừng tại t=5, x=37,5 m.
const hamPhanh = (queries: object[], extra: object = {}) => ({
  problemName: 'ham-phanh-mien-tin-cay',
  ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 15, a: -3 }],
  queries, ...extra,
});
const isWarn = (c: Check): boolean => c.kind === 'warn' && c.pass === false && c.severity === 'warn';

describe('CAO-1 — moc mien tin cay: van tra dap NHUNG day warn, khong doi ok', () => {
  it('position_at t=8 sau khi dung (t_stop=5): van tra 24 m, ok:true, co Check warn, KHONG vao errors', () => {
    const r = runPhysics(hamPhanh([{ kind: 'position_at', of: 'oto', t: 8 }]));
    expect(r.ok).toBe(true);                                  // warn KHÔNG làm ok=false (quyết định thiết kế)
    expect(r.answers[0].approx).toBeCloseTo(24, 10);          // giữ tương thích: đáp vẫn serve
    expect(r.errors).toHaveLength(0);                         // warn không đổ vào errors
    const w = r.checks.find(isWarn);
    expect(w).toBeDefined();
    expect(w!.detail).toMatch(/vượt thời điểm dừng t=5/);
    expect(w!.detail).toMatch(/không còn mô tả chuyển động thực/);
  });
  it('velocity_at t=8: van tra −9 m/s + warn', () => {
    const r = runPhysics(hamPhanh([{ kind: 'velocity_at', of: 'oto', t: 8, component: 'x' }]));
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(-9, 10);
    expect(r.checks.some(isWarn)).toBe(true);
  });
  it('free_fall cham dat t=3: position_at t=4 van tra −35 m + warn "cham dat"', () => {
    const r = runPhysics({
      problemName: 'roi-qua-dat',
      ops: [{ op: 'free_fall', name: 'da', h0: 45, g: 10 }],
      queries: [{ kind: 'position_at', of: 'da', t: 4 }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(-35, 10);
    const w = r.checks.find(isWarn);
    expect(w).toBeDefined();
    expect(w!.detail).toMatch(/vượt thời điểm chạm đất t=3/);
  });
  it('time_when position=−30: nghiem 5+3√5 ≈ 11.708 VUOT t_stop=5 → van tra dap + warn hien dien', () => {
    const r = runPhysics(hamPhanh([{ kind: 'time_when', of: 'oto', position: -30 }]));
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(5 + 3 * Math.sqrt(5), 6);
    expect(r.checks.some(isWarn)).toBe(true);
  });
  it('time_when_velocity value=−9 (dat tai t=8 > t_stop): warn tren nghiem tra ve', () => {
    const r = runPhysics(hamPhanh([{ kind: 'time_when_velocity', of: 'oto', value: -9 }]));
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(8, 10);
    expect(r.checks.some(isWarn)).toBe(true);
  });
  it('distance_between_at t=8 co vat da dung: van tra dap + warn tu vat lien quan', () => {
    const r = runPhysics(hamPhanh(
      [{ kind: 'distance_between_at', a: 'oto', b: 'xe', t: 8 }],
      { ops: [
        { op: 'mover1d', name: 'oto', x0: 0, v0: 15, a: -3 },
        { op: 'mover1d', name: 'xe', x0: 0, v0: 5 },
      ] },
    ));
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(16, 10);   // |24 − 40|
    expect(r.checks.some(isWarn)).toBe(true);
  });
  it('doi chung: t=4 TRONG mien tin cay (≤5) → KHONG warn; t=5 dung moc cung KHONG warn', () => {
    const r4 = runPhysics(hamPhanh([{ kind: 'position_at', of: 'oto', t: 4 }]));
    expect(r4.checks.some(isWarn)).toBe(false);
    const r5 = runPhysics(hamPhanh([{ kind: 'time_when_velocity', of: 'oto', value: 0 }]));
    expect(r5.checks.some(isWarn)).toBe(false);        // nghiệm t=5 = t_stop: chưa vượt
  });
});

describe('VUA-1 — asserts phai quet r.checks (C7: assert gap gia tren 2 vat lech truc)', () => {
  it('assert meet_time equals 0 tren A(truc x)/B(truc y) khong gap that → KHONG duoc ok:true', () => {
    const r = runPhysics({
      problemName: 'assert-gap-gia',
      ops: [
        { op: 'mover1d', name: 'A', x0: 0, v0: 10 },
        { op: 'mover1d', name: 'B', x0: 20, v0: 5, axis: 'y' },
      ],
      queries: [{ kind: 'position_at', of: 'A', t: 1 }],
      asserts: [{ query: { kind: 'meet_time', a: 'A', b: 'B' }, equals: 0 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length + r.violations.length).toBeGreaterThan(0);
  });
});

describe('VUA-2 — buildCharts khong ve DI LUI khi tPhys < startAt', () => {
  it('xe2 startAt=2 nhung tPhys=1: moi series co t TANG CHAT, khong co doan lui', () => {
    const r = runPhysics({
      problemName: 'chart-di-lui',
      ops: [
        { op: 'mover1d', name: 'xe1', x0: 0, v0: 10 },
        { op: 'mover1d', name: 'xe2', x0: 100, v0: -10, startAt: 2 },
      ],
      queries: [{ kind: 'position_at', of: 'xe1', t: 1 }],
      charts: [{ kind: 'x_t', of: ['xe1', 'xe2'] }],
    });
    const xt = (r.charts as PhysicsChart[])[0];
    expect(xt.series.some((s) => s.name === 'xe1')).toBe(true);
    for (const s of xt.series) {
      for (let i = 1; i < s.samples.length; i++) {
        expect(s.samples[i][0]).toBeGreaterThan(s.samples[i - 1][0]);
      }
    }
  });
});

describe('VUA-4 — meet lech truc: ok:false nghiep vu, khong con ok:true + check fail', () => {
  it('compute: meet_time A(truc x)/B(truc y) → ok:false "khong thuc su gap nhau (lech ... truc con lai)"', () => {
    const two = map(
      { op: 'mover1d', name: 'A', x0: 0, v0: 10, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'B', x0: 20, v0: 5, a: 0, startAt: 0, axis: 'y' },
    );
    const r = computePhysicsQuery(two, { kind: 'meet_time', a: 'A', b: 'B' } as never, U);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.problem).toMatch(/không thực sự gặp nhau/);
      expect(r.problem).toMatch(/trục còn lại/);
    }
  });
  it('runPhysics: query meet lech truc → errors ro rang, answers KHONG chua dap ma', () => {
    const r = runPhysics({
      problemName: 'meet-lech-truc',
      ops: [
        { op: 'mover1d', name: 'A', x0: 0, v0: 10 },
        { op: 'mover1d', name: 'B', x0: 20, v0: 5, axis: 'y' },
      ],
      queries: [{ kind: 'meet_time', a: 'A', b: 'B' }],
    });
    expect(r.ok).toBe(false);
    expect(r.answers).toHaveLength(0);
    expect(r.errors.some((e) => /không thực sự gặp nhau/.test(e.message))).toBe(true);
  });
});

describe('VUA-5 — time_when tren vat dung yen (k1=k2=0)', () => {
  it('dung yen TAI DUNG vi tri hoi → tra t0 + info "luon o vi tri nay" (khong con error sai)', () => {
    const dung = map({ op: 'mover1d', name: 'cot', x0: 50, v0: 0, a: 0, startAt: 2, axis: 'x' });
    const r = computePhysicsQuery(dung, { kind: 'time_when', of: 'cot', position: 50 } as never, U);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.approx).toBeCloseTo(2, 10);     // t₀, không phải 0
      expect(r.checks.some((c) => c.kind === 'info' && /luôn ở vị trí/i.test(c.detail))).toBe(true);
    }
  });
  it('dung yen o CHO KHAC → error noi ro "dung yen ... khong bao gio toi"', () => {
    const dung = map({ op: 'mover1d', name: 'cot', x0: 50, v0: 0, a: 0, startAt: 0, axis: 'x' });
    const r = computePhysicsQuery(dung, { kind: 'time_when', of: 'cot', position: 60 } as never, U);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.problem).toMatch(/đứng yên/);
      expect(r.problem).toMatch(/không bao giờ tới/);
    }
  });
});

describe('VUA-3 — queryIndex tren PhysicsAnswer', () => {
  it('query loi giua chung: answers con lai mang queryIndex DUNG vi tri trong plan.queries', () => {
    const r = runPhysics({
      problemName: 'queryIndex',
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 60 }],
      queries: [
        { kind: 'position_at', of: 'oto', t: 1 },
        { kind: 'time_to_ground', of: 'oto' },              // lỗi: mover1d không có
        { kind: 'velocity_at', of: 'oto', t: 1, component: 'x' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.answers.map((a) => a.queryIndex)).toEqual([0, 2]);
  });
});

describe('VUA-6 — charts.events mang value (gia tri dap)', () => {
  it('meet_time/meet_position: events co value = approx cua dap (spec §8.3)', () => {
    const r = runPhysics({
      problemName: 'events-value', units: { length: 'km', time: 'h' },
      ops: [
        { op: 'mover1d', name: 'oto', x0: 0, v0: 60 },
        { op: 'mover1d', name: 'khach', x0: 30, v0: 40 },
      ],
      queries: [
        { kind: 'meet_time', a: 'oto', b: 'khach' },
        { kind: 'meet_position', a: 'oto', b: 'khach' },
      ],
      charts: [{ kind: 'x_t', of: ['oto', 'khach'] }],
    });
    const xt = (r.charts as PhysicsChart[])[0];
    expect(xt.events.some((e) => Math.abs(e.t - 1.5) < 1e-9 && e.value === 1.5)).toBe(true);
    expect(xt.events.some((e) => Math.abs(e.t - 1.5) < 1e-9 && e.value === 90)).toBe(true);
  });
});

describe('THAP — cac va nho', () => {
  it('(2) loi zod kem PATH: x0 sai kieu → message chua "ops.0.x0"', () => {
    const r = runPhysics({
      problemName: 'x',
      ops: [{ op: 'mover1d', name: 'A', x0: 'abc', v0: 1 }],
      queries: [{ kind: 'position_at', of: 'A', t: 1 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ops\.0\.x0/);
  });
  it('(5) kind la (lach schema, goi compute truc tiep) → error ro, KHONG tra undefined', () => {
    const m = map({ op: 'mover1d', name: 'A', x0: 0, v0: 1, a: 0, startAt: 0, axis: 'x' });
    const r = computePhysicsQuery(m, { kind: 'tele_transport', of: 'A' } as never, U);
    expect(r).toBeDefined();
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.problem).toMatch(/không hỗ trợ/);
  });
  it('(6) schema chan |angleDeg| > 90 cho projectile, message huong dan mover1d; −90 van hop le', () => {
    const bad = PhysicsPlanSchema.safeParse({
      problemName: 'x',
      ops: [{ op: 'projectile', name: 'A', h0: 0, v0: 10, angleDeg: 180, g: 10 }],
      queries: [{ kind: 'range', of: 'A' }],
    });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(JSON.stringify(bad.error.issues)).toMatch(/mover1d/);
    const ok = PhysicsPlanSchema.safeParse({
      problemName: 'x',
      ops: [{ op: 'projectile', name: 'A', h0: 60, v0: 10, angleDeg: -90, g: 10 }],
      queries: [{ kind: 'time_to_ground', of: 'A' }],
    });
    expect(ok.success).toBe(true);
  });
  it('(7) vat ten "G" khong va id voi moc scene (moc doi prefix "__G0")', () => {
    const r = runPhysics({
      problemName: 'ten-G',
      ops: [{ op: 'mover1d', name: 'G', x0: 0, v0: 10 }],
      queries: [{ kind: 'position_at', of: 'G', t: 1 }],
    });
    const g = r.geometry as GeometryData;
    const ids = g.points!.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);   // không id nào trùng
    expect(ids).toContain('__G0');
    expect(ids).toContain('G0');                  // điểm xuất phát của vật tên "G" vẫn giữ tên
  });
  it('(9) parse fail → meta.playback.timeScale = 1 (khong de 0 gay chia-0 phia dung)', () => {
    const r = runPhysics(null);
    expect(r.ok).toBe(false);
    expect(r.meta.playback.timeScale).toBe(1);
  });
});

describe('THAP-1 — thong nhat quy uoc truoc-t0 theo §6.2: KEP (dung yen tai vi tri dau), khong reject', () => {
  it('position_at t=1 < t0=2 → tra vi tri dau 100 m + info quy uoc; velocity_at → 0 (dung yen)', () => {
    const m2 = map({ op: 'mover1d', name: 'xe2', x0: 100, v0: -10, a: 0, startAt: 2, axis: 'x' });
    const p = computePhysicsQuery(m2, { kind: 'position_at', of: 'xe2', t: 1 } as never, U);
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.answer.approx).toBeCloseTo(100, 10);
      expect(p.checks.some((c) => c.kind === 'info' && /đứng yên/.test(c.detail))).toBe(true);
    }
    const v = computePhysicsQuery(m2, { kind: 'velocity_at', of: 'xe2', t: 1, component: 'x' } as never, U);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.answer.approx).toBe(0);
    // từ t0 trở đi: chạy bình thường
    const v3 = computePhysicsQuery(m2, { kind: 'velocity_at', of: 'xe2', t: 3, component: 'x' } as never, U);
    expect(v3.ok).toBe(true);
    if (v3.ok) expect(v3.answer.approx).toBeCloseTo(-10, 10);
  });
});

describe('THAP-3 — formatter physics: phan so xau den>100 (chi thua so 2·5) in thap phan exact', () => {
  it('y(1.05) roi tu do g=9.8 = 378391/4000 → in "94.59775 m", van exact (approximate:false)', () => {
    const r = runPhysics({
      problemName: 'den-xau',
      ops: [{ op: 'free_fall', name: 'vat', h0: 100, g: 9.8 }],
      queries: [{ kind: 'position_at', of: 'vat', t: 1.05 }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('94.59775 m');
    expect(r.answers[0].approximate).toBe(false);
  });
  it('den ≤ 100 GIU phan so ("75/2 m" cua bai ham phanh khong doi)', () => {
    const r = runPhysics(hamPhanh([{ kind: 'position_when_velocity', of: 'oto', value: 0 }]));
    expect(r.answers[0].text).toBe('75/2 m');
  });
});

describe('THAP-4 — fmtNum so nho khac 0 khong in "0"', () => {
  it('|x| nho → toPrecision, khong toFixed ve "0"; hanh vi cu giu nguyen cho so thuong', () => {
    expect(fmtNum(0.00003)).toBe('0.00003');
    expect(fmtNum(-0.00003)).toBe('-0.00003');
    expect(fmtNum(0)).toBe('0');
    expect(fmtNum(1234.5678)).toBe('1234.57');
    expect(fmtNum(1.23456)).toBe('1.2346');
  });
});
