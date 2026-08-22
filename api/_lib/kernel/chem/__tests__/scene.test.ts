// Task 7 — ChemScene + bảng màu (plan Task 7), áp review F16 (phủ màu mọi sản phẩm,
// default solid = xám nhạt) và F24 ("nhạt dần" khi consumed>0; "mất màu" CHỈ khi after=0).
import { describe, it, expect } from 'vitest';
import { COLORS, colorOf } from '../scene';
import { runChem } from '../runChem';
import { REACTIONS } from '../reactionDB';

describe('bảng màu', () => {
  it('màu chuẩn: dd CuSO4 xanh lam, dd FeCl3 vàng nâu, Fe(OH)3 nâu đỏ, Cu đỏ, AgCl trắng', () => {
    expect(colorOf('CuSO4', 'solution').colorName).toBe('xanh lam');
    expect(colorOf('FeCl3', 'solution').colorName).toBe('vàng nâu');
    expect(colorOf('Fe(OH)3', 'solid').colorName).toBe('nâu đỏ');
    expect(colorOf('Cu', 'solid').colorName).toContain('đỏ');
    expect(colorOf('AgCl', 'solid').colorName).toContain('trắng');
  });
  it('không có trong bảng ⇒ dung dịch "không màu"', () => {
    expect(colorOf('NaCl', 'solution').colorName).toBe('không màu');
  });
  it('F16: bổ sung màu chất rắn DB sinh ra: CuCl2 vàng nâu, FeCl3 nâu đỏ, Ca(OH)2/Na2CO3 trắng', () => {
    expect(colorOf('CuCl2', 'solid').colorName).toBe('vàng nâu');
    expect(colorOf('FeCl3', 'solid').colorName).toBe('nâu đỏ');
    expect(colorOf('Ca(OH)2', 'solid').colorName).toContain('trắng');
    expect(colorOf('Na2CO3', 'solid').colorName).toContain('trắng');
  });
  it('F16: solid ngoài bảng → default "xám nhạt" (có chủ đích, không rơi tự do)', () => {
    expect(colorOf('Sn', 'solid').colorName).toBe('xám nhạt');
  });
  it('§16.2: dd CuCl2 CHỐT "xanh lam" (đồng bộ ion Cu²⁺)', () => {
    expect(colorOf('CuCl2', 'solution').colorName).toBe('xanh lam');
  });
  it('F16 integrity: MỌI sản phẩm của MỌI record tra được màu CÓ CHỦ ĐÍCH (rắn/khí phải có entry tường minh)', () => {
    for (const rec of REACTIONS) {
      for (const prod of rec.products) {
        const c = colorOf(prod.formula, prod.state);
        expect(c.colorName, `${rec.id} ${prod.formula}`).toBeTruthy();
        expect(c.hex, `${rec.id} ${prod.formula}`).toMatch(/^#/);
        if (prod.state === 'solid') {
          expect(COLORS.solid[prod.formula], `${rec.id}: thiếu màu RẮN tường minh cho ${prod.formula}`).toBeDefined();
        }
        if (prod.state === 'gas') {
          expect(COLORS.gas[prod.formula], `${rec.id}: thiếu màu KHÍ tường minh cho ${prod.formula}`).toBeDefined();
        }
      }
    }
  });
});

describe('scene sinh tất định từ runChem', () => {
  it('bài 9 FeCl3+NaOH: 2 vessel, có event precipitate màu nâu đỏ + caption tiếng Việt', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'FeCl3', state: 'solution' },
        { op: 'species', formula: 'NaOH', state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.scene.vessels.length).toBeGreaterThanOrEqual(2);
    const prec = r.scene.events.find((e) => e.kind === 'precipitate');
    expect(prec).toBeTruthy();
    expect((prec as { formula: string }).formula).toBe('Fe(OH)3');
    expect((prec as { color: string }).color).toBe('#8B4513');
    expect(r.scene.captions.length).toBeGreaterThan(0);
  });
  it('bài 1 Fe+CuSO4 dư: add_solid Fe + color_change "nhạt dần" — KHÔNG "mất màu" (F24, CuSO4 dư)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
    });
    expect(r.scene.events.some((e) => e.kind === 'add_solid')).toBe(true);
    const cc = r.scene.events.find((e) => e.kind === 'color_change') as { text: string } | undefined;
    expect(cc).toBeTruthy();
    expect(cc!.text).toMatch(/nhạt dần/);
    expect(cc!.text).not.toMatch(/mất màu/);
  });
  it('H03 Zn+CuSO4 hết: color_change có "mất màu" (after = 0 — F24)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Zn', amount: { grams: '6,5' } },
        { op: 'species', formula: 'CuSO4', amount: { solution: { molarity: '0,4', liters: '0,2' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
    });
    const cc = r.scene.events.find((e) => e.kind === 'color_change') as { text: string } | undefined;
    expect(cc).toBeTruthy();
    expect(cc!.text).toMatch(/mất màu/);
  });
  it('noReaction (Cu + HCl) vẫn có scene tĩnh + caption lý do', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Cu', amount: { grams: '6,4' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.scene.vessels.length).toBeGreaterThanOrEqual(1);
    expect(r.scene.captions.some((c) => /không có phản ứng/.test(c.text))).toBe(true);
  });
  it('mix có đun nóng → có event heat (bài 7 nung CaCO3)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'CaCO3', amount: { grams: 50 } },
        { op: 'mix', heated: true },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'mass', of: 'CaO' }],
    });
    expect(r.scene.events.some((e) => e.kind === 'heat')).toBe(true);
    expect(r.scene.events.some((e) => e.kind === 'gas_bubbles')).toBe(true);
  });
});
