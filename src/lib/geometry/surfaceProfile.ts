import { Surface3D } from '@/types/geometry';

/**
 * Logic ĐƯỜNG SINH (profile) của mặt tròn xoay — TÁCH RA làm module thuần (không phụ thuộc three.js)
 * để CẢ hai nơi dùng chung: renderer 3D `AnimatedSurface` VÀ trình xuất TikZ `generateProjectedLatex`.
 * Nhờ vậy hình tròn xoay trong bản LaTeX khớp với hình trên canvas.
 */

/** True khi trục quay là Ox (nằm ngang): axis='Ox'/'x' hoặc vector [1,0,0] (thành phần x trội).
 *  Mặc định (vắng) ⇒ đứng, quay quanh trục thẳng đứng (Oz theo toạ độ toán). */
export function surfaceIsHorizontalAxis(surface: Surface3D): boolean {
  const ax = surface.axis;
  if (Array.isArray(ax)) {
    const [x = 0, y = 0, z = 0] = ax;
    return Math.abs(x) > Math.abs(y) && Math.abs(x) > Math.abs(z);
  }
  if (typeof ax === 'string') { const s = ax.toLowerCase(); return s === 'ox' || s === 'x'; }
  return false;
}

/** Bán kính và toạ độ dọc-trục của đường sinh theo t ∈ [0, 1], trong khung profile trừu tượng
 *  (trục quay = +y cục bộ). Dùng chung cho mọi loại mặt tròn xoay. */
export function profileOf(surface: Surface3D): (t: number) => { radius: number; y: number } {
  const p = surface.params ?? {};

  // Đường sinh đa thức (parabola) do Vẽ nhanh phát: bán kính r(x)=a·x²+b·x+c trên [xMin,xMax],
  // toạ độ dọc trục = x. Ví dụ y=x² trên [0,2] ⇒ vertex bán kính 0 tại gốc, mở tới r=4 ở x=2.
  const isPoly = surface.curve === 'parabola'
    || (('a' in p) && ('xMin' in p || 'xMax' in p));
  if (isPoly) {
    const a = p.a ?? 1, b = p.b ?? 0, c = p.c ?? 0;
    const xMin = p.xMin ?? 0, xMax = p.xMax ?? 2;
    return (t) => {
      const x = xMin + t * (xMax - xMin);
      return { radius: Math.abs(a * x * x + b * x + c), y: x };
    };
  }

  switch (surface.type) {
    case 'paraboloid': {
      const a = p.a || 2;
      const h = p.h || 4;
      return (t) => ({ radius: a * t, y: h * t * t });
    }
    case 'hyperboloid': {
      const a = p.a || 1;
      const c = p.c || 2;
      const vMin = p.vMin ?? -2;
      const vMax = p.vMax ?? 2;
      return (t) => {
        const v = vMin + t * (vMax - vMin);
        return { radius: a * Math.cosh(v), y: c * Math.sinh(v) };
      };
    }
    case 'torus': {
      const R = p.R || 2;
      const r = p.r || 0.5;
      return (t) => {
        const angle = t * Math.PI * 2;
        return { radius: R + r * Math.cos(angle), y: r * Math.sin(angle) };
      };
    }
    case 'revolution':
    default: {
      const r0 = p.r0 || 1;
      const h = p.h || 4;
      const taper = p.taper || 0;
      return (t) => ({ radius: r0 * (1 - t * taper), y: h * t });
    }
  }
}

/**
 * Điểm 3D (toạ độ TOÁN, z=lên) trên mặt tròn xoay tại tham số dọc-trục `along` và bán kính `r`,
 * ở góc quét `angle`, quanh tâm `center`. `horizontal=true` ⇒ trục quay là Ox (mở dọc x, vòng quét
 * nằm trong mặt phẳng (y,z)); ngược lại trục đứng Oz (vòng quét trong mặt phẳng (x,y)).
 * Khớp phép quay của renderer 3D: local +Y → math +X khi nằm ngang.
 */
export function revolutionPoint(
  center: { x: number; y: number; z: number },
  along: number,
  r: number,
  angle: number,
  horizontal: boolean,
): { x: number; y: number; z: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  if (horizontal) {
    return { x: center.x + along, y: center.y + r * cos, z: center.z + r * sin };
  }
  return { x: center.x + r * cos, y: center.y + r * sin, z: center.z + along };
}
