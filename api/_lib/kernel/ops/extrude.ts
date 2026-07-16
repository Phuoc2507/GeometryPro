import { type Vec3, vec3, centroidOf, add, scale, planeNormal } from '../vecMath';

export function extrudePrism(basePositions: Vec3[], height: number): Vec3[] {
  return basePositions.map((p) => add(p, vec3(0, 0, height)));
}

/** Apex offset from the base centroid by `height` along the base's own normal — valid for
 * regular ("chóp đều") pyramids. Using the base normal (rather than a hard-coded world +Z
 * with an absolute z) keeps the apex correct even when the base does not lie on the z=0
 * plane, e.g. when a prism's top face is reused as a pyramid base. */
export function extrudePyramidApex(basePositions: Vec3[], height: number): Vec3 {
  const c = centroidOf(basePositions);
  const n = planeNormal(basePositions[0], basePositions[1], basePositions[2]);
  return add(c, scale(n, height));
}
