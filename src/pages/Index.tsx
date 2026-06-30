import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { CameraProvider } from '@/context/CameraContext';
import { LeftSidebar, MobileSidebar } from '@/components/layout/LeftSidebar';
import { RightPanel, MobileRightPanel } from '@/components/layout/RightPanel';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { DropZone } from '@/components/DropZone';
import { ScanningOverlay } from '@/components/ScanningOverlay';
import { FloatingPromptBar } from '@/components/FloatingPromptBar';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { GeometryData } from '@/types/geometry';

// Component to handle loading geometry from navigation state
function GeometryLoader() {
  const location = useLocation();
  const navigate = useNavigate();
  const context = useGeometryOptional();
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Guard against HMR when context is not available
    if (!context) return;
    
    const state = location.state as { loadGeometry?: GeometryData } | null;
    if (state?.loadGeometry && !hasLoaded.current) {
      hasLoaded.current = true;
      context.loadGeometry(state.loadGeometry);
      // Clear the state to prevent reloading on refresh
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, context, navigate]);

  return null;
}

const Index = () => {
  return (
    <GeometryProvider>
      <CameraProvider>
        <GeometryLoader />
        <div className="min-h-screen w-full flex">
          {/* Desktop Left Sidebar */}
          <LeftSidebar />
          
          {/* Mobile Sidebar */}
          <MobileSidebar />

          {/* Main Canvas Area */}
          <main className="flex-1 min-w-0 relative radial-gradient-bg min-h-screen">
            {/* Top Toolbar */}
            <TopToolbar />

            {/* 3D Canvas */}
            <GeometryCanvas />

            {/* Drop Zone (Empty State) */}
            <DropZone />

            {/* Scanning Overlay */}
            <ScanningOverlay />

            {/* Floating Prompt Bar */}
            <FloatingPromptBar />
          </main>

          {/* Desktop Right Panel */}
          <RightPanel />
          
          {/* Mobile Right Panel */}
          <MobileRightPanel />
        </div>
      </CameraProvider>
    </GeometryProvider>
  );
};

export default Index;
