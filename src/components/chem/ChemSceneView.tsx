// src/components/chem/ChemSceneView.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ChemSceneView — hiển thị "cảnh thí nghiệm Hóa" 2D (schematic) từ một `ChemScene`.
//
// Thay cho canvas hình học 3D, đề Hóa cần một khung cảnh: ống nghiệm/cốc, dung dịch
// đổi màu, kết tủa lắng đáy, bọt khí bay lên, ngọn lửa khi đun. Component VẼ BẰNG SVG
// (2D, không dùng three.js) + Tailwind, có thanh tua (play/pause/scrub) để "diễn" chuỗi
// `events` theo thời gian.
//
// THUẦN: chỉ nhận props (`scene` + vài prop điều khiển), KHÔNG tự fetch API — để tái dùng
// ở bước tích hợp. Dark mode theo chiến lược `class` của Tailwind (next-themes) — dùng biến
// `dark:` nên không cần đọc theme trực tiếp (giữ component thuần).
//
// Type `ChemScene` lấy từ mirror `@/types/chemScene` (xem lý do không import xuyên api/ ở đó).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useId, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChemScene, ChemVessel } from '@/types/chemScene';

// ── Hình học SVG mỗi loại bình (toạ độ trong viewBox 140×196) ─────────────────
const VIEW_W = 140;
const VIEW_H = 196;
type Geom = { ix: number; iw: number; itop: number; ibot: number };
const GEOM: Record<ChemVessel['kind'], Geom> = {
  // Cốc: rộng, miệng có mỏ rót; đáy bo nhẹ.
  beaker: { ix: 26, iw: 88, itop: 46, ibot: 172 },
  // Ống nghiệm: hẹp, đáy tròn (bán cầu).
  test_tube: { ix: 52, iw: 36, itop: 22, ibot: 172 },
};

/** Path lòng bình (dùng cho clip + kính) — đáy bo (cốc) hoặc bán cầu (ống nghiệm). */
function interiorPath(kind: ChemVessel['kind'], g: Geom): string {
  const ir = g.ix + g.iw;
  if (kind === 'test_tube') {
    const r = g.iw / 2;
    return `M ${g.ix} ${g.itop} L ${g.ix} ${g.ibot - r} A ${r} ${r} 0 0 0 ${ir} ${g.ibot - r} L ${ir} ${g.itop} Z`;
  }
  const c = 12; // bo góc đáy cốc
  return `M ${g.ix} ${g.itop} L ${g.ix} ${g.ibot - c} Q ${g.ix} ${g.ibot} ${g.ix + c} ${g.ibot} L ${ir - c} ${g.ibot} Q ${ir} ${g.ibot} ${ir} ${g.ibot - c} L ${ir} ${g.itop} Z`;
}

// ── Trạng thái hiển thị dẫn xuất của một bình tại mốc `step` ──────────────────
export interface VesselVisual {
  id: string;
  kind: ChemVessel['kind'];
  hasSolution: boolean;
  /** Màu dung dịch HIỆN TẠI (đã áp color_change nếu đã tới mốc). */
  solutionColor: string | null;
  solutionColorName: string | null;
  /** Đã có color_change áp lên bình này chưa (để hiệu ứng "nhạt dần"). */
  solutionFaded: boolean;
  solids: { formula: string; color: string; colorName: string; amountText?: string; visible: boolean; dissolved: boolean }[];
  precipitates: { formula: string; color: string; text: string }[];
  /** Khí đang thoát (từ gas_bubbles), null nếu chưa. */
  gasFormula: string | null;
  heated: boolean;
  /** Các chất đã được đổ VÀO bình này (pour.into === id). */
  pouredIn: string[];
  /** Bình này là nguồn đã bị rót đi (pour.from === id). */
  isPourSource: boolean;
  /** Nhãn hiển thị dưới bình. */
  labels: { formula: string; amountText?: string }[];
}

/** Tập công thức có event add_solid trong một bình (để chất rắn chỉ hiện sau khi "thêm vào"). */
function addSolidFormulas(scene: ChemScene, vesselId: string): Set<string> {
  const s = new Set<string>();
  for (const e of scene.events) if (e.kind === 'add_solid' && e.into === vesselId) s.add(e.formula);
  return s;
}

