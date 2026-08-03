import type { GeometryData, PointCoordinates } from '@/types/geometry';

/**
 * Độ lớn toạ độ lớn nhất (theo trị tuyệt đối) trong hình — xét points và tâm/bán kính
 * các khối có toạ độ tuyệt đối. Chấp nhận payload cũ (tâm là id điểm) qua việc tra ngược.
 * Cùng tập primitive với vòng scale bên dưới để hệ số luôn khớp.
 */
export function computeMaxExtent(geometry: GeometryData | null): number {
  if (!geometry) return 0;
  const pointById = new Map(geometry.points.map((p) => [p.id, p]));
  const finite = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const coords = (value: unknown): PointCoordinates => {
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
  let max = 0;
  const inc = (c: PointCoordinates) => {
    max = Math.max(max, Math.abs(c.x), Math.abs(c.y), Math.abs(c.z));
  };
  geometry.points.forEach((p) => inc({ x: finite(p.x), y: finite(p.y), z: finite(p.z) }));
  geometry.spheres?.forEach((s) => { inc(coords(s.center)); max = Math.max(max, Math.abs(finite(s.radius))); });
  geometry.circles?.forEach((c) => { inc(coords(c.center)); max = Math.max(max, Math.abs(finite(c.radius))); });
  geometry.cylinders?.forEach((cy) => { inc(coords(cy.center1)); inc(coords(cy.center2)); max = Math.max(max, Math.abs(finite(cy.radius))); });
  geometry.cones?.forEach((co) => { inc(coords(co.apex)); inc(coords(co.baseCenter)); max = Math.max(max, Math.abs(finite(co.radius))); });
  return max;
}

/**
 * Hệ số scaleGeometry đang áp cho hình: 1 nếu hình đủ nhỏ (max ≤ 20), ngược lại max/8.
 * Dùng để lưới toạ độ hiện SỐ THẬT: toạ độ tại vạch lưới thứ i (đơn vị Three) = i × hệ số.
 */
export function getScaleFactor(geometry: GeometryData | null): number {
  const maximum = computeMaxExtent(geometry);
  return maximum > 20 ? maximum / 8 : 1;
}

/**
 * Returns a normalized, scaled copy of geometry that fits the renderer's
 * standard bounds. Legacy payloads may reference a point by id where newer
 * payloads carry coordinates, so normalization deliberately accepts unknown.
 */
export function scaleGeometry(geometry: GeometryData | null): GeometryData | null {
  if (!geometry) return null;

  const pointById = new Map(geometry.points.map((point) => [point.id, point]));
  const finite = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const coordinates = (value: unknown): PointCoordinates => {
    if (typeof value === 'string') {
      const point = pointById.get(value);
      return point
        ? { x: finite(point.x), y: finite(point.y), z: finite(point.z) }
        : { x: 0, y: 0, z: 0 };
    }
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;
      return { x: finite(record.x), y: finite(record.y), z: finite(record.z) };
    }
    return { x: 0, y: 0, z: 0 };
  };

  const normalized: GeometryData = {
    ...geometry,
    points: geometry.points.map((point) => ({
      ...point,
      x: finite(point.x),
      y: finite(point.y),
      z: finite(point.z),
    })),
    spheres: geometry.spheres?.map((sphere) => ({
      ...sphere,
      center: coordinates(sphere.center),
      radius: finite(sphere.radius),
    })),
    circles: geometry.circles?.map((circle) => ({
      ...circle,
      center: coordinates(circle.center),
      radius: finite(circle.radius),
    })),
    cylinders: geometry.cylinders?.map((cylinder) => ({
      ...cylinder,
      center1: coordinates(cylinder.center1),
      center2: coordinates(cylinder.center2),
      radius: finite(cylinder.radius),
    })),
    cones: geometry.cones?.map((cone) => ({
      ...cone,
      apex: coordinates(cone.apex),
      baseCenter: coordinates(cone.baseCenter),
      radius: finite(cone.radius),
    })),
    planes: geometry.planes?.map((plane) => ({
      ...plane,
      points: plane.points.map(coordinates),
    })),
  };

  // Hệ số scale tính trên chính `normalized` (đã ép số hữu hạn + tra tâm) — computeMaxExtent
  // dùng cùng cách chuẩn hoá nên cho kết quả trùng, giữ một nguồn sự thật duy nhất.
  const maximum = computeMaxExtent(normalized);

  if (maximum <= 20) return normalized;

  const factor = maximum / 8;
  const scalePoint = (point: PointCoordinates): PointCoordinates => ({
    x: point.x / factor,
    y: point.y / factor,
    z: point.z / factor,
  });
  const scaleXY = (s: { x: number; y: number }) => ({ ...s, x: s.x / factor, y: s.y / factor });
  const scaleXR = (s: { x: number; r: number }) => ({ ...s, x: s.x / factor, r: s.r / factor });
  const scaleArea = (s: { x: number; top: number; bot: number }) => ({ ...s, x: s.x / factor, top: s.top / factor, bot: s.bot / factor });
  const scaleDomain = (d: [number, number]): [number, number] => [d[0] / factor, d[1] / factor];

  return {
    ...normalized,
    points: normalized.points.map((point) => ({ ...point, ...scalePoint(point) })),
    spheres: normalized.spheres?.map((sphere) => ({
      ...sphere,
      center: scalePoint(sphere.center),
      radius: sphere.radius / factor,
    })),
    circles: normalized.circles?.map((circle) => ({
      ...circle,
      center: scalePoint(circle.center),
      radius: circle.radius / factor,
    })),
    cylinders: normalized.cylinders?.map((cylinder) => ({
      ...cylinder,
      center1: scalePoint(cylinder.center1),
      center2: scalePoint(cylinder.center2),
      radius: cylinder.radius / factor,
    })),
    cones: normalized.cones?.map((cone) => ({
      ...cone,
      apex: scalePoint(cone.apex),
      baseCenter: scalePoint(cone.baseCenter),
      radius: cone.radius / factor,
    })),
    planes: normalized.planes?.map((plane) => ({
      ...plane,
      points: plane.points.map(scalePoint),
    })),
    curves: normalized.curves?.map((curve) => {
      const params = { ...curve.params };
      if (params.xMin !== undefined) params.xMin /= factor;
      if (params.xMax !== undefined) params.xMax /= factor;
      if (curve.type === 'parabola') {
        if (params.a !== undefined) params.a *= factor;
        if (params.c !== undefined) params.c /= factor;
      } else if (curve.type === 'cubic') {
        if (params.a !== undefined) params.a *= factor * factor;
        if (params.b !== undefined) params.b *= factor;
        if (params.d !== undefined) params.d /= factor;
      } else if (curve.type === 'rational') {
        if (params.numB !== undefined) params.numB /= factor;
        if (params.denA !== undefined) params.denA *= factor;
      }
      const scaledCurve = { ...curve, params };
      if (Array.isArray(curve.samples)) scaledCurve.samples = curve.samples.map(scaleXY);
      return scaledCurve;
    }),
    revolutionSolids: normalized.revolutionSolids?.map((solid) => ({
      ...solid,
      domain: Array.isArray(solid.domain) ? scaleDomain(solid.domain) : solid.domain, // hình méo thiếu domain → giữ nguyên, không deref

      ...(solid.axisY !== undefined ? { axisY: solid.axisY / factor } : {}),
      ...(Array.isArray(solid.samples) ? { samples: solid.samples.map(scaleXR) } : {}),
      ...(Array.isArray(solid.innerSamples) ? { innerSamples: solid.innerSamples.map(scaleXR) } : {}),
    })),
    areaRegions: normalized.areaRegions?.map((area) => ({
      ...area,
      domain: Array.isArray(area.domain) ? scaleDomain(area.domain) : area.domain, // méo thiếu domain → giữ nguyên

      ...(Array.isArray(area.samples) ? { samples: area.samples.map(scaleArea) } : {}),
    })),
  };
}
