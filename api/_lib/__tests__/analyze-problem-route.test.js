import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock tầng engine + hạ tầng để kiểm ĐÚNG hành vi ROUTE (định tuyến môn, auth D22, dry-run).
const mocks = vi.hoisted(() => ({
  solvePhysicsProblem: vi.fn(),
  solveChemProblem: vi.fn(),
  solvePhysicsPlan: vi.fn(() => ({ subject: 'physics', ok: true, answers: [] })),
  solveChemPlan: vi.fn(() => ({ subject: 'chem', ok: true, answers: [] })),
  getUser: vi.fn(),
}));

vi.mock('../kernel-bridge/solveSubject.js', () => ({
  solvePhysicsProblem: mocks.solvePhysicsProblem,
  solveChemProblem: mocks.solveChemProblem,
  solvePhysicsPlan: mocks.solvePhysicsPlan,
  solveChemPlan: mocks.solveChemPlan,
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser } }),
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
    for (const m of Object.values(mocks)) m.mockReset?.();
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
