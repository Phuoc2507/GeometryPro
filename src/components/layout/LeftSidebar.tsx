import { useState } from 'react';
import { Hexagon, Menu, Loader2, CheckCircle2, XCircle, Eye, Trash2, Clock, Zap, Layers, Target, ListPlus, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useGeometryHistory } from '@/hooks/useGeometryHistory';
import { useAuth } from '@/context/AuthContext';
import { QueueItem } from '@/types/geometry';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const modeIcons: Record<string, typeof Zap> = {
  quick: Zap,
  detailed: Layers,
  precise: Target,
};

const modeLabels: Record<string, string> = {
  quick: 'Nhanh',
  detailed: 'Kỹ',
  precise: 'Chính xác',
};

function QueueItemCard({ item, isActive, onView, onRemove }: {
  item: QueueItem;
  isActive: boolean;
  onView: () => void;
  onRemove: () => void;
}) {
  const ModeIcon = modeIcons[item.mode] || Zap;
  const isProcessing = item.status === 'processing';
  const isDone = item.status === 'done';
  const isError = item.status === 'error';
  const isPending = item.status === 'pending';

  return (
    <div
      className={cn(
        "group relative p-3 rounded-xl transition-all duration-200 border cursor-pointer",
        isActive
          ? "bg-primary/10 border-primary/30"
          : isDone
            ? "bg-secondary/20 border-border/30 hover:bg-secondary/40"
            : isError
              ? "bg-destructive/5 border-destructive/20"
              : "bg-secondary/10 border-border/20 hover:bg-secondary/30"
      )}
      onClick={(isDone || isProcessing || isPending) ? onView : undefined}
    >
      {/* Remove button */}
      {(isDone || isError) && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-all"
        >
          <Trash2 className="w-3 h-3 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-start gap-2.5">
        {/* Status icon */}
        <div className={cn(
          "p-1.5 rounded-lg shrink-0 mt-0.5",
          isProcessing ? "bg-primary/20" : isDone ? "bg-green-500/15" : isError ? "bg-destructive/15" : "bg-secondary/40"
        )}>
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : isError ? (
            <XCircle className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
            {item.prompt}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5">
            <ModeIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{modeLabels[item.mode] || item.mode}</span>
            {isDone && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-green-500 font-medium flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> Xem
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar for processing items */}
      {isProcessing && (
        <div className="mt-2 space-y-1">
          <Progress value={item.progress} className="h-1" />
          <p className="text-[10px] text-muted-foreground/70 truncate">{item.statusText}</p>
        </div>
      )}

      {/* Error message */}
      {isError && (
        <p className="mt-1.5 text-[10px] text-destructive/80 line-clamp-1">{item.error}</p>
      )}
    </div>
  );
}

function SidebarContent() {
  const context = useGeometryOptional();
  const { user } = useAuth();
  const { history, deleteHistoryItem, clearHistory } = useGeometryHistory();
  const [showHistory, setShowHistory] = useState(false);
  const queue = context?.state.queue || [];
  const activeId = context?.state.activeQueueId;

  const processingItems = queue.filter(q => q.status === 'processing' || q.status === 'pending');
  const completedItems = queue.filter(q => q.status === 'done');
  const errorItems = queue.filter(q => q.status === 'error');

  const handleLoadHistory = (item: typeof history[0]) => {
    if (context) {
      context.loadGeometry(item.geometry_data);
    }
  };

  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 glow-primary">
            <Hexagon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold gradient-text">GeoMagic Pro</h1>
        </div>
      </div>

      {/* Queue + History Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          {/* Queue */}
          {queue.length === 0 && history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 min-h-[200px]">
              <div className="text-center space-y-3">
                <div className="p-3 rounded-2xl bg-secondary/20 inline-block">
                  <ListPlus className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hàng chờ trống</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Thêm nhiều đề bài để vẽ song song
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {/* Processing / Pending */}
              {processingItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-xs font-medium text-primary">
                      Đang xử lý ({processingItems.length})
                    </span>
                  </div>
                  {processingItems.map(item => (
                    <QueueItemCard
                      key={item.id}
                      item={item}
                      isActive={activeId === item.id}
                      onView={() => context?.viewQueueItem(item.id)}
                      onRemove={() => context?.removeQueueItem(item.id)}
                    />
                  ))}
                </div>
              )}

              {/* Completed */}
              {completedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium text-green-500/80">
                      Hoàn thành ({completedItems.length})
                    </span>
                  </div>
                  {completedItems.map(item => (
                    <QueueItemCard
                      key={item.id}
                      item={item}
                      isActive={activeId === item.id}
                      onView={() => context?.viewQueueItem(item.id)}
                      onRemove={() => context?.removeQueueItem(item.id)}
                    />
                  ))}
                </div>
              )}

              {/* Errors */}
              {errorItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive/80">
                      Lỗi ({errorItems.length})
                    </span>
                  </div>
                  {errorItems.map(item => (
                    <QueueItemCard
                      key={item.id}
                      item={item}
                      isActive={false}
                      onView={() => {}}
                      onRemove={() => context?.removeQueueItem(item.id)}
                    />
                  ))}
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="space-y-2 border-t border-border/30 pt-3">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center justify-between w-full px-1"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Lịch sử ({history.length})
                      </span>
                    </div>
                    {showHistory ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {showHistory && (
                    <div className="space-y-1.5">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleLoadHistory(item)}
                          className="group relative p-2.5 rounded-lg bg-secondary/10 border border-border/20 hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <p className="text-xs font-medium text-foreground line-clamp-1">{item.name}</p>
                          {item.prompt && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{item.prompt}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: vi })}
                          </p>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-destructive"
                        onClick={clearHistory}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Xóa lịch sử
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          v2.6.3 — AI-Powered Geometry
        </p>
      </div>
    </>
  );
}

// Mobile Sidebar with Sheet
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const context = useGeometryOptional();
  const processingCount = context?.state.queue.filter(q => q.status === 'processing' || q.status === 'pending').length || 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 lg:hidden glass border border-border/50"
        >
          <Menu className="w-5 h-5" />
          {processingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
              {processingCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 glass border-r border-border/50">
        <div className="h-full flex flex-col">
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Desktop Sidebar
export function LeftSidebar() {
  return (
    <aside className="w-64 h-screen hidden lg:flex flex-col glass border-r border-border/50 sticky left-0 top-0 z-40 shrink-0">
      <SidebarContent />
    </aside>
  );
}
