import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Plane3D, Point3D } from '@/types/geometry';
import { planeSgkName } from '@/lib/geometry/planeSgkLabel';
import { collectPlanePointIds } from '@/lib/geometry/planeReferences';

/**
 * Nhãn mặt phẳng kiểu SGK: nếu 4 đỉnh là ẩn danh cùng chữ gốc (W1..W4, P',P''…)
 * thì hiện MỘT nhãn "(W)" cạnh một góc (thay cho 4 nhãn đỉnh — đã ẩn ở GeometryRenderer).
 * Chạy độc lập với việc mặt có được vẽ bề mặt hay không, nên áp dụng cả mặt phẳng
 * độc lập (tường, mặt đất) lẫn mặt của khối.
 */
export function PlaneSgkLabel({ plane, points }: { plane: Plane3D; points: Point3D[] }) {
  const byId = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);

  const sgkName = useMemo(() => {
    const ids = [...collectPlanePointIds(plane, points)];
    if (ids.length < 3) return null;
    // Chỉ gộp nhãn khi các đỉnh là ẩn danh (placeholder); mặt có đỉnh tên thật để yên.
    const derived = planeSgkName(ids.map((id) => byId.get(id)?.label));
    if (!derived) return null;
    // Ưu tiên TÊN ĐỀ do AI đặt ở plane.label ("(P)", "(Q)", "(α)"…); nếu không có → chữ gốc của đỉnh.
    const lbl = (plane.label || '').trim();
    if (/^\(.+\)$/.test(lbl)) return lbl;
    if (/^[A-Za-zΑ-Ωα-ω]$/.test(lbl)) return `(${lbl})`;
    return `(${derived})`;
  }, [plane, points, byId]);

  const pos = useMemo(() => {
    if (!sgkName) return null;
    // Đỉnh theo không gian three (đổi y↔z như các điểm khác).
    const corners = plane.pointIds?.length
      ? plane.pointIds.map((id) => byId.get(id)).filter(Boolean).map((p) => new THREE.Vector3(p!.x, p!.z, p!.y))
      : plane.points.map((p) => new THREE.Vector3(p.x, p.z, p.y));
    if (corners.length < 3) return null;
    const center = corners
      .reduce((a, v) => a.add(v), new THREE.Vector3())
      .multiplyScalar(1 / corners.length);
    const corner = corners[0];
    // Đẩy nhẹ ra ngoài tâm cho giống SGK (ghi ngoài mép mặt).
    return new THREE.Vector3().subVectors(corner, center).multiplyScalar(0.16).add(corner);
  }, [sgkName, plane, byId]);

  if (!sgkName || !pos) return null;
  return (
    <Html position={[pos.x, pos.y, pos.z]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <span
        className="math-label"
        style={{
          color: 'hsl(var(--foreground))',
          fontSize: '18px',
          fontStyle: 'italic',
          WebkitTextStroke: '3px hsl(var(--background))',
          paintOrder: 'stroke fill',
          whiteSpace: 'nowrap',
        }}
      >
        {sgkName}
      </span>
    </Html>
  );
}
