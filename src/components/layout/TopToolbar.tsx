import { useState } from 'react';
import { RotateCcw, Maximize2, Grid3X3, Camera, Download, Save, PenTool, Youtube, Box, Eye, EyeOff, Cpu, Navigation, Undo2, Redo2, MoreHorizontal, Share2, FolderOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional } from '@/context/CameraContext';
import { useToolMode } from '@/context/ToolModeContext';
import { CaptureModal } from '@/components/CaptureModal';
import { ShareSheet } from '@/components/ShareSheet';
import { OpenFileButton } from '@/components/OpenFileButton';
import { SaveGeometryDialog } from '@/components/SaveGeometryDialog';
import { ManualDrawToolbar } from '@/components/ManualDrawToolbar';
import { useAuth } from '@/context/AuthContext';
import { UpgradeModal } from '@/components/UpgradeModal';

export function TopToolbar() {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const context = useGeometryOptional();
  const cameraContext = useCameraOptional();
  const { isPro } = useAuth();
  const navigate = useNavigate();
  
  const { mode, setMode } = useToolMode();
  const location = useLocation();
  const isTeacher = location.pathname.startsWith('/teacher');

  if (!context) return null;
  
  const { state, setManualMode, setVideoMode, undo, redo, canUndo, canRedo } = context;
  const isManualMode = state.manualMode;

  // Trang trống (chưa có hình): ẩn thanh công cụ — chưa có gì để thao tác.
  // Vẫn hiện khi đang VẼ THỦ CÔNG (dù hình chưa hình thành).
  if (!state.geometry && !isManualMode) return null;

  return (
    <>
     <TooltipProvider delayDuration={150} skipDelayDuration={300}>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-2 glass rounded-xl px-1.5 sm:px-2 py-1.5 border border-border/50 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide [&>*]:shrink-0">

        {/* VIEW DROPDOWN */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Góc nhìn & Hiển thị" className="h-9 w-9">
                  {state.showPoints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-blue-500" />}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Góc nhìn & Hiển thị</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Góc nhìn & Hiển thị</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => context.toggleCoordinateGrid()}>
              <Grid3X3 className={`w-4 h-4 mr-2 ${state.showCoordinateGrid ? 'text-blue-500' : 'text-muted-foreground'}`} />
              {state.showCoordinateGrid ? 'Ẩn lưới tọa độ' : 'Hiện lưới tọa độ'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => cameraContext?.resetCamera()}>
              <Maximize2 className="w-4 h-4 mr-2 text-muted-foreground" />
              Vừa màn hình
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => context.togglePoints()}>
              {state.showPoints ? <EyeOff className="w-4 h-4 mr-2 text-muted-foreground" /> : <Eye className="w-4 h-4 mr-2 text-blue-500" />}
              {state.showPoints ? 'Ẩn các điểm' : 'Hiện các điểm'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => context.toggleAutoColor()}>
              <Box className="w-4 h-4 mr-2 text-muted-foreground" />
              {state.autoColor ? 'Tắt tô màu mặt phẳng' : 'Bật tô màu mặt phẳng'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => cameraContext?.resetCamera()}>
              <RotateCcw className="w-4 h-4 mr-2 text-muted-foreground" />
              Đặt lại góc nhìn (R)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* UNDO / REDO */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Hoàn tác"
              className="h-9 w-9"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hoàn tác</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Làm lại"
              className="h-9 w-9"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Làm lại</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* CORE TOOLS */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isManualMode ? 'default' : 'ghost'}
              size="icon"
              aria-label="Vẽ thủ công"
              className="h-9 w-9"
              onClick={() => {
                setManualMode(!isManualMode);
                if (!isManualMode) setMode('none'); 
              }}
              disabled={mode !== 'none'}
            >
              <PenTool className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Vẽ thủ công</TooltipContent>
        </Tooltip>

        {/* Video: ẩn trên điện thoại (đưa vào menu "…") để thanh đỡ chật */}
        <span className="hidden sm:contents">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={state.videoMode ? "default" : "ghost"}
                size="icon"
                aria-label="Tạo Video (Animation)"
                className={state.videoMode
                  ? "h-9 w-9 bg-red-500 hover:bg-red-600 text-white"
                  : "h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-500/10"}
                onClick={() => setVideoMode(!state.videoMode)}
              >
                <Youtube className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tạo Video (Animation)</TooltipContent>
          </Tooltip>
        </span>

        {/* FILE ACTIONS — surfaced from the old hamburger menu */}
        {state.geometry && (
          <>
            <div className="w-px h-6 bg-border/50 mx-1" />

            <Tooltip>
              <SaveGeometryDialog
                geometry={state.geometry}
                trigger={
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Lưu hình học"
                      className="h-9 w-9 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                }
              />
              <TooltipContent>Lưu hình học</TooltipContent>
            </Tooltip>

            {/* Teacher: export sống trong RightPanel nên ẩn nút này; Student: giữ.
                Trên điện thoại ẩn (đưa vào menu "…"). */}
            {!isTeacher && (
              <span className="hidden sm:contents">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Xuất ảnh / LaTeX"
                      className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => setIsCaptureOpen(true)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Xuất ảnh / LaTeX</TooltipContent>
                </Tooltip>
              </span>
            )}

            {/* Chia sẻ bài — mở bottom sheet (link/copy/lưu ảnh/lưu tệp). Ẩn trên mobile ⇒ vào menu "…". */}
            {state.geometry && (
              <span className="hidden sm:contents">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Chia sẻ bài"
                      className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => setIsShareOpen(true)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Chia sẻ bài</TooltipContent>
                </Tooltip>
              </span>
            )}

            {/* Mở tệp bài (.json) người khác gửi. Ẩn trên mobile ⇒ vào menu "…". */}
            <span className="hidden sm:contents">
              <Tooltip>
                <TooltipTrigger asChild>
                  <OpenFileButton variant="icon" />
                </TooltipTrigger>
                <TooltipContent>Mở tệp bài (.json)</TooltipContent>
              </Tooltip>
            </span>
          </>
        )}

        {/* Menu "…" chỉ hiện trên ĐIỆN THOẠI: chứa Video + Xuất (những tool đã ẩn bên trên). */}
        <div className="w-px h-6 bg-border/50 mx-1 sm:hidden" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Thêm công cụ" className="h-9 w-9 sm:hidden">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setVideoMode(!state.videoMode)}>
              <Youtube className={cn('w-4 h-4 mr-2', state.videoMode ? 'text-red-500' : 'text-muted-foreground')} />
              {state.videoMode ? 'Tắt tạo Video' : 'Tạo Video (Animation)'}
            </DropdownMenuItem>
            {!isTeacher && state.geometry && (
              <DropdownMenuItem onClick={() => setIsCaptureOpen(true)}>
                <Download className="w-4 h-4 mr-2 text-muted-foreground" />
                Xuất ảnh / LaTeX
              </DropdownMenuItem>
            )}
            {state.geometry && (
              <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                <Share2 className="w-4 h-4 mr-2 text-muted-foreground" />
                Chia sẻ bài
              </DropdownMenuItem>
            )}
            <div className="px-1 py-0.5">
              <OpenFileButton
                variant="button"
                className="w-full justify-start border-0 shadow-none bg-transparent hover:bg-accent h-8 px-2 font-normal text-sm"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Avatar tài khoản đã dời xuống góc dưới trái (LeftSidebar) */}
      </div>
     </TooltipProvider>

      {isManualMode && <ManualDrawToolbar />}

      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        geometry={state.geometry}
        hiddenLines={cameraContext?.hiddenLines}
      />
      <ShareSheet
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        geometry={state.geometry}
        onSaveImage={() => setIsCaptureOpen(true)}
      />
      <UpgradeModal open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
    </>
  );
}
