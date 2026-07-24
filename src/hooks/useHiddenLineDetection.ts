import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeometryData, Point3D } from '@/types/geometry';
import {
  extractFaces,
  triangulateFaces,
  buildOcclusionMesh,
} from '@/lib/geometry/extractFaces';

const SAMPLE_T_VALUES = [0.2, 0.4, 0.6, 0.8] as const;
const EMPTY_FACE_SET = new Set<number>();

function toVector3(point: Point3D): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.z, point.y);
}

export function mapsEqual(left: Map<string, boolean>, right: Map<string, boolean>): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of right) {
    if (left.get(key) !== value) return false;
  }
  return true;
}

interface CandidateState {
  value: boolean;
  count: number;
}

export function nextHiddenCandidate(
  currentlyHidden: boolean,
  occludedSamples: number,
  previous?: CandidateState,
): { hidden: boolean; candidate?: CandidateState } {
  const desired = !currentlyHidden && occludedSamples >= 3
    ? true
    : currentlyHidden && occludedSamples <= 1
      ? false
      : currentlyHidden;
  if (desired === currentlyHidden) return { hidden: currentlyHidden };
  const count = previous?.value === desired ? previous.count + 1 : 1;
  return count >= 2
    ? { hidden: desired }
    : { hidden: currentlyHidden, candidate: { value: desired, count } };
}

export function useHiddenLineDetection(geometry: GeometryData | null): Map<string, boolean> {
  const [hiddenLines, setHiddenLines] = useState<Map<string, boolean>>(new Map());
  const publishedRef = useRef(hiddenLines);
  const candidatesRef = useRef(new Map<string, CandidateState>());
  const lastCameraPosRef = useRef(new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0));
  const lastCameraQuatRef = useRef(new THREE.Quaternion());
  const raycasterRef = useRef(new THREE.Raycaster());
  const samplePointRef = useRef(new THREE.Vector3());
  const directionRef = useRef(new THREE.Vector3());
  const intersectionsRef = useRef<THREE.Intersection[]>([]);

  const faces = useMemo(
    () => geometry ? extractFaces(geometry.points, geometry.lines, geometry.planes ?? []) : [],
    [geometry],
  );
  const triangles = useMemo(() => triangulateFaces(faces), [faces]);
  const occlusionMesh = useMemo(() => buildOcclusionMesh(triangles), [triangles]);
  useEffect(() => () => {
    if (!occlusionMesh) return;
    occlusionMesh.geometry.dispose();
    const material = occlusionMesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material.dispose();
  }, [occlusionMesh]);

  const edgeToFaceIndices = useMemo(() => {
    const map = new Map<string, Set<number>>();
    faces.forEach((face, faceIndex) => {
      for (const edge of face.edges) {
        const indices = map.get(edge) ?? new Set<number>();
        indices.add(faceIndex);
        map.set(edge, indices);
      }
    });
    return map;
  }, [faces]);

  const pointMap = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    for (const point of geometry?.points ?? []) map.set(point.id, toVector3(point));
    return map;
  }, [geometry]);

  const bboxSize = useMemo(() => {
    if (!geometry?.points.length) return 1;
    const box = new THREE.Box3();
    for (const point of geometry.points) box.expandByPoint(toVector3(point));
    const size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.y, size.z, 0.1);
  }, [geometry]);

  useEffect(() => {
    lastCameraPosRef.current.set(Number.POSITIVE_INFINITY, 0, 0);
    candidatesRef.current.clear();
    if (!geometry || faces.length === 0 || !occlusionMesh) {
      const empty = new Map<string, boolean>();
      publishedRef.current = empty;
      setHiddenLines((previous) => previous.size === 0 ? previous : empty);
    }
  }, [faces.length, geometry, occlusionMesh]);

  useFrame(({ camera }) => {
    if (!geometry || faces.length === 0 || !occlusionMesh) return;
    const positionDifference = lastCameraPosRef.current.distanceTo(camera.position);
    const quaternionDifference = 1 - Math.abs(lastCameraQuatRef.current.dot(camera.quaternion));
    if (positionDifference < 0.01 && quaternionDifference < 0.01 && candidatesRef.current.size === 0) return;
    lastCameraPosRef.current.copy(camera.position);
    lastCameraQuatRef.current.copy(camera.quaternion);

    const currentMap = publishedRef.current;
    const nextMap = new Map<string, boolean>();
    const nextCandidates = new Map<string, CandidateState>();
    const raycaster = raycasterRef.current;
    const samplePoint = samplePointRef.current;
    const direction = directionRef.current;
    const intersections = intersectionsRef.current;
    const epsilon = bboxSize * 1e-2;

    for (const line of geometry.lines) {
      const from = pointMap.get(line.from);
      const to = pointMap.get(line.to);
      if (!from || !to) {
        nextMap.set(line.id, false);
        continue;
      }

      const adjacentFaces = edgeToFaceIndices.get(line.id) ?? EMPTY_FACE_SET;
      let occludedCount = 0;
      for (const sample of SAMPLE_T_VALUES) {
        samplePoint.copy(from).lerp(to, sample);
        direction.copy(samplePoint).sub(camera.position);
        const distance = direction.length();
        if (distance <= 1e-8) continue;
        direction.multiplyScalar(1 / distance);
        raycaster.set(camera.position, direction);
        raycaster.far = distance + epsilon;
        intersections.length = 0;
        raycaster.intersectObject(occlusionMesh, false, intersections);

        let occluded = false;
        for (const intersection of intersections) {
          const triangleIndex = intersection.faceIndex;
          if (triangleIndex == null) continue;
          const faceIndex = triangles[triangleIndex]?.faceIndex;
          if (faceIndex != null && adjacentFaces.has(faceIndex)) continue;
          if (intersection.distance < distance - epsilon) {
            occluded = true;
            break;
          }
        }
        if (occluded) occludedCount++;
      }

      const current = currentMap.get(line.id) ?? false;
      const transition = nextHiddenCandidate(
        current,
        occludedCount,
        candidatesRef.current.get(line.id),
      );
      nextMap.set(line.id, transition.hidden);
      if (transition.candidate) nextCandidates.set(line.id, transition.candidate);
    }

    candidatesRef.current = nextCandidates;
    if (!mapsEqual(currentMap, nextMap)) {
      publishedRef.current = nextMap;
      setHiddenLines(nextMap);
    }
  });

  return hiddenLines;
}
