import { describe, it, expect } from 'vitest';
import { computeIntersection } from '../intersect';
import { lineFromTwoPoints, lineFromPointDir, sphereFromCenterRadius2 } from '../../entities';
import { vec3s } from '../../vec3s';
import { rat, displayScalar } from '../../scalar';

const V = (x: number, y: number, z: number) => vec3s(rat(BigInt(x)), rat(BigInt(y)), rat(BigInt(z)));

describe('giao đường–cầu (line ∩ sphere)', () => {
  it('cắt tại 2 điểm hữu tỉ → chord đúng', () => {
    // Đường Ox qua (-5,0,0), cầu tâm O bán kính² 4 ⇒ cắt (-2,0,0),(2,0,0), chord 4.
    const line = lineFromPointDir(V(-5, 0, 0), V(1, 0, 0));
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(4n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('segment');
    expect(r.answer.chord!.approx).toBeCloseTo(4, 9);
    expect(displayScalar(r.answer.chord!)).toBe('4');
  });

  it('tiếp xúc → tangent-point', () => {
    const line = lineFromPointDir(V(0, 0, 2), V(1, 0, 0)); // z=2 tiếp xúc cầu bán kính 2
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(4n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('tangent-point');
    expect(r.answer.point!.p.z.approx).toBeCloseTo(2, 9);
  });

  it('không cắt → none', () => {
    const line = lineFromPointDir(V(0, 0, 3), V(1, 0, 0));
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(4n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('none');
  });

  it('Câu 3: đường bay DE cắt biên radar, chord = 584√665/665', () => {
    // D(20,0,9), E(0,16,12), cầu tâm O bán kính 20 (r²=400).
    const line = lineFromTwoPoints(V(20, 0, 9), V(0, 16, 12));
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(400n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('segment');
    expect(displayScalar(r.answer.chord!)).toBe('584√665/665');
    expect(r.answer.chord!.approx).toBeCloseTo(22.6465, 3); // ×1000 ≈ 22646 → làm tròn 22600 m
  });
});
