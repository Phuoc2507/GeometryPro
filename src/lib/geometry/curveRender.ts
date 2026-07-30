// src/lib/geometry/curveRender.ts
// Dựng dữ liệu render (điểm đường + mesh tô) cho một Curve3D — THUẦN (không React/hook) để test node và
// để component chỉ còn việc gắn vào scene. Toạ độ toán (x,y) → Three theo mặt phẳng vẽ.
import * as THREE from 'three';
import type { Curve3D } from '@/types/geometry';
import { curveThreePoints } from './fitBounds';

export interface CurveRenderData {
  points: THREE.Vector3[];
  shapeGeometry: THREE.ShapeGeometry | null;
}

/**
 * Trả dữ liệu để vẽ một đường cong tới `progress` (0..1), hoặc `null` khi đường KHÔNG vẽ được.
 *
 * HỢP ĐỒNG AN TOÀN (đừng phá): khi trả về khác null, `points` LUÔN có ≥ 2 phần tử. Trả `null` cho
 * đường không dựng được (type lạ LLM bịa / 'expr' thiếu samples) THAY VÌ mảng rỗng. Lý do: drei <Line>
 * nhận mảng rỗng ⇒ LineGeometry.setPositions([]) tính `new Float32Array(2*(0-3))` = Float32Array(-6)
 * ⇒ RangeError "Invalid typed array length: -6", sập cả canvas WebGL (mọi mode trắng màn hình).
 */
export function computeCurveRenderData(curve: Curve3D, progress = 1): CurveRenderData | null {
  // Nhánh samples: engine đã gửi {x,y} (đường 'expr' hoặc bất kỳ) → vẽ thẳng, không eval/parser.
  if (curve.samples && curve.samples.length >= 2) {
    const planeS = curve.plane || 'xy';
    const coords = curveThreePoints(curve.samples, planeS, progress);
    const pts = coords.map((c) => new THREE.Vector3(c.x, c.y, c.z));
    if (pts.length < 2) {
      if (pts.length === 1) pts.push(pts[0].clone());
      else {
        const x0 = curve.samples[0].x;
        pts.push(new THREE.Vector3(x0, 0, 0), new THREE.Vector3(x0, 0, 0));
      }
    }
    let shapeGeo: THREE.ShapeGeometry | null = null;
    if (curve.fill) {
      const vec2Pts: THREE.Vector2[] = [];
      const n = curve.samples.length;
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0;
        if (t > progress) break;
        const s = curve.samples[i];
        if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
        vec2Pts.push(new THREE.Vector2(s.x, s.y));
      }
      if (vec2Pts.length > 2) {
        const shape = new THREE.Shape();
        shape.moveTo(vec2Pts[0].x, 0);
        shape.lineTo(vec2Pts[0].x, vec2Pts[0].y);
        for (let i = 1; i < vec2Pts.length; i++) shape.lineTo(vec2Pts[i].x, vec2Pts[i].y);
        shape.lineTo(vec2Pts[vec2Pts.length - 1].x, 0);
        shape.lineTo(vec2Pts[0].x, 0);
        shapeGeo = new THREE.ShapeGeometry(shape);
      }
    }
    return { points: pts, shapeGeometry: shapeGeo };
  }

  // Chỉ 3 type analytic dưới đây dựng được từ công thức. 'expr' KHÔNG samples / type lạ ⇒ null (BỎ vẽ,
  // KHÔNG crash) — trước đây trả points:[] khiến <Line> nổ Float32Array(-6).
  const kind: string = curve.type;
  if (kind !== 'parabola' && kind !== 'cubic' && kind !== 'rational') return null;

  let xMin = 0, xMax = 0;
  if (curve.params) {
    xMin = curve.params.xMin || 0;
    xMax = curve.params.xMax || 0;
  }

  const steps = 100; // độ phân giải cao cho đường mượt
  const pts: THREE.Vector3[] = [];
  const vec2Pts: THREE.Vector2[] = [];
  const plane = curve.plane || 'xy';

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (t > progress) break; // chỉ vẽ tới progress để animate nét vẽ
    const x = xMin + t * (xMax - xMin);
    let y = 0;
    if (kind === 'parabola') {
      const { a, b, c } = curve.params;
      y = a * x * x + b * x + c;
    } else if (kind === 'cubic') {
      const { a, b, c, d } = curve.params;
      y = a * x * x * x + b * x * x + c * x + d;
    } else {
      const { numA, numB, denA, denB } = curve.params; // rational
      y = (numA * x + numB) / (denA * x + denB);
    }
    vec2Pts.push(new THREE.Vector2(x, y));
    if (plane === 'xy') pts.push(new THREE.Vector3(x, 0, y)); // Math (x,y,0) → Three (x,0,y)
    else if (plane === 'xz') pts.push(new THREE.Vector3(x, y, 0)); // Math (x,0,z) → Three (x,z,0)
    else if (plane === 'yz') pts.push(new THREE.Vector3(0, y, x)); // Math (0,x,z) → Three (0,z,x)
  }
  // đảm bảo ≥ 2 điểm cho <Line>
  if (pts.length < 2) {
    if (pts.length === 1) pts.push(pts[0].clone());
    else pts.push(new THREE.Vector3(xMin, 0, 0), new THREE.Vector3(xMin, 0, 0));
  }

  let shapeGeo: THREE.ShapeGeometry | null = null;
  if (curve.fill && vec2Pts.length > 2) {
    const shape = new THREE.Shape();
    shape.moveTo(vec2Pts[0].x, 0); // bắt đầu ở đáy (trục)
    shape.lineTo(vec2Pts[0].x, vec2Pts[0].y);
    for (let i = 1; i < vec2Pts.length; i++) shape.lineTo(vec2Pts[i].x, vec2Pts[i].y);
    shape.lineTo(vec2Pts[vec2Pts.length - 1].x, 0);
    shape.lineTo(vec2Pts[0].x, 0); // đóng shape
    shapeGeo = new THREE.ShapeGeometry(shape);
  }

  return { points: pts, shapeGeometry: shapeGeo };
}
