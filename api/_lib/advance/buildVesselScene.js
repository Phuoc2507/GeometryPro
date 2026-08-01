// api/_lib/advance/buildVesselScene.js
// Dựng AdvanceScene cho VẬT THỂ tròn xoay GHÉP KHÚC (bình/lu/chậu/phễu/cốc) từ params đã trích.
// LLM chỉ TRÍCH các khúc (số đo trên thiết diện qua trục); engine DỰNG khối + TỰ KIỂM thể tích
// (công thức đóng ĐỐI CHIẾU tích phân số — xem kernel/analysis/vessel.ts). Tái dùng renderer lathe:
// buildVesselSolid đã cấp sẵn `samples` đường sinh nên frontend khỏi parser.
//
// CHỐNG BỊA: nếu mô hình khúc KHÔNG hợp lệ (hở/chồng/vượt cầu) hoặc hai cách tính thể tích lệch nhau
// ⇒ solid.volume.verified=false ⇒ TRẢ NULL (không phục vụ). Route sẽ rơi về guard "chưa dựng được"
// (hoàn credit + nhắn người dùng), y như các mẫu tròn xoay/thiết diện khác.
import { buildAnalysisFigure, buildVesselSolid, vesselSegmentsFromMeasures } from '../kernel-dist/index.mjs';

export function buildVesselScene(params) {
  const { measures, segments: rawSegments, parts, color } = params || {};
  // ƯU TIÊN định dạng SỐ ĐO (bán kính mép + chiều cao) — dễ cho AI trích, engine tự suy R & tâm cầu.
  // Vẫn nhận `segments` nội bộ (x0/x1/R/c) để dùng trực tiếp/test.
  const segments = Array.isArray(measures) && measures.length
    ? vesselSegmentsFromMeasures(measures)
    : rawSegments;
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const revId = 'vessel1';
  let solid;
  try {
    solid = buildVesselSolid(revId, segments, { color: color || '#6366f1', axis: 'Oy' });
  } catch {
    return null;
  }
  // Không tự kiểm được ⇒ không phục vụ (thà báo "chưa dựng được" còn hơn vẽ + đáp sai).
  if (!solid.volume || !solid.volume.verified) return null;

  const dom = solid.domain;
  const src = (solid.samples && solid.samples.length) ? solid.samples : [{ x: dom[0], r: 0 }];

  // Vật ĐỨNG quay quanh trục dọc ⇒ HOÁN xy để hình dựng đứng: màn hình x = bán kính, y = toạ độ trục.
  const stepEvery = Math.max(1, Math.floor(src.length / 10));
  const samplePts = src
    .filter((_, i) => i % stepEvery === 0)
    .map((s, i) => ({ id: `r${i}`, label: '', x: s.r, y: s.x, z: 0 }));

  const base = buildAnalysisFigure('Vật thể tròn xoay (thiết diện qua trục)', {
    polys: {}, polyDomains: {}, points: samplePts, solids: {},
  });
  base.revolutionSolids = [solid];

  // Đường sinh = nửa thiết diện qua trục. Polyline 'expr' từ mẫu engine (không cần parser ở browser).
  if (src.length >= 2) {
    const curveSamples = src.map((s) => ({ x: s.r, y: s.x }));
    base.curves = [...(base.curves || []), {
      id: 'curve_r', type: 'expr', params: { xMin: 0, xMax: dom[1] }, samples: curveSamples,
    }];
  }

  const curveIds = (base.curves || []).map((c) => c.id);
  const outlineIds = curveIds.length ? curveIds : base.points.map((p) => p.id);

  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Vật thể tròn xoay' };
  const partB = hasTwoParts ? parts[1] : { label: 'Thể tích' };

  const v = solid.volume;
  const steps = [
    {
      id: 's0',
      label: partA.label,
      visibleIds: [...outlineIds, revId],
      highlightIds: [revId],
      anim: { param: 'sweep', label: 'Quét tròn xoay', tMax: dom[1], autoplay: true },
    },
    {
      id: 's1',
      label: partB.label,
      visibleIds: [...outlineIds, revId],
      answer: { text: v.latex, approx: v.value, verified: v.verified },
    },
  ];

  return { base, steps };
}
