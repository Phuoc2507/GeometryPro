import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GeometryData } from '@/types/geometry';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface HistoryItem {
  id: string;
  name: string;
  prompt: string | null;
  geometry_data: GeometryData;
  created_at: string;
  project_id?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Ghi mảng lịch sử vô danh vào localStorage; nếu TRÀN (QuotaExceededError) thì tự BỎ BỚT
// mục cũ nhất (cuối mảng) rồi thử lại, luôn cố giữ mục cần bảo vệ. Trả false nếu chịu thua.
function persistLocalHistory(items: HistoryItem[], protectId?: string): boolean {
  let toStore = items.slice(0, 50);
  while (toStore.length >= 1) {
    try {
      localStorage.setItem('geo3d_anonymous_history', JSON.stringify(toStore));
      return true;
    } catch {
      if (toStore.length === 1) return false;
      let idx = toStore.length - 1;                                   // mục cũ nhất
      if (protectId && toStore[idx]?.id === protectId) idx = toStore.length - 2; // đừng bỏ mục đang giữ
      toStore = toStore.filter((_, i) => i !== idx);
    }
  }
  return false;
}

function parseLocalHistory(raw: string | null): HistoryItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is HistoryItem => (
      isRecord(item)
      && typeof item.id === 'string'
      && typeof item.name === 'string'
      && isRecord(item.geometry_data)
    ));
  } catch {
    return [];
  }
}

export function useGeometryHistory() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSupabaseError = useCallback(async (err: unknown, context: string) => {
    console.error(`Error ${context}:`, err);
    // 42501 = RLS/insufficient_privilege (lỗi QUYỀN dữ liệu, KHÔNG phải hết phiên) -> KHÔNG đăng xuất.
    const errorRecord = isRecord(err) ? err : {};
    const looksAuth = errorRecord.status === 401
      || (typeof errorRecord.message === 'string' && errorRecord.message.includes('JWT'));
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
          setHistory(parseLocalHistory(local));
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
      setHistory((data as unknown as HistoryItem[]) || []);
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
        const prev = parseLocalHistory(local);
        // Mục Advance có thể lớn → localStorage (~5MB) có thể TRÀN; persistLocalHistory bỏ bớt
        // mục cũ nhất để mục MỚI luôn lưu được (giữ newItem.id).
        if (!persistLocalHistory([newItem, ...prev], newItem.id)) {
          // Không nuốt im lặng: báo rõ để học sinh biết bài chưa được lưu (tránh reload là mất).
          toast({
            title: 'Bộ nhớ trình duyệt đã đầy',
            description: 'Chưa lưu được bài này. Hãy đăng nhập để lưu trên đám mây, khỏi lo mất.',
            variant: 'destructive',
          });
          return null;
        }
        triggerSync();
        return newItem.id;
      }

      const { data, error } = await supabase
        .from('saved_geometries')
        .insert({
          user_id: user.id,
          name: prompt ? `${prompt.substring(0, 40)}${prompt.length > 40 ? '…' : ''}` : 'Bản vẽ thủ công',
          prompt,
          geometry_data: geometry as unknown as Json,
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
  }, [user, handleSupabaseError, toast]);

  // Cập nhật geometry_data của một bản đã lưu (dùng để lưu KÈM lời giải + điểm dựng).
  const updateGeometryData = useCallback(async (id: string, geometry: GeometryData) => {
    if (!id) return;
    try {
      if (!user) {
        const local = localStorage.getItem('geo3d_anonymous_history');
        if (local) {
          const prev = parseLocalHistory(local);
          const newHistory = prev.map((item) => item.id === id ? { ...item, geometry_data: geometry } : item);
          // Đây là đường GROWTH (lưu KÈM lời giải + điểm dựng) → dễ tràn nhất. Không nuốt lỗi:
          // nếu không lưu được thì báo rõ để người dùng biết (thay vì mất im lặng khi reload).
          if (persistLocalHistory(newHistory, id)) {
            triggerSync();
          } else {
            toast({
              title: 'Bộ nhớ trình duyệt đã đầy',
              description: 'Không lưu được lời giải/điểm dựng cho bản vẽ này. Hãy đăng nhập để lưu trên đám mây.',
              variant: 'destructive',
            });
          }
        }
        return;
      }
      const { error } = await supabase
        .from('saved_geometries')
        .update({ geometry_data: geometry as unknown as Json })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      triggerSync();
    } catch (err) {
      handleSupabaseError(err, 'updating geometry data');
    }
  }, [user, handleSupabaseError, toast]);

  const deleteHistoryItem = useCallback(async (id: string) => {
    try {
      if (!user) {
        const local = localStorage.getItem('geo3d_anonymous_history');
        if (local) {
          const prev = parseLocalHistory(local);
          const newHistory = prev.filter((item) => item.id !== id);
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
          const prev = parseLocalHistory(local);
          const newHistory = prev.map((item) => item.id === id ? { ...item, name: newName } : item);
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
          const prev = parseLocalHistory(local);
          const newHistory = prev.map((item) => item.id === id ? { ...item, project_id } : item);
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
