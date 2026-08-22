// src/components/simulate/sampleResults.ts
// ─────────────────────────────────────────────────────────────────────────────
// Kết quả mẫu (SubjectResult) đúng shape route `/api/analyze-problem` — dùng chung cho DEMO + TEST
// (cảnh trong test = cảnh trong demo, không lệch). Dựng THỦ CÔNG khớp cách engine phát:
//   • Lý: scene = { geometry, charts, playback, units, tPhys } — geometry mang agents + timeline
//     (mirror api/_lib/kernel-bridge/solveSubject.js · solvePhysicsPlan).
//   • Hóa: scene = ChemScene trực tiếp (mirror solveChemPlan) — tái dùng cảnh Fe+CuSO₄ có sẵn.
// Answers giữ ĐÚNG shape engine: Lý = PhysicsAnswer {label,kind,text,approx,unit,approximate};
// Hóa = ChemAnswer {query?,exact,approx,unit,text}.
// ─────────────────────────────────────────────────────────────────────────────
import type { GeometryData } from '@/types/geometry';
import type { SubjectResult } from '@/hooks/useSubjectSolver';
import { sceneFeCuSO4Color } from '@/components/chem/sampleScenes';

// ── LÝ: ném ngang từ độ cao 20 m, v₀ = 10 m/s, g = 10 m/s² ────────────────────
// x(t) = 10t · z(t) = 20 − 5t² · chạm đất t = 2 s, tầm xa 20 m, v chạm = 10√5 ≈ 22,36 m/s.
function projectileSamples(): { x: number; y: number }[] {
  const N = 16;
  const tEnd = 2;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = (tEnd * i) / N;
    out.push({ x: 10 * t, y: 20 - 5 * t * t }); // {x = ngang, y = cao} (quy ước Curve samples của engine)
  }
  return out;
}

const projectileGeometry: GeometryData = {
  name: 'Ném ngang từ độ cao 20 m',
  axisUnit: 'm',
  tags: ['physics', 'timeScale:1'],
  points: [
    { id: '__G0', label: '', x: -2, y: 0, z: 0 },
    { id: '__G1', label: '', x: 22, y: 0, z: 0 },
    { id: 'vat0', label: 'Vật (xuất phát)', x: 0, y: 0, z: 20 },
    { id: 'vat_dat', label: 'Chạm đất', x: 20, y: 0, z: 0 },
  ],
  lines: [{ id: 'ground', from: '__G0', to: '__G1', style: 'solid', color: '#8B8B8B' }],
  curves: [
    { id: 'traj_vat', type: 'expr', plane: 'xz', style: 'dashed', color: '#FFA500', params: {}, samples: projectileSamples() },
  ],
  agents: [
    { id: 'vat', label: 'Vật', initialPosition: [0, 0, 20], color: '#FFA500', radius: 0.12 },
  ],
  timeline: {
    duration: 2,
    tracks: [
      {
        id: 'mv_vat', start: 0, end: 2, type: 'parametric_path', targetId: 'vat',
        params: {
          equations: { x: '10*t', y: '0', z: '20 - 5*t*t' },
          path: 'x(t) = 10*t, y(t) = 0, z(t) = 20 - 5*t*t',
          landing_point: [20, 0, 0],
          timeScale: 1,
        },
      },
    ],
  },
};

/** LÝ · ok:true — cảnh ném ngang + 3 đáp số đã kiểm chứng. */
export const samplePhysicsResult: SubjectResult = {
  subject: 'physics',
  mode: 'engine',
  ok: true,
  answers: [
    { label: 'Thời gian chạm đất', kind: 'time_to_ground', text: '2 s', approx: 2, unit: 's', approximate: false },
    { label: 'Tầm xa', kind: 'position_when_ground', text: '20 m', approx: 20, unit: 'm', approximate: false },
    { label: 'Vận tốc chạm đất', kind: 'impact_velocity', text: '10√5 m/s', approx: 22.360679, unit: 'm/s', approximate: false },
  ],
  violations: [],
  errors: [],
  trace: [
    'v_x = 10 m/s không đổi; v_z = −g·t',
    'z(t) = 20 − 5t² ⇒ z(2) = 0 (thay ngược ✓)',
    'x(2) = 20 m; |v(2)| = √(10² + 20²) = 10√5 m/s',
  ],
  scene: {
    geometry: projectileGeometry,
    charts: [],
    playback: { durationSec: 2, timeScale: 1 },
    units: { length: 'm', time: 's' },
    tPhys: 2,
  },
  checks: [
    { kind: 'substitute_back', detail: 'z(t_ground)=0', residual: 0, pass: true },
  ],
  meta: { tPhys: 2, playback: { durationSec: 2, timeScale: 1 }, units: { length: 'm', time: 's' } },
};

/** LÝ · ok:false — bộ dịch tự khước từ (đề thiếu số liệu) để khoe nhánh "ngoài phạm vi". */
export const samplePhysicsAbstain: SubjectResult = {
  subject: 'physics',
  mode: 'engine',
  ok: false,
  abstained: true,
  answers: [],
  violations: [],
  errors: [{ message: 'translator abstained: đề chưa cho vận tốc đầu / gia tốc — không đủ dữ kiện để mô hình hoá.' }],
  trace: [],
  scene: null,
};

// ── HÓA: Fe + CuSO₄ → FeSO₄ + Cu↓ (tái dùng cảnh có sẵn) ─────────────────────
/** HÓA · ok:true — cảnh đổi màu + kết tủa Cu, kèm phương trình / hiện tượng / khối lượng Cu. */
export const sampleChemResult: SubjectResult = {
  subject: 'chem',
  mode: 'engine',
  ok: true,
  answers: [
    { query: { kind: 'equation' }, kind: 'equation', text: 'Fe + CuSO₄ → FeSO₄ + Cu↓', exact: null, approx: null, unit: '' },
    {
      query: { kind: 'phenomena' }, kind: 'phenomena',
      text: 'Đinh sắt tan dần; dung dịch CuSO₄ xanh lam nhạt màu rồi mất màu; lớp đồng đỏ bám lên đinh sắt.',
      exact: null, approx: null, unit: '',
    },
    { query: { kind: 'mass', of: 'Cu' }, kind: 'mass', text: 'm(Cu) = 6,4 g', exact: '32/5', approx: 6.4, unit: 'g' },
  ],
  violations: [],
  errors: [],
  trace: ['record R20: Fe + CuSO4 → FeSO4 + Cu', 'ξ = 1/10 mol'],
  scene: sceneFeCuSO4Color, // shape THỰC của route: scene CHÍNH LÀ ChemScene (có .vessels)
  reactions: [{ id: 'R20', equation: 'Fe + CuSO4 → FeSO4 + Cu', coefficients: [1, 1, 1, 1] }],
  ledger: [],
  noReaction: null,
};
