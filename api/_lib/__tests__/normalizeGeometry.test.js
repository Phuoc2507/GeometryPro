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

describe('normalizeGeometryData plane references', () => {
  it('links plane coordinates to canonical point IDs and clamps opacity', () => {
    const normalized = normalizeGeometryData({
      name: 'plane',
      points: [
        { id: 'A', x: 0, y: 0, z: 0 },
        { id: 'B', x: 2, y: 0, z: 0 },
        { id: 'C', x: 0, y: 2, z: 0 },
      ],
      lines: [],
      planes: [{
        id: 'ABC',
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
          { x: 0, y: 2, z: 0 },
        ],
        opacity: 0.9,
      }],
    });

    expect(normalized.planes[0].pointIds).toEqual(['A', 'B', 'C']);
    expect(normalized.planes[0].points).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 0, y: 2, z: 0 },
    ]);
    expect(normalized.planes[0].opacity).toBe(0.35);
  });

  it('falls back to coordinates when a pointIds list is incomplete', () => {
    const normalized = normalizeGeometryData({
      points: [
        { id: 'A', x: 0, y: 0, z: 0 },
        { id: 'B', x: 2, y: 0, z: 0 },
        { id: 'C', x: 2, y: 2, z: 0 },
        { id: 'D', x: 0, y: 2, z: 0 },
      ],
      planes: [{
        pointIds: ['A', 'B', 'missing', 'D'],
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
          { x: 2, y: 2, z: 0 },
          { x: 0, y: 2, z: 0 },
        ],
      }],
    });

    expect(normalized.planes[0].pointIds).toEqual(['A', 'B', 'C', 'D']);
    expect(normalized.planes[0].points).toHaveLength(4);
  });
});

describe('normalizeGeometryData surfaces — center BẮT BUỘC (chống crash canvas)', () => {
  it('surface THIẾU center ⇒ mặc định gốc toạ độ (không để undefined lọt tới renderer)', () => {
    const n = normalizeGeometryData({
      name: 's', points: [], lines: [],
      surfaces: [{ type: 'paraboloid', params: { a: 2, h: 4 } }],   // KHÔNG có center
    });
    expect(n.surfaces).toHaveLength(1);
    expect(n.surfaces[0].center).toEqual({ x: 0, y: 0, z: 0 });
    expect(n.surfaces[0].id).toBeTruthy();
  });
  it('surface center = id điểm ⇒ resolve về toạ độ điểm đó', () => {
    const n = normalizeGeometryData({
      name: 's', points: [{ id: 'O', x: 1, y: 2, z: 3 }], lines: [],
      surfaces: [{ id: 'sf1', type: 'revolution', center: 'O', params: {} }],
    });
    expect(n.surfaces[0].center).toEqual({ x: 1, y: 2, z: 3 });
  });
  it('surface center object {x,y,z} + params thiếu ⇒ giữ center, params={}', () => {
    const n = normalizeGeometryData({
      name: 's', points: [], lines: [],
      surfaces: [{ type: 'torus', center: { x: 0, y: 5, z: 0 } }],   // KHÔNG có params
    });
    expect(n.surfaces[0].center).toEqual({ x: 0, y: 5, z: 0 });
    expect(n.surfaces[0].params).toEqual({});
  });
  it('không có surfaces ⇒ không chèn mảng rỗng', () => {
    const n = normalizeGeometryData({ name: 's', points: [], lines: [] });
    expect(n.surfaces).toBeUndefined();
  });
});
