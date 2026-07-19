import { describe, it, expect } from 'vitest';
import { normalizeGeometryData } from '../normalizeGeometry.js';

describe('normalizeGeometryData — giữ animation (chống bug cắt timeline/agents)', () => {
  const kinematic = {
    name: 'radar',
    points: [
      { id: 'O', label: 'O', x: 0, y: 0, z: 0 },
      { id: 'D', label: 'D', x: 2, y: 0, z: 0.9 },
      { id: 'M', label: 'M', x: 0.88, y: 0.9, z: 1.07 },
    ],
    lines: [],
    agents: [{ id: 'M', label: 'May bay', initialPosition: [2, 0, 0.9], color: '#FFA500', radius: 0.1 }],
    timeline: {
      duration: 10,
      tracks: [{ id: 'mv', start: 0, end: 10, type: 'parametric_path', targetId: 'M', params: { path: 'x(t) = 2 + -0.2*t' } }],
    },
    measurements: [{ id: 'm1', type: 'distance', value: '1.6486', from: 'O', to: 'M' }],
    latexCode: '\\draw (0,0) -- (1,1);',
  };

  it('GIỮ timeline (parametric_path) nguyên vẹn', () => {
    const n = normalizeGeometryData(kinematic);
    expect(n.timeline).toBeDefined();
    expect(n.timeline.tracks[0].type).toBe('parametric_path');
    expect(n.timeline.tracks[0].params.path).toBe('x(t) = 2 + -0.2*t');
  });

  it('GIỮ agents (vật chuyển động)', () => {
    const n = normalizeGeometryData(kinematic);
    expect(n.agents).toHaveLength(1);
    expect(n.agents[0].id).toBe('M');
    expect(n.agents[0].initialPosition).toEqual([2, 0, 0.9]);
  });

  it('GIỮ measurements + latexCode; vẫn chuẩn hoá points', () => {
    const n = normalizeGeometryData(kinematic);
    expect(n.measurements).toHaveLength(1);
    expect(n.latexCode).toContain('draw');
    expect(n.points).toHaveLength(3);
    expect(n.points[0].id).toBe('O');
  });

  it('bài không animation: KHÔNG chèn timeline/agents rỗng', () => {
    const n = normalizeGeometryData({ name: 'x', points: [{ id: 'A', x: 0, y: 0, z: 0 }], lines: [] });
    expect(n.timeline).toBeUndefined();
    expect(n.agents).toBeUndefined();
  });
});
