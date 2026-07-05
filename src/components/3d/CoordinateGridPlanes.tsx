import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';

interface CoordinateGridPlanesProps {
  showXY?: boolean;
  showXZ?: boolean;
  showYZ?: boolean;
  size?: number;
  is2D?: boolean;
  unit?: string;
}

function AxisLabel({ position, label, color }: { position: [number, number, number]; label: string; color: string }) {
  return (
    <Html position={position} center distanceFactor={20} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <span style={{
        color,
        fontWeight: 800,
        fontSize: '13px',
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {label}
      </span>
    </Html>
  );
}

export function CoordinateGridPlanes({
  showXY = true,
  showXZ = false,
  showYZ = false,
  size = 8,
  is2D = false,
  unit,
}: CoordinateGridPlanesProps) {
  const step = 1;
  const halfSize = size / 2;
  const xLabel = unit ? `x (${unit})` : "x";
  const yLabel = unit ? `y (${unit})` : "y";
  const zLabel = unit ? `z (${unit})` : "z";

  // Generate grid lines for a plane
  const generateGridLines = (
    axis1: 'x' | 'y' | 'z',
    axis2: 'x' | 'y' | 'z',
    fixedAxis: 'x' | 'y' | 'z',
    _fixedValue: number
  ) => {
    const lines: [number, number, number][][] = [];
    const makePoint = (a1: number, a2: number): [number, number, number] => {
      const p: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
      p[axis1] = a1;
      p[axis2] = a2;
      p[fixedAxis] = _fixedValue;
      // Convert math coords (z-up) to Three.js (y-up): swap y and z
      return [p.x, p.z, p.y];
    };

    // For 2D mode, we want a much larger grid so panning doesn't run out of grid
    const effectiveSize = is2D ? Math.max(size, 40) : size;
    const effectiveHalfSize = effectiveSize / 2;

    for (let i = -effectiveHalfSize; i <= effectiveHalfSize; i += step) {
      lines.push([makePoint(i, -effectiveHalfSize), makePoint(i, effectiveHalfSize)]);
      lines.push([makePoint(-effectiveHalfSize, i), makePoint(effectiveHalfSize, i)]);
    }
    return lines;
  };

  // Axis arrows (math coordinates, length = size)
  const axisLength = size * 0.6;

  return (
    <group>
      {/* Axis labels at tips — math coords swapped for Three.js */}
      <AxisLabel position={[axisLength + 0.3, 0, 0]} label={xLabel} color="#ef4444" />
      <AxisLabel position={[0, 0, axisLength + 0.3]} label={yLabel} color="#22c55e" />
      {!is2D && <AxisLabel position={[0, axisLength + 0.3, 0]} label={zLabel} color="#3b82f6" />}
      <AxisLabel position={[-0.3, -0.3, -0.3]} label="O" color="#a1a1aa" />

      {/* Colored axis lines (make them extend infinitely in 2D) */}
      <Line points={[[is2D ? -20 : 0,0,0],[is2D ? 20 : axisLength,0,0]]} color="#ef4444" lineWidth={2.5} />
      <Line points={[[0,0,is2D ? -20 : 0],[0,0,is2D ? 20 : axisLength]]} color="#22c55e" lineWidth={2.5} />
      {!is2D && <Line points={[[0,0,0],[0,axisLength,0]]} color="#3b82f6" lineWidth={2.5} />}

      {/* XY plane grid (z=0 in math = y=0 in Three.js) — this is the ground */}
      {showXY && generateGridLines('x', 'y', 'z', 0).map((pts, i) => {
        // Find if this line is an axis line
        const isAxis = pts[0][0] === 0 || pts[0][2] === 0;
        const lineOpacity = is2D ? (isAxis ? 0.3 : 0.25) : 0.15;
        const color = is2D ? (isAxis ? "#9ca3af" : "#cbd5e1") : "#666666";
        return (
          <Line key={`xy-${i}`} points={pts} color={color} lineWidth={isAxis ? 1.5 : 1} transparent opacity={lineOpacity} />
        );
      })}

      {/* XZ plane grid (y=0 in math = z=0 in Three.js) — vertical front */}
      {!is2D && showXZ && generateGridLines('x', 'z', 'y', 0).map((pts, i) => (
        <Line key={`xz-${i}`} points={pts} color="#3b82f6" lineWidth={0.5} transparent opacity={0.1} />
      ))}

      {/* YZ plane grid (x=0 in math) — vertical side */}
      {!is2D && showYZ && generateGridLines('y', 'z', 'x', 0).map((pts, i) => (
        <Line key={`yz-${i}`} points={pts} color="#ef4444" lineWidth={0.5} transparent opacity={0.1} />
      ))}
    </group>
  );
}
