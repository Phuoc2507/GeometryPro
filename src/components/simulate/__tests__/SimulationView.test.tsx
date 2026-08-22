// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// Test SimulationView: render với result LÝ mẫu + HÓA mẫu → khẳng định ĐÚNG renderer theo môn +
// có bảng đáp số; ok:false hiện chẩn đoán "ngoài phạm vi"; 401 hiện "cần đăng nhập"; extractor scene
// dò được CẢ HAI shape (scene.geometry ↔ scene · scene ↔ scene.chemScene).
//
// Lưu ý (như ChemSceneView.test): repo KHÔNG bật jest-dom / test.globals ⇒ dùng matcher vitest thuần +
// tự cleanup sau mỗi test.
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import {
  SimulationView,
  extractPhysicsGeometry,
  extractChemScene,
} from '../SimulationView';
import { samplePhysicsResult, sampleChemResult, samplePhysicsAbstain } from '../sampleResults';
import { sceneFeCuSO4Color } from '@/components/chem/sampleScenes';
import type { SubjectResult } from '@/hooks/useSubjectSolver';

afterEach(cleanup);

// ── Extractor (hàm thuần) — dò CẢ HAI shape scene ─────────────────────────────
describe('extractPhysicsGeometry / extractChemScene · dò 2 shape', () => {
  it('physics: lấy được từ scene.geometry (shape route thực)', () => {
    const g = extractPhysicsGeometry(samplePhysicsResult);
    expect(g).not.toBeNull();
    expect(Array.isArray(g!.agents)).toBe(true);
    expect(g!.agents!.length).toBe(1);
  });

  it('physics: lấy được khi scene CHÍNH LÀ GeometryData (shape mô tả điều phối)', () => {
    const geo = (samplePhysicsResult.scene as { geometry: unknown }).geometry;
    const alt: SubjectResult = { subject: 'physics', ok: true, scene: geo };
    const g = extractPhysicsGeometry(alt);
    expect(g).not.toBeNull();
    expect(g!.agents!.length).toBe(1);
  });

  it('chem: lấy được khi scene CHÍNH LÀ ChemScene (shape route thực)', () => {
    const c = extractChemScene(sampleChemResult);
    expect(c).not.toBeNull();
    expect(c!.vessels.length).toBe(1);
  });

  it('chem: lấy được từ scene.chemScene (shape mô tả điều phối)', () => {
    const alt: SubjectResult = { subject: 'chem', ok: true, scene: { chemScene: sceneFeCuSO4Color } };
    const c = extractChemScene(alt);
    expect(c).not.toBeNull();
    expect(c!.vessels.length).toBe(1);
  });

  it('null an toàn khi thiếu scene', () => {
    expect(extractPhysicsGeometry(null)).toBeNull();
    expect(extractPhysicsGeometry({ subject: 'physics', scene: null })).toBeNull();
    expect(extractChemScene({ subject: 'chem', scene: {} })).toBeNull();
  });
});

// ── Render theo môn ───────────────────────────────────────────────────────────
describe('SimulationView · render theo môn', () => {
  it('LÝ: dùng PhysicsSceneView (SVG agent), có bảng đáp số 3 dòng + "đã kiểm chứng"', () => {
    const { container } = render(<SimulationView result={samplePhysicsResult} />);
    const root = container.querySelector('[data-testid="simulation-view"]')!;
    expect(root.getAttribute('data-subject')).toBe('physics');

    // Đúng renderer LÝ (không phải Hóa).
    expect(container.querySelector('[data-testid="physics-scene"]')).not.toBeNull();
    expect(container.querySelector('[data-vessel-id]')).toBeNull();
    // Có agent (vật chuyển động).
    expect(container.querySelectorAll('[data-role="agent"]').length).toBe(1);

    // Bảng đáp số: 3 dòng + huy hiệu kiểm chứng.
    expect(container.querySelector('[data-testid="answer-panel"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="answer-row"]').length).toBe(3);
    expect(container.querySelector('[data-testid="verified-badge"]')).not.toBeNull();
    expect(container.textContent).toContain('Tầm xa');
    expect(container.textContent).toContain('2 s');
    expect(container.textContent).toContain('đã kiểm chứng');
  });

  it('HÓA: dùng ChemSceneView (bình thí nghiệm), có bảng đáp số + phương trình', () => {
    const { container } = render(<SimulationView result={sampleChemResult} />);
    const root = container.querySelector('[data-testid="simulation-view"]')!;
    expect(root.getAttribute('data-subject')).toBe('chem');

    // Đúng renderer HÓA (không phải Lý).
    expect(container.querySelectorAll('[data-vessel-id]').length).toBe(1);
    expect(container.querySelector('[data-testid="physics-scene"]')).toBeNull();

    // Bảng đáp số có phương trình + khối lượng Cu.
    expect(container.querySelector('[data-testid="answer-panel"]')).not.toBeNull();
    expect(container.textContent).toContain('CuSO₄');
    expect(container.textContent).toContain('6,4 g');
  });

  it('ok:false: hiện chẩn đoán "ngoài phạm vi", KHÔNG có bảng đáp số', () => {
    const { container } = render(<SimulationView result={samplePhysicsAbstain} />);
    expect(container.querySelector('[data-testid="diagnostics"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="answer-panel"]')).toBeNull();
    // Nhãn trạng thái báo ngoài phạm vi.
    const status = container.querySelector('[data-testid="status-badge"]')!;
    expect(status.textContent).toContain('ngoài phạm vi');
    // Lý do abstain hiển thị.
    expect(container.textContent).toContain('thiếu');
  });

  it('401: hiện "Cần đăng nhập"', () => {
    const { container } = render(
      <SimulationView result={null} error={{ message: 'Vui lòng đăng nhập để dùng tính năng giải Lý/Hóa.', kind: 'auth', status: 401 }} />,
    );
    const root = container.querySelector('[data-testid="simulation-view"]')!;
    expect(root.getAttribute('data-state')).toBe('error');
    expect(container.textContent).toContain('Cần đăng nhập');
    expect(container.textContent).toContain('đăng nhập');
  });

  it('đề Toán / delegate → note luồng Toán, KHÔNG renderer Lý/Hóa', () => {
    const { container } = render(<SimulationView result={{ subject: 'geometry', delegate: true }} />);
    expect(container.querySelector('[data-testid="physics-scene"]')).toBeNull();
    expect(container.querySelector('[data-vessel-id]')).toBeNull();
    expect(container.textContent).toContain('Toán');
  });

  it('trạng thái rỗng (chưa có result) hiện gợi ý', () => {
    const { container } = render(<SimulationView result={null} />);
    const root = container.querySelector('[data-testid="simulation-view"]')!;
    expect(root.getAttribute('data-state')).toBe('empty');
  });
});
