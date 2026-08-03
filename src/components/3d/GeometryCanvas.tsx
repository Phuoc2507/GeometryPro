import { useRef, useEffect, useMemo, useCallback, useState, type ComponentRef } from 'react';
import { Hexagon, Crosshair, Hand, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GeometryRenderer } from './GeometryRenderer';
import { CoordinateGridPlanes } from './CoordinateGridPlanes';
import { ClickToPlacePoint } from './ClickToPlacePoint';
import { ToolPreviewRenderer } from './ToolPreviewRenderer';
import { CameraFlyer } from './CameraFlyer';
import { useGeometryOptional } from '@/context/GeometryContext';
import {
  useCameraOptional,
  useCameraStateOptional,
  type CaptureHandler,
} from '@/context/CameraContext';
import { scaleGeometry, getScaleFactor } from '@/lib/geometry/scaleGeometry';
import { recenterGeometryOnSphere } from '@/lib/geometry/recenterGeometry';
import { computeFitBounds } from '@/lib/geometry/fitBounds';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { GeometryData } from '@/types/geometry';

function CameraFitter({ geometry, is2D }: { geometry: GeometryData | null; is2D?: boolean }) {
  const { camera, size: canvasSize } = useThree();
  const cameraCtx = useCameraOptional();
  const cameraStateCtx = useCameraStateOptional();
  const commitCameraState = cameraStateCtx?.setCameraState;
  const prevNameRef = useRef<string>('');
  const resetNonce = cameraCtx?.resetNonce ?? 0;
  const prevNonceRef = useRef<number>(resetNonce);

  useEffect(() => {
    const bounds = computeFitBounds(geometry);
    if (!bounds) return;
    const name = geometry?.name || '';
    const nonceChanged = resetNonce !== prevNonceRef.current;
    // Fit khi có hình MỚI, hoặc khi người dùng bấm "Đặt lại góc nhìn" (R / menu View).
    if (name === prevNameRef.current && !nonceChanged) return;
    prevNameRef.current = name;
    prevNonceRef.current = resetNonce;

    // bounds ở toạ độ Three (đã gộp points + samples của curve/area/solid).
    const { cx, cy, cz, size, R } = bounds;
    if (is2D) {
      // Look from underneath to make X right and Y up (due to coordinate handedness)
      camera.position.set(cx, -10, cz);
      camera.lookAt(cx, 0, cz);
      camera.up.set(0, 0, 1); // Three.js Z (Math Y) is Up
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const orthCamera = camera as THREE.OrthographicCamera;
        orthCamera.zoom = Math.min(canvasSize.width, canvasSize.height) / (size * 1.2);
        orthCamera.updateProjectionMatrix();
      }
    } else {
      // Ôm SÁT hình theo FOV + tỉ lệ khung nhìn (màn dọc/mobile -> fit theo chiều hẹp).
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
    if (commitCameraState) {
      const pos = camera.position;
      const targetVec = new THREE.Vector3(cx, cy, cz);
      const zoom = camera instanceof THREE.OrthographicCamera
        ? camera.zoom
        : 10.59 / Math.max(0.1, pos.distanceTo(targetVec));
      commitCameraState({
        position: [pos.x, pos.y, pos.z],
        target: [cx, cy, cz],
        zoom,
      });
    }
    // cameraStateCtx.setCameraState là setter ổn định của useState -> không cần vào deps.
  }, [geometry, camera, is2D, canvasSize, resetNonce, commitCameraState]);

  return null;
}

