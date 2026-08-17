import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Copy, Check, Users, Wallet, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { authUrlWithRedirect } from '@/lib/authRedirect';
import { fmtVnd } from '@/lib/plans';

interface ReferralData {
  code: string | null;
  referredCount: number;
  commissionAvailable: number;
  commissionPending: number;
}

const Referral = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  // Chưa đăng nhập → về trang đăng nhập rồi quay lại đây.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(authUrlWithRedirect('/gioi-thieu'));
    }
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Chưa đăng nhập');
      const res = await fetch('/api/referral', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Không tải được mã mời');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const shareLink = data?.code ? `${window.location.origin}/?ref=${data.code}` : '';

  const copy = async (text: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
      toast({ title: 'Đã sao chép', description: which === 'code' ? 'Mã mời đã vào clipboard.' : 'Link mời đã vào clipboard.' });
    } catch {
      toast({ title: 'Không sao chép được', description: 'Bạn hãy chọn và copy thủ công nhé.', variant: 'destructive' });
    }
  };

  const share = async () => {
    if (!shareLink) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GeoPro', text: 'Dùng GeoPro giải & vẽ hình 3D — nhập mã của mình để được giảm 10%!', url: shareLink });
        return;
      } catch {
        /* người dùng huỷ share → rơi xuống copy */
      }
    }
    copy(shareLink, 'link');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen radial-gradient-bg p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Giới thiệu bạn</h1>
            <p className="text-muted-foreground">Rủ bạn bè — cả hai cùng có lợi</p>
          </div>
        </div>

        {/* Hero: mô tả ưu đãi */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-amber-500/5 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-none w-12 h-12 rounded-2xl bg-primary/15 text-primary grid place-items-center">
                <Gift className="w-6 h-6" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 flex-1">
                <div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">−10%</div>
                  <p className="text-sm text-muted-foreground">cho <b>bạn của bạn</b> khi họ nhập mã lúc mua gói.</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">60%</div>
                  <p className="text-sm text-muted-foreground">hoa hồng <b>cho bạn</b> trên đơn đầu tiên của người được rủ.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải mã mời...
          </div>
        ) : error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={load}>Thử lại</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mã mời + link chia sẻ */}
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Mã mời của bạn</CardTitle>
                <CardDescription>Chia sẻ mã hoặc link cho bạn bè.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 font-mono text-2xl font-bold tracking-[0.2em] text-center py-3 rounded-lg bg-primary/5 border border-primary/20 select-all">
                    {data?.code || '—'}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Sao chép mã"
                    disabled={!data?.code}
                    onClick={() => data?.code && copy(data.code, 'code')}
                  >
                    {copied === 'code' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input readOnly value={shareLink} className="font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
                  <Button variant="outline" size="icon" aria-label="Sao chép link" disabled={!shareLink} onClick={() => copy(shareLink, 'link')}>
                    {copied === 'link' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>

                <Button className="w-full" disabled={!shareLink} onClick={share}>
                  <Share2 className="w-4 h-4 mr-2" /> Chia sẻ ngay
                </Button>
              </CardContent>
            </Card>

            {/* Số liệu */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="flex-none w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums">{data?.referredCount ?? 0}</div>
                    <p className="text-sm text-muted-foreground">người đã rủ</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="flex-none w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums">{fmtVnd(data?.commissionAvailable ?? 0)}</div>
                    <p className="text-sm text-muted-foreground">
                      hoa hồng khả dụng
                      {data && data.commissionPending > 0 ? ` · ${fmtVnd(data.commissionPending)} đang chờ` : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cách hoạt động */}
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Cách hoạt động</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {[
                    'Gửi mã hoặc link cho bạn bè.',
                    'Bạn của bạn nhập mã khi mua gói → được giảm 10%.',
                    'Bạn nhận 60% hoa hồng vào ví, rút về ngân hàng.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-none w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold grid place-items-center">{i + 1}</span>
                      <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Referral;
