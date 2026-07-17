import { describe, it, expect } from 'vitest';
import { circumcenterE } from '../../constructions';
import { vec3s } from '../../vec3s';
import { rat, sub, mul, add } from '../../scalar';
import { lenSqV, subV } from '../../vec3s';
import { solveQuadratic } from '../solver1d';
import { recognizeConstant } from '../recognize';

const V = (x: number, y: number, z: number) => vec3s(rat(BigInt(x)), rat(BigInt(y)), rat(BigInt(z)));

describe('Câu 9 — quả cầu tựa 3 cột (ghép hình học + giải tích)', () => {
  it('R = 10 − 2√7 ≈ 4,71 m', () => {
    // Đỉnh 3 cột: A'(0,0,10), B'(4,0,6), C'(0,4,6).
    const Ap = V(0, 0, 10), Bp = V(4, 0, 6), Cp = V(0, 4, 6);
    const Q = circumcenterE(Ap, Bp, Cp);               // tâm ngoại tiếp (hình học)
    const rc2 = lenSqV(subV(Q, Ap));                    // bán kính ngoại tiếp²
    const K = sub(rat(14n), Q.z);                       // 14 − Q_z
    // 2s² + 2K·s + (r_c² − K²) = 0
    const a = rat(2n);
    const b = mul(rat(2n), K);
    const c = sub(rc2, mul(K, K));
    const roots = solveQuadratic(a, b, c);
    // Nghiệm hình học hợp lệ: s cho tâm cầu phía trên (s lớn hơn)
    const s = Math.max(...roots.map((r) => r.approx));
    const R = K.approx - s;                             // R = K − s
    expect(R).toBeCloseTo(4.7085, 4);
    const nice = recognizeConstant(R);
    expect(nice).not.toBeNull();
    expect(nice!.text).toBe('10 - 2√7');
    // Q chính xác = (4/3,4/3,22/3)
    expect(Q.x.approx).toBeCloseTo(4 / 3, 9);
    expect(Q.z.approx).toBeCloseTo(22 / 3, 9);
  });
});
