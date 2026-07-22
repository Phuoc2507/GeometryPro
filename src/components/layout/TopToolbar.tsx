import { useState } from 'react';
import { RotateCcw, Maximize2, Grid3X3, Camera, Download, Save, PenTool, Youtube, Scissors, Box, Eye, EyeOff, Cpu, Home, Navigation, Undo2, Redo2 } from 'lucide-react';
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
import { SaveGeometryDialog } from '@/components/SaveGeometryDialog';
import { UserMenu } from '@/components/UserMenu';
import { ManualDrawToolbar } from '@/components/ManualDrawToolbar';
import { useAuth } from '@/context/AuthContext';
import { UpgradeModal } from '@/components/UpgradeModal';

export function TopToolbar() {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const context = useGeometryOptional();
  const cameraContext = useCameraOptional();
  const { isPro } = useAuth();
  
  const { mode, setMode } = useToolMode();
  const location = useLocation();
  const isTeacher = location.pathname.startsWith('/teacher');

  if (!context) return null;
  
  const navigate = useNavigate();
  const { state, clearGeometry, setManualMode, setVideoMode, undo, redo, canUndo, canRedo } = context;
  const isManualMode = state.manualMode;

  const handleModeToggle = (newMode: 'cut' | 'unfold') => {
    if (mode === newMode) setMode('none');
    else setMode(newMode);
  };

  return (
    <>
     <TooltipProvider delayDuration={150} skipDelayDuration={300}>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-2 glass rounded-xl px-1.5 sm:px-2 py-1.5 border border-border/50 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide [&>*]:shrink-0">

        {/* VIEW DROPDOWN */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
            <DropdownMenuItem onClick={() => {}}>
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
              className="h-8 w-8"
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
              className="h-8 w-8"
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
              className="h-8 w-8"
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

        {state.geometry && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === 'cut' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                  onClick={() => handleModeToggle('cut')}
                  disabled={isManualMode || mode === 'unfold'}
                >
                  <Scissors className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mặt Cắt Động (Cross-section)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === 'unfold' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                  onClick={() => handleModeToggle('unfold')}
                  disabled={isManualMode || mode === 'cut'}
                >
                  <Box className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Trải Phẳng Hình (Unfold)</TooltipContent>
            </Tooltip>
          </>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={state.videoMode ? "default" : "ghost"}
              size="icon"
              className={state.videoMode 
                ? "h-8 w-8 bg-red-500 hover:bg-red-600 text-white" 
                : "h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"}
              onClick={() => setVideoMode(!state.videoMode)}
            >
              <Youtube className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tạo Video (Animation)</TooltipContent>
        </Tooltip>

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
                      className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                }
              />
              <TooltipContent>Lưu hình học</TooltipContent>
            </Tooltip>

            {/* Teacher: export sống trong RightPanel nên ẩn nút này; Student: giữ */}
            {!isTeacher && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => setIsCaptureOpen(true)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xuất ảnh / LaTeX</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearGeometry}
                >
                  <Home className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Về trang nhập đề</TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="w-px h-6 bg-border/50 mx-1" />
        <UserMenu />
      </div>
     </TooltipProvider>

      {isManualMode && <ManualDrawToolbar />}

      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        geometry={state.geometry}
        canvasRef={cameraContext?.canvasRef!}
        hiddenLines={cameraContext?.hiddenLines}
      />
      <UpgradeModal open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
    </>
  );
}
