import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Sphere, Html } from '@react-three/drei';
import { Sphere3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';

function sanitizeLabel(label: string): string {
  if (!label) return '';
  const subscriptMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  };
  const superscriptMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '′': "'",
  };
  return label.replace(/./g, (ch) => subscriptMap[ch] || superscriptMap[ch] || ch);
}

interface AnimatedSphereProps {
  sphere: Sphere3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
}

export function AnimatedSphere({ sphere, delay, isBuilding, opacityFactor = 1 }: AnimatedSphereProps) {
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);

  const sphereColor = useMemo(() => getCssHslVar('--primary'), []);
  const labelColor = useMemo(() => getCssHslVar('--foreground'), []);

  useEffect(() => {
    if (isBuilding) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
      setScale(1);
    }
  }, [delay, isBuilding]);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      const s = Math.max(0, Math.min(1, (t - delay) / 500));
      if (scale !== s) setScale(s);
      if (visible !== (t >= delay)) setVisible(t >= delay);
      return;
    }

    if (!isBuilding) {
      if (scale !== 1) setScale(1);
      if (!visible) setVisible(true);
      return;
    }

    if (visible && scale < 1) {
      setScale((prev) => Math.min(prev + delta * 2, 1));
    }
  });

  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  const { center, radius, label } = sphere;
  const currentRadius = radius * scale;

  const handleClick = (e: any) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(sphere.id);
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
      position={[center.x, center.z, center.y]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Wireframe sphere — sparse for visibility */}
      <Sphere args={[currentRadius, 16, 10]}>
        <meshBasicMaterial
          color={sphereColor}
          wireframe
          transparent
          opacity={0.3 * opacityFactor}
          depthWrite={false}
        />
      </Sphere>

      {/* Semi-transparent fill (Frosted Glass) */}
      <Sphere args={[currentRadius * 0.99, 32, 32]}>
        <meshStandardMaterial
          color={sphereColor}
          transparent
          opacity={0.3 * opacityFactor}
          roughness={0.2}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </Sphere>

      {/* Label at center */}
      {label && (
        <Html position={[0, 0, 0]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <span className="math-label" style={{
            color: labelColor,
            fontSize: '16px',
          }}>
            {sanitizeLabel(label)}
          </span>
        </Html>
      )}
    </group>
  );
}
