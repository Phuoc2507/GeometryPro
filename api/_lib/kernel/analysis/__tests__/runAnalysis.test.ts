import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis', () => {
  it('solve: điểm P=(t,0,0), tìm t sao cho d(O,P)=3 → t=3', () => {
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 10] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 3 },
        report: { kind: 'distance', a: 'O', b: 'P' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(3, 6);
    expect(r.answer.approx).toBeCloseTo(3, 6);
  });

  it('optimize: điểm P=(t,0,0), max của −(t−2)² qua diện… dùng khoảng cách', () => {
    // max âm-bình-phương: điểm P=(t,0,0), tối thiểu d(P,(2,0,0)) ⇔ t=2.
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 5] }],
      ops: [
        { op: 'oxyz_point', name: 'Q', at: [2, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      analyze: { kind: 'optimize', parameter: 't', sense: 'min', objective: { kind: 'distance', a: 'P', b: 'Q' } },
    });
    expect(r.ok).toBe(true);
    expect(r.parameter.value).toBeCloseTo(2, 5);
  });

  it('kiểm asserts tại nghiệm: assert SAI → ok=false + violation (chống ảo giác)', () => {
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 10] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      asserts: [{ relation: 'dist', args: ['O', 'P'], value: 99 }], // sai tại nghiệm t=3 (d=3≠99)
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 3 },
        report: { kind: 'distance', a: 'O', b: 'P' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('kiểm asserts tại nghiệm: assert ĐÚNG → ok=true', () => {
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 10] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      asserts: [{ relation: 'dist', args: ['O', 'P'], value: 3 }], // đúng tại nghiệm t=3
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 3 },
        report: { kind: 'distance', a: 'O', b: 'P' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('trả HÌNH tại nghiệm (để route vẽ hiện được cả hình lẫn số)', () => {
    const r = runAnalysis({
      solidName: 'x', parameters: [{ name: 't', domain: [0, 10] }],
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'P', at: ['t', 0, 0] },
      ],
      analyze: {
        kind: 'solve', parameter: 't',
        constraint: { of: { kind: 'distance', a: 'O', b: 'P' }, equals: 3 },
        report: { kind: 'distance', a: 'O', b: 'P' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.geometry).not.toBeNull();
    const g = r.geometry as { points: { id: string; x: number }[] };
    expect(g.points.length).toBe(2);
    // P dựng tại nghiệm t=3 ⇒ P.x = 3
    expect(g.points.find((p) => p.id === 'P').x).toBeCloseTo(3, 6);
  });

  it('eval solid_volume (2 trụ) → trả HÌNH khung dây (points>0)', () => {
    const r = runAnalysis({
      solidName: 'x',
      solids: [
        { name: 'A', kind: 'cylinder', center: [0, 0], radius: 2, from: 0, to: 4 },
        { name: 'B', kind: 'cylinder', center: [1, 0], radius: 2, from: 0, to: 4 },
      ],
      analyze: { kind: 'eval', of: { kind: 'solid_volume', of: ['A', 'B'], mode: 'intersection' } },
    });
    expect(r.ok).toBe(true);
    expect(r.geometry).not.toBeNull();
    const g = r.geometry as { points: unknown[] };
    expect(g.points.length).toBeGreaterThan(0);
  });

  it('optimize_multi (1 function) → trả HÌNH có curve (curves>0)', () => {
    const r = runAnalysis({
      solidName: 'x',
      parameters: [{ name: 'a', domain: [0, 4] }, { name: 'b', domain: [0, 4] }],
      functions: [{ name: 'f', form: 'poly', degree: 2, through: [[0, 0], [1, 1], [2, 4]] }],
      analyze: { kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min', objective: { kind: 'expr', expr: '(a-1)^2 + (b-2)^2' } },
    });
    expect(r.ok).toBe(true);
    expect(r.geometry).not.toBeNull();
    const g = r.geometry as { curves: unknown[] };
    expect(g.curves.length).toBeGreaterThan(0);
  });
});
