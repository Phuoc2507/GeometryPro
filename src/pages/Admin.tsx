import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, AlertTriangle, MessageSquare, BarChart3,
  Loader2, Inbox, RefreshCw, Users, Receipt, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { UsersTab } from '@/components/admin/UsersTab';
import { OrdersTab } from '@/components/admin/OrdersTab';

type ProblemReport = Tables<'problem_reports'>;
type UserFeedback = Tables<'user_feedback'>;

const STATUSES = ['mới', 'đang xem', 'đã sửa', 'bỏ qua'] as const;
type Status = (typeof STATUSES)[number];

const FETCH_LIMIT = 200;

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'mới':      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    case 'đang xem': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
    case 'đã sửa':   return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    case 'bỏ qua':   return 'bg-muted text-muted-foreground';
    default:          return 'bg-muted text-muted-foreground';
  }
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString('vi-VN'); } catch { return iso; }
}

function truncate(text: string | null | undefined, n = 80): string {
  if (!text) return '—';
  return text.length > n ? text.slice(0, n) + '…' : text;
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); toast.success('Đã copy'); }
  catch { toast.error('Không copy được'); }
}

// Nút copy nhỏ gắn cạnh nhãn trường.
function CopyBtn({ text }: { text: string }) {
  return (
    <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground" onClick={() => copyText(text)}>
      <Copy className="h-3 w-3" /> Copy
    </Button>
  );
}

// Bộ lọc theo trạng thái (thêm mục "Tất cả").
function StatusFilter({ value, onChange }: { value: 'all' | Status; onChange: (v: 'all' | Status) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as 'all' | Status)}>
      <SelectTrigger className="h-8 w-[140px] shrink-0 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">Tất cả trạng thái</SelectItem>
        {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// Trạng thái lỗi tải + nút thử lại (phân biệt với "không có dữ liệu").
function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-4"><AlertTriangle className="h-8 w-8 text-destructive" /></div>
      <h3 className="text-lg font-semibold">Không tải được dữ liệu</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground break-words">{message}</p>
      <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" /> Thử lại
      </Button>
    </div>
  );
}

