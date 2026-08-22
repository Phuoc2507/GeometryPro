// api/_lib/kernel/physics/dynamicsScene.ts
// Trình bày (KHÔNG ảnh hưởng đáp): Solved → GeometryData. Tối giản theo F8/§10:
//  - phần tĩnh (mặt đất/mặt nghiêng/bàn+ròng rọc) = Point3D label TRẦN + Line3D (KHÔNG cần Curve3D);
//  - vật trượt = Agent3D + timeline parametric_path theo phương chuyển động;
//  - 3 quirk frontend giữ nguyên v0: path dùng `t*t` (KHÔNG t^2); landing_point BẮT BUỘC mọi track;
//    trục đứng vật lý → z geo3d, y = 0; equations phát VẾ PHẢI; timeScale = k.
// TUYỆT ĐỐI không nhúng giá trị engine tính vào label (F8 — mọi giá trị nằm ở answers[]).
import type { GeometryData, Point3D, Line3D, Agent3D, AnimationTimeline } from '../../../../src/types/geometry';
import type { DynamicsPlan } from './dynamicsSchema';
import type { Solved, BodyState } from './dynamics';

const COLORS = ['#FFA500', '#38BDF8', '#F472B6', '#4ADE80'];
const fmt = (n: number): string => parseFloat(n.toFixed(6)).toString();
const rnd = (n: number): number => parseFloat(n.toFixed(6)); // gọn toạ độ trình bày (bỏ nhiễu 1e-15)

export type DynamicsChart = {
  kind: 'x_t' | 'v_t';
  tUnit: string; vUnit: string;
  series: { name: string; samples: [number, number][] }[];
};

