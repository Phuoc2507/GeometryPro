import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Globe, Lock, Trash2, Clock, MoreHorizontal, FolderPlus, Folder, Download } from 'lucide-react';
import { Mark } from '@/components/Brand';
import { authUrlWithRedirect } from '@/lib/authRedirect';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useSavedGeometries, SavedGeometry } from '@/hooks/useSavedGeometries';
import { useProjects } from '@/hooks/useProjects';
import { OpenFileButton } from '@/components/OpenFileButton';
import { exportProblemFile } from '@/lib/shareFile';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const SavedGeometries = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { savedGeometries, isLoading, fetchGeometries, deleteGeometry, moveToProject, updateGeometry } = useSavedGeometries();
  const { projects } = useProjects();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(authUrlWithRedirect('/saved'));
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGeometries();
    }
  }, [user, fetchGeometries]);

  const handleLoadGeometry = (geometry: SavedGeometry) => {
    // Navigate to the last-used mode (or student by default) with geometry preloaded
    const lastMode = localStorage.getItem('geo3d:last-mode') || 'student';
    navigate(`/${lastMode}`, { state: { loadGeometry: geometry.geometry_data } });
  };

  const [pendingDelete, setPendingDelete] = useState<SavedGeometry | null>(null);
  const askDelete = (e: React.MouseEvent, g: SavedGeometry) => {
    e.stopPropagation();
    setPendingDelete(g);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <div className="animate-spin">
          <Mark className="w-8 h-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen radial-gradient-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Hình đã lưu</h1>
            <p className="text-muted-foreground">
              {savedGeometries.length} hình đã lưu
            </p>
          </div>
          {/* Mở tệp bài (.json) người khác gửi qua Zalo/Messenger */}
          <OpenFileButton variant="button" />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col p-4 border rounded-xl gap-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : savedGeometries.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-4 rounded-full bg-secondary/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Mark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-2">Chưa có hình nào</h2>
            <p className="text-muted-foreground mb-4">
              Tạo và lưu hình học để xem lại sau
            </p>
            <Button onClick={() => navigate('/')}>
              Tạo hình mới
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="grid gap-4 md:grid-cols-2">
              {savedGeometries.map((geometry) => (
                <div
                  key={geometry.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleLoadGeometry(geometry)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLoadGeometry(geometry); } }}
                  className="glass p-4 rounded-xl text-left hover:bg-secondary/50 transition-colors group border border-border/50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mark className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{geometry.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(geometry.updated_at), { 
                            addSuffix: true, 
                            locale: vi 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {geometry.is_public ? (
                        <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                          <Globe className="w-3 h-3" />
                          Công khai
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                          <Lock className="w-3 h-3" />
                          Riêng tư
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {geometry.geometry_data.points?.length || 0} điểm • {geometry.geometry_data.lines?.length || 0} đường
                    </p>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-secondary text-muted-foreground"
                            aria-label="Tuỳ chọn"
                            onClick={e => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FolderPlus className="w-4 h-4 mr-2" /> Thêm vào dự án
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {projects.length > 0 ? (
                                  projects.map(proj => (
                                    <DropdownMenuItem 
                                      key={proj.id}
                                      onClick={(e) => { e.stopPropagation(); moveToProject(geometry.id, proj.id); }}
                                    >
                                      <Folder className="w-4 h-4 mr-2" /> {proj.name}
                                    </DropdownMenuItem>
                                  ))
                                ) : (
                                  <DropdownMenuItem disabled>
                                    Chưa có dự án nào
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); updateGeometry(geometry.id, { is_public: !geometry.is_public }); }}
                          >
                            {geometry.is_public
                              ? (<><Lock className="w-4 h-4 mr-2" /> Gỡ công khai (tắt link)</>)
                              : (<><Globe className="w-4 h-4 mr-2" /> Công khai (tạo link)</>)}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); exportProblemFile(geometry.geometry_data); }}
                          >
                            <Download className="w-4 h-4 mr-2" /> Tải tệp bài (.json)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Xoá"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={(e) => askDelete(e, geometry)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá hình đã lưu?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingDelete?.name ?? 'Hình này'}</strong> sẽ bị xoá vĩnh viễn và không khôi phục được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { const g = pendingDelete; setPendingDelete(null); if (g) deleteGeometry(g.id); }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SavedGeometries;
