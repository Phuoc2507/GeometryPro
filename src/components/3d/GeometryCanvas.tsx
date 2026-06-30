import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GeometryRenderer } from './GeometryRenderer';
import { CoordinateGridPlanes } from './CoordinateGridPlanes';
import { ClickToPlacePoint } from './ClickToPlacePoint';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional } from '@/context/CameraContext';
import { scaleGeometry } from '@/lib/geometry/scaleGeometry';

function CameraFitter({ geometry, is2D }: { geometry: any; is2D?: boolean }) {
  const { camera, size: canvasSize } = useThree();
  const controlsRef = useRef<any>(null);
  const prevNameRef = useRef<string>('');

  useEffect(() => {
    if (!geometry?.points?.length) return;
    const name = geometry.name || '';
    if (name === prevNameRef.current) return; // only fit on new geometry
    prevNameRef.current = name;

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
    const dist = size * 1.5 + 4;

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
      camera.position.set(cx + dist * 0.55, cy + dist * 0.55, cz + dist * 0.75);
      camera.up.set(0, 1, 0);
      camera.lookAt(cx, cy, cz);
    }
    camera.updateProjectionMatrix();
  }, [geometry, camera, is2D, canvasSize]);

  return null;
}

function CameraTracker({ target }: { target: [number, number, number] }) {
  const { camera } = useThree();
  const cameraContext = useCameraOptional();

  const lastPos = useRef(new THREE.Vector3());
  const lastTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    if (cameraContext) {
      const pos = camera.position;
      const targetVec = new THREE.Vector3(...target);

      const distPos = pos.distanceTo(lastPos.current);
      const distTarget = targetVec.distanceTo(lastTarget.current);

      if (distPos > 0.01 || distTarget > 0.01) {
        cameraContext.setCameraState({
          position: [pos.x, pos.y, pos.z],
          target: target
        });
        lastPos.current.copy(pos);
        lastTarget.current.copy(targetVec);
      }
    }
  });

  return null;
}

interface SceneProps {
  geometry: any;
  isBuilding: boolean;
  autoRotate?: boolean;
  is2D?: boolean;
}

function Scene({ geometry, isBuilding, autoRotate = false, is2D = false }: SceneProps) {
  const cameraContext = useCameraOptional();

  // Calculate the centroid (center of mass) of the geometry
  // and convert math coords (z=up) to Three.js (y=up)
  const centroid = useMemo(() => {
    if (!geometry || !geometry.points || geometry.points.length === 0) return [0, 1.5, 0] as [number, number, number];

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

    if (validCount === 0) return [0, 1.5, 0] as [number, number, number];

    return [sx / validCount, sy / validCount, sz / validCount] as [number, number, number];
  }, [geometry]);

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

  return (
    <>
      {/* Camera Tracker with Dynamic Target */}
      <CameraTracker target={centroid} />
      <CameraFitter geometry={geometry} is2D={is2D} />

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
      <CoordinateGridPlanes showXY showXZ={false} showYZ={false} size={gridSize} is2D={is2D} unit={geometry?.axisUnit} />

      {/* Geometry */}
      <GeometryRenderer geometry={geometry} isBuilding={isBuilding} />

      {/* Click to place point in manual mode */}
      <ClickToPlacePoint />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        target={centroid}
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

export function GeometryCanvas() {
  const cameraContext = useCameraOptional();
  const geometryContext = useGeometryOptional();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const geometry = geometryContext?.state.geometry;
  const isBuilding = geometryContext?.state.isBuilding ?? false;
  const autoRotate = geometryContext?.state.autoRotate ?? false;

  const is2D = useMemo(() => {
    return geometry?.tags?.some((t: string) => t.includes('2D')) || false;
  }, [geometry]);

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

  return (
    <div ref={canvasContainerRef} className="absolute inset-0">
      <Canvas
        orthographic={is2D}
        camera={{ position: is2D ? [0, 10, 0] : [6, 5, 8], fov: 50, zoom: is2D ? 50 : 1 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        style={{ background: 'transparent' }}
      >
        <Scene geometry={scaledGeometry} isBuilding={isBuilding} autoRotate={autoRotate} is2D={is2D} />
      </Canvas>
    </div>
  );
}
