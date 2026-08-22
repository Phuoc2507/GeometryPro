import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock tầng engine + hạ tầng để kiểm ĐÚNG hành vi ROUTE (định tuyến môn, auth D22, dry-run).
const mocks = vi.hoisted(() => ({
  solvePhysicsProblem: vi.fn(),
  solveChemProblem: vi.fn(),
  solvePhysicsPlan: vi.fn(() => ({ subject: 'physics', ok: true, answers: [] })),
  solveChemPlan: vi.fn(() => ({ subject: 'chem', ok: true, answers: [] })),
  getUser: vi.fn(),
  profile: null,       // hàng profiles getAccount đọc (null ⇒ getAccount trả tier 'free')
  profileError: null,  // lỗi đọc profiles (để test fail-open)
}));

vi.mock('../kernel-bridge/solveSubject.js', () => ({
  solvePhysicsProblem: mocks.solvePhysicsProblem,
  solveChemProblem: mocks.solveChemProblem,
  solvePhysicsPlan: mocks.solvePhysicsPlan,
  solveChemPlan: mocks.solveChemPlan,
}));
// Mock supabase: auth.getUser + from('profiles')…maybeSingle (getAccount trong resolveAuthNoCharge dùng).
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: mocks.profile, error: mocks.profileError }) }),
      }),
    }),
  }),
}));
vi.mock('../sentry.js', () => ({
  withSentry: (handler) => handler,          // passthrough để test gọi thẳng handler
  reportServerError: vi.fn(),
}));
vi.mock('../brokenProblemLog.js', () => ({ logBrokenProblem: vi.fn() }));

// classifySubject dùng BẢN THẬT (tất định) — nên đề dưới đây là đề Lý/Hóa/Hình thật.
const PHYS = 'Một ô tô đang chạy với tốc độ 54 km/h thì hãm phanh, chuyển động thẳng chậm dần đều với gia tốc 3 m/s². Tính vận tốc sau 3 s.';
const CHEM = 'Hòa tan hoàn toàn 5,4 g nhôm trong dung dịch HCl dư. Tính thể tích khí H2 ở đktc và khối lượng muối.';
const GEO = 'Cho hình chóp S.ABCD có đáy là hình vuông cạnh 2, SA vuông góc mặt đáy. Tính thể tích khối chóp và khoảng cách từ A đến mặt phẳng (SCD).';

function response() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function loadHandler() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.local';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  const { default: handler } = await import('../../analyze-problem.js');
  return handler;
}