/**
 * Dẫn xuất trạng thái mọi bình tại mốc thời gian `step` — HÀM THUẦN (gấp mọi event có `t ≤ step`).
 * Export để test đối chiếu trực tiếp (giống pattern `sliceSamplesForTest` trong repo).
 */
export function deriveVesselStates(scene: ChemScene, step: number): VesselVisual[] {
  const byId = new Map<string, VesselVisual>();
  for (const v of scene.vessels) {
    const sol = v.contents.find((c) => c.state === 'solution');
    const added = addSolidFormulas(scene, v.id);
    byId.set(v.id, {
      id: v.id,
      kind: v.kind,
      hasSolution: !!sol,
      solutionColor: sol ? sol.color : null,
      solutionColorName: sol ? sol.colorName : null,
      solutionFaded: false,
      solids: v.contents
        .filter((c) => c.state === 'solid')
        .map((c) => ({
          formula: c.formula,
          color: c.color,
          colorName: c.colorName,
          amountText: c.amountText,
          // Chất rắn có event add_solid ⇒ chỉ hiện SAU khi thêm; không có ⇒ hiện từ đầu.
          visible: !added.has(c.formula),
          dissolved: false,
        })),
      precipitates: [],
      gasFormula: null,
      heated: false,
      pouredIn: [],
      isPourSource: false,
      labels: v.contents.map((c) => ({ formula: c.formula, amountText: c.amountText })),
    });
  }

  const upto = scene.events.filter((e) => e.t <= step).sort((a, b) => a.t - b.t);
  for (const e of upto) {
    switch (e.kind) {
      case 'pour': {
        byId.get(e.into)?.pouredIn.push(e.formula);
        const src = byId.get(e.from);
        if (src) src.isPourSource = true;
        break;
      }
      case 'add_solid': {
        const v = byId.get(e.into);
        const chip = v?.solids.find((s) => s.formula === e.formula);
        if (chip) chip.visible = true;
        break;
      }
      case 'heat': {
        const v = byId.get(e.vessel);
        if (v) v.heated = true;
        break;
      }
      case 'color_change': {
        const v = byId.get(e.vessel);
        if (v) {
          v.solutionColor = e.toColor;
          v.solutionFaded = true;
        }
        break;
      }
      case 'precipitate': {
        byId.get(e.vessel)?.precipitates.push({ formula: e.formula, color: e.color, text: e.text });
        break;
      }
      case 'gas_bubbles': {
        const v = byId.get(e.vessel);
        if (v) v.gasFormula = e.formula;
        break;
      }
      case 'dissolve': {
        const v = byId.get(e.vessel);
        const chip = v?.solids.find((s) => s.formula === e.formula);
        if (chip) chip.dissolved = true;
        break;
      }
    }
  }
  return scene.vessels.map((v) => byId.get(v.id)!);
}

/** Độ dài timeline = mốc `t` lớn nhất trong events + captions (tối thiểu 0). */
export function timelineLength(scene: ChemScene): number {
  let max = 0;
  for (const e of scene.events) max = Math.max(max, e.t);
  for (const c of scene.captions) max = Math.max(max, c.t);
  return max;
}

/** Các caption đã xuất hiện (t ≤ step), khử trùng lặp, giữ thứ tự. */
export function activeCaptionsAt(scene: ChemScene, step: number): string[] {
  const out: string[] = [];
  for (const c of scene.captions) if (c.t <= step && !out.includes(c.text)) out.push(c.text);
  return out;
}

/** Text của event MỚI NHẤT có mô tả (t ≤ step) — dùng làm dòng thuyết minh nổi bật. */
export function latestEventTextAt(scene: ChemScene, step: number): string | null {
  let best: { t: number; text: string } | null = null;
  for (const e of scene.events) {
    if (e.t > step) continue;
    if ('text' in e && e.text) {
      if (!best || e.t >= best.t) best = { t: e.t, text: e.text };
    }
  }
  return best ? best.text : null;
}

