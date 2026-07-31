import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cổng bảo mật của endpoint /api/admin: chỉ cho admin đã xác thực đi qua.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileResult: { data: { role: 'user' }, error: null },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => mocks.profileResult,
        }),
      }),
    }),
  }),
}));

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function loadHandler() {
  vi.resetModules();
  const { default: handler } = await import('../../admin.js');
  return handler;
}

describe('admin endpoint — cổng bảo mật', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    mocks.profileResult = { data: { role: 'user' }, error: null };
  });

  it('từ chối method khác POST', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'GET', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('từ chối khi thiếu Bearer token', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { action: 'list-users' } }, res);
    expect(res.statusCode).toBe(401);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('từ chối user KHÔNG phải admin (403)', async () => {
    mocks.profileResult = { data: { role: 'user' }, error: null };
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer good' }, body: { action: 'list-users' } }, res);
    expect(res.statusCode).toBe(403);
  });

  it('cho admin qua nhưng chặn action không hợp lệ (400)', async () => {
    mocks.profileResult = { data: { role: 'admin' }, error: null };
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer good' }, body: { action: 'khong-ton-tai' } }, res);
    expect(res.statusCode).toBe(400);
  });
});
