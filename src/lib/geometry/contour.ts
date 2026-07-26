import * as THREE from 'three';

/**
 * Textbook-style contours for curved solids: a silhouette outline plus a few
 * characteristic circles whose camera-facing arc is drawn solid and whose far
 * arc is drawn dashed — the way spheres, cylinders and cones are drawn by hand.
 */

/** A closed circle of `count` points, radius `r`, in the local plane spanned by
 *  the x and z axes (vertical axis = y). Used for silhouettes and caps. */
export function circleLoop(radius: number, count = 96): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * Math.PI * 2;
    points.push(new THREE.Vector3(radius * Math.cos(t), 0, radius * Math.sin(t)));
  }
  return points;
}

function arcPoints(radius: number, start: number, end: number, count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const span = end - start;
  for (let i = 0; i < count; i++) {
    const t = start + span * (i / (count - 1));
    points.push(new THREE.Vector3(radius * Math.cos(t), 0, radius * Math.sin(t)));
  }
  return points;
}

/**
 * Split a horizontal great/base circle (in the local x–z plane) into the arc
 * facing the camera and the arc behind the solid, from a view direction given
 * in the shape's local frame. Only the horizontal component of the view matters
 * because the circle is horizontal. The split happens on the diameter
 * perpendicular to the view, so each arc is a half circle that rotates with the
 * camera.
 */
export function splitHorizontalCircle(
  radius: number,
  viewDir: THREE.Vector3,
  countPerArc = 48,
): { front: THREE.Vector3[]; back: THREE.Vector3[] } {
  const azimuth = Math.atan2(viewDir.z, viewDir.x);
  return {
    front: arcPoints(radius, azimuth - Math.PI / 2, azimuth + Math.PI / 2, countPerArc),
    back: arcPoints(radius, azimuth + Math.PI / 2, azimuth + (3 * Math.PI) / 2, countPerArc),
  };
}

/**
 * The two silhouette generators of an upright cylinder/cone of the given radius:
 * the left and right edges as seen from `viewDir`, i.e. the horizontal offsets
 * (±perpendicular to the view) at which the lateral surface turns away. Returns
 * the local x–z offset vectors to add at the top and bottom rings.
 */
export function silhouetteOffsets(radius: number, viewDir: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const horizontal = new THREE.Vector3(viewDir.x, 0, viewDir.z);
  if (horizontal.lengthSq() < 1e-12) {
    // Looking straight down the axis: no silhouette generators.
    return [new THREE.Vector3(), new THREE.Vector3()];
  }
  horizontal.normalize();
  const perpendicular = new THREE.Vector3(-horizontal.z, 0, horizontal.x).multiplyScalar(radius);
  return [perpendicular.clone(), perpendicular.clone().negate()];
}
