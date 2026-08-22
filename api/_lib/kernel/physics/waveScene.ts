// api/_lib/kernel/physics/waveScene.ts
// Trình bày (KHÔNG ảnh hưởng đáp) — spec §11.4–§11.6: WaveModel/SoundModel → GeometryData.
//  - Sóng truyền (A, ω, spaceK): ANIMATE — Curve3D dạng sóng t=0 (65 mẫu) + 9 phần tử dao động DỌC
//    (Agent parametric_path, equations.z = A·cos(ω·k·t + pha_tĩnh)); thiếu dữ kiện ⇒ TĨNH (trục + agent VTCB).
//  - Sóng dừng / giao thoa / sóng âm: TĨNH (nút/bụng, nguồn/điểm khảo sát) — v1.
// LABEL TRẦN toàn bộ (F8/OS-1): KHÔNG nhúng giá trị (đề cho hay engine tính) vào bất kỳ nhãn nào.
// 4 ràng buộc cú pháp §2.2: KHÔNG '^', KHÔNG dấu phẩy trong biểu thức, KHÔNG 'x_start/…/vz', KHÔNG '='.
import type { GeometryData, Point3D, Line3D, Agent3D, Curve3D, AnimationTimeline } from '../../../../src/types/geometry';
import type { WaveModel, SoundModel, BaseLen } from './waves';
import { approxP } from './piScalar';

const COLORS = ['#38BDF8', '#F472B6', '#4ADE80', '#FFA500'];
const rnd = (n: number): number => parseFloat(n.toFixed(6));
const num9 = (x: number): string => {
  const s = parseFloat(x.toPrecision(12)).toString();
  return s.includes('e') || s.includes('E') ? x.toFixed(9) : s;
};

export type WaveChart = { kind: 'u_x' | 'u_t'; xUnit: string; yUnit: string; series: { name: string; samples: [number, number][] }[] };

