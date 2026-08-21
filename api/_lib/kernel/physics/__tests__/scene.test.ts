// Test Task 4: scene — khớp 3 quirk AnimatedAgent + quy tắc playback spec §8.
// F8: scene đúng MỨC PLAN (điểm xuất phát + chạm đất label trần + agents/timeline + quỹ đạo samples)
// — KHÔNG điểm đỉnh/điểm gặp/giá-trị-trong-nhãn (v1). F9: mọi Curve3D phát params: {}.
import { describe, it, expect } from 'vitest';
import { runPhysics } from '../runPhysics';
import type { GeometryData } from '../../../../../src/types/geometry';

const planP6 = {
  problemName: 'nem-xien-60', ops: [{ op: 'projectile', name: 'bong', h0: 0, v0: 20, angleDeg: 60, g: 10 }],
  queries: [{ kind: 'range', of: 'bong' }],
  scene: { labels: { bong: 'Quả bóng' } },
};
const planP8 = {
  problemName: 'hai-xe-nguoc', units: { length: 'km', time: 'h' },
  ops: [
    { op: 'mover1d', name: 'xe1', x0: 0, v0: 40 },
    { op: 'mover1d', name: 'xe2', x0: 120, v0: -60, startAt: 0.5 },
  ],
  queries: [{ kind: 'meet_time', a: 'xe1', b: 'xe2' }],
};

describe('scene — khop AnimatedAgent + quy tac playback', () => {
  it('P6: T=2√3∈[3,15] va don vi s → k=1, duration=T; path dung t*t; landing_point = cham dat', () => {
    const r = runPhysics(planP6);
    const g = r.geometry as GeometryData;
    expect(r.meta.playback.timeScale).toBeCloseTo(1, 10);
    expect(g.timeline!.duration).toBeCloseTo(2 * Math.sqrt(3), 4);
    const tr = g.timeline!.tracks[0];
    expect(tr.type).toBe('parametric_path');
    expect(tr.targetId).toBe('bong');
    const eq = tr.params.equations as { x: string; y: string; z: string };
    expect(eq.x).toBe('0 + 10*t');            // AnimatedAgent ưu tiên equations (không split chuỗi)
    expect(eq.y).toBe('0');                   // geo3d: y=0, độ cao nằm ở z
    expect(eq.z).toContain('t*t');            // KHÔNG t^2 (AnimatedAgent replace 1 lần)
    expect(eq.z).not.toContain('t^2');
    const path = tr.params.path as string;    // path dự phòng vẫn phát, cùng nội dung
    expect(path).toContain('x(t) = 0 + 10*t');
    expect(path).toContain('t*t');
    const lp = tr.params.landing_point as number[];
    expect(lp[0]).toBeCloseTo(20 * Math.sqrt(3), 3);
    expect(lp[1]).toBe(0);
    expect(lp[2]).toBeCloseTo(0, 6);
    expect(g.agents![0]).toMatchObject({ id: 'bong', label: 'Quả bóng', initialPosition: [0, 0, 0] });
  });
  it('P6: co quy dao dashed plane xz + params:{} (F9), mau dau = (0,0), mau cuoi ≈ (20√3, 0), dinh ≈ 15', () => {
    const g = runPhysics(planP6).geometry as GeometryData;
    const c = g.curves!.find((x) => x.id === 'traj_bong')!;
    expect(c.plane).toBe('xz');
    expect(c.style).toBe('dashed');
    expect(c.params).toEqual({});             // F9: field bắt buộc của Curve3D — phát {} tường minh
    const s = c.samples!;
    expect(s[0]).toEqual({ x: 0, y: 0 });
    expect(s[s.length - 1].x).toBeCloseTo(20 * Math.sqrt(3), 3);
    expect(Math.max(...s.map((p) => p.y))).toBeCloseTo(15, 1);
  });
  it('P8: gio → nen ve 10 s: k=0.15, track xe2 start=0.5/0.15≈3.333, he so path nhan k (40·0.15=6)', () => {
    const r = runPhysics(planP8);
    const g = r.geometry as GeometryData;
    expect(r.meta.playback).toMatchObject({ durationSec: 10 });
    expect(r.meta.playback.timeScale).toBeCloseTo(0.15, 10);
    const t2 = g.timeline!.tracks.find((t) => t.targetId === 'xe2')!;
    expect(t2.start).toBeCloseTo(0.5 / 0.15, 3);
    const t1 = g.timeline!.tracks.find((t) => t.targetId === 'xe1')!;
    expect(t1.params.path).toContain('x(t) = 0 + 6*t');
    expect(t1.params.landing_point).toBeDefined();  // mover1d cũng phải có (chống nhảy-về-đầu)
    expect(g.axisUnit).toBe('km');
    expect(g.tags).toContain('physics');
  });
  it('charts x_t/v_t: du lieu mau + events (khong dung chart UI)', () => {
    const r = runPhysics({ ...planP8, charts: [{ kind: 'x_t', of: ['xe1', 'xe2'] }, { kind: 'v_t', of: ['xe1'] }] });
    const xt = (r.charts as { kind: string; series: { name: string; samples: [number, number][] }[]; events: { t: number }[] }[])
      .find((c) => c.kind === 'x_t')!;
    const xe1 = xt.series.find((s) => s.name === 'xe1')!;
    expect(xe1.samples[0]).toEqual([0, 0]);
    expect(xe1.samples[xe1.samples.length - 1][0]).toBeCloseTo(1.5, 6);  // tới T_phys = t_gặp
    expect(xe1.samples[xe1.samples.length - 1][1]).toBeCloseTo(60, 6);   // x(1.5)=60
    const xe2 = xt.series.find((s) => s.name === 'xe2')!;
    expect(xe2.samples[0][0]).toBeCloseTo(0.5, 10);                       // xe 2 vẽ từ lúc xuất phát
    expect(xt.events.some((e) => Math.abs(e.t - 1.5) < 1e-6)).toBe(true);
    const vt = (r.charts as { kind: string; series: { samples: [number, number][] }[] }[]).find((c) => c.kind === 'v_t')!;
    expect(vt.series[0].samples).toHaveLength(2);                         // v hằng → 2 mẫu
    expect(vt.series[0].samples[0][1]).toBeCloseTo(40, 10);
  });
});
