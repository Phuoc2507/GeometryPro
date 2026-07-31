import { beforeEach, describe, expect, it, vi } from 'vitest';

// Kiểm tra helper ghi "bài lỗi": PHẢI await insert (đáng tin trên serverless),
// cắt bớt đề, KHÔNG lưu ảnh, và không bao giờ throw.
const mocks = vi.hoisted(() => ({
  insert: vi.fn(() => Promise.resolve({ error: null })),
  lastTable: null,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => {
      mocks.lastTable = table;
      return { insert: mocks.insert };
    },
  }),
}));

async function load() {
  vi.resetModules();
  return (await import('../brokenProblemLog.js')).logBrokenProblem;
}

describe('logBrokenProblem', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    mocks.insert.mockReset().mockResolvedValue({ error: null });
    mocks.lastTable = null;
  });

  it('insert vào problem_reports với đề đã cắt + prompt_len thật, KHÔNG lưu ảnh', async () => {
    const longPrompt = 'x'.repeat(6000);
    await load().then((fn) => fn({
      endpoint: 'analyze-geometry', userId: 'u1', mode: 'quick', model: 'low',
      prompt: longPrompt, imageProvided: true, errorMessage: 'boom', errorStage: 'exception',
      durationMs: 123.7,
    }));

    expect(mocks.lastTable).toBe('problem_reports');
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const row = mocks.insert.mock.calls[0][0][0];
    expect(row.endpoint).toBe('analyze-geometry');
    expect(row.prompt.length).toBe(5000);        // cắt bớt khi lưu
    expect(row.prompt_len).toBe(6000);            // độ dài thật
    expect(row.image_provided).toBe(true);
    expect(row.duration_ms).toBe(124);            // làm tròn
    expect('image' in row).toBe(false);           // KHÔNG có trường ảnh
    expect('imageBase64' in row).toBe(false);
  });

  it('bỏ qua khi thiếu endpoint (không insert)', async () => {
    await load().then((fn) => fn({ prompt: 'abc' }));
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('không throw kể cả khi insert lỗi', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'db down' } });
    await expect(load().then((fn) => fn({ endpoint: 'solve', prompt: 'p' }))).resolves.toBeUndefined();
  });
});
