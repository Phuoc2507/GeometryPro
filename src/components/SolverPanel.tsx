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
  CheckCircle2, AlertTriangle, RotateCcw, BookOpen,
} from 'lucide-react';
import { Button }      from '@/components/ui/button';
import { Textarea }    from '@/components/ui/textarea';
import { ScrollArea }  from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge }       from '@/components/ui/badge';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional }   from '@/context/CameraContext';
import { useSolver }   from '@/hooks/useSolver';
import { cn }          from '@/lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return the most recent non-image problem prompt from the queue (done or processing) */
function useLastProblem(): string {
  const ctx = useGeometryOptional();
  if (!ctx) return '';
  const relevant = ctx.state.queue.filter(
    q => (q.status === 'done' || q.status === 'processing') &&
         q.prompt && !q.prompt.startsWith('📷')
  );
  if (relevant.length > 0) return relevant[0].prompt;
  // Hình được nạp lại (từ Lưu / URL) không có queue → lấy đề đã lưu kèm geometry.
  return (ctx.state.geometry as any)?.llmPrompt || '';
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
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {step.explanation}
      </p>

      {/* Formula (if any) */}
      {step.formula && (
        <div className="mt-1 rounded-lg bg-secondary/40 border border-border/40 px-3 py-2">
          <p className="text-sm font-mono text-foreground/90 break-all">{step.formula}</p>
        </div>
      )}

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
  const { solve, reset, result, loading, error, currentStep, setCurrentStep } = useSolver();

  const [problem, setProblem]     = useState('');
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  // Pre-fill with last detected problem when geometry changes
  useEffect(() => {
    if (lastProblem && !result) {
      setProblem(lastProblem);
    }
  }, [lastProblem, result]);

  // Sync highlight to 3D canvas when step changes
  useEffect(() => {
    if (!camera) return;
    if (result && result.steps[currentStep]) {
      camera.setHighlightedIds(new Set(result.steps[currentStep].highlight ?? []));
    } else {
      camera.setHighlightedIds(new Set());
    }
    return () => { camera.setHighlightedIds(new Set()); };
  }, [result, currentStep, camera]);

  const geometry = ctx?.state.geometry ?? null;
  const canSolve = !!geometry && problem.trim().length >= 10 && !loading;

  const handleSolve = () => {
    if (!canSolve || !geometry) return;
    solve(problem.trim(), geometry, geometry.tags || []);
  };

  const handleReset = () => {
    reset();
    setProblem(lastProblem);
    camera?.setHighlightedIds(new Set());
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
        {/* Final answer banner */}
        <div className={cn(
          "px-4 py-3 border-b flex items-start gap-2",
          result.verified ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"
        )}>
          {result.verified ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground/70 mb-0.5">
              {result.verified ? 'Kết quả đã xác minh' : 'Kết quả chưa xác minh'}
            </p>
            <p className="text-sm font-semibold text-foreground break-words">{result.final_answer}</p>
            {!result.verified && result.verify_error && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5 break-all">
                {result.verify_error}
              </p>
            )}
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
        <ScrollArea className="flex-1 px-4">
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
      <div className="flex-1 px-4 py-3">
        <Textarea
          ref={textareaRef}
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Dán đề bài vào đây..."
          className="h-full min-h-[120px] resize-none text-sm bg-secondary/30 border-border/50 focus-visible:ring-primary/50"
        />
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

// ─── Desktop panel ────────────────────────────────────────────────────────────

export function SolverPanel() {
  return (
    <aside className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-80 border-l border-border/50 bg-background/95 backdrop-blur-sm z-40">
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
