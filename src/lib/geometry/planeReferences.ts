import type { Plane3D, Point3D } from '@/types/geometry';

const COORDINATE_EPSILON = 1e-6;

function sameCoordinate(point: Point3D, corner: { x: number; y: number; z: number }): boolean {
  return Math.abs(point.x - corner.x) <= COORDINATE_EPSILON
    && Math.abs(point.y - corner.y) <= COORDINATE_EPSILON
    && Math.abs(point.z - corner.z) <= COORDINATE_EPSILON;
}

export function collectPlanePointIds(plane: Plane3D, points: Point3D[]): Set<string> {
  if (plane.pointIds?.length) return new Set(plane.pointIds);

  return new Set(points
    .filter((point) => plane.points.some((corner) => sameCoordinate(point, corner)))
    .map((point) => point.id));
}

export function planeReferencesPoint(plane: Plane3D, point: Point3D): boolean {
  return plane.pointIds?.length
    ? plane.pointIds.includes(point.id)
    : plane.points.some((corner) => sameCoordinate(point, corner));
}
