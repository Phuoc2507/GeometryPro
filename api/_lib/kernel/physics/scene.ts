// api/_lib/kernel/physics/scene.ts
// Trình bày (không ảnh hưởng đáp): Motion[] → GeometryData (mốc + mặt đất + quỹ đạo + agents +
// timeline parametric_path) + dữ liệu đồ thị x-t/v-t. 3 quy ước khớp AnimatedAgent.tsx (spec §8):
// (1) path dùng `t*t`; (2) landing_point BẮT BUỘC mọi track; (3) trục đứng vật lý → z geo3d, y geo3d = 0.
// Path theo GIÂY PLAYBACK kể từ track.start: hệ số bậc 1 nhân k, bậc 2 nhân k² (k = timeScale).
// Mức scene v0 = MỨC PLAN (chốt F8): điểm xuất phát + điểm chạm đất label TRẦN; điểm đỉnh/điểm gặp/
// giá-trị-trong-nhãn để dành v1. F9: mọi Curve3D phát `params: {}` (field bắt buộc của type).
import type { GeometryData, Point3D, Line3D, Curve3D, Agent3D, AnimationTimeline } from '../../../../src/types/geometry';
import { type Motion, type Quad, evalQuadN, derivQuad, mainAxis } from './kinematics';
import { groundTau, EPS_T } from './compute';
import type { PhysicsPlan } from './planSchema';

const COLORS = ['#FFA500', '#38BDF8', '#F472B6', '#4ADE80'];
const fmt = (n: number): string => parseFloat(n.toFixed(6)).toString();

export type PhysicsChart = {
  kind: 'x_t' | 'v_t'; tUnit: string; vUnit: string;
  series: { name: string; samples: [number, number][] }[];
  events: { t: number; label: string; value?: number }[];   // VỪA-6: value = giá trị đáp (spec §8.3)
};

