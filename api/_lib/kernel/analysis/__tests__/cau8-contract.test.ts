import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 8 (nón ∩ trụ) qua runAnalysis', () => {
  it('cùng cao 4, bán kính 2; trục nón là một đường sinh của trụ → V ≈ 7,02 dm³', () => {
    const r = runAnalysis({
      solidName: 'cone-cyl',
      solids: [
        // Trụ: tâm đáy (0,0), bán kính 2, cao 4.
        { name: 'T', kind: 'cylinder', center: [0, 0], radius: 2, from: 0, to: 4 },
        // Nón: tâm đáy (2,0) NẰM TRÊN đường tròn đáy trụ; đỉnh ở độ cao 4 ⇒ trục nón là đường sinh của trụ.
        { name: 'N', kind: 'cone', center: [2, 0], baseRadius: 2, baseZ: 0, apexZ: 4 },
      ],
      analyze: { kind: 'eval', of: { kind: 'solid_volume', of: ['T', 'N'], mode: 'intersection' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(7.0205, 3);
    expect(Number(r.answer.approx.toFixed(2))).toBe(7.02); // làm tròn phần trăm
  });
});
