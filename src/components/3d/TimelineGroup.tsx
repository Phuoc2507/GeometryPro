import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimationOptional } from '@/context/AnimationContext';
import { AnimationTrack } from '@/types/geometry';

interface Props {
  tracks: AnimationTrack[];
  children: React.ReactNode;
}

export function TimelineGroup({ tracks, children }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const animCtx = useAnimationOptional();

  const translateTracks = tracks.filter(t => t.type === 'translate');

  useFrame(() => {
    if (!groupRef.current || !animCtx) return;

    const t = animCtx.globalTimeRef.current / 1000;
    
    let currentPos = new THREE.Vector3(0, 0, 0);

    for (const track of translateTracks) {
      if (t >= track.start && t <= track.end) {
        try {
          const fnString = track.params.displacement_function || track.params.D;
          // Example: "D(t) = [0.4*t, 0.2*t, 0]"
          if (fnString) {
            const expression = fnString.replace('D(t) =', '').trim().replace('[', '').replace(']', '');
            // "0.4*t, 0.2*t, 0"
            const parts = expression.split(',').map((p: string) => p.trim());
            
            const funcX = new Function('t', `return ${parts[0]}`);
            const funcY = new Function('t', `return ${parts[1]}`);
            const funcZ = new Function('t', `return ${parts[2]}`);
            
            // Note: in three.js, Y is up, but in geo3d Z is up.
            // displacement = [x, y, z] in geo3d. So in three.js it's (x, z, y).
            currentPos.set(funcX(t), funcZ(t), funcY(t));
          }
        } catch (e) {
          console.warn("Error evaluating translation function", e);
        }
        break;
      } else if (t > track.end) {
        if (track.params.final_position) {
          const fp = track.params.final_position;
          currentPos.set(fp[0], fp[2], fp[1]);
        }
      }
    }

    groupRef.current.position.copy(currentPos);
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
}
