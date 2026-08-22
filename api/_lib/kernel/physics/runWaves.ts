// api/_lib/kernel/physics/runWaves.ts
// Entry RIÊNG runWaves — soi gương runOscillation/runDynamics/runCircuit: schema riêng (WavePlanSchema),
// giải riêng, KHÔNG đụng run()/planSchema/runPhysics/kinematics v0. LLM chỉ DỊCH đề → plan; engine GIẢI
// công thức đóng trên (hữu tỉ+căn)·πᵏ + đếm nghiệm nguyên bigint + log10 tách nhánh; TỰ KIỂM (thay-ngược,
// đếm-hai-cách, hệ thức độc lập); XUẤT scene/charts; sai mô hình ⇒ violations/errors, KHÔNG bịa đáp.
// Contract chung {ok, answers, checks, violations, errors, geometry, charts, meta} (mirror runOscillation).
// OS-2 (KHÔNG bao giờ throw): refine zod chặn suy biến; guard null ⇒ errors; try/catch lưới cuối đổi mọi
// Error còn lọt (divExact mẫu 0…) thành errors[] tiếng Việt — KHÔNG ném ra route/bridge.
import { WavePlanSchema, type WavePlan, type WaveQuery } from './waveSchema';
import {
  resolveWaveModel, resolveSoundModel, computeWaveQuery, computeSoundQuery,
  PHYSICAL_VIOLATIONS, SOUND_KINDS,
  type WaveAns, type Check, type Violation, type SolvedWave, type SolvedSound, type WaveModel, type BaseLen,
} from './waves';
import { buildWaveScene, buildWaveCharts, type WaveChart } from './waveScene';
import { toPiScalar, approxP } from './piScalar';
import type { GeometryData } from '../../../../src/types/geometry';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn; LLM override qua asserts[].tol

export type WaveViolation = { assert?: string; id?: string; message: string; expected?: number; got?: number; delta?: number };
export type WaveResult = {
  ok: boolean;
  answers: WaveAns[];
  checks: Check[];
  violations: WaveViolation[];
  errors: { message: string }[];
  geometry: GeometryData | null;
  charts: WaveChart[];
  meta: {
    tPhys: number;
    playback: { durationSec: number; timeScale: number };
    unitsNote: 'per-quantity';
    length: BaseLen;
    models: { name: string; kind: 'wave' | 'sound'; animated: boolean }[];
  };
};

const ZERO_PLAYBACK = { durationSec: 0, timeScale: 1 };

function timeOfQuery(q: WaveQuery): number | null {
  if (q.kind === 'displacement_at') return approxP(toPiScalar(q.t));
  return null;
}

