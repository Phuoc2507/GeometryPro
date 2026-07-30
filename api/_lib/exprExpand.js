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
  if (hasSamples && solid.translucent) return solid; // idempotent
  const { outer, inner, domain } = solid;
  if (!outer || !Array.isArray(domain) || domain.length !== 2) return solid;
  const a = Number(domain[0]), b = Number(domain[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  try {
    const samples = hasSamples ? solid.samples : sampleProfile(outer, [a, b]);
    if (!samples || samples.length < 2) return null;
    const out = { ...solid, samples, translucent: true };
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

// Map toàn geometry. Bỏ phần tử null (drop fail-safe). Xoá key nếu rỗng sau khi nở.
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
  return out;
}
