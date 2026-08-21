import { describe, it, expect, vi, beforeEach } from 'vitest';

// Giả lập tầng đọc DB — phần còn lại (dựng thẻ, dựng ảnh, dự phòng) là hàng thật.
vi.mock('../shareStore.js', () => ({
  fetchPublicShare: vi.fn(),
}));

const { fetchPublicShare } = await import('../shareStore.js');
const shareHandler = (await import('../../share.js')).default;
const ogHandler = (await import('../../og.js')).default;

const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const ROW = {
  name: 'Chóp S.ABCD đáy hình vuông',
  prompt: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng đáy và SA = 2a. Tính khoảng cách từ A đến mặt phẳng (SBC).',
  geometry_data: {
    points: [
      { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
      { id: 'B', label: 'B', x: 4, y: 0, z: 0 },
      { id: 'C', label: 'C', x: 4, y: 0, z: 4 },
      { id: 'D', label: 'D', x: 0, y: 0, z: 4 },
      { id: 'S', label: 'S', x: 0, y: 6, z: 0 },
    ],
    lines: [
      { id: '1', from: 'A', to: 'B' }, { id: '2', from: 'B', to: 'C' },
      { id: '3', from: 'C', to: 'D', style: 'dashed' }, { id: '4', from: 'D', to: 'A', style: 'dashed' },
      { id: '5', from: 'S', to: 'A' }, { id: '6', from: 'S', to: 'B' }, { id: '7', from: 'S', to: 'C' },
    ],
  },
};

function mockRes() {
  const r = { headers: {}, statusCode: 200, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.end = (b) => { r.body = b; return r; };
  r.json = (o) => { r.body = o; return r; };
  r.redirect = (c, u) => { r.statusCode = c; r.headers.location = u; return r; };
  return r;
}

const req = (id, method = 'GET') => ({
  method,
  query: { id },
  headers: { host: 'geo3d.io.vn', 'x-forwarded-proto': 'https' },
});

beforeEach(() => {
  vi.mocked(fetchPublicShare).mockReset();
});

describe('GET /s/:id — trang chia sẻ có thẻ OG riêng', () => {
  it('lấy TÊN BÀI làm tiêu đề và ĐỀ BÀI làm mô tả', async () => {
    vi.mocked(fetchPublicShare).mockResolvedValue(ROW);
    const res = mockRes();
    await shareHandler(req(ID), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<title>Chóp S.ABCD đáy hình vuông — geo3d</title>');
    expect(res.body).toMatch(/og:description" content="Cho hình chóp S\.ABCD/);
  });

  it('og:image trỏ đúng vào ảnh của CHÍNH bài đó', async () => {
    vi.mocked(fetchPublicShare).mockResolvedValue(ROW);
    const res = mockRes();
    await shareHandler(req(ID), res);

    expect(res.body).toContain(`og:image" content="https://geo3d.io.vn/og/s/${ID}.png"`);
    expect(res.body).toContain(`og:url" content="https://geo3d.io.vn/s/${ID}"`);
  });

  it('vẫn trả về SPA đầy đủ — người dùng thật không bị ảnh hưởng', async () => {
    vi.mocked(fetchPublicShare).mockResolvedValue(ROW);
    const res = mockRes();
    await shareHandler(req(ID), res);

    expect(res.body).toContain('<div id="root">');
    expect(res.body).toMatch(/<script type="module"/);
  });

  it('bài không tồn tại / không công khai ⇒ thẻ mặc định + ảnh mặc định, KHÔNG lộ gì', async () => {
    vi.mocked(fetchPublicShare).mockResolvedValue(null);
    const res = mockRes();
    await shareHandler(req(ID), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('og:image" content="https://geo3d.io.vn/og-image.png"');
    expect(res.body).not.toContain(`/og/s/${ID}.png`);
  });

  it('id sai định dạng thì không hỏi DB', async () => {
    const res = mockRes();
    await shareHandler(req('../../secret'), res);

    expect(fetchPublicShare).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('tầng DB ném lỗi thì vẫn trả trang dùng được, không 500', async () => {
    vi.mocked(fetchPublicShare).mockRejectedValue(new Error('supabase sập'));
    const res = mockRes();
    await shareHandler(req(ID), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('og:title');
  });

  it('chặn method không phải GET/HEAD', async () => {
    const res = mockRes();
    await shareHandler(req(ID, 'POST'), res);
    expect(res.statusCode).toBe(405);
  });
});

describe('GET /og/s/:id.png — ảnh xem trước', () => {
  it('trả PNG dựng từ chính hình của bài', async () => {
    vi.mocked(fetchPublicShare).mockResolvedValue(ROW);
    const res = mockRes();
    await ogHandler(req(ID), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.body.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(Number(res.headers['content-length'])).toBe(res.body.length);
    expect(res.headers['cache-control']).toContain('s-maxage');
  });

  it('bài không công khai ⇒ chuyển hướng sang ảnh mặc định, KHÔNG trả lỗi', async () => {
    // Bot mạng xã hội gặp lỗi là bỏ luôn thẻ ảnh ⇒ phải chuyển hướng, không 404.
    vi.mocked(fetchPublicShare).mockResolvedValue(null);
    const res = mockRes();
    await ogHandler(req(ID), res);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/og-image.png');
  });

  it('hình không đủ dữ liệu để vẽ ⇒ ảnh mặc định', async () => {
    vi.mocked(fetchPublicShare).mockResolvedValue({ ...ROW, geometry_data: { points: [] } });
    const res = mockRes();
    await ogHandler(req(ID), res);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/og-image.png');
  });

  it('id sai định dạng ⇒ ảnh mặc định, không hỏi DB', async () => {
    const res = mockRes();
    await ogHandler(req('khong-phai-uuid'), res);

    expect(fetchPublicShare).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(302);
  });

  it('bỏ đuôi .png dính vào id (Vercel truyền cả đuôi trong vài cấu hình)', async () => {
    vi.mocked(fetchPublicShare).mockResolvedValue(ROW);
    const res = mockRes();
    await ogHandler(req(`${ID}.png`), res);

    expect(fetchPublicShare).toHaveBeenCalledWith(ID);
    expect(res.statusCode).toBe(200);
  });
});
