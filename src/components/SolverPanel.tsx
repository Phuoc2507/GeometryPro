/**
 * SolverPanel — Sprint 2 student-mode solver UI
 *
 * Right-side panel that:
 *   1. Lets student enter (or review) the problem text
 *   2. Calls POST /api/solve with current geometry
 *   3. Shows steps[] with Bước N/Total navigation
 *   4. Displays final answer with ✓ verified / ⚠️ flag
 *
 * Desktop: fixed panel on right (lg:w-80)
 * Mobile:  Sheet trigger at bottom-right
 */
import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  CheckCircle2, AlertTriangle, RotateCcw, BookOpen, Info,
} from 'lucide-react';
import { Button }      from '@/components/ui/button';
import { Textarea }    from '@/components/ui/textarea';
import { ScrollArea }  from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge }       from '@/components/ui/badge';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional }   from '@/context/CameraContext';
import { useSolver }   from '@/hooks/useSolver';
import { useGeometryHistory } from '@/hooks/useGeometryHistory';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { buildSolveReveal, type SolveReveal } from '@/lib/solveReveal';
import { cn }          from '@/lib/utils';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Các chuỗi placeholder khi vẽ từ ảnh (OCR tắt trên Vercel nên đề thật KHÔNG được trích) —
// không auto-fill mấy chuỗi này vì chúng không phải đề bài, dễ khiến người dùng bấm giải nhầm.
const IMAGE_PLACEHOLDERS = ['Đề bài từ ảnh', 'Đề bài trong ảnh được đính kèm.', 'Đang nhận dạng ảnh'];

/**
 * Đề bài để tự điền vào ô giải. Ưu tiên:
 *   1. Đề gõ tay: prompt hàng đợi gần nhất (không phải ảnh) — sạch, đầy đủ.
 *   2. Đề từ ảnh: problemText ĐẦY ĐỦ lưu trên queue item (không bị cắt như nhãn hiển thị).
 *   3. Hình nạp lại (Lưu / URL, không có queue): geometry.llmPrompt.
 *   4. Fallback cuối: nhãn hàng đợi ảnh đã cắt (bỏ "📷" và "…").
 */
function useLastProblem(): string {
  const ctx = useGeometryOptional();
  if (!ctx) return '';

  const { queue, activeQueueId } = ctx.state;
  const isUsable = (q?: { status: string; prompt?: string }) =>
    !!q && (q.status === 'done' || q.status === 'processing') && !!q.prompt;

  // Ưu tiên item đang xem (active) để đúng với hình đang hiển thị; nếu không có, lấy item mới nhất.
  const active = activeQueueId ? queue.find(q => q.id === activeQueueId) : undefined;
  const last = isUsable(active)
    ? active
    : [...queue].reverse().find(isUsable);

  // 1) Đề gõ tay (không phải ảnh) → prompt hàng đợi là đề sạch, đầy đủ.
  if (last && !last.prompt.startsWith('📷')) return last.prompt;

  // 2) Đề ĐẦY ĐỦ từ ảnh, lưu nguyên trên queue item (nhãn `prompt` bị cắt 80 ký tự — KHÔNG dùng nó).
  const fromQueue = (last?.problemText || '').trim();
  if (fromQueue && !IMAGE_PLACEHOLDERS.includes(fromQueue)) return fromQueue;

  // 3) Hình nạp lại (Lưu / URL) → đề đã đọc lưu ở geometry.llmPrompt.
  const fromGeom = ((ctx.state.geometry as any)?.llmPrompt || '').trim();
  if (fromGeom && !IMAGE_PLACEHOLDERS.includes(fromGeom)) return fromGeom;

  // 4) Fallback: hình cũ chưa có llmPrompt → dùng tạm text đã cắt trong nhãn hàng đợi ảnh.
  if (last) {
    const cleaned = last.prompt.replace(/^📷\s*/, '').replace(/…$|\.{3}$/, '').trim();
    if (cleaned && !IMAGE_PLACEHOLDERS.includes(cleaned)) return cleaned;
  }
  return '';
}

// ─── Math rendering (KaTeX) ────────────────────────────────────────────────────

