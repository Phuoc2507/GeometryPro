// src/components/simulate/PhysicsSceneView.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PhysicsSceneView — "sân khấu" 2D (SVG) cho đề VẬT LÝ động học lớp 10.
//
// VÌ SAO SVG 2D (không tái dùng GeometryCanvas / không dựng @react-three/fiber riêng):
//   1. Cảnh Lý do engine phát (api/_lib/kernel/physics/scene.ts · buildScene) là PHẲNG: mọi điểm y=0,
//      chuyển động nằm trong mặt phẳng đứng (x ngang, z cao). Chiếu (x,z) ra SVG là biểu diễn TRUNG THÀNH,
//      rõ ràng hơn xoay một cảnh 3D dẹt.
//   2. GeometryCanvas đọc TẤT CẢ từ GeometryContext (không nhận prop geometry); muốn feed cảnh Lý phải bọc
//      GeometryProvider — mà provider đó GỌI CỨNG useAuth()/useGeometryHistory(), đụng localStorage/URL/
//      supabase. Kéo cả AuthProvider vào "mảnh độc lập" là quá xâm lấn/rủi ro. Hơn nữa agent chỉ nhúc nhích
//      khi có AnimationProvider + đồng hồ rAF chạy (GeometryCanvas không tự kèm) → thêm mắt xích nữa.
//   3. Test chạy `environment: node`/jsdom (KHÔNG WebGL) ⇒ <Canvas> r3f không render nổi; nghiệm thu cần
//      test render xanh. SVG render tốt trong jsdom (như ChemSceneView đã chứng minh).
//   4. Đồng bộ trải nghiệm với ChemSceneView (cùng "sân khấu 2D + thanh tua") cho Lý và Hóa.
//
// TÁI DÙNG cách parse quỹ đạo của AnimatedAgent.tsx (parametric_path: equations|path, `t*t`, landing_point,
// ánh xạ geo3d↔three) nhưng ĐÁNH GIÁ tại mốc thời gian `tSec` TUA ĐƯỢC thay vì đồng hồ rAF toàn cục —
// nên hàm thuần, test đối chiếu vị trí trực tiếp (giống deriveVesselStates của Hóa).
//
// THUẦN: chỉ nhận props (geometry + prop điều khiển), KHÔNG fetch, KHÔNG context. Dark mode qua `dark:`.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent3D, AnimationTrack, GeometryData } from '@/types/geometry';

// ── Hàm THUẦN (export để test đối chiếu) ─────────────────────────────────────

/**
 * Vị trí geo3d {x,y,z} của một agent tại mốc `tSec` — TÁI DÙNG logic AnimatedAgent (parametric_path).
 * Trả TỌA ĐỘ GEO3D (không phải three): sân khấu chiếu (x = ngang, z = cao). Biểu thức hỏng ⇒ giữ vị trí nền.
 */
export function agentGeoPositionAt(
  agent: Agent3D,
  tracks: AnimationTrack[],
  tSec: number,
): { x: number; y: number; z: number } {
  let gx = agent.initialPosition?.[0] ?? 0;
  let gy = agent.initialPosition?.[1] ?? 0;
  let gz = agent.initialPosition?.[2] ?? 0;

  const agentTracks = (tracks || []).filter((t) => t.targetId === agent.id && t.type === 'parametric_path');
  for (const track of agentTracks) {
    if (tSec >= track.start && tSec <= track.end) {
      const dt = tSec - track.start;
      try {
        let eq = track.params.equations;
        if (!eq && track.params.path) {
          const parts = String(track.params.path).split(',').map((s) => s.trim());
          eq = {
            x: parts.find((p) => p.startsWith('x(t)'))?.split('=')[1]?.trim() || '0',
            y: parts.find((p) => p.startsWith('y(t)'))?.split('=')[1]?.trim() || '0',
            z: parts.find((p) => p.startsWith('z(t)'))?.split('=')[1]?.trim() || '0',
          };
        }
        if (eq) {
          // Mặc định biến gốc = vị trí nền (đúng chuẩn AnimatedAgent, diễn giải theo GEO).
          const cx = track.params.x_start !== undefined ? track.params.x_start : gx;
          const cy = track.params.y_start !== undefined ? track.params.y_start : gy;
          const cz = track.params.z_start !== undefined ? track.params.z_start : gz;
          const vx = track.params.vx || 0;
          const vy = track.params.vy || 0;
          const vz = track.params.vz || 0;
          const getVal = (expr: string): number => {
            const replaced = String(expr)
              .replace('x_start', String(cx))
              .replace('y_start', String(cy))
              .replace('z_start', String(cz))
              .replace('vx', String(vx))
              .replace('vy', String(vy))
              .replace('vz', String(vz))
              .replace(/t\^2/g, '(t*t)');
            // eslint-disable-next-line no-new-func -- cùng cách AnimatedAgent đánh giá biểu thức quỹ đạo của engine.
            const fn = new Function('t', `return ${replaced}`) as (t: number) => number;
            return Number(fn(dt));
          };
          gx = getVal(eq.x);
          gy = getVal(eq.y);
          gz = getVal(eq.z);
        }
      } catch {
        /* biểu thức hỏng ⇒ giữ vị trí nền, KHÔNG ném */
      }
    } else if (tSec > track.end) {
      // Sau khi kết thúc: đứng ở landing_point (bắt buộc mọi track của engine Lý).
      const lp = track.params.landing_point;
      if (lp) { gx = lp[0]; gy = lp[1]; gz = lp[2]; }
    }
  }
  return { x: gx, y: gy, z: gz };
}

