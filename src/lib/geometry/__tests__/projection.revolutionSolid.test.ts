import { describe, it, expect } from 'vitest';
import { generateProjectedLatex, project3DTo2D } from '../projection';
import { projectScene } from '@/lib/advanceProject';
import type { GeometryData, RevolutionSolid, AdvanceStep } from '@/types/geometry';

// Cùng quy tắc format toạ độ như projection.ts (không export nên chép lại để so khớp chuỗi).
const fmt = (v: number): string => {
  if (Math.abs(v) < 0.005) return '0.00';
  const f = v.toFixed(2);
  return f === '-0.00' ? '0.00' : f;
};

const CAM: [number, number, number] = [8, 6, 10];
const TARGET: [number, number, number] = [0, 0, 0];

// (H): quay y=x² (x∈[0,2]) quanh Ox ⇒ khối tròn xoay nằm ngang, vành lớn r=4 tại x=2.
const samplesParabola = (() => {
  const out: { x: number; r: number }[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = (2 * i) / 20;
    out.push({ x, r: x * x });
  }
  return out;
})();

const revOx: RevolutionSolid = {
  id: 'sol', outer: { kind: 'poly', coeffs: [0, 0, 1] }, axis: 'Ox',
  domain: [0, 2], method: 'disk', samples: samplesParabola,
};

const baseGeom = (solid: unknown): GeometryData => ({
  name: 'test', points: [], lines: [], revolutionSolids: [solid],
} as unknown as GeometryData);

describe('generateProjectedLatex · khối tròn xoay Advance (revolutionSolids)', () => {
  it('quanh Ox SINH lệnh vẽ (vĩ tuyến kín + hai đường bao)', () => {
    const latex = generateProjectedLatex(baseGeom(revOx), CAM, TARGET);
    expect(latex).toContain('Vẽ khối tròn xoay (Advance)');
    expect(latex).toMatch(/purple!55, thick\].*-- cycle/);
    expect((latex.match(/purple!70, thick\]/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('vành lớn B(2,4,0) tại x=2 nằm trong đường vẽ (toạ độ đã chiếu khớp mesh)', () => {
    // Với Ox, axisY=0: điểm vòng = (x, ρ·sinφ, −ρ·cosφ); tại x=2, ρ=4, φ=π/2 ⇒ đúng B(2,4,0).
    const latex = generateProjectedLatex(baseGeom(revOx), CAM, TARGET);
    const b2d = project3DTo2D({ x: 2, y: 4, z: 0 }, CAM, TARGET);
    expect(latex).toContain(`(${fmt(b2d.x)}, ${fmt(b2d.y)})`);
  });

  it('thiếu samples nhưng có outer poly ⇒ vẫn tự lấy mẫu và vẽ', () => {
    const noSamples: RevolutionSolid = { ...revOx, samples: undefined };
    const latex = generateProjectedLatex(baseGeom(noSamples), CAM, TARGET);
    expect(latex).toMatch(/purple!(55|70), thick\]/);
  });

  it('quanh Oy (vỏ trụ) SINH lệnh vẽ', () => {
    const revOyShell: RevolutionSolid = {
      id: 's2', outer: { kind: 'poly', coeffs: [0, 1] }, axis: 'Oy',
      domain: [0, 3], method: 'shell',
      samples: [{ x: 0.5, r: 0.5 }, { x: 1.5, r: 1.5 }, { x: 3, r: 3 }],
    };
    const latex = generateProjectedLatex(baseGeom(revOyShell), CAM, TARGET);
    expect(latex).toMatch(/purple!(55|70), thick\]/);
  });

  it('quanh Oy (đĩa theo y) SINH lệnh vẽ', () => {
    const revOyDisk: RevolutionSolid = {
      id: 's3', outer: { kind: 'const', c: 2 }, axis: 'Oy',
      domain: [0, 4], method: 'disk',
      samples: [{ x: 0, r: 2 }, { x: 2, r: 2 }, { x: 4, r: 2 }],
    };
    const latex = generateProjectedLatex(baseGeom(revOyDisk), CAM, TARGET);
    expect(latex).toMatch(/purple!(55|70), thick\]/);
  });

  it('trục dời y=k: bán kính vòng = |r−k| (khối vẫn vẽ, không rỗng)', () => {
    const shifted: RevolutionSolid = { ...revOx, axisY: 1 };
    const latex = generateProjectedLatex(baseGeom(shifted), CAM, TARGET);
    expect(latex).toMatch(/purple!(55|70), thick\]/);
  });

  it('CHỐNG CRASH: solid.hidden ⇒ bỏ qua, không vẽ', () => {
    const hidden: RevolutionSolid = { ...revOx, hidden: true } as RevolutionSolid;
    const latex = generateProjectedLatex(baseGeom(hidden), CAM, TARGET);
    // Header vẫn thêm nhưng không có lệnh purple cho khối ẩn này.
    expect(latex).not.toMatch(/purple!(55|70), thick\]/);
  });

  it('CHỐNG CRASH: samples rỗng + outer expr (không parser) ⇒ không throw, không vẽ', () => {
    const exprEmpty: RevolutionSolid = {
      id: 'e', outer: { kind: 'expr', expr: 'sin(x)' }, axis: 'Ox',
      domain: [0, 3], method: 'disk', samples: [],
    };
    expect(() => generateProjectedLatex(baseGeom(exprEmpty), CAM, TARGET)).not.toThrow();
  });

  it('CHỐNG CRASH: phần tử null/không object trong revolutionSolids bị bỏ qua', () => {
    const geom = {
      name: 't', points: [], lines: [], revolutionSolids: [null, undefined, 'bad', revOx],
    } as unknown as GeometryData;
    expect(() => generateProjectedLatex(geom, CAM, TARGET)).not.toThrow();
    expect(generateProjectedLatex(geom, CAM, TARGET)).toMatch(/purple!(55|70), thick\]/);
  });
});

