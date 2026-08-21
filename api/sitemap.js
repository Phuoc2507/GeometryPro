// api/sitemap.js — sitemap động, phục vụ ba đường:
//
//   /sitemap.xml           kind=index   sitemap index, trỏ tới các file con
//   /sitemap-pages.xml     kind=pages   các trang marketing cố định
//   /sitemap-shares-N.xml  kind=shares  trang N của các bài chia sẻ công khai
//
// LƯU Ý KHI SỬA: đã xoá public/sitemap.xml. Vercel phục vụ file tĩnh TRƯỚC khi áp
// rewrite, nên chỉ cần một file tĩnh cùng tên nằm trong public/ là nó che mất hàm
// này và sitemap đứng yên vĩnh viễn mà không báo lỗi gì.
//
// Đọc bằng khoá ANON: RLS chỉ cho thấy bài is_public = true và không phải mục lịch
// sử, nên bài riêng tư không thể lọt vào sitemap kể cả khi câu truy vấn viết sai.

import {
  buildUrlset, buildSitemapIndex, corePagesUrlset,
  sharePageCount, shareRange, CORE_PAGES,
} from './_lib/sitemap.js';
import { countPublicShares, listPublicShares } from './_lib/shareStore.js';
import { publicOrigin } from './_lib/shareMeta.js';
import { withSentry, reportServerError } from './_lib/sentry.js';

function sendXml(res, xml) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Bot tìm kiếm ghé không thường xuyên; giữ ở CDN một giờ là đủ tươi mà không
  // bắt DB phải trả lời mỗi lần có con bot đi qua.
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).end(xml);
}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const origin = publicOrigin(req);
  const kind = String(req.query?.kind || 'index');

  try {
    if (kind === 'pages') {
      return sendXml(res, corePagesUrlset(origin));
    }

    if (kind === 'shares') {
      // Bỏ đuôi .xml nếu bộ định tuyến truyền cả vào tham số: Number('2.xml') là NaN,
      // sẽ ÂM THẦM rơi về trang 1 và lặp lại nội dung của trang đầu.
      const rawPage = String(req.query?.page ?? '1').replace(/\.xml$/i, '');
      const page = Math.max(1, Math.floor(Number(rawPage) || 1));
      const rows = await listPublicShares(shareRange(page));
      // Chuẩn sitemap bắt <urlset> phải có ít nhất một <url>, nên trang rỗng KHÔNG
      // được trả về XML rỗng — đó là file sai chuẩn. Index không bao giờ trỏ tới
      // trang rỗng, nên tới được đây nghĩa là trang này thật sự không tồn tại.
      if (!rows.length) return res.status(404).json({ error: 'Not Found' });
      return sendXml(res, buildUrlset(
        rows.map((r) => ({ path: `/s/${r.id}`, lastmod: r.updated_at, changefreq: 'monthly' })),
        origin,
      ));
    }

    // kind = index
    const total = await countPublicShares();
    const pages = sharePageCount(total);
    const children = [
      { path: '/sitemap-pages.xml' },
      ...Array.from({ length: pages }, (_, i) => ({ path: `/sitemap-shares-${i + 1}.xml` })),
    ];
    return sendXml(res, buildSitemapIndex(children, origin));
  } catch (error) {
    await reportServerError(error, { route: 'sitemap', kind });
    console.error('[sitemap]', error);
    // Hỏng thì vẫn phải trả sitemap HỢP LỆ — trả về các trang cố định là tệ nhất
    // cũng bằng đúng sitemap tĩnh trước đây, chứ không để Google nhận lỗi.
    return sendXml(res, buildUrlset(CORE_PAGES, origin));
  }
}

export default withSentry(handler, 'sitemap');
