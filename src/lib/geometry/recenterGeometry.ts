import type { GeometryData, PointCoordinates } from '@/types/geometry';

/**
 * recenterGeometry — dời gốc toạ độ về TÂM MẶT CẦU.
 *
 * Bài Oxyz có mặt cầu thường dễ nhìn hơn khi gốc O trùng tâm cầu: trục và lưới
 * cắt qua tâm, hình cân đối. Đây chỉ là một phép ĐỔI GỐC (tịnh tiến) — mọi toạ độ
 * được trừ đi toạ độ tâm cầu, không làm sai hình học, chỉ là chọn gốc khác.
 *
 * CHÚ Ý: đây là biến đổi cho "chế độ xem" (canvas + bảng toạ độ). Không dùng cho
 * xuất LaTeX/TikZ hay lời giải — những phần đó neo theo gốc gốc để khớp đề.
 */

const finite = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Toạ độ tâm của mặt cầu ĐẦU TIÊN trong hình (bài "mặt cầu" thường chỉ có 1).
 * `center` có thể là object {x,y,z} hoặc — với payload cũ — là id một điểm ⇒ tra ngược
 * ra toạ độ. Trả `null` nếu hình không có mặt cầu nào.
 */
export function getPrimarySphereCenter(geometry: GeometryData | null): PointCoordinates | null {
  if (!geometry?.spheres || geometry.spheres.length === 0) return null;
  const c = geometry.spheres[0].center as unknown;
  if (typeof c === 'string') {
    const p = geometry.points.find((pt) => pt.id === c);
    return p ? { x: finite(p.x), y: finite(p.y), z: finite(p.z) } : null;
  }
  if (c && typeof c === 'object') {
    const r = c as Record<string, unknown>;
    return { x: finite(r.x), y: finite(r.y), z: finite(r.z) };
  }
  return null;
}

/** Hình có ít nhất một mặt cầu? Dùng để quyết định có hiện công tắc dời trục hay không. */
export function hasSphere(geometry: GeometryData | null): boolean {
  return !!geometry?.spheres && geometry.spheres.length > 0;
}

/**
 * Trả bản sao geometry đã tịnh tiến sao cho `center` về gốc O(0,0,0).
 * Dời đúng các primitive mang toạ độ TUYỆT ĐỐI (giống scaleGeometry): points, tâm
 * cầu/đường tròn, hai tâm trụ, đỉnh/tâm đáy nón, các góc mặt phẳng. Bán kính bất biến
 * với phép tịnh tiến nên giữ nguyên; đường/cạnh nối theo id điểm nên tự đi theo.
 */
export function recenterGeometry(geometry: GeometryData, center: PointCoordinates): GeometryData {
  const pointById = new Map(geometry.points.map((p) => [p.id, p]));
  const resolve = (value: unknown): PointCoordinates => {
    if (typeof value === 'string') {
      const p = pointById.get(value);
      return p ? { x: finite(p.x), y: finite(p.y), z: finite(p.z) } : { x: 0, y: 0, z: 0 };
    }
    if (value && typeof value === 'object') {
      const r = value as Record<string, unknown>;
      return { x: finite(r.x), y: finite(r.y), z: finite(r.z) };
    }
    return { x: 0, y: 0, z: 0 };
  };
  const shift = (c: PointCoordinates): PointCoordinates => ({
    x: c.x - center.x,
    y: c.y - center.y,
    z: c.z - center.z,
  });
  const shiftRef = (value: unknown) => shift(resolve(value));

  return {
    ...geometry,
    points: geometry.points.map((p) => ({
      ...p,
      ...shift({ x: finite(p.x), y: finite(p.y), z: finite(p.z) }),
    })),
    spheres: geometry.spheres?.map((s) => ({ ...s, center: shiftRef(s.center) })),
    circles: geometry.circles?.map((c) => ({ ...c, center: shiftRef(c.center) })),
    cylinders: geometry.cylinders?.map((cy) => ({
      ...cy,
      center1: shiftRef(cy.center1),
      center2: shiftRef(cy.center2),
    })),
    cones: geometry.cones?.map((co) => ({
      ...co,
      apex: shiftRef(co.apex),
      baseCenter: shiftRef(co.baseCenter),
    })),
    planes: geometry.planes?.map((pl) => ({ ...pl, points: pl.points.map(shiftRef) })),
  };
}

/**
 * Tiện ích: dời gốc về tâm mặt cầu đầu tiên. Giữ nguyên (trả chính geometry cũ) khi
 * hình không có mặt cầu, hoặc tâm đã ở gốc rồi — tránh tạo bản sao thừa.
 */
export function recenterGeometryOnSphere(geometry: GeometryData | null): GeometryData | null {
  if (!geometry) return null;
  const center = getPrimarySphereCenter(geometry);
  if (!center) return geometry;
  if (center.x === 0 && center.y === 0 && center.z === 0) return geometry;
  return recenterGeometry(geometry, center);
}
