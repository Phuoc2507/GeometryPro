import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GeometryData } from '@/types/geometry';
import { toast } from '@/hooks/use-toast';

export interface SavedGeometry {
  id: string;
  user_id: string;
  name: string;
  geometry_data: GeometryData;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  project_id?: string | null;
}

export function useSavedGeometries() {
  const { user } = useAuth();
  const [savedGeometries, setSavedGeometries] = useState<SavedGeometry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGeometries = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_geometries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_history', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setSavedGeometries((data || []).map(item => ({
        ...item,
        geometry_data: item.geometry_data as unknown as GeometryData,
      })));
    } catch (error) {
      console.error('Error fetching geometries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveGeometry = useCallback(async (name: string, geometry: GeometryData, isPublic = false) => {
    if (!user) {
      toast({
        title: "Chưa đăng nhập",
        description: "Vui lòng đăng nhập để lưu hình",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('saved_geometries')
        .insert([{
          user_id: user.id,
          name,
          geometry_data: JSON.parse(JSON.stringify(geometry)),
          is_public: isPublic,
        }])
        .select()
        .single();

      if (error) throw error;

      const newGeometry: SavedGeometry = {
        ...data,
        geometry_data: data.geometry_data as unknown as GeometryData,
      };
      
      setSavedGeometries(prev => [newGeometry, ...prev]);
      
      toast({
        title: "Đã lưu!",
        description: `Hình "${name}" đã được lưu thành công`,
      });
      
      return newGeometry;
    } catch (error) {
      console.error('Error saving geometry:', error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu hình",
        variant: "destructive",
      });
      return null;
    }
  }, [user]);

  const updateGeometry = useCallback(async (id: string, updates: Partial<Pick<SavedGeometry, 'name' | 'is_public'>>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_geometries')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedGeometries(prev => 
        prev.map(g => g.id === id ? { ...g, ...updates } : g)
      );

      toast({
        title: "Đã cập nhật!",
        description: "Hình đã được cập nhật",
      });

      return true;
    } catch (error) {
      console.error('Error updating geometry:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật hình",
        variant: "destructive",
      });
      return false;
    }
  }, [user]);

  const deleteGeometry = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_geometries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedGeometries(prev => prev.filter(g => g.id !== id));

      toast({
        title: "Đã xóa!",
        description: "Hình đã được xóa",
      });

      return true;
    } catch (error) {
      console.error('Error deleting geometry:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa hình",
        variant: "destructive",
      });
      return false;
    }
  }, [user]);

  const moveToProject = useCallback(async (id: string, project_id: string | null) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('saved_geometries')
        .update({ project_id })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setSavedGeometries(prev => prev.map(item => 
        item.id === id ? { ...item, project_id } : item
      ));
      
      return true;
    } catch (error) {
      console.error('Error moving to project:', error);
      toast({
        title: "Lỗi",
        description: "Không thể di chuyển hình vào dự án",
        variant: "destructive",
      });
      return false;
    }
  }, [user]);

  return {
    savedGeometries,
    isLoading,
    fetchGeometries,
    saveGeometry,
    updateGeometry,
    deleteGeometry,
    moveToProject,
  };
}
