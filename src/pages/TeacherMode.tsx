import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { CameraProvider, useCamera } from '@/context/CameraContext';
import { LeftSidebar, MobileSidebar } from '@/components/layout/LeftSidebar';
import { RightPanel, MobileRightPanel } from '@/components/layout/RightPanel';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { DropZone } from '@/components/DropZone';
import { ScanningOverlay } from '@/components/ScanningOverlay';
import { FloatingPromptBar } from '@/components/FloatingPromptBar';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { TimelinePlayer } from '@/components/layout/TimelinePlayer';
import { VideoExportPanel } from '@/components/layout/VideoExportPanel';
import { GeometryData } from '@/types/geometry';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Camera preset buttons ────────────────────────────────────────────────────

const CAMERA_PRESETS = [
  { label: 'Mặc định', position: [6, 5, 8] as [number, number, number],  target: [0, 1.5, 0] as [number, number, number] },
  { label: 'Đáy',      position: [0, 10, 0.1] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  { label: 'Cạnh',     position: [10, 2, 0] as [number, number, number],  target: [0, 2, 0] as [number, number, number] },
  { label: 'Nghiêng',  position: [5, 4, 7] as [number, number, number],   target: [0, 0, 0] as [number, number, number] },
] as const;

function CameraPresets() {
  const { setCameraState } = useCamera();
  return (
    <div className="absolute bottom-24 left-4 z-30 flex flex-col gap-1.5">
      {CAMERA_PRESETS.map((p) => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          className="glass border-border/50 text-xs h-7 px-2.5"
          onClick={() => setCameraState({ position: p.position, target: p.target })}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
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
        if (id.startsWith('local_')) {
          const localStr = localStorage.getItem('geo3d_anonymous_history');
          if (localStr) {
            const history = JSON.parse(localStr);
            const item = history.find((h: any) => h.id === id);
            if (item) {
              hasLoaded.current = true;
              context.loadGeometry(item.geometry_data as unknown as GeometryData);
              return;
            }
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

// ─── Back to landing ──────────────────────────────────────────────────────────

function BackButton() {
  const context = useGeometryOptional();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-[272px] z-50 glass border border-border/50 h-9 w-9 hidden lg:flex"
          onClick={() => {
            if (context?.state.geometry) {
              context.clearGeometry();
            }
          }}
        >
          <Home className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Trang chủ</TooltipContent>
    </Tooltip>
  );
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
        {/* Back to landing */}
        <BackButton />

        {/* Top Toolbar */}
        <TopToolbar />

        {/* 3D Canvas */}
        <GeometryCanvas />

        {/* Timeline UI */}
        <TimelineContainer />

        {/* Camera preset buttons (bottom-left of canvas) */}
        {!isVideoMode && <CameraPresets />}

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
