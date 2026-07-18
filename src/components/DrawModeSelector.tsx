import { Zap, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export type DrawMode = 'quick' | 'detailed';

interface DrawModeSelectorProps {
  value: DrawMode;
  onChange: (mode: DrawMode) => void;
}

const modes = [
  {
    id: 'quick' as DrawMode,
    label: 'Vẽ nhanh',
    icon: Zap,
    time: '~5s',
    desc: '1 lần gọi AI',
    credits: 1,
  },
  {
    id: 'detailed' as DrawMode,
    label: 'Vẽ kỹ',
    icon: Layers,
    time: '~10s',
    desc: '2 lần gọi AI',
    credits: 2,
  },
];

export function DrawModeSelector({ value, onChange }: DrawModeSelectorProps) {
  const { tier, credits } = useAuth();
  const selected = modes.find(m => m.id === value)!;
  const isPaid = tier !== 'free';
  return (
    <div className="w-full space-y-1.5">
      <div className="flex gap-1.5 w-full">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = value === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs transition-all duration-200 border",
                isActive
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="font-medium">{mode.label}</span>
            </button>
          );
        })}
      </div>
      {/* Giá + số dư (gói trả phí) hoặc thời gian ước tính (free) */}
      <p className="text-[11px] text-muted-foreground/70 text-center flex items-center justify-center gap-1">
        {isPaid ? (
          <>
            <Sparkles className="w-3 h-3 text-primary" />
            Tốn <strong className="text-primary">{selected.credits} credit</strong> · còn {credits}
          </>
        ) : (
          <>{selected.desc} · Ước tính {selected.time}</>
        )}
      </p>
    </div>
  );
}