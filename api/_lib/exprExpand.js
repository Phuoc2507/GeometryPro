// api/_lib/exprExpand.js
// Nở các hình 'expr' do LLM trả (Vẽ nhanh + Vẽ kỹ) thành MẪU SỐ để frontend vẽ mượt mà KHÔNG cần
// parser. KHÔNG gọi LLM. Idempotent (đã có samples thì bỏ qua). Fail-safe: biểu thức lỗi → drop (null),
// không làm chết route. KHÔNG gán volume — Vẽ nhanh/Vẽ kỹ chỉ VẼ, không khẳng định đáp số.
import { compileProfile, sampleProfile } from './kernel-dist/index.mjs';

const CURVE_SAMPLES = 80;

function sampleExprXY(expr, xMin, xMax, n = CURVE_SAMPLES) {
  const g = compileProfile({ kind: 'expr', expr });
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const y = g(x);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

// Đường cong: chỉ nở khi type==='expr'. Analytic (parabola/cubic/rational) trả nguyên. Lỗi/<2 mẫu → null.
export function expandExprCurve(curve) {
  if (!curve || typeof curve !== 'object') return null;
  if (Array.isArray(curve.samples) && curve.samples.length >= 2) return curve; // idempotent
  if (curve.type !== 'expr') return curve;
  const p = curve.params || {};
  const xMin = Number(p.xMin), xMax = Number(p.xMax);
  if (typeof curve.expr !== 'string' || !Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin === xMax) return null;
  try {
    const samples = sampleExprXY(curve.expr, xMin, xMax);
    if (samples.length < 2) return null;
    return { ...curve, samples };
  } catch {
    return null;
  }
}

// Miền tô: sample outer/inner (ProfileFn bất kỳ: expr/poly/const) trên domain → {x,top,bot}. Lỗi/<2 → null.
export function expandExprArea(area) {
  if (!area || typeof area !== 'object') return null;
  if (Array.isArray(area.samples) && area.samples.length >= 2) return area; // idempotent
  const { outer, inner, domain } = area;
  if (!outer || !inner || !Array.isArray(domain) || domain.length !== 2) return area;
  const a = Number(domain[0]), b = Number(domain[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  try {
    const go = compileProfile(outer);
    const gi = compileProfile(inner);
    const samples = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const x = a + ((b - a) * i) / CURVE_SAMPLES;
      const yo = go(x), yi = gi(x);
      if (!Number.isFinite(x) || !Number.isFinite(yo) || !Number.isFinite(yi)) continue;
      samples.push({ x, top: Math.max(yo, yi), bot: Math.min(yo, yi) });
    }
    if (samples.length < 2) return null;
    return { ...area, samples };
  } catch {
    return null;
  }
}

// Khối tròn xoay: sampleProfile(outer[/inner]) → samples/innerSamples; set translucent=true; KHÔNG volume.
export function expandExprSolid(solid) {
  if (!solid || typeof solid !== 'object') return null;
  const hasSamples = Array.isArray(solid.samples) && solid.samples.length >= 2;
  // volume: undefined = chốt AN TOÀN — Vẽ nhanh/Vẽ kỹ CHỈ VẼ, không bao giờ kèm số thể tích/đáp số dù
  // LLM có nhét vào (kể cả nhánh idempotent đã translucent). Xoá tận gốc trước khi ra renderer.
  if (hasSamples && solid.translucent) return { ...solid, volume: undefined }; // idempotent
  const { outer, inner, domain } = solid;
  if (!outer || !Array.isArray(domain) || domain.length !== 2) return solid;
  const a = Number(domain[0]), b = Number(domain[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  try {
    const samples = hasSamples ? solid.samples : sampleProfile(outer, [a, b]);
    if (!samples || samples.length < 2) return null;
    const out = { ...solid, samples, translucent: true, volume: undefined };
    if (inner) {
      out.innerSamples = Array.isArray(solid.innerSamples) && solid.innerSamples.length >= 2
        ? solid.innerSamples
        : sampleProfile(inner, [a, b]);
    }
    return out;
  } catch {
    return null;
  }
}

const AXIS_EPS = 1e-6;

// Hình ĐỒ-THỊ-PHẲNG (có đường expr / miền tô / khối tròn xoay) được vẽ trong MẶT PHẲNG ĐỨNG three-Z=0
// (đường cong/miền tô ở đó). Nhưng `points`/`lines` chung render theo quy ước math z-up → three=(x, z, y):
// điểm có math-Y≠0 bị đẩy vào CHIỀU SÂU (three-Z=math-Y), lệch hẳn khỏi đường cong — thành đoạn/chấm
// lửng lơ, lại kéo lệch khung camera. LLM hay phát điểm biên (đỉnh đường cong, cận x=a/x=b) với chiều
// cao BỎ NHẦM vào math-Y. Dọn: trong hình đồ-thị-phẳng, bỏ point |y|>eps (ngoài trục) + line trỏ tới
// point đã bỏ; GIỮ nhãn/vạch TRÊN trục (y≈0). CHỈ chạy khi có 3 mảng phẳng — hình khối 3D thường không
// có nên KHÔNG bị đụng (điểm 3D như đỉnh chóp giữ nguyên).
function sanitizePlanarFigurePointsLines(geometry) {
  const isPlanar =
    (Array.isArray(geometry.curves) && geometry.curves.length > 0) ||
    (Array.isArray(geometry.areaRegions) && geometry.areaRegions.length > 0) ||
    (Array.isArray(geometry.revolutionSolids) && geometry.revolutionSolids.length > 0);
  if (!isPlanar) return geometry;

  const out = { ...geometry };
  const removed = new Set();
  if (Array.isArray(geometry.points)) {
    out.points = geometry.points.filter((p) => {
      const y = Number(p && p.y);
      const offAxis = Number.isFinite(y) && Math.abs(y) > AXIS_EPS;
      if (offAxis && p && p.id != null) removed.add(p.id);
      return !offAxis;
    });
  }
  if (Array.isArray(geometry.lines)) {
    out.lines = geometry.lines.filter((l) => !(l && (removed.has(l.from) || removed.has(l.to))));
  }
  return out;
}

// Map toàn geometry. Bỏ phần tử null (drop fail-safe). Xoá key nếu rỗng sau khi nở. Cuối cùng dọn
// điểm/đường lệch mặt phẳng cho hình đồ-thị-phẳng (theo mảng SAU nở — nếu tất cả khối/đường bị drop thì
// không còn là hình phẳng ⇒ không dọn).
export function expandExprGeometry(geometry) {
  if (!geometry || typeof geometry !== 'object') return geometry;
  const out = { ...geometry };
  if (Array.isArray(geometry.curves)) {
    const mapped = geometry.curves.map(expandExprCurve).filter(Boolean);
    if (mapped.length) out.curves = mapped; else delete out.curves;
  }
  if (Array.isArray(geometry.areaRegions)) {
    const mapped = geometry.areaRegions.map(expandExprArea).filter(Boolean);
    if (mapped.length) out.areaRegions = mapped; else delete out.areaRegions;
  }
  if (Array.isArray(geometry.revolutionSolids)) {
    const mapped = geometry.revolutionSolids.map(expandExprSolid).filter(Boolean);
    if (mapped.length) out.revolutionSolids = mapped; else delete out.revolutionSolids;
  }
  return sanitizePlanarFigurePointsLines(out);
}
