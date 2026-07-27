import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { ProfileFn, RevolutionSolid } from '@/types/geometry';

const SEGMENTS = 96;   // đủ mịn để mặt cong bóng liền
const AXIAL_STEPS = 64;
const DISK_COUNT = 14;

function evalProfile(f: ProfileFn, x: number): number {
  switch (f.kind) {
    case 'poly': return f.coeffs.reduce((a, c, i) => a + c * x ** i, 0);
    case 'sqrt': return f.a * Math.sqrt(x) + f.b;
    case 'const': return f.c;
    // 'expr' không tự tính ở trình duyệt (không parser) — engine đã gửi kèm solid.samples để vẽ.
    case 'expr': return NaN;
  }
}

// Export riêng để test thuần (không dựng canvas).
export function profileSamplesForTest(outer: ProfileFn, domain: [number, number], steps: number) {
  const [a, b] = domain;
  const out: { radius: number; axial: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = a + ((b - a) * i) / steps;
    out.push({ radius: Math.max(0, evalProfile(outer, x)), axial: x });
  }
  return out;
}

// Biên dạng ngoài (radius theo axial) — ưu tiên mẫu engine đã gửi (đúng cho MỌI kiểu, kể cả 'expr'),
// nếu không có thì tự lấy mẫu tại trình duyệt cho poly/sqrt/const.
function outerSamples(solid: RevolutionSolid, steps: number) {
  if (solid.samples && solid.samples.length) {
    return solid.samples.map((s) => ({ radius: Math.max(0, s.r), axial: s.x }));
  }
  return profileSamplesForTest(solid.outer, solid.domain, steps);
}

// Nội suy tuyến tính bán kính tại x từ mảng mẫu {x, r} (đã sắp theo x tăng dần).
function interpRadius(samples: { x: number; r: number }[], x: number): number {
  if (!samples.length) return 0;
  if (x <= samples[0].x) return Math.max(0, samples[0].r);
  const last = samples[samples.length - 1];
  if (x >= last.x) return Math.max(0, last.r);
  for (let i = 1; i < samples.length; i++) {
    if (x <= samples[i].x) {
      const p = samples[i - 1], q = samples[i];
      const t = (x - p.x) / (q.x - p.x || 1);
      return Math.max(0, p.r + t * (q.r - p.r));
    }
  }
  return Math.max(0, last.r);
}

export default function AnimatedRevolutionSolid({ solid }: { solid: RevolutionSolid }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const { gl } = useThree();
  gl.localClippingEnabled = true; // bật cắt cục bộ để lộ dần

  const [a, b] = solid.domain;
  const aroundOy = solid.axis === 'Oy';

  const geometry = useMemo(() => {
    const outer = outerSamples(solid, AXIAL_STEPS);
    if (aroundOy) {
      // Quanh Oy (vỏ trụ): biên dạng KÍN trong mặt (bán kính=x, cao=y) — đáy y=0 từ x=a→b,
      // tường trái tại x=a, đường cong y=r(x), tường phải tại x=b. Lathe quanh trục Y (không xoay mesh).
      const loop = [
        new THREE.Vector2(a, 0),
        ...outer.map((p) => new THREE.Vector2(p.axial, Math.max(0, p.radius))),
        new THREE.Vector2(b, 0),
        new THREE.Vector2(a, 0),
      ];
      return new THREE.LatheGeometry(loop, SEGMENTS);
    }
    const hasHole = !!(solid.innerSamples && solid.innerSamples.length);
    if (hasHole) {
      // Vành khăn (washer): biên dạng KÍN — đi theo biên ngoài (a→b) rồi vòng về biên trong (b→a),
      // tạo vỏ có lỗ rỗng ở giữa khi xoay quanh trục.
      const inner = solid.innerSamples!.map((s) => ({ radius: Math.max(0, s.r), axial: s.x }));
      const loop = [
        ...outer.map((p) => new THREE.Vector2(p.radius, p.axial)),
        ...inner.slice().reverse().map((p) => new THREE.Vector2(Math.max(1e-3, p.radius), p.axial)),
        new THREE.Vector2(outer[0].radius, outer[0].axial), // khép kín
      ];
      return new THREE.LatheGeometry(loop, SEGMENTS);
    }
    const pts = outer.map((p) => new THREE.Vector2(p.radius, p.axial));
    return new THREE.LatheGeometry(pts, SEGMENTS);
  }, [solid, a, b, aroundOy]);

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);

  // Chiều cao lớn nhất của biên dạng (để cắt lộ theo trục Y khi quay quanh Oy).
  const maxHeight = useMemo(() => {
    const s = solid.samples;
    if (!s || !s.length) return 1;
    return Math.max(1e-3, ...s.map((p) => Math.max(0, p.r)));
  }, [solid]);

  const disks = useMemo(() => {
    const outer = solid.samples && solid.samples.length
      ? solid.samples
      : outerSamples(solid, AXIAL_STEPS).map((p) => ({ x: p.axial, r: p.radius }));
    const arr: { x: number; r: number }[] = [];
    for (let i = 0; i < DISK_COUNT; i++) {
      const x = a + ((b - a) * (i + 0.5)) / DISK_COUNT;
      arr.push({ x, r: Math.max(1e-3, interpRadius(outer, x)) });
    }
    return arr;
  }, [solid, a, b]);

  if (solid.hidden) return null;

  // Cắt lộ dần: quanh Ox lộ theo x (trái→phải); quanh Oy lộ theo chiều cao (dưới→lên).
  const xCut = a + (b - a) * advanceT;
  if (aroundOy) {
    clipPlane.normal.set(0, -1, 0);
    clipPlane.constant = maxHeight * advanceT;
  } else {
    clipPlane.normal.set(-1, 0, 0);
    clipPlane.constant = xCut;
  }

  const baseColor = solid.color ?? '#6366f1';
  const dim = !!solid.dim;
  const opacity = dim ? 0.25 : 1;
  const diskOpacity = Math.max(0, 1 - advanceT) * 0.35;

  return (
    <group>
      {/* Khối bóng liền — Ox: xoay để trục lathe trùng Ox; Oy: giữ nguyên (lathe quanh Y). Cắt lộ dần. */}
      <mesh geometry={geometry} rotation={aroundOy ? [0, 0, 0] : [0, 0, -Math.PI / 2]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={baseColor}
          roughness={0.25}
          metalness={0.0}
          clearcoat={1}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
          transparent={dim}
          opacity={opacity}
          emissive={solid.highlight ? new THREE.Color(baseColor) : new THREE.Color('#000000')}
          emissiveIntensity={solid.highlight ? 0.25 : 0}
          clippingPlanes={[clipPlane]}
        />
      </mesh>

      {/* Lát mờ minh hoạ tích phân (chỉ cho trục Ox; biến mất khi kết đông) */}
      {!aroundOy && diskOpacity > 0.01 &&
        disks
          .filter((d) => d.x <= xCut)
          .map((d, i) => (
            <mesh key={i} position={[d.x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[d.r, d.r, ((b - a) / DISK_COUNT) * 0.85, 40]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={diskOpacity} />
            </mesh>
          ))}
    </group>
  );
}
