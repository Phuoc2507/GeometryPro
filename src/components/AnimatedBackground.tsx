import { useEffect, useRef } from 'react';

/**
 * AnimatedBackground — nền động cho màn nhập đề: nebula (quầng màu trôi) + starfield
 * (sao lấp lánh, trôi nhẹ). Vẽ bằng canvas, không phụ thuộc thư viện.
 * Tôn trọng prefers-reduced-motion (vẽ 1 khung tĩnh).
 */
interface Star { x: number; y: number; r: number; a: number; tw: number; ph: number; dx: number; dy: number; }

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
    const makeStar = (): Star => ({
      x: rnd() * w, y: rnd() * h,
      r: rnd() * 1.3 + 0.3,
      a: rnd() * 0.5 + 0.25,
      tw: rnd() * 0.0018 + 0.0005,
      ph: rnd() * 6.283,
      dx: (rnd() - 0.5) * 0.04,
      dy: (rnd() - 0.5) * 0.04,
    });

    // Quầng nebula: màu xanh/tím trôi chậm theo quỹ đạo sin/cos.
    const blobs = [
      { c: '76,141,255',  x: 0.24, y: 0.30, r: 0.55, sp: 0.000055, ph: 0 },
      { c: '147,97,255',  x: 0.76, y: 0.70, r: 0.58, sp: 0.000041, ph: 2.1 },
      { c: '56,150,230',  x: 0.62, y: 0.18, r: 0.42, sp: 0.000072, ph: 4.2 },
    ];

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(280, Math.round((w * h) / 8500));
      stars = Array.from({ length: count }, makeStar);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      // Nebula
      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.sp + b.ph) * 0.09) * w;
        const cy = (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * 0.09) * h;
        const rad = b.r * Math.max(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${b.c},0.16)`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      // Stars
      for (const s of stars) {
        s.x += s.dx; s.y += s.dy;
        if (s.x < 0) s.x += w; else if (s.x > w) s.x -= w;
        if (s.y < 0) s.y += h; else if (s.y > h) s.y -= h;
        const a = s.a * (0.45 + 0.55 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fillStyle = `rgba(205,222,255,${a})`;
        ctx.fill();
      }
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduce) {
      draw(0); // tĩnh 1 khung
    } else {
      const loop = (t: number) => { draw(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