// Trạng thái "chưa có dữ liệu / sắp có".
function EmptyState({ icon: Icon, title, hint }: { icon: typeof Inbox; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

// Ô đổi trạng thái xử lý (dùng chung 2 bảng).
function StatusSelect({ value, onChange, disabled }: { value: string; onChange: (s: Status) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Status)} disabled={disabled}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [reportFilter, setReportFilter] = useState<'all' | Status>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | Status>('all');

  // Chặn truy cập: chưa đăng nhập hoặc không phải admin → về trang chủ.
  // Bảo mật thật nằm ở RLS phía Supabase; đây chỉ là lớp điều hướng cho UI.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) navigate('/', { replace: true });
  }, [user, isAdmin, authLoading, navigate]);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    const { data, error } = await supabase
      .from('problem_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT);
    if (error) { setReportsError(error.message); toast.error('Không tải được danh sách bài lỗi: ' + error.message); }
    else { setReportsError(null); setReports(data ?? []); }
    setLoadingReports(false);
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoadingFeedback(true);
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT);
    if (error) { setFeedbackError(error.message); toast.error('Không tải được feedback: ' + error.message); }
    else { setFeedbackError(null); setFeedback(data ?? []); }
    setLoadingFeedback(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      fetchReports();
      fetchFeedback();
    }
  }, [authLoading, user, isAdmin, fetchReports, fetchFeedback]);

  const updateStatus = useCallback(async (
    table: 'problem_reports' | 'user_feedback', id: string, status: Status,
  ) => {
    const { error } = await supabase
      .from(table)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Không cập nhật được trạng thái: ' + error.message); return; }
    toast.success('Đã cập nhật trạng thái');
    if (table === 'problem_reports') {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      setSelectedReport((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } else {
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
      setSelectedFeedback((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    }
  }, []);

  // Thống kê nhanh từ dữ liệu đã tải (không cần query riêng).
  const stats = useMemo(() => {
    const byEndpoint: Record<string, number> = {};
    const byStage: Record<string, number> = {};
    let unresolved = 0;
    for (const r of reports) {
      byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] || 0) + 1;
      if (r.error_stage) byStage[r.error_stage] = (byStage[r.error_stage] || 0) + 1;
      if (r.status === 'mới' || r.status === 'đang xem') unresolved += 1;
    }
    const newFeedback = feedback.filter((f) => f.status === 'mới').length;
    return { byEndpoint, byStage, unresolved, newFeedback };
  }, [reports, feedback]);

  const shownReports = useMemo(
    () => (reportFilter === 'all' ? reports : reports.filter((r) => r.status === reportFilter)),
    [reports, reportFilter]);
  const shownFeedback = useMemo(
    () => (feedbackFilter === 'all' ? feedback : feedback.filter((f) => f.status === feedbackFilter)),
    [feedback, feedbackFilter]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen radial-gradient-bg p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Trang quản trị</h1>
              <p className="text-muted-foreground">Theo dõi bài lỗi, feedback và chất lượng hệ thống</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="failures" className="w-full">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto sm:grid sm:grid-cols-5">
            <TabsTrigger value="failures" className="shrink-0 gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Bài lỗi
              {reports.length > 0 && <Badge variant="secondary" className="ml-1">{reports.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="shrink-0 gap-1.5">
              <MessageSquare className="h-4 w-4" /> Feedback
              {feedback.length > 0 && <Badge variant="secondary" className="ml-1">{feedback.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="users" className="shrink-0 gap-1.5">
              <Users className="h-4 w-4" /> Người dùng
            </TabsTrigger>
            <TabsTrigger value="orders" className="shrink-0 gap-1.5">
              <Receipt className="h-4 w-4" /> Đơn hàng
            </TabsTrigger>
            <TabsTrigger value="stats" className="shrink-0 gap-1.5">
              <BarChart3 className="h-4 w-4" /> Thống kê
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1 — Bài lỗi ──────────────────────────────────────────── */}
          <TabsContent value="failures">
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Bài lỗi — máy vẽ sai / không vẽ được</CardTitle>
                  <CardDescription>
                    Đề bài, JSON của AI, thông báo lỗi và model của những lần vẽ thất bại (mới nhất trước).
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusFilter value={reportFilter} onChange={setReportFilter} />
                  <Button variant="outline" size="sm" onClick={fetchReports} disabled={loadingReports} className="gap-1.5">
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingReports ? 'animate-spin' : ''}`} /> Làm mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingReports ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : reportsError ? (
                  <ErrorPanel message={reportsError} onRetry={fetchReports} />
                ) : reports.length === 0 ? (
                  <EmptyState icon={Inbox} title="Chưa có bài lỗi" hint="Khi máy vẽ sai hoặc không vẽ được, hệ thống sẽ tự ghi lại vào đây để bạn xem và sửa." />
                ) : shownReports.length === 0 ? (
                  <EmptyState icon={Inbox} title="Không có bài ở trạng thái này" hint="Đổi bộ lọc trạng thái để xem các bài khác." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Thời gian</TableHead>
                          <TableHead>Đề bài</TableHead>
                          <TableHead className="w-[130px]">Route</TableHead>
                          <TableHead className="w-[110px]">Giai đoạn</TableHead>
                          <TableHead className="w-[100px]">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shownReports.map((r) => (
                          <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedReport(r)}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                            <TableCell className="text-sm">{truncate(r.prompt, 70)}</TableCell>
                            <TableCell className="text-xs">{r.endpoint}</TableCell>
                            <TableCell className="text-xs">{r.error_stage || '—'}</TableCell>
                            <TableCell>
                              <Badge className={statusBadgeClass(r.status)} variant="secondary">{r.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2 — Feedback ─────────────────────────────────────────── */}
          <TabsContent value="feedback">
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Feedback người dùng</CardTitle>
                  <CardDescription>Góp ý và báo lỗi người dùng gửi, kèm bản vẽ liên quan.</CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusFilter value={feedbackFilter} onChange={setFeedbackFilter} />
                  <Button variant="outline" size="sm" onClick={fetchFeedback} disabled={loadingFeedback} className="gap-1.5">
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingFeedback ? 'animate-spin' : ''}`} /> Làm mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingFeedback ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : feedbackError ? (
                  <ErrorPanel message={feedbackError} onRetry={fetchFeedback} />
                ) : feedback.length === 0 ? (
                  <EmptyState icon={Inbox} title="Chưa có feedback" hint="Khi người dùng bấm “Báo lỗi / Góp ý”, nội dung sẽ hiện ở đây." />
                ) : shownFeedback.length === 0 ? (
                  <EmptyState icon={Inbox} title="Không có feedback ở trạng thái này" hint="Đổi bộ lọc trạng thái để xem các mục khác." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Thời gian</TableHead>
                          <TableHead className="w-[90px]">Loại</TableHead>
                          <TableHead>Nội dung</TableHead>
                          <TableHead className="w-[100px]">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shownFeedback.map((f) => (
                          <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelectedFeedback(f)}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(f.created_at)}</TableCell>
                            <TableCell className="text-xs">{f.kind}</TableCell>
                            <TableCell className="text-sm">{truncate(f.message, 80)}</TableCell>
                            <TableCell>
                              <Badge className={statusBadgeClass(f.status)} variant="secondary">{f.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab — Người dùng ─────────────────────────────────────────── */}
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          {/* ── Tab — Đơn hàng ───────────────────────────────────────────── */}
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          {/* ── Tab — Thống kê ───────────────────────────────────────────── */}
          <TabsContent value="stats">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardDescription>Bài lỗi (đã tải)</CardDescription></CardHeader>
                <CardContent><p className="text-3xl font-bold">{reports.length}</p></CardContent>
              </Card>
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardDescription>Bài lỗi chưa xử lý</CardDescription></CardHeader>
                <CardContent><p className="text-3xl font-bold text-amber-500">{stats.unresolved}</p></CardContent>
              </Card>
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardDescription>Feedback (đã tải)</CardDescription></CardHeader>
                <CardContent><p className="text-3xl font-bold">{feedback.length}</p></CardContent>
              </Card>
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardDescription>Feedback mới</CardDescription></CardHeader>
                <CardContent><p className="text-3xl font-bold text-blue-500">{stats.newFeedback}</p></CardContent>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader><CardTitle className="text-base">Bài lỗi theo route</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {Object.keys(stats.byEndpoint).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
                  ) : Object.entries(stats.byEndpoint).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader><CardTitle className="text-base">Bài lỗi theo giai đoạn</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {Object.keys(stats.byStage).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
                  ) : Object.entries(stats.byStage).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              * Thống kê tính trên tối đa {FETCH_LIMIT} bản ghi mới nhất đã tải.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Chi tiết bài lỗi ──────────────────────────────────────────────── */}
      <Dialog open={!!selectedReport} onOpenChange={(o) => { if (!o) setSelectedReport(null); }}>
        <DialogContent className="max-w-2xl">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết bài lỗi</DialogTitle>
                <DialogDescription>{fmtDate(selectedReport.created_at)} · {selectedReport.endpoint}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <StatusSelect value={selectedReport.status} onChange={(s) => updateStatus('problem_reports', selectedReport.id, s)} />
                    {selectedReport.error_stage && <Badge variant="outline">{selectedReport.error_stage}</Badge>}
                    {selectedReport.mode && <Badge variant="outline">{selectedReport.mode}</Badge>}
                    {selectedReport.model && <Badge variant="outline">{selectedReport.model}</Badge>}
                    {selectedReport.duration_ms != null && <Badge variant="outline">{selectedReport.duration_ms}ms</Badge>}
                    {selectedReport.image_provided && <Badge variant="outline">có ảnh</Badge>}
                  </div>
                  <Field label="Đề bài" value={selectedReport.prompt} mono copyable />
                  <Field label="Thông báo lỗi" value={selectedReport.error_message} mono />
                  {selectedReport.ai_json != null && (
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">JSON của AI</p>
                        <CopyBtn text={JSON.stringify(selectedReport.ai_json, null, 2)} />
                      </div>
                      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {JSON.stringify(selectedReport.ai_json, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Chi tiết feedback ─────────────────────────────────────────────── */}
      <Dialog open={!!selectedFeedback} onOpenChange={(o) => { if (!o) setSelectedFeedback(null); }}>
        <DialogContent className="max-w-2xl">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết feedback</DialogTitle>
                <DialogDescription>{fmtDate(selectedFeedback.created_at)} · {selectedFeedback.kind}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <StatusSelect value={selectedFeedback.status} onChange={(s) => updateStatus('user_feedback', selectedFeedback.id, s)} />
                    {selectedFeedback.page_path && <Badge variant="outline">{selectedFeedback.page_path}</Badge>}
                  </div>
                  <Field label="Nội dung" value={selectedFeedback.message} copyable />
                  <Field label="Đề bài liên quan" value={selectedFeedback.prompt} mono copyable />
                  {selectedFeedback.saved_geometry_id && (
                    <Field label="Bản vẽ đã lưu (id)" value={selectedFeedback.saved_geometry_id} mono />
                  )}
                  {selectedFeedback.geometry_snapshot != null && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Ảnh chụp hình</p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {JSON.stringify(selectedFeedback.geometry_snapshot, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Ô hiển thị 1 trường (nhãn + giá trị), ẩn nếu rỗng. copyable → hiện nút Copy.
function Field({ label, value, mono, copyable }: { label: string; value: string | null | undefined; mono?: boolean; copyable?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {copyable && <CopyBtn text={value} />}
      </div>
      <p className={`whitespace-pre-wrap break-words rounded-md bg-muted p-3 ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</p>
    </div>
  );
}

export default Admin;
