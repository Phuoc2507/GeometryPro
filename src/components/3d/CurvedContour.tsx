import { useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { silhouetteOffsets, splitHorizontalCircle } from '@/lib/geometry/contour';

/**
 * Textbook contours for upright curved solids (axis = local +Y). A base circle
 * is drawn with its camera-facing arc solid and its far arc dashed when the
 * body hides it; the lateral silhouette generators are drawn solid. All arcs are
 * recomputed each frame from the camera, in the group's local frame.
 */

type FatLine = {
  geometry: { setPositions: (positions: number[]) => void };
  computeLineDistances: () => void;
};

const ARC = 48;
const atY = (points: THREE.Vector3[], y: number): number[] => points.flatMap((p) => [p.x, y, p.z]);

/** A horizontal circle at local height `y`, split into solid front / dashed-back. */
export function ContourCircle({
  groupRef, radius, y, color, opacity, lineWidth = 1.5, hiddenWhen,
}: {
  groupRef: RefObject<THREE.Object3D | null>;
  radius: number;
  y: number;
  color: string;
  opacity: number;
  lineWidth?: number;
  /** Given the camera in local space, is the far arc hidden by the body? */
  hiddenWhen: (localCam: THREE.Vector3) => boolean;
}) {
  const frontRef = useRef<ComponentRef<typeof Line>>(null);
  const backRef = useRef<ComponentRef<typeof Line>>(null);
  const [dashed, setDashed] = useState(true);
  const localCam = useMemo(() => new THREE.Vector3(), []);
  const initial = useMemo(() => {
    const arcs = splitHorizontalCircle(radius, new THREE.Vector3(0, 0, 1), ARC);
    const map = (pts: THREE.Vector3[]) => pts.map((p) => [p.x, y, p.z] as [number, number, number]);
    return { front: map(arcs.front), back: map(arcs.back) };
  }, [radius, y]);

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group) return;
    localCam.copy(camera.position);
    group.worldToLocal(localCam);
    const arcs = splitHorizontalCircle(radius, localCam, ARC);
    (frontRef.current as FatLine | null)?.geometry.setPositions(atY(arcs.front, y));
    const back = backRef.current as FatLine | null;
    back?.geometry.setPositions(atY(arcs.back, y));
    const hidden = hiddenWhen(localCam);
    if (hidden !== dashed) setDashed(hidden);
    if (hidden) back?.computeLineDistances();
  });

  return (
    <>
      <Line ref={frontRef} points={initial.front} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
      <Line
        ref={backRef}
        points={initial.back}
        color={color}
        lineWidth={lineWidth}
        dashed={dashed}
        dashSize={0.18}
        gapSize={0.14}
        transparent
        opacity={opacity * 0.9}
      />
    </>
  );
}

/** The two lateral silhouette generators between `yBottom` and `yTop`. When
 *  `converge` is set (a cone), both meet at the apex point on the axis. */
export function SilhouetteGenerators({
  groupRef, radius, yBottom, yTop, converge = false, color, opacity, lineWidth = 1.5,
}: {
  groupRef: RefObject<THREE.Object3D | null>;
  radius: number;
  yBottom: number;
  yTop: number;
  converge?: boolean;
  color: string;
  opacity: number;
  lineWidth?: number;
}) {
  const leftRef = useRef<ComponentRef<typeof Line>>(null);
  const rightRef = useRef<ComponentRef<typeof Line>>(null);
  const localCam = useMemo(() => new THREE.Vector3(), []);
  const initial: [number, number, number][] = [[0, yBottom, 0], [0, yTop, 0]];

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group) return;
    localCam.copy(camera.position);
    group.worldToLocal(localCam);
    const [left, right] = silhouetteOffsets(radius, localCam);
    const topLeft = converge ? [0, yTop, 0] : [left.x, yTop, left.z];
    const topRight = converge ? [0, yTop, 0] : [right.x, yTop, right.z];
    (leftRef.current as FatLine | null)?.geometry.setPositions([left.x, yBottom, left.z, ...topLeft]);
    (rightRef.current as FatLine | null)?.geometry.setPositions([right.x, yBottom, right.z, ...topRight]);
  });

  return (
    <>
      <Line ref={leftRef} points={initial} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
      <Line ref={rightRef} points={initial} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
    </>
  );
}
