import { useEffect, useRef } from 'react';

/**
 * AnimatedBackground — nền động màn nhập đề: các khối ĐA DIỆN 3D khung dây
 * (tứ diện, lập phương, bát diện, icosahedron) xoay chậm & trôi theo chiều sâu.
 *   • Khối GẦN to hơn, sáng hơn, xoay nhanh hơn; khối XA nhỏ & mờ (parallax).
 *   • Rê chuột → cả cảnh dịch nhẹ theo trục nhìn (khối gần dịch nhiều hơn).
 *   • Nebula mờ + bụi sao trôi làm nền cho chất "không gian".
 *   • Tôn trọng prefers-reduced-motion (vẽ 1 khung tĩnh, không loop).
 * Vẽ bằng canvas thuần, không thư viện.
 */
type Vec3 = [number, number, number];
type Edge = [number, number];

const PHI = 1.618033988749895;

// Đỉnh của 4 khối Platonic. Mọi đỉnh cách tâm đều nhau nên chuẩn hoá về mặt cầu
// đơn vị bằng cách chia cho độ dài chung (giữ nguyên hình).
const RAW_SHAPES: Vec3[][] = [
  // Tứ diện
  [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  // Lập phương
  [[1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
   [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]],
  // Bát diện
  [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  // Icosahedron
  [[0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI],
   [1, PHI, 0], [1, -PHI, 0], [-1, PHI, 0], [-1, -PHI, 0],
   [PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, 1], [-PHI, 0, -1]],
];

const norm = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);

// Sinh cạnh tự động: nối các cặp đỉnh có khoảng cách ~ ngắn nhất (± 6%).
function edgesOf(verts: Vec3[]): Edge[] {
  let min = Infinity;
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++) {
      const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
      if (d < min) min = d;
    }
  const edges: Edge[] = [];
  const lim = min * 1.06;
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++) {
      const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
      if (d <= lim) edges.push([i, j]);
    }
  return edges;
}

// Tiền xử lý: chuẩn hoá đỉnh về mặt cầu đơn vị + danh sách cạnh.
const SHAPES = RAW_SHAPES.map((verts) => {
  const r = norm(verts[0]);
  const v = verts.map(([x, y, z]) => [x / r, y / r, z / r] as Vec3);
  return { verts: v, edges: edgesOf(verts) };
});

const FOCAL = 3.2;               // tiêu cự phối cảnh (nhỏ = méo mạnh hơn)
const BLUE: Vec3 = [76, 141, 255];
const PURPLE: Vec3 = [147, 97, 255];

interface Poly {
  shape: number;                 // chỉ số trong SHAPES
  fx: number; fy: number;        // vị trí tâm (fraction 0..1)
  vfx: number; vfy: number;      // vận tốc trôi (fraction/khung)
  size: number;                  // bán kính (px) khi p = 1
  zoff: number;                  // độ sâu phối cảnh (lớn = xa)
  alpha: number;                 // độ sáng nét
  para: number;                  // hệ số parallax theo chuột (px)
  rx: number; ry: number; rz: number;       // góc xoay hiện tại
  sx: number; sy: number; sz: number;       // tốc độ xoay (rad/khung)
  col: string;                   // 'r,g,b' đã pha xanh→tím
}

interface Star { x: number; y: number; r: number; a: number; tw: number; ph: number; dx: number; dy: number; }

