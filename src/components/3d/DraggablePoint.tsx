import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Point3D, Line3D } from '@/types/geometry';
import { useGeometryOptional } from '@/context/GeometryContext';

function sanitizeLabel(label: string): string {
  if (!label) return '';
  const subscriptMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j',
    'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₒ': 'o',
    'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u',
    'ᵥ': 'v', 'ₓ': 'x',
  };
  const superscriptMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    'ⁿ': 'n', '′': "'", '″': '"',
  };
  return label.replace(/./g, (ch) => subscriptMap[ch] || superscriptMap[ch] || ch);
}

const SNAP_DISTANCE = 0.5; // snap threshold in world units

interface DraggablePointProps {
  point: Point3D;
  allPoints: Point3D[];
  allLines: Line3D[];
  delay: number;
  isBuilding: boolean;
}

/**
 * Find the closest point on a line segment (in Three.js coords) to a given position.
 */
function closestPointOnSegment(
  pos: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3
): { point: THREE.Vector3; distance: number } {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ap = new THREE.Vector3().subVectors(pos, a);
  const lenSq = ab.lengthSq();
  if (lenSq < 0.0001) return { point: a.clone(), distance: pos.distanceTo(a) };
  let t = ap.dot(ab) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = a.clone().add(ab.multiplyScalar(t));
  return { point: closest, distance: pos.distanceTo(closest) };
}

export function DraggablePoint({ point, allPoints, allLines, delay, isBuilding }: DraggablePointProps) {
  const context = useGeometryOptional();
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const { camera, gl, raycaster } = useThree();
  const dragPlane = useRef(new THREE.Plane());
  const offset = useRef(new THREE.Vector3());

  const isManualMode = context?.state.manualMode ?? false;

  useEffect(() => {
    if (!isBuilding) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay, isBuilding]);

  // Change cursor when hovering in manual mode
  useEffect(() => {
    if (isManualMode && hovered) {
      gl.domElement.style.cursor = 'grab';
    } else if (isManualMode && isDragging) {
      gl.domElement.style.cursor = 'grabbing';
    } else {
      gl.domElement.style.cursor = '';
    }
    return () => { gl.domElement.style.cursor = ''; };
  }, [hovered, isDragging, isManualMode, gl]);

  const onPointerDown = useCallback((e: any) => {
    if (!isManualMode || !context) return;
    e.stopPropagation();

    // If a tool (other than addPoint) is active, click selects instead of dragging
    if (context.state.manualTool !== null && context.state.manualTool !== 'addPoint' && context.state.manualTool !== 'equation') {
      context.toggleSelection(point.id);
      return;
    }

    setIsDragging(true);

    // Create a plane facing the camera at the point's position
    const pos = new THREE.Vector3(point.x, point.z, point.y); // math -> three
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    dragPlane.current.setFromNormalAndCoplanarPoint(camDir, pos);

    // Calculate offset
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersect);
    if (intersect) {
      offset.current.subVectors(pos, intersect);
    }

    // Capture pointer
    (e.target as any)?.setPointerCapture?.(e.pointerId);
  }, [isManualMode, context, point, camera, raycaster]);

  const onPointerMove = useCallback((e: any) => {
    if (!isDragging || !context) return;
    e.stopPropagation();

    // Update raycaster from mouse
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersect);
    if (!intersect) return;

    let newPos = intersect.add(offset.current);

    // Try snap to nearest line
    let snapped = false;
    let bestDist = SNAP_DISTANCE;
    let bestSnapPos = newPos.clone();

    for (const line of allLines) {
      // Skip lines connected to this point
      if (line.from === point.id || line.to === point.id) continue;

      const fromPt = allPoints.find(p => p.id === line.from);
      const toPt = allPoints.find(p => p.id === line.to);
      if (!fromPt || !toPt) continue;

      // Convert to Three.js coords (swap y<->z)
      const a = new THREE.Vector3(fromPt.x, fromPt.z, fromPt.y);
      const b = new THREE.Vector3(toPt.x, toPt.z, toPt.y);

      const result = closestPointOnSegment(newPos, a, b);
      if (result.distance < bestDist) {
        bestDist = result.distance;
        bestSnapPos = result.point;
        snapped = true;
      }
    }

    if (snapped) {
      newPos = bestSnapPos;
    }

    // Snap to 0.5 grid if not snapping to line
    if (!snapped) {
      newPos.x = Math.round(newPos.x * 2) / 2;
      newPos.y = Math.round(newPos.y * 2) / 2;
      newPos.z = Math.round(newPos.z * 2) / 2;
    }

    // Update position visually
    if (groupRef.current) {
      groupRef.current.position.set(newPos.x, newPos.y, newPos.z);
    }

    // Convert Three.js -> math coords and update
    const mathX = snapped ? newPos.x : newPos.x;
    const mathY = snapped ? newPos.z : newPos.z; // three.z -> math.y
    const mathZ = snapped ? newPos.y : newPos.y; // three.y -> math.z

    // Round for display
    const rx = Math.round(mathX * 100) / 100;
    const ry = Math.round(mathY * 100) / 100;
    const rz = Math.round(mathZ * 100) / 100;

    context.updatePoint(point.id, rx, ry, rz);
  }, [isDragging, context, gl, camera, raycaster, allLines, allPoints, point.id]);

  const onPointerUp = useCallback((e: any) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as any)?.releasePointerCapture?.(e.pointerId);
  }, [isDragging]);

  const showPoints = context?.state.showPoints ?? true;
  const isIntermediate = !point.label && (point.id.startsWith('P') || point.id.startsWith('curve_'));
  const shouldHide = point.hidden || !showPoints || isIntermediate;

  if (shouldHide) return null;

  const isSelected = context?.state.selectedIds.includes(point.id);
  const displayColor = isSelected ? '#f97316' : isDragging ? '#fbbf24' : hovered && isManualMode && (context?.state.manualTool === null || context?.state.manualTool === 'addPoint') ? '#34d399' : '#60a5fa';

  // Swap Y and Z: Math uses Z as height (Oxyz), Three.js uses Y as height
  return (
    <group
      ref={groupRef}
      position={[point.x, point.z, point.y]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => { setHovered(false); if (!isDragging) gl.domElement.style.cursor = ''; }}
    >
      {/* Highlight glow if selected */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Point Sphere - larger hit area in manual mode */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[isManualMode ? 0.12 : 0.08, 16, 16]} />
        <meshBasicMaterial color={displayColor} />
      </mesh>

      {/* Snap indicator ring */}
      {isDragging && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[SNAP_DISTANCE - 0.02, SNAP_DISTANCE + 0.02, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      {point.label && (
        <Html position={[0, 0, 0]} center distanceFactor={12} zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div 
            style={{
              transform: `translate(15px, -20px)`,
              pointerEvents: 'none',
            }}
          >
            <span className="math-label" style={{
              color: 'hsl(var(--foreground))',
              fontSize: '18px',
              WebkitTextStroke: '3px hsl(var(--background))',
              paintOrder: 'stroke fill',
              whiteSpace: 'nowrap'
            }}>
              {sanitizeLabel(point.label)}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
