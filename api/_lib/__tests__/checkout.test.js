import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  plan: null,           // dữ liệu trả cho plans.maybeSingle()
  pricing: null,        // dữ liệu trả cho pricing_config.maybeSingle()
  orderInsert: null,    // payload insert vào orders (để kiểm số tiền)
  payosCreate: vi.fn(),
  payosGet: vi.fn(),
}));

vi.mock('@payos/node', () => ({
  PayOS: class {
    paymentRequests = { create: mocks.payosCreate, get: mocks.payosGet };
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: (table) => {
      if (table === 'plans') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.plan, error: null }) }) }) };
      }
      if (table === 'pricing_config') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.pricing, error: null }) }) }) };
      }
      if (table === 'profiles') {
        return { upsert: async () => ({ error: null }) };
      }
      if (table === 'orders') {
        return {
          insert: (payload) => {
            mocks.orderInsert = payload;
            return { select: () => ({ single: async () => ({ data: { order_code: 100123 }, error: null }) }) };
          },
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      return {};
    },
  }),
}));

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader() { return this; },
    end() { return this; },
  };
}

async function loadHandler() {
  vi.resetModules();
  const { default: handler } = await import('../../checkout.js');
  return handler;
}

function req(body, extraHeaders = {}) {
  return {
    method: 'POST',
    headers: { origin: 'https://geo3d.io.vn', authorization: 'Bearer good', ...extraHeaders },
    body,
  };
}

describe('checkout — server is the source of truth for price', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.PAYOS_CLIENT_ID = 'client';
    process.env.PAYOS_API_KEY = 'api';
    process.env.PAYOS_CHECKSUM_KEY = 'checksum';
    process.env.NEXT_PUBLIC_APP_URL = 'https://geo3d.io.vn';
    mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mocks.plan = null;
    mocks.pricing = null;
    mocks.orderInsert = null;
    mocks.payosCreate.mockReset().mockResolvedValue({ checkoutUrl: 'https://pay.example/checkout' });
    mocks.payosGet.mockReset();
  });

  it('requires authentication', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler(req({ planCode: 'pro_1m' }, { authorization: undefined }), res);
    expect(res.statusCode).toBe(401);
    expect(mocks.payosCreate).not.toHaveBeenCalled();
  });

  it('charges the DB plan price, ignoring any amount sent by the client', async () => {
    mocks.plan = { code: 'pro_1m', price_vnd: 149000, active: true };
    const handler = await loadHandler();
    const res = response();
    // Client cố nhét amount=1 — phải bị bỏ qua.
    await handler(req({ planCode: 'pro_1m', amount: 1 }), res);
    expect(res.statusCode).toBe(200);
    expect(mocks.orderInsert.amount).toBe(149000);
    expect(mocks.orderInsert.plan_code).toBe('pro_1m');
    expect(mocks.orderInsert.user_id).toBe('u1');
    expect(mocks.payosCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 149000 }));
  });

  it('rejects an unknown or inactive plan', async () => {
    mocks.plan = null;
    const handler = await loadHandler();
    let res = response();
    await handler(req({ planCode: 'ghost' }), res);
    expect(res.statusCode).toBe(400);

    mocks.plan = { code: 'pro_1m', price_vnd: 149000, active: false };
    res = response();
    await handler(req({ planCode: 'pro_1m' }), res);
    expect(res.statusCode).toBe(400);
    expect(mocks.payosCreate).not.toHaveBeenCalled();
  });

  it('prices a credit pack from pricing_config (qty × unit price)', async () => {
    mocks.pricing = { value: 500 };
    const handler = await loadHandler();
    const res = response();
    await handler(req({ creditPack: 100 }), res);
    expect(res.statusCode).toBe(200);
    expect(mocks.orderInsert.amount).toBe(50000);     // 100 × 500
    expect(mocks.orderInsert.credit_amount).toBe(100);
    expect(mocks.orderInsert.plan_code).toBeNull();
  });

  it('rejects a credit pack outside the allowed range', async () => {
    const handler = await loadHandler();
    for (const qty of [5, 20000, 1.5]) {
      const res = response();
      await handler(req({ creditPack: qty }), res);
      expect(res.statusCode, `qty=${qty}`).toBe(400);
    }
    expect(mocks.payosCreate).not.toHaveBeenCalled();
  });
});
