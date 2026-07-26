import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { circleLoop, silhouetteOffsets, splitHorizontalCircle } from './contour';

describe('circleLoop', () => {
  it('is closed and on the given radius', () => {
    const loop = circleLoop(2, 32);
    expect(loop).toHaveLength(33); // count + 1 (closed)
    expect(loop[0].distanceTo(loop[loop.length - 1])).toBeCloseTo(0);
    for (const p of loop) expect(Math.hypot(p.x, p.z)).toBeCloseTo(2);
    expect(loop.every((p) => p.y === 0)).toBe(true);
  });
});

describe('splitHorizontalCircle', () => {
  it('puts the camera-facing half in front and the rest behind', () => {
    // Camera along +x → front arc is the +x half, back arc the -x half.
    const { front, back } = splitHorizontalCircle(3, new THREE.Vector3(1, 0, 0));
    expect(front.every((p) => p.x >= -1e-6)).toBe(true);
    expect(back.every((p) => p.x <= 1e-6)).toBe(true);
    // Arcs meet at the silhouette points (±z on the perpendicular diameter).
    expect(front[0].distanceTo(back[back.length - 1])).toBeCloseTo(0);
    expect(front[front.length - 1].distanceTo(back[0])).toBeCloseTo(0);
  });

  it('rotates the split with the view direction', () => {
    // Camera along +z → front arc is the +z half.
    const { front } = splitHorizontalCircle(3, new THREE.Vector3(0, 0, 1));
    expect(front.every((p) => p.z >= -1e-6)).toBe(true);
  });
});

describe('silhouetteOffsets', () => {
  it('is perpendicular to the view and of length radius', () => {
    const [left, right] = silhouetteOffsets(2, new THREE.Vector3(1, 0, 0));
    expect(left.dot(new THREE.Vector3(1, 0, 0))).toBeCloseTo(0); // ⊥ view
    expect(left.length()).toBeCloseTo(2);
    expect(left.clone().add(right).length()).toBeCloseTo(0); // opposite
  });

  it('collapses when looking straight down the axis', () => {
    const [left, right] = silhouetteOffsets(2, new THREE.Vector3(0, 1, 0));
    expect(left.length()).toBeCloseTo(0);
    expect(right.length()).toBeCloseTo(0);
  });
});
