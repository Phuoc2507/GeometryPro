// api/_lib/kernel/compute/__tests__/volume.test.ts
import { describe, it, expect } from 'vitest';
import { computeTetraVolume, computePyramidVolume, volumeRatio, tetraVolumeScalar } from '../volume';
import { pointFromCoords } from '../../entities';
import { ratVec } from '../../vec3s';
import { makeExact } from '../../scalar';

function P(x: bigint, y: bigint, z: bigint) { return pointFromCoords(ratVec(x, y, z)); }

describe('computeTetraVolume', () => {
  it('tứ diện đơn vị: V = 1/6', () => {
    const r = computeTetraVolume(P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n), P(0n, 0n, 1n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(1n, 6n, 1)); expect(r.answer.text).toBe('1/6'); }
  });
});

describe('computePyramidVolume', () => {
  it('chóp đáy vuông cạnh 2, cao 3 (đỉnh trên tâm): V = 4', () => {
    const base = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 2n, 0n), P(0n, 2n, 0n)];
    const r = computePyramidVolume(base, P(1n, 1n, 3n));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(4n, 1n, 1)); expect(r.answer.text).toBe('4'); }
  });
});

describe('volumeRatio', () => {
  it('tỉ số hai thể tích hữu tỷ là hữu tỷ', () => {
    const v1 = tetraVolumeScalar(P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n), P(0n, 0n, 1n)); // 1/6
    const v2 = tetraVolumeScalar(P(0n, 0n, 0n), P(2n, 0n, 0n), P(0n, 2n, 0n), P(0n, 0n, 2n)); // 8/6
    const r = volumeRatio(v1, v2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(1n, 8n, 1)); // (1/6)/(8/6) = 1/8
  });
});
