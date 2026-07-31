import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGeometry } from '@/context/GeometryContext';
import type { SliceStack } from '@/types/geometry';

const SLICE_COUNT = 48;      // số lát khi kết đông (Cách A: nhiều lát khít = trông khối đặc)
const SLICE_DEPTH = 0.9;     // bề dày mỗi lát tương đối (× bước) để lát liền nhau

// Dựng THREE.Shape tiết diện, TÂM ở gốc, "cạnh đáy" = side theo phương ngang (x).
// square/rect: chữ nhật; equilateral: tam giác đều đáy dưới; semicircle: nửa tròn phần trên.
// eslint-disable-next-line react-refresh/only-export-components
export function sectionShape(section: SliceStack['section'], side: number, ratio = 1): THREE.Shape {
  const s = Math.max(1e-4, side);
  const shp = new THREE.Shape();
  if (section === 'square' || section === 'rect') {
    const h = section === 'rect' ? s * ratio : s;
    shp.moveTo(-s / 2, -h / 2); shp.lineTo(s / 2, -h / 2);
    shp.lineTo(s / 2, h / 2); shp.lineTo(-s / 2, h / 2); shp.closePath();
  } else if (section === 'equilateral') {
    const h = (Math.sqrt(3) / 2) * s;
    shp.moveTo(-s / 2, -h / 2); shp.lineTo(s / 2, -h / 2); shp.lineTo(0, h / 2); shp.closePath();
  } else { // semicircle: đường kính = side nằm ngang, vòm hướng lên
    shp.moveTo(-s / 2, 0); shp.absarc(0, 0, s / 2, Math.PI, 0, true); shp.closePath();
  }
  return shp;
}

// Lọc lát hiện theo tiến trình t∈[0,1] (Cách A). Export riêng để test thuần.
// eslint-disable-next-line react-refresh/only-export-components
export function sliceSamplesForTest(
  samples: { t: number; side: number }[], domain: [number, number], advanceT: number,
) {
  const [a, b] = domain;
  const cut = a + (b - a) * advanceT;
  return samples.filter((sp) => sp.t <= cut + 1e-9);
}

function sideAt(samples: { t: number; side: number }[], t: number): number {
  if (!samples.length) return 0;
  if (t <= samples[0].t) return samples[0].side;
  const last = samples[samples.length - 1];
  if (t >= last.t) return last.side;
  for (let i = 1; i < samples.length; i++) {
    if (t <= samples[i].t) {
      const p = samples[i - 1], q = samples[i];
      const k = (t - p.t) / (q.t - p.t || 1);
      return p.side + k * (q.side - p.side);
    }
  }
  return last.side;
}

export default function AnimatedSliceStack({ solid }: { solid: SliceStack }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const [a, b] = solid.domain;
  const oy = solid.axis === 'Oy';
  const ratio = solid.ratio ?? 1;
  const samples = useMemo(() => solid.samples || [], [solid.samples]);
  const depth = (Math.abs(b - a) / SLICE_COUNT) * SLICE_DEPTH;

  // Dựng SẴN 48 lát một lần (geometry + vị trí + xoay). advanceT chỉ lọc lát nào hiện,
  // KHÔNG dựng lại geometry mỗi frame (tránh rò rỉ BufferGeometry khi chạy hoạt ảnh).
  const slices = useMemo(() => {
    const arr: {
      pos: number;
      geo: THREE.ExtrudeGeometry;
      position: [number, number, number];
      rotation: [number, number, number];
    }[] = [];
    for (let i = 0; i < SLICE_COUNT; i++) {
      const t = a + ((b - a) * (i + 0.5)) / SLICE_COUNT;
      const side = Math.max(1e-4, sideAt(samples, t));
      const geo = new THREE.ExtrudeGeometry(sectionShape(solid.section, side, ratio), {
        depth, bevelEnabled: false, steps: 1,
      });
      geo.translate(0, 0, -depth / 2);
      // Ox: lát nằm trong mặt Oyz, xếp dọc theo x ⇒ xoay 90° quanh Y để "depth" chạy theo x.
      // Oy: lát trong mặt Oxz, xếp dọc theo y ⇒ xoay 90° quanh X.
      arr.push({
        pos: t,
        geo,
        position: oy ? [0, t, 0] : [t, 0, 0],
        rotation: oy ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0],
      });
    }
    return arr;
  }, [samples, a, b, solid.section, ratio, depth, oy]);

  // Giải phóng geometry khi bộ lát đổi hoặc component unmount.
  useEffect(() => () => { slices.forEach((sl) => sl.geo.dispose()); }, [slices]);

  if (solid.hidden) return null;
  const cut = a + (b - a) * advanceT;
  const color = solid.color ?? '#0ea5e9';
  const opacity = solid.dim ? 0.25 : 1;

  return (
    <group>
      {slices.filter((sl) => sl.pos <= cut + 1e-9).map((sl, i) => (
        <mesh key={i} geometry={sl.geo} position={sl.position} rotation={sl.rotation} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={color} roughness={0.6} metalness={0.0} clearcoat={0.15} clearcoatRoughness={0.6}
            side={THREE.DoubleSide} transparent={solid.dim} opacity={opacity}
            emissive={solid.highlight ? new THREE.Color(color) : new THREE.Color('#000000')}
            emissiveIntensity={solid.highlight ? 0.2 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}