// Quy tắc playback (spec §8.2): giây thật khi units.time='s' và 3 ≤ T ≤ 15; ngoài ra nén/kéo về 10 s.
export function playbackOf(plan: PhysicsPlan, tPhys: number): { durationSec: number; timeScale: number } {
  if (plan.scene.durationSec) return { durationSec: plan.scene.durationSec, timeScale: tPhys / plan.scene.durationSec };
  if (plan.units.time === 's' && tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}

export function buildScene(
  plan: PhysicsPlan, motions: Map<string, Motion>, tPhys: number,
): { geometry: GeometryData | null; playback: { durationSec: number; timeScale: number } } {
  const playback = playbackOf(plan, tPhys);
  if (motions.size === 0) return { geometry: null, playback };
  const k = playback.timeScale;

  type Item = { m: Motion; tEnd: number; falling: boolean; x0: number; y0: number; xEnd: number; yEnd: number };
  const items: Item[] = [];
  motions.forEach((m) => {
    const g = m.op.op === 'mover1d' ? null : groundTau(m);
    const falling = g !== null && !('problem' in g);
    const tauEnd = falling ? (g as { tauN: number }).tauN : Math.max(0, tPhys - m.t0.approx);
    items.push({
      m, falling, tEnd: m.t0.approx + tauEnd,
      x0: evalQuadN(m.x, 0), y0: evalQuadN(m.y, 0),
      xEnd: evalQuadN(m.x, tauEnd), yEnd: evalQuadN(m.y, tauEnd),
    });
  });

  // Khung cảnh: gom mốc x/y (đỉnh parabol chỉ để tính span/yTop — KHÔNG phát điểm, F8) → span, mặt đất, bán kính agent
  let xMin = Infinity, xMax = -Infinity, yTop = 0;
  for (const it of items) {
    xMin = Math.min(xMin, it.x0, it.xEnd); xMax = Math.max(xMax, it.x0, it.xEnd);
    yTop = Math.max(yTop, it.y0, it.yEnd);
    if (it.m.y.k2.approx < 0) {
      const tauStar = -it.m.y.k1.approx / (2 * it.m.y.k2.approx);
      if (tauStar > 0 && it.m.t0.approx + tauStar <= it.tEnd + 1e-9) yTop = Math.max(yTop, evalQuadN(it.m.y, tauStar));
    }
  }
  const span = Math.max(1, xMax - xMin, yTop);
  const margin = Math.max(0.5, 0.05 * span);
  const radius = Math.max(0.12, 0.02 * span);

  // THẤP(7): mốc scene prefix "__" — điểm xuất phát của vật là `${name}0`, vật tên "G" sẽ va id "G0".
  const points: Point3D[] = [
    { id: '__G0', label: '', x: xMin - margin, y: 0, z: 0 },
    { id: '__G1', label: '', x: xMax + margin, y: 0, z: 0 },
  ];
  const lines: Line3D[] = [{ id: 'ground', from: '__G0', to: '__G1', style: 'solid', color: '#8B8B8B' }];
  const curves: Curve3D[] = [];
  const agents: Agent3D[] = [];
  const tracks: AnimationTimeline['tracks'] = [];

  let ci = 0;
  for (const it of items) {
    const { m } = it;
    const color = COLORS[ci++ % COLORS.length];
    const label = plan.scene.labels?.[m.name] ?? m.name;
    points.push({ id: `${m.name}0`, label: `${label} (xuất phát)`, x: it.x0, y: 0, z: it.y0 });
    if (it.falling) {
      // Điểm chạm đất label TRẦN (F8) — giá trị số đã có trong answers[], scene v0 chỉ minh hoạ.
      points.push({ id: `${m.name}_dat`, label: 'Chạm đất', x: it.xEnd, y: 0, z: 0 });
      const N = 32, tauEnd = it.tEnd - m.t0.approx;
      const samples: { x: number; y: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const tau = (tauEnd * i) / N;
        samples.push({ x: evalQuadN(m.x, tau), y: evalQuadN(m.y, tau) });
      }
      // params: {} BẮT BUỘC (F9 — field required của Curve3D; thiếu là lỗi gate tsconfig.kernel.json).
      curves.push({ id: `traj_${m.name}`, type: 'expr', plane: 'xz', style: 'dashed', color, params: {}, samples });
    }
    agents.push({ id: m.name, label, initialPosition: [it.x0, 0, it.y0], color, radius });
    // VẾ PHẢI biểu thức theo GIÂY PLAYBACK kể từ track.start: bậc 1 nhân k, bậc 2 nhân k². t*t — KHÔNG t^2.
    const rhs = (q: Quad): string => {
      const c0 = q.k0.approx, c1 = q.k1.approx * k, c2 = q.k2.approx * k * k;
      let s = fmt(c0);
      if (c1 !== 0) s += ` + ${fmt(c1)}*t`;
      if (c2 !== 0) s += ` + ${fmt(c2)}*t*t`;
      return s;
    };
    tracks.push({
      id: `mv_${m.name}`, start: m.t0.approx / k, end: it.tEnd / k, type: 'parametric_path', targetId: m.name,
      params: {
        // AnimatedAgent ưu tiên equations (không qua bước split dấu phẩy); path giữ làm dự phòng + debug
        // (format module kinematic đã chứng minh render). equations chỉ chứa VẾ PHẢI.
        equations: { x: rhs(m.x), y: '0', z: rhs(m.y) },
        path: `x(t) = ${rhs(m.x)}, y(t) = 0, z(t) = ${rhs(m.y)}`,
        landing_point: [it.xEnd, 0, it.yEnd],   // BẮT BUỘC: thiếu là agent nhảy về vị trí đầu sau track.end
        timeScale: k,
      },
    });
  }

  const geometry: GeometryData = {
    name: plan.problemName, axisUnit: plan.units.length,
    tags: ['physics', `timeScale:${fmt(k)}`],
    points, lines, curves, agents,
    timeline: { duration: playback.durationSec, tracks },
  };
  return { geometry, playback };
}

export function buildCharts(
  plan: PhysicsPlan, motions: Map<string, Motion>, tPhys: number, events: { t: number; label: string; value?: number }[],
): PhysicsChart[] {
  const out: PhysicsChart[] = [];
  for (const ch of plan.charts) {
    const series: PhysicsChart['series'] = [];
    for (const name of ch.of) {
      const m = motions.get(name);
      if (!m) continue;
      const base = mainAxis(m) === 'y' ? m.y : m.x;
      const q = ch.kind === 'x_t' ? base : derivQuad(base);
      const t0 = m.t0.approx;
      // VỪA-2: cửa sổ vẽ kết thúc TRƯỚC khi vật xuất phát (tPhys ≤ t0) ⇒ bỏ series — nếu không,
      // (tPhys − t0) < 0 làm samples đi LÙI ([[2,50],[1,54]]). Kẹp đoạn vẽ về [t0, max].
      if (tPhys <= t0 + EPS_T) continue;
      const N = Math.abs(q.k2.approx) < 1e-15 ? 1 : 64;   // tuyến tính → 2 mẫu là đủ
      const samples: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = t0 + ((tPhys - t0) * i) / N;
        samples.push([t, evalQuadN(q, t - t0)]);
      }
      series.push({ name, samples });
    }
    out.push({
      kind: ch.kind, tUnit: plan.units.time,
      vUnit: ch.kind === 'x_t' ? plan.units.length : `${plan.units.length}/${plan.units.time}`,
      series, events,
    });
  }
  return out;
}
