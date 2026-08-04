/**
 * DrawQualityPrompt — bảng nhỏ "AI vẽ đúng hình chưa?" hiện NGAY SAU KHI vẽ xong.
 *
 * - Không che hình (đặt nổi ở đáy giữa, hình vẫn xem được bên trên).
 * - "Đúng rồi" → đóng. "Chưa đúng" → mở feedback gửi admin (kèm đề + hình);
 *   khách chưa đăng nhập → mời đăng nhập.
 * - Kích hoạt khi có lượt vẽ MỚI hoàn tất (item queue 'done' có completedAt mới).
 *   Bỏ qua hình đã có sẵn lúc mở trang; KHÔNG hiện khi chỉ xem lại lịch sử
 *   (thao tác đó không tạo lượt vẽ mới).
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useAuth } from '@/context/AuthContext';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import type { QueueItem } from '@/types/geometry';

export function DrawQualityPrompt() {
  const ctx = useGeometryOptional();
  const { user, openAuthModal } = useAuth();
  const queue = ctx?.state.queue;
  const geometry = ctx?.state.geometry ?? null;

  const [visible, setVisible] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const seenKey = useRef<number | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const items = queue ?? [];
    let latest: QueueItem | null = null;
    for (const q of items) {
      if (q.status === 'done' && q.completedAt) {
        if (!latest || (q.completedAt ?? 0) > (latest.completedAt ?? 0)) latest = q;
      }
    }
    const key = latest?.completedAt ?? null;

    // Lần chạy đầu (mở trang): chỉ ghi nhận mốc hiện có, KHÔNG hỏi cho hình sẵn có.
    if (!initialized.current) {
      initialized.current = true;
      seenKey.current = key;
      return;
    }
    // Có lượt vẽ mới hoàn tất → hỏi.
    if (key && key !== seenKey.current) {
      seenKey.current = key;
      setPromptText(latest?.problemText || latest?.prompt || null);
      setFeedbackOpen(false);
      setVisible(true);
    }
  }, [queue]);

  if (!ctx) return null;

  const handleWrong = () => {
    if (!user) { openAuthModal('general'); return; }  // khách → mời đăng nhập
    setVisible(false);
    setFeedbackOpen(true);
  };

  return (
    <>
      {/* Chỉ hỏi khi ĐÃ có hình để "xem bên trên" — tránh đè lên card nhập đề (empty state). */}
      {visible && geometry && (
        <div className="fixed bottom-28 left-1/2 z-40 w-[min(92vw,380px)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur">
          <button
            onClick={() => setVisible(false)}
            className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="pr-6 text-sm font-semibold">AI vẽ đúng hình chưa?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Xem hình bên trên rồi cho tụi mình biết nhé — sai thì báo để admin sửa.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="flex-1 gap-1.5" onClick={() => setVisible(false)}>
              <CheckCircle2 className="h-4 w-4" /> Đúng rồi
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={handleWrong}>
              Chưa đúng
            </Button>
          </div>
        </div>
      )}

      <FeedbackDialog
        prompt={promptText}
        geometry={geometry}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        hideTrigger
        defaultKind="lỗi"
      />
    </>
  );
}
