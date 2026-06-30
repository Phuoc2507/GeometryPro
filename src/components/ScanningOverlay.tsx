import { Hexagon, Triangle, Square, Circle, PlusCircle, StopCircle } from 'lucide-react';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ScanningOverlay() {
  const context = useGeometryOptional();

  if (!context) return null;
  
  const { state } = context;

  // Show overlay when isScanning OR when viewing a processing queue item
  const activeItem = state.activeQueueId
    ? state.queue.find(q => q.id === state.activeQueueId)
    : null;
  const isViewingProcessing = activeItem && (activeItem.status === 'processing' || activeItem.status === 'pending');

  if (!state.isScanning && !isViewingProcessing) {
    return null;
  }

  // Use queue item progress if viewing a processing item, otherwise use scan state
  const progress = isViewingProcessing ? (activeItem?.progress || 0) : state.scanProgress;
  const statusText = isViewingProcessing ? (activeItem?.statusText || 'Đang chờ...') : state.scanStatus;
  const streamingText = isViewingProcessing ? activeItem?.streamingText : state.streamingText;

  const handleNewProject = () => {
    // Clear active queue view, stop scanning if needed
    if (state.isScanning) {
      context.stopScanning();
    } else {
      context.clearActiveQueue();
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="flex flex-col items-center space-y-6 sm:space-y-8">
        {/* Abstract Geometric Shapes */}
        <div className="relative w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 overflow-hidden">
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-80" />
          </div>

          <div className="relative flex items-center justify-center">
            <Hexagon className={cn("w-16 h-16 sm:w-20 sm:h-20 text-primary/40 absolute transition-all duration-500", progress >= 25 && "text-primary/80")} strokeWidth={1} />
            <Triangle className={cn("w-10 h-10 sm:w-12 sm:h-12 text-accent/40 absolute -translate-x-6 sm:-translate-x-8 translate-y-3 sm:translate-y-4 transition-all duration-500", progress >= 50 && "text-accent/80")} strokeWidth={1.5} />
            <Square className={cn("w-8 h-8 sm:w-10 sm:h-10 text-primary/40 absolute translate-x-6 sm:translate-x-8 translate-y-1.5 sm:translate-y-2 rotate-12 transition-all duration-500", progress >= 75 && "text-primary/80")} strokeWidth={1.5} />
            <Circle className={cn("w-6 h-6 sm:w-8 sm:h-8 text-accent/40 absolute translate-x-3 sm:translate-x-4 -translate-y-6 sm:-translate-y-8 transition-all duration-500", progress >= 100 && "text-accent/80")} strokeWidth={1.5} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-56 sm:w-72 space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{statusText}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
          {streamingText ? (
            <div className="mt-4 h-40 w-full overflow-y-auto text-left text-xs text-muted-foreground/80 p-3 bg-muted/30 rounded-md whitespace-pre-wrap font-mono break-words border border-border/50 flex flex-col-reverse shadow-inner">
              {streamingText}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 text-center">
              AI đang reasoning từng bước...
            </p>
          )}
        </div>

        {/* Action buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewProject}
          className="gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Vẽ hình mới
        </Button>
      </div>
    </div>
  );
}