/** Thời lượng playback (giây) của cảnh Lý: timeline.duration, hoặc mốc end lớn nhất, hoặc 0. */
export function physicsDuration(geometry: GeometryData | null | undefined): number {
  const tl = geometry?.timeline;
  if (tl?.duration && tl.duration > 0) return tl.duration;
  let max = 0;
  for (const t of tl?.tracks ?? []) max = Math.max(max, t.end ?? 0);
  return max;
}

type XV = { x: number; v: number }; // toạ độ DỮ LIỆU: x = ngang, v = cao (vertical)

/** Gom biên (bounds) mọi phần tử → khung nhìn; luôn kèm mặt đất v=0 + mẫu quỹ đạo agent. */
export interface PhysicsView {
  vw: number;
  vh: number;
  project: (x: number, v: number) => { px: number; py: number };
  duration: number;
}

export function computePhysicsView(geometry: GeometryData | null | undefined): PhysicsView | null {
  if (!geometry) return null;
  const pts: XV[] = [];
  const push = (x: number, v: number) => {
    if (Number.isFinite(x) && Number.isFinite(v)) pts.push({ x, v });
  };

  // Điểm: geo (x, z) = (ngang, cao).
  for (const p of geometry.points ?? []) push(Number(p.x), Number(p.z));
  // Đường cong quỹ đạo: sample {x = ngang, y = cao}.
  for (const c of geometry.curves ?? []) for (const s of c.samples ?? []) push(Number(s.x), Number(s.y));
  // Mặt cầu (vd phạm vi radar): tâm geo (x, z) ± bán kính.
  for (const sp of geometry.spheres ?? []) {
    const cx = Number(sp.center?.x), cv = Number(sp.center?.z), r = Number(sp.radius) || 0;
    push(cx - r, cv - r); push(cx + r, cv + r);
  }
  // Agent: lấy mẫu vị trí dọc thời lượng để quỹ đạo (dù không có curve) vẫn nằm trong khung.
  const duration = physicsDuration(geometry);
  const tracks = geometry.timeline?.tracks ?? [];
  for (const a of geometry.agents ?? []) {
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const t = duration > 0 ? (duration * i) / N : 0;
      const g = agentGeoPositionAt(a, tracks, t);
      push(g.x, g.z);
      if (duration <= 0) break;
    }
  }
  // Luôn tính cả mặt đất (v = 0) để đường chân trời nằm trong khung.
  push(0, 0);

  if (pts.length === 0) return null;

  let minX = Infinity, maxX = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minV = Math.min(minV, p.v); maxV = Math.max(maxV, p.v);
  }

  const pad = 30;
  const vw = 380;
  const maxVH = 440, minVH = 150;
  const dataW = Math.max(1e-6, maxX - minX);
  const dataV = Math.max(1e-6, maxV - minV);
  // Tỉ lệ ĐỒNG NHẤT (không méo): vừa bề rộng trước, cao theo sau; kẹp chiều cao.
  let scale = (vw - 2 * pad) / dataW;
  let vh = dataV * scale + 2 * pad;
  if (vh > maxVH) { scale = (maxVH - 2 * pad) / dataV; vh = maxVH; }
  vh = Math.max(minVH, vh);

  const project = (x: number, v: number) => ({
    px: pad + (x - minX) * scale,
    py: vh - pad - (v - minV) * scale, // lật trục: v lớn (cao) → py nhỏ (lên trên)
  });

  return { vw, vh, project, duration };
}

