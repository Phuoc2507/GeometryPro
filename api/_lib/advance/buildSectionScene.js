// api/_lib/advance/buildSectionScene.js
// Dựng AdvanceScene cho mẫu 'section-poly' (thiết diện khối đa diện). LLM chỉ trích tham số; engine dựng & kiểm.
// Khối = điểm có tên + cạnh (renderer sẵn có vẽ); phần mới = đa giác SectionCut (đã verified).
import { buildSectionCut } from '../kernel-dist/index.mjs';

const KINDS = ['cube', 'box', 'pyramid-quad', 'prism-tri'];

export function buildSectionScene(params) {
  const { kind, dims, points, parts, color } = params || {};
  if (!KINDS.includes(kind)) return null;
  const built = buildSectionCut('sec1', kind, dims || {}, points || [], color || '#f59e0b');
  if (!built) return null;
  const { sectionCut, poly } = built;

  // Đỉnh khối → Point3D có nhãn; cạnh → Line3D.
  const vpoints = Object.entries(poly.vertices).map(([name, v]) => ({
    id: name, label: name, x: v[0], y: v[1], z: v[2],
  }));
  const vlines = poly.edges.map(([a, b], i) => ({ id: `e${i}`, from: a, to: b, style: 'solid' }));

  // 3 điểm xác định mặt phẳng → điểm nổi, nhãn M/N/P (nếu không trùng đỉnh có sẵn).
  const labelMNP = ['M', 'N', 'P'];
  const defPts = (points || []).slice(0, 3).map((sp, i) => {
    let x, y, z;
    if (sp.vertex) { const v = poly.vertices[sp.vertex]; [x, y, z] = v; }
    else {
      const [n1, n2] = sp.onEdge; const v1 = poly.vertices[n1]; const v2 = poly.vertices[n2]; const t = sp.t;
      x = v1[0] + (v2[0] - v1[0]) * t; y = v1[1] + (v2[1] - v1[1]) * t; z = v1[2] + (v2[2] - v1[2]) * t;
    }
    const onVertex = sp.vertex ? sp.vertex : null;
    return { id: onVertex || `mp${i}`, label: onVertex || labelMNP[i], x, y, z };
  });
  // Bỏ điểm xác định trùng id đỉnh khối (đỉnh đã có trong vpoints).
  const existing = new Set(vpoints.map((p) => p.id));
  const extraPts = defPts.filter((p) => !existing.has(p.id));

  const base = {
    name: 'Thiết diện', points: [...vpoints, ...extraPts], lines: vlines,
    curves: [], planes: [], sectionCuts: [sectionCut],
  };

  const solidIds = [...vpoints.map((p) => p.id), ...vlines.map((l) => l.id)];
  const defPtIds = defPts.map((p) => p.id);
  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Dựng mặt phẳng cắt' };
  const partB = hasTwoParts ? parts[1] : { label: 'Thiết diện' };
  const S = sectionCut.area;

  const steps = [
    {
      id: 's0', label: partA.label,
      visibleIds: [...solidIds, ...defPtIds], highlightIds: [...defPtIds],
    },
    {
      id: 's1', label: partB.label,
      visibleIds: [...solidIds, ...defPtIds, 'sec1'], highlightIds: ['sec1'],
      anim: { param: 'reveal', label: 'Lộ thiết diện', tMax: 1, autoplay: true },
      answer: { text: S.latex, approx: S.value, verified: S.verified },
    },
  ];
  return { base, steps };
}
