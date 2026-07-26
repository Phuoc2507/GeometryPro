import { useState, useCallback, useEffect, useRef, createElement } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Project } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Khoảng thời gian cho phép hoàn tác trước khi thực sự xóa khỏi database.
const UNDO_WINDOW_MS = 6000;

const sortByCreatedDesc = (a: Project, b: Project) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

export function useProjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Các lệnh xóa đang chờ (chưa chạm database) — dùng để hoàn tác.
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: unknown) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
    }
  }, [user, fetchProjects]);

  // Khi unmount: hủy mọi lệnh xóa đang chờ (an toàn — dự án sẽ được giữ lại).
  useEffect(() => {
    const timers = pendingDeletes.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const createProject = async (name: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setProjects(prev => [data, ...prev]);
      return data;
    } catch (err: unknown) {
      console.error('Error creating project:', err);
      toast({
        title: "Lỗi",
        description: "Không thể tạo dự án mới.",
        variant: "destructive"
      });
      return null;
    }
  };

  const renameProject = async (id: string, newName: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: newName })
        .eq('id', id);

      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
      return true;
    } catch (err: unknown) {
      console.error('Error renaming project:', err);
      toast({
        title: "Lỗi",
        description: "Không thể đổi tên dự án.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Thực sự xóa khỏi database (chạy sau khi hết thời gian hoàn tác).
  const commitDelete = useCallback(async (id: string) => {
    pendingDeletes.current.delete(id);
    try {
      // Bỏ liên kết project_id trong saved_geometries trước (acts as manual ON DELETE SET NULL)
      await supabase
        .from('saved_geometries')
        .update({ project_id: null })
        .eq('project_id', id);

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: unknown) {
      console.error('Error deleting project:', err);
      // Xóa thất bại — khôi phục lại danh sách từ database.
      fetchProjects();
      toast({
        title: "Lỗi",
        description: "Không thể xóa dự án.",
        variant: "destructive"
      });
    }
  }, [fetchProjects, toast]);

  const deleteProject = useCallback((id: string) => {
    if (!user) return;

    const project = projects.find(p => p.id === id);
    if (!project) return;

    // Gỡ khỏi UI ngay lập tức, nhưng hoãn việc xóa khỏi database.
    setProjects(prev => prev.filter(p => p.id !== id));

    const timer = setTimeout(() => commitDelete(id), UNDO_WINDOW_MS);
    pendingDeletes.current.set(id, timer);

    const { dismiss } = toast({
      title: `Đã xóa dự án "${project.name}"`,
      description: "Bạn có thể hoàn tác trong giây lát.",
      duration: UNDO_WINDOW_MS,
      action: createElement(
        ToastAction,
        {
          altText: "Hoàn tác",
          onClick: () => {
            const pending = pendingDeletes.current.get(id);
            if (pending) {
              clearTimeout(pending);
              pendingDeletes.current.delete(id);
            }
            // Đưa dự án trở lại danh sách (nếu chưa có).
            setProjects(prev =>
              prev.some(p => p.id === id) ? prev : [...prev, project].sort(sortByCreatedDesc)
            );
            dismiss();
          },
        },
        "Hoàn tác"
      ),
    });
  }, [user, projects, commitDelete, toast]);

  return {
    projects,
    isLoading,
    fetchProjects,
    createProject,
    renameProject,
    deleteProject
  };
}
