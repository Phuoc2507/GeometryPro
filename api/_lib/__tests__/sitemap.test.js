import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildUrlset, buildSitemapIndex, escapeXml, toLastmod,
  sharePageCount, shareRange, CORE_PAGES, SHARES_PER_SITEMAP,
} from '../sitemap.js';

// Giả lập tầng đọc DB; phần dựng XML và phân trang là hàng thật.
vi.mock('../shareStore.js', () => ({
  fetchPublicShare: vi.fn(),
  countPublicShares: vi.fn(),
  listPublicShares: vi.fn(),
}));

const { countPublicShares, listPublicShares } = await import('../shareStore.js');
const sitemapHandler = (await import('../../sitemap.js')).default;

const ORIGIN = 'https://geo3d.io.vn';

function mockRes() {
  const r = { headers: {}, statusCode: 200, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.end = (b) => { r.body = b; return r; };
  r.json = (o) => { r.body = o; return r; };
  return r;
}

const req = (query, method = 'GET') => ({
  method,
  query,
  headers: { host: 'geo3d.io.vn', 'x-forwarded-proto': 'https' },
});

/** Kiểm XML đúng cú pháp thật sự, không chỉ so chuỗi. */
function assertWellFormed(xml) {
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  // Thẻ mở và thẻ đóng phải cân nhau cho từng loại.
  for (const tag of ['urlset', 'sitemapindex', 'url', 'sitemap', 'loc', 'lastmod']) {
    const open = (xml.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const close = (xml.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    expect(close, `thẻ ${tag} không cân`).toBe(open);
  }
  // Không được còn ký tự & trần (chỉ chấp nhận dạng đã bọc).
  expect(xml.replace(/&(amp|lt|gt|quot|apos);/g, '')).not.toContain('&');
}

describe('escapeXml / toLastmod', () => {
  it('bọc đủ 5 ký tự chuẩn sitemap yêu cầu', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });

  it('đưa timestamp về W3C Datetime dạng ngày', () => {
    expect(toLastmod('2026-08-21T10:22:33.123Z')).toBe('2026-08-21');
    expect(toLastmod(null)).toBeNull();
    expect(toLastmod('không phải ngày')).toBeNull();
  });
});

describe('phân trang', () => {
  it('không có bài nào thì không sinh file con', () => {
    expect(sharePageCount(0)).toBe(0);
    expect(sharePageCount(null)).toBe(0);
    expect(sharePageCount(-5)).toBe(0);
  });

  it('chia đúng theo ngưỡng mỗi file', () => {
    expect(sharePageCount(1)).toBe(1);
    expect(sharePageCount(SHARES_PER_SITEMAP)).toBe(1);
    expect(sharePageCount(SHARES_PER_SITEMAP + 1)).toBe(2);
    expect(sharePageCount(SHARES_PER_SITEMAP * 3)).toBe(3);
  });

  it('khoảng bản ghi liền mạch, không chồng lấn và không bỏ sót', () => {
    const p1 = shareRange(1);
    const p2 = shareRange(2);
    expect(p1).toEqual({ from: 0, to: SHARES_PER_SITEMAP - 1 });
    expect(p2.from).toBe(p1.to + 1);
    expect(p2.to - p2.from + 1).toBe(SHARES_PER_SITEMAP);
  });

  it('số trang rác quy về trang 1 thay vì sinh khoảng âm', () => {
    for (const bad of [0, -3, NaN, 'abc', undefined]) {
      expect(shareRange(bad).from).toBe(0);
    }
  });

  it('ngưỡng nằm dưới xa mức trần 50.000 của chuẩn sitemap', () => {
    expect(SHARES_PER_SITEMAP).toBeLessThanOrEqual(50000);
  });
});

describe('buildUrlset', () => {
  it('sinh XML hợp lệ với loc tuyệt đối', () => {
    const xml = buildUrlset(
      [{ path: '/s/abc', lastmod: '2026-08-21T00:00:00Z', changefreq: 'monthly' }],
      ORIGIN,
    );
    assertWellFormed(xml);
    expect(xml).toContain('<loc>https://geo3d.io.vn/s/abc</loc>');
    expect(xml).toContain('<lastmod>2026-08-21</lastmod>');
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it('bỏ lastmod khi không có, không sinh thẻ rỗng', () => {
    const xml = buildUrlset([{ path: '/' }], ORIGIN);
    expect(xml).not.toContain('<lastmod>');
    assertWellFormed(xml);
  });
});

describe('GET /sitemap.xml — index', () => {
  beforeEach(() => {
    vi.mocked(countPublicShares).mockReset();
    vi.mocked(listPublicShares).mockReset();
  });

  it('liệt kê trang cố định + đúng số file con theo số bài', async () => {
    vi.mocked(countPublicShares).mockResolvedValue(SHARES_PER_SITEMAP + 1);
    const res = mockRes();
    await sitemapHandler(req({ kind: 'index' }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    assertWellFormed(res.body);
    expect(res.body).toContain('<loc>https://geo3d.io.vn/sitemap-pages.xml</loc>');
    expect(res.body).toContain('<loc>https://geo3d.io.vn/sitemap-shares-1.xml</loc>');
    expect(res.body).toContain('<loc>https://geo3d.io.vn/sitemap-shares-2.xml</loc>');
    expect(res.body).not.toContain('sitemap-shares-3.xml');
  });

  it('chưa có bài chia sẻ nào thì KHÔNG trỏ tới file con rỗng', async () => {
    vi.mocked(countPublicShares).mockResolvedValue(0);
    const res = mockRes();
    await sitemapHandler(req({ kind: 'index' }), res);

    expect(res.body).toContain('sitemap-pages.xml');
    expect(res.body).not.toContain('sitemap-shares-');
  });

  it('DB sập thì vẫn trả sitemap HỢP LỆ với các trang cố định, không trả lỗi', async () => {
    vi.mocked(countPublicShares).mockRejectedValue(new Error('supabase sập'));
    const res = mockRes();
    await sitemapHandler(req({ kind: 'index' }), res);

    expect(res.statusCode).toBe(200);
    assertWellFormed(res.body);
    expect(res.body).toContain('<loc>https://geo3d.io.vn/bang-gia</loc>');
  });
});

describe('GET /sitemap-pages.xml', () => {
  it('có đủ trang cố định, và KHÔNG có trang sau đăng nhập', async () => {
    const res = mockRes();
    await sitemapHandler(req({ kind: 'pages' }), res);

    assertWellFormed(res.body);
    for (const p of CORE_PAGES) {
      expect(res.body).toContain(`<loc>https://geo3d.io.vn${p.path === '/' ? '/' : p.path}</loc>`);
    }
    // Các trang này chuyển hướng sang đăng nhập ⇒ với bot là trang rỗng.
    for (const gated of ['/gioi-thieu', '/quan-ly-to', '/settings', '/saved', '/admin', '/auth']) {
      expect(res.body, gated).not.toContain(`${gated}<`);
    }
  });
});

describe('GET /sitemap-shares-N.xml', () => {
  beforeEach(() => {
    vi.mocked(listPublicShares).mockReset();
  });

  it('liệt kê link /s/:id kèm lastmod', async () => {
    vi.mocked(listPublicShares).mockResolvedValue([
      { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', updated_at: '2026-08-20T09:00:00Z' },
      { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', updated_at: '2026-08-19T09:00:00Z' },
    ]);
    const res = mockRes();
    await sitemapHandler(req({ kind: 'shares', page: '1' }), res);

    expect(res.statusCode).toBe(200);
    assertWellFormed(res.body);
    expect(res.body).toContain('<loc>https://geo3d.io.vn/s/3f2504e0-4f89-41d3-9a0c-0305e82c3301</loc>');
    expect(res.body).toContain('<lastmod>2026-08-20</lastmod>');
    expect((res.body.match(/<url>/g) || []).length).toBe(2);
  });

  it('hỏi đúng khoảng bản ghi của trang được yêu cầu', async () => {
    vi.mocked(listPublicShares).mockResolvedValue([{ id: 'x', updated_at: null }]);
    const res = mockRes();
    await sitemapHandler(req({ kind: 'shares', page: '3' }), res);

    expect(listPublicShares).toHaveBeenCalledWith(shareRange(3));
  });

  it('bỏ đuôi .xml dính vào số trang, không âm thầm rơi về trang 1', async () => {
    vi.mocked(listPublicShares).mockResolvedValue([{ id: 'x', updated_at: null }]);
    const res = mockRes();
    await sitemapHandler(req({ kind: 'shares', page: '2.xml' }), res);

    expect(listPublicShares).toHaveBeenCalledWith(shareRange(2));
    expect(res.statusCode).toBe(200);
  });

  it('trang rỗng trả 404, KHÔNG trả urlset rỗng (sai chuẩn sitemap)', async () => {
    vi.mocked(listPublicShares).mockResolvedValue([]);
    const res = mockRes();
    await sitemapHandler(req({ kind: 'shares', page: '99' }), res);

    expect(res.statusCode).toBe(404);
  });
});

describe('chung', () => {
  it('chặn method không phải GET/HEAD', async () => {
    const res = mockRes();
    await sitemapHandler(req({ kind: 'index' }, 'POST'), res);
    expect(res.statusCode).toBe(405);
  });

  it('đặt Cache-Control cho CDN để bot không đấm thẳng vào DB', async () => {
    vi.mocked(countPublicShares).mockResolvedValue(0);
    const res = mockRes();
    await sitemapHandler(req({ kind: 'index' }), res);
    expect(res.headers['cache-control']).toContain('s-maxage');
  });
});