/** Danh sách chất (khử trùng lặp) để dựng chú giải màu. */
function legendItems(scene: ChemScene): { formula: string; color: string; colorName: string; state: string }[] {
  const seen = new Map<string, { formula: string; color: string; colorName: string; state: string }>();
  const put = (formula: string, color: string, colorName: string, state: string) => {
    const key = `${formula}|${state}`;
    if (!seen.has(key)) seen.set(key, { formula, color, colorName, state });
  };
  for (const v of scene.vessels) for (const c of v.contents) put(c.formula, c.color, c.colorName, c.state);
  for (const e of scene.events) {
    if (e.kind === 'precipitate') put(e.formula, e.color, 'kết tủa', 'solid');
  }
  return [...seen.values()];
}

// ── Nguyên tử vẽ (SVG) ───────────────────────────────────────────────────────

/** Bọt khí bay lên trong lòng dung dịch. */
function Bubbles({ g, liquidTop }: { g: Geom; liquidTop: number }) {
  const cx = g.ix + g.iw / 2;
  const seeds = [-0.28, 0.12, -0.05, 0.24, -0.18, 0.3];
  return (
    <g className="chem-bubbles" aria-hidden="true">
      {seeds.map((s, i) => {
        const r = 1.6 + (i % 3) * 0.9;
        const x = cx + s * (g.iw - 8);
        return (
          <circle
            key={i}
            className="chem-bubble"
            cx={x}
            cy={g.ibot - 6}
            r={r}
            fill="rgba(255,255,255,0.85)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={0.5}
            style={{
              // Bay từ đáy tới mặt thoáng; lệch pha theo index.
              ['--rise' as string]: `${-(g.ibot - liquidTop - 6)}px`,
              animationDelay: `${(i * 0.32).toFixed(2)}s`,
              animationDuration: `${(1.5 + (i % 3) * 0.5).toFixed(2)}s`,
            }}
          />
        );
      })}
    </g>
  );
}

