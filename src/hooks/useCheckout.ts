import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FALLBACK_PLANS, type Plan } from '@/lib/plans';
import { trackEvent } from '@/lib/analytics';

/**
 * Nạp bảng giá (từ Supabase, fallback tĩnh) + tạo link thanh toán PayOS.
 * Dùng chung cho UpgradeModal và trang /bang-gia.
 */
export function useCheckout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [creditPrice, setCreditPrice] = useState(500);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('code, tier, role, name, price_vnd, credits_per_cycle, cycle_days, duration_days')
        .eq('active', true)
        .neq('code', 'free')
        .order('price_vnd', { ascending: true });
      if (!cancelled && !error && data && data.length) setPlans(data as Plan[]);
      const { data: pc } = await supabase
        .from('pricing_config')
        .select('value')
        .eq('key', 'credit_price_vnd')
        .maybeSingle();
      if (!cancelled && pc?.value) setCreditPrice(Number(pc.value));
    })();
    return () => { cancelled = true; };
  }, []);

  const startCheckout = useCallback(async (body: Record<string, unknown>, buyingKey: string) => {
    if (!user) {
      toast({ title: 'Vui lòng đăng nhập', description: 'Bạn cần đăng nhập để mua.', variant: 'destructive' });
      return;
    }
    setBuying(buyingKey);
    // Đo phễu doanh thu. CHỈ gửi mã gói + CÓ/KHÔNG dùng mã mời — không gửi chính mã mời.
    trackEvent('checkout_start', {
      plan: typeof body.planCode === 'string' ? body.planCode : 'credit_pack',
      with_referral: Boolean(body.referralCode),
    });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...body,
          returnUrl: window.location.href.split('?')[0] + '?payment=success',
          cancelUrl: window.location.href.split('?')[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi khi tạo link thanh toán');
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (error) {
      trackEvent('checkout_fail', { reason: (error as Error).message });
      toast({ title: 'Lỗi thanh toán', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setBuying(null);
    }
  }, [user, toast]);

  return { plans, creditPrice, buying, startCheckout };
}
