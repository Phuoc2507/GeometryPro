import type { GeometryData, PointCoordinates } from '@/types/geometry';

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

  let maximum = 0;
  const includePoint = (point: PointCoordinates) => {
    maximum = Math.max(maximum, Math.abs(point.x), Math.abs(point.y), Math.abs(point.z));
  };
  normalized.points.forEach(includePoint);
  normalized.spheres?.forEach((sphere) => {
    includePoint(sphere.center);
    maximum = Math.max(maximum, Math.abs(sphere.radius));
  });
  normalized.circles?.forEach((circle) => {
    includePoint(circle.center);
    maximum = Math.max(maximum, Math.abs(circle.radius));
  });
  normalized.cylinders?.forEach((cylinder) => {
    includePoint(cylinder.center1);
    includePoint(cylinder.center2);
    maximum = Math.max(maximum, Math.abs(cylinder.radius));
  });
  normalized.cones?.forEach((cone) => {
    includePoint(cone.apex);
    includePoint(cone.baseCenter);
    maximum = Math.max(maximum, Math.abs(cone.radius));
  });

  if (maximum <= 20) return normalized;

  const factor = maximum / 8;
  const scalePoint = (point: PointCoordinates): PointCoordinates => ({
    x: point.x / factor,
    y: point.y / factor,
    z: point.z / factor,
  });

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
      return { ...curve, params };
    }),
  };
}
