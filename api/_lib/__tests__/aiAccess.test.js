import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  checkAndConsume: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mocks.rpc,
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock('../credits.js', () => ({
  creditsConfigured: () => true,
  checkAndConsume: mocks.checkAndConsume,
}));

function response() {
  return {
    headers: {},
    headersSent: false,
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('shared AI access gate', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.GUEST_QUOTA_SECRET = 'test-secret-that-is-long-enough';
    process.env.GUEST_IP_DAILY_MULTIPLIER = '20';
    mocks.rpc.mockReset();
    mocks.getUser.mockReset();
    mocks.checkAndConsume.mockReset();
  });

  it('issues a signed HttpOnly guest cookie and stores only HMAC subjects', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ok: true, used: 1, max: 2, window_start: '2026-07-24T00:00:00.000Z' },
      error: null,
    });
    const { resolveAiAccess } = await import('../aiAccess.js');
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.42, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = response();
    const access = await resolveAiAccess(req, res, {
      feature: 'draw',
      action: 'draw_quick',
      allowGuest: true,
      guestFeature: 'draw_quick',
      guestMax: 2,
    });

    expect(access).toMatchObject({
      ok: true,
      actorType: 'guest',
      quota: { feature: 'draw_quick', remaining: 1 },
    });
    expect(res.headers['Set-Cookie']).toContain('HttpOnly');
    expect(res.headers['Set-Cookie']).toContain('SameSite=Lax');
    const rpcArgs = mocks.rpc.mock.calls[0][1];
    expect(rpcArgs).toMatchObject({
      p_feature: 'draw_quick',
      p_max: 2,
      p_ip_max: 40,
      p_period_days: 1,
    });
    expect(rpcArgs.p_subject_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rpcArgs.p_ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rpcArgs)).not.toContain('203.0.113.42');
  });

  it('returns 429 metadata when the server-side guest quota is exhausted', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        ok: false,
        err: 'guest_quota_exceeded',
        used: 2,
        max: 2,
        window_start: '2026-07-24T00:00:00.000Z',
      },
      error: null,
    });
    const { resolveAiAccess } = await import('../aiAccess.js');
    const access = await resolveAiAccess({ headers: {}, socket: {} }, response(), {
      feature: 'draw',
      action: 'draw_quick',
      allowGuest: true,
      guestFeature: 'draw_quick',
      guestMax: 2,
    });
    expect(access).toMatchObject({
      ok: false,
      status: 429,
      code: 'guest_quota_exceeded',
      quota: { remaining: 0, actorType: 'guest' },
    });
  });

  it('fails closed when the guest secret is missing', async () => {
    delete process.env.GUEST_QUOTA_SECRET;
    const { resolveAiAccess } = await import('../aiAccess.js');
    const access = await resolveAiAccess({ headers: {}, socket: {} }, response(), {
      feature: 'solve',
      action: 'solve',
      allowGuest: true,
      guestFeature: 'solve',
      guestMax: 1,
    });
    expect(access).toMatchObject({
      ok: false,
      status: 503,
      code: 'guest_quota_not_configured',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('uses the authenticated account gate instead of guest quota', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.checkAndConsume.mockResolvedValue({ ok: true, mode: 'free', used: 1, max: 3 });
    const { resolveAiAccess } = await import('../aiAccess.js');
    const access = await resolveAiAccess(
      { headers: { authorization: 'Bearer token' } },
      response(),
      { feature: 'draw', action: 'draw_quick', allowGuest: true, guestMax: 2 },
    );
    expect(access).toMatchObject({
      ok: true,
      actorType: 'account',
      userId: 'user-1',
      quota: { remaining: 2 },
    });
    expect(mocks.checkAndConsume).toHaveBeenCalledWith('user-1', 'draw', 'draw_quick');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
