import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useGeometryOptional } from '@/context/GeometryContext';
import { parseProblemFile } from '@/lib/shareFile';

interface OpenFileButtonProps {
  /** 'icon' cho toolbar, 'button' cho trang danh sách. */
  variant?: 'icon' | 'button';
  className?: string;
}

/**
 * Nút "Mở tệp": người nhận chọn file .json bạn bè gửi qua Zalo/Messenger để xem lại hình.
 * - Nếu đang ở trong editor (có GeometryContext) → nạp thẳng.
 * - Nếu ở ngoài (vd trang Đã lưu) → điều hướng sang editor kèm dữ liệu.
 */
export function OpenFileButton({ variant = 'button', className }: OpenFileButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const context = useGeometryOptional();
  const navigate = useNavigate();

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cho phép chọn lại cùng một tệp lần sau.
    e.target.value = '';
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      toast({ title: 'Không đọc được tệp', variant: 'destructive' });
      return;
    }

    const result = parseProblemFile(text);
    if (!result.ok || !result.file) {
      toast({ title: 'Tệp không hợp lệ', description: result.error, variant: 'destructive' });
      return;
    }

    const geometry = result.file.geometry_data;
    if (context) {
      context.loadGeometry(geometry);
      toast({ title: 'Đã mở bài!', description: result.file.name });
    } else {
      const lastMode = localStorage.getItem('geo3d:last-mode') || 'student';
      navigate(`/${lastMode}`, { state: { loadGeometry: geometry } });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mở tệp bài hình học"
          className={className ?? 'h-9 w-9'}
          onClick={handlePick}
        >
          <FolderOpen className="w-4 h-4" />
        </Button>
      ) : (
        <Button variant="outline" className={className ? `gap-2 ${className}` : 'gap-2'} onClick={handlePick}>
          <FolderOpen className="w-4 h-4" />
          Mở tệp
        </Button>
      )}
    </>
  );
}
