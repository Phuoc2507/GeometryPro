import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hexagon, Globe, Lock, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { useSavedGeometries, SavedGeometry } from '@/hooks/useSavedGeometries';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const SavedGeometries = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { savedGeometries, isLoading, fetchGeometries, deleteGeometry } = useSavedGeometries();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa hình này?')) {
      await deleteGeometry(id);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <div className="animate-spin">
          <Hexagon className="w-8 h-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen radial-gradient-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Hình đã lưu</h1>
            <p className="text-muted-foreground">
              {savedGeometries.length} hình đã lưu
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin">
              <Hexagon className="w-8 h-8 text-primary" />
            </div>
          </div>
        ) : savedGeometries.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-4 rounded-full bg-secondary/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Hexagon className="w-8 h-8 text-muted-foreground" />
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
                <button
                  key={geometry.id}
                  onClick={() => handleLoadGeometry(geometry)}
                  className="glass p-4 rounded-xl text-left hover:bg-secondary/50 transition-colors group border border-border/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Hexagon className="w-5 h-5 text-primary" />
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, geometry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default SavedGeometries;
