// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Hai thứ PHẢI đúng ở lớp analytics, vì sai là hỏng âm thầm:
 *   1. Không cấu hình nhà cung cấp ⇒ NO-OP tuyệt đối (không script, không request).
 *      Sai chiều này = tự dưng gửi dữ liệu người dùng đi khi chưa ai bật.
 *   2. KHÔNG rò nội dung người dùng (đề bài, email) vào tham số event.
 *      Sai chiều này = đẩy dữ liệu học sinh sang bên thứ ba.
 * Thêm một ràng buộc mềm: analytics hỏng KHÔNG được ném lỗi ra ngoài.
 */

type MutableEnv = Record<string, string | undefined>;

/** window không có index signature ⇒ phải đi qua `unknown` mới ép kiểu được. */
const win = () => window as unknown as Record<string, unknown>;

/** Nạp lại module với một bộ env giả — analytics đọc env ngay lúc init. */
async function loadWithEnv(env: MutableEnv) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    vi.stubEnv(k, v ?? '');
  }
  return import('../analytics');
}

describe('analytics', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete win().gtag;
    delete win().dataLayer;
    delete win().plausible;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('khi CHƯA cấu hình nhà cung cấp nào', () => {
    it('không chèn script và không bật', async () => {
      const a = await loadWithEnv({
        VITE_GA_MEASUREMENT_ID: '',
        VITE_PLAUSIBLE_DOMAIN: '',
        VITE_ANALYTICS_DEBUG: '',
      });
      a.initAnalytics();

      expect(a.isAnalyticsEnabled()).toBe(false);
      expect(document.head.querySelectorAll('script')).toHaveLength(0);
      expect(win().gtag).toBeUndefined();
    });

    it('trackEvent / trackPageView / setAnalyticsUser đều im lặng, không ném', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: '', VITE_PLAUSIBLE_DOMAIN: '' });
      a.initAnalytics();

      expect(() => a.trackEvent('draw_success', { mode: 'quick' })).not.toThrow();
      expect(() => a.trackPageView('/student')).not.toThrow();
      expect(() => a.setAnalyticsUser('user-1')).not.toThrow();
    });
  });

  describe('khi bật GA4', () => {
    it('chèn đúng một script gtag và tắt page_view tự động (SPA tự bắn)', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_PLAUSIBLE_DOMAIN: '' });
      a.initAnalytics();

      expect(a.isAnalyticsEnabled()).toBe(true);
      const scripts = [...document.head.querySelectorAll('script')].map((s) => s.getAttribute('src') || '');
      expect(scripts.filter((s) => s.includes('googletagmanager.com'))).toHaveLength(1);
      expect(scripts[0]).toContain('id=G-TEST123');

      // config phải đi kèm send_page_view:false, nếu không GA đếm page_view hai lần.
      const layer = (win().dataLayer as unknown[][] | undefined) || [];
      const config = layer.find((args) => args[0] === 'config');
      expect(config?.[2]).toMatchObject({ send_page_view: false });
    });

    it('trackEvent đẩy event vào dataLayer', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_PLAUSIBLE_DOMAIN: '' });
      a.initAnalytics();
      a.trackEvent('checkout_start', { plan: 'student_1m', with_referral: true });

      const layer = (win().dataLayer as unknown[][] | undefined) || [];
      const evt = layer.find((args) => args[0] === 'event' && args[1] === 'checkout_start');
      expect(evt).toBeDefined();
      expect(evt?.[2]).toEqual({ plan: 'student_1m', with_referral: true });
    });

    it('init hai lần chỉ chèn script một lần', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_PLAUSIBLE_DOMAIN: '' });
      a.initAnalytics();
      a.initAnalytics();

      const gtagScripts = [...document.head.querySelectorAll('script')]
        .filter((s) => (s.getAttribute('src') || '').includes('googletagmanager.com'));
      expect(gtagScripts).toHaveLength(1);
    });
  });

  describe('khi bật Plausible', () => {
    it('chèn script kèm data-domain và gọi được ngay trước khi script tải xong', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: '', VITE_PLAUSIBLE_DOMAIN: 'geo3d.io.vn' });
      a.initAnalytics();

      const el = [...document.head.querySelectorAll('script')]
        .find((s) => (s.getAttribute('src') || '').includes('/js/script.js'));
      expect(el?.getAttribute('data-domain')).toBe('geo3d.io.vn');

      a.trackEvent('signup', { method: 'password' });
      const q = ((win().plausible as { q?: unknown[][] } | undefined)?.q) || [];
      expect(q.some((args) => args[0] === 'signup')).toBe(true);
    });
  });

  describe('hàng rào chống rò dữ liệu người dùng', () => {
    it('cắt chuỗi dài xuống 100 ký tự (đề bài lỡ lọt vào thì cũng không đi trọn)', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_PLAUSIBLE_DOMAIN: '' });
      a.initAnalytics();

      const deBai = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng đáy và SA = 2a. Tính khoảng cách từ A đến (SBC).';
      expect(deBai.length).toBeGreaterThan(100);
      a.trackEvent('draw_attempt', { reason: deBai });

      const layer = (win().dataLayer as unknown[][] | undefined) || [];
      const evt = layer.find((args) => args[0] === 'event' && args[1] === 'draw_attempt');
      const sent = (evt?.[2] as Record<string, string>).reason;
      expect(sent).toHaveLength(100);
      expect(deBai.startsWith(sent)).toBe(true);
    });

    it('bỏ qua null/undefined và giá trị không phải kiểu nguyên thuỷ', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_PLAUSIBLE_DOMAIN: '' });
      a.initAnalytics();

      a.trackEvent('draw_fail', {
        code: undefined,
        status: null,
        // Ảnh base64 lỡ truyền vào phải KHÔNG được gửi nguyên si.
        payload: { imageBase64: 'data:image/png;base64,AAAA' } as unknown as string,
        ms: 1200,
      });

      const layer = (win().dataLayer as unknown[][] | undefined) || [];
      const evt = layer.find((args) => args[0] === 'event' && args[1] === 'draw_fail');
      expect(evt?.[2]).toEqual({ ms: 1200 });
    });

    it('setAnalyticsUser chỉ gửi id, không kèm thông tin nào khác', async () => {
      const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_PLAUSIBLE_DOMAIN: '' });
      a.initAnalytics();
      a.setAnalyticsUser('user-abc');

      const layer = (win().dataLayer as unknown[][] | undefined) || [];
      const configs = layer.filter((args) => args[0] === 'config');
      const last = configs[configs.length - 1]?.[2] as Record<string, unknown>;
      expect(last.user_id).toBe('user-abc');
      expect(Object.keys(last).sort()).toEqual(['send_page_view', 'user_id']);
    });
  });

  it('nhà cung cấp ném lỗi thì trackEvent vẫn không ném ra ngoài', async () => {
    const a = await loadWithEnv({ VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_PLAUSIBLE_DOMAIN: '' });
    a.initAnalytics();
    win().gtag = () => { throw new Error('chặn bởi adblock'); };

    expect(() => a.trackEvent('payment_success')).not.toThrow();
    expect(() => a.trackPageView('/bang-gia')).not.toThrow();
  });
});
