// api/_lib/shareMeta.js
// Ghép thẻ Open Graph RIÊNG cho từng link chia sẻ /s/:id vào index.html.
//
// Vấn đề đang có: app là SPA Vite, mọi đường dẫn đều trả về CÙNG một index.html.
// Con bot của Facebook/Zalo KHÔNG chạy JavaScript, nên khi dán link /s/abc lên
// mạng xã hội nó đọc đúng thẻ OG mặc định của trang chủ — mọi bài chia sẻ trông
// giống hệt nhau, không ai biết trong đó là hình gì. Đây chính là kênh lan truyền
// tự nhiên của sản phẩm mà đang tắt.
//
// Cách xử lý: /s/:id đi qua một hàm serverless, hàm này lấy index.html ĐÃ BUILD
// (giữ nguyên đường dẫn asset có hash) rồi thay khối thẻ meta. Người dùng thật vẫn
// nhận đúng SPA như cũ; chỉ phần <head> là khác. Không đánh hơi User-Agent, nên
// bot và người đều thấy một nội dung — không có chuyện cloaking.

/** Bọc chuỗi để nhét an toàn vào thuộc tính HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Gom nhiều khoảng trắng/xuống dòng thành một dấu cách rồi cắt ở ranh giới từ. */
export function clampText(value, max) {
  const flat = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

const BRAND = 'geo3d';
const FALLBACK_TITLE = 'Hình học không gian 3D — geo3d';
const FALLBACK_DESC = 'Xem hình 3D tương tác kèm lời giải từng bước trên geo3d.';

/**
 * Tiêu đề + mô tả cho một bài đã chia sẻ.
 * Ưu tiên ĐỀ BÀI làm mô tả — đó là thứ người lướt Facebook thực sự đọc.
 */
export function shareTitleAndDescription({ name, prompt }) {
  const cleanName = clampText(name, 70);
  const cleanPrompt = clampText(prompt, 200);
  return {
    title: cleanName ? `${cleanName} — ${BRAND}` : FALLBACK_TITLE,
    description: cleanPrompt || FALLBACK_DESC,
  };
}

// Chỉ gỡ đúng những thẻ ta sắp ghi đè. Các thẻ khác trong <head>
// (charset, viewport, theme-color, manifest, font…) phải giữ nguyên.
const STRIP_PATTERNS = [
  /<title>[\s\S]*?<\/title>/gi,
  /<meta\s+[^>]*name=["']description["'][^>]*>/gi,
  /<meta\s+[^>]*property=["']og:[^"']*["'][^>]*>/gi,
  /<meta\s+[^>]*name=["']twitter:[^"']*["'][^>]*>/gi,
  /<link\s+[^>]*rel=["']canonical["'][^>]*>/gi,
];

/**
 * Thay khối thẻ meta của index.html bằng thẻ riêng của bài chia sẻ.
 *
 * @param {string} baseHtml  Nội dung index.html đã build (giữ nguyên script/asset).
 * @param {object} meta
 * @param {string} meta.title
 * @param {string} meta.description
 * @param {string} meta.url        URL chuẩn của trang chia sẻ.
 * @param {string} meta.image      URL tuyệt đối của ảnh xem trước.
 * @param {string} [meta.imageAlt]
 * @returns {string} HTML đã thay thẻ.
 */
export function injectShareMeta(baseHtml, meta) {
  const html = String(baseHtml || '');
  const headClose = html.search(/<\/head>/i);
  // Không tìm thấy </head> ⇒ đây không phải HTML ta hiểu được. Trả nguyên xi còn hơn
  // cắt bậy làm hỏng trang.
  if (headClose === -1) return html;

  let head = html.slice(0, headClose);
  const rest = html.slice(headClose);
  for (const re of STRIP_PATTERNS) head = head.replace(re, '');

  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const image = escapeHtml(meta.image);
  const alt = escapeHtml(meta.imageAlt || meta.title);

  const block = `
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${BRAND}" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${alt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${image}" />
  `;

  return `${head.trimEnd()}\n${block}  ${rest}`;
}

/** Chỉ nhận id dạng UUID — chặn luôn việc nhét đường dẫn lạ vào URL ảnh/canonical. */
export function isValidShareId(id) {
  return typeof id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Origin công khai của site. Ưu tiên cấu hình tường minh; nếu không có thì suy ra
 * từ header của request (Vercel luôn gửi x-forwarded-host/proto).
 */
export function publicOrigin(req) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : '';
}
