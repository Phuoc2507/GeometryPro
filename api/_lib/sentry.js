// api/_lib/sentry.js
// Sentry cho các hàm serverless (Vercel). NO-OP khi chưa đặt SENTRY_DSN.
//
// Lưu ý serverless: phải `await Sentry.flush()` TRƯỚC khi hàm trả về, nếu không
// runtime có thể đóng băng/tái dùng instance và sự kiện chưa kịp gửi sẽ mất.
import * as Sentry from '@sentry/node';

let initialized = false;

export function initServerSentry() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // chưa cấu hình → bỏ qua hoàn toàn
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false, // không tự gắn IP/headers nhạy cảm
  });
  initialized = true;
}

/** Ghi nhận lỗi rồi FLUSH (bắt buộc trước khi hàm serverless kết thúc). */
export async function reportServerError(error, context) {
  if (!initialized) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
    await Sentry.flush(2000);
  } catch {
    /* nuốt lỗi của Sentry — không để ảnh hưởng response cho người dùng */
  }
}

/**
 * Bọc một handler serverless: khởi tạo Sentry, bắt các throw CHƯA xử lý,
 * report + flush, rồi trả 500 (nếu chưa gửi header). Giữ nguyên chữ ký (req,res).
 */
export function withSentry(handler, routeName) {
  return async (req, res) => {
    initServerSentry();
    try {
      return await handler(req, res);
    } catch (err) {
      await reportServerError(err, { route: routeName, method: req?.method, url: req?.url });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}
