// api/_lib/kernel/__tests__/constructions.test.ts
import { describe, it, expect } from 'vitest';
import {
  footOnPlaneE, footOnLineE, reflectAcrossPlaneE, reflectAcrossLineE, orthocenterE, circumcenterE,
} from '../constructions';
import { ratVec, toApproxVec } from '../vec3s';
import { planeFromCoeffs, lineFromPointDir } from '../entities';
import { rat, makeExact } from '../scalar';

describe('foot / reflect', () => {
  it('chân đường vuông góc từ (1,1,1) xuống mặt z=0 = (1,1,0)', () => {
    const pl = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    expect(toApproxVec(footOnPlaneE(ratVec(1n, 1n, 1n), pl))).toEqual({ x: 1, y: 1, z: 0 });
  });
  it('chân đường vuông góc từ (0,2,0) xuống trục Ox = (0,0,0)', () => {
    const l = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    expect(toApproxVec(footOnLineE(ratVec(0n, 2n, 0n), l))).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('đối xứng (1,1,1) qua mặt z=0 = (1,1,-1)', () => {
    const pl = planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n));
    expect(toApproxVec(reflectAcrossPlaneE(ratVec(1n, 1n, 1n), pl))).toEqual({ x: 1, y: 1, z: -1 });
  });
  it('đối xứng (0,2,0) qua trục Ox = (0,-2,0)', () => {
    const l = lineFromPointDir(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n));
    expect(toApproxVec(reflectAcrossLineE(ratVec(0n, 2n, 0n), l))).toEqual({ x: 0, y: -2, z: 0 });
  });
});

describe('orthocenter / circumcenter', () => {
  it('trực tâm tam giác vuông tại A = A', () => {
    const H = orthocenterE(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(toApproxVec(H)).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('tâm ngoại tiếp tam giác vuông = trung điểm cạnh huyền', () => {
    // A(0,0,0) vuông, B(2,0,0), C(0,2,0) → tâm (1,1,0), và exact
    const O = circumcenterE(ratVec(0n, 0n, 0n), ratVec(2n, 0n, 0n), ratVec(0n, 2n, 0n));
    expect(O.x.exact).toEqual(makeExact(1n, 1n, 1));
    expect(toApproxVec(O)).toEqual({ x: 1, y: 1, z: 0 });
  });
});
