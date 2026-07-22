import { useRef, useEffect, useMemo, useCallback } from 'react';
import { Hexagon } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GeometryRenderer } from './GeometryRenderer';
import { CoordinateGridPlanes } from './CoordinateGridPlanes';
import { ClickToPlacePoint } from './ClickToPlacePoint';
import { ToolPreviewRenderer } from './ToolPreviewRenderer';
import { CameraFlyer } from './CameraFlyer';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional, useCameraStateOptional } from '@/context/CameraContext';
import { scaleGeometry } from '@/lib/geometry/scaleGeometry';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function CameraFitter({ geometry, is2D }: { geometry: any; is2D?: boolean }) {
  const { camera, size: canvasSize } = useThree();
  const cameraCtx = useCameraOptional();
  const cameraStateCtx = useCameraStateOptional();
  const prevNameRef = useRef<string>('');
  const resetNonce = cameraCtx?.resetNonce ?? 0;
  const prevNonceRef = useRef<number>(resetNonce);

  useEffect(() => {
    if (!geometry?.points?.length) return;
    const name = geometry.name || '';
    const nonceChanged = resetNonce !== prevNonceRef.current;
    // Fit khi có hình MỚI, hoặc khi người dùng bấm "Đặt lại góc nhìn" (R / menu View).
    if (name === prevNameRef.current && !nonceChanged) return;
    prevNameRef.current = name;
    prevNonceRef.current = resetNonce;

    // Bounding box in Three.js coords (math: z-up → three: y-up)
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity; // three Y = math Z
    let minZ = Infinity, maxZ = -Infinity; // three Z = math Y

    geometry.points.forEach((p: any) => {
      const x = Number(p.x), y = Number(p.z), z = Number(p.y);
      if (!isNaN(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      if (!isNaN(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      if (!isNaN(z)) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 2);
    if (is2D) {
      // Look from underneath to make X right and Y up (due to coordinate handedness)
      camera.position.set(cx, -10, cz);
      camera.lookAt(cx, 0, cz);
      camera.up.set(0, 0, 1); // Three.js Z (Math Y) is Up
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const orthCamera = camera as THREE.OrthographicCamera;
        // zoom to fit the size on the canvas
        orthCamera.zoom = Math.min(canvasSize.width, canvasSize.height) / (size * 1.2);
        orthCamera.updateProjectionMatrix();
      }
    } else {
      // Ôm SÁT hình theo FOV + tỉ lệ khung nhìn để lấp đầy khung (màn dọc/mobile
      // -> fit theo chiều hẹp), thay cho khoảng cách cố định cũ để bớt "trống".
      const R = 0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1;
      const fov = (((camera as THREE.PerspectiveCamera).fov ?? 50) * Math.PI) / 180;
      const aspect = Math.max(0.1, canvasSize.width / Math.max(1, canvasSize.height));
      const distV = R / Math.tan(fov / 2);
      const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
      const distH = R / Math.tan(hFov / 2);
      const dist = Math.max(distV, distH) * 1.2; // 1.2 = chừa lề nhỏ cho nhãn điểm
      const dir = new THREE.Vector3(0.55, 0.55, 0.75).normalize();
      camera.position.set(cx + dir.x * dist, cy + dir.y * dist, cz + dir.z * dist);
      camera.up.set(0, 1, 0);
      camera.lookAt(cx, cy, cz);
    }
    camera.updateProjectionMatrix();

    // Đồng bộ pose vào cameraState để CaptureModal/CameraTracker khớp góc nhìn.
    // CameraTracker sẽ no-op vì camera đã ở đúng vị trí -> không lặp vô hạn.
    if (cameraStateCtx) {
      const pos = camera.position;
      const targetVec = new THREE.Vector3(cx, cy, cz);
      const zoom = (camera as any).isOrthographicCamera
        ? (camera as any).zoom
        : 10.59 / Math.max(0.1, pos.distanceTo(targetVec));
      cameraStateCtx.setCameraState({
        position: [pos.x, pos.y, pos.z],
        target: [cx, cy, cz],
        zoom,
      });
    }
    // cameraStateCtx.setCameraState là setter ổn định của useState -> không cần vào deps.
  }, [geometry, camera, is2D, canvasSize, resetNonce]);

  return null;
}

function CameraTracker() {
  const { camera } = useThree();
  const cameraStateContext = useCameraStateOptional();

  // Sync FROM CameraState TO WebGL Camera (e.g. when modified by CaptureModal)
  useEffect(() => {
    if (!cameraStateContext) return;
    const { position, target: stTarget, zoom } = cameraStateContext.cameraState;
    const currentPos = new THREE.Vector3(...position);

    // If the state is different from the WebGL camera, it means it was updated externally
    if (camera.position.distanceTo(currentPos) > 0.05 || Math.abs(camera.zoom - zoom) > 0.05) {
      camera.position.copy(currentPos);
      camera.lookAt(new THREE.Vector3(...stTarget));

      if ((camera as any).isOrthographicCamera) {
         camera.zoom = zoom;
         camera.updateProjectionMatrix();
      }
    }
  }, [cameraStateContext?.cameraState, camera]);

  return null;
}

interface SceneProps {
  geometries: any[];
  geometry: any;
  isBuilding: boolean;
  autoRotate?: boolean;
  showCoordinateGrid?: boolean;
  is2D?: boolean;
  /** Task C1/C2: điểm cần "bay tới" (toạ độ math). nonce đổi = trigger bay mới. null = không bay (mặc định). */
  focus?: { pts: Array<{ x: number; y: number; z: number }>; nonce: number } | null;
}

function Scene({ geometry, isBuilding, autoRotate = false, is2D = false, focus = null, showCoordinateGrid = true }: SceneProps) {
  const geometryContext = useGeometryOptional();
  const { camera } = useThree();
  const cameraStateContext = useCameraStateOptional();

  // Ref tới OrbitControls (three-stdlib instance) để CameraFlyer điều khiển
  // controls.target trực tiếp trong lúc bay.
  const controlsRef = useRef<any>(null);

  // Calculate the centroid (center of mass) of the geometry
  // and convert math coords (z=up) to Three.js (y=up)
  const lastCentroidRef = useRef<[number, number, number]>([0, 1.5, 0]);
  const manualMode = geometryContext?.state.manualMode || false;

  const centroid = useMemo(() => {
    if (manualMode) return lastCentroidRef.current;

    if (!geometry || !geometry.points || geometry.points.length === 0) {
      lastCentroidRef.current = [0, 1.5, 0];
      return lastCentroidRef.current;
    }

    let sx = 0, sy = 0, sz = 0;
    let validCount = 0;

    geometry.points.forEach((p: any) => {
      const x = Number(p.x);
      const y = Number(p.y);
      const z = Number(p.z);

      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        sx += x;
        sy += z; // math z -> three y
        sz += y; // math y -> three z
        validCount++;
      }
    });

    if (validCount > 0) {
      lastCentroidRef.current = [sx / validCount, sy / validCount, sz / validCount] as [number, number, number];
      return lastCentroidRef.current;
    }
    
    lastCentroidRef.current = [0, 1.5, 0];
    return lastCentroidRef.current;
  }, [geometry, manualMode]);

  // Calculate the maximum extent of the geometry to size the grid appropriately
  const gridSize = useMemo(() => {
    if (!geometry || !geometry.points || geometry.points.length === 0) return 10;
    let max = 0;
    geometry.points.forEach((p: any) => {
      const x = Math.abs(Number(p.x));
      const y = Math.abs(Number(p.y));
      const z = Math.abs(Number(p.z));
      if (!isNaN(x) && x > max) max = x;
      if (!isNaN(y) && y > max) max = y;
      if (!isNaN(z) && z > max) max = z;
    });
    // size is total width, so double the max extent from center, plus padding
    // For an object up to x=9, max=9, size=(9+2)*2 = 22. axisLength = 22*0.6 = 13.2
    return Math.max(10, Math.ceil(max + 1) * 2);
  }, [geometry]);

  // Persist camera pose to React state when the user finishes interacting.
  // Writing on every frame (via useFrame) made rotation stutter; additionally,
  // wheel-zoom fires OrbitControls' 'end' on EVERY notch, so we debounce here to
  // persist once the interaction settles. Otherwise each notch triggers a React
  // state write that re-renders heavy consumers (the LaTeX panel) and stutters.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleControlsEnd = useCallback(() => {
    if (!cameraStateContext) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const pos = camera.position;
      const targetVec = new THREE.Vector3(...centroid);
      const currentZoom = (camera as any).isOrthographicCamera
        ? (camera as any).zoom
        : (10.59 / Math.max(0.1, pos.distanceTo(targetVec)));

      cameraStateContext.setCameraState({
        position: [pos.x, pos.y, pos.z],
        target: centroid,
        zoom: currentZoom,
      });
    }, 180);
  }, [camera, cameraStateContext, centroid]);

  useEffect(() => () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
  }, []);

  return (
    <>
      {/* Camera Tracker with Dynamic Target */}
      <CameraTracker />
      <CameraFitter geometry={geometry} is2D={is2D} />
      <CameraFlyer controlsRef={controlsRef} focus={focus} />

      {/* Lighting with shadows */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#8b5cf6" />

      {/* Environment for subtle reflections */}
      <Environment preset="night" />

      {/* Grid */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#444444"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
        position={[0, -0.01, 0]}
        depthWrite={false}
      />

      {/* Coordinate Grid with axis labels */}
      <CoordinateGridPlanes showXY={showCoordinateGrid} showXZ={false} showYZ={false} size={gridSize} is2D={is2D} unit={geometry?.axisUnit} />

      {/* Geometries */}
      <group>
        <ToolPreviewRenderer />
        <GeometryRenderer geometry={geometry} isBuilding={isBuilding} />
      </group>

      {/* Click to place point in manual mode */}
      <ClickToPlacePoint />

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        target={centroid}
        onEnd={handleControlsEnd}
        autoRotate={!is2D && autoRotate}
        autoRotateSpeed={1.5}
        enableRotate={!is2D}
        maxPolarAngle={is2D ? Math.PI / 2 : Math.PI}
        minPolarAngle={is2D ? Math.PI / 2 : 0}
        minAzimuthAngle={is2D ? 0 : -Infinity}
        maxAzimuthAngle={is2D ? 0 : Infinity}
        mouseButtons={{
          LEFT: is2D ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: is2D ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN // in 2D, right click rotate is disabled anyway
        }}
      />
    </>
  );
}

export function GeometryCanvas({
  focus = null,
}: { focus?: { pts: Array<{ x: number; y: number; z: number }>; nonce: number } | null } = {}) {
  const cameraContext = useCameraOptional();
  const geometryContext = useGeometryOptional();
  const state = geometryContext?.state;
  
  const geometry = state?.geometry;
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const isBuilding = state?.isBuilding ?? false;
  const autoRotate = state?.autoRotate ?? false;
  const showCoordinateGrid = state?.showCoordinateGrid ?? true;

  const is2D = useMemo(() => {
    return geometry?.tags?.some((t: string) => t.includes('2D')) || false;
  }, [geometry]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (geometryContext && geometryContext.state.selectedIds.length > 0) {
          geometryContext.clearSelection();
        } else if (geometryContext && geometryContext.state.manualTool) {
          geometryContext.setManualTool(null);
        }
        return;
      }
      // "R" = đặt lại góc nhìn (bỏ qua khi đang gõ trong ô nhập, và khi có Ctrl/⌘ như Ctrl+R reload)
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (!typing) {
          e.preventDefault();
          cameraContext?.resetCamera();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [geometryContext, cameraContext]);

  // Auto-scale large geometry coordinates to fit within standard [-8, 8] bounds
  const scaledGeometry = useMemo(() => {
    return scaleGeometry(geometry);
  }, [geometry]);

  // Get canvas reference after render
  useEffect(() => {
    if (canvasContainerRef.current && cameraContext) {
      const canvas = canvasContainerRef.current.querySelector('canvas');
      if (canvas && cameraContext.canvasRef) {
        (cameraContext.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
      }
    }
  }, [cameraContext]);

  if (!state?.geometry && !state?.isScanning) {
    return null;
  }

  return (
    <div ref={canvasContainerRef} className="absolute inset-0">
      {/* Empty State */}
      {!geometry && !isBuilding && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 animate-fade-in opacity-50">
          <Hexagon className="w-24 h-24 text-primary/20 mb-4 stroke-[1]" />
          <p className="text-muted-foreground text-sm font-medium tracking-wide">
            Khu vực hiển thị Không gian 3D
          </p>
        </div>
      )}

      <ErrorBoundary>
        <Canvas
          orthographic={is2D}
          camera={{ position: is2D ? [0, 10, 0] : [6, 5, 8], fov: 50, zoom: is2D ? 50 : 1 }}
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
          }}
          style={{ background: 'transparent' }}
        >
          <Scene geometry={scaledGeometry} isBuilding={isBuilding} autoRotate={autoRotate} showCoordinateGrid={showCoordinateGrid} is2D={is2D} focus={cameraContext?.cameraFocus ?? focus} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
