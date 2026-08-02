import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateGolden, loadGoldenDir } from '../loadGolden.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('validateGolden', () => {
  it('ok với ca đủ id/plan/expect', () => {
    expect(validateGolden({ id: 'a', plan: {}, expect: { ok: true, answers: [] } }).ok).toBe(true);
  });
  it('lỗi khi thiếu plan', () => {
    const v = validateGolden({ id: 'a', expect: { ok: true, answers: [] } });
    expect(v.ok).toBe(false);
    expect(v.error).toContain('plan');
  });
  it('lỗi khi ok:true nhưng answers không phải mảng', () => {
    expect(validateGolden({ id: 'a', plan: {}, expect: { ok: true } }).ok).toBe(false);
  });
});

describe('loadGoldenDir', () => {
  it('nạp mọi *.json hợp lệ trong thư mục', () => {
    const cases = loadGoldenDir(join(here, 'fixtures', 'good'));
    expect(cases.map((c) => c.id)).toEqual(['fx-ok']);
  });
  it('NÉM khi có ca hỏng schema (không chạy mù)', () => {
    expect(() => loadGoldenDir(join(here, 'fixtures', 'bad'))).toThrow(/thiếu plan|missing-plan/);
  });
});
