import { cn } from '@/lib/utils';

/** Logo geo3d: tam giác có trung tuyến nét đứt + đỉnh chấm — chính là quy ước nét khuất. */
export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3.5 L3.5 20 L20.5 20 Z" />
      <path d="M12 3.5 L12 20" strokeDasharray="2 2" opacity="0.55" />
      <circle cx="12" cy="3.5" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Chữ hiệu geo3d dùng chung cho toàn bộ funnel (landing, auth, saved…). */
export function Wordmark({
  className = '',
  markClassName = 'w-6 h-6 text-primary',
  textClassName = 'text-lg',
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Mark className={markClassName} />
      <span className={cn('font-bold tracking-tight', textClassName)}>
        geo<span className="font-cm italic text-primary">3d</span>
      </span>
    </div>
  );
}
