import { describe, expect, it, vi } from 'vitest';
import { buildGoldenResponse, findGolden } from '../goldenStore.js';

describe('buildGoldenResponse', () => {
  it('dựng payload đúng shape finalPayload (step1/step2) với confidence=1, engine=golden', () => {
    const geometry = {
      points: [{ id: 'A', x: 0, y: 0, z: 0 }, { id: 'B', x: 1, y: 0, z: 0 }],
      lines: [], tags: ['Chóp'], detailLevel: 'static',
    };
    const r = buildGoldenResponse({ prompt: 'Cho hình chóp', geometry, mode: 'detailed' });
    expect(r.step2.geometry).toBe(geometry);
    expect(r.step2.confidence).toBe(1);
    expect(r.step2.constraint_violations).toEqual([]);
    expect(r.step1.text).toBe('Cho hình chóp');
    expect(r.step1.points_needed).toEqual(['A', 'B']);
    expect(r.step1.tags).toEqual(['Chóp']);
    expect(r.engine).toBe('golden');
    expect(r.mode).toBe('detailed');
  });

  it('không có tags → gắn nhãn ["golden"]; mode mặc định "detailed"', () => {
    const r = buildGoldenResponse({ prompt: 'p', geometry: { points: [{ id: 'A' }] } });
    expect(r.step1.tags).toEqual(['golden']);
    expect(r.mode).toBe('detailed');
  });
});

function clientReturning(result) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(result),
        }),
      }),
    }),
  };
}

describe('findGolden', () => {
  const goodResponse = { step2: { geometry: { points: [{ id: 'A' }] } } };

  it('client null → null (fail-safe)', async () => {
    expect(await findGolden(null, 'abc')).toBeNull();
  });

  it('đề rỗng → null (không khớp bừa)', async () => {
    const client = clientReturning({ data: { id: '1', response: goodResponse }, error: null });
    expect(await findGolden(client, '   ')).toBeNull();
  });

  it('trả golden khi có row hợp lệ', async () => {
    const client = clientReturning({ data: { id: 'g1', response: goodResponse }, error: null });
    const hit = await findGolden(client, 'Cho hình chóp');
    expect(hit).not.toBeNull();
    expect(hit.id).toBe('g1');
    expect(hit.response).toBe(goodResponse);
  });

  it('response không có điểm → null (frontend không vẽ được)', async () => {
    const client = clientReturning({ data: { id: 'g1', response: { step2: { geometry: { points: [] } } } }, error: null });
    expect(await findGolden(client, 'p')).toBeNull();
  });

  it('DB lỗi → null, KHÔNG throw', async () => {
    const client = clientReturning({ data: null, error: { message: 'db down' } });
    expect(await findGolden(client, 'p')).toBeNull();
  });

  it('nuốt ngoại lệ khi client ném ra', async () => {
    const client = { from: () => { throw new Error('boom'); } };
    expect(await findGolden(client, 'p')).toBeNull();
  });
});
