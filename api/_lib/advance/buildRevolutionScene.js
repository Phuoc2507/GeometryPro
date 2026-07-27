// api/_lib/advance/buildRevolutionScene.js
// Dựng AdvanceScene cho mẫu 'rev-ox' từ params đã trích (LLM chỉ trích, engine dựng & kiểm).
// base: buildAnalysisFigure (curve r(x) + điểm mẫu ⇒ qua gate points>0) + gắn khối tròn xoay đã verified.
// steps: Câu a hiện khối (+ anim sweep), Câu b hiện đáp án thể tích.
// Nạp từ kernel-dist (bundle .mjs do `npm run build:kernel` sinh) — KHÔNG import .ts nguồn,
// vì route .js chạy trên Node/Vercel không phân giải được specifier .ts không đuôi.
import { buildAnalysisFigure, buildRevolutionSolidOx, buildRevolutionSolidOy } from '../kernel-dist/index.mjs';

export function buildRevolutionScene(params) {
  const { outer, domain, parts, inner, axis } = params;
  const revId = 'rev1';
  // Engine dựng khối + tự-kiểm thể tích và trả mẫu biên dạng.
  //  - Ox: phương pháp đĩa (hoặc vành khăn nếu có `inner`).
  //  - Oy: phương pháp vỏ trụ (shell).
  const solid = axis === 'Oy'
    ? buildRevolutionSolidOy(revId, outer, domain, '#6366f1')
    : buildRevolutionSolidOx(revId, outer, domain, '#6366f1', inner || undefined);
  const aroundOy = solid.axis === 'Oy';

  // Điểm mẫu cho base (qua gate points>0) lấy từ mẫu biên dạng engine đã tính — đúng cho MỌI kiểu
  // biên dạng (poly/sqrt/const/expr), không cần xấp xỉ poly. Lấy thưa ~9 điểm cho gọn hình.
  const src = solid.samples && solid.samples.length ? solid.samples : [{ x: domain[0], r: 0 }];
  const stepEvery = Math.max(1, Math.floor(src.length / 8));
  const samplePts = src
    .filter((_, i) => i % stepEvery === 0)
    .map((s, i) => ({ id: `r${i}`, label: '', x: s.x, y: s.r, z: 0 }));

  const base = buildAnalysisFigure(aroundOy ? 'Tròn xoay quanh Oy' : 'Tròn xoay quanh Ox', {
    // Vẽ curve mượt bằng poly khi biên dạng LÀ poly; kiểu khác dựa vào điểm mẫu + khối tròn xoay.
    polys: outer.kind === 'poly' ? { r: outer.coeffs.slice() } : {},
    polyDomains: outer.kind === 'poly' ? { r: domain } : {},
    points: samplePts,
    solids: {},
  });
  base.revolutionSolids = [solid];

  const samplePointIds = base.points.map((p) => p.id);
  // Bài tròn xoay 1 câu ("tính thể tích") ⇒ chỉ có 1 part. Khi đó gán nhãn 2 bước cố định, dễ hiểu
  // (Khối tròn xoay → Thể tích) thay vì trộn nhãn "Câu 1" của đề với "Câu b" mặc định.
  const hasTwoParts = Array.isArray(parts) && parts.length >= 2;
  const partA = hasTwoParts ? parts[0] : { label: 'Khối tròn xoay', hoi: aroundOy ? 'Khối tròn xoay quanh Oy' : 'Khối tròn xoay quanh Ox' };
  const partB = hasTwoParts ? parts[1] : { label: 'Thể tích', hoi: 'Thể tích khối' };

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
