// Test circuitLayout.ts (§10.3) — dữ-liệu-chờ-UI. KHÔNG khóa tọa độ đẹp/xấu, chỉ khóa BẤT BIẾN:
// (1) mỗi phần tử cây xuất hiện đúng MỘT lần (+ 1 nguồn); (2) không hai cell nào đè nhau;
// (3) mỗi khối parallel có đủ 2 junction mép; mọi cell nằm trong lưới; cây một lá hợp lệ.
import { describe, it, expect } from 'vitest';
import { buildLayout } from '../circuitLayout';
import type { CircuitNode } from '../circuitSchema';

const R = (name: string, ohms: number): CircuitNode => ({ kind: 'resistor', name, ohms });
const S = (...items: CircuitNode[]): CircuitNode => ({ kind: 'series', items });
const P = (...items: CircuitNode[]): CircuitNode => ({ kind: 'parallel', items });

type Cell = { x: number; y: number; w: number; h: number };
const overlap = (a: Cell, b: Cell): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const noOverlap = (cells: Cell[]): boolean => {
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) if (overlap(cells[i], cells[j])) return false;
  return true;
};

const countKind = (node: CircuitNode, kind: string): number =>
  node.kind === 'series' || node.kind === 'parallel'
    ? node.items.reduce((s, it) => s + countKind(it, kind), 0)
    : node.kind === kind ? 1 : 0;
const leafCount = (node: CircuitNode): number =>
  node.kind === 'series' || node.kind === 'parallel' ? node.items.reduce((s, it) => s + leafCount(it), 0) : 1;

describe('circuitLayout — bất biến (không khóa tọa độ)', () => {
  const cases: { name: string; tree: CircuitNode; parGroups: number }[] = [
    { name: 'C1 nối tiếp thuần', tree: S(R('R1', 4), R('R2', 8)), parGroups: 0 },
    { name: 'C5 R1 nt (R2//R3)', tree: S(R('R1', 4), P(R('R2', 6), R('R3', 3))), parGroups: 1 },
    { name: 'C6 lồng 3 tầng', tree: S(R('R1', 2), P(R('R2', 3), S(R('R3', 2), R('R4', 4)))), parGroups: 1 },
    { name: 'song song 3 nhánh', tree: P(R('R1', 6), R('R2', 12), R('R3', 4)), parGroups: 1 },
    { name: 'cây MỘT lá (bếp)', tree: R('bep', 44), parGroups: 0 },
  ];

  for (const c of cases) {
    it(`${c.name}: 1 phần tử = 1 element (+nguồn), không đè, trong lưới, junction đủ`, () => {
      const layout = buildLayout({ problemName: 'p', source: { emf: 12, r: 1 }, circuit: c.tree });
      // (1) đúng số element = số lá + 1 nguồn; mỗi lá đúng một lần
      const nLeaf = leafCount(c.tree);
      expect(layout.elements.length).toBe(nLeaf + 1);
      expect(layout.elements.filter((e) => e.type === 'source').length).toBe(1);
      const names = layout.elements.filter((e) => e.type !== 'source').map((e) => e.name);
      expect(new Set(names).size).toBe(nLeaf);
      // (2) không hai cell nào đè nhau
      expect(noOverlap(layout.elements.map((e) => e.cell))).toBe(true);
      // (3) mọi cell trong lưới
      for (const e of layout.elements) {
        expect(e.cell.x).toBeGreaterThanOrEqual(0);
        expect(e.cell.y).toBeGreaterThanOrEqual(0);
        expect(e.cell.x + e.cell.w).toBeLessThanOrEqual(layout.grid.cols);
        expect(e.cell.y + e.cell.h).toBeLessThanOrEqual(layout.grid.rows);
      }
      // (3b) junction: 2 mỗi khối parallel
      expect(layout.junctions.length).toBe(2 * c.parGroups);
    });
  }

  it('valueText mang SỐ LIỆU ĐỀ CHO (không nhúng giá trị engine tính) — nguồn ghi E, r', () => {
    const layout = buildLayout({ problemName: 'p', source: { emf: 12, r: 1 }, circuit: R('R1', 4) });
    const src = layout.elements.find((e) => e.type === 'source');
    expect(src?.valueText).toContain('12'); // E = 12
    expect(src?.valueText).toContain('1'); // r = 1
    expect(layout.elements.find((e) => e.name === 'R1')?.valueText).toContain('4');
  });

  it('lá unknown_resistor: valueText đánh dấu ẩn', () => {
    const layout = buildLayout({ problemName: 'p', source: { emf: 12, r: 1 }, circuit: S(R('R1', 5), { kind: 'unknown_resistor', name: 'Rx' }) });
    const rx = layout.elements.find((e) => e.name === 'Rx');
    expect(rx?.type).toBe('unknown_resistor');
    expect(rx?.valueText).toMatch(/\?/);
  });
});
