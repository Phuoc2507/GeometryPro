import { useEffect, useRef, useState } from 'react';

/**
 * Bật `inView=true` khi phần tử cuộn vào khung nhìn (để chạy hiệu ứng xuất hiện).
 * Mặc định chỉ bật MỘT lần. Nếu không có IntersectionObserver → hiện luôn (không ẩn nội dung).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(opts?: { once?: boolean; margin?: string }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            if (opts?.once !== false) io.unobserve(e.target);
          } else if (opts?.once === false) {
            setInView(false);
          }
        });
      },
      { rootMargin: opts?.margin ?? '0px 0px -12% 0px', threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [opts?.once, opts?.margin]);

  return { ref, inView };
}
