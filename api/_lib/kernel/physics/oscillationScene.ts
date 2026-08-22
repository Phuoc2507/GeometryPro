// api/_lib/kernel/physics/oscillationScene.ts
// Trình bày (KHÔNG ảnh hưởng đáp): OscModel → GeometryData. Theo §9:
//  - vật dao động trục ngang: điểm VTCB/Biên + Line quỹ đạo + Agent3D timeline parametric_path (Math.cos);
//  - φ THIẾU ⇒ KHÔNG animate — dựng TĨNH (trục + biên, agent đậu VTCB) — phán quyết §14.7a;
//  - con lắc đơn: scene TĨNH (điểm treo + dây + vật) — phán quyết §14.7b (animate cung tròn để v2).
// LABEL TRẦN toàn bộ (OS-1): KHÔNG nhúng giá trị (đề cho hay engine tính) vào label — về answers[].
// 4 ràng buộc cú pháp §2.2: KHÔNG '^', KHÔNG dấu phẩy trong biểu thức, KHÔNG 'x_start/…/vz', KHÔNG '='.
import type { GeometryData, Point3D, Line3D, Agent3D, AnimationTimeline } from '../../../../src/types/geometry';
import type { OscillationPlan } from './oscillationSchema';
import type { OscModel } from './oscillation';
import { approxP } from './piScalar';

const COLORS = ['#FFA500', '#38BDF8', '#F472B6', '#4ADE80'];
const rnd = (n: number): number => parseFloat(n.toFixed(6));
// ≥ 9 chữ số có nghĩa, không sci-notation trong miền bài (§2.2 — bake hằng vào biểu thức timeline).
const num9 = (x: number): string => {
  const s = parseFloat(x.toPrecision(12)).toString();
  return s.includes('e') || s.includes('E') ? x.toFixed(9) : s;
};

export type OscChart = { kind: 'x_t' | 'v_t'; tUnit: string; vUnit: string; series: { name: string; samples: [number, number][] }[] };

// Quy tắc playback (v0 §8.2): giây thật khi 3 ≤ T ≤ 15; ngoài ra nén/kéo về 10 s.
export function playbackOf(plan: OscillationPlan, tPhys: number): { durationSec: number; timeScale: number } {
  if (plan.scene.durationSec) return { durationSec: plan.scene.durationSec, timeScale: tPhys / plan.scene.durationSec };
  if (tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}

// x(t_playback) = A·cos((ω·k)·t + φ) — hệ số ω·k đổi trục thời gian playback; φ bake trực tiếp.
function cosExpr(A: number, wk: number, phi: number): string {
  const p = num9(Math.abs(phi));
  const sign = phi < 0 ? '-' : '+';
  return `${num9(A)}*Math.cos(${num9(wk)}*t ${sign} ${p})`;
}

export function buildOscillationScene(
  plan: OscillationPlan, models: OscModel[], tPhys: number,
): { geometry: GeometryData | null; playback: { durationSec: number; timeScale: number } } {
  const playback = playbackOf(plan, tPhys);
  const k = playback.timeScale;
  if (models.length === 0) return { geometry: null, playback };

  const points: Point3D[] = [];
  const lines: Line3D[] = [];
  const agents: Agent3D[] = [];
  const tracks: AnimationTimeline['tracks'] = [];
  const labelOf = (name: string): string => plan.scene.labels?.[name] ?? name;
  let span = 1;
  let ci = 0;

  for (const m of models) {
    const color = COLORS[ci % COLORS.length];
    const pend = m.op.pendulum;
    if (pend) {
      // Con lắc đơn TĨNH: điểm treo P (cao l), vật M tại gốc, dây P–M. Nhiều con lắc lệch trục x.
      const lM = pend.lUnit === 'cm' ? pend.l / 100 : pend.l;
      const off = ci * 1.2;
      points.push({ id: `P_${m.name}`, label: '', x: off, y: 0, z: lM });
      points.push({ id: `M_${m.name}`, label: labelOf(m.name), x: off, y: 0, z: 0 });
      lines.push({ id: `day_${m.name}`, from: `P_${m.name}`, to: `M_${m.name}`, style: 'solid', color: '#8B8B8B' });
      span = Math.max(span, lM);
    } else if (m.A !== null) {
      const A = m.A.approx;
      span = Math.max(span, 2 * A);
      points.push({ id: `O_${m.name}`, label: 'VTCB', x: 0, y: 0, z: 0 });
      points.push({ id: `Bp_${m.name}`, label: 'Biên +A', x: rnd(A), y: 0, z: 0 });
      points.push({ id: `Bm_${m.name}`, label: 'Biên −A', x: rnd(-A), y: 0, z: 0 });
      lines.push({ id: `quydao_${m.name}`, from: `Bm_${m.name}`, to: `Bp_${m.name}`, style: 'solid', color: '#8B8B8B' });
      const radius = Math.max(0.12, 0.02 * span);
      const canAnimate = m.omega !== null && m.phi !== null;
      if (canAnimate) {
        const wn = approxP(m.omega);
        const phin = approxP(m.phi);
        const x0 = rnd(A * Math.cos(phin));
        agents.push({ id: m.name, label: labelOf(m.name), initialPosition: [x0, 0, 0], color, radius });
        const landX = rnd(A * Math.cos(wn * tPhys + phin));
        tracks.push({
          id: `mv_${m.name}`, start: 0, end: playback.durationSec, type: 'parametric_path', targetId: m.name,
          params: {
            equations: { x: cosExpr(A, wn * k, phin), y: '0', z: '0' },
            path: `x(t) = A·cos(ωt + φ) — ${m.name}`,
            landing_point: [landX, 0, 0], // = vị trí tại T_phys (BẮT BUỘC v0 R2)
            timeScale: k,
          },
        });
      } else {
        // φ thiếu ⇒ TĨNH: agent đậu VTCB, KHÔNG timeline.
        agents.push({ id: m.name, label: labelOf(m.name), initialPosition: [0, 0, 0], color, radius });
      }
    }
    ci++;
  }

  const geometry: GeometryData = {
    name: plan.problemName,
    axisUnit: plan.units.length,
    tags: ['physics', 'oscillation', `timeScale:${num9(k)}`],
    points, lines, curves: [], agents,
    timeline: { duration: playback.durationSec, tracks },
  };
  return { geometry, playback };
}

// Charts: x_t VÀ v_t đều 129 mẫu đều trên [0, T_phys] (cos không tuyến tính — khác v0 v_t 2 mẫu).
export function buildOscillationCharts(plan: OscillationPlan, models: OscModel[], tPhys: number): OscChart[] {
  const byName = new Map(models.map((m) => [m.name, m]));
  const out: OscChart[] = [];
  for (const ch of plan.charts) {
    const series: OscChart['series'] = [];
    for (const name of ch.of) {
      const m = byName.get(name);
      if (!m || m.A === null || m.omega === null || m.phi === null) continue;
      const A = m.A.approx, wn = approxP(m.omega), phin = approxP(m.phi);
      const N = 128;
      const samples: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (tPhys * i) / N;
        samples.push([t, ch.kind === 'x_t' ? A * Math.cos(wn * t + phin) : -A * wn * Math.sin(wn * t + phin)]);
      }
      series.push({ name, samples });
    }
    out.push({ kind: ch.kind, tUnit: 's', vUnit: ch.kind === 'x_t' ? plan.units.length : `${plan.units.length}/s`, series });
  }
  return out;
}