// ── Thanh điều khiển tua (View thuần) ────────────────────────────────────────
function PhysicsControls({
  tSec, duration, playing, onSeek, onTogglePlay, onReset, unit,
}: {
  tSec: number; duration: number; playing: boolean; unit: string;
  onSeek: (t: number) => void; onTogglePlay: () => void; onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-background/80 px-3 py-1.5 backdrop-blur">
      <button
        type="button"
        aria-label={playing ? 'Tạm dừng' : 'Chạy'}
        onClick={onTogglePlay}
        className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
      >
        {playing ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
      </button>
      <button
        type="button"
        aria-label="Phát lại từ đầu"
        onClick={onReset}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <RotateCcw size={14} />
      </button>
      <input
        type="range"
        role="slider"
        aria-label="Tua thời gian chuyển động"
        min={0}
        max={Math.max(0.001, duration)}
        step={Math.max(0.001, duration / 240)}
        value={Math.min(tSec, duration)}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="h-1.5 w-full min-w-[80px] flex-1 cursor-pointer accent-primary"
      />
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {tSec.toFixed(2)}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

// ── Component chính ──────────────────────────────────────────────────────────
export interface PhysicsSceneViewProps {
  geometry: GeometryData | null;
  title?: string;
  className?: string;
  /** Mốc khởi tạo (giây). */
  initialTimeSec?: number;
  /** Tự chạy khi mount. */
  autoPlay?: boolean;
  /** Lặp lại khi hết. */
  loop?: boolean;
}

export function PhysicsSceneView({
  geometry, title, className, initialTimeSec = 0, autoPlay = false, loop = false,
}: PhysicsSceneViewProps) {
  const view = useMemo(() => computePhysicsView(geometry), [geometry]);
  const duration = view?.duration ?? 0;
  const timeUnit = 's'; // engine Lý playback theo giây (meta.units.time)
  const lengthUnit = geometry?.axisUnit || 'm';

  const clamp = useCallback((t: number) => Math.max(0, Math.min(duration, t)), [duration]);
  const [tSec, setTSec] = useState(() => Math.max(0, Math.min(duration || 0, initialTimeSec)));
  const [playing, setPlaying] = useState(autoPlay && duration > 0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // Đồng hồ tua bằng rAF (chỉ khi playing). Chạm cuối ⇒ dừng (hoặc lặp).
  useEffect(() => {
    if (!playing || duration <= 0) return;
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTSec((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          if (loop) return 0;
          setPlaying(false);
          return duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (tSec >= duration) setTSec(0);
    lastTsRef.current = null;
    setPlaying(true);
  };
  const reset = () => { setPlaying(false); setTSec(0); };

  if (!view) {
    return (
      <figure className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm', className)}>
        {title && <figcaption className="px-1 text-sm font-semibold text-foreground">{title}</figcaption>}
        <p className="py-10 text-center text-sm text-muted-foreground">Không có cảnh mô phỏng để hiển thị.</p>
      </figure>
    );
  }

  const { vw, vh, project } = view;
  const points = geometry?.points ?? [];
  const ptById = new Map(points.map((p) => [p.id, p]));
  const tracks = geometry?.timeline?.tracks ?? [];
  const agents = geometry?.agents ?? [];

  const ground0 = project(minXOf(view, geometry), 0);
  const ground1 = project(maxXOf(view, geometry), 0);

  return (
    <figure
      className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm', className)}
      data-testid="physics-scene"
    >
      {title && <figcaption className="px-1 text-sm font-semibold text-foreground">{title}</figcaption>}

      {/* Sân khấu: trời → đất */}
      <div className="relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-b from-sky-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" role="img" aria-label={title || 'Mô phỏng chuyển động'}>
          {/* Đường chân trời (mặt đất) */}
          <line
            data-role="ground"
            x1={ground0.px} y1={ground0.py} x2={ground1.px} y2={ground1.py}
            className="stroke-slate-400 dark:stroke-slate-500" strokeWidth={2}
          />

          {/* Mặt cầu (phạm vi) → vòng tròn nét đứt */}
          {(geometry?.spheres ?? []).map((sp) => {
            const c = project(Number(sp.center?.x), Number(sp.center?.z));
            const edge = project(Number(sp.center?.x) + (Number(sp.radius) || 0), Number(sp.center?.z));
            const r = Math.abs(edge.px - c.px);
            return (
              <g key={`sphere-${sp.id}`} data-role="range-sphere" data-sphere-id={sp.id}>
                <circle cx={c.px} cy={c.py} r={r} fill={sp.color || '#38BDF8'} fillOpacity={0.08}
                  className="stroke-sky-500/60" strokeDasharray="4 3" strokeWidth={1.5} />
                {sp.label && (
                  <text x={c.px} y={c.py - r - 4} textAnchor="middle" className="fill-sky-600 dark:fill-sky-300" style={{ fontSize: 10 }}>
                    {sp.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Đường cong quỹ đạo (samples) → polyline nét đứt */}
          {(geometry?.curves ?? []).map((c) => {
            const poly = (c.samples ?? []).map((s) => { const q = project(Number(s.x), Number(s.y)); return `${q.px},${q.py}`; }).join(' ');
            if (!poly) return null;
            return (
              <polyline key={`curve-${c.id}`} data-role="trajectory" data-curve-id={c.id}
                points={poly} fill="none" stroke={c.color || '#94a3b8'} strokeWidth={1.5}
                strokeDasharray={c.style === 'dashed' ? '5 4' : undefined} opacity={0.9} />
            );
          })}

          {/* Đường thẳng nối điểm */}
          {(geometry?.lines ?? []).map((l) => {
            const a = ptById.get(l.from); const b = ptById.get(l.to);
            if (!a || !b) return null;
            const pa = project(Number(a.x), Number(a.z)); const pb = project(Number(b.x), Number(b.z));
            return (
              <line key={`line-${l.id}`} data-role="segment" data-line-id={l.id}
                x1={pa.px} y1={pa.py} x2={pb.px} y2={pb.py}
                stroke={l.color || '#64748b'} strokeWidth={1.5}
                strokeDasharray={l.style && l.style !== 'solid' ? '5 4' : undefined} />
            );
          })}

          {/* Điểm mốc có nhãn (điểm xuất phát / chạm đất …) */}
          {points.map((p) => {
            if (!p.label) return null; // bỏ mốc ẩn danh (vd 2 đầu mặt đất __G0/__G1)
            const q = project(Number(p.x), Number(p.z));
            return (
              <g key={`pt-${p.id}`} data-role="marker" data-point-id={p.id}>
                <circle cx={q.px} cy={q.py} r={3} className="fill-slate-500 dark:fill-slate-300" />
                <text x={q.px + 5} y={q.py - 5} className="fill-slate-600 dark:fill-slate-200" style={{ fontSize: 10 }}>
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* Agent (vật chuyển động) tại mốc tSec */}
          {agents.map((a) => {
            const g = agentGeoPositionAt(a, tracks, tSec);
            const q = project(g.x, g.z);
            const r = Math.max(4, Math.min(9, (a.radius || 0.1) * 22));
            return (
              <g key={`agent-${a.id}`} data-role="agent" data-agent-id={a.id}
                data-gx={g.x.toFixed(4)} data-gv={g.z.toFixed(4)}>
                <circle cx={q.px} cy={q.py} r={r} fill={a.color || '#FFA500'} stroke="rgba(0,0,0,0.25)" strokeWidth={0.8} />
                {a.label && (
                  <text x={q.px + r + 3} y={q.py - r} className="fill-slate-700 dark:fill-slate-100" style={{ fontSize: 10, fontWeight: 600 }}>
                    {a.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chú giải agent */}
      {agents.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {agents.map((a) => (
            <span key={`lg-${a.id}`} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded-full border border-black/20 dark:border-white/20" style={{ backgroundColor: a.color || '#FFA500' }} />
              <span className="font-medium text-foreground">{a.label || a.id}</span>
            </span>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">đơn vị: {lengthUnit}</span>
        </div>
      )}

      {/* Thanh tua */}
      {duration > 0 && (
        <PhysicsControls
          tSec={Math.min(tSec, duration)}
          duration={duration}
          playing={playing}
          unit={timeUnit}
          onSeek={(t) => { setPlaying(false); setTSec(clamp(t)); }}
          onTogglePlay={togglePlay}
          onReset={reset}
        />
      )}
    </figure>
  );
}

// Biên ngang thực để vẽ đường chân trời chạy hết khung (dùng lại bounds đã có qua project nghịch đảo
// là dư thừa; tính trực tiếp từ dữ liệu cho gọn — mặt đất chỉ cần trải từ mép trái tới mép phải dữ liệu).
function minXOf(view: PhysicsView, geometry: GeometryData | null | undefined): number {
  return extentX(geometry).min;
}
function maxXOf(view: PhysicsView, geometry: GeometryData | null | undefined): number {
  return extentX(geometry).max;
}
function extentX(geometry: GeometryData | null | undefined): { min: number; max: number } {
  let min = 0, max = 0, seen = false;
  const acc = (x: number) => {
    if (!Number.isFinite(x)) return;
    if (!seen) { min = max = x; seen = true; } else { min = Math.min(min, x); max = Math.max(max, x); }
  };
  for (const p of geometry?.points ?? []) acc(Number(p.x));
  for (const c of geometry?.curves ?? []) for (const s of c.samples ?? []) acc(Number(s.x));
  for (const sp of geometry?.spheres ?? []) { const cx = Number(sp.center?.x), r = Number(sp.radius) || 0; acc(cx - r); acc(cx + r); }
  if (!seen) { min = 0; max = 1; }
  return { min, max };
}

export default PhysicsSceneView;
