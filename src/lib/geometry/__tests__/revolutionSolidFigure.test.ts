import { describe, it, expect } from 'vitest';
import { buildRevolutionSolidFigure } from '../revolutionSolidFigure';
import { project3DTo2D } from '../projection';
import type { RevolutionSolid } from '@/types/geometry';

const CAM: [number, number, number] = [8, 6, 10];
const TARGET: [number, number, number] = [0, 0, 0];

// Mẫu do engine (exprExpand) gắn kèm cho khối 'expr' của Vẽ nhanh/Vẽ kỹ: {x,r}.
const exprSamples = (() => {
  const out: { x: number; r: number }[] = [];
  for (let i = 0; i <= 20; i++) { const x = (2 * i) / 20; out.push({ x, r: x * x }); }
  return out;
})();

describe('buildRevolutionSolidFigure', () => {
  it('KHOÁ BUG: outer.kind=expr CÓ samples (Vẽ nhanh/Vẽ kỹ) ⇒ dựng được hình (không null)', () => {
    const solid = {
      id: 's', outer: { kind: 'expr', expr: 'x^2' }, axis: 'Ox',
      domain: [0, 2], method: 'disk', samples: exprSamples,
    } as unknown as RevolutionSolid;
    const fig = buildRevolutionSolidFigure(solid, CAM, TARGET, project3DTo2D);
    expect(fig).not.toBeNull();
    expect(fig!.body.length).toBeGreaterThan(2);
    expect(fig!.silhouettes[0].length).toBe(exprSamples.length);
    expect(fig!.silhouettes[1].length).toBe(exprSamples.length);
    // Vành lớn (đầu x=2, ρ=4) ⇒ có nắp elip (ít nhất 1 cung gần + 1 cung xa).
    expect(fig!.caps.some(a => a.near)).toBe(true);
    expect(fig!.caps.some(a => !a.near)).toBe(true);
  });

  it('outer.kind=expr KHÔNG samples ⇒ không parser ở trình duyệt ⇒ null (không ném)', () => {
    const solid = {
      id: 'e', outer: { kind: 'expr', expr: 'sin(x)' }, axis: 'Ox',
      domain: [0, 3], method: 'disk',
    } as unknown as RevolutionSolid;
    expect(buildRevolutionSolidFigure(solid, CAM, TARGET, project3DTo2D)).toBeNull();
  });

  it('poly KHÔNG samples ⇒ tự lấy mẫu trên domain ⇒ dựng được hình', () => {
    const solid = {
      id: 'p', outer: { kind: 'poly', coeffs: [0, 0, 1] }, axis: 'Ox',
      domain: [0, 2], method: 'disk',
    } as unknown as RevolutionSolid;
    const fig = buildRevolutionSolidFigure(solid, CAM, TARGET, project3DTo2D);
    expect(fig).not.toBeNull();
    expect(fig!.body.length).toBeGreaterThan(2);
  });
});
