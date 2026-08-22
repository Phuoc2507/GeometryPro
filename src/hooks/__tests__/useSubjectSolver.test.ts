// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// Test useSubjectSolver: gắn Bearer token (như GeometryContext), set result khi 200 (kể cả ok:false),
// set error kind:'auth' khi 401, kind:'network' khi fetch ném. Mock supabase.getSession + global fetch.
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

const getSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a) } },
}));

import { useSubjectSolver } from '../useSubjectSolver';

function mockFetchOnce(opts: { ok: boolean; status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: opts.ok,
    status: opts.status,
    text: async () => (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('useSubjectSolver', () => {
  it('200 physics ok:true → set result, gắn Authorization: Bearer <token>', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { subject: 'physics', ok: true, answers: [{ text: '2 s' }] } });
    const { result } = renderHook(() => useSubjectSolver());

    await act(async () => { await result.current.solve('Ném ngang một vật...'); });

    expect(result.current.result?.subject).toBe('physics');
    expect(result.current.result?.ok).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);

    // Đã gọi đúng route + gắn token.
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/analyze-problem');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
    expect(JSON.parse(init.body as string)).toEqual({ problem: 'Ném ngang một vật...' });
  });

  it('200 ok:false (ngoài phạm vi) → vẫn set RESULT, KHÔNG coi là error', async () => {
    mockFetchOnce({ ok: true, status: 200, body: { subject: 'physics', ok: false, abstained: true, answers: [], errors: [{ message: 'thiếu số liệu' }] } });
    const { result } = renderHook(() => useSubjectSolver());
    await act(async () => { await result.current.solve('đề thiếu dữ kiện'); });
    expect(result.current.result?.ok).toBe(false);
    expect(result.current.result?.abstained).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('401 → error kind:auth, result null', async () => {
    mockFetchOnce({ ok: false, status: 401, body: { error: 'Vui lòng đăng nhập', code: 'auth_required' } });
    const { result } = renderHook(() => useSubjectSolver());
    await act(async () => { await result.current.solve('Hòa tan nhôm trong HCl...'); });
    expect(result.current.error?.kind).toBe('auth');
    expect(result.current.error?.status).toBe(401);
    expect(result.current.result).toBeNull();
  });

  it('không có token → không gắn Authorization', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { subject: 'chem', ok: true } });
    const { result } = renderHook(() => useSubjectSolver());
    await act(async () => { await result.current.solve('đề hóa'); });
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('fetch ném → error kind:network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { result } = renderHook(() => useSubjectSolver());
    await act(async () => { await result.current.solve('đề bất kỳ'); });
    expect(result.current.error?.kind).toBe('network');
    expect(result.current.error?.message).toContain('offline');
  });

  it('đề rỗng → không gọi fetch, báo lỗi nhẹ', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    const { result } = renderHook(() => useSubjectSolver());
    await act(async () => { await result.current.solve('   '); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });
});
