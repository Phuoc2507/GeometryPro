/**
 * Analytics phễu người dùng — lớp TRUNG GIAN, không gắn chết vào một nhà cung cấp.
 *
 * Vì sao có lớp này: các điểm chạm trong app chỉ gọi `trackEvent('draw_success', …)`.
 * Đổi GA4 → Plausible → PostHog sau này chỉ sửa ĐÚNG file này, không đụng call site.
 *
 * Bật/tắt hoàn toàn bằng env (giống mẫu VITE_SENTRY_DSN ở sentry.ts):
 *   • VITE_GA_MEASUREMENT_ID   — GA4 ("G-XXXXXXX")
 *   • VITE_PLAUSIBLE_DOMAIN    — Plausible ("geo3d.io.vn"), + VITE_PLAUSIBLE_HOST nếu tự host
 *   • VITE_ANALYTICS_DEBUG=1   — in event ra console (dev), không gửi đi đâu
 * KHÔNG có biến nào → toàn bộ module là NO-OP, không chèn script, không request.
 *
 * Hai nguyên tắc bất di bất dịch:
 *   1. KHÔNG BAO GIỜ ném lỗi. Analytics hỏng thì app vẫn phải chạy → mọi thứ bọc try/catch.
 *   2. KHÔNG gửi PII. Không email, không đề bài, không nội dung người dùng nhập.
 *      Chỉ id người dùng (đồng nhất với chính sách của Sentry) + nhãn ngắn đã whitelist.
 */

type EventParams = Record<string, string | number | boolean | null | undefined>;

interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  plausible?: { (...args: unknown[]): void; q?: unknown[] };
}

/** Tên event dùng trong toàn app. Liệt kê tường minh để không trôi thành chuỗi tự do. */
export type AnalyticsEvent =
  // Phễu dùng thử
  | 'draw_attempt'
  | 'draw_success'
  | 'draw_fail'
  | 'solve_attempt'
  | 'solve_success'
  | 'solve_fail'
  // Phễu tài khoản
  | 'signup'
  | 'login'
  // Phễu doanh thu
  | 'quota_exhausted'
  | 'upgrade_modal_open'
  | 'checkout_start'
  | 'checkout_fail'
  | 'payment_success'
  // Lan truyền
  | 'referral_link_visit'
  | 'referral_code_applied'
  | 'share_click';

let enabled = false;
let debug = false;
let gaId = '';
let plausibleDomain = '';

const w = (): GtagWindow | null => (typeof window === 'undefined' ? null : (window as GtagWindow));

/** Chèn thẻ <script> async. Trả về false nếu môi trường không có DOM (test/SSR). */
function injectScript(src: string, attrs: Record<string, string> = {}): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.head.appendChild(el);
  return true;
}

/**
 * Lọc tham số trước khi gửi: chỉ giữ kiểu nguyên thuỷ, cắt ngắn chuỗi.
 * Đây là HÀNG RÀO CUỐI chống lỡ tay gửi đề bài / email vào analytics.
 */
function sanitize(params?: EventParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const [rawKey, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const key = rawKey.slice(0, 40);
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string') {
      // Chuỗi dài = nghi có nội dung người dùng → cắt cứng 100 ký tự.
      const s = value.slice(0, 100);
      if (s) out[key] = s;
    }
  }
  return out;
}

/**
 * Khởi tạo analytics. Gọi MỘT LẦN ở main.tsx, trước khi render.
 * Không cấu hình nhà cung cấp nào → return sớm, app không tải thêm byte nào.
 */
export function initAnalytics(): void {
  try {
    const win = w();
    if (!win || enabled) return;

    gaId = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
    plausibleDomain = String(import.meta.env.VITE_PLAUSIBLE_DOMAIN || '').trim();
    debug = String(import.meta.env.VITE_ANALYTICS_DEBUG || '') === '1';

    if (!gaId && !plausibleDomain && !debug) return;

    if (gaId) {
      // Stub dataLayer TRƯỚC khi script tải xong — gtag tự đệm, không mất event sớm.
      win.dataLayer = win.dataLayer || [];
      const gtag = function gtag(...args: unknown[]) { win.dataLayer!.push(args); };
      win.gtag = gtag;
      gtag('js', new Date());
      // send_page_view=false: đây là SPA, page_view do trackPageView() tự bắn theo route.
      gtag('config', gaId, { send_page_view: false, anonymize_ip: true });
      injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
    }

    if (plausibleDomain) {
      // Stub hàng đợi theo đúng mẫu chính thức của Plausible.
      if (!win.plausible) {
        const stub = function plausibleStub(...args: unknown[]) {
          (stub.q = stub.q || []).push(args);
        } as { (...args: unknown[]): void; q?: unknown[] };
        win.plausible = stub;
      }
      const host = String(import.meta.env.VITE_PLAUSIBLE_HOST || 'https://plausible.io').replace(/\/$/, '');
      injectScript(`${host}/js/script.js`, { 'data-domain': plausibleDomain, defer: 'true' });
    }

    enabled = true;
  } catch {
    // Analytics hỏng KHÔNG được làm chết app.
    enabled = false;
  }
}

/** Ghi nhận một lượt xem trang (SPA — gọi mỗi khi route đổi). */
export function trackPageView(path: string): void {
  try {
    if (!enabled) return;
    const win = w();
    if (!win) return;
    const page = String(path || '/').slice(0, 200);
    if (debug) console.info('[analytics] page_view', page);
    win.gtag?.('event', 'page_view', { page_path: page, page_location: win.location?.href });
    win.plausible?.('pageview');
  } catch { /* im lặng */ }
}

/** Ghi nhận một event phễu. Tham số đi qua sanitize() — tuyệt đối không nhét nội dung người dùng. */
export function trackEvent(name: AnalyticsEvent, params?: EventParams): void {
  try {
    if (!enabled) return;
    const win = w();
    if (!win) return;
    const props = sanitize(params);
    if (debug) console.info('[analytics]', name, props);
    win.gtag?.('event', name, props);
    win.plausible?.(name, Object.keys(props).length ? { props } : undefined);
  } catch { /* im lặng */ }
}

/**
 * Gắn/huỷ danh tính người dùng.
 * CHỈ id — không email, không tên (đồng nhất với setSentryUser).
 * Plausible không có khái niệm user id (theo thiết kế không-cookie) → chỉ áp cho GA4.
 */
export function setAnalyticsUser(userId: string | null): void {
  try {
    if (!enabled || !gaId) return;
    w()?.gtag?.('config', gaId, { user_id: userId || undefined, send_page_view: false });
  } catch { /* im lặng */ }
}

/** Chỉ dùng cho test: trả trạng thái bật/tắt hiện tại. */
export function isAnalyticsEnabled(): boolean {
  return enabled;
}

/** Chỉ dùng cho test: đưa module về trạng thái chưa khởi tạo. */
export function __resetAnalyticsForTest(): void {
  enabled = false;
  debug = false;
  gaId = '';
  plausibleDomain = '';
}