export function AnimatedBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const motionScale = reduce ? 0.35 : 1;   // "giảm chuyển động" → xoay chậm lại, KHÔNG đứng hình

    let w = 0, h = 0, raf = 0, running = true;
    let polys: Poly[] = [];
    let stars: Star[] = [];
    const rnd = () => Math.random();
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // lệch chuẩn hoá của con trỏ (đã làm mượt) cho parallax + nebula
    let targetX = 0, targetY = 0;
    const cur = { x: 0, y: 0 };

    const blobs = [
      { c: '76,141,255', x: 0.24, y: 0.30, r: 0.55, sp: 0.00012, ph: 0, pz: 40 },
      { c: '147,97,255', x: 0.76, y: 0.70, r: 0.58, sp: 0.00009, ph: 2.1, pz: 32 },
      { c: '56,150,230', x: 0.62, y: 0.16, r: 0.40, sp: 0.00016, ph: 4.2, pz: 50 },
    ];

    const makeStar = (): Star => ({
      x: rnd() * w, y: rnd() * h, r: rnd() * 1.2 + 0.3,
      a: rnd() * 0.4 + 0.25, tw: rnd() * 0.004 + 0.0016, ph: rnd() * 6.283,
      dx: (rnd() - 0.5) * 0.12, dy: (rnd() - 0.5) * 0.12,
    });

    const makePoly = (): Poly => {
      const depth = rnd();                       // 0 = gần, 1 = xa
      const mix = rnd();                         // pha màu xanh → tím
      const col = `${Math.round(lerp(BLUE[0], PURPLE[0], mix))},${Math.round(lerp(BLUE[1], PURPLE[1], mix))},${Math.round(lerp(BLUE[2], PURPLE[2], mix))}`;
      const spin = lerp(0.0072, 0.0026, depth) * motionScale;  // gần xoay nhanh hơn
      const sgn = () => (rnd() < 0.5 ? -1 : 1);
      return {
        shape: (rnd() * SHAPES.length) | 0,
        fx: rnd(), fy: rnd(),
        vfx: (rnd() - 0.5) * 0.00013 * motionScale, vfy: (rnd() - 0.5) * 0.00013 * motionScale,
        size: lerp(150, 44, depth),
        zoff: lerp(1.1, 5.2, depth),
        alpha: lerp(0.5, 0.12, depth),
        para: lerp(64, 12, depth),
        rx: rnd() * 6.283, ry: rnd() * 6.283, rz: rnd() * 6.283,
        sx: spin * sgn() * lerp(0.7, 1, rnd()),
        sy: spin * sgn(),
        sz: spin * sgn() * 0.4,
        col,
      };
    };

    const resize = () => {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pCount = Math.min(10, Math.max(5, Math.round((w * h) / 185000)));
      polys = Array.from({ length: pCount }, makePoly);
      const sCount = Math.min(180, Math.max(40, Math.round((w * h) / 9000)));
      stars = Array.from({ length: sCount }, makeStar);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / (w || 1) - 0.5;
      targetY = (e.clientY - rect.top) / (h || 1) - 0.5;
    };

    // Xoay 1 đỉnh quanh 3 trục (X → Y → Z).
    const rot = (v: Vec3, ax: number, ay: number, az: number): Vec3 => {
      const cx = Math.cos(ax), sx = Math.sin(ax);
      let y = v[1] * cx - v[2] * sx, z = v[1] * sx + v[2] * cx, x = v[0];
      const cy = Math.cos(ay), sy = Math.sin(ay);
      let x2 = x * cy + z * sy; z = -x * sy + z * cy; x = x2;
      const cz = Math.cos(az), sz = Math.sin(az);
      x2 = x * cz - y * sz; y = x * sz + y * cz; x = x2;
      return [x, y, z];
    };

    const paintPoly = (p: Poly, cx: number, cy: number) => {
      const { verts, edges } = SHAPES[p.shape];
      const px = cx + cur.x * p.para;
      const py = cy + cur.y * p.para;
      const proj = verts.map((v) => {
        const r = rot(v, p.rx, p.ry, p.rz);
        const s = FOCAL / (FOCAL + r[2] + p.zoff);
        return [px + r[0] * p.size * s, py + r[1] * p.size * s, s] as [number, number, number];
      });

      // Nét cạnh: 1 lượt dày mờ (glow) + 1 lượt mảnh sáng.
      ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (const [a, b] of edges) {
          ctx.moveTo(proj[a][0], proj[a][1]);
          ctx.lineTo(proj[b][0], proj[b][1]);
        }
        if (pass === 0) { ctx.lineWidth = 3.4; ctx.strokeStyle = `rgba(${p.col},${p.alpha * 0.22})`; }
        else { ctx.lineWidth = 1.1; ctx.strokeStyle = `rgba(${p.col},${p.alpha})`; }
        ctx.stroke();
      }
      // Đỉnh: chấm sáng nhỏ (đỉnh gần camera to hơn).
      for (const q of proj) {
        ctx.beginPath();
        ctx.arc(q[0], q[1], 1.5 * q[2], 0, 6.283);
        ctx.fillStyle = `rgba(210,225,255,${p.alpha * 0.9})`;
        ctx.fill();
      }
    };

    const render = (t: number) => {
      cur.x += (targetX - cur.x) * 0.05;
      cur.y += (targetY - cur.y) * 0.05;
      ctx.clearRect(0, 0, w, h);

      // Nebula nền
      for (const b of blobs) {
        const bx = (b.x + Math.sin(t * b.sp + b.ph) * 0.08) * w + cur.x * b.pz;
        const by = (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * 0.08) * h + cur.y * b.pz;
        const rad = b.r * Math.max(w, h);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
        g.addColorStop(0, `rgba(${b.c},0.14)`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // Bụi sao
      for (const s of stars) {
        s.x += s.dx; s.y += s.dy;
        if (s.x < -6) s.x += w + 12; else if (s.x > w + 6) s.x -= w + 12;
        if (s.y < -6) s.y += h + 12; else if (s.y > h + 6) s.y -= h + 12;
        const a = s.a * (0.35 + 0.65 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fillStyle = `rgba(205,222,255,${a})`;
        ctx.fill();
      }

      // Đa diện — vẽ khối xa trước, khối gần sau (đè lên trên).
      const ordered = [...polys].sort((a, b) => b.zoff - a.zoff);
      for (const p of ordered) {
        p.rx += p.sx; p.ry += p.sy; p.rz += p.sz;
        p.fx += p.vfx; p.fy += p.vfy;
        if (p.fx < -0.2) p.fx += 1.4; else if (p.fx > 1.2) p.fx -= 1.4;
        if (p.fy < -0.2) p.fy += 1.4; else if (p.fy > 1.2) p.fy -= 1.4;
        paintPoly(p, p.fx * w, p.fy * h);
      }
    };

    const draw = (t: number) => {
      if (!running) return;
      if ((canvas.clientWidth && Math.abs(canvas.clientWidth - w) > 2) ||
          (canvas.clientHeight && Math.abs(canvas.clientHeight - h) > 2)) {
        resize();
      }
      render(t);
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    // Parallax theo con trỏ chỉ bật khi KHÔNG bật "giảm chuyển động".
    if (!reduce) window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