const isUpperLetter = (c: string) =>
  !!c && c.toLowerCase() !== c.toUpperCase() && c === c.toUpperCase();

/**
 * Tách văn xuôi thành từng CÂU (để mỗi câu xuống dòng cho dễ đọc). Ngắt tại dấu chấm + khoảng trắng
 * mà câu sau bắt đầu bằng chữ HOA / số / công thức. TÔN TRỌNG $...$ (không ngắt trong công thức) và
 * số thập phân (2.5 không bị ngắt), bỏ qua dấu ba chấm (...).
 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inMath = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    cur += ch;
    if (ch === '$') inMath = !inMath;
    if (!inMath && ch === '.' && text[i - 1] !== '.' && text[i + 1] !== '.') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      const next = text[j];
      if (j > i + 1 && next && (next === '$' || /[0-9]/.test(next) || isUpperLetter(next))) {
        out.push(cur.trim());
        cur = '';
        i = j - 1; // nuốt khoảng trắng
      }
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** Render một câu: phần $...$ / \(...\) dùng KaTeX, còn lại là chữ. */
function renderInline(text: string, keyPrefix: string) {
  const parts = (text || '').split(/(\$[^$]+\$|\\\([^)]*?\\\))/g);
  return parts.map((part, i) => {
    const inline =
      (part.startsWith('$') && part.endsWith('$') && part.length > 2) ? part.slice(1, -1) :
      (part.startsWith('\\(') && part.endsWith('\\)')) ? part.slice(2, -2) : null;
    if (inline != null) {
      return <InlineMath key={keyPrefix + i} math={inline} renderError={() => <span>{part}</span>} />;
    }
    return <span key={keyPrefix + i} className="whitespace-pre-wrap">{part}</span>;
  });
}

/** Đoạn văn có công thức inline: tách từng câu, mỗi câu một dòng cho dễ theo dõi. */
function MathText({ text, className }: { text: string; className?: string }) {
  const sentences = splitSentences(text || '');
  if (sentences.length <= 1) {
    return <p className={className}>{renderInline(text || '', 's0-')}</p>;
  }
  return (
    <div className={cn(className, 'space-y-1.5')}>
      {sentences.map((s, i) => (
        <p key={i}>{renderInline(s, `s${i}-`)}</p>
      ))}
    </div>
  );
}

// Các toán tử SUY RA / TƯƠNG ĐƯƠNG ở cấp ngoài cùng — chỗ xuống dòng tự nhiên của công thức dài.
const BREAK_OPS = new Set(['Longleftrightarrow', 'Leftrightarrow', 'Longrightarrow', 'Rightarrow',
  'Longleftarrow', 'Leftarrow', 'implies', 'impliedby', 'iff', 'longmapsto', 'longrightarrow', 'mapsto', 'to']);

/**
 * Tự xuống dòng công thức display dài: cắt tại các mũi tên suy ra (⇒, ⇔, →...) Ở CẤP NGOÀI CÙNG
 * (không nằm trong {}, \left...\right), gói vào \begin{gathered} để KaTeX render nhiều dòng.
 * Không cắt được thì trả nguyên (vẫn cuộn ngang được như cũ).
 */
function wrapTex(tex: string): string {
  if (tex.includes('\\begin{')) return tex; // đã là môi trường nhiều dòng -> để yên
  const s = tex;
  let depth = 0;
  const breaks: number[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth = Math.max(0, depth - 1); i++; continue; }
    if (c === '\\') {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const name = s.slice(i + 1, j);
      if (name === 'left') { depth++; i = j; continue; }
      if (name === 'right') { depth = Math.max(0, depth - 1); i = j; continue; }
      if (depth === 0 && BREAK_OPS.has(name)) breaks.push(i);
      i = j; continue;
    }
    i++;
  }
  if (breaks.length === 0) return tex;
  const segs: string[] = [];
  let start = 0;
  for (const b of breaks) { segs.push(s.slice(start, b).trim()); start = b; }
  segs.push(s.slice(start).trim());
  const lines = segs.filter(Boolean);
  if (lines.length <= 1) return tex;
  return `\\begin{gathered}${lines.join(' \\\\ ')}\\end{gathered}`;
}

