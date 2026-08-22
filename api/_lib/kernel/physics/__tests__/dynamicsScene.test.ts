// Scene tĩnh + agents/timeline (§10). Khoá ví dụ B06 §10.3 (equations `t*t`, landing_point, k=0,2,
// label TRẦN, KHÔNG Curve3D thiếu params); quy tắc playback 3–15 s; scene ngang/hệ 2 vật hợp lệ.
import { describe, it, expect } from 'vitest';
import { runDynamics } from '../runDynamics';
import type { GeometryData } from '../../../../../src/types/geometry';

describe('Scene B06 (nghiêng 45°) — khớp §10.3', () => {
  const r = runDynamics({
    problemName: 'vat-truot-nghieng-45', g: 10,
    ops: [{ op: 'body', name: 'vat', mass: 4, on: 'incline', inclineDeg: 45, mu: 0.5 }],
    queries: [{ kind: 'normal_force', on: 'vat' }, { kind: 'force_value', force: 'friction', on: 'vat' }, { kind: 'acceleration', of: 'vat' }],
  });
  const g = r.geometry as GeometryData;

  it('T_phys = 2 danh nghĩa ⇒ playback D_pb = 10, k = 0,2', () => {
    expect(r.meta.tPhys).toBe(2);
    expect(r.meta.playback.durationSec).toBe(10);
    expect(r.meta.playback.timeScale).toBeCloseTo(0.2, 10);
  });

  it('tags có timeScale:0.2; duration 10', () => {
    expect(g.tags).toEqual(['physics', 'timeScale:0.2']);
    expect(g.timeline?.duration).toBe(10);
  });

  it('equations dùng t*t (KHÔNG t^2), khớp §10.3 chính xác', () => {
    const tr = g.timeline!.tracks[0];
    expect(tr.params.equations!.x).toBe('0 + 0.05*t*t');
    expect(tr.params.equations!.y).toBe('0');
    expect(tr.params.equations!.z).toBe('5 + -0.05*t*t');
    expect(JSON.stringify(tr.params)).not.toContain('t^2');
  });

  it('landing_point BẮT BUỘC = chân dốc (5,0,0); timeScale 0.2', () => {
    const tr = g.timeline!.tracks[0];
    expect(tr.params.landing_point![0]).toBeCloseTo(5, 6);
    expect(tr.params.landing_point![1]).toBe(0);
    expect(tr.params.landing_point![2]).toBeCloseTo(0, 6);
    expect(tr.params.timeScale).toBeCloseTo(0.2, 10);
  });

  it('mọi Point3D label TRẦN (F8 — không nhúng giá trị) + đỉnh/chân đúng vị trí', () => {
    expect(g.points.every((p) => p.label === '')).toBe(true);
    const dinh = g.points.find((p) => p.id === 'dinh')!;
    const chan = g.points.find((p) => p.id === 'chan')!;
    expect(dinh.z).toBeCloseTo(5, 6);
    expect(chan.x).toBeCloseTo(5, 6);
  });

  it('KHÔNG Curve3D (mọi quỹ đạo là đường thẳng — Line3D không cần params)', () => {
    expect(g.curves ?? []).toHaveLength(0);
    expect(g.lines.length).toBeGreaterThanOrEqual(2); // mặt dốc + mặt đất
  });

  it('agent id = tên vật, đúng 1 track', () => {
    expect(g.agents!.map((a) => a.id)).toEqual(['vat']);
    expect(g.timeline!.tracks).toHaveLength(1);
    expect(g.timeline!.tracks[0].targetId).toBe('vat');
  });
});

describe('Scene — quy tắc playback & cấu hình khác', () => {
  it('T_phys ∈ [3,15] ⇒ k = 1 (giây thật)', () => {
    // B10: t=10 ⇒ T_phys=10 ⇒ realtime.
    const r = runDynamics({ problemName: 'x', ops: [{ op: 'body', name: 'o', mass: 2, massUnit: 'tan' }, { op: 'force', on: 'o', value: 4000 }, { op: 'force', on: 'o', value: 2000, direction: 'backward' }], queries: [{ kind: 'velocity_at', of: 'o', t: 10 }] });
    expect(r.meta.playback.timeScale).toBe(1);
    expect(r.meta.playback.durationSec).toBe(10);
  });

  it('scene.durationSec ép D_pb', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'v', mass: 4, on: 'incline', inclineDeg: 45, mu: 0.5 }], queries: [{ kind: 'acceleration', of: 'v' }], scene: { durationSec: 5 } });
    expect(r.meta.playback.durationSec).toBe(5);
    expect(r.meta.playback.timeScale).toBeCloseTo(2 / 5, 10);
  });

  it('scene ngang: agent chạy dọc x, z=0; label từ scene.labels', () => {
    const r = runDynamics({ problemName: 'x', ops: [{ op: 'body', name: 'vat', mass: 2 }, { op: 'force', on: 'vat', value: 10 }], queries: [{ kind: 'velocity_at', of: 'vat', t: 3 }], scene: { labels: { vat: 'Vật' } } });
    const g = r.geometry as GeometryData;
    expect(g.agents![0].label).toBe('Vật');
    const tr = g.timeline!.tracks[0];
    expect(tr.params.equations!.z).toBe('0');
    expect(g.points.every((p) => p.label === '')).toBe(true);
  });

  it('scene hệ 2 vật (Atwood): 2 agent, 2 track hợp lệ, không Curve3D', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'm1', mass: 3, on: 'hanging' }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }], queries: [{ kind: 'acceleration' }] });
    const g = r.geometry as GeometryData;
    expect(g.agents!.map((a) => a.id).sort()).toEqual(['m1', 'm2']);
    expect(g.timeline!.tracks).toHaveLength(2);
    expect(g.timeline!.tracks.every((t) => Array.isArray(t.params.landing_point))).toBe(true);
    expect(g.curves ?? []).toHaveLength(0);
  });

  it('bài violation (không trượt) ⇒ geometry null (không dựng scene sai)', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'v', mass: 5, mu: 0.2 }, { op: 'force', on: 'v', value: 5 }], queries: [{ kind: 'acceleration', of: 'v' }] });
    expect(r.geometry).toBeNull();
  });
});
