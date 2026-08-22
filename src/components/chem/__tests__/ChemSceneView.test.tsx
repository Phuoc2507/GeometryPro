// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// Test ChemSceneView với 3 cảnh mẫu: (a) kết tủa Fe(OH)3, (b) sủi khí H2, (c) đổi màu Fe+CuSO4.
// Hai tầng: (1) hàm THUẦN deriveVesselStates/timelineLength — đối chiếu số bình + màu + event
// chính xác theo mốc thời gian; (2) render DOM (@testing-library/react) — đếm bình, tua tới
// cuối, khẳng định node kết tủa/khí/đổi màu + chú giải màu xuất hiện.
//
// Lưu ý: repo KHÔNG bật jest-dom ⇒ chỉ dùng matcher vitest thuần + query container/thuộc tính.
// Repo cũng không bật test.globals ⇒ tự gọi cleanup sau mỗi test (tránh DOM rò rỉ giữa các test).
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, describe, it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import {
  ChemSceneView,
  deriveVesselStates,
  timelineLength,
  activeCaptionsAt,
  latestEventTextAt,
} from '../ChemSceneView';
import { sceneFeOH3Precipitate, sceneZnHClGas, sceneFeCuSO4Color } from '../sampleScenes';

afterEach(cleanup);

// ── Tầng 1: hàm thuần ────────────────────────────────────────────────────────
describe('ChemScene · dẫn xuất trạng thái (hàm thuần)', () => {
  it('(a) kết tủa Fe(OH)3: 2 bình; dd FeCl3 vàng nâu → nhạt; kết tủa nâu đỏ #8B4513', () => {
    const scene = sceneFeOH3Precipitate;
    const len = timelineLength(scene);
    expect(len).toBe(2);

    // Mốc 0: chưa phản ứng — dd vàng nâu, chưa có kết tủa.
    const at0 = deriveVesselStates(scene, 0);
    expect(at0.length).toBe(2);
    const v1_0 = at0.find((v) => v.id === 'v1')!;
    expect(v1_0.solutionColor).toBe('#B7791F'); // vàng nâu ban đầu
    expect(v1_0.precipitates.length).toBe(0);

    // Mốc cuối: dd nhạt (đổi sang không màu), kết tủa nâu đỏ xuất hiện.
    const atEnd = deriveVesselStates(scene, len);
    const v1 = atEnd.find((v) => v.id === 'v1')!;
    expect(v1.solutionColor).toBe('#EAF4FB'); // đã color_change
    expect(v1.solutionFaded).toBe(true);
    expect(v1.precipitates.length).toBe(1);
    expect(v1.precipitates[0].formula).toBe('Fe(OH)3');
    expect(v1.precipitates[0].color).toBe('#8B4513'); // nâu đỏ
    expect(v1.pouredIn).toContain('NaOH');
    // v2 là nguồn đã rót đi.
    expect(atEnd.find((v) => v.id === 'v2')!.isPourSource).toBe(true);
  });

  it('(b) sủi khí Zn+HCl: 1 bình; Zn tan; thoát khí H2', () => {
    const scene = sceneZnHClGas;
    const len = timelineLength(scene);
    const atEnd = deriveVesselStates(scene, len);
    expect(atEnd.length).toBe(1);
    const v1 = atEnd[0];
    expect(v1.gasFormula).toBe('H2');
    const zn = v1.solids.find((s) => s.formula === 'Zn')!;
    expect(zn.visible).toBe(true);
    expect(zn.dissolved).toBe(true);
    // Mốc 0: Zn đã thả vào nhưng chưa tan, chưa có khí.
    const at0 = deriveVesselStates(scene, 0)[0];
    expect(at0.gasFormula).toBeNull();
    expect(at0.solids[0].dissolved).toBe(false);
  });

  it('(c) đổi màu Fe+CuSO4: dd xanh lam → nhạt; kết tủa Cu đỏ #B87333', () => {
    const scene = sceneFeCuSO4Color;
    const len = timelineLength(scene);
    const at0 = deriveVesselStates(scene, 0)[0];
    expect(at0.solutionColor).toBe('#2E86DE'); // xanh lam ban đầu

    const v1 = deriveVesselStates(scene, len)[0];
    expect(v1.solutionColor).toBe('#EAF4FB'); // mất màu
    expect(v1.solutionFaded).toBe(true);
    expect(v1.precipitates[0].formula).toBe('Cu');
    expect(v1.precipitates[0].color).toBe('#B87333');
    expect(v1.solids.find((s) => s.formula === 'Fe')!.dissolved).toBe(true);
  });

  it('caption + text sự kiện tích luỹ theo mốc', () => {
    const scene = sceneFeOH3Precipitate;
    expect(activeCaptionsAt(scene, 0).length).toBe(0);
    expect(activeCaptionsAt(scene, timelineLength(scene)).length).toBe(1);
    // Text nổi bật ở cuối = mô tả kết tủa (event có `text` mới nhất).
    expect(latestEventTextAt(scene, timelineLength(scene))).toContain('kết tủa');
  });
});

