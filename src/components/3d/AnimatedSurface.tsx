import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import * as THREE from 'three';
import { Surface3D } from '@/types/geometry';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

interface Props {
  surface: Surface3D;
  delay: number;
  isBuilding: boolean;
}

export function AnimatedSurface({ surface, delay, isBuilding }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(isBuilding ? 0 : 1);

  const color = surface.color || '#8b5cf6';
  const opacity = surface.opacity ?? 0.3;
  const { x: cx, y: cy, z: cz } = surface.center;

  const geometry = useMemo(() => {
    const segments = 32;

    const paramFunc = (u: number, v: number, target: THREE.Vector3) => {
      const uAngle = u * Math.PI * 2;
      const p = surface.params;

      switch (surface.type) {
        case 'paraboloid': {
          const a = p.a || 2;
          const h = p.h || 4;
          // r goes from 0 to a, height = (r/a)² * h
          const r = v * a;
          const px = r * Math.cos(uAngle);
          const py = r * Math.sin(uAngle);
          const pz = (r * r / (a * a)) * h;
          target.set(px, pz, py); // swap y/z for Three.js
          break;
        }
        case 'hyperboloid': {
          const a = p.a || 1;
          const b = p.b || 1;
          const c = p.c || 2;
          const vMin = p.vMin ?? -2;
          const vMax = p.vMax ?? 2;
          const vRange = vMin + v * (vMax - vMin);
          const coshV = Math.cosh(vRange);
          const sinhV = Math.sinh(vRange);
          const px = a * coshV * Math.cos(uAngle);
          const py = b * coshV * Math.sin(uAngle);
          const pz = c * sinhV;
          target.set(px, pz, py);
          break;
        }
        case 'torus': {
          const R = p.R || 2; // major radius
          const r = p.r || 0.5; // minor radius
          const vAngle = v * Math.PI * 2;
          const px = (R + r * Math.cos(vAngle)) * Math.cos(uAngle);
          const py = (R + r * Math.cos(vAngle)) * Math.sin(uAngle);
          const pz = r * Math.sin(vAngle);
          target.set(px, pz, py);
          break;
        }
        case 'revolution': {
          // Generic surface of revolution: rotate curve f(t) around z-axis
          const rFunc = p.r0 || 1; // base radius
          const h = p.h || 4;
          const t = v; // 0..1
          // Default: cone-like linear profile
          const r = rFunc * (1 - t * (p.taper || 0));
          const px = r * Math.cos(uAngle);
          const py = r * Math.sin(uAngle);
          const pz = t * h;
          target.set(px, pz, py);
          break;
        }
        default:
          target.set(0, 0, 0);
      }
    };

    return new ParametricGeometry(paramFunc, segments, segments);
  }, [surface.type, surface.params]);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      progressRef.current = Math.max(0, Math.min(1, (t - delay) / 300));
      if (groupRef.current) groupRef.current.scale.setScalar(progressRef.current);
      return;
    }

    if (!isBuilding) { 
      if (progressRef.current !== 1) {
        progressRef.current = 1; 
        if (groupRef.current) groupRef.current.scale.setScalar(1);
      }
      return; 
    }
    
    // Fallback
    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 3);
      if (groupRef.current) groupRef.current.scale.setScalar(progressRef.current);
    }
  });

  return (
    <group ref={groupRef} position={[cx, cz, cy]}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity}
          transmission={0.6}
          roughness={0.2}
          metalness={0.1}
          side={THREE.DoubleSide}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    </group>
  );
}
