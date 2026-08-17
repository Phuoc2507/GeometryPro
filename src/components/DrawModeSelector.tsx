import { Zap, Layers, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCredits } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { getGuestQuotaRemaining } from '@/lib/quota';
import { useEffect, useState } from 'react';

export type DrawMode = 'quick' | 'detailed' | 'advance';

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
    credits: 10, // khớp CREDIT_COST.draw_quick (api/_lib/entitlements.js)
  },
  {
    id: 'detailed' as DrawMode,
    label: 'Vẽ kỹ',
    icon: Layers,
    time: '~10s',
    desc: '2 lần gọi AI',
    credits: 20, // khớp CREDIT_COST.draw_detailed
  },
  {
    id: 'advance' as DrawMode,
    label: 'Advance',
    icon: Sparkles,
    time: '~30s',
    desc: 'đa-câu / động',
    credits: 30, // khớp CREDIT_COST.draw_advance
  },
];

export function DrawModeSelector({ value, onChange }: DrawModeSelectorProps) {
  const { tier, credits, user, drawQuotaRemaining, isAdmin } = useAuth();
  const [, setQuotaVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setQuotaVersion((version) => version + 1);
    window.addEventListener('geometrypro:quota', refresh);
    return () => window.removeEventListener('geometrypro:quota', refresh);
  }, []);
  const selected = modes.find(m => m.id === value)!;
  const isPaid = tier !== 'free';
  const guestFeature = selected.id === 'detailed' ? 'draw_detailed' : 'draw_quick';
  const freeRemaining = user ? drawQuotaRemaining : getGuestQuotaRemaining(guestFeature);
  return (
    <div className="w-full space-y-1.5">
      <div className="flex gap-1.5 w-full">
        {modes.map((mode) => {
          // Advance đang nâng cấp → KHOÁ cho mọi người trừ quản trị viên (khách cũng không phải admin).
          const advanceLocked = mode.id === 'advance' && !isAdmin;
          const Icon = advanceLocked ? Lock : mode.icon;
          const isActive = value === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                if (advanceLocked) {
                  toast.info('Chế độ Advance đang được nâng cấp', {
                    description: 'Tính năng tạm thời chỉ dành cho quản trị viên. Bạn hãy dùng Vẽ nhanh hoặc Vẽ kỹ nhé.',
                  });
                  return;
                }
                onChange(mode.id);
              }}
              aria-disabled={advanceLocked}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs transition-all duration-200 border",
                isActive
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50",
                advanceLocked && "opacity-60"
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
        {selected.id === 'advance' && !isAdmin ? (
          <span className="text-primary flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Advance đang nâng cấp — chỉ dành cho quản trị viên
          </span>
        ) : isPaid ? (
          <>
            <Sparkles className="w-3 h-3 text-primary" />
            Tốn <strong className="text-primary">{selected.credits} credit</strong> · còn {formatCredits(credits)}
          </>
        ) : !user && selected.id === 'advance' ? (
          <span className="text-primary">Đăng nhập tài khoản Free để dùng Advance</span>
        ) : freeRemaining != null ? (
          freeRemaining > 0 ? (
            <>Miễn phí · <strong>còn {freeRemaining}</strong> lượt vẽ hôm nay</>
          ) : (
            <span className="text-primary">Đã hết lượt hôm nay — nâng cấp để vẽ tiếp</span>
          )
        ) : (
          <>{selected.desc} · Ước tính {selected.time}</>
        )}
      </p>
    </div>
  );
}
