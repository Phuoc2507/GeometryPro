import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Thông báo quảng bá chương trình Mã Mời — hiện khi khách vào app (kể cả đã mua gói).
// Có "Không hiện lại" (opt-out vĩnh viễn). Chỉ hiện 1 lần mỗi phiên để không làm phiền.
const DISMISS_KEY = 'geo3d:refPromoDismissed';    // tắt vĩnh viễn
const SHOWN_KEY = 'geo3d:refPromoShownSession';   // đã hiện trong phiên này

export function ReferralAnnouncement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    let dismissed = false;
    let shown = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* bỏ qua */ }
    try { shown = sessionStorage.getItem(SHOWN_KEY) === '1'; } catch { /* bỏ qua */ }
    if (dismissed || shown) return;
    const t = setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch { /* bỏ qua */ }
    }, 1400);
    return () => clearTimeout(t);
  }, [user]);

  const close = () => {
    if (dontShow) { try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* bỏ qua */ } }
    setOpen(false);
  };
  const goReferral = () => { close(); navigate('/gioi-thieu'); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary">
            <Gift className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">Giới thiệu bạn — cùng có lợi! 🎁</DialogTitle>
          <DialogDescription className="text-center">
            Chương trình mới: mời bạn bè dùng GeoPro để nhận thưởng.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">−10%</div>
            <p className="text-xs text-muted-foreground">giảm cho bạn của bạn</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">60%</div>
            <p className="text-xs text-muted-foreground">hoa hồng cho bạn</p>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Nhận <b className="text-foreground">tiền mặt</b> vào ví, rút về ngân hàng. Xem lại bất cứ lúc nào ở menu → <b className="text-foreground">Giới thiệu bạn</b>.
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={goReferral} className="w-full">
            <Sparkles className="mr-1.5 h-4 w-4" /> Lấy mã &amp; giới thiệu ngay
          </Button>
          <Button variant="ghost" onClick={close} className="w-full">Để sau</Button>
          <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            Không hiện lại thông báo này
          </label>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
