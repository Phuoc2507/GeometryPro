import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GeometryData } from '@/types/geometry';
import { useToast } from '@/hooks/use-toast';

export interface HistoryItem {
  id: string;
  name: string;
  prompt: string | null;
  geometry_data: GeometryData;
  created_at: string;
  project_id?: string | null;
}

export function useGeometryHistory() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSupabaseError = useCallback(async (err: any, context: string) => {
    console.error(`Error ${context}:`, err);
    // 42501 = RLS/insufficient_privilege (lỗi QUYỀN dữ liệu, KHÔNG phải hết phiên) -> KHÔNG đăng xuất.
    const looksAuth = err?.status === 401 || (typeof err?.message === 'string' && err.message.includes('JWT'));
    if (!looksAuth) return;
    // Access token có thể chỉ HẾT HẠN TẠM và refresh được — thử refresh trước, chỉ đăng xuất khi refresh thất bại.
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data?.session) return; // refresh OK -> giữ phiên, không phiền người dùng
    } catch { /* refresh lỗi -> rơi xuống đăng xuất */ }
    toast({
      title: "Phiên đăng nhập đã hết hạn",
      description: "Vui lòng đăng nhập lại để tiếp tục lưu lịch sử.",
      variant: "destructive"
    });
    signOut();
  }, [signOut, toast]);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!user) {
        const local = localStorage.getItem('geo3d_anonymous_history');
        if (local) {
          setHistory(JSON.parse(local));
        } else {
          setHistory([]);
        }
        return;
      }

      const { data, error } = await supabase
        .from('saved_geometries')
        .select('id, name, prompt, geometry_data, created_at, project_id')
        .eq('user_id', user.id)
        .eq('is_history', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data as HistoryItem[] || []);
    } catch (err) {
      handleSupabaseError(err, 'fetching history');
    } finally {
      setIsLoading(false);
    }
  }, [user, handleSupabaseError]);

  useEffect(() => {
    fetchHistory();
    
    // Listen for custom event to sync state across hook instances
    const handleHistorySync = () => {
      fetchHistory();
    };
    window.addEventListener('geo3d_history_sync', handleHistorySync);
    return () => window.removeEventListener('geo3d_history_sync', handleHistorySync);
  }, [fetchHistory]);

  const triggerSync = () => {
    window.dispatchEvent(new Event('geo3d_history_sync'));
  };

  const addToHistory = useCallback(async (geometry: GeometryData, prompt: string | null = null, project_id: string | null = null) => {
    try {
      if (!user) {
        const newItem: HistoryItem = {
          id: crypto.randomUUID(),
          name: prompt ? `${prompt.substring(0, 40)}${prompt.length > 40 ? '…' : ''}` : 'Bản vẽ thủ công',
          prompt,
          geometry_data: geometry,
          created_at: new Date().toISOString(),
          project_id
        };
        const local = localStorage.getItem('geo3d_anonymous_history');
        const prev = local ? JSON.parse(local) : [];
        // Mục Advance có thể lớn → localStorage (~5MB) có thể TRÀN. Trước đây QuotaExceededError bị
        // nuốt (handleSupabaseError chỉ xử lỗi auth) ⇒ mục mới im lặng KHÔNG lưu, "chạy xong mất tiêu".
        // Giờ: nếu tràn thì BỎ BỚT mục CŨ NHẤT (cuối mảng) rồi thử lại, để mục MỚI luôn lưu được.
        let toStore = [newItem, ...prev].slice(0, 50);
        let saved = false;
        while (toStore.length >= 1) {
          try {
            localStorage.setItem('geo3d_anonymous_history', JSON.stringify(toStore));
            saved = true;
            break;
          } catch {
            if (toStore.length === 1) break;   // 1 mục vẫn tràn → chịu
            toStore = toStore.slice(0, Math.max(1, toStore.length - Math.ceil(toStore.length / 4)));
          }
        }
        if (!saved) return null;
        triggerSync();
        return newItem.id;
      }

      const { data, error } = await supabase
        .from('saved_geometries')
        .insert({
          user_id: user.id,
          name: prompt ? `${prompt.substring(0, 40)}${prompt.length > 40 ? '…' : ''}` : 'Bản vẽ thủ công',
          prompt,
          geometry_data: geometry as any,
          is_history: true,
          project_id
        })
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        triggerSync();
        return data.id;
      }
    } catch (err) {
      handleSupabaseError(err, 'saving history');
    }
    return null;
  }, [user, handleSupabaseError]);

  // Cập nhật geometry_data của một bản đã lưu (dùng để lưu KÈM lời giải + điểm dựng).
  const updateGeometryData = useCallback(async (id: string, geometry: GeometryData) => {
    if (!id) return;
    try {
      if (!user) {
        const local = localStorage.getItem('geo3d_anonymous_history');
        if (local) {
          const prev = JSON.parse(local);
          const newHistory = prev.map((h: any) => h.id === id ? { ...h, geometry_data: geometry } : h);
          localStorage.setItem('geo3d_anonymous_history', JSON.stringify(newHistory));
          triggerSync();
        }
        return;
      }
      const { error } = await supabase
        .from('saved_geometries')
        .update({ geometry_data: geometry as any })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      triggerSync();
    } catch (err) {
      handleSupabaseError(err, 'updating geometry data');
    }
  }, [user, handleSupabaseError]);

  const deleteHistoryItem = useCallback(async (id: string) => {
    try {
      if (!user) {
        const local = localStorage.getItem('geo3d_anonymous_history');
        if (local) {
          const prev = JSON.parse(local);
          const newHistory = prev.filter((h: any) => h.id !== id);
          localStorage.setItem('geo3d_anonymous_history', JSON.stringify(newHistory));
          triggerSync();
        }
        return;
      }

      const { error } = await supabase
        .from('saved_geometries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      triggerSync();
    } catch (err) {
      handleSupabaseError(err, 'deleting history item');
    }
  }, [user, handleSupabaseError]);

  const clearHistory = useCallback(async () => {
    try {
      if (!user) {
        localStorage.removeItem('geo3d_anonymous_history');
        triggerSync();
        return;
      }

      const { error } = await supabase
        .from('saved_geometries')
        .delete()
        .eq('user_id', user.id)
        .eq('is_history', true);
      if (error) throw error;
      triggerSync();
    } catch (err) {
      handleSupabaseError(err, 'clearing history');
    }
  }, [user, handleSupabaseError]);

  const renameHistoryItem = useCallback(async (id: string, newName: string) => {
    try {
      if (!user) {
        const local = localStorage.getItem('geo3d_anonymous_history');
        if (local) {
          const prev = JSON.parse(local);
          const newHistory = prev.map((h: any) => h.id === id ? { ...h, name: newName } : h);
          localStorage.setItem('geo3d_anonymous_history', JSON.stringify(newHistory));
          triggerSync();
        }
        return;
      }
      
      const { error } = await supabase
        .from('saved_geometries')
        .update({ name: newName })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      triggerSync();
    } catch (err) {
      handleSupabaseError(err, 'renaming history item');
    }
  }, [user, handleSupabaseError]);

  const moveToProject = useCallback(async (id: string, project_id: string | null) => {
    try {
      if (!user) {
        const local = localStorage.getItem('geo3d_anonymous_history');
        if (local) {
          const prev = JSON.parse(local);
          const newHistory = prev.map((h: any) => h.id === id ? { ...h, project_id } : h);
          localStorage.setItem('geo3d_anonymous_history', JSON.stringify(newHistory));
          triggerSync();
        }
        return;
      }
      
      const { error } = await supabase
        .from('saved_geometries')
        .update({ project_id })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      triggerSync();
    } catch (err) {
      handleSupabaseError(err, 'moving history item to project');
    }
  }, [user, handleSupabaseError]);

  return {
    history, isLoading, fetchHistory, addToHistory, updateGeometryData,
    deleteHistoryItem, clearHistory, renameHistoryItem, moveToProject
  };
}
