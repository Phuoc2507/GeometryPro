// Scene/charts dao động (oscillationScene.ts) — TRÌNH BÀY thuần, KHÔNG ảnh hưởng đáp. Kiểm:
//  - OS-1 LABEL TRẦN: KHÔNG nhúng giá trị (đề cho hay engine tính) vào bất kỳ label nào;
//  - φ đủ (A,ω,φ) ⇒ animate parametric_path Math.cos; φ THIẾU ⇒ TĨNH (không timeline, agent tại VTCB) — §14.7a;
//  - con lắc đơn ⇒ TĨNH (điểm treo + dây + vật, không timeline) — §14.7b;
//  - 4 ràng buộc cú pháp §2.2 của biểu thức timeline (KHÔNG '^', dấu phẩy, 'x_start/…/vz', '=');
//  - charts x_t & v_t đều 129 mẫu đều trên [0, T_phys].
import { describe, it, expect } from 'vitest';
import { OscillatorOp, type OscillationPlan } from '../oscillationSchema';
import { resolveModel, type OscModel, type BaseLen } from '../oscillation';
import { buildOscillationScene, buildOscillationCharts, playbackOf } from '../oscillationScene';

function model(op: Record<string, unknown>, base: BaseLen = 'cm'): OscModel { return resolveModel(OscillatorOp.parse(op) as never, base).model; }
const plan = (over: Partial<OscillationPlan> = {}): OscillationPlan => ({
  problemName: 'dao-dong', units: { length: 'cm', time: 's' }, ops: [], queries: [], asserts: [], charts: [], scene: {}, ...over,
} as OscillationPlan);

// Regex phát hiện GIÁ TRỊ số nhúng vào label (OS-1): "4 cm", "T = 2 s", "2.5", "-3π²"… Nhãn hợp lệ chỉ
// gồm chữ + ký hiệu trần ("VTCB", "Biên +A", "Biên −A", tên vật). Bắt: có chữ số HOẶC dấu '='.
const hasEmbeddedValue = (label: string): boolean => /[0-9]/.test(label) || label.includes('=');

describe('OS-1 — LABEL TRẦN toàn scene (không nhúng giá trị)', () => {
  it('vật dao động: nhãn chỉ ký hiệu trần (VTCB / Biên +A / Biên −A / tên)', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } });
    const { geometry } = buildOscillationScene(plan(), [m], 0.4);
    const labels = [...(geometry!.points.map((p) => p.label)), ...(geometry!.agents!.map((a) => a.label))];
    expect(labels).toContain('VTCB'); expect(labels).toContain('Biên +A'); expect(labels).toContain('Biên −A');
    for (const l of labels) expect(hasEmbeddedValue(l), `label "${l}" nhúng giá trị (OS-1)`).toBe(false);
  });
  it('con lắc đơn: vật M nhãn tên trần, KHÔNG "T = 2 s"', () => {
    const m = model({ op: 'oscillator', name: 'con-lac', pendulum: { l: 4, gAsPiSquared: true } });
    const { geometry } = buildOscillationScene(plan(), [m], 4);
    for (const p of geometry!.points) expect(hasEmbeddedValue(p.label)).toBe(false);
    expect(geometry!.points.some((p) => p.label === 'con-lac')).toBe(true); // vật M mang tên trần
  });
  it('scene.labels override vẫn qua nguyên (nhãn trần do người khai)', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 0 } });
    const { geometry } = buildOscillationScene(plan({ scene: { labels: { vat: 'Quả cầu' } } }), [m], 0.4);
    expect(geometry!.agents!.some((a) => a.label === 'Quả cầu')).toBe(true);
  });
});

describe('animate khi đủ A,ω,φ; TĨNH khi thiếu φ / con lắc (§14.7)', () => {
  it('đủ A,ω,φ ⇒ 1 track parametric_path, agent tại A·cosφ, có landing_point', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } });
    const { geometry } = buildOscillationScene(plan(), [m], 0.4);
    expect(geometry!.timeline!.tracks).toHaveLength(1);
    const tr = geometry!.timeline!.tracks[0];
    expect(tr.type).toBe('parametric_path');
    expect(tr.params.landing_point).toBeDefined();
    expect(geometry!.agents![0].initialPosition[0]).toBeCloseTo(4 * Math.cos(Math.PI / 3), 6); // A·cosφ = 4·0,5 = 2
  });
  it('THIẾU φ ⇒ TĨNH: 0 track, agent đậu VTCB (0,0,0)', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true } }); // không φ, không initial
    const { geometry } = buildOscillationScene(plan(), [m], 1);
    expect(geometry!.timeline!.tracks).toHaveLength(0);
    expect(geometry!.agents![0].initialPosition).toEqual([0, 0, 0]);
  });
  it('con lắc đơn ⇒ TĨNH: điểm treo + dây + vật, 0 track', () => {
    const m = model({ op: 'oscillator', name: 'cl', pendulum: { l: 4, gAsPiSquared: true } });
    const { geometry } = buildOscillationScene(plan(), [m], 4);
    expect(geometry!.timeline!.tracks).toHaveLength(0);
    expect(geometry!.lines.some((l) => l.from.startsWith('P_') && l.to.startsWith('M_'))).toBe(true); // dây treo
  });
});

