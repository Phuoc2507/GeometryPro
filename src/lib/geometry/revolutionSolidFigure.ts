import type { RevolutionSolid, PointCoordinates } from '@/types/geometry';

/**
 * DỰNG PRIMITIVE 2D của KHỐI TRÒN XOAY (revolutionSolids) — TÁCH RA module thuần để CẢ hai nơi vẽ chung
 * một hình: trình xuất TikZ (`generateProjectedLatex`) VÀ bản xem trước SVG (`RightPanel`). Nhờ vậy hình
 * trong "Bản xem trước Live" KHỚP với mã LaTeX xuất ra (trước đây preview KHÔNG hề vẽ khối này ⇒ user
 * thấy "hình latex đã được đâu" dù canvas 3D có khối).
 *
 * Trả toạ độ 2D THÔ (đầu ra project3DTo2D, CHƯA nhân scale / lật Y). Mỗi renderer tự format:
 *   • TikZ: formatCoord(x), formatCoord(y).
 *   • SVG:  x*scale, -y*scale (lật trục Y màn hình).
 */

export interface P2 { x: number; y: number; }
/** Một cung của elip nắp: `near`=nửa gần camera (nét liền) / xa (nét đứt). */
export interface CapArc { near: boolean; pts: P2[]; }
export interface RevolutionFigure {
  /** Đa giác THÂN khối (kẹp giữa 2 đường sinh) — tô nhạt. */
  body: P2[];
  /** TRỤC quay (đã kéo dài nhẹ hai đầu) — nét đứt. */
  axis: [P2, P2];
  /** Các cung elip NẮP ở hai đầu bán kính > 0 (gộp từ cả hai đầu). */
  caps: CapArc[];
  /** Hai ĐƯỜNG SINH (silhouette trên & dưới) — nét liền. */
  silhouettes: [P2[], P2[]];
}

type Projector = (
  point: PointCoordinates,
  cameraPos: [number, number, number],
  target: [number, number, number],
) => { x: number; y: number };

const ANG = 40;   // số điểm mỗi vòng khi chiếu
const EXT = 0.12; // tỉ lệ kéo dài trục hai đầu

/**
 * Dựng hình khối tròn xoay từ `solid` theo góc nhìn (cameraPos→target). Trả null nếu không đủ dữ liệu
 * (thiếu mẫu, expr không parser ở trình duyệt, < 2 mẫu…). Ném lỗi được caller bọc try/catch.
 */
