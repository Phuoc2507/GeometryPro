import { describe, it, expect } from 'vitest';
import { buildRevolutionScene } from '../buildRevolutionScene.js';

const params = {
  outer: { kind: 'sqrt', a: 1, b: 0 },
  domain: [0, 4],
  fnLabel: 'y=\\sqrt{x}',
  parts: [
    { label: 'Câu a', hoi: 'Vẽ khối tròn xoay quanh Ox' },
    { label: 'Câu b', hoi: 'Tính thể tích' },
  ],
};

describe('buildRevolutionScene', () => {
  const scene = buildRevolutionScene(params);

  it('base có điểm mẫu (qua gate points>0)', () => {
    expect(scene.base.points.length).toBeGreaterThan(0);
  });
  it('base gắn đúng 1 khối tròn xoay', () => {
    expect(scene.base.revolutionSolids).toHaveLength(1);
    expect(scene.base.revolutionSolids[0].axis).toBe('Ox');
  });
  it('2 bước, cumulative visibleIds gồm id khối từ Câu a', () => {
    expect(scene.steps).toHaveLength(2);
    const revId = scene.base.revolutionSolids[0].id;
    expect(scene.steps[0].visibleIds).toContain(revId);
    expect(scene.steps[1].visibleIds).toContain(revId);
  });
  it('Câu a có anim sweep autoplay; Câu b có đáp án thể tích verified', () => {
    expect(scene.steps[0].anim).toMatchObject({ param: 'sweep', autoplay: true });
    expect(scene.steps[1].answer.verified).toBe(true);
    expect(scene.steps[1].answer.approx).toBeCloseTo(8 * Math.PI, 4);
  });
  it('bước KHÔNG mang solution dạng chuỗi (solution phải là SolveResult hoặc vắng)', () => {
    // Regression: solution:string làm AdvanceSolutionPanel hydrate rồi SolveResultView crash.
    for (const s of scene.steps) {
      expect(typeof s.solution).not.toBe('string');
    }
  });

  it('expr y=e^x trên [0,1] → π(e²−1)/2, base có mẫu điểm & khối', () => {
    const sc = buildRevolutionScene({
      outer: { kind: 'expr', expr: 'exp(x)' },
      domain: [0, 1],
      fnLabel: 'y=e^x',
      parts: [{ label: 'Câu 1', hoi: 'Tính thể tích quanh Ox' }],
    });
    expect(sc.base.points.length).toBeGreaterThan(0);
    expect(sc.base.revolutionSolids[0].samples.length).toBeGreaterThan(0);
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].answer.approx).toBeCloseTo((Math.PI * (Math.E * Math.E - 1)) / 2, 4);
  });

  it('vành khăn y=x & y=x² trên [0,1] → 2π/15, khối method=washer', () => {
    const sc = buildRevolutionScene({
      outer: { kind: 'poly', coeffs: [0, 1] },
      inner: { kind: 'poly', coeffs: [0, 0, 1] },
      domain: [0, 1],
      fnLabel: 'y=x, y=x^2',
      parts: [{ label: 'Câu 1', hoi: 'Tính thể tích quanh Ox' }],
    });
    expect(sc.base.revolutionSolids[0].method).toBe('washer');
    expect(sc.steps[1].answer.approx).toBeCloseTo((2 * Math.PI) / 15, 4);
  });

  it('rev quanh Oy (axis=Oy) y=x² trên [0,1] → π/2, khối axis=Oy method=shell', () => {
    const sc = buildRevolutionScene({
      outer: { kind: 'poly', coeffs: [0, 0, 1] },
      axis: 'Oy',
      domain: [0, 1],
      fnLabel: 'y=x^2',
      parts: [{ label: 'Câu 1', hoi: 'Tính thể tích quanh Oy' }],
    });
    expect(sc.base.revolutionSolids[0].axis).toBe('Oy');
    expect(sc.base.revolutionSolids[0].method).toBe('shell');
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].answer.approx).toBeCloseTo(Math.PI / 2, 4);
  });

  it('rev quanh Oy 2 ĐƯỜNG y=f(x) CHƯA nghịch đảo (lỗ hổng Oy): y=x & y=x² → π/6, KHÔNG còn 2π/3 sai', () => {
    // Regression cho lỗ hổng bench (gemini-3.6-high/grok): LLM đưa cặp đường y(x) chưa nghịch đảo
    // (outer=x, inner=x², axis=Oy, KHÔNG profileVar). Trước sửa: vỏ trụ bỏ inner ⇒ 2.0944 (=2π/3) mà
    // vẫn verified:true (sai âm thầm). Sau sửa: chiều cao vỏ = outer−inner ⇒ π/6 ≈ 0.5236, verified:true.
    const sc = buildRevolutionScene({
      outer: { kind: 'poly', coeffs: [0, 1] },       // y = x
      inner: { kind: 'poly', coeffs: [0, 0, 1] },    // y = x²
      axis: 'Oy',
      domain: [0, 1],
      fnLabel: 'y=x,\\ y=x^2',
      parts: [{ label: 'Câu 1', hoi: 'Tính thể tích quanh Oy' }],
    });
    expect(sc.base.revolutionSolids[0].axis).toBe('Oy');
    expect(sc.base.revolutionSolids[0].method).toBe('shell');
    expect(sc.base.revolutionSolids[0].innerSamples.length).toBeGreaterThan(0);
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].answer.approx).toBeCloseTo(Math.PI / 6, 4);
    expect(sc.steps[1].answer.approx).not.toBeCloseTo((2 * Math.PI) / 3, 2); // KHÔNG còn giá trị sai cũ
  });

  it('rev quanh Oy THEO Y (profileVar=y, đường x=g(y)) — Ví dụ 4 → 30.6π, axis=Oy method=washer', () => {
    // Lỗ hổng Oy Đợt 1: miền cho bởi x=5−y² & x=3−y quay quanh Oy ⇒ đĩa/vành khăn THEO y (không vỏ trụ).
    const sc = buildRevolutionScene({
      outer: { kind: 'poly', coeffs: [5, 0, -1] },   // x_ng = 5 − y²
      inner: { kind: 'poly', coeffs: [3, -1] },      // x_tr = 3 − y
      axis: 'Oy',
      profileVar: 'y',
      domain: [-1, 2],
      fnLabel: 'x=5-y^2,\\ x=3-y',
      parts: [{ label: 'Câu 1', hoi: 'Tính thể tích quanh Oy' }],
    });
    expect(sc.base.revolutionSolids[0].axis).toBe('Oy');
    expect(sc.base.revolutionSolids[0].method).toBe('washer');
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].answer.approx).toBeCloseTo(30.6 * Math.PI, 4);
    // Đường x=g(y) ⇒ KHÔNG dùng cơ chế poly-curve (vốn plot y=f(x) → sai hướng); base dựa điểm mẫu (hoán xy).
    expect(sc.base.curves.length).toBe(0);
    expect(sc.base.points.length).toBeGreaterThan(0);   // vẫn qua gate points>0
  });

  it('biên dạng poly ⇒ khung nhìn HIỆN đường cong biên dạng, KHÔNG rải điểm mẫu (tránh "vẽ hình khác")', () => {
    // Regression: trước đây visibleIds gồm ~34 điểm mẫu không nhãn ⇒ hiện thành đám chấm, ẩn mất
    // đường sinh r(x). Nay poly ⇒ hiện curve_r + khối; điểm mẫu vẫn ở base (qua gate) nhưng bị ẩn.
    const sc = buildRevolutionScene({ outer: { kind: 'poly', coeffs: [0, 0, 1] }, domain: [0, 2] });
    const curveIds = sc.base.curves.map((c) => c.id);
    expect(curveIds.length).toBeGreaterThan(0);
    for (const cid of curveIds) {
      expect(sc.steps[0].visibleIds).toContain(cid);
      expect(sc.steps[1].visibleIds).toContain(cid);
    }
    const pointIds = new Set(sc.base.points.map((p) => p.id));
    expect(sc.steps[0].visibleIds.filter((id) => pointIds.has(id))).toHaveLength(0);
  });

  it('biên dạng KHÔNG-poly (sqrt) ⇒ không có curve nên GIỮ điểm mẫu làm khung nhìn duy nhất', () => {
    const sc = buildRevolutionScene({ outer: { kind: 'sqrt', a: 1, b: 0 }, domain: [0, 4] });
    expect(sc.base.curves.length).toBe(0);
    const pointIds = new Set(sc.base.points.map((p) => p.id));
    expect(sc.steps[0].visibleIds.filter((id) => pointIds.has(id)).length).toBeGreaterThan(0);
  });

  it('rev-ox 1 câu: y=x^2 trên [0,2] → 32π/5, nhãn bước gọn (Khối tròn xoay / Thể tích)', () => {
    // Bài điển hình chỉ 1 câu ⇒ templateParams.parts có 1 phần tử (hoặc vắng).
    const oneQ = buildRevolutionScene({
      outer: { kind: 'poly', coeffs: [0, 0, 1] }, // x^2
      domain: [0, 2],
      fnLabel: 'y=x^2',
      parts: [{ label: 'Câu 1', hoi: 'Tính thể tích khi quay quanh Ox' }],
    });
    expect(oneQ.steps).toHaveLength(2);
    expect(oneQ.steps[0].label).toBe('Khối tròn xoay');
    expect(oneQ.steps[1].label).toBe('Thể tích');
    expect(oneQ.steps[1].answer.verified).toBe(true);
    expect(oneQ.steps[1].answer.approx).toBeCloseTo((32 * Math.PI) / 5, 4);
  });
});