/** Mũi tên + nhãn khí thoát ra khỏi miệng bình. */
function GasEscape({ g, formula }: { g: Geom; formula: string }) {
  const cx = g.ix + g.iw / 2;
  const top = g.itop;
  return (
    <g className="chem-gas-escape" aria-hidden="true">
      <path
        d={`M ${cx} ${top - 4} l -5 8 M ${cx} ${top - 4} l 5 8 M ${cx} ${top - 4} v 14`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        className="text-slate-500 dark:text-slate-300"
      />
      <text
        x={cx}
        y={top - 8}
        textAnchor="middle"
        className="fill-slate-600 dark:fill-slate-200"
        style={{ fontSize: 11, fontWeight: 700 }}
      >
        {formula} ↑
      </text>
    </g>
  );
}

/** Ngọn lửa đun dưới đáy bình (khi heated). */
function Flame({ g }: { g: Geom }) {
  const cx = g.ix + g.iw / 2;
  const y = g.ibot + 6;
  return (
    <g className="chem-flame" aria-hidden="true">
      <path
        d={`M ${cx} ${y + 26} C ${cx - 12} ${y + 12} ${cx - 6} ${y} ${cx} ${y - 8}
            C ${cx + 6} ${y} ${cx + 12} ${y + 12} ${cx} ${y + 26} Z`}
        fill="#F97316"
        opacity={0.9}
      />
      <path
        d={`M ${cx} ${y + 24} C ${cx - 6} ${y + 14} ${cx - 3} ${y + 6} ${cx} ${y + 1}
            C ${cx + 3} ${y + 6} ${cx + 6} ${y + 14} ${cx} ${y + 24} Z`}
        fill="#FCD34D"
      />
    </g>
  );
}

/** Một bình + toàn bộ nội dung tại trạng thái `vs`. */
function VesselSvg({ vs, uid }: { vs: VesselVisual; uid: string }) {
  const g = GEOM[vs.kind];
  const clipId = `chem-clip-${uid}-${vs.id}`;
  const path = interiorPath(vs.kind, g);
  const ir = g.ix + g.iw;
  const cx = g.ix + g.iw / 2;

  // Mức dung dịch: đầy ~66% lòng bình.
  const liquidTop = vs.hasSolution ? g.itop + 0.34 * (g.ibot - g.itop) : g.ibot;
  const bubbling = !!vs.gasFormula;

  // Chiều cao đống kết tủa (xếp chồng nhiều kết tủa).
  const precipUnit = 12;
  const aria = describeVessel(vs);

  return (
    <div
      data-vessel-id={vs.id}
      data-vessel-kind={vs.kind}
      className="flex w-full max-w-[168px] flex-col items-center"
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-label={aria}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
          <radialGradient id={`chem-glow-${uid}-${vs.id}`} cx="50%" cy="90%" r="60%">
            <stop offset="0%" stopColor="#FB923C" stopOpacity={vs.heated ? 0.5 : 0} />
            <stop offset="100%" stopColor="#FB923C" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Quầng nhiệt khi đun */}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={`url(#chem-glow-${uid}-${vs.id})`} />

        {/* Kính bình (nền + viền) */}
        <path
          d={path}
          className="fill-white/40 stroke-slate-400 dark:fill-white/5 dark:stroke-slate-500"
          strokeWidth={2.5}
        />

        <g clipPath={`url(#${clipId})`}>
          {/* Dung dịch — chuyển màu mượt khi color_change */}
          {vs.hasSolution && (
            <rect
              data-role="solution"
              data-hex={vs.solutionColor ?? ''}
              x={g.ix - 2}
              y={liquidTop}
              width={g.iw + 4}
              height={g.ibot - liquidTop + 4}
              fill={vs.solutionColor ?? '#EAF4FB'}
              style={{ transition: 'fill 1000ms ease' }}
            />
          )}

          {/* Đống kết tủa lắng đáy (xếp chồng) */}
          {vs.precipitates.map((p, i) => {
            const h = precipUnit + i * 6;
            const yTop = g.ibot - h;
            return (
              <g key={`${p.formula}-${i}`} data-role="precipitate" data-formula={p.formula} data-hex={p.color}>
                <rect
                  x={g.ix - 2}
                  y={yTop}
                  width={g.iw + 4}
                  height={h + 4}
                  fill={p.color}
                  className="chem-settle"
                />
                {/* Mặt đống gợn nhẹ */}
                <ellipse cx={cx} cy={yTop} rx={g.iw / 2 + 1} ry={4} fill={p.color} />
                <ellipse cx={cx} cy={yTop} rx={g.iw / 2 + 1} ry={4} fill="rgba(0,0,0,0.10)" />
              </g>
            );
          })}

          {/* Chất rắn (kim loại tham gia) — chip hạt; tan thì mờ dần & chìm */}
          {vs.solids.map((s, i) => {
            if (!s.visible) return null;
            const bx = cx + (i - (vs.solids.length - 1) / 2) * 14;
            const by = vs.hasSolution ? liquidTop + 16 : g.ibot - 12;
            return (
              <g
                key={s.formula}
                data-role="solid"
                data-formula={s.formula}
                data-dissolved={s.dissolved ? '1' : '0'}
                style={{
                  transition: 'opacity 900ms ease, transform 900ms ease',
                  opacity: s.dissolved ? 0.12 : 1,
                  transform: s.dissolved ? 'translateY(10px)' : 'none',
                }}
              >
                <rect x={bx - 6} y={by} width={12} height={9} rx={2} fill={s.color} stroke="rgba(0,0,0,0.25)" strokeWidth={0.6} />
                <rect x={bx - 3} y={by + 10} width={7} height={6} rx={1.5} fill={s.color} stroke="rgba(0,0,0,0.25)" strokeWidth={0.6} />
              </g>
            );
          })}

          {/* Bọt khí — chỉ khi có dung dịch để sủi qua (nhiệt phân chất rắn khan thì chỉ có mũi tên khí thoát) */}
          {bubbling && vs.hasSolution && <Bubbles g={g} liquidTop={liquidTop} />}

          {/* Mặt thoáng (meniscus) — giúp dung dịch nhạt/không màu vẫn nhìn thấy */}
          {vs.hasSolution && (
            <ellipse
              cx={cx}
              cy={liquidTop}
              rx={g.iw / 2 + 1}
              ry={3.5}
              fill="none"
              className="stroke-slate-400/60 dark:stroke-slate-300/40"
              strokeWidth={1}
            />
          )}
        </g>

        {/* Vành miệng bình */}
        <ellipse
          cx={cx}
          cy={g.itop}
          rx={g.iw / 2 + 3}
          ry={4}
          className="fill-none stroke-slate-400 dark:stroke-slate-500"
          strokeWidth={2.5}
        />

        {/* Khí thoát ra */}
        {bubbling && <GasEscape g={g} formula={vs.gasFormula!} />}

        {/* Lửa đun */}
        {vs.heated && <Flame g={g} />}
      </svg>

      {/* Nhãn chất trong bình */}
      <div className="mt-1 flex flex-col items-center gap-0.5 text-center">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          {vs.labels.map((l) => l.formula).join(' + ') || '—'}
        </span>
        {vs.labels.some((l) => l.amountText) && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {vs.labels.filter((l) => l.amountText).map((l) => `${l.formula}: ${l.amountText}`).join(' · ')}
          </span>
        )}
        <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {vs.kind === 'beaker' ? 'cốc' : 'ống nghiệm'}
        </span>
      </div>
    </div>
  );
}

