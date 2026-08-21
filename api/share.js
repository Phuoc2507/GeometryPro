// api/share.js — phục vụ /s/:id với thẻ Open Graph RIÊNG của từng bài.
//
// Trả về CHÍNH index.html đã build (nguyên vẹn script + asset có hash) và chỉ thay
// khối thẻ meta trong <head>. Nhờ vậy người dùng thật vẫn nhận đúng SPA như trước,
// còn bot của Facebook/Zalo — vốn không chạy JavaScript — đọc được tiêu đề, đề bài
// và ảnh xem trước của đúng bài đó.
//
// Lấy index.html ở đâu: tải chính nó qua HTTP từ origin của mình. Vercel phục vụ file
// tĩnh TRƯỚC khi áp rewrite, nên /index.html luôn ra file thật chứ không quay ngược
// vào hàm này. Kết quả được nhớ ở phạm vi module ⇒ mỗi lần khởi động nguội chỉ tải
// một lần. Có thêm hai lớp dự phòng bên dưới vì đây là đường đi của người dùng thật.

import fs from 'node:fs';
import path from 'node:path';
import { fetchPublicShare } from './_lib/shareStore.js';
import {
  injectShareMeta, shareTitleAndDescription, isValidShareId, publicOrigin, escapeHtml,
} from './_lib/shareMeta.js';
import { withSentry, reportServerError } from './_lib/sentry.js';

let cachedHtml = null;

/** Lớp 2: đọc thẳng từ đĩa (chạy được khi hàm được đóng gói kèm bản build). */
function readHtmlFromDisk() {
  for (const p of ['dist/index.html', 'index.html', '../dist/index.html']) {
    try {
      const full = path.resolve(process.cwd(), p);
      if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
    } catch { /* thử đường dẫn tiếp theo */ }
  }
  return null;
}

async function loadBaseHtml(origin) {
  if (cachedHtml) return cachedHtml;

  if (origin) {
    try {
      const r = await fetch(`${origin}/index.html`, { headers: { accept: 'text/html' } });
      if (r.ok) {
        const text = await r.text();
        // Nếu rewrite lỡ vòng ngược về chính hàm này thì text sẽ không phải index.html
        // thật; kiểm tra có thẻ nạp module của Vite trước khi tin.
        if (text.includes('<div id="root"')) {
          cachedHtml = text;
          return cachedHtml;
        }
      }
    } catch { /* rơi xuống lớp dự phòng */ }
  }

  const fromDisk = readHtmlFromDisk();
  if (fromDisk) {
    cachedHtml = fromDisk;
    return cachedHtml;
  }
  return null;
}

/**
 * Lớp 3: không lấy được index.html. Vẫn phải trả thẻ OG đúng (bot chỉ cần <head>),
 * kèm một trang tối giản đưa người thật sang app. Xấu, nhưng không chết.
 */
function degradedHtml(meta, id) {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${escapeHtml(meta.url)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${escapeHtml(meta.url)}" />
<meta property="og:image" content="${escapeHtml(meta.image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<script>window.location.replace('/student?id=${encodeURIComponent(id)}');</script>
</head><body style="background:#09090b;color:#e8e8f0;font-family:system-ui,sans-serif;padding:40px">
<p>Đang mở hình… <a style="color:#7daaff" href="/student?id=${escapeHtml(id)}">bấm vào đây</a> nếu trang không tự chuyển.</p>
</body></html>`;
}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const id = String(req.query?.id || '');
  const origin = publicOrigin(req);

  try {
    // Id sai định dạng → không tra DB, chỉ trả SPA với thẻ mặc định.
    const row = isValidShareId(id) ? await fetchPublicShare(id) : null;
    const { title, description } = shareTitleAndDescription({
      name: row?.name,
      prompt: row?.prompt,
    });
    const meta = {
      title,
      description,
      url: `${origin}/s/${id}`,
      // Ảnh dựng từ chính hình của bài; endpoint tự lùi về ảnh mặc định nếu không vẽ được.
      image: row ? `${origin}/og/s/${id}.png` : `${origin}/og-image.png`,
      imageAlt: title,
    };

    const base = await loadBaseHtml(origin);
    const html = base ? injectShareMeta(base, meta) : degradedHtml(meta, id);
    if (!base) {
      await reportServerError(new Error('share: không lấy được index.html'), { route: 'share', id });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Trang có thể đổi khi chủ sở hữu sửa hình ⇒ CDN giữ ngắn, cho phép phục vụ bản cũ
    // trong lúc làm mới nền.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).end(html);
  } catch (error) {
    await reportServerError(error, { route: 'share', id });
    console.error('[share]', error);
    const { title, description } = shareTitleAndDescription({});
    return res.status(200).end(degradedHtml({
      title, description, url: `${origin}/s/${id}`, image: `${origin}/og-image.png`,
    }, id));
  }
}

export default withSentry(handler, 'share');
