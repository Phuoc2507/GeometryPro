import { useState } from 'react';
import { RotateCcw, Maximize2, Grid3X3, Camera, Save, PenTool, Youtube, Scissors, Box, Eye, EyeOff, BrainCircuit, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional } from '@/context/CameraContext';
import { useToolMode } from '@/context/ToolModeContext';
import { CaptureModal } from '@/components/CaptureModal';
import { SaveGeometryDialog } from '@/components/SaveGeometryDialog';
import { UserMenu } from '@/components/UserMenu';
import { ManualDrawToolbar } from '@/components/ManualDrawToolbar';

export function TopToolbar() {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const context = useGeometryOptional();
  const cameraContext = useCameraOptional();
  
  // Note: we can use ToolMode even if GeometryContext is missing, but it makes more sense if it exists.
  // Using try-catch or safe hook for ToolMode since it might be rendered without it in some Edge cases.
  // We added ToolModeProvider in App so it should be fine.
  const { mode, setMode } = useToolMode();
  
  if (!context) return null;
  
  const { state, clearGeometry, setManualMode, setVideoMode, setAiModel, setUseReasoning } = context;
  const isManualMode = state.manualMode;
  const { aiModel, useReasoning } = state;

  const handleModeToggle = (newMode: 'cut' | 'unfold') => {
    if (mode === newMode) setMode('none');
    else setMode(newMode);
  };

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-2 glass rounded-xl px-1.5 sm:px-2 py-1.5 border border-border/50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Grid</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border/50 mx-1" />



        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to View</TooltipContent>
        </Tooltip>

        {/* Manual Draw Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isManualMode ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setManualMode(!isManualMode);
                if (!isManualMode) setMode('none'); // disable other modes
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
            <div className="w-px h-6 bg-border/50 mx-1" />
            
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

            <div className="w-px h-6 bg-border/50 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={state.showPoints ? 'ghost' : 'default'}
                  size="icon"
                  className={`h-8 w-8 ${!state.showPoints ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-500/10' : ''}`}
                  onClick={() => context.togglePoints()}
                >
                  {state.showPoints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{state.showPoints ? 'Ẩn các điểm' : 'Hiện các điểm'}</TooltipContent>
            </Tooltip>

            <SaveGeometryDialog
              geometry={state.geometry}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Save className="w-4 h-4" />
                </Button>
              }
            />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:text-primary"
                  onClick={() => setIsCaptureOpen(true)}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chụp hình</TooltipContent>
            </Tooltip>

            <Toggle
              size="sm"
              variant="outline"
              pressed={useReasoning}
              onPressedChange={setUseReasoning}
              className={cn("gap-1.5 border-dashed", useReasoning && "bg-primary/10 text-primary border-primary/30")}
            >
              <BrainCircuit className={cn("w-3.5 h-3.5", useReasoning && "animate-pulse")} />
              Reasoning
            </Toggle>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={clearGeometry}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset</TooltipContent>
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

        <div className="w-px h-6 bg-border/50 mx-1" />
        <UserMenu />
      </div>

      {isManualMode && <ManualDrawToolbar />}

      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        geometry={state.geometry}
        cameraState={cameraContext?.cameraState || null}
        canvasRef={cameraContext?.canvasRef || { current: null }}
        hiddenLines={cameraContext?.hiddenLines}
      />
    </>
  );
}
