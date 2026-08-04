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

/* ═══════════════════════════════════════════════════════════════════════════
 *  DỜI GỐC VỀ TÂM MẶT PHẲNG ĐÁY (hình chóp / khối có đáy)
 *  ──────────────────────────────────────────────────────────────────────────
 *  Bài hình chóp thường đẹp & dễ nhìn hơn khi gốc O nằm ngay tâm mặt đáy: trục
 *  đứng đi qua đỉnh, lưới cắt qua tâm đáy. Cũng chỉ là ĐỔI GỐC (tịnh tiến).
 *
 *  Khó nhất là XÁC ĐỊNH TÂM ĐÁY cho chính xác. Ràng buộc thực tế của dữ liệu ở
 *  đây: mặt đáy gần như luôn vuông góc với MỘT trục toạ độ, nhưng KHÔNG cố định
 *  là trục nào (mock chóp dựng đáy trên mặt y=0 đỉnh theo Oy; đề khác lại z-up).
 *  Nên ta TỰ DÒ trục đứng thay vì giả định:
 *   1. Với từng trục x/y/z, gộp điểm theo mức toạ độ (khử nhiễu số thực) rồi xét
 *      MẶT PHẲNG VUÔNG TRỤC ở BIÊN (min/max) có ≥3 điểm — ứng viên mặt đáy.
 *   2. Chỉ NHẬN khi đáy đông hơn hẳn mặt đối diện (đáy > 2×"đỉnh") — dấu hiệu có
 *      đỉnh nhọn của hình chóp. Nhờ vậy LOẠI được lăng trụ/lập phương (hai đáy
 *      bằng nhau) và mặt bên chữ nhật của lăng trụ. Hoà điểm thì ưu tiên trục theo
 *      quy ước z›y›x rồi mức thấp (đáy dưới) cho kết quả tất định.
 *   3. Tâm đáy = TRỌNG TÂM (trọng số DIỆN TÍCH) của BAO LỒI đa giác đáy. Dùng bao
 *      lồi để BỎ QUA các điểm nằm trong/trên cạnh đáy (tâm đáy H, trung điểm cạnh…
 *      rất hay xuất hiện trong đề chóp) — chỉ lấy đúng viền đáy. Trùng trung bình
 *      đỉnh cho tam giác/bình hành/đa giác đều, vẫn đúng cho đa giác lồi bất kỳ;
 *      suy biến (thẳng hàng) thì lui về trung bình các đỉnh bao.
 * ══════════════════════════════════════════════════════════════════════════ */

type AxisIndex = 0 | 1 | 2;
const AXIS_KEYS = ['x', 'y', 'z'] as const;

/** Toạ độ theo trục a (0=x,1=y,2=z) của một điểm/point-coord. */
const axisOf = (p: { x: number; y: number; z: number }, a: AxisIndex): number =>
  finite(a === 0 ? p.x : a === 1 ? p.y : p.z);

/** Gộp các điểm "cùng một mức" theo trục: làm tròn 3 chữ số để khử nhiễu số thực. */
const levelKey = (v: number): number => Math.round(v * 1000) / 1000;

interface BaseFace {
  /** Các đỉnh của mặt đáy (chưa sắp thứ tự). */
  points: PointCoordinates[];
  /** Trục vuông góc mặt đáy — trục "đứng" của khối. */
  axis: AxisIndex;
  /** Toạ độ theo `axis` của mặt đáy (trung bình các đỉnh đáy — bền với nhiễu). */
  level: number;
}

/** Có primitive KHỐI TRÒN/GIẢI TÍCH (cầu/trụ/nón)? Những hình này KHÔNG phải chóp. */
function hasRoundSolid(geometry: GeometryData): boolean {
  return (
    (geometry.spheres?.length ?? 0) > 0 ||
    (geometry.cylinders?.length ?? 0) > 0 ||
    (geometry.cones?.length ?? 0) > 0
  );
}

/**
 * Dò mặt đáy của HÌNH CHÓP. Trả `null` nếu không phải chóp/không đủ tin cậy:
 *  - có mặt cầu/trụ/nón (khối tròn — không phải chóp) ⇒ loại thẳng;
 *  - dưới 4 điểm (thiếu đáy ≥3 + đỉnh);
 *  - không có mặt phẳng vuông trục ở biên với ĐÁY đông hơn hẳn ĐỈNH;
 *  - đáy SUY BIẾN (các điểm thẳng hàng ⇒ diện tích ~0, không phải đa giác thật).
 * Thà không hiện công tắc còn hơn dời về một tâm đoán sai.
 */