export function runWaves(raw: unknown): WaveResult {
  const parsed = WavePlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join('.')}: ` : ''}${iss.message}` : 'schema';
    return {
      ok: false, answers: [], checks: [], violations: [], errors: [{ message: `Invalid wave plan: ${detail}` }],
      geometry: null, charts: [], meta: { tPhys: 0, playback: ZERO_PLAYBACK, unitsNote: 'per-quantity', length: 'm', models: [] },
    };
  }
  const plan: WavePlan = parsed.data;
  const base: BaseLen = plan.units.length;

  const errors: WaveResult['errors'] = [];
  const checks: Check[] = [];
  const violations: WaveViolation[] = [];
  const answers: WaveAns[] = [];
  let geometry: GeometryData | null = null;
  let charts: WaveChart[] = [];
  let playback = { ...ZERO_PLAYBACK };
  let tPhys = 0;
  const waveByName = new Map<string, SolvedWave>();
  const soundByName = new Map<string, SolvedSound>();

  try {
    // 1) Chuẩn hoá op → model (+ auto-assert nguồn dư). Tách bản đồ theo LOẠI op (dispatch OS-6).
    // Violations gom SAU (bước 5b) vì query-time cũng push vào solved.violations (khong-song-dung, lambda-vo-ti).
    for (const op of plan.ops) {
      if (op.op === 'wave') {
        const s = resolveWaveModel(op, base);
        waveByName.set(op.name, s);
        checks.push(...s.checks);
        for (const e of s.errors) errors.push({ message: e.message });
      } else {
        const s = resolveSoundModel(op, base);
        soundByName.set(op.name, s);
        checks.push(...s.checks);
        for (const e of s.errors) errors.push({ message: e.message });
      }
    }

    // 2) Queries — dispatch đúng loại op; sai loại ⇒ error rõ (OS-6). Tự kiểm ghi checks[].
    for (const [qi, q] of plan.queries.entries()) {
      const r = dispatchQuery(q, waveByName, soundByName, base);
      if (r.ok === false) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
      answers.push({ ...r.answer, queryIndex: qi });
      checks.push(...r.checks);
      for (const c of r.checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
      if (r.tSolved !== undefined && Number.isFinite(r.tSolved)) tPhys = Math.max(tPhys, r.tSolved);
    }

    // 3) Chân trời vật lý T_phys = max(2T mọi sóng, mọi t trong queries, 1).
    for (const s of waveByName.values()) if (s.model.T && Number.isFinite(s.model.T.approx)) tPhys = Math.max(tPhys, 2 * s.model.T.approx);
    for (const q of plan.queries) { const t = timeOfQuery(q); if (t !== null && Number.isFinite(t)) tPhys = Math.max(tPhys, t); }
    tPhys = tPhys > 1e-9 ? tPhys : 1;

    // 4) Asserts khai báo (dữ kiện DƯ) — lệch quá tol ⇒ violations (mô hình dịch sai đề).
    for (const a of plan.asserts) {
      const r = dispatchQuery(a.query, waveByName, soundByName, base);
      if (r.ok === false) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
      const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
      const delta = Math.abs(r.answer.approx - a.equals);
      if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta, message: `assert ${a.query.kind}: kỳ vọng ${a.equals}, engine tính ${r.answer.approx}` });
    }
    // 5b) Gom violation từ solved (resolve-time nguon-du-lech + query-time khong-song-dung/lambda-vo-ti).
    for (const s of waveByName.values()) for (const v of s.violations) violations.push({ id: v.id, message: v.message });
    for (const s of soundByName.values()) for (const v of s.violations) violations.push({ id: v.id, message: v.message });
  } catch (err) {
    errors.push({ message: `lỗi engine sóng: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Violation VẬT LÝ (nguồn dư lệch, không sóng dừng, λ vô tỉ) ⇒ KHÔNG serve đáp (không bịa).
  const hasPhysicalViolation = violations.some((v) => v.id !== undefined && PHYSICAL_VIOLATIONS.has(v.id));
  const servedAnswers = hasPhysicalViolation ? [] : answers;

  // 5) Scene + charts — trình bày thuần (guard riêng: scene lỗi KHÔNG phá OS-2). Chỉ dựng khi hệ giải sạch.
  const okState = violations.length === 0 && errors.length === 0;
  if (okState) {
    try {
      const waves: WaveModel[] = [...waveByName.values()].map((s) => s.model);
      const sounds = [...soundByName.values()].map((s) => s.model);
      const built = buildWaveScene(plan.problemName, base, waves, sounds, tPhys);
      geometry = built.geometry;
      playback = built.playback;
      charts = buildWaveCharts(base, waves, tPhys);
    } catch (err) {
      errors.push({ message: `lỗi dựng cảnh sóng: ${err instanceof Error ? err.message : String(err)}` });
      geometry = null;
    }
  }

  const models: WaveResult['meta']['models'] = [];
  for (const op of plan.ops) {
    if (op.op === 'wave') { const m = waveByName.get(op.name).model; models.push({ name: op.name, kind: 'wave', animated: m.A !== null && m.omega !== null && m.spaceK !== null }); }
    else models.push({ name: op.name, kind: 'sound', animated: false });
  }

  const ok = violations.length === 0 && errors.length === 0
    && servedAnswers.length === plan.queries.length && servedAnswers.every((a) => Number.isFinite(a.approx));
  return {
    ok, answers: servedAnswers, checks, violations, errors, geometry, charts,
    meta: { tPhys, playback, unitsNote: 'per-quantity', length: base, models },
  };
}

// Dispatch một query tới đúng loại op; sai loại ⇒ {ok:false, problem} tường minh (OS-6).
function dispatchQuery(
  q: WaveQuery, waveByName: Map<string, SolvedWave>, soundByName: Map<string, SolvedSound>, base: BaseLen,
): ReturnType<typeof computeWaveQuery> {
  const of = 'of' in q ? (q as { of: string }).of : undefined;
  if (SOUND_KINDS.has(q.kind)) {
    const s = soundByName.get(of);
    if (!s) return { ok: false, problem: waveByName.has(of) ? `query ${q.kind} trỏ "${of}" — sai loại op (cần sound_source)` : `op "${of}" không tồn tại` };
    return computeSoundQuery(s, q, base);
  }
  const s = waveByName.get(of);
  if (!s) return { ok: false, problem: soundByName.has(of) ? `query ${q.kind} trỏ "${of}" — sai loại op (cần wave)` : `op "${of}" không tồn tại` };
  return computeWaveQuery(s, q, base);
}
