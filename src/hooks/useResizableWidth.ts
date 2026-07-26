import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cho phép KÉO GIÃN bề rộng một panel bên phải (Lời giải / RightPanel).
 * - Ghi bề rộng ra CSS variable `cssVar` trên :root để cả panel lẫn margin nội dung dùng chung.
 * - Lưu localStorage để nhớ giữa các lần.
 * - Panel nằm bên PHẢI nên kéo sang TRÁI = rộng thêm.
 */
export function useResizableWidth(opts: {
  cssVar: string;
  storageKey: string;
  def: number;
  min: number;
  max: number;
  /** Which side the panel sits on. 'right' (default): drag left to grow.
   *  'left': drag right to grow. */
  side?: 'left' | 'right';
}) {
  const { cssVar, storageKey, def, min, max, side = 'right' } = opts;
  const clamp = useCallback((w: number) => Math.max(min, Math.min(max, w)), [min, max]);

  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return def;
    const saved = Number(localStorage.getItem(storageKey));
    return Number.isFinite(saved) && saved > 0 ? clamp(saved) : def;
  });

  useEffect(() => {
    document.documentElement.style.setProperty(cssVar, `${width}px`);
  }, [cssVar, width]);

  const drag = useRef<{ startX: number; startW: number; cur: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = { startX: e.clientX, startW: width, cur: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: PointerEvent) => {
      if (!drag.current) return;
      const delta = side === 'left'
        ? ev.clientX - drag.current.startX // panel trái: kéo phải -> rộng
        : drag.current.startX - ev.clientX; // panel phải: kéo trái -> rộng
      const next = clamp(drag.current.startW + delta);
      drag.current.cur = next;
      document.documentElement.style.setProperty(cssVar, `${next}px`); // cập nhật mượt, không re-render
    };
    const onUp = () => {
      const cur = drag.current?.cur;
      drag.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (typeof cur === 'number') {
        setWidth(cur);
        localStorage.setItem(storageKey, String(Math.round(cur)));
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [cssVar, storageKey, width, clamp, side]);

  const reset = useCallback(() => {
    setWidth(def);
    localStorage.setItem(storageKey, String(def));
  }, [def, storageKey]);

  return { width, onPointerDown, reset };
}
