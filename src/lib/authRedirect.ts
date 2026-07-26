/**
 * Tiện ích "quay lại đích sau khi đăng nhập" (returnTo).
 *
 * Guard/CTA nào đá người dùng sang trang đăng nhập thì kèm đích mong muốn qua
 * query `?redirect=`; sau khi đăng nhập xong, Auth trả họ về đúng chỗ đó.
 */

/** Dựng URL trang đăng nhập mang theo đích cần quay lại. */
export function authUrlWithRedirect(redirectPath: string): string {
  return `/auth?redirect=${encodeURIComponent(redirectPath)}`;
}

/**
 * Làm sạch giá trị `redirect` trước khi điều hướng.
 * Chỉ chấp nhận đường dẫn nội bộ; chặn open-redirect (`//host`, `http://…`) và
 * vòng lặp về chính trang `/auth`. Không hợp lệ → về trang chủ.
 */
export function sanitizeRedirect(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  // Ký tự thứ hai là '/' hoặc '\' đều là scheme-relative ('//host', '/\host'):
  // trình duyệt chuẩn hoá '\' → '/', nên cả hai đều dẫn ra host ngoài. Chặn cả hai.
  if (raw.length >= 2 && (raw[1] === '/' || raw[1] === '\\')) return '/';
  if (raw === '/auth' || raw.startsWith('/auth?') || raw.startsWith('/auth/')) return '/';
  return raw;
}
