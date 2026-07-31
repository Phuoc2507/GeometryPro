import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { ProfileFn, RevolutionSolid } from '@/types/geometry';
import { revolutionPhase, sweepIndexCount, buildBladeRegion } from '@/lib/geometry/revolutionAnim';

// Quyết định vật liệu khối: dim (Advance) ưu tiên; translucent (Vẽ nhanh/Vẽ kỹ) bán trong suốt; else đục.
export function solidMaterialForTest(solid: { dim?: boolean; translucent?: boolean }): { transparent: boolean; opacity: number } {
  if (solid.dim) return { transparent: true, opacity: 0.25 };
  if (solid.translucent) return { transparent: true, opacity: 0.55 };
  return { transparent: false, opacity: 1 };
}

const SEGMENTS = 96;   // đủ mịn để mặt cong bóng liền
const AXIAL_STEPS = 64;

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

export default function AnimatedRevolutionSolid({ solid }: { solid: RevolutionSolid }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const { gl } = useThree();
  gl.localClippingEnabled = true; // bật cắt cục bộ cho lưỡi phẳng "vẽ dần" (giai đoạn 1)

  const [a, b] = solid.domain;
  const aroundOy = solid.axis === 'Oy';
  const axisY = solid.axisY ?? 0;   // trục quay DỜI ngang y=axisY (chỉ Ox); 0 ⇒ quay quanh chính Ox

  const oyDisk = aroundOy && solid.method !== 'shell';   // Oy bằng ĐĨA/VÀNH KHĂN theo y (đường x=g(y))

  // Nhịp animation: [0, END] vẽ miền phẳng; [END, 1] quay 0°→360° tạo khối.
  const ph = revolutionPhase(advanceT);

  const geometry = useMemo(() => {
    const outer = outerSamples(solid, AXIAL_STEPS);
    if (aroundOy && !oyDisk) {
      // Quanh Oy VỎ TRỤ. Biên dạng KÍN trong mặt kinh tuyến (bán kính=x, cao=y); lathe quanh trục Y.
      const hasHole = !!(solid.innerSamples && solid.innerSamples.length);
      if (hasHole) {
        // Miền 2 đường (vỏ trụ RỖNG): dải đứng kẹp giữa đường trong (đáy) & đường ngoài (đỉnh) tại mỗi
        // bán kính x∈[a,b] ⇒ tiết diện = đường trong (a→b) rồi vòng về đường ngoài (b→a). Khớp thể tích
        // 2π∫x(outer−inner)dx (vá lỗ hổng Oy: hình không còn to quá như khi bỏ đường trong).
        const inner = solid.innerSamples!;
        const loop = [
          ...inner.map((s) => new THREE.Vector2(s.x, Math.max(0, s.r))),
          ...outer.slice().reverse().map((p) => new THREE.Vector2(p.axial, Math.max(0, p.radius))),
          new THREE.Vector2(inner[0].x, Math.max(0, inner[0].r)), // khép kín
        ];
        return new THREE.LatheGeometry(loop, SEGMENTS);
      }
      // 1 đường (đáy y=0 từ x=a→b, tường trái x=a, đường cong y=r(x), tường phải x=b).
      const loop = [
        new THREE.Vector2(a, 0),
        ...outer.map((p) => new THREE.Vector2(p.axial, Math.max(0, p.radius))),
        new THREE.Vector2(b, 0),
        new THREE.Vector2(a, 0),
      ];
      return new THREE.LatheGeometry(loop, SEGMENTS);
    }
    if (oyDisk) {
      // Quanh Oy ĐĨA/VÀNH KHĂN theo y (đường x=g(y)): mẫu {x:y(trục), r:x_ng(bán kính)} ⇒ lathe quanh
      // trục Y với bán kính = r, cao = axial(=y). Giống loop washer của Ox NHƯNG mesh KHÔNG xoay
      // (trục lathe = trục Y = Oy). Có innerSamples ⇒ khoét lỗ giữa (vành khăn).
      const hasHole = !!(solid.innerSamples && solid.innerSamples.length);
      if (hasHole) {
        const inner = solid.innerSamples!.map((s) => ({ radius: Math.max(0, s.r), axial: s.x }));
        const loop = [
          ...outer.map((p) => new THREE.Vector2(Math.max(0, p.radius), p.axial)),
          ...inner.slice().reverse().map((p) => new THREE.Vector2(Math.max(1e-3, p.radius), p.axial)),
          new THREE.Vector2(Math.max(0, outer[0].radius), outer[0].axial), // khép kín
        ];
        return new THREE.LatheGeometry(loop, SEGMENTS);
      }
      const pts = outer.map((p) => new THREE.Vector2(Math.max(0, p.radius), p.axial));
      return new THREE.LatheGeometry(pts, SEGMENTS);
    }
    const hasHole = !!(solid.innerSamples && solid.innerSamples.length);
    // Trục quay DỜI y=axisY: bán kính mỗi biên = |giá trị − axisY| (axisY=0 ⇒ như cũ, quay quanh Ox).
    // Khối được tịnh tiến lên y=axisY ở mesh (position) để trục lathe nằm đúng đường thẳng y=k.
    const rShift = (r: number): number => Math.abs(r - axisY);
    if (hasHole) {
      // Vành khăn (washer): biên dạng KÍN — đi theo biên ngoài (a→b) rồi vòng về biên trong (b→a),
      // tạo vỏ có lỗ rỗng ở giữa khi xoay quanh trục.
      const inner = solid.innerSamples!.map((s) => ({ radius: Math.max(0, s.r), axial: s.x }));
      const loop = [
        ...outer.map((p) => new THREE.Vector2(rShift(p.radius), p.axial)),
        ...inner.slice().reverse().map((p) => new THREE.Vector2(Math.max(1e-3, rShift(p.radius)), p.axial)),
        new THREE.Vector2(rShift(outer[0].radius), outer[0].axial), // khép kín
      ];
      return new THREE.LatheGeometry(loop, SEGMENTS);
    }
    const pts = outer.map((p) => new THREE.Vector2(rShift(p.radius), p.axial));
    return new THREE.LatheGeometry(pts, SEGMENTS);
  }, [solid, a, b, aroundOy, oyDisk, axisY]);

  // "Lưỡi phẳng" = miền kinh tuyến sinh khối (ShapeGeometry). Vòng khớp CHÍNH XÁC hệ đầu-vào Lathe
  // (x=bán kính, y=cao) nên khi đặt lệch góc [0, φ−π/2, 0] nó trùng đúng lát φ của khối.
  const bladeGeometry = useMemo(() => {
    const outer = outerSamples(solid, AXIAL_STEPS);
    const inner = solid.innerSamples && solid.innerSamples.length
      ? solid.innerSamples.map((s) => ({ radius: Math.max(0, s.r), axial: s.x }))
      : null;
    const region = buildBladeRegion({ outer, inner, domain: solid.domain, aroundOy, oyDisk, axisY });
    if (region.length < 3) return null;
    const shape = new THREE.Shape(region.map((p) => new THREE.Vector2(p.x, p.y)));
    return new THREE.ShapeGeometry(shape);
  }, [solid, aroundOy, oyDisk, axisY]);

  // Chiều cao lớn nhất của biên dạng (để "vẽ dần" lưỡi phẳng theo trục Y khi quay quanh Oy vỏ trụ).
  const maxHeight = useMemo(() => {
    const s = solid.samples;
    if (!s || !s.length) return 1;
    return Math.max(1e-3, ...s.map((p) => Math.max(0, p.r)));
  }, [solid]);

  // Mặt phẳng cắt "vẽ dần" lưỡi phẳng ở GIAI ĐOẠN 1 (world-space; lưỡi lúc này ở góc 0).
  const bladeClip = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);

  if (solid.hidden) return null;

  // ── Khối: lộ mặt theo GÓC quay bằng drawRange (rẻ, không dựng lại mesh mỗi frame). GĐ1 ⇒ 0 (ẩn). ──
  const totalIndices = geometry.index ? geometry.index.count : 0;
  geometry.setDrawRange(0, sweepIndexCount(totalIndices, ph.sweepFrac));

  // ── Lưỡi phẳng: GĐ1 hiện & "vẽ dần" (clip a→b); GĐ2 quay tới góc φ rồi mờ dần khi sắp kín khối. ──
  const FADE_START = 0.75;
  const bladeOpacity = ph.phase === 1
    ? 0.7
    : 0.7 * (1 - Math.max(0, Math.min(1, (ph.sweepFrac - FADE_START) / (1 - FADE_START))));

  if (ph.phase === 1) {
    if (aroundOy && !oyDisk) {
      bladeClip.normal.set(0, -1, 0);
      bladeClip.constant = maxHeight * ph.drawFrac;   // vỏ trụ: lộ theo chiều cao
    } else if (aroundOy) {
      bladeClip.normal.set(0, -1, 0);
      bladeClip.constant = a + (b - a) * ph.drawFrac;  // đĩa/vành khăn Oy: lộ theo miền y
    } else {
      bladeClip.normal.set(-1, 0, 0);
      bladeClip.constant = a + (b - a) * ph.drawFrac;  // Ox: lộ trái→phải theo trục
    }
  }
  const bladeClipPlanes = ph.phase === 1 ? [bladeClip] : undefined;

  const baseColor = solid.color ?? '#6366f1';
  const mat = solidMaterialForTest(solid);

  // Nhóm ngoài mang phép biến đổi đặt khối vào thế giới (Ox: xoay để trục lathe trùng Ox + tịnh tiến
  // lên y=axisY nếu dời trục; Oy: giữ nguyên). Cả khối lẫn lưỡi phẳng là con để xoay đồng bộ.
  return (
    <group
      position={aroundOy ? [0, 0, 0] : [0, axisY, 0]}
      rotation={aroundOy ? [0, 0, 0] : [0, 0, -Math.PI / 2]}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={baseColor}
          roughness={0.6}
          metalness={0.0}
          clearcoat={0.15}
          clearcoatRoughness={0.6}
          side={THREE.DoubleSide}
          transparent={mat.transparent}
          opacity={mat.opacity}
          emissive={solid.highlight ? new THREE.Color(baseColor) : new THREE.Color('#000000')}
          emissiveIntensity={solid.highlight ? 0.25 : 0}
        />
      </mesh>

      {/* Lưỡi phẳng sinh khối. Đặt lệch góc φ−π/2 để trùng lát φ hiện tại của khối (base −π/2: hệ
          shape x=bán kính→trục Z, y=cao→Y, khớp lát φ=0 của Lathe). GĐ1 ở góc 0 và được clip "vẽ dần". */}
      {bladeGeometry && bladeOpacity > 0.02 && (
        <group rotation={[0, ph.angle - Math.PI / 2, 0]}>
          <mesh geometry={bladeGeometry}>
            <meshBasicMaterial
              color={baseColor}
              side={THREE.DoubleSide}
              transparent
              opacity={bladeOpacity}
              depthWrite={false}
              clippingPlanes={bladeClipPlanes}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