export function playbackOf(tPhys: number, durationSec?: number): { durationSec: number; timeScale: number } {
  if (durationSec) return { durationSec, timeScale: tPhys / durationSec };
  if (tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}

// z = A·cos((ω·k)·t + phaTĩnh) — bake hằng ≥9 chữ số; '+ -0.78' là JS hợp lệ (quirk kinematic đã kiểm §11.5).
function cosExpr(A: number, wk: number, phaStatic: number): string {
  const p = num9(Math.abs(phaStatic));
  const sign = phaStatic < 0 ? '-' : '+';
  return `${num9(A)}*Math.cos(${num9(wk)}*t ${sign} ${p})`;
}

function animatable(m: WaveModel): boolean {
  return m.A !== null && m.omega !== null && m.spaceK !== null
    && Number.isFinite(m.A.approx) && Number.isFinite(approxP(m.omega)) && Number.isFinite(approxP(m.spaceK)) && m.lambda !== null && Number.isFinite(m.lambda.approx) && m.lambda.approx > 0;
}

export function buildWaveScene(
  problemName: string, base: BaseLen, waves: WaveModel[], sounds: SoundModel[], tPhys: number, durationSec?: number,
): { geometry: GeometryData | null; playback: { durationSec: number; timeScale: number } } {
  const playback = playbackOf(tPhys, durationSec);
  const k = playback.timeScale;
  const points: Point3D[] = [];
  const lines: Line3D[] = [];
  const curves: Curve3D[] = [];
  const agents: Agent3D[] = [];
  const tracks: AnimationTimeline['tracks'] = [];
  let ci = 0;

  for (const m of waves) {
    const color = COLORS[ci % COLORS.length];
    if (animatable(m)) {
      const A = m.A.approx, lam = m.lambda.approx, wn = approxP(m.omega), phin = m.phi ? approxP(m.phi) : 0;
      // Đường sóng tĩnh t=0 trên x ∈ [0, 2λ] (65 mẫu) — u(x,0) = A·cos(−dir·spaceK·x + φ).
      const spK = approxP(m.spaceK);
      const samples: { x: number; y: number }[] = [];
      for (let i = 0; i <= 64; i++) { const x = (2 * lam * i) / 64; samples.push({ x: rnd(x), y: rnd(A * Math.cos(-m.dir * spK * x + phin)) }); }
      curves.push({ id: `waveform_${m.name}`, type: 'expr', plane: 'xz', style: 'solid', color, params: {}, samples });
      // 9 phần tử tại x_j = j·λ/8 (j=0..8) dao động DỌC.
      const radius = Math.max(0.12, 0.02 * Math.max(1, 2 * A));
      for (let j = 0; j <= 8; j++) {
        const xj = rnd((j * lam) / 8);
        const phaStatic = -m.dir * spK * xj + phin;
        const z0 = rnd(A * Math.cos(phaStatic));
        const id = `p${j}_${m.name}`;
        agents.push({ id, label: '', initialPosition: [xj, 0, z0], color, radius });
        const zLand = rnd(A * Math.cos(wn * tPhys + phaStatic));
        tracks.push({
          id: `mv_${id}`, start: 0, end: playback.durationSec, type: 'parametric_path', targetId: id,
          params: { equations: { x: num9(xj), y: '0', z: cosExpr(A, wn * k, phaStatic) }, path: `phan tu song ${m.name}`, landing_point: [xj, 0, zLand], timeScale: k },
        });
      }
    } else {
      // TĨNH: trục truyền + agent tại gốc (sóng dừng/giao thoa/thiếu dữ kiện animate).
      const span = m.lambda && Number.isFinite(m.lambda.approx) ? Math.max(1, 2 * m.lambda.approx) : 1;
      points.push({ id: `O_${m.name}`, label: '', x: 0, y: 0, z: 0 });
      points.push({ id: `E_${m.name}`, label: '', x: rnd(span), y: 0, z: 0 });
      lines.push({ id: `truc_${m.name}`, from: `O_${m.name}`, to: `E_${m.name}`, style: 'solid', color: '#8B8B8B' });
    }
    ci++;
  }

  // Sóng âm TĨNH: nguồn O tại gốc (điểm khảo sát để v-next — nhãn trần).
  for (const s of sounds) {
    points.push({ id: `src_${s.name}`, label: '', x: 0, y: 0, z: 0 });
  }

  if (points.length === 0 && agents.length === 0 && curves.length === 0) return { geometry: null, playback };
  const geometry: GeometryData = {
    name: problemName, axisUnit: base, tags: ['physics', 'song', `timeScale:${num9(k)}`],
    points, lines, curves, agents, timeline: { duration: playback.durationSec, tracks },
  };
  return { geometry, playback };
}

// Charts: u_x (u(x,0) trên [0,2λ]) + u_t (u(0,t) trên [0,2T]) — 129 mẫu, cho sóng truyền animate được.
export function buildWaveCharts(base: BaseLen, waves: WaveModel[], tPhys: number): WaveChart[] {
  const ux: WaveChart['series'] = [];
  const ut: WaveChart['series'] = [];
  for (const m of waves) {
    if (!animatable(m)) continue;
    const A = m.A.approx, lam = m.lambda.approx, wn = approxP(m.omega), spK = approxP(m.spaceK), phin = m.phi ? approxP(m.phi) : 0;
    const T = m.T && Number.isFinite(m.T.approx) ? m.T.approx : (wn > 0 ? 2 * Math.PI / wn : 1);
    const sx: [number, number][] = [];
    const st: [number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const x = (2 * lam * i) / 128; sx.push([rnd(x), rnd(A * Math.cos(-m.dir * spK * x + phin))]);
      const t = (2 * T * i) / 128; st.push([rnd(t), rnd(A * Math.cos(wn * t + phin))]);
    }
    ux.push({ name: m.name, samples: sx });
    ut.push({ name: m.name, samples: st });
  }
  const out: WaveChart[] = [];
  if (ux.length) out.push({ kind: 'u_x', xUnit: base, yUnit: base, series: ux });
  if (ut.length) out.push({ kind: 'u_t', xUnit: 's', yUnit: base, series: ut });
  return out;
}
