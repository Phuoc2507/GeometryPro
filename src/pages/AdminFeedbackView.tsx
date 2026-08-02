/**
 * AdminFeedbackView — route /admin/feedback/:id
 *
 * Trang XEM MỘT FEEDBACK ở TOÀN MÀN (mở tab mới khi bấm 1 dòng ở trang quản trị).
 * Tách khỏi dialog cũ để hình 3D không chạy đè lên bảng admin (đỡ lag): hình vẽ
 * chiếm hẳn khung lớn bên trái, chi tiết + đổi trạng thái + nút "vẽ lại" bên phải.
 *
 * Chỉ ADMIN xem được (RLS user_feedback admin-read + chặn điều hướng ở UI).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GeometryPreview } from '@/components/admin/GeometryPreview';
import { RedrawGoldenButton } from '@/components/admin/RedrawGoldenButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Tables } from '@/integrations/supabase/types';
import type { GeometryData } from '@/types/geometry';

type UserFeedback = Tables<'user_feedback'>;

const STATUSES = ['mới', 'đang xem', 'đã sửa', 'bỏ qua'] as const;
type Status = (typeof STATUSES)[number];

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

// Hình gắn với feedback: snapshot có sẵn trong feedback, hoặc phải tải từ bản đã lưu.
type Fig =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: GeometryData; raw: unknown }
  | { kind: 'unavailable'; savedId: string };

export default function AdminFeedbackView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [row, setRow] = useState<UserFeedback | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [fig, setFig] = useState<Fig>({ kind: 'none' });

  // Chặn truy cập ở UI (bảo mật thật nằm ở RLS): không phải admin → về trang chủ.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) navigate('/', { replace: true });
  }, [user, isAdmin, authLoading, navigate]);

  // Nạp feedback + hình liên quan.
  useEffect(() => {
    if (authLoading || !user || !isAdmin || !id) return;
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setStatus('notfound'); return; }
      setRow(data);
      setStatus('ready');

      // Ưu tiên snapshot (nằm ngay trong feedback). Nếu không có, thử tải bản đã lưu.
      if (data.geometry_snapshot != null) {
        setFig({ kind: 'ready', data: data.geometry_snapshot as unknown as GeometryData, raw: data.geometry_snapshot });
      } else if (data.saved_geometry_id) {
        setFig({ kind: 'loading' });
        const { data: g, error: gErr } = await supabase
          .from('saved_geometries')
          .select('geometry_data')
          .eq('id', data.saved_geometry_id)
          .maybeSingle();
        if (cancelled) return;
        if (gErr || !g?.geometry_data) {
          setFig({ kind: 'unavailable', savedId: data.saved_geometry_id });
        } else {
          setFig({ kind: 'ready', data: g.geometry_data as unknown as GeometryData, raw: g.geometry_data });
        }
      } else {
        setFig({ kind: 'none' });
      }
    })();
    return () => { cancelled = true; };
  }, [id, authLoading, user, isAdmin]);

  useEffect(() => {
    document.title = row ? `Feedback · ${row.kind} · GeometryPro` : 'Feedback · GeometryPro';
  }, [row]);

  const updateStatus = useCallback(async (next: Status) => {
    if (!id) return;
    const { error } = await supabase
      .from('user_feedback')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Không cập nhật được trạng thái: ' + error.message); return; }
    toast.success('Đã cập nhật trạng thái');
    setRow((prev) => (prev ? { ...prev, status: next } : prev));
  }, [id]);

  const rawJson = useMemo(
    () => (fig.kind === 'ready' ? JSON.stringify(fig.raw, null, 2) : ''),
    [fig]);

  if (authLoading || !user || !isAdmin || status === 'loading') {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'notfound' || !row) {
    return (
      <div className="min-h-screen radial-gradient-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Không tìm thấy feedback</h1>
          <p className="text-sm text-muted-foreground">Mục này có thể đã bị xoá hoặc bạn không có quyền xem.</p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin"><ArrowLeft className="h-4 w-4" /> Về trang quản trị</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen radial-gradient-bg flex flex-col">
      {/* Thanh trên */}
      <header className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Về trang quản trị" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">Chi tiết feedback</h1>
            <Badge variant="outline" className="text-[10px] font-normal">{row.kind}</Badge>
          </div>
        </div>
        <Badge className={statusBadgeClass(row.status)} variant="secondary">{row.status}</Badge>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Hình 3D — khung lớn, xoay/phóng được */}
        <div className="relative w-full lg:flex-1">
          {fig.kind === 'ready' && (
            <GeometryPreview
              geometry={fig.data}
              className="h-[46vh] rounded-none border-0 bg-transparent lg:h-[calc(100vh-57px)]"
              fallback={<pre className="max-h-full overflow-auto p-4 text-xs">{rawJson}</pre>}
            />
          )}
          {fig.kind === 'loading' && (
            <div className="flex h-[46vh] items-center justify-center lg:h-[calc(100vh-57px)]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {fig.kind === 'unavailable' && (
            <div className="flex h-[46vh] flex-col items-center justify-center gap-2 px-6 text-center lg:h-[calc(100vh-57px)]">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Không tải được bản vẽ đã lưu</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Hình để chế độ riêng tư nên admin không đọc được để hiển thị.
              </p>
              <code className="rounded bg-muted px-2 py-1 font-mono text-[11px]">{fig.savedId}</code>
            </div>
          )}
          {fig.kind === 'none' && (
            <div className="flex h-[46vh] flex-col items-center justify-center gap-1 px-6 text-center lg:h-[calc(100vh-57px)]">
              <p className="text-sm text-muted-foreground">Feedback này không kèm hình vẽ.</p>
            </div>
          )}
        </div>

        {/* Chi tiết + thao tác */}
        <aside className="w-full border-t border-border/50 lg:w-[380px] lg:border-l lg:border-t-0">
          <ScrollArea className="h-auto lg:h-[calc(100vh-57px)]">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{fmtDate(row.created_at)}</span>
                {row.page_path && <Badge variant="outline" className="text-[10px] font-normal">{row.page_path}</Badge>}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Trạng thái:</span>
                <Select value={row.status} onValueChange={(v) => updateStatus(v as Status)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Section label="Nội dung">
                <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">{row.message}</p>
              </Section>

              {row.prompt && (
                <Section label="Đề bài liên quan">
                  <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs">{row.prompt}</p>
                </Section>
              )}

              {row.prompt && (
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/[0.03] px-3 py-2">
                  <div className="flex-1 text-xs text-muted-foreground">
                    Khách báo sai — để AI tự vẽ lại bài này rồi bạn duyệt thành hình chuẩn:
                  </div>
                  <RedrawGoldenButton
                    prompt={row.prompt}
                    onSaved={() => updateStatus('đã sửa')}
                  />
                </div>
              )}

              {fig.kind === 'ready' && (
                <details>
                  <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">Xem JSON</summary>
                  <pre className="mt-1 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{rawJson}</pre>
                </details>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
