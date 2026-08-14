/**
 * TestResultView — route /admin/test-view/:id
 *
 * Mở một KẾT QUẢ test API key trong tab mới (giống mở link share), nhưng đọc hình
 * từ localStorage (key `geo3d:test-result:<id>`) do TestApiKeyTab ghi trước khi mở tab.
 * Chỉ để admin xem nhanh hình mà một api key vẽ ra — không lưu DB, không public.
 */
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { CameraProvider } from '@/context/CameraContext';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Wordmark } from '@/components/Brand';
import { GeometryData } from '@/types/geometry';

const STORE_PREFIX = 'geo3d:test-result:';

/** Đảm bảo tối thiểu các mảng để render không crash (entry cũ có thể là geometry thô). */
function safeGeometry(g: GeometryData): GeometryData {
  return { ...g, points: Array.isArray(g?.points) ? g.points : [], lines: Array.isArray(g?.lines) ? g.lines : [] };
}

function FigureLoader({ geometry }: { geometry: GeometryData }) {
  const ctx = useGeometryOptional();
  useEffect(() => {
    ctx?.loadGeometry(safeGeometry(geometry), { silent: true });
  }, [ctx, geometry]);
  return null;
}

export default function TestResultView() {
  const { id } = useParams<{ id: string }>();

  const { payload, error } = useMemo(() => {
    if (!id) return { payload: null, error: 'Thiếu mã kết quả.' };
    try {
      const raw = localStorage.getItem(STORE_PREFIX + id);
      if (!raw) return { payload: null, error: 'Không tìm thấy kết quả (có thể đã bị xoá hoặc mở ở trình duyệt khác).' };
      return { payload: JSON.parse(raw) as { name?: string; keyName?: string; geometry: GeometryData }, error: null };
    } catch {
      return { payload: null, error: 'Dữ liệu kết quả hỏng.' };
    }
  }, [id]);

  if (error || !payload?.geometry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-center px-6">
        <AlertTriangle className="w-10 h-10 text-amber-500/70" />
        <p className="text-sm text-muted-foreground max-w-sm">{error || 'Không có hình để hiển thị.'}</p>
      </div>
    );
  }

  return (
    <GeometryProvider>
      <CameraProvider>
        <div className="relative h-screen w-full bg-background overflow-hidden">
          <FigureLoader geometry={payload.geometry} />
          <ErrorBoundary>
            <GeometryCanvas />
          </ErrorBoundary>
          {/* Nhãn góc: tên bài + tên api key đã vẽ */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
            <Wordmark className="h-5 opacity-80" />
            {payload.keyName && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 w-fit">
                {payload.keyName}
              </span>
            )}
            {payload.name && (
              <span className="text-[11px] text-muted-foreground max-w-[70vw] line-clamp-2">{payload.name}</span>
            )}
          </div>
        </div>
      </CameraProvider>
    </GeometryProvider>
  );
}
