import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Project } from '@/types/project';
import { useToast } from '@/hooks/use-toast';

export function useProjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      console.error('Error renaming project:', err);
      toast({
        title: "Lỗi",
        description: "Không thể đổi tên dự án.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return false;
    try {
      // Bỏ liên kết project_id trong saved_geometries trước (hoặc dựa vào ON DELETE SET NULL trong DB)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting project:', err);
      toast({
        title: "Lỗi",
        description: "Không thể xóa dự án.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    projects,
    isLoading,
    fetchProjects,
    createProject,
    renameProject,
    deleteProject
  };
}