// HỢP ĐỒNG END-TO-END (khoá lỗi "vẫn chưa được"): scene Advance lưu solid ở base với
// hidden:true (mặc định). RightPanel PHẢI chiếu qua projectScene trước khi sinh LaTeX,
// nếu không generator bỏ qua solid ẩn ⇒ không có vòng tròn. Test này khoá đúng chuỗi đó.
describe('HỢP ĐỒNG: base ẩn → projectScene lộ → LaTeX vẽ vòng (khoá RightPanel)', () => {
  const sceneBase = {
    name: 'khối tròn xoay', points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }], lines: [],
    revolutionSolids: [{ ...revOx, hidden: true }],
  } as unknown as GeometryData;
  const steps: AdvanceStep[] = [
    { id: 's0', label: 'Đề bài', visibleIds: ['A'] },
    { id: 's1', label: 'Dựng khối tròn xoay', visibleIds: ['A', 'sol'] },
  ];

  it('base thô (solid.hidden=true) ⇒ generator KHÔNG vẽ vòng nào', () => {
    const latex = generateProjectedLatex(sceneBase, CAM, TARGET);
    expect(latex).not.toMatch(/purple!(55|70), thick\]/);
  });

  it('projectScene ở bước ẩn (step 0) ⇒ vẫn KHÔNG vẽ (solid chưa lộ)', () => {
    const g = projectScene(sceneBase, steps, 0);
    expect(g.revolutionSolids?.[0].hidden).toBe(true);
    expect(generateProjectedLatex(g, CAM, TARGET)).not.toMatch(/purple!(55|70), thick\]/);
  });

  it('projectScene ở bước lộ (step 1) ⇒ solid.hidden=false ⇒ generator VẼ vòng + đường bao', () => {
    const g = projectScene(sceneBase, steps, 1);
    expect(g.revolutionSolids?.[0].hidden).toBe(false);
    const latex = generateProjectedLatex(g, CAM, TARGET);
    expect(latex).toContain('Vẽ khối tròn xoay (Advance)');
    expect(latex).toMatch(/purple!55, thick\].*-- cycle/);
    expect((latex.match(/purple!70, thick\]/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