/** Mô tả bình cho aria-label (accessibility). */
export function describeVessel(vs: VesselVisual): string {
  const parts: string[] = [vs.kind === 'beaker' ? 'Cốc' : 'Ống nghiệm'];
  if (vs.hasSolution) parts.push(`dung dịch màu ${vs.solutionColorName ?? 'không màu'}`);
  const solids = vs.solids.filter((s) => s.visible && !s.dissolved).map((s) => s.formula);
  if (solids.length) parts.push(`chất rắn ${solids.join(', ')}`);
  if (vs.precipitates.length) parts.push(`kết tủa ${vs.precipitates.map((p) => p.formula).join(', ')}`);
  if (vs.gasFormula) parts.push(`thoát khí ${vs.gasFormula}`);
  if (vs.heated) parts.push('đang đun');
  return parts.join(', ');
}

// ── Thanh điều khiển (View thuần — test được) ────────────────────────────────
export function ChemSceneControls({
  step,
  length,
  playing,
  onSeek,
  onTogglePlay,
  onReset,
}: {
  step: number;
  length: number;
  playing: boolean;
  onSeek: (step: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
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
        aria-label="Tua thời gian hiện tượng"
        min={0}
        max={Math.max(1, length)}
        step={1}
        value={step}
        onChange={(e) => onSeek(parseInt(e.target.value, 10))}
        className="h-1.5 w-full min-w-[80px] flex-1 cursor-pointer accent-primary"
      />
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {Math.min(step, length)}/{length}
      </span>
    </div>
  );
}

// ── Component chính ──────────────────────────────────────────────────────────
export interface ChemSceneViewProps {
  scene: ChemScene;
  /** Mốc khởi tạo (kẹp vào [0, length]); mặc định 0. */
  initialStep?: number;
  /** Tự chạy khi mount. */
  autoPlay?: boolean;
  /** Chạy lặp lại (quay về đầu sau khi hết). */
  loop?: boolean;
  /** Thời lượng mỗi bước (ms). */
  stepMs?: number;
  /** Tiêu đề nhỏ phía trên cảnh. */
  title?: string;
  className?: string;
}

export function ChemSceneView({
  scene,
  initialStep = 0,
  autoPlay = false,
  loop = false,
  stepMs = 1200,
  title,
  className,
}: ChemSceneViewProps) {
  const uid = useId().replace(/:/g, '');
  const length = useMemo(() => timelineLength(scene), [scene]);
  const clamp = (n: number) => Math.max(0, Math.min(length, n));

  const [step, setStep] = useState(() => clamp(initialStep));
  const [playing, setPlaying] = useState(autoPlay && length > 0);

  // Đồng hồ tua: mỗi `stepMs` tiến 1 bước; hết thì dừng (hoặc lặp).
  useEffect(() => {
    if (!playing) return;
    if (step < length) {
      const id = setTimeout(() => setStep((s) => Math.min(length, s + 1)), stepMs);
      return () => clearTimeout(id);
    }
    // Đã tới cuối.
    if (loop) {
      const id = setTimeout(() => setStep(0), Math.max(stepMs, 1500));
      return () => clearTimeout(id);
    }
    setPlaying(false);
  }, [playing, step, length, stepMs, loop]);

  const vessels = useMemo(() => deriveVesselStates(scene, step), [scene, step]);
  const captions = useMemo(() => activeCaptionsAt(scene, step), [scene, step]);
  const eventText = useMemo(() => latestEventTextAt(scene, step), [scene, step]);
  const legend = useMemo(() => legendItems(scene), [scene]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (step >= length) setStep(0);
    setPlaying(true);
  };
  const reset = () => {
    setPlaying(false);
    setStep(0);
  };

  const empty = scene.vessels.length === 0;

  return (
    <figure
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm',
        className,
      )}
    >
      {title && <figcaption className="px-1 text-sm font-semibold text-foreground">{title}</figcaption>}

      {/* Sân khấu: bàn thí nghiệm */}
      <div className="relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-b from-sky-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        {/* Mặt bàn */}
        <div className="pointer-events-none absolute inset-x-0 bottom-8 h-px bg-slate-300/70 dark:bg-slate-700/70" />
        <div className="flex min-h-[220px] flex-wrap items-end justify-center gap-4 p-4 pb-8">
          {empty ? (
            <p className="py-10 text-sm text-muted-foreground">Không có bình nào để hiển thị.</p>
          ) : (
            vessels.map((vs) => <VesselSvg key={vs.id} vs={vs} uid={uid} />)
          )}
        </div>
      </div>

      {/* Thuyết minh: dòng hiện tượng nổi bật + caption tích luỹ */}
      <div className="min-h-[2.5rem] rounded-lg bg-muted/60 px-3 py-2">
        {eventText ? (
          <p className="text-sm font-medium text-foreground">{eventText}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Nhấn ▶ để xem hiện tượng.</p>
        )}
        {captions.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {captions.map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                • {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chú giải màu */}
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {legend.map((l) => (
            <span key={`${l.formula}-${l.state}`} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                data-hex={l.color}
                className="inline-block h-3 w-3 rounded-sm border border-black/20 dark:border-white/20"
                style={{ backgroundColor: l.color }}
              />
              <span className="font-medium text-foreground">{l.formula}</span>
              <span>({l.colorName})</span>
            </span>
          ))}
        </div>
      )}

      {/* Điều khiển tua */}
      {length > 0 && (
        <ChemSceneControls
          step={step}
          length={length}
          playing={playing}
          onSeek={(s) => {
            setPlaying(false);
            setStep(clamp(s));
          }}
          onTogglePlay={togglePlay}
          onReset={reset}
        />
      )}

      {/* Keyframes cục bộ (self-contained; trùng lặp giữa nhiều instance là vô hại) */}
      <style>{KEYFRAMES}</style>
    </figure>
  );
}

const KEYFRAMES = `
@keyframes chem-bubble-rise {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  15%  { opacity: 0.9; }
  85%  { opacity: 0.9; }
  100% { transform: translateY(var(--rise, -60px)) scale(1); opacity: 0; }
}
.chem-bubble { animation: chem-bubble-rise linear infinite; }
@keyframes chem-settle { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.chem-settle { animation: chem-settle 800ms ease-out both; }
@keyframes chem-gas-float { 0% { transform: translateY(4px); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-10px); opacity: 0; } }
.chem-gas-escape { animation: chem-gas-float 2.2s ease-in-out infinite; }
@keyframes chem-flicker { 0%,100% { transform: scaleY(1); opacity: 0.92; } 50% { transform: scaleY(1.12) translateY(-2px); opacity: 1; } }
.chem-flame { transform-box: fill-box; transform-origin: center bottom; animation: chem-flicker 420ms ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .chem-bubble, .chem-gas-escape, .chem-flame, .chem-settle { animation: none; }
}
`;

export default ChemSceneView;