// Quy tắc playback (§10.2, y v0 §8.2): giây thật khi 3 ≤ T ≤ 15; ngoài ra nén/kéo về 10 s.
export function playbackOf(plan: DynamicsPlan, tPhys: number): { durationSec: number; timeScale: number } {
  if (plan.scene.durationSec) return { durationSec: plan.scene.durationSec, timeScale: tPhys / plan.scene.durationSec };
  if (tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}

// VẾ PHẢI biểu thức theo GIÂY PLAYBACK: bậc 1 nhân k, bậc 2 nhân k². t*t — KHÔNG t^2. c0 luôn phát.
function rhs(c0: number, c1: number, c2: number, k: number): string {
  let s = fmt(c0);
  if (c1 * k !== 0) s += ` + ${fmt(c1 * k)}*t`;
  if (c2 * k * k !== 0) s += ` + ${fmt(c2 * k * k)}*t*t`;
  return s;
}

export function buildDynamicsScene(
  plan: DynamicsPlan, solved: Solved, tPhys: number,
): { geometry: GeometryData | null; playback: { durationSec: number; timeScale: number } } {
  const playback = playbackOf(plan, tPhys);
  const k = playback.timeScale;
  const bodies = [...solved.bodies.values()];
  if (bodies.length === 0) return { geometry: null, playback };

  const points: Point3D[] = [];
  const lines: Line3D[] = [];
  const agents: Agent3D[] = [];
  const tracks: AnimationTimeline['tracks'] = [];
  const labelOf = (b: BodyState): string => plan.scene.labels?.[b.name] ?? b.name;

  const twoBody = bodies.length === 2;
  let xMin = 0, xMax = 1, zTop = 1;

  if (!twoBody) {
    const b = bodies[0];
    const tEnd = b.tStop !== null ? Math.min(tPhys, b.tStop) : tPhys;
    const aN = b.aN ?? 0, v0N = b.v0N;
    const sOf = (t: number): number => v0N * t + 0.5 * aN * t * t; // quãng đường dọc phương chuyển động

    if (b.config === 'nghieng') {
      const sinT = b.sinTN ?? Math.sin(((b.theta ?? 30) * Math.PI) / 180);
      const cosT = b.cosTN ?? Math.cos(((b.theta ?? 30) * Math.PI) / 180);
      const down = (b.op.motion ?? 'down') === 'down';
      const sTotal = Math.max(0.001, sOf(tEnd));
      const H = rnd(sTotal * sinT), xEnd = rnd(sTotal * cosT);
      // Xuống dốc: đỉnh (0,0,H) → chân (xEnd,0,0). Lên dốc: chân (0,0,0) → đỉnh (xEnd,0,H).
      const top: [number, number, number] = down ? [0, 0, H] : [xEnd, 0, H];
      const bot: [number, number, number] = down ? [xEnd, 0, 0] : [0, 0, 0];
      const start = down ? top : bot, land = down ? bot : top;
      points.push({ id: 'dinh', label: '', x: down ? 0 : xEnd, y: 0, z: H });
      points.push({ id: 'chan', label: '', x: down ? xEnd : 0, y: 0, z: 0 });
      lines.push({ id: 'doc', from: 'dinh', to: 'chan', style: 'solid', color: '#8B8B8B' });
      xMin = 0; xMax = xEnd; zTop = H;
      const color = COLORS[0];
      agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
      // x(τ) = s(τ)·cosθ (down: +; up: từ xEnd giảm ⇒ dùng dấu theo hướng). z(τ) = H ∓ s·sinθ.
      const sgnX = down ? 1 : -1, sgnZ = down ? -1 : 1;
      const x0 = start[0], z0 = start[2];
      tracks.push({
        id: `mv_${b.name}`, start: 0, end: tEnd / k, type: 'parametric_path', targetId: b.name,
        params: {
          equations: {
            x: rhs(x0, sgnX * v0N * cosT, sgnX * 0.5 * aN * cosT, k),
            y: '0',
            z: rhs(z0, sgnZ * v0N * sinT, sgnZ * 0.5 * aN * sinT, k),
          },
          path: `mặt nghiêng ${b.theta}°`,
          landing_point: land,
          timeScale: k,
        },
      });
    } else {
      // Ngang: agent chạy dọc x, z = 0.
      const xEnd = rnd(sOf(tEnd));
      xMin = Math.min(0, xEnd); xMax = Math.max(1, xEnd); zTop = 1;
      const color = COLORS[0];
      agents.push({ id: b.name, label: labelOf(b), initialPosition: [0, 0, 0], color, radius: 0.14 });
      if (b.a !== undefined) {
        tracks.push({
          id: `mv_${b.name}`, start: 0, end: tEnd / k, type: 'parametric_path', targetId: b.name,
          params: {
            equations: { x: rhs(0, v0N, 0.5 * aN, k), y: '0', z: '0' },
            path: 'mặt ngang',
            landing_point: [xEnd, 0, 0],
            timeScale: k,
          },
        });
      }
    }
  } else {
    // Hệ 2 vật: xà ngang + điểm ròng rọc; agents hai bên chuyển động ngược nhau. Tĩnh thuần vị trí.
    const atwood = solved.meta.config === 'atwood';
    const tEnd = tPhys;
    const H0 = 4;
    points.push({ id: 'rr', label: '', x: 0, y: 0, z: H0 }); // ròng rọc
    xMin = -2; xMax = 2; zTop = H0;
    let ci = 0;
    for (const b of bodies) {
      const color = COLORS[ci % COLORS.length];
      const aN = b.aN ?? 0;
      const down = b.motionDesc === 'di-xuong';
      if (atwood) {
        const x = ci === 0 ? -1.5 : 1.5;
        const start: [number, number, number] = [x, 0, H0 - 1];
        agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
        const sgnZ = down ? -1 : 1;
        const land: [number, number, number] = [x, 0, (H0 - 1) + sgnZ * 0.5 * aN * tEnd * tEnd];
        tracks.push({ id: `mv_${b.name}`, start: 0, end: tEnd / k, type: 'parametric_path', targetId: b.name, params: { equations: { x: fmt(x), y: '0', z: rhs(H0 - 1, 0, sgnZ * 0.5 * aN, k) }, path: 'Atwood', landing_point: land, timeScale: k } });
      } else {
        // bàn + treo: vật ngang chạy +x trên mặt bàn (z=H0); vật treo rơi −z ở mép bàn.
        if (b.config === 'ngang') {
          const start: [number, number, number] = [-1.5, 0, H0];
          points.push({ id: 'ban0', label: '', x: -2, y: 0, z: H0 });
          points.push({ id: 'ban1', label: '', x: 0, y: 0, z: H0 });
          lines.push({ id: 'ban', from: 'ban0', to: 'ban1', style: 'solid', color: '#8B8B8B' });
          agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
          const land: [number, number, number] = [-1.5 + 0.5 * aN * tEnd * tEnd, 0, H0];
          tracks.push({ id: `mv_${b.name}`, start: 0, end: tEnd / k, type: 'parametric_path', targetId: b.name, params: { equations: { x: rhs(-1.5, 0, 0.5 * aN, k), y: '0', z: fmt(H0) }, path: 'mặt bàn', landing_point: land, timeScale: k } });
        } else {
          const start: [number, number, number] = [0, 0, H0 - 1];
          agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
          const land: [number, number, number] = [0, 0, (H0 - 1) - 0.5 * aN * tEnd * tEnd];
          tracks.push({ id: `mv_${b.name}`, start: 0, end: tEnd / k, type: 'parametric_path', targetId: b.name, params: { equations: { x: '0', y: '0', z: rhs(H0 - 1, 0, -0.5 * aN, k) }, path: 'vật treo', landing_point: land, timeScale: k } });
        }
      }
      ci++;
    }
  }

  // Mặt đất (mọi cấu hình đơn) — 2 điểm label trần.
  const margin = Math.max(0.5, 0.05 * Math.max(1, xMax - xMin, zTop));
  points.push({ id: 'G0', label: '', x: xMin - margin, y: 0, z: 0 });
  points.push({ id: 'G1', label: '', x: xMax + margin, y: 0, z: 0 });
  lines.push({ id: 'ground', from: 'G0', to: 'G1', style: 'solid', color: '#8B8B8B' });

  const geometry: GeometryData = {
    name: plan.problemName,
    axisUnit: 'm',
    tags: ['physics', `timeScale:${fmt(k)}`],
    points, lines, curves: [], agents,
    timeline: { duration: playback.durationSec, tracks },
  };
  return { geometry, playback };
}

export function buildDynamicsCharts(plan: DynamicsPlan, solved: Solved, tPhys: number): DynamicsChart[] {
  const out: DynamicsChart[] = [];
  for (const ch of plan.charts) {
    const series: DynamicsChart['series'] = [];
    for (const name of ch.of) {
      const b = solved.bodies.get(name);
      if (!b || b.a === undefined) continue;
      const aN = b.aN ?? 0, v0N = b.v0N;
      const tEnd = b.tStop !== null ? Math.min(tPhys, b.tStop) : tPhys;
      const N = ch.kind === 'v_t' ? 1 : 64; // v-t tuyến tính → 2 mẫu
      const samples: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (tEnd * i) / N;
        samples.push([t, ch.kind === 'x_t' ? v0N * t + 0.5 * aN * t * t : v0N + aN * t]);
      }
      series.push({ name, samples });
    }
    out.push({ kind: ch.kind, tUnit: 's', vUnit: ch.kind === 'x_t' ? 'm' : 'm/s', series });
  }
  return out;
}
