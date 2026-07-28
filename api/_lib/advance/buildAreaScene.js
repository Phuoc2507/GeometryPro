// api/_lib/advance/buildAreaScene.js
// Dựng AdvanceScene cho mẫu 'area-plane' (diện tích hình phẳng). Engine tính & tự-kiểm S=∫|f−g|dx.
import { buildAnalysisFigure, buildAreaRegion } from '../kernel-dist/index.mjs';

export function buildAreaScene(params) {
  const { outer, inner, domain, parts } = params;
  const id = 'area1';
  const region = buildAreaRegion(id, outer, domain, inner || undefined, '#22c55e');

  // Điểm mẫu gate: lấy thưa biên trên miền.
  const src = region.samples && region.samples.length ? region.samples : [{ x: domain[0], top: 0, bot: 0 }];
  const stepEvery = Math.max(1, Math.floor(src.length / 8));
  const samplePts = src
    .filter((_, i) => i % stepEvery === 0)
    .map((s, i) => ({ id: `p${i}`, label: '', x: s.x, y: s.top, z: 0 }));

  // Vẽ 2 đường f,g mượt khi LÀ poly.
  const polys = {};
  const polyDomains = {};
  if (outer && outer.kind === 'poly') { polys.f = outer.coeffs.slice(); polyDomains.f = domain; }
  if (inner && inner.kind === 'poly') { polys.g = inner.coeffs.slice(); polyDomains.g = domain; }
  const base = buildAnalysisFigure('Diện tích hình phẳng', { polys, polyDomains, points: samplePts, solids: {} });
  base.areaRegions = [region];

  const curveIds = (base.curves || []).map((c) => c.id);
  const outlineIds = curveIds.length ? curveIds : base.points.map((p) => p.id);
  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Miền phẳng' };
  const partB = hasTwoParts ? parts[1] : { label: 'Diện tích' };

  const s = region.area;
  const steps = [
    {
      id: 's0', label: partA.label,
      visibleIds: [...outlineIds, id], highlightIds: [id],
      anim: { param: 'sweep', label: 'Tô miền', tMax: domain[1], autoplay: true },
    },
    {
      id: 's1', label: partB.label,
      visibleIds: [...outlineIds, id],
      answer: { text: s.latex, approx: s.value, verified: s.verified },
    },
  ];
  return { base, steps };
}
