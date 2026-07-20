import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';

const base = {
  name: 'g',
  points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }, { id: 'B', label: 'B', x: 1, y: 0, z: 0 },
           { id: 'M', label: 'M', x: 0, y: 1, z: 0 }],
  lines: [], timeline: { duration: 5, tracks: [{ id: 't', start: 0, end: 5, type: 'parametric_path', params: {} }] },
  agents: [{ id: 'X', label: 'x', initialPosition: [0, 0, 0], color: '#f00' }],
} as any;
const steps = [
  { id: 'a', label: 'Câu a', visibleIds: ['A', 'B'] },
  { id: 'b', label: 'Câu b', visibleIds: ['A', 'B', 'M'] },
] as any;

it('câu 0: A,B hiện (mới=nổi); M ẩn', () => {
  const g = projectScene(base, steps, 0);
  const p = Object.fromEntries(g.points.map((x: any) => [x.id, x]));
  expect(p.A.hidden).toBeFalsy(); expect(p.A.highlight).toBe(true);
  expect(p.M.hidden).toBe(true);
});
it('câu 1: A,B mờ (cũ); M nổi (mới)', () => {
  const g = projectScene(base, steps, 1);
  const p = Object.fromEntries(g.points.map((x: any) => [x.id, x]));
  expect(p.A.dim).toBe(true); expect(p.A.highlight).toBeFalsy();
  expect(p.M.highlight).toBe(true); expect(p.M.hidden).toBeFalsy();
});
it('GIỮ timeline + agents (bài lai câu-động)', () => {
  const g = projectScene(base, steps, 0);
  expect(g.timeline).toBeDefined();
  expect(g.agents).toHaveLength(1);
});

// ═══ Bóc-lớp cho phần tử ngoài điểm/đường/mặt (mặt cầu, đường tròn, trụ, nón, đường cong) ═══
describe('projectScene — cờ cho mặt cầu (và các shape có id)', () => {
  const baseS = {
    name: 'g',
    points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }],
    lines: [],
    spheres: [{ id: 'sph', center: { x: 0, y: 0, z: 0 }, radius: 1 }],
  } as any;
  const stepsS = [
    { id: 'a', label: 'Câu a', visibleIds: ['A'] },        // chưa có 'sph'
    { id: 'b', label: 'Câu b', visibleIds: ['A', 'sph'] }, // mặt cầu xuất hiện
  ] as any;

  it('câu 0: mặt cầu chưa tới câu → hidden', () => {
    const g = projectScene(baseS, stepsS, 0);
    expect(g.spheres[0].hidden).toBe(true);
  });

  it('câu 1: mặt cầu xuất hiện → không ẩn + nổi (highlight)', () => {
    const g = projectScene(baseS, stepsS, 1);
    expect(g.spheres[0].hidden).toBeFalsy();
    expect(g.spheres[0].highlight).toBe(true);
  });
});
