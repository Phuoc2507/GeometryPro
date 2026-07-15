import { type Vec3, vec3, centroidOf, add } from '../vecMath';

export function extrudePrism(basePositions: Vec3[], height: number): Vec3[] {
  return basePositions.map((p) => add(p, vec3(0, 0, height)));
}

/** Apex directly above the base centroid — only valid for regular ("chóp đều") pyramids. */
export function extrudePyramidApex(basePositions: Vec3[], height: number): Vec3 {
  const c = centroidOf(basePositions);
  return vec3(c.x, c.y, height);
}
