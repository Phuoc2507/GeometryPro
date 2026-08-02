import { useEffect, useRef } from 'react';

/**
 * AnimatedBackground — nền động màn nhập đề: các NGÔI SAO hội tụ CHẬM về con trỏ
 * chuột (con trỏ là tâm). Tới gần con trỏ thì sao tái sinh ở rìa → dòng sao chảy
 * liên tục. Nebula (quầng màu) lệch nhẹ theo con trỏ. Vẽ bằng canvas, không thư viện.
 */
interface Star { x: number; y: number; r: number; a: number; tw: number; ph: number; dx: number; dy: number; }

const PULL = 0.0035; // tốc độ hội tụ (nhỏ = chậm)

export function AnimatedBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, raf = 0, running = true;
    let stars: Star[] = [];
    const rnd = () => Math.random();
    // Tâm hội tụ = con trỏ (px trong canvas); mặc định giữa màn cho tới khi rê chuột.
    let mx = 0, my = 0;
    const cur = { x: 0, y: 0 }; // lệch chuẩn hoá đã làm mượt (cho nebula)

    const makeStar = (): Star => {
      const r = rnd() * 1.4 + 0.4;
      return {
        x: rnd() * w, y: rnd() * h, r,
        a: rnd() * 0.5 + 0.35,
        tw: rnd() * 0.004 + 0.0016,
        ph: rnd() * 6.283,
        dx: (rnd() - 0.5) * 0.12,
        dy: (rnd() - 0.5) * 0.12,
      };
    };
    // Tái sinh ở một cạnh ngẫu nhiên (để dòng sao chảy vào từ rìa).
    const respawnEdge = (s: Star) => {
      const e = (rnd() * 4) | 0;
      if (e === 0) { s.x = rnd() * w; s.y = -4; }
      else if (e === 1) { s.x = w + 4; s.y = rnd() * h; }
      else if (e === 2) { s.x = rnd() * w; s.y = h + 4; }
      else { s.x = -4; s.y = rnd() * h; }
    };

    const blobs = [
      { c: '76,141,255',  x: 0.24, y: 0.30, r: 0.55, sp: 0.00012, ph: 0,   pz: 55 },
      { c: '147,97,255',  x: 0.76, y: 0.70, r: 0.58, sp: 0.00009, ph: 2.1, pz: 42 },
      { c: '56,150,230',  x: 0.62, y: 0.18, r: 0.42, sp: 0.00016, ph: 4.2, pz: 66 },
    ];

    const resize = () => {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!mx && !my) { mx = w / 2; my = h / 2; }
      const count = Math.min(320, Math.max(80, Math.round((w * h) / 7000)));
      stars = Array.from({ length: count }, makeStar);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    };

    const draw = (t: number) => {
      if (!running) return;
      if ((canvas.clientWidth && Math.abs(canvas.clientWidth - w) > 2) ||
          (canvas.clientHeight && Math.abs(canvas.clientHeight - h) > 2)) {
        resize();
      }
      cur.x += ((mx / (w || 1) - 0.5) - cur.x) * 0.05;
      cur.y += ((my / (h || 1) - 0.5) - cur.y) * 0.05;

      ctx.clearRect(0, 0, w, h);
      // Nebula lệch nhẹ theo con trỏ
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
      // Sao HỘI TỤ chậm về con trỏ; tới nơi thì tái sinh ở rìa
      for (const s of stars) {
        const ax = mx - s.x, ay = my - s.y;
        const d = Math.hypot(ax, ay) || 1;
        s.x += s.dx + ax * PULL;
        s.y += s.dy + ay * PULL;
        if (d < 14) { respawnEdge(s); }
        const a = s.a * (0.35 + 0.65 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fillStyle = `rgba(205,222,255,${a})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
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
