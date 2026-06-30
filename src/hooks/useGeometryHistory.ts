import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GeometryData } from '@/types/geometry';

export interface HistoryItem {
  id: string;
  name: string;
  prompt: string | null;
  geometry_data: GeometryData;
  created_at: string;
}

export function useGeometryHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        .select('id, name, prompt, geometry_data, created_at')
        .eq('user_id', user.id)
        .eq('is_history', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory((data || []).map(item => ({
        ...item,
        geometry_data: item.geometry_data as unknown as GeometryData,
      })));
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addToHistory = useCallback(async (geometry: GeometryData, prompt?: string) => {
    try {
      if (!user) {
        const newItem: HistoryItem = {
          id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: geometry.name || 'Hình không tên',
          prompt: prompt || null,
          geometry_data: JSON.parse(JSON.stringify(geometry)),
          created_at: new Date().toISOString(),
        };
        setHistory(prev => {
          const newHistory = [newItem, ...prev].slice(0, 20);
          localStorage.setItem('geo3d_anonymous_history', JSON.stringify(newHistory));
          return newHistory;
        });
        return;
      }

      const { data, error } = await supabase
        .from('saved_geometries')
        .insert([{
          user_id: user.id,
          name: geometry.name || 'Hình không tên',
          prompt: prompt || null,
          geometry_data: JSON.parse(JSON.stringify(geometry)),
          is_history: true,
          is_public: false,
        }])
        .select('id, name, prompt, geometry_data, created_at')
        .single();

      if (error) throw error;
      if (data) {
        setHistory(prev => [{
          ...data,
          geometry_data: data.geometry_data as unknown as GeometryData,
        }, ...prev].slice(0, 20));
      }
    } catch (err) {
      console.error('Error saving to history:', err);
    }
  }, [user]);

  const deleteHistoryItem = useCallback(async (id: string) => {
    try {
      if (!user) {
        setHistory(prev => {
          const newHistory = prev.filter(h => h.id !== id);
          localStorage.setItem('geo3d_anonymous_history', JSON.stringify(newHistory));
          return newHistory;
        });
        return;
      }

      const { error } = await supabase
        .from('saved_geometries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Error deleting history item:', err);
    }
  }, [user]);

  const clearHistory = useCallback(async () => {
    try {
      if (!user) {
        localStorage.removeItem('geo3d_anonymous_history');
        setHistory([]);
        return;
      }

      const { error } = await supabase
        .from('saved_geometries')
        .delete()
        .eq('user_id', user.id)
        .eq('is_history', true);
      if (error) throw error;
      setHistory([]);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [user, fetchHistory]);

  return { history, isLoading, addToHistory, deleteHistoryItem, clearHistory, fetchHistory };
}
