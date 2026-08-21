// api/og.js — ảnh xem trước cho link chia sẻ: GET /og/s/<id>.png
//
// Trả về PNG 1200×630 vẽ từ chính geometry_data của bài đó, để khi dán link lên
// Facebook/Zalo người ta thấy ĐÚNG hình được chia sẻ thay vì ảnh mặc định của site.
// Bài không tồn tại / không công khai / không đủ dữ liệu để vẽ ⇒ chuyển hướng sang
// ảnh mặc định, KHÔNG trả lỗi (bot thấy lỗi thì bỏ luôn thẻ ảnh).

import { renderGeometryPng } from './_lib/ogImage.js';
import { fetchPublicShare } from './_lib/shareStore.js';
import { isValidShareId } from './_lib/shareMeta.js';
import { withSentry, reportServerError } from './_lib/sentry.js';

const FALLBACK_IMAGE = '/og-image.png';

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const id = String(req.query?.id || '').replace(/\.png$/i, '');
  if (!isValidShareId(id)) return res.redirect(302, FALLBACK_IMAGE);

  try {
    const row = await fetchPublicShare(id);
    const png = row ? renderGeometryPng(row.geometry_data, { caption: 'geo3d.io.vn' }) : null;
    if (!png) return res.redirect(302, FALLBACK_IMAGE);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', String(png.length));
    // Bot mạng xã hội gọi lại nhiều lần; CDN giữ một ngày là đủ, sau đó nền tự làm mới.
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).end(png);
  } catch (error) {
    await reportServerError(error, { route: 'og', id });
    console.error('[og]', error);
    return res.redirect(302, FALLBACK_IMAGE);
  }
}

export default withSentry(handler, 'og');
