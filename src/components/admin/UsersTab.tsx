import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Coins, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { listUsers, grantCredit, setRole, setPlan, type AdminUser } from '@/lib/adminApi';

const TIER_LABELS: Record<string, string> = {
  free: 'Miễn phí', student: 'Học sinh', teacher: 'Cơ bản', pro: 'Chuyên nghiệp', school: 'Trường học',
};

// Gói (đọc công khai từ bảng plans) để admin chọn khi đổi gói cho user.
interface PlanRow {
  code: string; tier: string; name: string;
  price_vnd: number; duration_days: number; credits_per_cycle: number;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
}

export function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [granting, setGranting] = useState<AdminUser | null>(null);
  const [planning, setPlanning] = useState<AdminUser | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await listUsers(p);
      setUsers(res.users);
      setHasMore(res.hasMore);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.email || '').toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q));
  }, [users, search]);

  const toggleRole = useCallback(async (u: AdminUser) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    try {
      await setRole(u.id, next);
      toast.success(next === 'admin' ? 'Đã cấp quyền quản trị' : 'Đã gỡ quyền quản trị');
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không đổi được vai trò');
    }
  }, []);

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Người dùng {total != null && <span className="text-muted-foreground font-normal">({total})</span>}</CardTitle>
          <CardDescription>Tra cứu tài khoản, gói &amp; credit; cấp/trừ credit và phân quyền quản trị.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPage(page)} disabled={loading} className="gap-1.5 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lọc email / tên trong trang này..."
            className="pl-8"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[110px]">Tên</TableHead>
                  <TableHead className="w-[110px]">Gói</TableHead>
                  <TableHead className="w-[90px] text-right">Credit</TableHead>
                  <TableHead className="w-[90px]">Vai trò</TableHead>
                  <TableHead className="w-[230px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Không có người dùng.</TableCell></TableRow>
                ) : filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm">
                      {u.email || '—'}
                      {me?.id === u.id && <span className="ml-1 text-[10px] text-primary">(bạn)</span>}
                    </TableCell>
                    <TableCell className="text-sm">{u.display_name || '—'}</TableCell>
                    <TableCell className="text-xs">{TIER_LABELS[u.plan_tier] || u.plan_tier}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{u.credits.toLocaleString('vi-VN')}</TableCell>
                    <TableCell>
                      {u.role === 'admin'
                        ? <Badge className="bg-primary/15 text-primary" variant="secondary">admin</Badge>
                        : <span className="text-xs text-muted-foreground">user</span>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => setGranting(u)}>
                        <Coins className="h-3.5 w-3.5" /> Credit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => setPlanning(u)}>
                        <Tag className="h-3.5 w-3.5" /> Gói
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-7 gap-1 px-2"
                        disabled={me?.id === u.id && u.role === 'admin'}
                        title={me?.id === u.id && u.role === 'admin' ? 'Không thể tự gỡ quyền của mình' : undefined}
                        onClick={() => toggleRole(u)}
                      >
                        {u.role === 'admin'
                          ? <><ShieldOff className="h-3.5 w-3.5" /> Gỡ</>
                          : <><ShieldCheck className="h-3.5 w-3.5" /> Admin</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Phân trang */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Trang {page}</p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="gap-1" disabled={page <= 1 || loading} onClick={() => fetchPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <Button variant="outline" size="sm" className="gap-1" disabled={!hasMore || loading} onClick={() => fetchPage(page + 1)}>
              Sau <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <GrantCreditDialog
        user={granting}
        onClose={() => setGranting(null)}
        onGranted={(id, remaining) => {
          if (remaining != null) setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, credits: remaining } : x)));
        }}
      />

      <ChangePlanDialog
        user={planning}
        onClose={() => setPlanning(null)}
        onChanged={(id, patch) => setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))}
      />
    </Card>
  );
}

