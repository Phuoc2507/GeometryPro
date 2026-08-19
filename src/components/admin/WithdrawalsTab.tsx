import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Inbox, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listWithdrawals, resolveWithdrawal, type AdminWithdrawal } from '@/lib/adminApi';
import { fmtVnd } from '@/lib/plans';

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('vi-VN'); } catch { return iso; }
}

const STATUS: Record<AdminWithdrawal['status'], { label: string; cls: string }> = {
  requested: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  approved: { label: 'Đã duyệt', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  paid: { label: 'Đã chi', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  rejected: { label: 'Từ chối', cls: 'bg-destructive/15 text-destructive' },
};

export function WithdrawalsTab() {
  const [rows, setRows] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refInputs, setRefInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await listWithdrawals(p);
      setRows(res.withdrawals);
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tải được yêu cầu rút');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const resolve = async (w: AdminWithdrawal, actionType: 'paid' | 'rejected') => {
    if (actionType === 'rejected' && !window.confirm(`Từ chối và HOÀN ${fmtVnd(w.amount)} về ví người mời?`)) return;
    setBusy(w.id);
    try {
      await resolveWithdrawal(w.id, actionType, refInputs[w.id]?.trim() || undefined);
      toast.success(actionType === 'paid' ? 'Đã đánh dấu đã chi' : 'Đã từ chối & hoàn tiền');
      fetchPage(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xử lý được');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Rút hoa hồng (Mã Mời)</CardTitle>
          <CardDescription>Chuyển khoản cho người mời rồi bấm “Đã chuyển”. “Từ chối” sẽ hoàn tiền về ví họ.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPage(page)} disabled={loading} className="gap-1.5 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4"><Inbox className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">Chưa có yêu cầu rút</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Khi người mời bấm “Rút tiền”, yêu cầu sẽ hiện ở đây để bạn duyệt & chi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Thời gian</TableHead>
                  <TableHead>Người mời</TableHead>
                  <TableHead>Tài khoản nhận</TableHead>
                  <TableHead className="w-[110px] text-right">Số tiền</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[260px]">Xử lý</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtDateTime(w.requested_at)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{w.referrer_name || '—'}</div>
                      <div className="text-xs text-muted-foreground break-all">{w.referrer_email || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{w.bank_code || '—'} · {w.account_number || '—'}</div>
                      <div className="text-xs text-muted-foreground">{w.account_name || '—'}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">{fmtVnd(w.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS[w.status].cls}`}>{STATUS[w.status].label}</span>
                    </TableCell>
                    <TableCell>
                      {w.status === 'requested' ? (
                        <div className="flex flex-col gap-1.5">
                          <Input
                            value={refInputs[w.id] || ''}
                            onChange={(e) => setRefInputs((m) => ({ ...m, [w.id]: e.target.value }))}
                            placeholder="Mã giao dịch (tuỳ chọn)"
                            className="h-8 text-xs"
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 gap-1" disabled={busy === w.id} onClick={() => resolve(w, 'paid')}>
                              {busy === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Đã chuyển
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive" disabled={busy === w.id} onClick={() => resolve(w, 'rejected')}>
                              <X className="h-3.5 w-3.5" /> Từ chối
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {w.transfer_ref ? <>Mã GD: <span className="font-mono">{w.transfer_ref}</span></> : (w.admin_note || fmtDateTime(w.processed_at))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {(hasMore || page > 1) && (
              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => fetchPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">Trang {page}</span>
                <Button variant="outline" size="sm" disabled={!hasMore || loading} onClick={() => fetchPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
