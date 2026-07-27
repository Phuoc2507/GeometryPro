import { ReactNode, CSSProperties } from 'react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

/** Bọc nội dung để nó "trồi lên & hiện dần" khi cuộn tới. `delay` (giây) để so le nhiều khối. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn('lp-reveal', inView && 'in', className)}
      style={delay ? ({ '--d': `${delay}s` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
