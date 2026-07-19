// api/_lib/kernel/analysis/analysisFigure.ts
// Dựng hình minh hoạ cho bài GIẢI TÍCH THUẦN (không có op dựng hình cổ điển):
// mỗi hàm số → một curve (parabola/cubic/poly) + ~24 điểm mẫu dọc theo curve;
// mỗi khối tròn xoay → khung dây (2 vòng đáy + đường sinh); các điểm tường minh giữ nguyên.
// Điểm mẫu bảo đảm route qua được gate `points>0`; curve để fallback vẽ mượt.
import type { GeometryData, Point3D, Line3D, Curve3D } from '../../../../src/types/geometry';
import { evalPoly } from './polyfit';
import type { Solid } from './solids';

export type FigureInput = {
  polys: Record<string, number[]>;                 // tên hàm → hệ số [c0..cn]
  polyDomains: Record<string, [number, number]>;   // miền x để vẽ (suy từ through)
  points: { id: string; x: number; y: number; z: number }[]; // điểm tường minh (đã số hoá)
  solids: Record<string, Solid>;
};

const RING = 16;         // số điểm mỗi vòng khung dây
const CURVE_SAMPLES = 24; // số điểm mẫu dọc theo mỗi curve

// Bậc hiệu dụng = chỉ số cao nhất có hệ số khác 0 (bỏ hệ số đuôi ~0).
function effectiveDegree(coeffs: number[]): number {
  let deg = coeffs.length - 1;
  while (deg > 0 && Math.abs(coeffs[deg]) < 1e-12) deg--;
  return deg;
}

function polyCurve(id: string, coeffs: number[], xMin: number, xMax: number): Curve3D {
  const deg = effectiveDegree(coeffs);
  const c = (k: number): number => coeffs[k] ?? 0;
  if (deg <= 2) {
    return { id, type: 'parabola', params: { a: c(2), b: c(1), c: c(0), xMin, xMax } };
  }
  if (deg === 3) {
    return { id, type: 'cubic', params: { a: c(3), b: c(2), c: c(1), d: c(0), xMin, xMax } };
  }
  // Bậc khác (≥4): không có kiểu riêng trong Curve3D — dùng nhãn 'poly' + coeffs thô.
  return { id, type: 'poly' as Curve3D['type'], params: { coeffs: [...coeffs], xMin, xMax } };
}

export function buildAnalysisFigure(name: string, inp: FigureInput): GeometryData {
  const points: Point3D[] = [];
  const lines: Line3D[] = [];
  const curves: Curve3D[] = [];

  // ── Điểm tường minh ──────────────────────────────────────────────
  for (const p of inp.points) {
    points.push({ id: p.id, label: p.id, x: p.x, y: p.y, z: p.z });
  }

  // ── Hàm số → curve + điểm mẫu ────────────────────────────────────
  for (const [fnName, coeffs] of Object.entries(inp.polys)) {
    const [xMin, xMax] = inp.polyDomains[fnName] ?? [0, 10];
    curves.push(polyCurve(`curve_${fnName}`, coeffs, xMin, xMax));
    for (let k = 0; k <= CURVE_SAMPLES; k++) {
      const x = xMin + ((xMax - xMin) * k) / CURVE_SAMPLES;
      const y = evalPoly(coeffs, x);
      const id = `${fnName}_s${k}`;
      points.push({ id, label: '', x, y, z: 0 });
    }
  }

  // ── Khối tròn xoay → khung dây ───────────────────────────────────
  for (const [solidName, s] of Object.entries(inp.solids)) {
    const ringPoints = (cx: number, cy: number, r: number, z: number, tag: string): string[] => {
      const ids: string[] = [];
      for (let k = 0; k < RING; k++) {
        const theta = (2 * Math.PI * k) / RING;
        const id = `${solidName}_${tag}${k}`;
        points.push({ id, label: '', x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta), z });
        ids.push(id);
      }
      // Nối các điểm liên tiếp thành vòng khép kín.
      for (let k = 0; k < RING; k++) {
        lines.push({ id: `${solidName}_${tag}L${k}`, from: ids[k], to: ids[(k + 1) % RING], style: 'solid' });
      }
      return ids;
    };

    if (s.kind === 'cylinder') {
      const bottom = ringPoints(s.cx, s.cy, s.radius, Math.min(s.from, s.to), 'b');
      const top = ringPoints(s.cx, s.cy, s.radius, Math.max(s.from, s.to), 't');
      // Vài đường sinh nối 2 vòng.
      for (let k = 0; k < RING; k += 4) {
        lines.push({ id: `${solidName}_g${k}`, from: bottom[k], to: top[k], style: 'solid' });
      }
    } else {
      // cone: vòng đáy + đỉnh.
      const base = ringPoints(s.cx, s.cy, s.baseRadius, s.baseZ, 'b');
      const apexId = `${solidName}_apex`;
      points.push({ id: apexId, label: apexId, x: s.cx, y: s.cy, z: s.apexZ });
      for (let k = 0; k < RING; k += 4) {
        lines.push({ id: `${solidName}_e${k}`, from: base[k], to: apexId, style: 'solid' });
      }
    }
  }

  return { name, points, lines, curves, spheres: [], planes: [] };
}
