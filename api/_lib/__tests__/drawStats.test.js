import { beforeEach, describe, expect, it, vi } from 'vitest';

// recordDrawStat: gọi RPC bump_draw_stat đúng tham số, await, không throw.
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(() => Promise.resolve({ error: null })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));

async function load() {
  vi.resetModules();
  return (await import('../drawStats.js')).recordDrawStat;
}

describe('recordDrawStat', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    mocks.rpc.mockReset().mockResolvedValue({ error: null });
  });

  it('gọi bump_draw_stat với endpoint + kind', async () => {
    await load().then((fn) => fn('analyze-geometry', 'attempt'));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('bump_draw_stat', { p_endpoint: 'analyze-geometry', p_kind: 'attempt' });
  });

  it('bỏ qua khi thiếu endpoint', async () => {
    await load().then((fn) => fn('', 'fail'));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('không throw khi RPC lỗi', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'no function' } });
    await expect(load().then((fn) => fn('analyze-geometry', 'fail'))).resolves.toBeUndefined();
  });
});