// Nhắm camera LỆCH LÊN khi đáy màn bị panel che (mobile). Dịch khung ở mức
// projection (setViewOffset) nên GIỮ nguyên tâm xoay — fit/fly/xoay đều lệch theo,
// điểm của bước không còn nấp sau panel dưới.
function CameraViewOffset() {
  const { camera, size } = useThree();
  const cameraCtx = useCameraOptional();
  const inset = cameraCtx?.bottomInset ?? 0;
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (typeof cam.setViewOffset !== 'function') return;
    if (inset > 0.001 && size.height > 0) {
      // Đưa tâm vùng đang thấy (nửa trên) về giữa khung → dịch ảnh lên (inset/2)·chiều cao.
      cam.setViewOffset(size.width, size.height, 0, (inset / 2) * size.height, size.width, size.height);
    } else {
      cam.clearViewOffset();
    }
    cam.updateProjectionMatrix();
    return () => {
      if (typeof cam.clearViewOffset === 'function') { cam.clearViewOffset(); cam.updateProjectionMatrix(); }
    };
  }, [camera, size.width, size.height, inset]);
  return null;
}

function CameraTracker() {
  const { camera } = useThree();
  const cameraStateContext = useCameraStateOptional();
  const sharedCameraState = cameraStateContext?.cameraState;

  // Sync FROM CameraState TO WebGL Camera (e.g. when modified by CaptureModal)
  useEffect(() => {
    if (!sharedCameraState) return;
    const { position, target: stTarget, zoom } = sharedCameraState;
    const currentPos = new THREE.Vector3(...position);

    // If the state is different from the WebGL camera, it means it was updated externally
    const zoomChanged = (camera as THREE.OrthographicCamera).isOrthographicCamera
      && Math.abs(camera.zoom - zoom) > 0.05;
    if (camera.position.distanceTo(currentPos) > 0.05 || zoomChanged) {
      camera.position.copy(currentPos);
      camera.lookAt(new THREE.Vector3(...stTarget));

      if (camera instanceof THREE.OrthographicCamera) {
         camera.zoom = zoom;
         camera.updateProjectionMatrix();
      }
    }
  }, [sharedCameraState, camera]);

  return null;
}

function CanvasCaptureBridge() {
  const { camera, gl, scene, size } = useThree();
  const registerCaptureHandler = useCameraOptional()?.registerCaptureHandler;

  useEffect(() => {
    if (!registerCaptureHandler) return;

    const capture: CaptureHandler = async (state, hiddenLines, points, transparent) => {
      const width = Math.max(1, Math.round(size.width * gl.getPixelRatio()));
      const height = Math.max(1, Math.round(size.height * gl.getPixelRatio()));
      const exportRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      exportRenderer.setPixelRatio(1);
      exportRenderer.setSize(width, height, false);
      exportRenderer.localClippingEnabled = true;
      exportRenderer.outputColorSpace = gl.outputColorSpace;
      exportRenderer.toneMapping = gl.toneMapping;
      exportRenderer.toneMappingExposure = gl.toneMappingExposure;
      exportRenderer.setClearColor(transparent ? 0x000000 : 0x09090b, transparent ? 0 : 1);

      const exportCamera = camera.clone();
      exportCamera.position.set(...state.position);
      exportCamera.up.copy(camera.up);
      exportCamera.lookAt(new THREE.Vector3(...state.target));
      if (exportCamera instanceof THREE.PerspectiveCamera) {
        exportCamera.aspect = width / height;
      } else if (exportCamera instanceof THREE.OrthographicCamera) {
        exportCamera.zoom = state.zoom;
      }
      exportCamera.updateProjectionMatrix();
      exportCamera.updateMatrixWorld(true);

      type DashMaterial = THREE.Material & {
        dashSize?: number;
        gapSize?: number;
        needsUpdate: boolean;
      };
      const changedMaterials: Array<{
        material: DashMaterial;
        dashSize?: number;
        gapSize?: number;
      }> = [];

      scene.traverse((object) => {
        if (object.userData?.type !== 'geometry-line') return;
        const materialValue = (object as THREE.Object3D & { material?: THREE.Material }).material;
        if (!materialValue || Array.isArray(materialValue)) return;
        const material = materialValue as DashMaterial;
        changedMaterials.push({
          material,
          dashSize: material.dashSize,
          gapSize: material.gapSize,
        });
        const isHidden = hiddenLines.get(String(object.userData.lineId)) ?? false;
        material.dashSize = isHidden ? 0.3 : 1e6;
        material.gapSize = isHidden ? 0.4 : 0;
      });

      try {
        scene.updateMatrixWorld(true);
        exportRenderer.render(scene, exportCamera);

        const copiedCanvas = document.createElement('canvas');
        copiedCanvas.width = width;
        copiedCanvas.height = height;
        const copiedContext = copiedCanvas.getContext('2d');
        if (!copiedContext) throw new Error('Cannot create the export canvas');
        copiedContext.drawImage(exportRenderer.domElement, 0, 0);

        const labelPositions = new Map<string, { x: number; y: number; visible: boolean }>();
        const projected = new THREE.Vector3();
        for (const point of points) {
          // Geometry data is z-up; the WebGL scene is y-up.
          projected.set(point.x, point.z, point.y).project(exportCamera);
          labelPositions.set(point.id, {
            x: (projected.x * 0.5 + 0.5) * width,
            y: (-projected.y * 0.5 + 0.5) * height,
            visible: projected.z >= -1 && projected.z <= 1,
          });
        }

        return { canvas: copiedCanvas, labelPositions };
      } finally {
        for (const previous of changedMaterials) {
          previous.material.dashSize = previous.dashSize;
          previous.material.gapSize = previous.gapSize;
        }
        exportRenderer.dispose();
        exportRenderer.forceContextLoss();
      }
    };

    registerCaptureHandler(capture);
    return () => registerCaptureHandler(null);
  }, [camera, gl, registerCaptureHandler, scene, size.height, size.width]);

  return null;
}

