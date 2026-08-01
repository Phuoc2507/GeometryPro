import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Inbox, Trash2, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listGolden, deleteGolden, type GoldenFigure } from '@/lib/adminApi';

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('vi-VN'); } catch { return iso; }
}

export function GoldenTab() {
  const [rows, setRows] = useState<GoldenFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await listGolden(p);
      setRows(res.golden);
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tải được hình chuẩn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Xoá hình chuẩn này? Đề tương ứng sẽ quay lại vẽ bằng AI như cũ.')) return;
    setDeletingId(id);
    try {
      await deleteGolden(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success('Đã xoá hình chuẩn.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xoá được');
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-500" /> Hình chuẩn (Golden)
          </CardTitle>
          <CardDescription>
            Hình ĐÚNG do quản trị viên duyệt. Khi có người nhập lại đúng đề, hệ thống phục vụ thẳng
            hình này — bỏ qua AI. Tạo bằng nút "Lưu làm hình chuẩn" ở khung giải bài.
          </CardDescription>
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
            <h3 className="text-lg font-semibold">Chưa có hình chuẩn</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Khi máy vẽ sai một bài, hãy dựng lại hình đúng rồi bấm "Lưu làm hình chuẩn". Lần sau gặp lại đề đó sẽ vẽ đúng ngay.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Thời gian</TableHead>
                  <TableHead>Đề bài</TableHead>
                  <TableHead className="w-[90px]">Chế độ</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="w-[70px] text-right">Xoá</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(g.updated_at || g.created_at)}</TableCell>
                    <TableCell className="text-sm max-w-[360px]">
                      <span className="line-clamp-2 break-words" title={g.prompt}>{g.prompt}</span>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{g.mode || '—'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                      <span className="line-clamp-2 break-words">{g.note || '—'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deletingId === g.id}
                        onClick={() => handleDelete(g.id)}
                        aria-label="Xoá hình chuẩn"
                      >
                        {deletingId === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
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
