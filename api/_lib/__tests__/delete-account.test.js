import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bảng bị xoá và thứ tự an toàn khoá ngoại (con trước, hồ sơ sau).
const EXPECTED_ORDER = ['saved_geometries', 'credit_ledger', 'usage_counters', 'orders', 'profiles'];

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  deleteUser: vi.fn(),
  deleted: [],            // ghi lại (table, col, val) mỗi lần del(...).eq(...)
  failOnTable: null,      // đặt tên bảng để mô phỏng lỗi xoá dữ liệu
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
      admin: { deleteUser: mocks.deleteUser },
    },
    from: (table) => ({
      delete: () => ({
        eq: (col, val) => {
          mocks.deleted.push({ table, col, val });
          return { error: mocks.failOnTable === table ? { message: 'boom' } : null };
        },
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
  const { default: handler } = await import('../../delete-account.js');
  return handler;
}

const OK_REQ = {
  method: 'POST',
  headers: { authorization: 'Bearer good-token' },
  body: { confirm: true },
};

describe('delete-account endpoint', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mocks.deleteUser.mockReset().mockResolvedValue({ error: null });
    mocks.deleted.length = 0;
    mocks.failOnTable = null;
  });

  it('rejects non-POST', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'GET', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('rejects a missing Bearer token', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { confirm: true } }, res);
    expect(res.statusCode).toBe(401);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('rejects an invalid session token', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const handler = await loadHandler();
    const res = response();
    await handler(OK_REQ, res);
    expect(res.statusCode).toBe(401);
    expect(mocks.deleted).toHaveLength(0);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('requires an explicit confirm flag', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer good-token' }, body: {} }, res);
    expect(res.statusCode).toBe(400);
    expect(mocks.deleted).toHaveLength(0);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('uses the JWT user id, not anything from the body', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ ...OK_REQ, body: { confirm: true, user_id: 'victim' } }, res);
    expect(res.statusCode).toBe(200);
    // Mọi delete phải nhắm vào u1 (từ token), tuyệt đối không phải 'victim'.
    expect(mocks.deleted.every((d) => d.col === 'user_id' && d.val === 'u1')).toBe(true);
    expect(mocks.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('wipes all personal tables in FK-safe order then deletes the auth user', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler(OK_REQ, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mocks.deleted.map((d) => d.table)).toEqual(EXPECTED_ORDER);
    expect(mocks.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('aborts BEFORE deleting the auth user when a data wipe fails', async () => {
    mocks.failOnTable = 'usage_counters';
    const handler = await loadHandler();
    const res = response();
    await handler(OK_REQ, res);
    expect(res.statusCode).toBe(500);
    // Đã thử tới bảng lỗi rồi dừng — KHÔNG chạm tới orders/profiles và KHÔNG xoá auth user.
    expect(mocks.deleted.map((d) => d.table)).toEqual(['saved_geometries', 'credit_ledger', 'usage_counters']);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(res.body.error).toMatch(/usage_counters/);
  });

  it('surfaces a failure if the auth-user delete itself fails', async () => {
    mocks.deleteUser.mockResolvedValue({ error: { message: 'auth down' } });
    const handler = await loadHandler();
    const res = response();
    await handler(OK_REQ, res);
    expect(res.statusCode).toBe(500);
    expect(mocks.deleted.map((d) => d.table)).toEqual(EXPECTED_ORDER);
  });
});
