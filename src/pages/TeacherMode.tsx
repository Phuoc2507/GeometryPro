import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { CameraProvider } from '@/context/CameraContext';
import { LeftSidebar, MobileSidebar } from '@/components/layout/LeftSidebar';
import { RightPanel, MobileRightPanel } from '@/components/layout/RightPanel';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { DropZone } from '@/components/DropZone';
import { ScanningOverlay } from '@/components/ScanningOverlay';
import { FloatingPromptBar } from '@/components/FloatingPromptBar';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { TimelinePlayer } from '@/components/layout/TimelinePlayer';
import { AdvanceStepper } from '@/components/layout/AdvanceStepper';
import { AdvanceSolutionPanel } from '@/components/AdvanceSolutionPanel';
import { VideoExportPanel } from '@/components/layout/VideoExportPanel';
import { GeometryData } from '@/types/geometry';

interface LocalHistoryItem {
  id: string;
  geometry_data: GeometryData;
}

// ─── Geometry loader (same as Index) ─────────────────────────────────────────

function GeometryLoader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useGeometryOptional();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!context || hasLoaded.current) return;
    
    const state = location.state as { loadGeometry?: GeometryData } | null;
    const urlId = searchParams.get('id');

    const loadFromId = async (id: string) => {
      try {
        // Lịch sử vô danh (id có thể là UUID hoặc "local_..."): thử localStorage trước.
        const localStr = localStorage.getItem('geo3d_anonymous_history');
        if (localStr) {
          const history = JSON.parse(localStr) as LocalHistoryItem[];
          const item = history.find((entry) => entry.id === id);
          if (item) {
            hasLoaded.current = true;
            context.loadGeometry(item.geometry_data as unknown as GeometryData);
            return;
          }
        }

        const { data, error } = await supabase
          .from('saved_geometries')
          .select('geometry_data')
          .eq('id', id)
          .single();
        if (!error && data) {
          hasLoaded.current = true;
          context.loadGeometry(data.geometry_data as unknown as GeometryData);
        }
      } catch (err) {
        console.error("Failed to load geometry from URL:", err);
      }
    };

    if (state?.loadGeometry) {
      hasLoaded.current = true;
      context.loadGeometry(state.loadGeometry);
      navigate('/teacher', { replace: true, state: {} });
    } else if (urlId) {
      loadFromId(urlId);
    }
  }, [location.state, searchParams, context, navigate]);

  return null;
}

function TimelineContainer() {
  const context = useGeometryOptional();
  if (context?.state.geometry && !context.state.manualMode && context.state.videoMode) {
    return <TimelinePlayer />;
  }
  return null;
}

const TeacherMode = () => {
  const context = useGeometryOptional(); // We can't use useGeometryOptional here easily since GeometryProvider is inside TeacherMode!
  // Wait, GeometryProvider is rendered inside TeacherMode.
  return (
    <GeometryProvider>
      <CameraProvider>
        <GeometryLoader />
        <TeacherModeContent />
      </CameraProvider>
    </GeometryProvider>
  );
};

const TeacherModeContent = () => {
  const context = useGeometryOptional();
  const isVideoMode = context?.state.videoMode;

  return (
    <div className="min-h-screen w-full flex">
      <LeftSidebar />
      <MobileSidebar />

      {/* Main Canvas Area */}
      <main className="flex-1 min-w-0 relative radial-gradient-bg min-h-screen">
        {/* Top Toolbar */}
        <TopToolbar />

        {/* 3D Canvas */}
        <GeometryCanvas />

        {/* Timeline UI */}
        <TimelineContainer />

        {/* Advance mode — bộ chuyển câu (tự ẩn khi không phải bài đa-câu) */}
        <AdvanceStepper />

        {/* Advance mode — lời giải từng bước cho câu đang xem (tự ẩn khi câu không có lời giải) */}
        <AdvanceSolutionPanel />

        {/* Drop Zone (Empty State) */}
        <DropZone />

        {/* Scanning Overlay */}
        <ScanningOverlay />

        {/* Floating Prompt Bar */}
        {!isVideoMode && <FloatingPromptBar />}
      </main>

      {/* Right Panel — export (PNG, LaTeX) + properties */}
      {isVideoMode ? (
        <VideoExportPanel />
      ) : (
        <>
          <RightPanel />
          <MobileRightPanel />
        </>
      )}
    </div>
  );
};

export default TeacherMode;
