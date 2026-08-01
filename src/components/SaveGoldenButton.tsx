/**
 * SaveGoldenButton — nút CHỈ ADMIN: "Lưu làm hình chuẩn".
 *
 * Đóng vòng lặp học của geo3d: khi máy vẽ SAI một bài khó, admin dựng lại hình
 * ĐÚNG (bằng bộ công cụ vẽ tay), rồi bấm nút này để lưu hình hiện tại làm "hình
 * chuẩn" (golden) cho đúng đề đó. Lần sau bất kỳ ai nhập lại đề đó → server phục
 * vụ THẲNG hình chuẩn, bỏ qua engine/LLM ⇒ vẽ đúng tức thì.
 *
 * Bảo mật thật nằm ở server (/api/admin requireAdmin). Nút chỉ hiện với admin để
 * đỡ rối UI người thường; người thường có gọi được endpoint cũng bị 403.
 */
import { useState } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { saveGolden } from '@/lib/adminApi';
import type { GeometryData } from '@/types/geometry';
import { cn } from '@/lib/utils';

interface SaveGoldenButtonProps {
  /** Đề bài của hình hiện tại (khoá so khớp golden). */
  prompt?: string | null;
  /** Hình đang hiển thị — sẽ được lưu làm hình chuẩn. */
  geometry?: GeometryData | null;
  /** Nếu duyệt từ một bài lỗi cụ thể ở trang admin → đánh dấu bài đó "đã sửa". */
  sourceReportId?: string | null;
  triggerClassName?: string;
}

const NOTE_MAX = 1000;

export function SaveGoldenButton({
  prompt,
  geometry,
  sourceReportId = null,
  triggerClassName,
}: SaveGoldenButtonProps) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Chỉ admin mới thấy nút.
  if (!isAdmin) return null;

  const cleanPrompt = (prompt || '').trim();
  const hasPoints = !!geometry && Array.isArray(geometry.points) && geometry.points.length > 0;
  const canSave = cleanPrompt.length > 0 && hasPoints;
  // 'detailLevel' có mặt ⇒ hình do chế độ Vẽ kỹ tạo; chỉ để tham khảo, KHÔNG dùng khi khớp.
  const mode = (geometry as { detailLevel?: string } | null)?.detailLevel ? 'detailed' : 'quick';

  const handleSave = async () => {
    if (!canSave || !geometry) return;
    setSaving(true);
    try {
      await saveGolden({
        prompt: cleanPrompt,
        geometry,
        mode,
        note: note.trim() ? note.trim().slice(0, NOTE_MAX) : null,
        sourceReportId,
      });
      toast.success('Đã lưu hình chuẩn. Lần sau gặp lại đề này sẽ vẽ đúng ngay.');
      setNote('');
      setOpen(false);
    } catch (err) {
      toast.error('Không lưu được hình chuẩn: ' + (err instanceof Error ? err.message : 'lỗi'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canSave}
          title={
            !hasPoints ? 'Cần có hình (điểm) trước'
              : !cleanPrompt ? 'Cần có đề bài'
                : 'Lưu hình hiện tại làm hình chuẩn cho đề này'
          }
          className={cn('gap-1.5', triggerClassName)}
        >
          <BadgeCheck className="w-3.5 h-3.5" /> Lưu làm hình chuẩn
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lưu làm hình chuẩn</DialogTitle>
          <DialogDescription>
            Hình hiện tại sẽ được lưu làm đáp án chuẩn cho đề này. Lần sau bất kỳ ai
            nhập lại đúng đề bài sẽ được phục vụ hình này ngay, không qua AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground max-h-24 overflow-auto whitespace-pre-wrap">
            {cleanPrompt || '(chưa có đề bài)'}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn): vì sao AI vẽ sai, lưu ý khi vẽ…"
            className="min-h-[72px] resize-none text-sm"
            maxLength={NOTE_MAX}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Huỷ</Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            Lưu hình chuẩn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
