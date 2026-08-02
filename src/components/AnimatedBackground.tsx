import { useEffect, useRef } from 'react';

/**
 * AnimatedBackground — nền động cho màn nhập đề:
 *   • nebula (quầng màu) trôi + LỆCH theo con chuột
 *   • starfield: sao lấp lánh, trôi nhẹ, và PARALLAX theo chuột (sao lớn = gần = trôi nhiều)
 * Vẽ bằng canvas, không phụ thuộc thư viện. Tôn trọng prefers-reduced-motion.
 */
interface Star { x: number; y: number; r: number; a: number; tw: number; ph: number; dx: number; dy: number; pz: number; }

export function AnimatedBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, raf = 0;
    let stars: Star[] = [];
    const rnd = () => Math.random();
    // Vị trí chuột chuẩn hoá (-0.5..0.5) + giá trị đã làm mượt (ease).
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const makeStar = (): Star => {
      const r = rnd() * 1.3 + 0.3;
      return {
        x: rnd() * w, y: rnd() * h, r,
        a: rnd() * 0.5 + 0.3,
        tw: rnd() * 0.003 + 0.0012,          // lấp lánh rõ hơn
        ph: rnd() * 6.283,
        dx: (rnd() - 0.5) * 0.14,            // trôi nền rõ hơn
        dy: (rnd() - 0.5) * 0.14,
        pz: r * 42,                          // sao lớn = gần = parallax nhiều
      };
    };

    const blobs = [
      { c: '76,141,255',  x: 0.24, y: 0.30, r: 0.55, sp: 0.00012, ph: 0,   pz: 55 },
      { c: '147,97,255',  x: 0.76, y: 0.70, r: 0.58, sp: 0.00009, ph: 2.1, pz: 42 },
      { c: '56,150,230',  x: 0.62, y: 0.18, r: 0.42, sp: 0.00015, ph: 4.2, pz: 68 },
    ];

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(300, Math.round((w * h) / 8000));
      stars = Array.from({ length: count }, makeStar);
    };

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    };

    const draw = (t: number) => {
      // làm mượt chuyển động chuột
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;

      ctx.clearRect(0, 0, w, h);
      // Nebula: trôi theo thời gian + lệch theo chuột
      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.sp + b.ph) * 0.10) * w + cur.x * b.pz;
        const cy = (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * 0.10) * h + cur.y * b.pz;
        const rad = b.r * Math.max(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${b.c},0.17)`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      // Sao: trôi nền + PARALLAX theo chuột theo độ sâu
      for (const s of stars) {
        s.x += s.dx; s.y += s.dy;
        if (s.x < 0) s.x += w; else if (s.x > w) s.x -= w;
        if (s.y < 0) s.y += h; else if (s.y > h) s.y -= h;
        const px = s.x + cur.x * s.pz;
        const py = s.y + cur.y * s.pz;
        const a = s.a * (0.4 + 0.6 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, 6.283);
        ctx.fillStyle = `rgba(205,222,255,${a})`;
        ctx.fill();
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);

    if (reduce) {
      draw(0);
    } else {
      const loop = (t: number) => { draw(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