// ── Tầng 2: render DOM ───────────────────────────────────────────────────────
describe('ChemSceneView · render', () => {
  it('(a) render 2 bình; tua tới cuối hiện kết tủa nâu đỏ + có chú giải màu', () => {
    const { container } = render(<ChemSceneView scene={sceneFeOH3Precipitate} />);
    // Đúng 2 bình.
    expect(container.querySelectorAll('[data-vessel-id]').length).toBe(2);
    // Chú giải có ô màu FeCl3 (vàng nâu) và kết tủa Fe(OH)3 (nâu đỏ).
    expect(container.querySelector('[data-hex="#B7791F"]')).not.toBeNull();
    expect(container.querySelector('[data-hex="#8B4513"]')).not.toBeNull();

    // Ban đầu (mốc 0) chưa có node kết tủa trong cảnh.
    expect(container.querySelector('[data-role="precipitate"]')).toBeNull();

    // Tua thanh trượt tới cuối (t=2).
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).not.toBeNull();
    fireEvent.change(slider, { target: { value: '2' } });

    // Kết tủa nâu đỏ Fe(OH)3 đã render trong bình v1.
    const v1 = container.querySelector('[data-vessel-id="v1"]')!;
    const precip = v1.querySelector('[data-role="precipitate"][data-hex="#8B4513"]');
    expect(precip).not.toBeNull();
    expect(precip!.getAttribute('data-formula')).toBe('Fe(OH)3');
    // Dung dịch v1 đã nhạt màu (đổi sang không màu).
    expect(v1.querySelector('[data-role="solution"]')!.getAttribute('data-hex')).toBe('#EAF4FB');
  });

  it('(b) render 1 bình; tua tới cuối thấy khí H2 thoát + Zn đã tan', () => {
    const { container } = render(<ChemSceneView scene={sceneZnHClGas} />);
    expect(container.querySelectorAll('[data-vessel-id]').length).toBe(1);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '2' } });

    // Node khí thoát (mũi tên + nhãn) xuất hiện.
    expect(container.querySelector('.chem-gas-escape')).not.toBeNull();
    // Nhãn khí có chữ H2.
    expect(container.textContent).toContain('H2');
    // Chip Zn được đánh dấu đã tan.
    const zn = container.querySelector('[data-role="solid"][data-formula="Zn"]');
    expect(zn).not.toBeNull();
    expect(zn!.getAttribute('data-dissolved')).toBe('1');
  });

  it('(c) render 1 bình; tua tới cuối dung dịch mất màu + kết tủa Cu đỏ', () => {
    const { container } = render(<ChemSceneView scene={sceneFeCuSO4Color} />);
    expect(container.querySelectorAll('[data-vessel-id]').length).toBe(1);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '3' } });

    // Dung dịch chuyển sang không màu (#EAF4FB) — đổi màu.
    expect(container.querySelector('[data-role="solution"]')!.getAttribute('data-hex')).toBe('#EAF4FB');
    // Kết tủa đồng đỏ Cu #B87333.
    const cu = container.querySelector('[data-role="precipitate"][data-hex="#B87333"]');
    expect(cu).not.toBeNull();
    expect(cu!.getAttribute('data-formula')).toBe('Cu');
  });

  it('nút play/pause đổi nhãn aria khi bấm', () => {
    const { container, getByLabelText } = render(<ChemSceneView scene={sceneZnHClGas} />);
    // Ban đầu chưa chạy ⇒ nút mời "Chạy".
    const playBtn = getByLabelText('Chạy');
    expect(playBtn).not.toBeNull();
    fireEvent.click(playBtn);
    // Sau khi bấm ⇒ nút chuyển thành "Tạm dừng".
    expect(container.querySelector('[aria-label="Tạm dừng"]')).not.toBeNull();
  });
});
