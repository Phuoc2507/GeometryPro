import { useState } from 'react';
import { 
  Hexagon, Menu, Loader2, CheckCircle2, XCircle, Eye, Trash2, Clock, Zap, Layers, Target, 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Edit3, Folder, MoreHorizontal, Plus, 
  FolderPlus, Edit2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, 
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, 
  DropdownMenuSubContent, DropdownMenuPortal 
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useGeometryHistory, HistoryItem } from '@/hooks/useGeometryHistory';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/context/AuthContext';
import { QueueItem } from '@/types/geometry';
import { Project } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
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
        "group relative p-3 rounded-xl transition-all duration-200 border cursor-pointer mx-3 mb-2",
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
      {(isDone || isError) && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-all"
        >
          <Trash2 className="w-3 h-3 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-start gap-2.5">
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

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
            {item.prompt}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ModeIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{modeLabels[item.mode] || item.mode}</span>
            {isDone && (
              <>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-green-500 font-medium flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> Xem
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="mt-2 space-y-1">
          <Progress value={item.progress} className="h-1" />
          <p className="text-[10px] text-muted-foreground/70 truncate">{item.statusText}</p>
        </div>
      )}

      {isError && (
        <p className="mt-1.5 text-[10px] text-destructive/80 line-clamp-1">{item.error}</p>
      )}
    </div>
  );
}

