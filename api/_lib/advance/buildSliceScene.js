// api/_lib/advance/buildSliceScene.js
// Dựng AdvanceScene cho mẫu 'cross-known' (khối thiết diện đã biết). LLM chỉ trích tham số; engine dựng & kiểm.
// Khuôn theo buildRevolutionScene.js: base = buildAnalysisFigure (curve/điểm mẫu qua gate) + SliceStack đã verified.
import { buildAnalysisFigure, buildSliceStack } from '../kernel-dist/index.mjs';

export function buildSliceScene(params) {
  const { section, outer, domain, inner, ratio, parts, axis } = params;
  const sec = ['square', 'equilateral', 'semicircle', 'rect'].includes(section) ? section : 'square';
  const solidAxis = axis === 'Oy' ? 'Oy' : 'Ox';
  const id = 'slice1';
  const solid = buildSliceStack(id, sec, outer, domain, '#0ea5e9', inner || undefined, ratio, solidAxis);
  // Cận có thể ĐÃ được engine tinh chỉnh về giao điểm chính xác (vá cận vô tỉ) ⇒ dùng cận đã tinh chỉnh.
  const dom = solid.domain;

  // Điểm mẫu cho gate points>0, lấy thưa từ mẫu cạnh (điểm biên trên miền đáy: (t, side)).
  const src = solid.samples && solid.samples.length ? solid.samples : [{ t: dom[0], side: 0 }];
  const stepEvery = Math.max(1, Math.floor(src.length / 8));
  const samplePts = src
    .filter((_, i) => i % stepEvery === 0)
    .map((s, i) => ({ id: `p${i}`, label: '', x: s.t, y: s.side, z: 0 }));

  // Biên dạng đáy LÀ poly (theo trục) ⇒ vẽ curve mượt; kiểu khác dựa điểm mẫu.
  const usePolyCurve = outer && outer.kind === 'poly';
  const base = buildAnalysisFigure('Thể tích theo thiết diện', {
    polys: usePolyCurve ? { r: outer.coeffs.slice() } : {},
    polyDomains: usePolyCurve ? { r: dom } : {},
    points: samplePts,
    solids: {},
  });
  base.sliceStacks = [solid];

  const curveIds = (base.curves || []).map((c) => c.id);
  const outlineIds = curveIds.length ? curveIds : base.points.map((p) => p.id);
  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Khối thiết diện' };
  const partB = hasTwoParts ? parts[1] : { label: 'Thể tích' };

  const v = solid.volume;
  const steps = [
    {
      id: 's0', label: partA.label,
      visibleIds: [...outlineIds, id], highlightIds: [id],
      anim: { param: 'sweep', label: 'Xếp lát', tMax: dom[1], autoplay: true },
    },
    {
      id: 's1', label: partB.label,
      visibleIds: [...outlineIds, id],
      answer: { text: v.latex, approx: v.value, verified: v.verified },
    },
  ];
  return { base, steps };
}
