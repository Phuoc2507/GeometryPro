/**
 * FeedbackDialog — nút "Báo lỗi / Góp ý" + hộp thoại gửi phản hồi.
 *
 * Người dùng ĐÃ ĐĂNG NHẬP gửi trực tiếp vào bảng `user_feedback` qua RLS
 * (policy owner-check: auth.uid() = user_id). Khách chưa đăng nhập → mở AuthModal.
 * Tự đính kèm ngữ cảnh: đề bài, ảnh chụp geometry (hoặc id bản đã lưu), trang hiện tại.
 */
import { useEffect, useState } from 'react';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { GeometryData } from '@/types/geometry';
import { cn } from '@/lib/utils';

type FeedbackKind = 'lỗi' | 'góp ý' | 'khác';

interface FeedbackDialogProps {
  /** Đề bài liên quan (nếu có) — sẽ đính kèm để admin tái hiện. */
  prompt?: string | null;
  /** Hình đang xem — chụp lại làm bằng chứng nếu chưa được lưu. */
  geometry?: GeometryData | null;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: 'outline' | 'ghost' | 'secondary';
  triggerSize?: 'sm' | 'default' | 'icon';
  /** Điều khiển đóng/mở từ ngoài (vd mở từ bảng "AI vẽ đúng chưa?"). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Ẩn nút bấm mặc định (khi chỉ mở bằng điều khiển ngoài). */
  hideTrigger?: boolean;
  /** Loại phản hồi mặc định khi mở. */
  defaultKind?: FeedbackKind;
}

const MAX_MESSAGE = 2000;

export function FeedbackDialog({
  prompt,
  geometry,
  triggerLabel = 'Báo lỗi / Góp ý',
  triggerClassName,
  triggerVariant = 'ghost',
  triggerSize = 'sm',
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  defaultKind = 'lỗi',
}: FeedbackDialogProps) {
  const { user, openAuthModal } = useAuth();
  // Hỗ trợ cả tự quản (nút bấm sẵn) lẫn điều khiển từ ngoài (mở bằng open/onOpenChange).
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (o: boolean) => { if (isControlled) onOpenChange?.(o); else setInternalOpen(o); };
  const [kind, setKind] = useState<FeedbackKind>(defaultKind);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mỗi lần mở, đặt lại loại mặc định (vd mở từ "Chưa đúng" → 'lỗi').
  useEffect(() => { if (open) setKind(defaultKind); }, [open, defaultKind]);

  const handleTriggerClick = () => {
    // Chưa đăng nhập → mời đăng nhập (đồng ý ngầm + gắn feedback với tài khoản + chống spam).
    if (!user) {
      openAuthModal('general');
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) { openAuthModal('general'); return; }
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast.error('Vui lòng mô tả rõ hơn (ít nhất 3 ký tự).');
      return;
    }
    setSubmitting(true);
    try {
      // Bản đã lưu có ?id= trên URL → tham chiếu; nếu chưa lưu → chụp snapshot geometry.
      const savedId = new URLSearchParams(window.location.search).get('id');
      const row = {
        user_id: user.id,
        kind,
        message: trimmed.slice(0, MAX_MESSAGE),
        prompt: prompt ? String(prompt).slice(0, 5000) : null,
        saved_geometry_id: savedId || null,
        geometry_snapshot: (!savedId && geometry ? geometry : null) as unknown as Json,
        page_path: window.location.pathname,
      };
      const { error } = await supabase.from('user_feedback').insert(row);
      if (error) throw error;

      toast.success('Đã gửi phản hồi. Cảm ơn bạn!');
      setMessage('');
      setKind(defaultKind);
      setOpen(false);
    } catch (err) {
      console.error('Gửi feedback lỗi:', err);
      toast.error('Không gửi được phản hồi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          variant={triggerVariant}
          size={triggerSize}
          onClick={handleTriggerClick}
          className={cn('gap-1.5 text-muted-foreground hover:text-foreground', triggerClassName)}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {triggerSize !== 'icon' && triggerLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Báo lỗi / Góp ý</DialogTitle>
            <DialogDescription>
              Bài vẽ sai, máy không vẽ được, hay bạn có góp ý? Gửi cho đội ngũ quản trị.
              Chúng tôi tự đính kèm đề &amp; hình bạn đang xem để dễ kiểm tra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Loại phản hồi</label>
              <Select value={kind} onValueChange={(v) => setKind(v as FeedbackKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lỗi">Báo lỗi (vẽ sai / không vẽ được)</SelectItem>
                  <SelectItem value="góp ý">Góp ý cải thiện</SelectItem>
                  <SelectItem value="khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nội dung</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX_MESSAGE}
                placeholder="Mô tả vấn đề hoặc góp ý của bạn..."
                className="min-h-[110px] resize-none text-sm"
              />
              <p className="text-[11px] text-muted-foreground text-right">{message.length}/{MAX_MESSAGE}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || message.trim().length < 3} className="gap-1.5">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gửi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
