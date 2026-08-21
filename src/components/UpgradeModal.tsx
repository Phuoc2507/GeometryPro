import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, CheckCircle2, Sparkles, GraduationCap, Presentation, Ticket, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FALLBACK_PLANS, fmtVnd, type Plan } from "@/lib/plans";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HIGHLIGHT: Record<string, boolean> = { pro_1m: true, student_1m: true };

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { user, tier: currentTier, lockedRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [buying, setBuying] = useState<string | null>(null);
  const [creditPrice, setCreditPrice] = useState(500);
  // Mã mời (giảm 10% cho người được mời).
  const [refInput, setRefInput] = useState('');
  const [refApplied, setRefApplied] = useState<string | null>(null);
  const [refStatus, setRefStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [refMsg, setRefMsg] = useState('');

  // Vai trò đang chọn: nếu đã có gói thì theo gói; nếu free thì theo mode đang xem.
  const mode: 'student' | 'teacher' =
    lockedRole ?? (location.pathname.startsWith('/teacher') ? 'teacher' : 'student');
  // Chỉ hiện gói đúng vai trò + có giá (bỏ gói "Liên hệ" như Trường).
  const shownPlans = plans.filter((p) => p.role === mode && p.price_vnd > 0);

  // Đọc bảng giá trực tiếp từ Supabase (RLS cho phép SELECT). Lỗi -> giữ fallback.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("code, tier, role, name, price_vnd, credits_per_cycle, cycle_days, duration_days")
        .eq("active", true)
        .neq("code", "free")
        .order("price_vnd", { ascending: true });
      if (!error && data && data.length) setPlans(data as Plan[]);
      const { data: pc } = await supabase.from("pricing_config").select("value").eq("key", "credit_price_vnd").maybeSingle();
      if (pc?.value) setCreditPrice(pc.value);
    })();
  }, [open]);

  // Tự điền + tự áp mã mời đã bắt từ link chia sẻ (?ref=) khi mở modal (nếu đã đăng nhập).
  useEffect(() => {
    if (!open || refApplied) return;
    let c = '';
    try { c = localStorage.getItem('geo3d:ref') || ''; } catch { /* bỏ qua */ }
    if (c) setRefInput(c);
    if (c && user && refStatus === 'idle') applyRef(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const applyRef = async (codeArg?: string) => {
    const code = (codeArg ?? refInput).trim().toUpperCase();
    if (!code) return;
    if (!user) {
      toast({ title: "Vui lòng đăng nhập", description: "Đăng nhập để dùng mã mời.", variant: "destructive" });
      return;
    }
    setRefStatus('checking'); setRefMsg('');
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      const res = await fetch(`/api/referral?validate=${encodeURIComponent(code)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = await res.json();
      if (j.valid) {
        setRefApplied(code); setRefStatus('valid');
        setRefMsg(j.referrerName ? `Hợp lệ · được giới thiệu bởi ${j.referrerName}` : 'Mã hợp lệ · giảm 10%');
      } else {
        setRefApplied(null); setRefStatus('invalid'); setRefMsg(j.message || 'Mã không hợp lệ');
        if (['not_found', 'self', 'not_first'].includes(j.reason)) { try { localStorage.removeItem('geo3d:ref'); } catch { /* bỏ qua */ } }
      }
    } catch {
      setRefApplied(null); setRefStatus('invalid'); setRefMsg('Không kiểm tra được mã, thử lại.');
    }
  };
  const clearRef = () => {
    setRefApplied(null); setRefInput(''); setRefStatus('idle'); setRefMsg('');
    try { localStorage.removeItem('geo3d:ref'); } catch { /* bỏ qua */ }
  };

  const startCheckout = async (body: Record<string, unknown>, buyingKey: string) => {
    if (!user) {
      toast({ title: "Vui lòng đăng nhập", description: "Bạn cần đăng nhập để mua.", variant: "destructive" });
      return;
    }
    setBuying(buyingKey);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...body,
          returnUrl: window.location.href.split("?")[0] + "?payment=success",
          cancelUrl: window.location.href.split("?")[0],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Có lỗi khi tạo link thanh toán");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (error) {
      toast({ title: "Lỗi thanh toán", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBuying(null);
    }
  };
  const handleBuy = (planCode: string) => {
    // Nhớ mode để khi từ trang thanh toán quay lại, vào đúng vai trò của gói vừa mua.
    try { localStorage.setItem('geo3d:last-mode', mode); } catch { /* bỏ qua */ }
    startCheckout({ planCode, referralCode: refApplied || undefined }, planCode);
  };
  const handleBuyCredit = (n: number) => startCheckout({ creditPack: n }, `cr_${n}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="w-6 h-6 text-amber-500" />
            Nâng cấp Geo3D
          </DialogTitle>
          <DialogDescription>
            Mua gói để nhận credit dùng cho vẽ hình &amp; giải bài bằng AI. Mua càng lớn, giá mỗi credit càng rẻ.
            <span className="mt-1.5 flex items-center gap-1.5 text-xs text-primary/90">
              {mode === 'teacher'
                ? <><Presentation className="w-3.5 h-3.5" /> Đang xem gói <strong>Giáo viên</strong></>
                : <><GraduationCap className="w-3.5 h-3.5" /> Đang xem gói <strong>Học sinh</strong></>}
              <span className="text-muted-foreground">· mua gói sẽ chốt vai trò tới khi hết hạn</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Mã mời — giảm 10% cho người được mời */}
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Ticket className="w-4 h-4 text-primary" /> Mã mời
            <span className="text-[11px] font-normal text-muted-foreground">(nếu có — giảm 10%)</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={refInput}
              onChange={(e) => {
                setRefInput(e.target.value.toUpperCase());
                if (refStatus !== 'idle') { setRefStatus('idle'); setRefMsg(''); }
              }}
              placeholder="VD: GEO7X9A"
              className="uppercase tracking-wider font-mono"
              disabled={refStatus === 'valid'}
              maxLength={16}
            />
            {refApplied ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearRef}>
                <X className="w-4 h-4 mr-1" /> Bỏ
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => applyRef()} disabled={refStatus === 'checking' || !refInput.trim()}>
                {refStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Áp dụng'}
              </Button>
            )}
          </div>
          {refMsg && (
            <p className={`text-xs flex items-center gap-1 ${refStatus === 'valid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {refStatus === 'valid' && <Check className="w-3.5 h-3.5" />}{refMsg}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 py-2">
          {shownPlans.map((p) => {
            // Đơn giá tính trên TỔNG credit cả thời hạn (gói nhiều kỳ được cấp mỗi kỳ),
            // không phải 1 kỳ — nếu không gói 3 tháng sẽ hiện đắt oan.
            const cycles = Math.max(1, Math.round(p.duration_days / Math.max(1, p.cycle_days)));
            const totalCredits = p.credits_per_cycle * cycles;
            const perCredit = Math.round(p.price_vnd / Math.max(1, totalCredits));
            const isCurrent = currentTier === p.tier;
            const highlight = HIGHLIGHT[p.code];
            return (
              <div
                key={p.code}
                className={`rounded-xl p-4 border flex flex-col gap-2 ${
                  highlight ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{p.name}</span>
                  {highlight && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 rounded px-1.5 py-0.5">
                      Phổ biến
                    </span>
                  )}
                </div>
                {refApplied ? (
                  <div className="flex items-end gap-1.5 flex-wrap">
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmtVnd(Math.round(p.price_vnd * 0.9))}</span>
                    <span className="text-sm line-through text-muted-foreground">{fmtVnd(p.price_vnd)}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded px-1.5 py-0.5">-10%</span>
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-xl font-bold">{fmtVnd(p.price_vnd)}</span>
                  </div>
                )}
                <div className="text-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <strong>{p.credits_per_cycle.toLocaleString("vi-VN")}</strong> credit
                  <span className="text-muted-foreground text-xs">
                    /{p.cycle_days === 365 ? "năm" : `${p.cycle_days} ngày`}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ~{fmtVnd(perCredit)}/credit · hạn {p.duration_days} ngày
                </p>
                <Button
                  size="sm"
                  className="mt-1 w-full"
                  variant={highlight ? "default" : "outline"}
                  disabled={buying !== null || isCurrent}
                  onClick={() => handleBuy(p.code)}
                >
                  {buying === p.code ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Gói hiện tại</>
                  ) : (
                    "Mua gói"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Nạp credit lẻ — không hết hạn */}
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> Nạp credit lẻ
            </span>
            <span className="text-[11px] text-muted-foreground">{fmtVnd(creditPrice)}/credit · không hết hạn</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[50, 100, 200, 500].map((n) => (
              <Button
                key={n}
                variant="outline"
                size="sm"
                className="h-auto py-2 flex-col gap-0.5"
                disabled={buying !== null}
                onClick={() => handleBuyCredit(n)}
              >
                {buying === `cr_${n}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-sm font-bold">+{n}</span>
                    <span className="text-[10px] text-muted-foreground">{fmtVnd(n * creditPrice)}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { onOpenChange(false); navigate('/bang-gia'); }}
          className="text-xs font-medium text-primary hover:underline text-center w-full"
        >
          Xem tất cả gói &amp; so sánh chi tiết →
        </button>
        <p className="text-[11px] text-muted-foreground text-center">Credit gói reset mỗi chu kỳ; credit nạp lẻ không hết hạn.</p>
      </DialogContent>
    </Dialog>
  );
}