// Hộp thoại cấp/trừ credit cho một user.
function GrantCreditDialog({ user, onClose, onGranted }: {
  user: AdminUser | null;
  onClose: () => void;
  onGranted: (userId: string, remaining: number | null) => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Key idempotent ổn định trong 1 lần mở hộp thoại: bấm lại (mạng lỗi) KHÔNG cộng 2 lần.
  const [idemKey, setIdemKey] = useState('');

  useEffect(() => { if (user) { setAmount(''); setReason(''); setIdemKey(crypto.randomUUID()); } }, [user]);

  const submit = async () => {
    if (!user) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) { toast.error('Nhập số credit (khác 0). Dùng số âm để trừ.'); return; }
    setSubmitting(true);
    try {
      const res = await grantCredit(user.id, n, reason.trim() || undefined, idemKey);
      toast.success(`Đã ${n > 0 ? 'cấp' : 'trừ'} ${Math.abs(n)} credit`);
      onGranted(user.id, res.remaining);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không cấp/trừ được credit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        {user && (
          <>
            <DialogHeader>
              <DialogTitle>Cấp / trừ credit</DialogTitle>
              <DialogDescription>
                {user.email || user.id} · đang có <strong>{user.credits.toLocaleString('vi-VN')}</strong> credit
                (mua: {user.purchased_credits.toLocaleString('vi-VN')}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Số credit (âm để trừ)</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd: 100 hoặc -50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Lý do (tùy chọn)</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="vd: đền bù bài lỗi" maxLength={100} />
              </div>
              <p className="text-[11px] text-muted-foreground">Cộng/trừ vào ví <strong>credit mua</strong> (không hết hạn). Ghi vào sổ credit_ledger.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
              <Button onClick={submit} disabled={submitting || !amount}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hộp thoại ĐỔI GÓI cho một user (admin override, không qua thanh toán).
// Đọc danh sách gói công khai từ bảng plans; server áp tier/credit/hạn theo mã gói.
function ChangePlanDialog({ user, onClose, onChanged }: {
  user: AdminUser | null;
  onClose: () => void;
  onChanged: (userId: string, patch: Partial<AdminUser>) => void;
}) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadingPlans(true);
    (async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('code, tier, name, price_vnd, duration_days, credits_per_cycle')
        .eq('active', true)
        .order('price_vnd', { ascending: true });
      if (cancelled) return;
      if (error || !data) { toast.error('Không tải được danh sách gói'); setPlans([]); }
      else setPlans(data as PlanRow[]);
      setLoadingPlans(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Chọn mặc định = gói hiện tại của user nếu còn trong danh sách, không thì về 'free'.
  useEffect(() => {
    if (!user || plans.length === 0) return;
    const has = plans.some((p) => p.code === user.plan_code);
    setCode(has ? user.plan_code : (plans.find((p) => p.tier === 'free')?.code ?? plans[0].code));
  }, [user, plans]);

  const submit = async () => {
    if (!user || !code) return;
    setSubmitting(true);
    try {
      const res = await setPlan(user.id, code);
      const purchased = Number(user.purchased_credits || 0);
      onChanged(user.id, {
        plan_tier: res.plan_tier,
        plan_code: res.plan_code,
        plan_credits: res.plan_credits,
        plan_expires_at: res.plan_expires_at,
        credits: res.plan_credits + purchased,
      });
      toast.success(`Đã đổi gói sang ${TIER_LABELS[res.plan_tier] || res.plan_tier}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không đổi được gói');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        {user && (
          <>
            <DialogHeader>
              <DialogTitle>Đổi gói</DialogTitle>
              <DialogDescription>
                {user.email || user.id} · gói hiện tại: <strong>{TIER_LABELS[user.plan_tier] || user.plan_tier}</strong>
                {user.plan_expires_at ? ` (hết hạn ${fmtDate(user.plan_expires_at)})` : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Gói mới</label>
                {loadingPlans ? (
                  <div className="flex h-9 items-center justify-center rounded-md border border-border/60">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : (
                  <Select value={code} onValueChange={setCode}>
                    <SelectTrigger><SelectValue placeholder="Chọn gói" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.code} value={p.code} className="text-xs">
                          {p.name} · {p.credits_per_cycle.toLocaleString('vi-VN')} credit{p.duration_days ? ` · ${p.duration_days} ngày` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Đặt lại <strong>credit gói</strong> theo gói mới &amp; cấp kỳ hạn mới tính từ bây giờ. Chọn <strong>Miễn phí</strong> để gỡ gói.
                Credit <strong>mua</strong> (không hết hạn) giữ nguyên. Tier cũng quyết định vai trò Học sinh/Giáo viên của khách.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Button>
              <Button onClick={submit} disabled={submitting || !code || loadingPlans}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
