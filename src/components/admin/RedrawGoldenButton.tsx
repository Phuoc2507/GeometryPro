/**
 * RedrawGoldenButton — nút ADMIN "Nhờ AI vẽ lại" cho một bài lỗi.
 *
 * Thay vì admin tự dựng hình: bấm nút → server vẽ lại KỸ HƠN (kernel trước →
 * model mạnh → tự chấm bằng kernel) → hiện hình + "máy tự chấm" trong hộp thoại
 * → admin nhìn mắt, bấm "Đúng — lưu làm hình chuẩn" (thành golden) hoặc "Vẽ lại".
 *
 * Preview 3D dùng LẠI đúng bộ render thật (GeometryCanvas) bằng cách bọc một
 * GeometryProvider cục bộ rồi loadGeometry(candidate) — không cần rời trang admin.
 */
import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Loader2, BadgeCheck, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { redrawProblem, saveGolden, type RedrawCandidate } from '@/lib/adminApi';
import type { GeometryData } from '@/types/geometry';

interface RedrawGoldenButtonProps {
  prompt?: string | null;
  reportId?: string | null;
  /** Gọi sau khi lưu golden thành công (để trang admin làm mới danh sách). */
  onSaved?: () => void;
}

// Nạp candidate vào một GeometryProvider cục bộ rồi vẽ bằng GeometryCanvas thật.
function PreviewInner({ geometry }: { geometry: GeometryData }) {
  const ctx = useGeometryOptional();
  useEffect(() => {
    ctx?.loadGeometry(geometry, { silent: true });
  }, [ctx, geometry]);
  return <GeometryCanvas />;
}

function CandidatePreview({ geometry }: { geometry: GeometryData }) {
  return (
    <div className="h-[360px] w-full overflow-hidden rounded-md border bg-background">
      <GeometryProvider>
        <PreviewInner geometry={geometry} />
      </GeometryProvider>
    </div>
  );
}

export function RedrawGoldenButton({ prompt, reportId = null, onSaved }: RedrawGoldenButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState<RedrawCandidate | null>(null);

  const cleanPrompt = (prompt || '').trim();

  const runRedraw = useCallback(async (maxAttempts = 1) => {
    setLoading(true);
    setCandidate(null);
    try {
      const cand = await redrawProblem(cleanPrompt, maxAttempts);
      setCandidate(cand);
    } catch (err) {
      toast.error('Vẽ lại thất bại: ' + (err instanceof Error ? err.message : 'lỗi'));
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  }, [cleanPrompt]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    runRedraw(1);
  }, [runRedraw]);

  const handleApprove = useCallback(async () => {
    if (!candidate?.geometry) return;
    setSaving(true);
    try {
      await saveGolden({
        prompt: cleanPrompt,
        geometry: candidate.geometry,
        advanceScene: candidate.advanceScene ?? null,
        mode: candidate.verdict.source === 'advance' ? 'advance' : 'detailed',
        note: candidate.verdict.note,
        sourceReportId: reportId,
      });
      toast.success('Đã lưu hình chuẩn. Lần sau gặp lại đề này sẽ vẽ đúng ngay.');
      setOpen(false);
      onSaved?.();
    } catch (err) {
      toast.error('Không lưu được: ' + (err instanceof Error ? err.message : 'lỗi'));
    } finally {
      setSaving(false);
    }
  }, [candidate, cleanPrompt, reportId, onSaved]);

  const verdict = candidate?.verdict;
  const hasFigure = !!candidate?.geometry;

  return (
    <>
      <Button variant="default" size="sm" className="gap-1.5" disabled={!cleanPrompt} onClick={handleOpen}>
        <Sparkles className="h-3.5 w-3.5" /> Nhờ AI vẽ lại
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI vẽ lại — bạn coi đúng chưa?</DialogTitle>
            <DialogDescription className="line-clamp-2">{cleanPrompt}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI đang vẽ lại kỹ hơn… có thể mất ~30–60 giây.</p>
            </div>
          ) : !candidate ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive/60" />
              <p className="text-sm text-muted-foreground">Chưa có kết quả. Thử lại nhé.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Băng "máy tự chấm" */}
              {verdict?.verified ? (
                <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">Máy tự chấm: ĐẠT ✓</p>
                    <p className="text-xs text-muted-foreground">{verdict.note} (nguồn: {verdict.source})</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">Máy CHƯA chắc — bạn nhìn kỹ giúp</p>
                    <p className="text-xs text-muted-foreground">{verdict?.note} (nguồn: {verdict?.source})</p>
                  </div>
                </div>
              )}

              {hasFigure ? (
                <CandidatePreview geometry={candidate.geometry as GeometryData} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-md border py-12 text-center">
                  <AlertTriangle className="h-7 w-7 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">AI chưa vẽ được bài này. Thử lại, hoặc dựng tay rồi lưu hình chuẩn.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button variant="outline" size="sm" className="gap-1.5" disabled={loading || saving} onClick={() => runRedraw(1)}>
              <RefreshCw className="h-3.5 w-3.5" /> Vẽ lại lần nữa
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>Huỷ</Button>
              <Button size="sm" className="gap-1.5" disabled={!hasFigure || loading || saving} onClick={handleApprove}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                Đúng — lưu làm hình chuẩn
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
