import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Coins, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { listUsers, grantCredit, setRole, type AdminUser } from '@/lib/adminApi';

const TIER_LABELS: Record<string, string> = {
  free: 'Miễn phí', teacher: 'Cơ bản', pro: 'Chuyên nghiệp', school: 'Trường học',
};

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
                  <TableHead className="w-[160px] text-right">Thao tác</TableHead>
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

  useEffect(() => { if (user) { setAmount(''); setReason(''); } }, [user]);

  const submit = async () => {
    if (!user) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) { toast.error('Nhập số credit (khác 0). Dùng số âm để trừ.'); return; }
    setSubmitting(true);
    try {
      const res = await grantCredit(user.id, n, reason.trim() || undefined);
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
