import { Zap, Layers, Sparkles, Lock, HelpCircle, Coins, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCredits } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { getGuestQuotaRemaining } from '@/lib/quota';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    // Nhãn siêu ngắn dưới nút (tag) — nhìn phát hiểu ngay khác biệt CẢ 3 mà không cần bấm.
    tag: 'Nhanh · gọn',
    // Mô tả HƯỚNG NGƯỜI DÙNG (thay cho "1 lần gọi AI" khó hiểu): nói lợi ích, không nói kỹ thuật.
    desc: 'Hình cơ bản, xem nhanh',
    credits: 10, // khớp CREDIT_COST.draw_quick (api/_lib/entitlements.js)
  },
  {
    id: 'detailed' as DrawMode,
    label: 'Vẽ kỹ',
    icon: Layers,
    tag: 'Kỹ · chi tiết',
    desc: 'Chi tiết & chính xác hơn',
    credits: 20, // khớp CREDIT_COST.draw_detailed
  },
  {
    id: 'advance' as DrawMode,
    label: 'Advance',
    icon: Sparkles,
    tag: 'Nâng cao',
    desc: 'Đa-câu / động',
    credits: 30, // khớp CREDIT_COST.draw_advance
  },
];

// Nội dung bảng SO SÁNH (mở từ nút "?"). Tách riêng để dễ chỉnh chữ mà không đụng layout.
// Nhấn mạnh "KHI NÀO nên dùng cái nào" — hữu ích hơn liệt kê tính năng khô khan.
const compareModes = [
  {
    id: 'quick' as const,
    label: 'Vẽ nhanh',
    icon: Zap,
    accent: 'text-amber-500',
    ring: 'border-amber-500/30 bg-amber-500/5',
    meta: '10 credit',
    points: ['Vẽ 1 bước, ưu tiên tốc độ', 'Hình tĩnh: điểm & cạnh chính'],
    bestFor: 'Hình cơ bản, xem nhanh, tiết kiệm',
  },
  {
    id: 'detailed' as const,
    label: 'Vẽ kỹ',
    icon: Layers,
    accent: 'text-primary',
    ring: 'border-primary/30 bg-primary/5',
    meta: '20 credit',
    points: ['Phân loại đề trước rồi mới vẽ', 'Chi tiết hơn, có thể có chuyển động'],
    bestFor: 'Bài phức tạp, cần chính xác & trình bày kỹ',
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
      {/* Hàng tiêu đề + nút "So sánh" mở bảng đối chiếu (chạy tốt cả chạm lẫn click). */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium text-muted-foreground/80">Chế độ vẽ</span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="So sánh các chế độ vẽ"
              className="flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-primary transition-colors rounded-md px-1.5 py-0.5 -mr-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>So sánh</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[min(20rem,calc(100vw-2rem))] p-3"
          >
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              Chọn chế độ nào?
            </p>
            <div className="space-y-2">
              {compareModes.map((m) => {
                const MIcon = m.icon;
                return (
                  <div key={m.id} className={cn('rounded-lg border p-2.5', m.ring)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <MIcon className={cn('w-3.5 h-3.5', m.accent)} />
                        {m.label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Coins className="w-3 h-3" />
                        {m.meta}
                      </span>
                    </div>
                    <ul className="space-y-1 mb-1.5">
                      {m.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                          <Check className={cn('w-3 h-3 mt-0.5 shrink-0', m.accent)} />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] leading-snug">
                      <span className="text-muted-foreground/70">Phù hợp: </span>
                      <span className="font-medium">{m.bestFor}</span>
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 pt-2 border-t text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <Coins className="w-3 h-3" />
              Credit chỉ trừ khi vẽ thành công.
            </p>
          </PopoverContent>
        </Popover>
      </div>
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
              <span className="font-medium leading-tight">{mode.label}</span>
              <span className={cn(
                "text-[9px] leading-tight",
                isActive ? "text-primary/80" : "text-muted-foreground/60"
              )}>
                {mode.tag}
              </span>
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
          <>Miễn phí</>
        )}
      </p>
    </div>
  );
}