describe('4 ràng buộc cú pháp §2.2 của biểu thức timeline (AnimatedAgent new Function)', () => {
  it('equations.x KHÔNG chứa "^", dấu phẩy, x_start/y_start/z_start/vx/vy/vz, "="', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } });
    const { geometry } = buildOscillationScene(plan(), [m], 0.4);
    const expr = geometry!.timeline!.tracks[0].params.equations!.x;
    expect(expr).toMatch(/Math\.cos/);
    expect(expr).not.toContain('^');
    expect(expr).not.toContain(',');
    expect(expr).not.toContain('=');
    for (const bad of ['x_start', 'y_start', 'z_start', 'vx', 'vy', 'vz']) expect(expr).not.toContain(bad);
  });
  it('hằng bake ≥ 9 chữ số có nghĩa, không sci-notation; eval qua new Function chạy (t=0 → A·cosφ)', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } });
    const { geometry, playback } = buildOscillationScene(plan(), [m], 0.4);
    const expr = geometry!.timeline!.tracks[0].params.equations!.x;
    expect(expr).not.toMatch(/[eE][+-]/); // không sci-notation
    // tái lập eval frontend: new Function('t', 'return ' + expr)
    const f = new Function('t', 'return ' + expr) as (t: number) => number;
    expect(f(0)).toBeCloseTo(4 * Math.cos(Math.PI / 3), 6); // t=0 giây playback ⇒ A·cosφ = 2
    // tại t = durationSec (playback) ⇒ vị trí tại T_phys (khớp landing_point)
    const land = geometry!.timeline!.tracks[0].params.landing_point![0];
    expect(f(playback.durationSec)).toBeCloseTo(land, 4);
  });
});

describe('playback + charts', () => {
  it('playbackOf: 3≤T≤15 ⇒ giây thật k=1; ngoài ⇒ nén/kéo về 10 s', () => {
    expect(playbackOf(plan(), 5)).toEqual({ durationSec: 5, timeScale: 1 });
    expect(playbackOf(plan(), 0.4).durationSec).toBe(10); // T nhỏ ⇒ 10 s
    expect(playbackOf(plan(), 0.4).timeScale).toBeCloseTo(0.04, 9); // slow-motion
    expect(playbackOf(plan({ scene: { durationSec: 8 } }), 4)).toEqual({ durationSec: 8, timeScale: 0.5 }); // override
  });
  it('charts x_t & v_t đều 129 mẫu đều trên [0, T_phys]', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 0 } });
    const charts = buildOscillationCharts(plan({ charts: [{ kind: 'x_t', of: ['vat'] }, { kind: 'v_t', of: ['vat'] }] }), [m], 0.4);
    expect(charts).toHaveLength(2);
    for (const ch of charts) {
      expect(ch.series[0].samples).toHaveLength(129);
      expect(ch.series[0].samples[0][0]).toBe(0);
      expect(ch.series[0].samples[128][0]).toBeCloseTo(0.4, 9);
    }
    const xt = charts.find((c) => c.kind === 'x_t')!;
    expect(xt.series[0].samples[0][1]).toBeCloseTo(4, 6); // x(0) = A·cos0 = 4
    expect(xt.vUnit).toBe('cm');
    const vt = charts.find((c) => c.kind === 'v_t')!;
    expect(vt.series[0].samples[0][1]).toBeCloseTo(0, 6); // v(0) = −Aω·sin0 = 0
    expect(vt.vUnit).toBe('cm/s');
  });
  it('chart bỏ qua model thiếu φ (không đủ để vẽ đường thời gian)', () => {
    const m = model({ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true } }); // không φ
    const charts = buildOscillationCharts(plan({ charts: [{ kind: 'x_t', of: ['vat'] }] }), [m], 1);
    expect(charts[0].series).toHaveLength(0);
  });
});
