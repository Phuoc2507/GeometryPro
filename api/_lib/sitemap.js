// api/_lib/sitemap.js
// Dựng sitemap. Phần THUẦN (không I/O) để test được mà không cần DB.
//
// Hình dạng đã chọn — sitemap index, không phải một file phẳng:
//   /sitemap.xml            → index, trỏ tới các file con
//   /sitemap-pages.xml      → các trang marketing cố định
//   /sitemap-shares-1.xml   → trang 1 của các bài chia sẻ công khai
//   /sitemap-shares-2.xml   → …
//
// Vì sao không nhét tất cả vào một file: chuẩn sitemap giới hạn 50.000 URL và 50MB
// mỗi file. Một file phẳng sẽ chạy tốt lúc đầu rồi ÂM THẦM cụt khi vượt ngưỡng —
// đúng loại lỗi không ai phát hiện ra. Index thì chia trang từ đầu, số bài tăng
// bao nhiêu cũng không phải sửa lại.

/** Mỗi file con giữ 5.000 URL — dưới xa mức trần 50.000 để file nhẹ và tải nhanh. */
export const SHARES_PER_SITEMAP = 5000;

/**
 * Các trang cố định đáng đưa lên Google.
 * KHÔNG có /gioi-thieu, /quan-ly-to, /saved, /settings, /admin: chúng chuyển hướng
 * sang đăng nhập nên với bot là trang rỗng — đưa vào chỉ tổ sinh trang mỏng.
 */
export const CORE_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/bang-gia', changefreq: 'monthly', priority: '0.9' },
  { path: '/teacher', changefreq: 'monthly', priority: '0.8' },
  { path: '/student', changefreq: 'monthly', priority: '0.8' },
  { path: '/dieu-khoan', changefreq: 'yearly', priority: '0.3' },
  { path: '/quyen-rieng-tu', changefreq: 'yearly', priority: '0.3' },
];

/** Bọc ký tự đặc biệt theo yêu cầu của chuẩn sitemap. */
export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Chuẩn sitemap yêu cầu W3C Datetime; ISO của Postgres đưa về dạng YYYY-MM-DD. */
export function toLastmod(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * @param {Array<{path:string, lastmod?:string|null, changefreq?:string, priority?:string}>} entries
 * @param {string} origin
 */
export function buildUrlset(entries, origin) {
  const body = entries.map((e) => {
    const parts = [`    <loc>${escapeXml(origin + e.path)}</loc>`];
    const lastmod = toLastmod(e.lastmod);
    if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
    if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
    if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
    return `  <url>\n${parts.join('\n')}\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

/**
 * @param {Array<{path:string, lastmod?:string|null}>} children
 * @param {string} origin
 */
export function buildSitemapIndex(children, origin) {
  const body = children.map((c) => {
    const parts = [`    <loc>${escapeXml(origin + c.path)}</loc>`];
    const lastmod = toLastmod(c.lastmod);
    if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
    return `  <sitemap>\n${parts.join('\n')}\n  </sitemap>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>
`;
}

/** Số file con cần cho `total` bài chia sẻ. Không có bài nào thì không sinh file con. */
export function sharePageCount(total) {
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / SHARES_PER_SITEMAP);
}

/** Trang con thứ `page` (1-based) tương ứng khoảng bản ghi nào. */
export function shareRange(page) {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const from = (p - 1) * SHARES_PER_SITEMAP;
  return { from, to: from + SHARES_PER_SITEMAP - 1 };
}

export function corePagesUrlset(origin) {
  return buildUrlset(CORE_PAGES, origin);
}
