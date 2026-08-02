/**
 * StudentRightPanel — panel phải RIÊNG cho chế độ Học sinh (/student).
 *
 * Tách khỏi RightPanel (Giáo viên) để hai bên sửa độc lập. Học sinh chỉ cần 2 tab:
 *   • Giải bài  (SolverContent)      — mặc định mở
 *   • Thuộc tính (GeometryPropertiesTab, dùng chung với Giáo viên)
 * KHÔNG có tab "Xuất" (xuất ảnh/LaTeX là việc của giáo viên).
 *
 * Đây là nơi sẽ tinh chỉnh trải nghiệm học sinh về sau (ẩn/hiện đáp số, xem tất cả bước,
 * gợi ý/ vì sao, ...). Vỏ panel (thu gọn + kéo rộng + sheet mobile) sao y RightPanel.
 */
import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Box, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional } from '@/context/CameraContext';
import { computeProperties, isAnalysisFigure } from '@/lib/geometry/calculations';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SolverContent, ResizeHandle } from '@/components/SolverPanel';
import { GeometryPropertiesTab } from './GeometryPropertiesTab';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { TierBanner } from './TierBanner';

function StudentPanelContent({ compact }: { compact?: boolean } = {}) {
  const [activeTab, setActiveTab] = useState('problem');
  const context = useGeometryOptional();

  const properties = useMemo(() => {
    if (!context?.state.geometry) return null;
    return computeProperties(context.state.geometry);
  }, [context?.state.geometry]);

  if (!context) return null;
  const { state } = context;

  if (!state.geometry) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40">
          <Sparkles className="w-8 h-8 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground/80">Chưa có hình nào</p>
          <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
            Nhập đề ở khung chính để vẽ hình, rồi nhấn <strong>Giải bài</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Bản GỌN (mobile): CHỈ lời giải từng bước — bỏ tab Thuộc tính + bỏ đáp số/tự chấm.
  if (compact) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <SolverContent compact />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header — ẩn ở bản gọn (mobile) vì trùng tiêu đề, để chừa chỗ cho hình */}
      {!compact && (
        <div className="p-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">{state.geometry.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {/* Cảnh giải tích: chỉ hiện loại hình, bỏ "N đỉnh • N cạnh" (điểm mẫu đường sinh không phải đỉnh). */}
            {properties?.shapeType || 'Geometry'}
            {!isAnalysisFigure(state.geometry) && ` • ${state.geometry.points.length} đỉnh • ${state.geometry.lines.length} cạnh`}
          </p>
        </div>
      )}

      {/* Tabs — chỉ Giải bài + Thuộc tính */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className={cn('mx-4 grid w-auto grid-cols-2', compact ? 'mt-2' : 'mt-4')}>
          <TabsTrigger value="problem" className="gap-1.5 text-xs px-1">
            <Sparkles className="w-3 h-3" />
            Giải bài
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-1.5 text-xs px-1">
            <Box className="w-3 h-3" />
            Thuộc tính
          </TabsTrigger>
        </TabsList>

        <TabsContent value="problem" className="flex-1 p-0 m-0 min-h-0 data-[state=active]:flex flex-col">
          <SolverContent compact={compact} />
        </TabsContent>

        <TabsContent value="properties" className="flex-1 overflow-hidden p-0 min-h-0 data-[state=active]:flex flex-col">
          <GeometryPropertiesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Bản mobile — panel DƯỚI tự dựng (KHÔNG overlay tối) nên hình phía trên vẫn
// sáng và xoay/chụm được khi panel đang mở → xem hình + lời giải song song.
export function MobileStudentRightPanel() {
  const context = useGeometryOptional();
  const camera = useCameraOptional();
  const [open, setOpen] = useState(false);

  // Báo cho camera biết đáy màn bị panel che ~48% → camera nhắm lệch lên.
  const setBottomInset = camera?.setBottomInset;
  useEffect(() => {
    setBottomInset?.(open ? 0.44 : 0);
    return () => setBottomInset?.(0);
  }, [open, setBottomInset]);

  if (!context) return null;
  const { state } = context;
  if (!state.geometry) return null;

  return (
    <>
      {/* Nút mở — ẩn khi panel đang mở */}
      {!open && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mở bảng giải bài"
          onClick={() => setOpen(true)}
          className="fixed top-4 right-4 z-50 lg:hidden glass border border-border/50"
        >
          <Sparkles className="w-5 h-5" />
        </Button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden h-[44vh] flex flex-col glass bg-background/95 border-t border-border/50 rounded-t-2xl shadow-2xl animate-fade-in">
          {/* Tay nắm + nút đóng */}
          <div className="relative shrink-0">
            <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-border/70" />
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng bảng giải bài"
              className="absolute right-2.5 top-1.5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ErrorBoundary>
              <StudentPanelContent compact />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </>
  );
}

export function StudentRightPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const context = useGeometryOptional();
  const { onPointerDown, reset } = useResizableWidth({ cssVar: '--rp-w', storageKey: 'right_panel_w', def: 320, min: 280, max: 720 });

  if (!context) return null;
  const { state } = context;

  return (
    <div className="relative h-screen hidden lg:flex z-40 shrink-0">
      {/* Nút thu gọn/mở */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ẩn/hiện bảng bên phải"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ right: isCollapsed ? 0 : 'var(--rp-w, 20rem)' }}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full glass border border-border/50 z-50 h-7 w-7 bg-background shadow-sm flex items-center justify-center",
          "transition-all duration-150 hover:scale-110 hover:bg-secondary hover:border-primary/60 hover:shadow-md hover:[&_svg]:text-primary",
          // neo theo `right:` nên chiều translate PHẢI ngược với panel trái → căn tâm đúng mép panel
          isCollapsed ? "-translate-x-1/2" : "translate-x-1/2"
        )}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </Button>

      <aside
        style={{ width: isCollapsed ? 0 : 'var(--rp-w, 20rem)' }}
        className={cn(
          "h-full flex flex-col glass border-l border-border/50 sticky right-0 top-0 bg-background/95 overflow-hidden",
          isCollapsed && "border-none"
        )}
      >
        {!isCollapsed && <ResizeHandle onPointerDown={onPointerDown} onReset={reset} />}
        <div style={{ width: 'var(--rp-w, 20rem)' }} className="h-full flex flex-col relative">
          <TierBanner classification={state.geometry?.classification} />
          <ErrorBoundary>
            <StudentPanelContent />
          </ErrorBoundary>
        </div>
      </aside>
    </div>
  );
}
