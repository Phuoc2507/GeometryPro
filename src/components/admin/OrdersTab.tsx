import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listOrders, type AdminOrder } from '@/lib/adminApi';

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('vi-VN'); } catch { return iso; }
}

function orderStatusClass(status: string | null): string {
  switch (status) {
    case 'paid':
    case 'fulfilled': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    case 'pending':   return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
    case 'failed':
    case 'canceled':  return 'bg-destructive/15 text-destructive';
    default:           return 'bg-muted text-muted-foreground';
  }
}

export function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await listOrders(p);
      setOrders(res.orders);
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tải được đơn hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Đơn hàng</CardTitle>
          <CardDescription>Đơn thanh toán PayOS — trạng thái, số tiền, credit và người mua (mới nhất trước).</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPage(page)} disabled={loading} className="gap-1.5 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : orders.length === 0 && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4"><Inbox className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">Chưa có đơn hàng</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Khi có người mua gói/credit qua PayOS, đơn sẽ hiện ở đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Thời gian</TableHead>
                  <TableHead className="w-[100px]">Mã đơn</TableHead>
                  <TableHead>Người mua</TableHead>
                  <TableHead className="w-[100px]">Gói</TableHead>
                  <TableHead className="w-[110px] text-right">Số tiền</TableHead>
                  <TableHead className="w-[80px] text-right">Credit</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(o.created_at)}</TableCell>
                    <TableCell className="text-xs font-mono">{o.order_code}</TableCell>
                    <TableCell className="text-sm">{o.display_name || o.user_id || '—'}</TableCell>
                    <TableCell className="text-xs">{o.plan_code || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{(o.amount ?? 0).toLocaleString('vi-VN')}₫</TableCell>
                    <TableCell className="text-right text-sm">{o.credit_amount != null ? o.credit_amount.toLocaleString('vi-VN') : '—'}</TableCell>
                    <TableCell>
                      <Badge className={orderStatusClass(o.status)} variant="secondary">{o.status || '—'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

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
    </Card>
  );
}
