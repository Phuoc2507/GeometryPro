import { beforeEach, describe, expect, it, vi } from 'vitest';

// Kiểm cổng TRỪ credit/quota (credits.checkAndConsume) — điểm quyết định tính tiền.
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  ruleFor: vi.fn(),
  creditCostFor: vi.fn(),
  profile: { plan_code: 'pro_1m', plan_tier: 'pro', plan_expires_at: '2999-01-01T00:00:00Z', plan_credits: 10, purchased_credits: 5 },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.profile, error: null }) }) }),
    }),
  }),
}));

vi.mock('../entitlements.js', () => ({
  ruleFor: mocks.ruleFor,
  creditCostFor: mocks.creditCostFor,
}));

async function loadCredits() {
  vi.resetModules();
  return import('../credits.js');
}

describe('credits.checkAndConsume — charge decision', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    mocks.rpc.mockReset();
    mocks.ruleFor.mockReset();
    mocks.creditCostFor.mockReset().mockReturnValue(1);
  });

  it('blocks a feature the plan cannot use (no charge)', async () => {
    mocks.ruleFor.mockReturnValue({ mode: 'blocked' });
    const { checkAndConsume } = await loadCredits();
    const r = await checkAndConsume('u1', 'draw', 'draw_advance');
    expect(r).toMatchObject({ ok: false, reason: 'blocked', cost: 0 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('passes unlimited features through for free', async () => {
    mocks.ruleFor.mockReturnValue({ mode: 'unlimited' });
    const { checkAndConsume } = await loadCredits();
    const r = await checkAndConsume('u1', 'draw', 'draw_quick');
    expect(r).toMatchObject({ ok: true, mode: 'unlimited', cost: 0 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('consumes a free quota slot atomically and reports usage', async () => {
    mocks.ruleFor.mockReturnValue({ mode: 'quota', max: 3, periodDays: 1 });
    mocks.rpc.mockResolvedValue({ data: { ok: true, used: 1, max: 3 }, error: null });
    const { checkAndConsume } = await loadCredits();
    const r = await checkAndConsume('u1', 'draw', 'draw_quick');
    expect(r).toMatchObject({ ok: true, mode: 'quota', used: 1, max: 3 });
    expect(mocks.rpc).toHaveBeenCalledWith('consume_quota', expect.objectContaining({ p_user_id: 'u1', p_max: 3 }));
  });

  it('rejects when the free quota is exhausted (no credit fallback)', async () => {
    mocks.ruleFor.mockReturnValue({ mode: 'quota', max: 3, periodDays: 1 });
    mocks.rpc.mockResolvedValue({ data: { ok: false, used: 3, max: 3 }, error: null });
    const { checkAndConsume } = await loadCredits();
    const r = await checkAndConsume('u1', 'draw', 'draw_quick');
    expect(r).toMatchObject({ ok: false, reason: 'quota_exceeded' });
  });

  it('spends credit at the priced cost on success', async () => {
    mocks.ruleFor.mockReturnValue({ mode: 'credit' });
    mocks.creditCostFor.mockReturnValue(2);
    mocks.rpc.mockResolvedValue({ data: { ok: true, remaining: 13 }, error: null });
    const { checkAndConsume } = await loadCredits();
    const r = await checkAndConsume('u1', 'draw', 'draw_detailed');
    expect(r).toMatchObject({ ok: true, mode: 'credit', cost: 2, remaining: 13 });
    expect(mocks.rpc).toHaveBeenCalledWith('spend_credits', expect.objectContaining({ p_cost: 2, p_reason: 'draw_detailed' }));
  });

  it('reports insufficient balance without charging', async () => {
    mocks.ruleFor.mockReturnValue({ mode: 'credit' });
    mocks.creditCostFor.mockReturnValue(5);
    mocks.rpc.mockResolvedValue({ data: { ok: false, err: 'insufficient', remaining: 1 }, error: null });
    const { checkAndConsume } = await loadCredits();
    const r = await checkAndConsume('u1', 'draw', 'draw_detailed');
    expect(r).toMatchObject({ ok: false, reason: 'insufficient', cost: 5, remaining: 1 });
  });

  it('fails closed when the credit system is not configured', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { checkAndConsume } = await loadCredits();
    const r = await checkAndConsume('u1', 'draw', 'draw_quick');
    expect(r).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
