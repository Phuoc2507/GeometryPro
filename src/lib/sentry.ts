import * as Sentry from '@sentry/react';

/**
 * Khởi tạo Sentry (error tracking) cho client.
 *
 * - Chỉ bật khi có VITE_SENTRY_DSN → dev / bản build không cấu hình DSN là NO-OP.
 * - Tối thiểu hoá dữ liệu cá nhân: sendDefaultPii=false (không tự gửi IP/cookie);
 *   người dùng chỉ được gắn bằng ID (xem setSentryUser), không gửi email.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    // Lấy mẫu tracing nhẹ để không tốn quota; chỉnh qua env nếu cần.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    integrations: [Sentry.browserTracingIntegration()],
  });
}

/** Gắn/huỷ ngữ cảnh người dùng cho Sentry (CHỈ id, không email — theo chính sách bảo mật). */
export function setSentryUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null);
}

/** Ghi nhận thủ công một ngoại lệ (dùng trong ErrorBoundary / catch quan trọng). */
export function captureException(error: unknown) {
  Sentry.captureException(error);
}
