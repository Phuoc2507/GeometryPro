import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spy dùng chung (hoisted để vi.mock tham chiếu được)
const H = vi.hoisted(() => ({
  refund: vi.fn(),
  checkAndConsume: vi.fn(),
  maybeSingle: vi.fn(),
}));

// Mock supabase: auth trả user u1; from('ai_cache')...maybeSingle() do test điều khiển.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: () => ({
      select() { return this; },
      eq() { return this; },
      maybeSingle: H.maybeSingle,
      insert() { return { then: (cb) => cb({ error: null }) }; },
    }),
  }),
}));

// Mock lớp credit
vi.mock('../credits.js', () => ({
  creditsConfigured: () => true,
  checkAndConsume: H.checkAndConsume,
  refund: H.refund,
}));

function makeRes() {
  return {
    statusCode: null, body: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    write: vi.fn(), end: vi.fn(), flushHeaders: vi.fn(),
  };
}
const reqWith = (prompt) => ({
  method: 'POST', query: {}, headers: { authorization: 'Bearer tok' },
  body: { prompt, mode: 'quick', aiModel: 'low' },
});

describe('analyze-geometry: hoàn credit khi cache-hit', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://x';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
    H.refund.mockReset().mockResolvedValue(undefined);
    H.checkAndConsume.mockReset();
    H.maybeSingle.mockReset().mockResolvedValue({ data: { response: { cached: true, geometry: { points: [] } } }, error: null });
  });

  it('credit mode + cache-hit → TRỪ rồi HOÀN credit, trả cached', async () => {
    H.checkAndConsume.mockResolvedValue({ ok: true, mode: 'credit', cost: 1 });
    const { default: handler } = await import('../../analyze-geometry.js');
    const res = makeRes();
    await handler(reqWith('Cho hinh chop S.ABCD canh 2, tinh khoang cach tu A den (SCD)'), res);

    expect(H.checkAndConsume).toHaveBeenCalledTimes(1);              // đã trừ
    expect(H.refund).toHaveBeenCalledTimes(1);                      // rồi hoàn
    expect(H.refund).toHaveBeenCalledWith('u1', 1, expect.any(String));
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ cached: true });              // vẫn trả kết quả cache
  });

  it('free-tier (mode≠credit) + cache-hit → KHÔNG hoàn (đúng thiết kế)', async () => {
    H.checkAndConsume.mockResolvedValue({ ok: true, mode: 'quota' }); // free ⇒ không set creditCharge
    const { default: handler } = await import('../../analyze-geometry.js');
    const res = makeRes();
    await handler(reqWith('De free tier khac de tranh trung cache'), res);

    expect(H.refund).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
