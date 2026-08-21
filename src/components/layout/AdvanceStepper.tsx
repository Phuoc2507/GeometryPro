import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { safetyTierMeta, verifiedToLevel } from '@/lib/safetyTier';
import { useGeometryOptional } from '@/context/GeometryContext';
import AdvanceAnimControl from './AdvanceAnimControl';

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
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 flex flex-col items-stretch gap-2 glass rounded-xl px-4 py-3 border border-border/50 w-[90%] max-w-2xl shadow-lg">
      {/* Thanh kéo + play cho câu có animation (rev-ox…) — nằm trên hàng chọn câu. */}
      {(() => {
        const step = steps[clampedStep];
        return step?.anim ? (
          <div className="mb-1 flex justify-center">
            <AdvanceAnimControl label={step.anim.label} autoplay={step.anim.autoplay} />
          </div>
        ) : null;
      })()}

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

      {/* Đáp câu hiện tại. CHỈ hiện badge "đã kiểm chứng" khi engine đã tự kiểm (verified) — câu chưa
          kiểm chứng KHÔNG hiện badge âm (tránh làm người dùng hiểu là sai). */}
      {hasAnswer && (
        <div className="flex items-center gap-2 border-t border-border/40 pt-2 text-sm">
          <span className="flex-1 min-w-0 text-foreground">{answer!.text}</span>
          {answer!.verified && (() => {
            const meta = safetyTierMeta(verifiedToLevel(true));
            const Icon = meta.icon;
            return (
              <span className={cn('shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', meta.badgeClass)}>
                <Icon className="w-3 h-3" />
                đã kiểm chứng
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}
