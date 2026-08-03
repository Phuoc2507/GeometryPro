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
  /** Toạ độ thật tại mỗi vạch lưới = vạch (đơn vị Three) × unitPerStep (hệ số auto-scale). 1 = không scale. */
  unitPerStep?: number;
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

// Nhãn SỐ tại một vạch trên trục — nhỏ hơn nhãn tên trục, mờ hơn để không rối.
function TickLabel({ position, value, color }: { position: [number, number, number]; value: string; color: string }) {
  return (
    <Html position={position} center distanceFactor={20} zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
      <span style={{
        color,
        fontWeight: 600,
        fontSize: '10px',
        opacity: 0.9,
        textShadow: '0 0 3px rgba(0,0,0,0.85)',
        pointerEvents: 'none',
        userSelect: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </Html>
  );
}

// Số đẹp: làm tròn 2 chữ số, bỏ ".00". (VD 3 → "3", 3.7 → "3.7")
function fmtTick(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function CoordinateGridPlanes({
  showXY = true,
  showXZ = false,
  showYZ = false,
  size = 8,
  is2D = false,
  unit,
  unitPerStep = 1,
}: CoordinateGridPlanesProps) {
  const step = 1;
  const halfSize = size / 2;

  // Vạch số trên trục: thưa dần theo kích thước lưới để không rối (≈ tối đa 6 vạch mỗi phía).
  const tickStep = Math.max(1, Math.round(halfSize / 6));
  const ticks: number[] = [];
  for (let i = tickStep; i <= halfSize + 1e-9; i += tickStep) ticks.push(i);

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

      {/* Số toạ độ trên trục/lưới — theo cùng công tắc "lưới toạ độ". Số = vạch × hệ số scale,
          nên khi đã dời gốc về tâm cầu (hệ số thường = 1) số đọc đúng theo gốc mới. */}
      {showXY && ticks.map((i) => (
        <group key={`tick-${i}`}>
          {/* Trục x (đỏ) — cả hai phía, nằm trên mặt đất Oxy */}
          <TickLabel position={[i, 0.06, -0.3]} value={fmtTick(i * unitPerStep)} color="#ef4444" />
          <TickLabel position={[-i, 0.06, -0.3]} value={fmtTick(-i * unitPerStep)} color="#ef4444" />
          {/* Trục y (xanh lá) — math y vẽ trên trục z của Three, cả hai phía */}
          <TickLabel position={[-0.3, 0.06, i]} value={fmtTick(i * unitPerStep)} color="#22c55e" />
          <TickLabel position={[-0.3, 0.06, -i]} value={fmtTick(-i * unitPerStep)} color="#22c55e" />
          {/* Trục z (xanh dương) — math z vẽ trên trục y của Three, chỉ phía dương (nơi có đường trục) */}
          {!is2D && <TickLabel position={[-0.28, i, -0.28]} value={fmtTick(i * unitPerStep)} color="#3b82f6" />}
        </group>
      ))}

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
