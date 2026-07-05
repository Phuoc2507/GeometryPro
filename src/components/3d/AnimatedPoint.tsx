import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Point3D } from '@/types/geometry';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';

// Convert unicode subscript/superscript chars to regular text for font compatibility
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

interface AnimatedPointProps {
  point: Point3D;
  delay: number;
  isBuilding: boolean;
  highlighted?: boolean;
}

export function AnimatedPoint({ point, delay, isBuilding, highlighted = false }: AnimatedPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(true);
  const [currentScale, setCurrentScale] = useState(1);
  const [textProgress, setTextProgress] = useState(1);
  const [targetScale, setTargetScale] = useState(1);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;
  const showPoints = geometryCtx?.state.showPoints ?? true;
  const DURATION = 300; // ms to scale up

  // Hide logic
  // Hide if global showPoints is false, OR if it's an intermediate point (no label and id starts with P or curve)
  const isIntermediate = !point.label && (point.id.startsWith('P') || point.id.startsWith('curve_'));
  const shouldHide = point.hidden || !showPoints || isIntermediate;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      const s = Math.max(0, Math.min(1, (t - delay) / DURATION));
      
      const TEXT_START = delay + DURATION - 100;
      const tp = Math.max(0, Math.min(1, (t - TEXT_START) / 300));

      if (currentScale !== s) setCurrentScale(s);
      if (textProgress !== tp) setTextProgress(tp);
      if (visible !== (t >= delay)) setVisible(t >= delay);
    } else if (!isBuilding) {
      if (currentScale !== 1) setCurrentScale(1);
      if (textProgress !== 1) setTextProgress(1);
      if (!visible) setVisible(true);
    }
    
    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScale);
    }
  });

  const pointColor = highlighted ? '#f97316' : '#60a5fa';
  const pointRadius = highlighted ? 0.12 : 0.08;

  if (shouldHide) return null;

  return (
    <group position={[point.x, point.z, point.y]}>
      {/* Halo effect for highlighted/selected points */}
      {highlighted && (
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

      {/* Main point sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[pointRadius, 16, 16]} />
        <meshBasicMaterial color={pointColor} />
      </mesh>

        <Html position={[0, 0, 0]} center distanceFactor={12} zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            transform: `translate(15px, -20px)`, // offset to top-right
            opacity: textProgress,
            pointerEvents: 'none',
          }}>
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
    </group>
  );
}
