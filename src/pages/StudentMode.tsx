/**
 * StudentMode — route /student
 *
 * Sprint 2: Solver panel on the right (SolverPanel) replaces RightPanel.
 * Users paste problem → geometry drawn → click "Giải bài" → step-by-step solution.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { CameraProvider } from '@/context/CameraContext';
import { LeftSidebar, MobileSidebar } from '@/components/layout/LeftSidebar';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { DropZone } from '@/components/DropZone';
import { ScanningOverlay } from '@/components/ScanningOverlay';
import { FloatingPromptBar } from '@/components/FloatingPromptBar';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { TimelinePlayer } from '@/components/layout/TimelinePlayer';
import { VideoExportPanel } from '@/components/layout/VideoExportPanel';
import { SolverPanel, MobileSolverPanel } from '@/components/SolverPanel';
import { GeometryData } from '@/types/geometry';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function GeometryLoader() {
  const location = useLocation();
  const navigate = useNavigate();
  const context = useGeometryOptional();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!context) return;
    const state = location.state as { loadGeometry?: GeometryData } | null;
    if (state?.loadGeometry && !hasLoaded.current) {
      hasLoaded.current = true;
      context.loadGeometry(state.loadGeometry);
      navigate('/student', { replace: true, state: {} });
    }
  }, [location.state, context, navigate]);

  return null;
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-[272px] z-50 glass border border-border/50 h-9 w-9 hidden lg:flex"
          onClick={() => navigate('/')}
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

const StudentMode = () => {
  return (
    <GeometryProvider>
      <CameraProvider>
        <StudentModeContent />
      </CameraProvider>
    </GeometryProvider>
  );
};

const StudentModeContent = () => {
  const context = useGeometryOptional();
  const isVideoMode = context?.state.videoMode;

  return (
    <>
      <GeometryLoader />
      <div className="min-h-screen w-full flex">
        <LeftSidebar />
        <MobileSidebar />

        <main className="flex-1 lg:ml-64 lg:mr-80 relative radial-gradient-bg min-h-screen">
          <BackButton />
          <TopToolbar />
          <GeometryCanvas />
          
          <TimelineContainer />

          <DropZone />
          <ScanningOverlay />
          
          {!isVideoMode && <FloatingPromptBar />}
          {!isVideoMode && <MobileSolverPanel />}
        </main>

        {/* Solver Panel */}
        {isVideoMode ? (
          <VideoExportPanel />
        ) : (
          <SolverPanel />
        )}
      </div>
    </>
  );
};

export default StudentMode;
