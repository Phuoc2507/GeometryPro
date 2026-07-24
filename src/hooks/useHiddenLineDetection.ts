import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeometryData } from '@/types/geometry';
import {
  buildOcclusionMesh,
} from '@/lib/geometry/extractFaces';
import {
  createOcclusionModel,
  getDesiredHiddenState,
  HIDDEN_LINE_SAMPLE_T_VALUES,
} from '@/lib/geometry/hiddenLineDetection';

const EMPTY_FACE_SET = new Set<number>();
const MAX_DETECTION_FPS = 30;
const CAMERA_QUATERNION_EPSILON = 5e-5;

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
  const desired = getDesiredHiddenState(currentlyHidden, occludedSamples);
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
  const lastDetectionTimeRef = useRef(Number.NEGATIVE_INFINITY);
  const raycasterRef = useRef(new THREE.Raycaster());
  const samplePointRef = useRef(new THREE.Vector3());
  const directionRef = useRef(new THREE.Vector3());
  const intersectionsRef = useRef<THREE.Intersection[]>([]);

  const model = useMemo(
    () => geometry ? createOcclusionModel(geometry) : null,
    [geometry],
  );
  const occlusionMesh = useMemo(
    () => buildOcclusionMesh(model?.triangles ?? []),
    [model],
  );
  useEffect(() => () => {
    if (!occlusionMesh) return;
    occlusionMesh.geometry.dispose();
    const material = occlusionMesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material.dispose();
  }, [occlusionMesh]);

  useEffect(() => {
    lastCameraPosRef.current.set(Number.POSITIVE_INFINITY, 0, 0);
    candidatesRef.current.clear();
    if (!geometry || !model || model.faces.length === 0 || !occlusionMesh) {
      const empty = new Map<string, boolean>();
      publishedRef.current = empty;
      setHiddenLines((previous) => previous.size === 0 ? previous : empty);
    }
  }, [geometry, model, occlusionMesh]);

  useFrame(({ camera, clock }) => {
    if (!geometry || !model || model.faces.length === 0 || !occlusionMesh) return;
    const now = clock.elapsedTime;
    if (candidatesRef.current.size === 0
      && now - lastDetectionTimeRef.current < 1 / MAX_DETECTION_FPS) {
      return;
    }
    const positionDifference = lastCameraPosRef.current.distanceTo(camera.position);
    const quaternionDifference = 1 - Math.abs(lastCameraQuatRef.current.dot(camera.quaternion));
    const positionEpsilon = Math.max(model.epsilon * 5, 1e-5);
    if (positionDifference < positionEpsilon
      && quaternionDifference < CAMERA_QUATERNION_EPSILON
      && candidatesRef.current.size === 0) {
      return;
    }
    lastDetectionTimeRef.current = now;
    lastCameraPosRef.current.copy(camera.position);
    lastCameraQuatRef.current.copy(camera.quaternion);

    const currentMap = publishedRef.current;
    const nextMap = new Map<string, boolean>();
    const nextCandidates = new Map<string, CandidateState>();
    const raycaster = raycasterRef.current;
    const samplePoint = samplePointRef.current;
    const direction = directionRef.current;
    const intersections = intersectionsRef.current;
    const epsilon = model.epsilon;

    for (const line of geometry.lines) {
      const from = model.pointMap.get(line.from);
      const to = model.pointMap.get(line.to);
      if (!from || !to) {
        nextMap.set(line.id, false);
        continue;
      }

      const adjacentFaces = model.edgeToFaceIndices.get(line.id) ?? EMPTY_FACE_SET;
      let occludedCount = 0;
      const current = currentMap.get(line.id) ?? false;
      for (const sample of HIDDEN_LINE_SAMPLE_T_VALUES) {
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
          const faceIndex = model.triangles[triangleIndex]?.faceIndex;
          if (faceIndex != null && adjacentFaces.has(faceIndex)) continue;
          if (intersection.distance < distance - epsilon) {
            occluded = true;
            break;
          }
        }
        if (occluded) occludedCount++;
        // Stop when the current state can no longer change. This avoids up to
        // half the raycasts for lines whose classification is already clear.
        if ((!current && getDesiredHiddenState(false, occludedCount))
          || (current && occludedCount >= 2)) {
          break;
        }
      }

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
