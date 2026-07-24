import React, { useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { Curve3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';

interface AnimatedCurveProps {
  curve: Curve3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
}

export function AnimatedCurve({ curve, delay, isBuilding, opacityFactor = 1 }: AnimatedCurveProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(1);
  const [hovered, setHovered] = useState(false);
  const defaultColor = useMemo(() => getCssHslVar('--foreground'), []);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;
  const DURATION = 1000;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      const p = Math.max(0, Math.min(1, (t - delay) / DURATION));
      if (progress !== p) setProgress(p);
      if (visible !== (t >= delay)) setVisible(t >= delay);
      return;
    }
    if (!isBuilding) {
      if (progress !== 1) setProgress(1);
      if (!visible) setVisible(true);
      return;
    }
    if (visible && progress < 1) {
      setProgress((p) => Math.min(1, p + delta * 1.5));
    }
  });

  const { points, shapeGeometry } = useMemo(() => {
    if (curve.type !== 'parabola' && curve.type !== 'cubic' && curve.type !== 'rational') return { points: [], shapeGeometry: null };
    
    // We can extract xMin and xMax
    let xMin = 0, xMax = 0;
    if (curve.params) {
       xMin = curve.params.xMin || 0;
       xMax = curve.params.xMax || 0;
    }
    
    const steps = 100; // High resolution for perfectly smooth curve
    const pts = [];
    const vec2Pts: THREE.Vector2[] = [];
    
    // We only draw up to 'progress' to animate it being drawn over time
    // But since it's a curve, we draw all points up to current progress
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (t > progress) break;
      const x = xMin + t * (xMax - xMin);
      let y = 0;
      
      if (curve.type === 'parabola') {
        const { a, b, c } = curve.params;
        y = a * x * x + b * x + c;
      } else if (curve.type === 'cubic') {
        const { a, b, c, d } = curve.params;
        y = a * x * x * x + b * x * x + c * x + d;
      } else if (curve.type === 'rational') {
        const { numA, numB, denA, denB } = curve.params;
        y = (numA * x + numB) / (denA * x + denB);
      }
      
      vec2Pts.push(new THREE.Vector2(x, y));
      
      const plane = curve.plane || 'xy';
      if (plane === 'xy') {
        pts.push(new THREE.Vector3(x, 0, y)); // Math (x, y, 0) -> Three (x, 0, y)
      } else if (plane === 'xz') {
        pts.push(new THREE.Vector3(x, y, 0)); // Math (x, 0, z) -> Three (x, z, 0) (where y is z)
      } else if (plane === 'yz') {
        pts.push(new THREE.Vector3(0, y, x)); // Math (0, x, z) -> Three (0, z, x) (where x is y, y is z)
      }
    }
    // ensure at least 2 points for Line
    if (pts.length < 2) {
        if (pts.length === 1) pts.push(pts[0].clone());
        else pts.push(new THREE.Vector3(xMin, 0, 0), new THREE.Vector3(xMin, 0, 0));
    }
    
    let shapeGeo = null;
    if (curve.fill && vec2Pts.length > 2) {
      const shape = new THREE.Shape();
      shape.moveTo(vec2Pts[0].x, 0); // start at bottom
      shape.lineTo(vec2Pts[0].x, vec2Pts[0].y);
      for (let i = 1; i < vec2Pts.length; i++) {
        shape.lineTo(vec2Pts[i].x, vec2Pts[i].y);
      }
      shape.lineTo(vec2Pts[vec2Pts.length - 1].x, 0);
      shape.lineTo(vec2Pts[0].x, 0); // close shape
      shapeGeo = new THREE.ShapeGeometry(shape);
    }

    return { points: pts, shapeGeometry: shapeGeo };
  }, [curve, progress]);

  if (!visible) return null;

  let rotation: [number, number, number] = [0, 0, 0];
  const plane = curve.plane || 'xy';
  if (plane === 'xy') {
    rotation = [Math.PI / 2, 0, 0]; // Math (x, y) -> Three (x, 0, y)
  } else if (plane === 'xz') {
    rotation = [0, 0, 0]; // Math (x, z) -> Three (x, y, 0)
  } else if (plane === 'yz') {
    rotation = [0, -Math.PI / 2, 0]; // Math (y, z) -> Three (0, y, x)
  }

  const handleClick = (e: any) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(curve.id);
    }
  };

  const handlePointerOver = (e: any) => {
    if (!isManualMode || geometryCtx?.state.manualTool !== 'delete') return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'crosshair';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group 
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {shapeGeometry && (
        <mesh geometry={shapeGeometry}>
          <meshBasicMaterial
            color={curve.color || defaultColor}
            transparent
            opacity={(curve.fillOpacity || 0.2) * opacityFactor}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      <Line
        points={points}
        color={curve.color || defaultColor}
        lineWidth={3}
        frustumCulled={false}
        dashed={curve.style === 'dashed'}
        dashSize={0.2}
        gapSize={0.1}
        transparent={opacityFactor < 1}
        opacity={opacityFactor}
      />
    </group>
  );
}
