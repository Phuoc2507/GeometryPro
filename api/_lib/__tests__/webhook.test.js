import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@payos/node', () => ({
  PayOS: class {
    webhooks = { verify: mocks.verify };
  },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('PayOS webhook fulfillment', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.PAYOS_CLIENT_ID = 'client';
    process.env.PAYOS_API_KEY = 'api';
    process.env.PAYOS_CHECKSUM_KEY = 'checksum';
    mocks.verify.mockReset();
    mocks.rpc.mockReset();
  });

  it('returns 400 for an invalid signature', async () => {
    mocks.verify.mockRejectedValue(new Error('bad signature'));
    vi.resetModules();
    const { default: handler } = await import('../../webhook.js');
    const res = response();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.statusCode).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns 500 so PayOS retries a failed atomic fulfillment', async () => {
    mocks.verify.mockResolvedValue({ code: '00', success: true, orderCode: 123456 });
    mocks.rpc.mockResolvedValue({ data: { ok: false, err: 'profile_not_found' }, error: null });
    vi.resetModules();
    const { default: handler } = await import('../../webhook.js');
    const res = response();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.statusCode).toBe(500);
    expect(mocks.rpc).toHaveBeenCalledWith('fulfill_paid_order', { p_order_code: 123456 });
  });

  it('acknowledges a duplicate without granting twice', async () => {
    mocks.verify.mockResolvedValue({ code: '00', success: true, orderCode: 123456 });
    mocks.rpc.mockResolvedValue({ data: { ok: true, duplicate: true }, error: null });
    vi.resetModules();
    const { default: handler } = await import('../../webhook.js');
    const res = response();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, duplicate: true, orderCode: 123456 });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
