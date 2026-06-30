import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimationOptional } from '@/context/AnimationContext';
import { AnimationTrack } from '@/types/geometry';

interface Props {
  tracks: AnimationTrack[];
}

export function AnimatedWater({ tracks }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const animCtx = useAnimationOptional();

  // Filter out the tracks related to water
  const waterTracks = (tracks || []).filter(t => t.type === 'water_level');

  useFrame(() => {
    if (!meshRef.current || !animCtx) return;

    // Convert ms to seconds
    const t = animCtx.globalTimeRef.current / 1000;
    let currentZ = 0;
    
    // Find active track for current time
    for (const track of waterTracks) {
      if (t >= track.start && t <= track.end) {
        // Evaluate the height function. 
        // e.g., "0.3 * t" or "0.9 - 0.3 * (t - 3)"
        try {
          // Replace 't' with the local track time or global time depending on convention.
          // The python code says h(t) = 0.3 * t for 0..3, and 0.9 - 0.3*(t-3) for 3..6.
          // We can use a simple generic eval or predefined mapping for safety.
          // Since it's a demo, we can just hardcode the eval safely.
          const fnString = track.params.height_function || track.params.h;
          if (fnString) {
            // Replace `t` in string with actual value of `t`
            // Simple approach: new Function('t', `return ${fnString.replace('h(t) = ', '')}`)
            const expression = fnString.replace('h(t) = ', '').trim();
            const func = new Function('t', `return ${expression}`);
            currentZ = func(t);
          }
        } catch (e) {
          console.warn("Error evaluating water function", e);
        }
        break; // Only apply the first matching track
      } else if (t > track.end) {
        // Hold at final value if past end
        if (track.params.final_height !== undefined) {
          currentZ = track.params.final_height;
        } else if (track.params.max_height !== undefined) {
          currentZ = track.params.max_height;
        }
      }
    }

    // Apply Z scale and position
    // If water goes from 0 to currentZ, its center is at currentZ / 2, and height is currentZ.
    // Wait, let's just make it a Box that scales up from z=0.
    if (currentZ > 0.001) {
      meshRef.current.visible = true;
      meshRef.current.scale.set(1, currentZ, 1);
      meshRef.current.position.set(0, currentZ / 2, 0); // Swap y/z for Three.js: (x, z, y) -> wait, three.js y is UP
      // BoxGeometry default centered.
      meshRef.current.position.y = currentZ / 2;
    } else {
      meshRef.current.visible = false;
    }
  });

  if (waterTracks.length === 0) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[0, Math.PI / 6, 0]} visible={false}>
      <cylinderGeometry args={[2, 2, 1, 6]} />
      <meshPhysicalMaterial
        color="#3b82f6"
        transmission={0.8}
        opacity={1}
        transparent={true}
        roughness={0.2}
        metalness={0}
        ior={1.33}
        depthWrite={false}
      />
    </mesh>
  );
}
