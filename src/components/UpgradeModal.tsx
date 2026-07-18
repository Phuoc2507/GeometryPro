import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Plan {
  code: string;
  tier: string;
  name: string;
  price_vnd: number;
  credits_per_cycle: number;
  cycle_days: number;
  duration_days: number;
}

// Dùng khi bảng `plans` chưa được tạo (chưa áp migration) — để modal vẫn hiển thị.
const FALLBACK_PLANS: Plan[] = [
  { code: "teacher_1m", tier: "teacher", name: "Giáo viên · 1 tháng",   price_vnd: 79000,  credits_per_cycle: 200,  cycle_days: 30,  duration_days: 30 },
  { code: "teacher_3m", tier: "teacher", name: "Giáo viên · 3 tháng",   price_vnd: 199000, credits_per_cycle: 200,  cycle_days: 30,  duration_days: 90 },
  { code: "pro_1m",     tier: "pro",     name: "Chuyên nghiệp · 1 tháng", price_vnd: 149000, credits_per_cycle: 600,  cycle_days: 30,  duration_days: 30 },
  { code: "school_1y",  tier: "school",  name: "Trường học · 1 năm",     price_vnd: 999000, credits_per_cycle: 5000, cycle_days: 365, duration_days: 365 },
];

const fmtVnd = (v: number) => v.toLocaleString("vi-VN") + "đ";

const HIGHLIGHT: Record<string, boolean> = { pro_1m: true };

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { user, tier: currentTier } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [buying, setBuying] = useState<string | null>(null);

  // Đọc bảng giá trực tiếp từ Supabase (RLS cho phép SELECT). Lỗi -> giữ fallback.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("code, tier, name, price_vnd, credits_per_cycle, cycle_days, duration_days")
        .eq("active", true)
        .neq("code", "free")
        .order("price_vnd", { ascending: true });
      if (!error && data && data.length) setPlans(data as Plan[]);
    })();
  }, [open]);

  const handleBuy = async (planCode: string) => {
    if (!user) {
      toast({ title: "Vui lòng đăng nhập", description: "Bạn cần đăng nhập để mua gói.", variant: "destructive" });
      return;
    }
    setBuying(planCode);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          planCode,
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
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 py-2">
          {plans.map((p) => {
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
                <div className="flex items-end gap-1">
                  <span className="text-xl font-bold">{fmtVnd(p.price_vnd)}</span>
                </div>
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

        <p className="text-[11px] text-muted-foreground text-center">
          Credit gói reset mỗi chu kỳ. Cần thêm? Mua credit lẻ 500đ/credit (không hết hạn) — sắp có.
        </p>
      </DialogContent>
    </Dialog>
  );
}
