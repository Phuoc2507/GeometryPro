import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { GeometryData } from '@/types/geometry';

const LAST_MODE_KEY = 'geo3d:last-mode';
type Mode = 'student' | 'teacher';

interface RecentDrawing {
  name: string;
  geometry_data: GeometryData;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Đọc bản vẽ gần nhất của khách từ localStorage (khi chưa đăng nhập). */
function readLocalRecent(): RecentDrawing | null {
  try {
    const raw = localStorage.getItem('geo3d_anonymous_history');
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const first = parsed[0];
    if (!isRecord(first) || !isRecord(first.geometry_data)) return null;
    return {
      name: typeof first.name === 'string' && first.name ? first.name : 'Bản vẽ gần nhất',
      geometry_data: first.geometry_data as unknown as GeometryData,
    };
  } catch {
    return null;
  }
}

/**
 * Thẻ "Chào mừng trở lại" trên landing.
 * - Đã đăng nhập: chào theo tên + nút tiếp tục chế độ gần nhất + mở nhanh bản vẽ mới nhất.
 * - Khách có chế độ gần nhất: link tiếp tục nhẹ nhàng (giữ hành vi cũ).
 */
export function ResumeCard() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<RecentDrawing | null>(null);

  const lastMode = (typeof window !== 'undefined' ? localStorage.getItem(LAST_MODE_KEY) : null) as Mode | null;
  const mode: Mode = lastMode ?? 'teacher';
  const modeLabel = mode === 'student' ? 'Học sinh' : 'Giáo viên';

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRecent(readLocalRecent());
      return;
    }

    // Bản vẽ mới nhất của tài khoản (mở lại nhanh mà không cần vào trang "Hình đã lưu").
    (async () => {
      const { data, error } = await supabase
        .from('saved_geometries')
        .select('name, geometry_data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setRecent({
        name: data.name ?? 'Bản vẽ gần nhất',
        geometry_data: data.geometry_data as unknown as GeometryData,
      });
    })();

    return () => { cancelled = true; };
  }, [user]);

  const resume = () => {
    localStorage.setItem(LAST_MODE_KEY, mode);
    navigate(`/${mode}`);
  };

  const openRecent = () => {
    if (!recent) return;
    localStorage.setItem(LAST_MODE_KEY, mode);
    navigate(`/${mode}`, { state: { loadGeometry: recent.geometry_data } });
  };

  // Chờ biết trạng thái đăng nhập để tránh nhấp nháy.
  if (isLoading) return null;

  // Khách chưa từng vào mode nào và cũng không đăng nhập → không hiện gì.
  if (!user && !lastMode) return null;

  // Khách (chưa đăng nhập) nhưng đã từng vào mode → link tiếp tục nhẹ nhàng.
  if (!user) {
    return (
      <button onClick={resume} className="mt-5 block text-sm text-primary hover:underline">
        Tiếp tục với chế độ {modeLabel} →
      </button>
    );
  }

  const name = profile?.display_name?.trim() || user.email?.split('@')[0] || null;

  return (
    <div className="mt-6 glass rounded-xl border border-primary/30 p-4">
      {/* Lời chào — full-width, không bị nút ép thành cột hẹp */}
      <p className="text-sm font-semibold">
        Chào mừng trở lại{name ? `, ` : ''}
        {name && <span className="text-primary">{name}</span>} <span aria-hidden>👋</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {recent
          ? <>Mở lại bản vẽ gần nhất hoặc tiếp tục chế độ {modeLabel}.</>
          : <>Tiếp tục ngay với chế độ {modeLabel}.</>}
      </p>

      {/* Nút xếp hàng bên dưới, tự xuống dòng khi hẹp */}
      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={resume} className="gap-1.5 transition-transform hover:-translate-y-0.5">
          <Play className="w-4 h-4" /> Tiếp tục {modeLabel}
        </Button>
        {recent && (
          <Button size="sm" variant="outline" onClick={openRecent} className="gap-1.5 min-w-0 max-w-full transition-transform hover:-translate-y-0.5">
            <History className="w-4 h-4 shrink-0" />
            <span className="truncate">Mở “{recent.name}”</span>
          </Button>
        )}
      </div>
    </div>
  );
}