export function detectBaseFace(geometry: GeometryData | null): BaseFace | null {
  const pts = geometry?.points;
  if (!geometry || !pts || pts.length < 4) return null; // cần ≥3 đỉnh đáy + ≥1 đỉnh
  if (hasRoundSolid(geometry)) return null;             // cầu/trụ/nón ⇒ không phải chóp

  interface Cand { axis: AxisIndex; level: number; group: typeof pts; count: number; }
  let best: Cand | null = null;

  const better = (c: Cand, b: Cand | null): boolean => {
    if (!b) return true;
    if (c.count !== b.count) return c.count > b.count; // nhiều đỉnh đáy hơn
    if (c.axis !== b.axis) return c.axis > b.axis;     // ưu tiên trục z(2)›y(1)›x(0)
    return c.level < b.level;                          // đáy dưới (mức thấp)
  };

  for (const a of [0, 1, 2] as AxisIndex[]) {
    const groups = new Map<number, typeof pts>();
    for (const p of pts) {
      const k = levelKey(axisOf(p, a));
      const g = groups.get(k);
      if (g) g.push(p); else groups.set(k, [p]);
    }
    const keys = [...groups.keys()];
    if (keys.length < 2) continue; // mọi điểm cùng mức theo trục a ⇒ a không phải trục đứng
    const minKey = Math.min(...keys);
    const maxKey = Math.max(...keys);
    for (const level of level0EdgeLevels(minKey, maxKey)) {
      const group = groups.get(level)!;
      if (group.length < 3) continue;             // đáy phải ≥3 đỉnh
      // Mặt ĐỐI DIỆN (biên kia) là vùng "đỉnh". Chỉ nhận khi đáy ĐÔNG HƠN HẲN đỉnh
      // (đáy > 2×đỉnh) — dấu hiệu có đỉnh nhọn rõ ràng của HÌNH CHÓP. Nhờ vậy loại
      // được lăng trụ/lập phương (hai đáy bằng nhau) và mặt bên chữ nhật của lăng
      // trụ (nhiều điểm nhưng đối diện cũng nhiều) — tránh nhận nhầm "đáy".
      const topCount = groups.get(level === minKey ? maxKey : minKey)!.length;
      if (group.length <= 2 * topCount) continue;
      // Đáy phải là ĐA GIÁC THẬT: nếu các điểm thẳng hàng (diện tích ~0) thì đây là
      // đường kính / cạnh chứ không phải mặt đáy — bác. (Vá lỗi bài mặt cầu I,A,B
      // thẳng hàng bị nhận nhầm là "đáy tam giác".)
      if (isDegenerateFace(group, a)) continue;
      const cand: Cand = { axis: a, level, group, count: group.length };
      if (better(cand, best)) best = cand;
    }
  }

  if (!best) return null;
  const level = best.group.reduce((s, p) => s + axisOf(p, best!.axis), 0) / best.group.length;
  return {
    points: best.group.map((p) => ({ x: finite(p.x), y: finite(p.y), z: finite(p.z) })),
    axis: best.axis,
    level,
  };
}

/** Hai mức biên (min & max, khử trùng) — để xét cả đáy-dưới lẫn đáy-trên. */
function level0EdgeLevels(minKey: number, maxKey: number): number[] {
  return minKey === maxKey ? [minKey] : [minKey, maxKey];
}

/** Hai trục còn lại (nằm trong mặt đáy) khi biết trục đứng. */
function inPlaneAxes(axis: AxisIndex): [AxisIndex, AxisIndex] {
  if (axis === 0) return [1, 2];
  if (axis === 1) return [0, 2];
  return [0, 1];
}

/**
 * Trọng tâm đa giác (theo diện tích) từ các đỉnh đã sắp thứ tự (CCW/CW) trong mặt
 * phẳng 2D (u,v). Trả `null` khi diện tích suy biến (thẳng hàng / <3 đỉnh).
 */
function polygonCentroid2D(poly: Array<{ u: number; v: number }>): { u: number; v: number } | null {
  const n = poly.length;
  if (n < 3) return null;
  let a2 = 0, cu = 0, cv = 0;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const cross = p.u * q.v - q.u * p.v;
    a2 += cross;
    cu += (p.u + q.u) * cross;
    cv += (p.v + q.v) * cross;
  }
  if (Math.abs(a2) < 1e-9) return null; // diện tích ~0 ⇒ suy biến
  return { u: cu / (3 * a2), v: cv / (3 * a2) };
}