describe('analyze-problem route', () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m?.mockReset?.();
    mocks.profile = null;
    mocks.profileError = null;
    mocks.solvePhysicsPlan.mockReturnValue({ subject: 'physics', ok: true, answers: [] });
    mocks.solveChemPlan.mockReturnValue({ subject: 'chem', ok: true, answers: [] });
  });

  it('đề Toán → delegate:true, KHÔNG cần auth, KHÔNG gọi engine', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { problem: GEO } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ subject: 'geometry', delegate: true, detected: 'geometry' });
    expect(mocks.solvePhysicsProblem).not.toHaveBeenCalled();
    expect(mocks.solveChemProblem).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('đề Lý KHÔNG đăng nhập → 401 (D22 yêu cầu auth), KHÔNG gọi engine', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { problem: PHYS } }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('auth_required');
    expect(mocks.solvePhysicsProblem).not.toHaveBeenCalled();
  });

  it('đề Lý có token hợp lệ → gọi engine Lý, trả mode:engine (KHÔNG trừ quota)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mocks.solvePhysicsProblem.mockResolvedValue({ subject: 'physics', ok: true, answers: [{ text: '6 m/s' }], plan: {} });
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { problem: PHYS } }, res);
    expect(mocks.getUser).toHaveBeenCalledWith('tok');
    expect(mocks.solvePhysicsProblem).toHaveBeenCalledOnce();
    expect(res.body).toMatchObject({ mode: 'engine', subject: 'physics', ok: true });
  });

  it('đề Hóa token hỏng → 401 invalid_token', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { problem: CHEM } }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('invalid_token');
    expect(mocks.solveChemProblem).not.toHaveBeenCalled();
  });

  it('tài khoản bị khóa (tier lạ ⇒ entitlement blocked) → 403, KHÔNG gọi engine (D22: không trừ credit)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u-blocked' } }, error: null });
    mocks.profile = { plan_tier: 'banned', plan_code: 'banned', plan_expires_at: '2099-01-01T00:00:00Z', plan_credits: 0, purchased_credits: 0 };
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { problem: PHYS } }, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('account_blocked');
    expect(mocks.solvePhysicsProblem).not.toHaveBeenCalled();
  });

  it('gói HẾT HẠN → hạ về free → VẪN dùng được (đúng D22 miễn phí cho người đăng nhập)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u-expired' } }, error: null });
    mocks.profile = { plan_tier: 'teacher', plan_code: 'teacher', plan_expires_at: '2000-01-01T00:00:00Z', plan_credits: 0, purchased_credits: 0 };
    mocks.solvePhysicsProblem.mockResolvedValue({ subject: 'physics', ok: true, answers: [{ text: '6 m/s' }], plan: {} });
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { problem: PHYS } }, res);
    expect(mocks.solvePhysicsProblem).toHaveBeenCalledOnce();
    expect(res.body).toMatchObject({ mode: 'engine', ok: true });
  });

  it('lỗi đọc profiles → fail-OPEN (không chặn nhầm người dùng hợp lệ)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u-dberr' } }, error: null });
    mocks.profileError = { message: 'db down' }; // getAccount trả null ⇒ bỏ qua block-check
    mocks.solvePhysicsProblem.mockResolvedValue({ subject: 'physics', ok: true, answers: [], plan: {} });
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { problem: PHYS } }, res);
    expect(mocks.solvePhysicsProblem).toHaveBeenCalledOnce();
  });

  it('rate-limit thô: quá 30 req/phút/userId → 429 (chống đốt tiền LLM, D29)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u-rl' } }, error: null });
    mocks.solvePhysicsProblem.mockResolvedValue({ subject: 'physics', ok: true, answers: [], plan: {} });
    const handler = await loadHandler();
    let lastStatus = 200;
    let sawRateLimit = false;
    for (let i = 0; i < 35; i += 1) {
      const res = response();
      await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { problem: PHYS } }, res);
      lastStatus = res.statusCode;
      if (res.statusCode === 429) { sawRateLimit = true; break; }
    }
    expect(sawRateLimit).toBe(true);
    expect(lastStatus).toBe(429);
  });

  it('map error.message ở catch cuối → thông điệp chung (không lộ nội bộ)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u-err' } }, error: null });
    mocks.solvePhysicsProblem.mockRejectedValue(new Error('SECRET internal stacktrace detail'));
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { problem: PHYS } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Lỗi xử lý, vui lòng thử lại');
    expect(res.body.error).not.toMatch(/SECRET/);
  });

  it('dry-run { plan, subject } chạy engine ở dev; 404 ở production', async () => {
    const handler = await loadHandler();
    // dev
    const res1 = response();
    await handler({ method: 'POST', headers: {}, body: { plan: { ops: [] }, subject: 'chem' } }, res1);
    expect(res1.body).toMatchObject({ mode: 'dry-run', subject: 'chem' });
    expect(mocks.solveChemPlan).toHaveBeenCalledOnce();
    // production
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res2 = response();
      await handler({ method: 'POST', headers: {}, body: { plan: { ops: [] }, subject: 'chem' } }, res2);
      expect(res2.statusCode).toBe(404);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('method khác POST → 405', async () => {
    const handler = await loadHandler();
    const res = response();
    await handler({ method: 'GET', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(405);
  });
});
