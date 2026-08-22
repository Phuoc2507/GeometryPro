// src/components/simulate/SimulationView.tsx
// ─────────────────────────────────────────────────────────────────────────────
// SimulationView — nhận `result` (thân JSON của `/api/analyze-problem`, từ useSubjectSolver) và render
// mô phỏng theo MÔN:
//   • physics → <PhysicsSceneView> (vật chuyển động, SVG 2D) + bảng đáp số + timeline player.
//   • chem    → <ChemSceneView>   (thí nghiệm 2D có sẵn) + bảng đáp số + hiện tượng.
//   • Cả hai  → nếu ok:false: hiện lý do "ngoài phạm vi" + violations/trace (KHÔNG bịa đáp).
//
// THUẦN: chỉ nhận props (result/loading/error), KHÔNG fetch, KHÔNG tự điều hướng router. Điểm nối (ô nhập
// đề Toán → detectSubject → useSubjectSolver → SimulationView) để người điều phối ghép.
//
// ⚠️ LỆCH SHAPE `scene` — điểm CẦN BÀN khi tích hợp:
//   Route THỰC (solveSubject.js) trả:  physics → scene.geometry (GeometryData) · chem → scene (ChemScene).
//   Mô tả điều phối viên đưa lại là:    physics → scene (GeometryData)          · chem → scene.chemScene.
//   Hai mô tả LỆCH nhau (ngược chiều). Để KHÔNG vỡ dù route trả kiểu nào, extractor dưới đây DÒ CẢ HAI vị trí.
// ─────────────────────────────────────────────────────────────────────────────
import { cn } from '@/lib/utils';
import type { GeometryData } from '@/types/geometry';
import type { ChemScene } from '@/types/chemScene';
import type { SubjectResult, SubjectAnswer, SolverError } from '@/hooks/useSubjectSolver';
import { ChemSceneView } from '@/components/chem/ChemSceneView';
import { PhysicsSceneView } from './PhysicsSceneView';

// ── Extractor: lấy GeometryData (Lý) từ result.scene — dò CẢ HAI shape ────────
export function extractPhysicsGeometry(result: SubjectResult | null | undefined): GeometryData | null {
  const s = result?.scene as Record<string, unknown> | null | undefined;
  if (!s || typeof s !== 'object') return null;
  // Shape THỰC của route: scene = { geometry, charts, playback, units, tPhys }.
  const g = (s as { geometry?: unknown }).geometry as Record<string, unknown> | undefined;
  if (g && typeof g === 'object' && (Array.isArray(g.points) || Array.isArray(g.agents) || Array.isArray(g.lines))) {
    return g as unknown as GeometryData;
  }
  // Shape mô tả điều phối: scene CHÍNH LÀ GeometryData.
  if (Array.isArray((s as { points?: unknown }).points) || Array.isArray((s as { agents?: unknown }).agents)) {
    return s as unknown as GeometryData;
  }
  return null;
}

// ── Extractor: lấy ChemScene (Hóa) từ result.scene — dò CẢ HAI shape ──────────
export function extractChemScene(result: SubjectResult | null | undefined): ChemScene | null {
  const s = result?.scene as Record<string, unknown> | null | undefined;
  if (!s || typeof s !== 'object') return null;
  // Shape mô tả điều phối: scene.chemScene.
  const inner = (s as { chemScene?: unknown }).chemScene as Record<string, unknown> | undefined;
  if (inner && Array.isArray(inner.vessels)) return inner as unknown as ChemScene;
  // Shape THỰC của route: scene = ChemScene (có .vessels).
  if (Array.isArray((s as { vessels?: unknown }).vessels)) return s as unknown as ChemScene;
  return null;
}

// ── Chuẩn hoá 1 đáp số về {label, display, exact, approx, unit, approximate} ──
// Engine KHÔNG có field `display`; ưu tiên `display` (nếu route thêm sau) → `text` → dựng từ exact/approx.
interface NormalAnswer { label: string; display: string; exact: string | null; approx: number | null; unit: string; approximate: boolean }
function normalizeAnswer(a: SubjectAnswer): NormalAnswer {
  const unit = a.unit ?? '';
  const withUnit = (v: string) => (unit ? `${v} ${unit}` : v);
  const display = a.display
    ?? a.text
    ?? (a.exact != null ? withUnit(String(a.exact)) : (a.approx != null ? withUnit(String(a.approx)) : '—'));
  return {
    label: a.label ?? a.kind ?? '',
    display,
    exact: a.exact ?? null,
    approx: a.approx ?? null,
    unit,
    approximate: !!a.approximate,
  };
}

