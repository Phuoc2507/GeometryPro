import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGeometryOptional } from '@/context/GeometryContext';

/**
 * AdvanceStepper — bộ chuyển câu cho bài "advance" đa-câu.
 *
 * Đọc `state.advanceScene` + `state.currentStep` từ GeometryContext, cho phép
 * bấm qua từng câu (tab + ◀/▶). Đổi `currentStep` → GeometryRenderer re-tính
 * hình dẫn xuất (bóc lớp theo `visibleIds`). Tự ẩn khi không phải bài advance
 * đa-câu (≤ 1 câu) nên có thể chèn vô điều kiện cạnh TimelinePlayer.
 */
export function AdvanceStepper() {
  const context = useGeometryOptional();
  const advanceScene = context?.state.advanceScene;
  const currentStep = context?.state.currentStep ?? 0;

  // Ẩn khi không có scene advance hoặc chỉ 1 câu (continuous_animation → TimelinePlayer lo).
  if (!context || !advanceScene || advanceScene.steps.length <= 1) return null;

  const { setStep } = context;
  const steps = advanceScene.steps;
  const lastIndex = steps.length - 1;
  const clampedStep = Math.max(0, Math.min(currentStep, lastIndex));

  const goTo = (i: number) => setStep(Math.max(0, Math.min(i, lastIndex)));

  const answer = steps[clampedStep]?.answer;
  const hasAnswer = !!answer?.text;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-stretch gap-2 glass rounded-xl px-4 py-3 border border-border/50 w-[90%] max-w-2xl shadow-lg">
      {/* Hàng điều khiển: ◀  [tab các câu]  ▶ */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground rounded-full disabled:opacity-30"
          onClick={() => goTo(clampedStep - 1)}
          disabled={clampedStep <= 0}
          aria-label="Câu trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-0.5">
          {steps.map((s, i) => (
            <button
              key={s.id ?? i}
              onClick={() => goTo(i)}
              className={cn(
                'shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                i === clampedStep
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground rounded-full disabled:opacity-30"
          onClick={() => goTo(clampedStep + 1)}
          disabled={clampedStep >= lastIndex}
          aria-label="Câu sau"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Đáp câu hiện tại + badge kiểm chứng */}
      {hasAnswer && (
        <div className="flex items-center gap-2 border-t border-border/40 pt-2 text-sm">
          <span className="flex-1 min-w-0 text-foreground">{answer!.text}</span>
          {answer!.verified ? (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              đã kiểm chứng
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              chưa kiểm chứng
            </span>
          )}
        </div>
      )}
    </div>
  );
}