function SidebarContent() {
  const context = useGeometryOptional();
  const { user, openAuthModal } = useAuth();
  const { toast } = useToast();
  const { history, deleteHistoryItem, renameHistoryItem, moveToProject } = useGeometryHistory();
  const { projects, createProject, deleteProject } = useProjects();
  
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [showRecents, setShowRecents] = useState(true);
  
  // Dialogs State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectInput, setNewProjectInput] = useState("");
  const [pendingMoveItemId, setPendingMoveItemId] = useState<string | null>(null);

  const queue = context?.state.queue || [];
  const activeId = context?.state.activeQueueId;

  const activeQueueItems = queue.filter(q => q.status !== 'error' && q.status !== 'done');
  
  const handleLoadHistory = (item: HistoryItem) => {
    if (context) {
      context.loadGeometry(item.geometry_data);
      const url = new URL(window.location.href);
      url.searchParams.set('id', item.id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const openRename = (item: HistoryItem) => {
    setRenameTargetId(item.id);
    setRenameInput(item.name || "Hình không tên");
    setRenameDialogOpen(true);
  };

  const handleRename = () => {
    if (renameTargetId && renameInput.trim()) {
      renameHistoryItem(renameTargetId, renameInput.trim());
    }
    setRenameDialogOpen(false);
  };

  const handleCreateProject = async () => {
    if (newProjectInput.trim()) {
      const proj = await createProject(newProjectInput.trim());
      if (proj && pendingMoveItemId) {
        await moveToProject(pendingMoveItemId, proj.id);
        setExpandedProjects(prev => ({ ...prev, [proj.id]: true }));
      }
    }
    setNewProjectDialogOpen(false);
    setNewProjectInput("");
    setPendingMoveItemId(null);
  };

  const openNewProject = (itemIdToMove: string | null = null) => {
    if (!user) {
      openAuthModal('project');
      return;
    }
    setPendingMoveItemId(itemIdToMove);
    setNewProjectInput("");
    setNewProjectDialogOpen(true);
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const renderHistoryItem = (item: HistoryItem) => {
    return (
      <div 
        key={item.id}
        onClick={() => handleLoadHistory(item)}
        className="group relative flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors"
      >
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[15px] font-medium text-foreground truncate">{item.name || "Hình không tên"}</p>
        </div>
        
        <div className="flex items-center pl-2 shrink-0" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-7 w-7 rounded-md bg-background hover:bg-secondary border border-transparent hover:border-border text-foreground shrink-0 shadow-sm">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRename(item); }}>
                <Edit2 className="w-4 h-4 mr-2" /> Đổi tên
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderPlus className="w-4 h-4 mr-2" /> Thêm vào dự án
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {projects.map(p => (
                      <DropdownMenuItem 
                        key={p.id}
                        onClick={(e) => { e.stopPropagation(); moveToProject(item.id, p.id); }}
                      >
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                    {projects.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openNewProject(item.id); }}>
                      <Plus className="w-4 h-4 mr-2" /> Tạo dự án mới...
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              {item.project_id && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); moveToProject(item.id, null); }}>
                  <Folder className="w-4 h-4 mr-2 text-muted-foreground" /> Gỡ khỏi dự án
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const recents = history.filter(h => !h.project_id);

  return (
    <>
      {/* New Chat Button */}
      <div className="p-3 pb-0">
        <Button 
          variant="outline" 
          className="w-full justify-start text-[15px] font-medium h-12 rounded-xl bg-background/50 hover:bg-secondary/40 border-border/50"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('id');
            window.history.replaceState({}, '', url.toString());
            context?.clearGeometry();
          }}
        >
          <div className="flex items-center justify-between w-full">
            <span>Bài mới</span>
            <Edit3 className="w-5 h-5 text-muted-foreground" />
          </div>
        </Button>
      </div>

      <ScrollArea className="flex-1 mt-4 px-2">
        {/* Active Queue */}
        {activeQueueItems.length > 0 && (
          <div className="mb-4">
            <div className="px-3 mb-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="text-xs font-semibold text-primary">Đang xử lý</span>
            </div>
            {activeQueueItems.map(item => (
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

        {/* Projects Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 mb-1 group">
            <span className="text-sm font-semibold text-muted-foreground">Dự án</span>
            <button 
              className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-secondary text-muted-foreground shrink-0"
              onClick={(e) => { e.stopPropagation(); openNewProject(); }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-0.5 px-2">
            {!user ? (
              <div 
                className="mt-2 p-3 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => openAuthModal('project')}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-background/80 shadow-sm shrink-0">
                    <FolderPlus className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Tạo Dự án học tập</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Đăng nhập để lưu trữ và phân loại các bài toán một cách khoa học.</p>
                  </div>
                </div>
              </div>
            ) : projectsLoading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : projects.map(project => {
              const isExpanded = expandedProjects[project.id];
              const projectItems = history.filter(h => h.project_id === project.id);
              return (
                <div key={project.id}>
                  <div 
                    onClick={() => toggleProject(project.id)}
                    className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-[15px] font-medium truncate">{project.name}</span>
                    </div>
                    <div className="flex items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground outline-none transition-colors" onClick={e => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa dự án
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="pl-6 pr-2 space-y-0.5 mt-0.5 border-l-2 border-border/20 ml-5 relative before:absolute before:inset-0 before:-left-[2px] before:w-[2px] before:bg-gradient-to-b before:from-border/40 before:to-transparent">
                      {projectItems.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground/60 italic">
                          Trống
                        </div>
                      ) : (
                        projectItems.map(renderHistoryItem)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recents Section */}
        {(recents.length > 0 || historyLoading) && (
          <div className="mb-4">
            <div 
              className="flex items-center justify-between px-3 mb-1 cursor-pointer group"
              onClick={() => setShowRecents(!showRecents)}
            >
              <span className="text-sm font-semibold text-muted-foreground">Gần đây</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 transition-opacity">
                {showRecents ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </Button>
            </div>
            
            {showRecents && (
              <div className="space-y-0.5">
                {historyLoading ? (
                  <div className="space-y-2 py-2 px-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  recents.map(renderHistoryItem)
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {history.length === 0 && projects.length === 0 && !historyLoading && !projectsLoading && (
          <div className="flex flex-col items-center justify-center p-6 text-center mt-10">
            <div className="p-4 rounded-full bg-secondary/30 mb-3">
              <Layers className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Chưa có bài nào</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Bắt đầu tạo hình mới để lưu lại
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Đổi tên bài</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              placeholder="Nhập tên mới..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleRename}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tạo dự án mới</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={newProjectInput}
              onChange={e => setNewProjectInput(e.target.value)}
              placeholder="Tên dự án..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateProject();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateProject}>Tạo mới</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <SheetContent side="left" className="w-[300px] p-0 glass border-r border-border/50">
        <div className="h-full flex flex-col bg-background/95">
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Desktop Sidebar
export function LeftSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative h-screen hidden lg:flex z-40 shrink-0">
      <aside 
        className={cn(
          "h-full flex flex-col glass border-r border-border/50 sticky left-0 top-0 transition-all duration-300 bg-background/95 overflow-hidden",
          isCollapsed ? "w-0 border-none" : "w-[260px]"
        )}
      >
        <div className="h-full w-[260px] flex flex-col relative">
          <SidebarContent />
        </div>
      </aside>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full glass border border-border/50 z-50 h-6 w-6 bg-background shadow-sm hover:bg-secondary flex items-center justify-center transition-all duration-300",
          isCollapsed ? "left-0 translate-x-1/2" : "left-[260px] -translate-x-1/2"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
