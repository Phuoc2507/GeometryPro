// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// Test PhysicsSceneView: (1) hàm THUẦN agentGeoPositionAt/physicsDuration/computePhysicsView đối chiếu
// vị trí quỹ đạo ném ngang tại từng mốc; (2) render SVG — có agent + mặt đất + thanh tua, tua tới t=1
// thì agent dịch tới (x=10, z=15).
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, describe, it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import {
  PhysicsSceneView,
  agentGeoPositionAt,
  physicsDuration,
  computePhysicsView,
} from '../PhysicsSceneView';
import { extractPhysicsGeometry } from '../SimulationView';
import { samplePhysicsResult } from '../sampleResults';
import type { GeometryData } from '@/types/geometry';

afterEach(cleanup);

const geo = extractPhysicsGeometry(samplePhysicsResult) as GeometryData;
const agent = geo.agents![0];
const tracks = geo.timeline!.tracks;

describe('PhysicsSceneView · hàm thuần', () => {
  it('physicsDuration = 2 s (từ timeline.duration)', () => {
    expect(physicsDuration(geo)).toBe(2);
  });

  it('agentGeoPositionAt: t=0 ⇒ xuất phát (0,0,20)', () => {
    const p = agentGeoPositionAt(agent, tracks, 0);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(20, 6);
  });

  it('agentGeoPositionAt: t=1 ⇒ (x=10, z=15) [x=10t, z=20−5t²]', () => {
    const p = agentGeoPositionAt(agent, tracks, 1);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.z).toBeCloseTo(15, 6);
  });

  it('agentGeoPositionAt: sau khi kết thúc (t=3 > end) ⇒ landing_point (20,0,0)', () => {
    const p = agentGeoPositionAt(agent, tracks, 3);
    expect(p.x).toBeCloseTo(20, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('agentGeoPositionAt: không có track ⇒ giữ initialPosition', () => {
    const p = agentGeoPositionAt(agent, [], 5);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(20, 6);
  });

  it('computePhysicsView: trả khung nhìn hợp lệ, project ra toạ độ hữu hạn', () => {
    const view = computePhysicsView(geo);
    expect(view).not.toBeNull();
    expect(view!.duration).toBe(2);
    const q = view!.project(0, 0);
    expect(Number.isFinite(q.px)).toBe(true);
    expect(Number.isFinite(q.py)).toBe(true);
  });

  it('computePhysicsView(null) ⇒ null (an toàn)', () => {
    expect(computePhysicsView(null)).toBeNull();
  });
});

describe('PhysicsSceneView · render + tua', () => {
  it('có SVG agent + mặt đất + thanh tua; tua tới t=1 agent về (x=10, z=15)', () => {
    const { container } = render(<PhysicsSceneView geometry={geo} />);
    // Sân khấu + agent + mặt đất.
    expect(container.querySelector('[data-testid="physics-scene"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-role="agent"]').length).toBe(1);
    expect(container.querySelector('[data-role="ground"]')).not.toBeNull();

    // Mốc 0: agent ở xuất phát.
    const agent0 = container.querySelector('[data-role="agent"]')!;
    expect(agent0.getAttribute('data-gx')).toBe('0.0000');
    expect(agent0.getAttribute('data-gv')).toBe('20.0000');

    // Tua thanh trượt tới t=1.
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).not.toBeNull();
    fireEvent.change(slider, { target: { value: '1' } });

    const agent1 = container.querySelector('[data-role="agent"]')!;
    expect(agent1.getAttribute('data-gx')).toBe('10.0000');
    expect(agent1.getAttribute('data-gv')).toBe('15.0000');
  });

  it('geometry null ⇒ hiện thông báo, không ném', () => {
    const { container } = render(<PhysicsSceneView geometry={null} />);
    expect(container.textContent).toContain('Không có cảnh');
  });
});