/**
 * Bao lồi 2D (monotone chain), trả các đỉnh viền theo thứ tự — loại điểm nằm trong
 * và điểm thẳng hàng trên cạnh. Nhờ đó tâm đáy KHÔNG bị lệch bởi tâm đáy/trung điểm.
 */
function convexHull2D(input: Array<{ u: number; v: number }>): Array<{ u: number; v: number }> {
  const pts = [...input].sort((a, b) => a.u - b.u || a.v - b.v);
  const n = pts.length;
  if (n < 3) return pts;
  const cross = (o: typeof pts[0], a: typeof pts[0], b: typeof pts[0]) =>
    (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
  const lower: typeof pts = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: typeof pts = [];
  for (let i = n - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** |Diện tích| đa giác (đỉnh đã sắp thứ tự) theo shoelace. */
function polygonArea2D(poly: Array<{ u: number; v: number }>): number {
  const n = poly.length;
  if (n < 3) return 0;
  let a2 = 0;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    a2 += p.u * q.v - q.u * p.v;
  }
  return Math.abs(a2) / 2;
}

/**
 * Đáy có SUY BIẾN không (các điểm thẳng hàng ⇒ bao lồi <3 đỉnh hoặc diện tích ~0)?
 * Ngưỡng tương đối theo kích thước đáy để bền với toạ độ lớn/nhỏ. Đáy suy biến =
 * đường kính/đoạn thẳng, KHÔNG phải mặt đa giác ⇒ không coi là mặt đáy hình chóp.
 */
function isDegenerateFace(group: Array<{ x: number; y: number; z: number }>, axis: AxisIndex): boolean {
  const [ua, va] = inPlaneAxes(axis);
  const proj = group.map((p) => ({ u: axisOf(p, ua), v: axisOf(p, va) }));
  const hull = convexHull2D(proj);
  if (hull.length < 3) return true;
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const q of proj) {
    if (q.u < minU) minU = q.u;
    if (q.u > maxU) maxU = q.u;
    if (q.v < minV) minV = q.v;
    if (q.v > maxV) maxV = q.v;
  }
  const scale = Math.max(maxU - minU, maxV - minV, 1);
  return polygonArea2D(hull) < 1e-6 * scale * scale;
}

/**
 * Tâm mặt đáy: trọng tâm (trọng số diện tích) của BAO LỒI đáy. `null` nếu không dò
 * được mặt đáy đáng tin. Dùng để quyết định hiện công tắc + để dời gốc.
 */
export function getBaseFaceCenter(geometry: GeometryData | null): PointCoordinates | null {
  const bf = detectBaseFace(geometry);
  if (!bf) return null;
  const [ua, va] = inPlaneAxes(bf.axis);
  const proj = bf.points.map((p) => ({ u: axisOf(p, ua), v: axisOf(p, va) }));
  const hull = convexHull2D(proj);
  const c2 = polygonCentroid2D(hull);
  let cu: number;
  let cv: number;
  if (c2) {
    cu = c2.u;
    cv = c2.v;
  } else {
    // Suy biến (đỉnh đáy thẳng hàng) — lui về trung bình các đỉnh bao (hoặc mọi đỉnh).
    const fallback = hull.length ? hull : proj;
    cu = fallback.reduce((s, q) => s + q.u, 0) / fallback.length;
    cv = fallback.reduce((s, q) => s + q.v, 0) / fallback.length;
  }
  const center: PointCoordinates = { x: 0, y: 0, z: 0 };
  center[AXIS_KEYS[bf.axis]] = bf.level;
  center[AXIS_KEYS[ua]] = cu;
  center[AXIS_KEYS[va]] = cv;
  return center;
}

/** Khối có mặt đáy dò được? Dùng để quyết định có hiện công tắc dời-về-tâm-đáy. */
export function hasBaseFace(geometry: GeometryData | null): boolean {
  return detectBaseFace(geometry) !== null;
}

/**
 * Tiện ích: dời gốc về tâm mặt đáy. Giữ nguyên (trả chính geometry cũ) khi không
 * dò được đáy, hoặc tâm đáy đã ở gốc — tránh bản sao thừa.
 */
export function recenterGeometryOnBase(geometry: GeometryData | null): GeometryData | null {
  if (!geometry) return null;
  const center = getBaseFaceCenter(geometry);
  if (!center) return geometry;
  if (center.x === 0 && center.y === 0 && center.z === 0) return geometry;
  return recenterGeometry(geometry, center);
}