/** Công thức khối: bỏ $...$/\[...\] bao ngoài (nếu có) rồi render KaTeX display. */
function FormulaBlock({ formula }: { formula: string }) {
  let tex = formula.trim();
  if (tex.startsWith('$$') && tex.endsWith('$$')) tex = tex.slice(2, -2);
  else if (tex.startsWith('$') && tex.endsWith('$')) tex = tex.slice(1, -1);
  else if (tex.startsWith('\\[') && tex.endsWith('\\]')) tex = tex.slice(2, -2);
  tex = wrapTex(tex);
  return (
    // Công thức dài không bị cắt: cuộn ngang (xử lý ở index.css cho .katex-display) + thu nhỏ chút.
    <div className="mt-1 rounded-lg bg-secondary/40 border border-border/40 px-3 py-2 overflow-x-auto [&_.katex]:text-[0.95rem]">
      <BlockMath math={tex} renderError={() => <span className="text-sm font-mono text-foreground/90 break-all">{formula}</span>} />
    </div>
  );
}

// ─── Step card ───────────────────────────────────────────────────────────────

interface StepCardProps {
  step: import('@/hooks/useSolver').SolveStep;
  index: number;
  total: number;
}

function StepCard({ step, index, total }: StepCardProps) {
  return (
    <div className="flex flex-col gap-2 py-3 px-1 animate-fade-in">
      {/* Step counter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
          Bước {index + 1}/{total}
        </span>
        <span className="text-sm font-medium text-foreground line-clamp-2">{step.title}</span>
      </div>

      {/* Explanation */}
      <MathText text={step.explanation} className="text-sm text-muted-foreground leading-relaxed" />

      {/* Formula (if any) */}
      {step.formula && <FormulaBlock formula={step.formula} />}

      {/* Highlighted elements hint */}
      {step.highlight && step.highlight.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {step.highlight.map(id => (
            <Badge key={id} variant="outline" className="text-xs py-0 px-1.5 font-mono">
              {id}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel content ────────────────────────────────────────────────────────────

export function SolverContent({ creditNote }: { creditNote?: string } = {}) {
  const ctx         = useGeometryOptional();
  const camera      = useCameraOptional();
  const lastProblem = useLastProblem();
  const { solve, reset, hydrate, result, loading, error, currentStep, setCurrentStep } = useSolver();
  const { updateGeometryData } = useGeometryHistory();

  const [problem, setProblem]     = useState('');
  const [reveal, setReveal]       = useState<SolveReveal | null>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);
  const solvedProblemRef          = useRef('');   // đề của lần giải hiện tại (để lưu kèm)
  const shouldSaveRef             = useRef(false); // true = kết quả GIẢI MỚI cần lưu (không phải khôi phục)

  // Pre-fill with last detected problem when geometry changes
  useEffect(() => {
    if (lastProblem && !result) {
      setProblem(lastProblem);
    }
  }, [lastProblem, result]);

  // Khôi phục lời giải đã LƯU kèm hình khi tải lại (không gọi API).
  useEffect(() => {
    const saved = (ctx?.state.geometry as any)?.solve;
    if (saved?.result && !result && !loading) {
      setProblem(saved.problem || '');
      hydrate(saved.result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.state.geometry]);

  // Khi có KẾT QUẢ: (1) dựng điểm lời giải giới thiệu & ghép vào hình, (2) LƯU lời giải kèm hình
  // để tải lại không mất. Deps CHỈ [result] để không lặp khi commit làm đổi state.geometry.
  useEffect(() => {
    const base = ctx?.state.geometry;
    if (!result || !base) { setReveal(null); return; }

    const hasConstruct = result.steps.some(s => s.construct && s.construct.length > 0);
    let merged = base;
    if (hasConstruct) {
      const rv = buildSolveReveal(base, result.steps);
      setReveal(rv);
      if (rv.newPoints.length > 0) merged = rv.mergedGeometry;
    } else {
      setReveal(null);
    }

    if (shouldSaveRef.current) {
      // Kết quả GIẢI MỚI -> ghép điểm + đính lời giải vào hình rồi LƯU (update bản đã lưu theo ?id).
      shouldSaveRef.current = false;
      const withSolve = { ...merged, solve: { problem: solvedProblemRef.current, result } };
      ctx!.loadGeometry(withSolve, { silent: true });
      const id = new URLSearchParams(window.location.search).get('id');
      if (id) void updateGeometryData(id, withSolve);
    } else if (merged !== base) {
      // Khôi phục mà hình thiếu điểm dựng (hiếm) -> ghép tạm, KHÔNG lưu lại.
      ctx!.loadGeometry(merged, { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Bóc-lớp + nhấn mạnh theo bước hiện tại.
  useEffect(() => {
    if (!camera) return;
    if (reveal && result) {
      const visible = reveal.stepVisibleIds[currentStep] ?? reveal.stepVisibleIds[reveal.stepVisibleIds.length - 1] ?? [];
      camera.setRevealVisibleIds(new Set(visible));
      const constructedNow = reveal.stepConstructIds[currentStep] ?? [];
      camera.setHighlightedIds(new Set([...(result.steps[currentStep]?.highlight ?? []), ...constructedNow]));
    } else if (result && result.steps[currentStep]) {
      camera.setHighlightedIds(new Set(result.steps[currentStep].highlight ?? []));
      camera.setRevealVisibleIds(null);
    } else {
      camera.setHighlightedIds(new Set());
      camera.setRevealVisibleIds(null);
    }
    return () => { camera.setHighlightedIds(new Set()); camera.setRevealVisibleIds(null); };
  }, [result, currentStep, camera, reveal]);

  const geometry = ctx?.state.geometry ?? null;
  const canSolve = !!geometry && problem.trim().length >= 10 && !loading;

  const handleSolve = () => {
    if (!canSolve || !geometry) return;
    solvedProblemRef.current = problem.trim();
    shouldSaveRef.current = true;   // đánh dấu: kết quả sắp tới là GIẢI MỚI -> cần lưu kèm hình
    solve(problem.trim(), geometry, geometry.tags || []);
  };

  const handleReset = () => {
    reset();
    setProblem(lastProblem);
    setReveal(null);
    // Giữ điểm đã dựng trong hình (người dùng chọn "giữ lại"); chỉ tắt lớp bóc theo bước.
    camera?.setHighlightedIds(new Set());
    camera?.setRevealVisibleIds(null);
  };

  const step    = result ? result.steps[currentStep] : null;
  const nSteps  = result ? result.steps.length : 0;

  // ── No geometry yet ──────────────────────────────────────────────────────
  if (!geometry) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Nhập đề bài ở thanh bên dưới để vẽ hình, rồi nhấn <strong>Giải bài</strong>.
        </p>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang giải bài toán...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive/60" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Thử lại
        </Button>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="h-full flex flex-col">
        {/* Đáp số — gọn, không hù dọa. Đã kiểm chứng: tick xanh; chưa: icon trung tính (KHÔNG phải X). */}
        <div className="px-4 py-3 border-b flex items-start gap-2">
          {result.verified ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <MathText text={result.final_answer} className="text-sm font-semibold text-foreground break-words" />
            <p className={cn('text-[11px] mt-0.5', result.verified ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground')}>
              {result.verified ? 'Đã được ứng dụng kiểm chứng' : 'Ứng dụng chưa kiểm chứng kết quả này'}
            </p>
          </div>
        </div>

        {/* Step navigation */}
        <div className="flex items-center justify-between px-3 py-2 border-b gap-2">
          <Button
            variant="ghost" size="icon"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(s => s - 1)}
            className="h-7 w-7"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-xs text-muted-foreground font-medium flex-1 text-center">
            {nSteps > 0 ? `${currentStep + 1} / ${nSteps} bước` : 'Không có bước nào'}
          </span>

          <Button
            variant="ghost" size="icon"
            disabled={currentStep >= nSteps - 1}
            onClick={() => setCurrentStep(s => s + 1)}
            className="h-7 w-7"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Step dots */}
        {nSteps > 1 && (
          <div className="flex justify-center gap-1 py-1.5">
            {result.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "rounded-full transition-all",
                  i === currentStep
                    ? "bg-primary w-4 h-1.5"
                    : "bg-muted-foreground/30 w-1.5 h-1.5 hover:bg-muted-foreground/60"
                )}
              />
            ))}
          </div>
        )}

        {/* Step content */}
        {/* Ép child của viewport về block (Radix để display:table -> phình ngang theo công thức dài,
            khiến overflow-x của khung công thức không kích hoạt). Chỉ áp cho ScrollArea này. */}
        <ScrollArea className="flex-1 px-4 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0">
          {step ? (
            <StepCard step={step} index={currentStep} total={nSteps} />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Không có bước nào.</p>
          )}
        </ScrollArea>

        {/* Reset button */}
        <div className="px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={handleReset} className="w-full gap-1.5 h-8">
            <RotateCcw className="w-3 h-3" /> Giải lại
          </Button>
        </div>
      </div>
    );
  }

  // ── Input / Solve CTA ─────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-0">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-foreground">Giải bài toán</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nhập đề bài rồi nhấn nút để xem lời giải từng bước.
        </p>
      </div>

      {/* Problem input */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-2 min-h-0">
        <Textarea
          ref={textareaRef}
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Dán đề bài vào đây..."
          className="flex-1 min-h-[120px] resize-none text-sm bg-secondary/30 border-border/50 focus-visible:ring-primary/50"
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed shrink-0">
          💡 Đề gõ bằng chữ sẽ tự điền sẵn ở đây. Nếu bạn <strong className="text-foreground/80">vẽ hình từ ảnh</strong>, hãy gõ hoặc dán lại đề (kèm <strong className="text-foreground/80">câu hỏi</strong>, vd: "Tính thể tích khối chóp") vào ô này rồi nhấn Giải.
        </p>
      </div>

      {/* Solve button */}
      <div className="px-4 py-3 border-t">
        <Button
          onClick={handleSolve}
          disabled={!canSolve}
          className="w-full gap-2 font-semibold"
          size="lg"
        >
          <Sparkles className="w-4 h-4" />
          Giải bài toán
        </Button>
        {!geometry && (
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            Cần vẽ hình trước
          </p>
        )}
        {geometry && creditNote && (
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            {creditNote}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Thanh kéo giãn ────────────────────────────────────────────────────────────

/** Nắm kéo ở MÉP TRÁI của panel bên phải: kéo để chỉnh rộng, nhấn đúp để đặt lại. */
export function ResizeHandle({ onPointerDown, onReset }: { onPointerDown: (e: React.PointerEvent) => void; onReset?: () => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      title="Kéo để chỉnh rộng · nhấn đúp để đặt lại"
      className="group absolute left-0 top-0 h-full w-2.5 -translate-x-1/2 cursor-col-resize z-50 flex items-center justify-center touch-none"
    >
      <div className="h-12 w-1 rounded-full bg-border/70 group-hover:bg-primary transition-colors" />
    </div>
  );
}

// ─── Desktop panel ────────────────────────────────────────────────────────────

export function SolverPanel() {
  const { onPointerDown, reset } = useResizableWidth({ cssVar: '--solver-w', storageKey: 'solver_panel_w', def: 320, min: 280, max: 720 });
  return (
    <aside
      style={{ width: 'var(--solver-w, 20rem)' }}
      className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 border-l border-border/50 bg-background/95 backdrop-blur-sm z-40"
    >
      <ResizeHandle onPointerDown={onPointerDown} onReset={reset} />
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Lời giải</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <SolverContent />
      </div>
    </aside>
  );
}

// ─── Mobile sheet ─────────────────────────────────────────────────────────────

export function MobileSolverPanel() {
  const [open, setOpen] = useState(false);
  const ctx = useGeometryOptional();
  const hasGeo = !!ctx?.state.geometry;

  if (!hasGeo) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-20 right-4 z-50 rounded-full gap-2 shadow-lg lg:hidden"
          size="sm"
        >
          <Sparkles className="w-4 h-4" />
          Giải bài
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] p-0 flex flex-col">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Lời giải</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <SolverContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
