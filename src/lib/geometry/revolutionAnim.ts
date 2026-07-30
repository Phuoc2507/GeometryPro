// Logic thuần cho animation khối tròn xoay kiểu "hình phẳng RỒI xoay" (Advance).
// KHÔNG phụ thuộc three — test được ở node. Component AnimatedRevolutionSolid chỉ ánh xạ
// kết quả sang mesh/geometry.

// Ranh giới 2 giai đoạn trong advanceT∈[0,1]:
//  • [0, END]  : GIAI ĐOẠN 1 — vẽ & tô miền phẳng sinh khối (chưa quay).
//  • [END, 1]  : GIAI ĐOẠN 2 — quay miền phẳng 0°→360° quanh trục, mặt khối quét hiện dần.
export const REVOLVE_PHASE1_END = 0.3;

export interface RevolutionPhase {
  phase: 1 | 2;
  drawFrac: number;   // tiến trình vẽ miền phẳng ở GĐ1 (0..1)
  sweepFrac: number;  // tiến trình quay ở GĐ2 (0..1)
  angle: number;      // góc quay hiện tại (radian, 0..2π)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function revolutionPhase(t: number, phase1End: number = REVOLVE_PHASE1_END): RevolutionPhase {
  const tt = clamp01(t);
  if (tt <= phase1End) {
    return {
      phase: 1,
      drawFrac: phase1End > 0 ? tt / phase1End : 1,
      sweepFrac: 0,
      angle: 0,
    };
  }
  const sweepFrac = (tt - phase1End) / (1 - phase1End);
  return { phase: 2, drawFrac: 1, sweepFrac, angle: sweepFrac * Math.PI * 2 };
}

// Số chỉ mục (index) cần vẽ để lộ mặt khối theo góc quay. LatheGeometry đánh chỉ số theo
// góc (phi-major) nên setDrawRange(0, k) lộ dần theo góc mà KHÔNG dựng lại mesh. Làm tròn
// XUỐNG bội 6 (2 tam giác/quad) để không hở nửa tam giác; quét trọn ⇒ trả đúng total.
export function sweepIndexCount(totalIndices: number, sweepFrac: number): number {
  const f = clamp01(sweepFrac);
  if (f >= 1) return totalIndices;
  const raw = Math.floor(totalIndices * f);
  return raw - (raw % 6);
}

export interface V2 { x: number; y: number }

interface BladeRegionParams {
  outer: { radius: number; axial: number }[];
  inner: { radius: number; axial: number }[] | null;
  domain: [number, number];
  aroundOy: boolean;
  oyDisk: boolean;
  axisY: number;
}

// Vòng KÍN của miền kinh tuyến (mặt cắt sinh khối) trong HỆ TOẠ ĐỘ ĐẦU VÀO của LatheGeometry:
// x = bán kính, y = cao. Khớp CHÍNH XÁC từng nhánh dựng LatheGeometry ở AnimatedRevolutionSolid,
// để "lưỡi phẳng" (ShapeGeometry của vòng này) trùng đúng lát φ của khối khi xoay.
export function buildBladeRegion(params: BladeRegionParams): V2[] {
  const { outer, inner, domain, aroundOy, oyDisk, axisY } = params;
  const [a, b] = domain;
  const rShift = (r: number) => Math.abs(r - axisY);

  if (aroundOy && !oyDisk) {
    // Vỏ trụ quanh Oy: x = bán kính từ Oy = axial, y = cao = radius.
    if (inner && inner.length) {
      return [
        ...inner.map((s) => ({ x: s.axial, y: Math.max(0, s.radius) })),
        ...outer.slice().reverse().map((p) => ({ x: p.axial, y: Math.max(0, p.radius) })),
        { x: inner[0].axial, y: Math.max(0, inner[0].radius) },
      ];
    }
    return [
      { x: a, y: 0 },
      ...outer.map((p) => ({ x: p.axial, y: Math.max(0, p.radius) })),
      { x: b, y: 0 },
    ];
  }

  if (oyDisk) {
    // Đĩa/vành khăn quanh Oy: x = bán kính = radius, y = cao = axial.
    if (inner && inner.length) {
      return [
        ...outer.map((p) => ({ x: Math.max(0, p.radius), y: p.axial })),
        ...inner.slice().reverse().map((p) => ({ x: Math.max(1e-3, p.radius), y: p.axial })),
        { x: Math.max(0, outer[0].radius), y: outer[0].axial },
      ];
    }
    return [
      { x: 0, y: outer[0].axial },
      ...outer.map((p) => ({ x: Math.max(0, p.radius), y: p.axial })),
      { x: 0, y: outer[outer.length - 1].axial },
    ];
  }

  // Ox (có thể dời trục y=axisY): x = bán kính = |r − axisY|, y = cao = axial.
  if (inner && inner.length) {
    return [
      ...outer.map((p) => ({ x: rShift(p.radius), y: p.axial })),
      ...inner.slice().reverse().map((p) => ({ x: Math.max(1e-3, rShift(p.radius)), y: p.axial })),
      { x: rShift(outer[0].radius), y: outer[0].axial },
    ];
  }
  return [
    { x: 0, y: outer[0].axial },
    ...outer.map((p) => ({ x: rShift(p.radius), y: p.axial })),
    { x: 0, y: outer[outer.length - 1].axial },
  ];
}
