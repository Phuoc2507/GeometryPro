import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  solveProblem: vi.fn(),
}));

vi.mock('../aiAccess.js', () => ({
  resolveAiAccess: mocks.resolve,
  accessError: (res, access) => res.status(access.status).json({ code: access.code }),
  withQuota: (payload, access) => ({ ...payload, quota: access.quota }),
}));
vi.mock('../kernel-bridge/solveWithKernel.js', () => ({
  solveProblem: mocks.solveProblem,
  solvePlan: vi.fn(() => ({ ok: true })),
}));
vi.mock('../credits.js', () => ({ refund: vi.fn() }));

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('analyze-geometry-v2 access control', () => {
  beforeEach(() => {
    mocks.resolve.mockReset();
    mocks.solveProblem.mockReset();
  });

  it('does not allow a direct V2 problem request to bypass the shared gate', async () => {
    mocks.resolve.mockResolvedValue({
      ok: false,
      status: 429,
      code: 'guest_quota_exceeded',
    });
    const { default: handler } = await import('../../analyze-geometry-v2.js');
    const res = response();
    await handler({ method: 'POST', body: { problem: 'Hình chóp S.ABCD' } }, res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ code: 'guest_quota_exceeded' });
    expect(mocks.solveProblem).not.toHaveBeenCalled();
  });

  it('disables the raw plan entrypoint in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { default: handler } = await import('../../analyze-geometry-v2.js');
      const res = response();
      await handler({ method: 'POST', body: { plan: { version: 1 } } }, res);
      expect(res.statusCode).toBe(404);
      expect(mocks.resolve).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
