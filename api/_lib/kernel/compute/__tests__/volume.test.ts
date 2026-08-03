// api/_lib/kernel/compute/__tests__/volume.test.ts
import { describe, it, expect } from 'vitest';
import { computeTetraVolume, computePyramidVolume, volumeRatio, tetraVolumeScalar, computePrismVolume } from '../volume';
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

describe('computePrismVolume', () => {
  it('lập phương cạnh 3: V = 27', () => {
    const b = [P(0n, 0n, 0n), P(3n, 0n, 0n), P(3n, 3n, 0n), P(0n, 3n, 0n)];
    const t = [P(0n, 0n, 3n), P(3n, 0n, 3n), P(3n, 3n, 3n), P(0n, 3n, 3n)];
    const r = computePrismVolume(b, t);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(27n, 1n, 1)); expect(r.answer.text).toBe('27'); }
  });
  it('hộp chữ nhật 2×3×4: V = 24', () => {
    const b = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 3n, 0n), P(0n, 3n, 0n)];
    const t = [P(0n, 0n, 4n), P(2n, 0n, 4n), P(2n, 3n, 4n), P(0n, 3n, 4n)];
    const r = computePrismVolume(b, t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(24n, 1n, 1));
  });
  it('lăng trụ tam giác vuông (đáy 1/2, cao 5): V = 5/2', () => {
    const b = [P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n)];
    const t = [P(0n, 0n, 5n), P(1n, 0n, 5n), P(0n, 1n, 5n)];
    const r = computePrismVolume(b, t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(5n, 2n, 1));
  });
  it('từ chối khi số đỉnh đáy≠nắp', () => {
    const b = [P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n)];
    const t = [P(0n, 0n, 5n), P(1n, 0n, 5n)];
    expect(computePrismVolume(b, t).ok).toBe(false);
  });
  it('từ chối khi nắp KHÔNG phải đáy tịnh tiến (chóp cụt)', () => {
    const b = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 2n, 0n), P(0n, 2n, 0n)];
    const t = [P(0n, 0n, 3n), P(1n, 0n, 3n), P(1n, 1n, 3n), P(0n, 1n, 3n)];
    expect(computePrismVolume(b, t).ok).toBe(false);
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
