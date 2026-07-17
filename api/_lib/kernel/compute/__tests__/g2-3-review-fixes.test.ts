// api/_lib/kernel/compute/__tests__/g2-3-review-fixes.test.ts
// Regression tests for defects found by the adversarial review of the G2-3 compute layer.
import { describe, it, expect } from 'vitest';
import { certifyDistance } from '../answer';
import { makeExact } from '../../scalar';
import { computeAngle } from '../angle';
import { computePolygonArea } from '../area';
import { computePyramidVolume, tetraVolumeScalar, volumeRatio } from '../volume';
import { planeEquationText } from '../equation';
import { pointFromCoords, lineFromPointDir, planeFromCoeffs } from '../../entities';
import { ratVec } from '../../vec3s';
import { num, rat } from '../../scalar';

function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }
function line(dx: bigint, dy: bigint, dz: bigint) { return lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(dx, dy, dz)); }

describe('§L4 self-certificate compares the EXACT value, not the float shadow', () => {
  it('keeps a correct exact even if the shadow approx was corrupted (compares exactToApprox)', () => {
    // exact = √3 (≈1.732), but the shadow approx is a bogus 999. The independent float is √3.
    const a = certifyDistance({ approx: 999, exact: makeExact(1n, 1n, 3) }, Math.sqrt(3));
    expect(a.exact).toEqual(makeExact(1n, 1n, 3));
    expect(a.approx).toBeCloseTo(Math.sqrt(3), 9);
    expect(a.approximate).toBe(false);
  });

  it('drops a WRONG exact even when the shadow approx happens to match the float ref', () => {
    // exact claims √5 (≈2.236) but shadow approx lies (1.732) and matches the float ref (1.732).
    // Old code compared the shadow and wrongly KEPT √5; new code compares exactToApprox and drops it.
    const a = certifyDistance({ approx: Math.sqrt(3), exact: makeExact(1n, 1n, 5) }, Math.sqrt(3));
    expect(a.exact).toBeNull();
    expect(a.approximate).toBe(true);
  });
});

describe('§L1/L5 angle niceness comes from the EXACT metric, not a float snap', () => {
  it('an angle within 1e-4° of 45° but NOT exactly 45° is reported approximate, not "45°"', () => {
    // dirs (0,-25,12) & (7,23,7): true angle ≈ 45.0000594°, cos² = 241081/482163 ≠ 1/2.
    const r = computeAngle(line(0n, -25n, 12n), line(7n, 23n, 7n));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.answer.exactDegrees).toBeNull();
      expect(r.answer.approximate).toBe(true);
    }
  });

  it('a genuinely exact 45° is still recognized', () => {
    const p1 = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n)); // z=0
    const p2 = planeFromCoeffs(rat(0n), rat(1n), rat(1n), rat(0n)); // y+z=0
    const r = computeAngle(p1, p2);
    expect(r.ok && r.answer.exactDegrees).toBe(45);
  });
});

describe('§L2/L3 coplanarity preconditions for area / volume', () => {
  it('polygon area rejects non-coplanar vertices (no silently-wrong exact)', () => {
    const r = computePolygonArea([P(0n, 0n, 0n), P(1n, 0n, 0n), P(1n, 1n, 1n), P(0n, 1n, 0n)]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/coplanar|planar/i);
  });

  it('pyramid volume rejects a non-planar base', () => {
    const base = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 2n, 2n), P(0n, 2n, 0n)]; // not planar
    const r = computePyramidVolume(base, P(1n, 1n, 5n));
    expect(r.ok).toBe(false);
  });

  it('a planar (even non-convex) polygon still computes', () => {
    const sq = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 2n, 0n), P(0n, 2n, 0n)];
    const r = computePolygonArea(sq);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(4n, 1n, 1));
  });
});

describe('§L6 plane equation float fallback formats cleanly', () => {
  it('float-only coeffs: no "+ -", no "1x", no "0z"', () => {
    const pl = planeFromCoeffs(num(1), num(-2), num(3), num(-4));
    expect(planeEquationText(pl)).toBe('x - 2y + 3z - 4 = 0');
  });
});

describe('§L8 volume ratio rejects an exact-zero denominator', () => {
  it('denominator volume 0 → {ok:false}', () => {
    const v = tetraVolumeScalar(P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n), P(0n, 0n, 1n));
    const r = volumeRatio(v, rat(0n));
    expect(r.ok).toBe(false);
  });
});
