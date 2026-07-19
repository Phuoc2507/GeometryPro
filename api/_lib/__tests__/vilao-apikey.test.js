import { describe, it, expect } from 'vitest';
import { resolveApiKey } from '../vilao.js';

describe('callVilao per-call apiKey', () => {
  it('ưu tiên opts.apiKey; fallback ENV VILAO_API_KEY', () => {
    expect(resolveApiKey({ apiKey: 'sk-call' }, 'sk-env')).toBe('sk-call');
    expect(resolveApiKey({}, 'sk-env')).toBe('sk-env');
  });
  it('ném khi không có key nào', () => {
    expect(() => resolveApiKey({}, undefined)).toThrow(/API key/);
  });
});