interface SceneProps {
  geometry: GeometryData | null;
  isBuilding: boolean;
  autoRotate?: boolean;
  showCoordinateGrid?: boolean;
  is2D?: boolean;
  /** Hệ số scaleGeometry đang áp — để lưới hiện SỐ THẬT (toạ độ = vạch × hệ số). 1 = không scale. */
  scaleFactor?: number;
  /** Task C1/C2: điểm cần "bay tới" (toạ độ math). nonce đổi = trigger bay mới. null = không bay (mặc định). */
  focus?: { pts: Array<{ x: number; y: number; z: number }>; nonce: number } | null;
}

function Scene({ geometry, isBuilding, autoRotate = false, is2D = false, focus = null, showCoordinateGrid = true, scaleFactor = 1 }: SceneProps) {
  const geometryContext = useGeometryOptional();
  const cameraContext = useCameraOptional();
  const { camera } = useThree();
  const cameraStateContext = useCameraStateOptional();
  const setCameraState = cameraStateContext?.setCameraState;
  const setLiveCameraState = cameraStateContext?.setLiveCameraState;
  const isExportPreviewOpen = cameraContext?.isExportPreviewOpen ?? false;
  const isLivePreviewEnabled = cameraContext?.isLivePreviewEnabled ?? false;

  // Ref tới OrbitControls (three-stdlib instance) để CameraFlyer điều khiển
  // controls.target trực tiếp trong lúc bay.
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

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

    geometry.points.forEach((p) => {
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
    geometry.points.forEach((p) => {
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

  // Keep the right-panel preview in sync while the main scene is rotating. The
  // update is limited to one state write per browser frame, and the LaTeX source
  // consumes the deferred camera value in RightPanel so it does not recalculate
  // for every intermediate camera pose.
  const liveSyncFrameRef = useRef<number | null>(null);
  const lastLivePublishAtRef = useRef(0);
  const lastPublishedCameraRef = useRef<{ position: [number, number, number]; target: [number, number, number]; zoom: number } | null>(null);

  const publishCameraState = useCallback((commit: boolean) => {
    if (!setCameraState || !setLiveCameraState) return;
    const pos = camera.position;
    const targetVec = new THREE.Vector3(...centroid);
    const next = {
      position: [pos.x, pos.y, pos.z] as [number, number, number],
      target: centroid,
      zoom: (camera as THREE.OrthographicCamera).isOrthographicCamera
        ? (camera as THREE.OrthographicCamera).zoom
        : (10.59 / Math.max(0.1, pos.distanceTo(targetVec))),
    };
    const previous = lastPublishedCameraRef.current;
    const unchanged = previous
      && previous.position.every((value, index) => Math.abs(value - next.position[index]) < 0.0001)
      && previous.target.every((value, index) => Math.abs(value - next.target[index]) < 0.0001)
      && Math.abs(previous.zoom - next.zoom) < 0.0001;
    if (unchanged && !commit) return;

    lastPublishedCameraRef.current = next;
    if (commit) setCameraState(next);
    else setLiveCameraState(next);
  }, [camera, centroid, setCameraState, setLiveCameraState]);

  const handleControlsChange = useCallback(() => {
    if (!isLivePreviewEnabled || isExportPreviewOpen || !setLiveCameraState || liveSyncFrameRef.current !== null) return;
    liveSyncFrameRef.current = requestAnimationFrame((timestamp) => {
      liveSyncFrameRef.current = null;
      // The main WebGL scene keeps rendering at the display refresh rate. The
      // SVG export preview is more expensive, so 30 fps is a much smoother
      // overall experience while still being visibly realtime.
      if (timestamp - lastLivePublishAtRef.current < 1000 / 30) return;
      lastLivePublishAtRef.current = timestamp;
      publishCameraState(false);
    });
  }, [isExportPreviewOpen, isLivePreviewEnabled, publishCameraState, setLiveCameraState]);

  const handleControlsEnd = useCallback(() => {
    publishCameraState(true);
  }, [publishCameraState]);

  useEffect(() => () => {
    if (liveSyncFrameRef.current !== null) cancelAnimationFrame(liveSyncFrameRef.current);
  }, []);

  return (
    <>
      {/* Camera Tracker with Dynamic Target */}
      <CameraTracker />
      <CanvasCaptureBridge />
      <CameraFitter geometry={geometry} is2D={is2D} />
      <CameraViewOffset />
      <CameraFlyer controlsRef={controlsRef} focus={focus} />

      {/* Lighting — dịu & thân thiện: fill sáng hơn + hemisphere mềm, key light nhẹ, rim nhạt.
          Nét đường (Line) là unlit nên phần này chỉ làm MỀM các khối đặc (Advance/tròn xoay/thiết diện). */}
      <ambientLight intensity={0.7} />
      <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#94a3b8" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.45}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.25} color="#a5b4fc" />

      {/* Environment mềm trong nhà cho phản chiếu dịu (chỉ IBL, không nền) */}
      <Environment preset="apartment" />

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
      />

      {/* Coordinate Grid with axis labels */}
      <CoordinateGridPlanes showXY={showCoordinateGrid} showXZ={false} showYZ={false} size={gridSize} is2D={is2D} unit={geometry?.axisUnit} unitPerStep={scaleFactor} />

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
        onChange={handleControlsChange}
        onEnd={handleControlsEnd}
        autoRotate={!is2D && autoRotate && !isExportPreviewOpen}
        autoRotateSpeed={1.5}
        enableRotate={!is2D && !isExportPreviewOpen}
        enablePan={!isExportPreviewOpen}
        enableZoom={!isExportPreviewOpen}
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
  const recenterToSphere = state?.recenterToSphere ?? false;

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
      // Ctrl/⌘+Z = Hoàn tác, Ctrl/⌘+Shift+Z hoặc Ctrl+Y = Làm lại.
      // Dùng cho cả vẽ thủ công (thêm/xóa điểm, đường, mặt phẳng…). Bỏ qua khi đang gõ
      // trong ô nhập để không giành undo của trình duyệt với thao tác gõ tọa độ.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
        const t = e.target as HTMLElement | null;
        const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (typing) return;
        const isRedo = (e.key === 'y' || e.key === 'Y') || e.shiftKey;
        e.preventDefault();
        if (isRedo) {
          if (geometryContext?.canRedo) geometryContext.redo();
        } else {
          if (geometryContext?.canUndo) geometryContext.undo();
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

  // Chế độ xem "dời trục về tâm cầu": tịnh tiến TRƯỚC khi auto-scale, để tâm cầu về gốc O
  // rồi mới co cho vừa khung. Không có cầu (hoặc tắt) → giữ nguyên hình.
  const displayBase = useMemo(
    () => (recenterToSphere ? recenterGeometryOnSphere(geometry ?? null) : (geometry ?? null)),
    [geometry, recenterToSphere],
  );

  // Auto-scale large geometry coordinates to fit within standard [-8, 8] bounds
  const scaledGeometry = useMemo(() => scaleGeometry(displayBase), [displayBase]);
  // Hệ số scale tương ứng → truyền xuống lưới để hiện SỐ THẬT tại mỗi vạch.
  const gridScaleFactor = useMemo(() => getScaleFactor(displayBase), [displayBase]);

  // Get canvas reference after render
  useEffect(() => {
    if (canvasContainerRef.current && cameraContext) {
      const canvas = canvasContainerRef.current.querySelector('canvas');
      if (canvas && cameraContext.canvasRef) {
        (cameraContext.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
      }
    }
  }, [cameraContext]);

  // Gợi ý thao tác 3D — hiện lần đầu (nhất là trên điện thoại: không rõ là kéo/chụm được).
  const isMobile = useIsMobile();
  const [hintDismissed, setHintDismissed] = useState(() => {
    try { return localStorage.getItem('geo3d:seen-3d-hint') === '1'; } catch { return true; }
  });
  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    try { localStorage.setItem('geo3d:seen-3d-hint', '1'); } catch { /* bỏ qua */ }
  }, []);
  // Tự ẩn sau 5s để không đè hình lâu (đã đủ thời gian đọc dòng ngắn).
  useEffect(() => {
    if (hintDismissed) return;
    const t = setTimeout(dismissHint, 5000);
    return () => clearTimeout(t);
  }, [hintDismissed, dismissHint]);

  if (!state?.geometry && !state?.isScanning) {
    return null;
  }

  return (
    <div
      ref={canvasContainerRef}
      className="absolute inset-0"
      onPointerDown={hintDismissed ? undefined : dismissHint} // chạm/kéo hình là ẩn gợi ý ngay
    >
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
          <Scene geometry={scaledGeometry} isBuilding={isBuilding} autoRotate={autoRotate} showCoordinateGrid={showCoordinateGrid} is2D={is2D} scaleFactor={gridScaleFactor} focus={cameraContext?.cameraFocus ?? focus} />
        </Canvas>
      </ErrorBoundary>

      {/* ─── Lớp điều khiển nổi trên hình (khi đã có hình) ─── */}
      {geometry && (
        <>
          {/* Gợi ý thao tác — tự ẩn khi bấm X, nhớ để không hiện lại. */}
          {!hintDismissed && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border/50 shadow-sm animate-fade-in max-w-[calc(100vw-2rem)]">
              <Hand className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-foreground/90 whitespace-nowrap">
                {isMobile ? 'Kéo để xoay · chụm 2 ngón để phóng to' : 'Kéo để xoay · lăn chuột để phóng to'}
              </span>
              <button onClick={dismissHint} aria-label="Ẩn gợi ý" className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Nút "Về giữa" — kéo hình lệch/mất thì bấm để đưa về chính giữa. Đặt trên phải, dưới nút
              mở bảng giải bài (mobile), tránh đè thanh nhập/bộ chuyển câu ở giữa-dưới. */}
          <button
            onClick={() => cameraContext?.resetCamera()}
            aria-label="Đưa hình về giữa"
            title="Đưa hình về giữa"
            className="absolute top-20 right-4 lg:top-4 z-20 h-11 w-11 rounded-full glass border border-border/50 shadow-md flex items-center justify-center text-foreground/80 hover:text-primary hover:border-primary/40 active:scale-95 transition"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
