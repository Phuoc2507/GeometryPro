import { safetyTierMeta, exactnessLabel, type SafetyClassification } from '@/lib/safetyTier';
import { cn } from '@/lib/utils';

/**
 * Banner giáo viên: "[Dạng bài] · Mức N — nhãn" (+ chip chính xác khi Mức 1; + lý do khi Mức 3).
 * Tự ẩn khi không có classification. CHỈ mount ở <aside> desktop (teacher-only ≥1024px).
 */
export function TierBanner({ classification }: { classification?: SafetyClassification | null }) {
  if (!classification) return null;
  const meta = safetyTierMeta(classification.level);
  const Icon = meta.icon;
  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 border-b border-border/40 text-xs', meta.bannerClass)}>
      <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', meta.tone === 'ok' ? 'text-green-500' : meta.tone === 'muted' ? 'text-blue-500' : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-foreground">{classification.problemType}</span>
          <span className="text-muted-foreground">· Mức {classification.level}</span>
          <span className="font-medium text-foreground/90">{meta.label}</span>
          {classification.level === 1 && classification.exactness && (
            <span className="px-1.5 py-0.5 rounded bg-secondary/60 text-[10px] text-muted-foreground">
              {exactnessLabel(classification.exactness)}
            </span>
          )}
        </div>
        {classification.level === 3 && classification.reason?.message && (
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug break-words">
            {classification.reason.message}
          </p>
        )}
      </div>
    </div>
  );
}
