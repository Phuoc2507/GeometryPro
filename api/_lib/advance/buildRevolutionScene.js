// api/_lib/advance/buildRevolutionScene.js
// Dựng AdvanceScene cho mẫu 'rev-ox' từ params đã trích (LLM chỉ trích, engine dựng & kiểm).
// base: buildAnalysisFigure (curve r(x) + điểm mẫu ⇒ qua gate points>0) + gắn khối tròn xoay đã verified.
// steps: Câu a hiện khối (+ anim sweep), Câu b hiện đáp án thể tích.
// Nạp từ kernel-dist (bundle .mjs do `npm run build:kernel` sinh) — KHÔNG import .ts nguồn,
// vì route .js chạy trên Node/Vercel không phân giải được specifier .ts không đuôi.
import { buildAnalysisFigure, buildRevolutionSolidOx, buildRevolutionSolidOy, buildRevolutionSolidOyDisk } from '../kernel-dist/index.mjs';

export function buildRevolutionScene(params) {
  const { outer, domain, parts, inner, axis } = params;
  // `profileVar` (mặc định 'x'): biên dạng cho theo BIẾN nào.
  //  - 'x' ⇒ đường y=r(x) (mặc định, mọi trường hợp cũ).
  //  - 'y' ⇒ đường x=g(y): CHỈ dùng cho quay quanh Oy bằng ĐĨA/VÀNH KHĂN theo y (lỗ hổng Oy Đợt 1).
  const profileVar = params.profileVar === 'y' ? 'y' : 'x';
  const oyDisk = axis === 'Oy' && profileVar === 'y';
  // Trục quay DỜI ngang y=axisY (CHỈ với đĩa/vành khăn quanh Ox — quay quanh đường thẳng y=k≠0).
  // Bỏ qua khi quay quanh Oy (đường x=k đứng chưa hỗ trợ ⇒ classifier phải abstain). Ép số hữu hạn.
  const axisY = (axis !== 'Oy' && Number.isFinite(params.axisY)) ? Number(params.axisY) : 0;
  const revId = 'rev1';
  // Engine dựng khối + tự-kiểm thể tích và trả mẫu biên dạng.
  //  - Ox: phương pháp đĩa (hoặc vành khăn nếu có `inner`).
  //  - Oy + đường y=r(x): phương pháp vỏ trụ (shell); có `inner` ⇒ miền 2 đường, chiều cao vỏ = outer−inner
  //    (vá lỗ hổng Oy: LLM đưa cặp y(x) chưa nghịch đảo vẫn ra thể tích ĐÚNG thay vì bỏ inner → sai).
  //  - Oy + đường x=g(y) (profileVar='y'): phương pháp đĩa/vành khăn theo y.
  let solid;
  if (oyDisk) {
    solid = buildRevolutionSolidOyDisk(revId, outer, domain, '#6366f1', inner || undefined);
  } else if (axis === 'Oy') {
    solid = buildRevolutionSolidOy(revId, outer, domain, '#6366f1', inner || undefined);
  } else {
    // Ox (có thể DỜI trục sang y=axisY): đĩa/vành khăn với bán kính so với đường y=axisY.
    solid = buildRevolutionSolidOx(revId, outer, domain, '#6366f1', inner || undefined, axisY);
  }
  const aroundOy = solid.axis === 'Oy';
  // Engine có thể ĐÃ tinh chỉnh cận về giao điểm/nghiệm chính xác (vá cận vô tỉ) ⇒ dùng cận đã tinh chỉnh
  // cho curve/đường trục/anim để khớp miền thật.
  const dom = solid.domain;

  // Điểm mẫu cho base (qua gate points>0) lấy từ mẫu biên dạng engine đã tính — đúng cho MỌI kiểu
  // biên dạng (poly/sqrt/const/expr), không cần xấp xỉ poly. Lấy thưa ~9 điểm cho gọn hình.
  // Mẫu {x,r}: x = toạ độ TRỤC, r = bán kính. Bình thường (đường y=r(x)) điểm màn hình là (x, r).
  // Với Oy-đĩa (đường x=g(y)): trục=y, bán kính=x ⇒ HOÁN xy để điểm nằm đúng chỗ (x=g(y), y).
  const src = solid.samples && solid.samples.length ? solid.samples : [{ x: dom[0], r: 0 }];
  const stepEvery = Math.max(1, Math.floor(src.length / 8));
  const samplePts = src
    .filter((_, i) => i % stepEvery === 0)
    .map((s, i) => oyDisk
      ? ({ id: `r${i}`, label: '', x: s.r, y: s.x, z: 0 })
      : ({ id: `r${i}`, label: '', x: s.x, y: s.r, z: 0 }));

  // Cơ chế poly-curve của buildAnalysisFigure chỉ plot y=poly(x). Với Oy-đĩa đường là x=g(y) (biến y)
  // nên KHÔNG dùng poly-curve (sẽ vẽ nhầm hướng) — dựa vào điểm mẫu đã hoán xy làm khung nhìn.
  const usePolyCurve = !oyDisk && outer.kind === 'poly';
  // Trục quay dời y=k: khi đang vẽ curve poly thì thêm đường thẳng NGANG y=k (poly hằng [k]) để học
  // sinh THẤY trục quay. CHỈ thêm ở nhánh poly — với phi-poly, đường trục dời y=k chưa hỗ trợ (đường
  // sinh dựng riêng bên dưới từ mẫu engine, không qua cơ chế polys của buildAnalysisFigure).
  const showAxisLine = usePolyCurve && axisY !== 0;
  const base = buildAnalysisFigure(aroundOy ? 'Tròn xoay quanh Oy' : 'Tròn xoay quanh Ox', {
    // Vẽ curve mượt bằng poly khi biên dạng LÀ poly (theo x); kiểu khác dựa vào điểm mẫu + khối tròn xoay.
    polys: usePolyCurve ? { r: outer.coeffs.slice(), ...(showAxisLine ? { axisK: [axisY] } : {}) } : {},
    polyDomains: usePolyCurve ? { r: dom, ...(showAxisLine ? { axisK: dom } : {}) } : {},
    points: samplePts,
    solids: {},
  });
  base.revolutionSolids = [solid];

  // Biên dạng KHÔNG có poly-curve (sqrt/const/expr, hoặc Oy-đĩa x=g(y)): buildAnalysisFigure không sinh
  // đường cong ⇒ TRƯỚC ĐÂY rơi về hiện ~9 điểm mẫu (dãy chấm r0..r8 có nhãn "r", gây rối, người dùng
  // tưởng vẽ hình khác). NAY dựng MỘT đường sinh 'expr' từ TOÀN BỘ mẫu engine (đường {x,y} tính sẵn ⇒
  // frontend vẽ Line mượt, KHÔNG cần parser) để mọi biên dạng đều hiện một đường cong thống nhất. Điểm
  // mẫu vẫn ở base (qua gate points>0) nhưng bị ẩn vì outlineIds trỏ vào curve. Oy-đĩa HOÁN xy giống
  // điểm mẫu để polyline vẽ đúng hướng x=g(y). Chỉ dựng khi có ≥2 mẫu; nếu không, giữ fallback điểm mẫu.
  if (!usePolyCurve && src.length >= 2) {
    const curveSamples = src.map((s) => (oyDisk ? { x: s.r, y: s.x } : { x: s.x, y: s.r }));
    base.curves = [...(base.curves || []), {
      id: 'curve_r', type: 'expr', params: { xMin: dom[0], xMax: dom[1] }, samples: curveSamples,
    }];
  }

  // Khung nhìn NỀN: có curve biên dạng (poly ⇒ buildAnalysisFigure sinh curve; phi-poly ⇒ curve 'expr'
  // dựng ngay trên) thì HIỂN THỊ đường sinh đó thay vì rải điểm mẫu. Điểm mẫu vẫn nằm trong base để qua
  // gate points>0 nhưng KHÔNG vào visibleIds nên bị ẩn. (Fallback điểm mẫu chỉ còn khi <2 mẫu — hiếm.)
  const curveIds = (base.curves || []).map((c) => c.id);
  const outlineIds = curveIds.length ? curveIds : base.points.map((p) => p.id);
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
      visibleIds: [...outlineIds, revId],
      highlightIds: [revId],
      anim: { param: 'sweep', label: 'Quét tròn xoay', tMax: dom[1], autoplay: true },
    },
    {
      id: 's1',
      label: partB.label,
      visibleIds: [...outlineIds, revId],
      answer: {
        text: v.latex,
        approx: v.value,
        verified: v.verified,
      },
    },
  ];

  return { base, steps };
}
