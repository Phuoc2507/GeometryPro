/**
 * GeometryPreview — render HÌNH 3D THẬT từ một GeometryData bất kỳ.
 *
 * Dùng ở trang quản trị để admin xem ngay bản vẽ kèm feedback (thay vì đọc JSON).
 * Bọc provider RIÊNG (Geometry + Camera) để cô lập hoàn toàn khỏi trang admin,
 * nạp hình qua loadGeometry({ silent }) — đúng cách SharedView làm — rồi để
 * GeometryCanvas lo phần vẽ. Bọc thêm ErrorBoundary: dữ liệu hỏng → hiện fallback
 * (thường là JSON) thay vì làm vỡ cả dialog.
 */
import { useEffect, type ReactNode } from 'react';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { CameraProvider } from '@/context/CameraContext';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { GeometryData } from '@/types/geometry';
import { cn } from '@/lib/utils';

// Nạp hình vào provider cục bộ (im lặng: không toast, không animation dựng hình).
function FigureLoader({ geometry }: { geometry: GeometryData }) {
  const ctx = useGeometryOptional();
  useEffect(() => {
    ctx?.loadGeometry(geometry, { silent: true });
  }, [ctx, geometry]);
  return null;
}

interface GeometryPreviewProps {
  geometry: GeometryData;
  /** Cao khung xem (mặc định h-72). Truyền class khác để đổi kích thước. */
  className?: string;
  /** Hiện khi render lỗi (vd dữ liệu hỏng) — thường truyền JSON để admin vẫn đọc được. */
  fallback?: ReactNode;
}

export function GeometryPreview({ geometry, className, fallback }: GeometryPreviewProps) {
  return (
    <ErrorBoundary fallback={fallback ?? <PreviewError />}>
      <GeometryProvider>
        <CameraProvider>
          <FigureLoader geometry={geometry} />
          {/* relative + chiều cao cố định: GeometryCanvas vẽ ở absolute inset-0. */}
          <div className={cn('relative h-72 w-full overflow-hidden rounded-md border border-border/60 bg-background/40', className)}>
            <GeometryCanvas />
          </div>
        </CameraProvider>
      </GeometryProvider>
    </ErrorBoundary>
  );
}

function PreviewError() {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-destructive/20 bg-destructive/[0.03] px-4 text-center text-xs text-muted-foreground">
      Không dựng được hình từ dữ liệu này.
    </div>
  );
}
