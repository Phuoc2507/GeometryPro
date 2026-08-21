import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listReferrals, reviewReferral, type AdminReferral, type ReferralStatus } from '@/lib/adminApi';
import { fmtVnd } from '@/lib/plans';

/**
 * Hàng đợi ĐỐI SOÁT lượt giới thiệu (Phase 6).
 *
 * Bộ lọc chống gian lận chỉ ĐÁNH DẤU, không tự nuốt tiền của người mời. Tiền nằm
 * ở ví treo cho tới khi một người thật bấm Duyệt (cho chín ngay) hoặc Thu hồi.
 */

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('vi-VN'); } catch { return iso; }
}

const STATUS: Record<ReferralStatus, { label: string; cls: string }> = {
  pending:     { label: 'Đang treo',  cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  confirmed:   { label: 'Đã chín',    cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  flagged:     { label: 'Gắn cờ',     cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  rejected:    { label: 'Từ chối',    cls: 'bg-destructive/15 text-destructive' },
  clawed_back: { label: 'Đã thu hồi', cls: 'bg-muted text-muted-foreground' },
};

/** Dịch mã lý do của engine sang câu người đối soát đọc hiểu ngay. */
const FLAG_TEXT: Record<string, string> = {
  payer_is_referrer_bank_account: 'Người trả tiền dùng đúng STK nhận hoa hồng của người mời — nhiều khả năng là một người.',
  payer_account_reused: 'STK người trả đã dùng cho một lượt giới thiệu khác của cùng người mời.',
  monthly_cap_exceeded: 'Vượt trần số lượt giới thiệu trong tháng.',
};

const FILTERS: { value: ReferralStatus | 'all'; label: string }[] = [
  { value: 'flagged', label: 'Cần đối soát' },
  { value: 'pending', label: 'Đang treo' },
  { value: 'confirmed', label: 'Đã chín' },
  { value: 'all', label: 'Tất cả' },
];

export function ReferralsTab() {
  const [rows, setRows] = useState<AdminReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<ReferralStatus | 'all'>('flagged');
  const [busy, setBusy] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, s: ReferralStatus | 'all') => {
    setLoading(true);
    try {
      const res = await listReferrals(p, s);
      setRows(res.referrals);
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tải được danh sách giới thiệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1, status); }, [fetchPage, status]);

  const review = async (r: AdminReferral, actionType: 'approve' | 'reject') => {
    const question = actionType === 'approve'
      ? `Duyệt và cộng ${fmtVnd(r.commission_amount)} vào ví rút được của người mời?`
      : `Thu hồi ${fmtVnd(r.commission_amount)} khỏi ví người mời?`;
    if (!window.confirm(question)) return;
    setBusy(r.id);
    try {
      const res = await reviewReferral(r.id, actionType);
      if (actionType === 'approve') {
        toast.success(`Đã duyệt — cộng ${fmtVnd(r.commission_amount)}`);
      } else if (res.recovered != null && res.recovered < r.commission_amount) {
        // Người mời đã rút mất phần chênh → nói thẳng con số còn thiếu.
        toast.warning(
          `Đã thu hồi ${fmtVnd(res.recovered)} / ${fmtVnd(r.commission_amount)}`,
          { description: `Còn thiếu ${fmtVnd(r.commission_amount - res.recovered)} do đã rút trước đó.` },
        );
      } else {
        toast.success(`Đã thu hồi ${fmtVnd(r.commission_amount)}`);
      }
      fetchPage(page, status);
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
          <CardTitle>Đối soát mã mời</CardTitle>
          <CardDescription>
            Lượt bị bộ lọc chống gian lận gắn cờ. Tiền đang treo — “Duyệt” cho chín ngay, “Thu hồi” lấy lại.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPage(page, status)} disabled={loading} className="gap-1.5 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5 pb-3">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={status === f.value ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-emerald-500/10 p-4"><ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" /></div>
            <h3 className="text-lg font-semibold">Không có gì cần đối soát</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Lượt giới thiệu bị nghi ngờ sẽ hiện ở đây. Trống nghĩa là mọi lượt đều qua được bộ lọc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Thời gian</TableHead>
                  <TableHead>Người mời</TableHead>
                  <TableHead>Người được mời</TableHead>
                  <TableHead>STK người trả</TableHead>
                  <TableHead className="w-[110px] text-right">Hoa hồng</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[210px]">Xử lý</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.referrer_name || '—'}</div>
                      <div className="text-xs text-muted-foreground break-all">{r.referrer_email || '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.invitee_name || '—'}</div>
                      <div className="text-xs text-muted-foreground break-all">{r.invitee_email || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">{r.payer_account_number || '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.payer_account_bank || '—'}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">{fmtVnd(r.commission_amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS[r.status]?.cls ?? ''}`}>
                        {STATUS[r.status]?.label ?? r.status}
                      </span>
                      {r.flag_reason && (
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          {FLAG_TEXT[r.flag_reason] || r.flag_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.status === 'flagged' || r.status === 'pending' || r.status === 'confirmed' ? (
                        <div className="flex gap-1.5">
                          {r.status !== 'confirmed' && (
                            <Button size="sm" className="h-7 gap-1" disabled={busy === r.id} onClick={() => review(r, 'approve')}>
                              {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Duyệt
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive" disabled={busy === r.id} onClick={() => review(r, 'reject')}>
                            <X className="h-3.5 w-3.5" /> Thu hồi
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">{r.note || fmtDateTime(r.confirmed_at)}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {(hasMore || page > 1) && (
              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => fetchPage(page - 1, status)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">Trang {page}</span>
                <Button variant="outline" size="sm" disabled={!hasMore || loading} onClick={() => fetchPage(page + 1, status)}>
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
