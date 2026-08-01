import { useEffect, useState } from 'react';
import {
  Copy,
  Check,
  ImageDown,
  FileJson,
  Share2,
  Facebook,
  MoreHorizontal,
  Link2,
  Loader2,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { GeometryData } from '@/types/geometry';
import { useAuth } from '@/context/AuthContext';
import { useSavedGeometries } from '@/hooks/useSavedGeometries';
import {
  exportProblemFile,
  serializeProblemFile,
  slugifyFileName,
  canNativeShare,
  shareViaNative,
} from '@/lib/shareFile';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geometry: GeometryData | null;
  /** Mở bộ xuất ảnh đầy đủ (CaptureModal). */
  onSaveImage: () => void;
  /** Link công khai có sẵn (vd mở từ trang Đã lưu của một bài is_public). */
  shareUrl?: string | null;
}

/** Nút icon tròn kiểu TikTok cho hàng nền tảng. */
function PlatformButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-16 shrink-0"
      aria-label={label}
    >
      <span
        className={`flex items-center justify-center w-14 h-14 rounded-full text-white shadow-sm transition-transform active:scale-95 ${className ?? 'bg-secondary text-foreground'}`}
      >
        {children}
      </span>
      <span className="text-[11px] text-muted-foreground text-center leading-tight">{label}</span>
    </button>
  );
}

export function ShareSheet({ open, onOpenChange, geometry, onSaveImage, shareUrl }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { user, openAuthModal } = useAuth();
  const { saveGeometry } = useSavedGeometries();

  // Link mới tạo chỉ hợp lệ cho đúng bài đang mở ⇒ reset khi đóng sheet.
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCreatedUrl(null);
    }
  }, [open]);

  const effectiveUrl = shareUrl || createdUrl;
  const title = geometry?.name || 'Bài hình học';
  const shareText = `${title} — GeometryPro`;

  const handleCreateLink = async () => {
    if (!geometry) return;
    if (!user) {
      onOpenChange(false);
      openAuthModal('save');
      return;
    }
    setCreating(true);
    try {
      const saved = await saveGeometry(title, geometry, true);
      if (saved?.id) {
        setCreatedUrl(`${window.location.origin}/s/${saved.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!effectiveUrl) return;
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      toast({ title: 'Đã sao chép link!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Không sao chép được', description: 'Trình duyệt chặn clipboard.', variant: 'destructive' });
    }
  };

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleFacebook = () => {
    if (!effectiveUrl) return;
    openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(effectiveUrl)}`);
  };

  const handleNativeShareLink = async () => {
    if (!effectiveUrl) return;
    const res = await shareViaNative({ title, text: shareText, url: effectiveUrl });
    if (res === 'unsupported') {
      await handleCopy();
      toast({ title: 'Đã sao chép link', description: 'Máy không hỗ trợ chia sẻ nhanh — hãy dán link để gửi.' });
    }
  };

  const handleSaveFile = () => {
    if (!geometry) return;
    exportProblemFile(geometry);
    toast({ title: 'Đã lưu tệp!', description: 'Bạn có thể gửi tệp .json này cho người khác.' });
    onOpenChange(false);
  };

  const handleShareFile = async () => {
    if (!geometry) return;
    const json = serializeProblemFile(geometry);
    const file = new File([json], `${slugifyFileName(geometry.name)}.geo3d.json`, {
      type: 'application/json',
    });
    if (!canNativeShare({ files: [file] })) {
      // Không share được file → tải về để người dùng tự đính kèm.
      handleSaveFile();
      return;
    }
    const res = await shareViaNative({ title, text: shareText, files: [file] });
    if (res === 'error' || res === 'unsupported') handleSaveFile();
  };

  const handleSaveImage = () => {
    onSaveImage();
    onOpenChange(false);
  };

  const nativeSupported = canNativeShare();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-6">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Chia sẻ bài
          </DrawerTitle>
          <DrawerDescription className="truncate">{title}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 flex flex-col gap-5">
          {/* Tạo link công khai (khi chưa có link) */}
          {!effectiveUrl && (
            <Button onClick={handleCreateLink} disabled={!geometry || creating} className="gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {creating ? 'Đang tạo link…' : 'Tạo link công khai'}
            </Button>
          )}

          {/* Hàng 1: Link + Copy (chỉ khi đã có link công khai) */}
          {effectiveUrl && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 p-2">
              <span className="flex-1 min-w-0 truncate text-sm px-2 font-mono text-muted-foreground">
                {effectiveUrl}
              </span>
              <Button size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã copy' : 'Copy'}
              </Button>
            </div>
          )}

          {/* Hàng 2: Icon nền tảng (chỉ khi có link để gửi) */}
          {effectiveUrl && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              <PlatformButton label="Facebook" onClick={handleFacebook} className="bg-[#1877F2]">
                <Facebook className="w-6 h-6" />
              </PlatformButton>
              {nativeSupported && (
                <PlatformButton
                  label="Zalo, Messenger…"
                  onClick={handleNativeShareLink}
                  className="bg-gradient-to-br from-primary to-blue-500"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </PlatformButton>
              )}
              <PlatformButton label="Sao chép link" onClick={handleCopy}>
                {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
              </PlatformButton>
            </div>
          )}

          {/* Hàng 3: Lưu ảnh / Lưu tệp */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5"
              onClick={handleSaveImage}
              disabled={!geometry}
            >
              <ImageDown className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Lưu ảnh</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5"
              onClick={handleSaveFile}
              disabled={!geometry}
            >
              <FileJson className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Lưu tệp (.json)</span>
            </Button>
          </div>

          {/* Chia sẻ tệp qua ứng dụng khác (khi không có link) */}
          {!effectiveUrl && nativeSupported && (
            <Button variant="ghost" className="gap-2" onClick={handleShareFile} disabled={!geometry}>
              <Share2 className="w-4 h-4" />
              Chia sẻ tệp qua ứng dụng khác
            </Button>
          )}

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {effectiveUrl
              ? 'Ai có link đều xem được bài này. Gỡ công khai trong trang "Hình đã lưu" để tắt link.'
              : 'Hoặc gửi tệp .json qua Zalo/Messenger; người nhận chọn Mở tệp trong ứng dụng để xem lại hình.'}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
