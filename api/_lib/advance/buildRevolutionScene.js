// api/_lib/advance/buildRevolutionScene.js
// Dựng AdvanceScene cho mẫu 'rev-ox' từ params đã trích (LLM chỉ trích, engine dựng & kiểm).
// base: buildAnalysisFigure (curve r(x) + điểm mẫu ⇒ qua gate points>0) + gắn khối tròn xoay đã verified.
// steps: Câu a hiện khối (+ anim sweep), Câu b hiện đáp án thể tích.
// Nạp từ kernel-dist (bundle .mjs do `npm run build:kernel` sinh) — KHÔNG import .ts nguồn,
// vì route .js chạy trên Node/Vercel không phân giải được specifier .ts không đuôi.
import { buildAnalysisFigure, buildRevolutionSolidOx } from '../kernel-dist/index.mjs';

// ProfileFn → hệ số poly để buildAnalysisFigure vẽ curve minh hoạ.
// sqrt không phải đa thức: xấp xỉ hình dạng bằng poly bậc 2 khớp 3 điểm để CÓ curve gợi ý
// (đường sinh chính xác do khối tròn xoay lo; curve chỉ để mắt thấy biên dạng).
function profileToCoeffs(outer, domain) {
  if (outer.kind === 'poly') return outer.coeffs.slice();
  if (outer.kind === 'const') return [outer.c];
  // sqrt: khớp parabola qua x = a, mid, b.
  const [a, b] = domain;
  const mid = (a + b) / 2;
  const r = (x) => outer.a * Math.sqrt(x) + outer.b;
  const xs = [a, mid, b];
  const ys = xs.map(r);
  const c2 =
    (ys[0] / ((xs[0] - xs[1]) * (xs[0] - xs[2]))) +
    (ys[1] / ((xs[1] - xs[0]) * (xs[1] - xs[2]))) +
    (ys[2] / ((xs[2] - xs[0]) * (xs[2] - xs[1])));
  const c1 = (ys[2] - ys[0]) / (xs[2] - xs[0]) - c2 * (xs[0] + xs[2]);
  const c0 = ys[0] - c1 * xs[0] - c2 * xs[0] * xs[0];
  return [c0, c1, c2];
}

export function buildRevolutionScene(params) {
  const { outer, domain, parts } = params;
  const revId = 'rev1';
  const solid = buildRevolutionSolidOx(revId, outer, domain, '#6366f1');

  const fnName = 'r';
  const base = buildAnalysisFigure('Tròn xoay quanh Ox', {
    polys: { [fnName]: profileToCoeffs(outer, domain) },
    polyDomains: { [fnName]: domain },
    points: [],
    solids: {},
  });
  base.revolutionSolids = [solid];

  const samplePointIds = base.points.map((p) => p.id);
  const partA = parts?.[0] ?? { label: 'Câu a', hoi: 'Khối tròn xoay quanh Ox' };
  const partB = parts?.[1] ?? { label: 'Câu b', hoi: 'Thể tích khối' };

  const v = solid.volume;
  const steps = [
    {
      id: 's0',
      label: partA.label,
      visibleIds: [...samplePointIds, revId],
      highlightIds: [revId],
      anim: { param: 'sweep', label: 'Quét tròn xoay', tMax: domain[1], autoplay: true },
    },
    {
      id: 's1',
      label: partB.label,
      visibleIds: [...samplePointIds, revId],
      answer: {
        text: v.latex,
        approx: v.value,
        verified: v.verified,
      },
    },
  ];

  return { base, steps };
}