// ── Bảng đáp số ──────────────────────────────────────────────────────────────
export function AnswerPanel({ answers, ok }: { answers: SubjectAnswer[]; ok: boolean }) {
  if (!answers || answers.length === 0) return null;
  const rows = answers.map(normalizeAnswer);
  return (
    <div data-testid="answer-panel" className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Đáp số</h3>
        {ok && (
          <span
            data-testid="verified-badge"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
          >
            ✓ đã kiểm chứng
          </span>
        )}
      </div>
      <ul className="divide-y divide-border/60">
        {rows.map((r, i) => (
          <li key={i} data-testid="answer-row" className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5">
            {r.label && <span className="min-w-[7rem] text-xs text-muted-foreground">{r.label}</span>}
            <span className="font-medium text-foreground">{r.display}</span>
            <span className="ml-auto flex items-baseline gap-2 text-[11px] tabular-nums text-muted-foreground">
              {r.exact != null && r.exact !== '' && <span className="font-mono">{r.exact}{r.unit ? ` ${r.unit}` : ''}</span>}
              {r.approx != null && (
                <span>{r.approximate ? '≈ ' : ''}{formatApprox(r.approx)}{r.unit ? ` ${r.unit}` : ''}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatApprox(x: number): string {
  if (!Number.isFinite(x)) return '—';
  return Number.isInteger(x) ? String(x) : parseFloat(x.toFixed(4)).toString();
}

// ── Chẩn đoán khi ok:false (ngoài phạm vi / lệch dữ kiện) ─────────────────────
function violationText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    // Hóa: {law, detail}
    if ('detail' in o) return `${o.law ? `${o.law}: ` : ''}${o.detail}`;
    // Lý: {assert, expected, got, delta}
    if ('assert' in o) return `${o.assert}: kỳ vọng ${o.expected}, tính được ${o.got} (lệch ${o.delta})`;
  }
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function SimulationDiagnostics({ result }: { result: SubjectResult }) {
  const violations = (result.violations ?? []) as unknown[];
  const errors = (result.errors ?? []) as { message?: string }[];
  const trace = (result.trace ?? []) as unknown[];
  const abstained = !!result.abstained;
  const title = abstained ? 'Ngoài phạm vi engine' : 'Chưa có đáp số kiểm chứng';
  const reason = abstained
    ? (errors[0]?.message || 'Bộ dịch tự khước từ: đề thiếu số liệu hoặc ngoài phạm vi.')
    : (errors[0]?.message || 'Mô hình chưa vượt được bước tự kiểm — không trả đáp số để tránh sai.');

  return (
    <div data-testid="diagnostics" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <p className="font-semibold text-amber-700 dark:text-amber-300">{title}</p>
      <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">{reason}</p>

      {violations.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-800/90 dark:text-amber-200/90">
          {violations.map((v, i) => <li key={i}>{violationText(v)}</li>)}
        </ul>
      )}
      {errors.length > 1 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-800/80 dark:text-amber-200/80">
          {errors.slice(1).map((e, i) => <li key={i}>{e?.message}</li>)}
        </ul>
      )}
      {trace.length > 0 && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Nhật ký tự kiểm ({trace.length})</summary>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            {trace.map((t, i) => <li key={i}>{typeof t === 'string' ? t : JSON.stringify(t)}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}

// ── Nhật ký tự kiểm khi ok:true (gấp gọn, tuỳ chọn xem) ───────────────────────
function TraceDetails({ trace }: { trace: unknown[] }) {
  if (!trace || trace.length === 0) return null;
  return (
    <details className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none font-medium text-foreground/80">Cách engine kiểm chứng ({trace.length} bước)</summary>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
        {trace.map((t, i) => <li key={i}>{typeof t === 'string' ? t : JSON.stringify(t)}</li>)}
      </ol>
    </details>
  );
}

const SUBJECT_LABEL: Record<string, string> = { physics: 'Vật lý', chem: 'Hóa học', geometry: 'Toán / Hình học' };

// ── Component chính ──────────────────────────────────────────────────────────
export interface SimulationViewProps {
  /** Thân JSON của /api/analyze-problem (từ useSubjectSolver.result). */
  result: SubjectResult | null;
  /** Đang gọi API (từ useSubjectSolver.loading). */
  loading?: boolean;
  /** Lỗi mạng/HTTP/auth (từ useSubjectSolver.error). */
  error?: SolverError | null;
  title?: string;
  className?: string;
}

export function SimulationView({ result, loading = false, error = null, title, className }: SimulationViewProps) {
  // 1) Lỗi (ưu tiên hiện — nhất là 401 chưa đăng nhập).
  if (error) {
    return (
      <div data-testid="simulation-view" data-state="error" className={cn('rounded-lg border p-4 text-sm', error.kind === 'auth' ? 'border-sky-500/40 bg-sky-500/10' : 'border-destructive/40 bg-destructive/10', className)}>
        <p className={cn('font-semibold', error.kind === 'auth' ? 'text-sky-700 dark:text-sky-300' : 'text-destructive')}>
          {error.kind === 'auth' ? 'Cần đăng nhập' : 'Lỗi'}
        </p>
        <p className="mt-1 text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  // 2) Đang tải.
  if (loading && !result) {
    return (
      <div data-testid="simulation-view" data-state="loading" className={cn('flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground', className)}>
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
        Đang giải và dựng mô phỏng…
      </div>
    );
  }

  // 3) Chưa có gì.
  if (!result) {
    return (
      <div data-testid="simulation-view" data-state="empty" className={cn('rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground', className)}>
        Dán đề Lý/Hóa rồi bấm giải để xem mô phỏng.
      </div>
    );
  }

  const subject = result.subject ?? 'geometry';
  const ok = result.ok === true;
  const answers = result.answers ?? [];
  const trace = (result.trace ?? []) as unknown[];

  // 4) Đề Toán / không rõ → route delegate luồng Toán (người điều phối thường rẽ nhánh TRƯỚC bước này).
  if (result.delegate || subject === 'geometry') {
    return (
      <div data-testid="simulation-view" data-subject="geometry" className={cn('rounded-lg border border-border p-4 text-sm', className)}>
        <p className="font-semibold text-foreground">Đề Toán / Hình học</p>
        <p className="mt-1 text-muted-foreground">Đề này thuộc luồng dựng hình (không phải Lý/Hóa) — hãy dùng luồng Toán để hiển thị.</p>
      </div>
    );
  }

  const physicsGeometry = subject === 'physics' ? extractPhysicsGeometry(result) : null;
  const chemScene = subject === 'chem' ? extractChemScene(result) : null;

  return (
    <div data-testid="simulation-view" data-subject={subject} className={cn('flex flex-col gap-3', className)}>
      {/* Tiêu đề + nhãn môn + trạng thái kiểm chứng */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          subject === 'physics' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'bg-teal-500/15 text-teal-600 dark:text-teal-300')}>
          {SUBJECT_LABEL[subject] ?? subject}
        </span>
        {title && <span className="text-sm font-semibold text-foreground">{title}</span>}
        <span data-testid="status-badge" className={cn('ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
          ok ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300')}>
          {ok ? '✓ đã kiểm chứng' : '⚠ ngoài phạm vi'}
        </span>
      </div>

      {/* Sân khấu theo môn */}
      {subject === 'physics' && (
        physicsGeometry
          ? <PhysicsSceneView geometry={physicsGeometry} title={typeof physicsGeometry.name === 'string' ? physicsGeometry.name : undefined} />
          : <SceneMissing subject="physics" />
      )}
      {subject === 'chem' && (
        chemScene
          ? <ChemSceneView scene={chemScene} />
          : <SceneMissing subject="chem" />
      )}

      {/* Đáp số */}
      <AnswerPanel answers={answers} ok={ok} />

      {/* Chẩn đoán khi ok:false; nhật ký khi ok:true */}
      {!ok && <SimulationDiagnostics result={result} />}
      {ok && <TraceDetails trace={trace} />}
    </div>
  );
}

function SceneMissing({ subject }: { subject: 'physics' | 'chem' }) {
  return (
    <div data-testid="scene-missing" className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      {subject === 'physics'
        ? 'Kết quả không kèm cảnh mô phỏng chuyển động (thiếu scene.geometry).'
        : 'Kết quả không kèm cảnh thí nghiệm (thiếu ChemScene).'}
    </div>
  );
}

export default SimulationView;
