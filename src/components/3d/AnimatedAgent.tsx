import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimationOptional } from '@/context/AnimationContext';
import { Agent3D, AnimationTrack } from '@/types/geometry';

interface Props {
  agent: Agent3D;
  tracks: AnimationTrack[];
}

export function AnimatedAgent({ agent, tracks }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const animCtx = useAnimationOptional();

  // Filter tracks specific to this agent
  const agentTracks = tracks.filter(t => t.targetId === agent.id);
  const tentTracks = tracks.filter(t => t.type === 'translate');

  useFrame(() => {
    if (!meshRef.current || !animCtx) return;
    const t = animCtx.globalTimeRef.current / 1000;

    let currentPos = new THREE.Vector3(agent.initialPosition[0], agent.initialPosition[2], agent.initialPosition[1]);

    // 1. Base translation: if it's on the tent, it moves with the tent until a certain time
    // For simplicity, let's assume it follows tent translation until its specific track starts
    let basePos = new THREE.Vector3().copy(currentPos);
    
    // Apply tent translation ONLY if agent is rescuer
    if (agent.id === 'rescuer') {
      for (const track of tentTracks) {
      if (t >= track.start && t <= track.end) {
        try {
          const fnString = track.params.displacement_function || track.params.D;
          if (fnString) {
            const expression = fnString.replace('D(t) =', '').trim().replace('[', '').replace(']', '');
            const parts = expression.split(',').map((p: string) => p.trim());
            const funcX = new Function('t', `return ${parts[0]}`);
            const funcY = new Function('t', `return ${parts[1]}`);
            const funcZ = new Function('t', `return ${parts[2]}`);
            basePos.add(new THREE.Vector3(funcX(t), funcZ(t), funcY(t)));
          }
        } catch (e) {}
      } else if (t > track.end) {
        if (track.params.final_position) {
          const fp = track.params.final_position;
          basePos.add(new THREE.Vector3(fp[0], fp[2], fp[1]));
        }
      }
      } // for loop
    } // if rescuer

    currentPos.copy(basePos);

    // 2. Override with specific agent path if active
    let pathActive = false;
    for (const track of agentTracks) {
      if (track.type === 'parametric_path') {
        if (t >= track.start && t <= track.end) {
          pathActive = true;
          const dt = t - track.start;
          try {
            // Support both old path string and new equations object
            let eq = track.params.equations;
            if (!eq && track.params.path) {
              const parts = track.params.path.split(',').map((s: string) => s.trim());
              eq = {
                x: parts.find((p: string) => p.startsWith('x(t)'))?.split('=')[1]?.trim() || '0',
                y: parts.find((p: string) => p.startsWith('y(t)'))?.split('=')[1]?.trim() || '0',
                z: parts.find((p: string) => p.startsWith('z(t)'))?.split('=')[1]?.trim() || '0',
              };
            }
            if (eq) {
              const cx = track.params.x_start !== undefined ? track.params.x_start : basePos.x;
              const cy = track.params.y_start !== undefined ? track.params.y_start : basePos.z; // Y in geo3d is Z in threejs
              const cz = track.params.z_start !== undefined ? track.params.z_start : basePos.y; // Z in geo3d is Y in threejs
              const vx = track.params.vx || 0;
              const vy = track.params.vy || 0;
              const vz = track.params.vz || 0;

              // e.g. x: "x_start + vx*t", y: "y_start + vy*t", z: "z_start + vz*t - 4.9*t^2"
              // dt is our local time
              const getVal = (expr: string) => {
                const replaced = expr
                  .replace('x_start', cx.toString())
                  .replace('y_start', cy.toString())
                  .replace('z_start', cz.toString())
                  .replace('vx', vx.toString())
                  .replace('vy', vy.toString())
                  .replace('vz', vz.toString())
                  .replace('t^2', '(t*t)');
                const func = new Function('t', `return ${replaced}`);
                return func(dt);
              };

              const x = getVal(eq.x);
              const y = getVal(eq.y);
              const z = getVal(eq.z);

              // Mapping geo3d (x,y,z) to threejs (x,z,y)
              currentPos.set(x, z, y);
            }
          } catch(e) {
            console.warn("Error evaluating parametric path", e);
          }
        } else if (t > track.end) {
          // Stay at end position
          pathActive = true;
          if (track.params.landing_point) {
            const lp = track.params.landing_point;
            currentPos.set(lp[0], lp[2], lp[1]);
          }
        }
      }
    }

    meshRef.current.position.copy(currentPos);
  });

  return (
    <mesh ref={meshRef} position={[agent.initialPosition[0], agent.initialPosition[2], agent.initialPosition[1]]}>
      <sphereGeometry args={[agent.radius || 0.05, 32, 32]} />
      <meshStandardMaterial 
        color={agent.color || "#ff0000"} 
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}