export function buildRevolutionSolidFigure(
  solid: RevolutionSolid,
  cameraPos: [number, number, number],
  target: [number, number, number],
  project: Projector,
): RevolutionFigure | null {
  const aroundOy = solid.axis === 'Oy';
  const axisY = typeof solid.axisY === 'number' ? solid.axisY : 0;
  // Oy KHÔNG 'shell' ⇒ đĩa/vành khăn theo y (mẫu {x:y, r:bán kính}); còn lại vỏ trụ.
  const oyDisk = aroundOy && solid.method !== 'shell';

  // Biên dạng: ưu tiên mẫu engine {x,r} (đúng cho MỌI kiểu kể cả 'expr'); nếu thiếu thì tự lấy mẫu
  // outer poly/sqrt/const trên domain ('expr' không parser ở trình duyệt ⇒ trả null).
  const samples: { x: number; r: number }[] =
    Array.isArray(solid.samples) ? solid.samples.filter(s => s && Number.isFinite(s.x) && Number.isFinite(s.r)) : [];
  if (!samples.length) {
    const dom = Array.isArray(solid.domain) ? solid.domain : [0, 1];
    const da = Number(dom[0]) || 0, db = Number(dom[1]) || 1;
    const f = solid.outer;
    const evalP = (x: number): number => {
      if (!f) return NaN;
      if (f.kind === 'poly') return (f.coeffs || []).reduce((acc, c, i) => acc + c * x ** i, 0);
      if (f.kind === 'sqrt') return f.a * Math.sqrt(x) + f.b;
      if (f.kind === 'const') return f.c;
      return NaN; // 'expr'
    };
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const x = da + ((db - da) * i) / N;
      const r = evalP(x);
      if (Number.isFinite(r)) samples.push({ x, r: Math.max(0, r) });
    }
  }
  if (samples.length < 2) return null;   // cần ≥ 2 mẫu để có thân + đường sinh

  // (x,r) → tâm vòng + bán kính ρ + điểm 3D (toạ độ TOÁN) theo góc quét, KHỚP mesh AnimatedRevolutionSolid:
  //  • Ox: vòng bán kính |r−axisY| trong mặt (y,z), tâm (x, 0, axisY).
  //  • Oy vỏ trụ: vòng bán kính x ở độ cao z=r, tâm (0,0,r).
  //  • Oy đĩa/vành: vòng bán kính r ở độ cao z=x, tâm (0,0,x).
  const ringOf = (s: { x: number; r: number }) => {
    if (aroundOy) {
      const rho = oyDisk ? Math.max(0, s.r) : Math.max(0, s.x);
      const z = oyDisk ? s.x : Math.max(0, s.r);
      return { rho, center: { x: 0, y: 0, z }, pt: (a: number) => ({ x: rho * Math.cos(a), y: rho * Math.sin(a), z }) };
    }
    const rho = Math.abs(s.r - axisY);
    return { rho, center: { x: s.x, y: 0, z: axisY }, pt: (a: number) => ({ x: s.x, y: rho * Math.sin(a), z: axisY - rho * Math.cos(a) }) };
  };

  // Chiếu từng vòng: điểm 2D + tâm 2D + độ sâu (khoảng cách tới camera) để tách nửa gần/xa.
  const rings = samples.map((s) => {
    const { rho, center, pt } = ringOf(s);
    const ring2d: P2[] = [];
    const depth: number[] = [];
    for (let ai = 0; ai < ANG; ai++) {
      const p3 = pt((ai / ANG) * Math.PI * 2);
      ring2d.push(project(p3, cameraPos, target));
      depth.push(Math.hypot(p3.x - cameraPos[0], p3.y - cameraPos[1], p3.z - cameraPos[2]));
    }
    return { rho, center2d: project(center, cameraPos, target), ring2d, depth };
  });

  // Phương TRỤC trên màn hình (tâm vòng đầu → cuối) + pháp tuyến ⊥ để lấy 2 đường sinh.
  const c0 = rings[0].center2d, c1 = rings[rings.length - 1].center2d;
  let ax = c1.x - c0.x, ay = c1.y - c0.y;
  const alen = Math.hypot(ax, ay) || 1; ax /= alen; ay /= alen;
  const nx = -ay, ny = ax;   // pháp tuyến đơn vị (⊥ trục)

  const upper: P2[] = [], lower: P2[] = [];
  rings.forEach(r => {
    let hi = 0, lo = 0, hv = -Infinity, lv = Infinity;
    r.ring2d.forEach((p, i) => {
      const d = p.x * nx + p.y * ny;
      if (d > hv) { hv = d; hi = i; }
      if (d < lv) { lv = d; lo = i; }
    });
    upper.push(r.ring2d[hi]); lower.push(r.ring2d[lo]);
  });

  // THÂN: vùng kẹp giữa đường sinh trên và (đường sinh dưới đảo chiều).
  const body = [...upper, ...lower.slice().reverse()];

  // TRỤC: kéo dài nhẹ hai đầu cho rõ.
  const axStart = { x: c0.x - (c1.x - c0.x) * EXT, y: c0.y - (c1.y - c0.y) * EXT };
  const axEnd = { x: c1.x + (c1.x - c0.x) * EXT, y: c1.y + (c1.y - c0.y) * EXT };

  // ELIP nắp hai đầu (bán kính > 0): tách cung theo độ sâu → nửa gần / nửa xa.
  const caps: CapArc[] = [];
  const capArcs = (r: { rho: number; ring2d: P2[]; depth: number[] }): CapArc[] => {
    if (r.rho <= 0.03) return [];   // đầu nhọn (đỉnh chóp/parabol) không có nắp
    const n = r.ring2d.length;
    const mean = r.depth.reduce((a, b) => a + b, 0) / n;
    const near = r.depth.map(d => d < mean);
    // Độ sâu biến thiên hình sin quanh vòng ⇒ đúng 2 lần đổi gần/xa; bắt đầu tại một điểm đổi.
    let start = 0;
    for (let i = 0; i < n; i++) { if (near[i] !== near[(i - 1 + n) % n]) { start = i; break; } }
    const arcs: CapArc[] = [];
    let cur: CapArc = { near: near[start], pts: [r.ring2d[start]] };
    for (let k = 1; k <= n; k++) {
      const i = (start + k) % n;
      cur.pts.push(r.ring2d[i]);            // nối tới điểm biên để 2 cung khép kín
      if (k < n && near[i] !== cur.near) { arcs.push(cur); cur = { near: near[i], pts: [r.ring2d[i]] }; }
    }
    arcs.push(cur);
    return arcs.filter(a => a.pts.length >= 2);
  };
  caps.push(...capArcs(rings[0]));
  caps.push(...capArcs(rings[rings.length - 1]));

  return { body, axis: [axStart, axEnd], caps, silhouettes: [upper, lower] };
}
