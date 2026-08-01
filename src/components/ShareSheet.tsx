import { useEffect, useState } from 'react';
import {
  Copy,
  Check,
  ImageDown,
  FileJson,
  Share2,
  Facebook,
  MoreHorizontal,
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
  /** Link công khai (Giai đoạn 2). Chưa có ⇒ ẩn phần link + icon nền tảng. */
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

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const title = geometry?.name || 'Bài hình học';
  const shareText = `${title} — GeometryPro`;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
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
    if (!shareUrl) return;
    openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  };

  const handleNativeShareLink = async () => {
    if (!shareUrl) return;
    const res = await shareViaNative({ title, text: shareText, url: shareUrl });
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
          {/* Hàng 1: Link + Copy (chỉ khi đã có link công khai) */}
          {shareUrl && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 p-2">
              <span className="flex-1 min-w-0 truncate text-sm px-2 font-mono text-muted-foreground">
                {shareUrl}
              </span>
              <Button size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã copy' : 'Copy'}
              </Button>
            </div>
          )}

          {/* Hàng 2: Icon nền tảng (chỉ khi có link để gửi) */}
          {shareUrl && (
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
          {!shareUrl && nativeSupported && (
            <Button variant="ghost" className="gap-2" onClick={handleShareFile} disabled={!geometry}>
              <Share2 className="w-4 h-4" />
              Chia sẻ tệp qua ứng dụng khác
            </Button>
          )}

          {!shareUrl && (
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Gửi tệp <span className="font-medium">.json</span> qua Zalo/Messenger; người nhận chọn{' '}
              <span className="font-medium">Mở tệp</span> trong ứng dụng để xem lại hình.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
