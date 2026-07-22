import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../vilao.js', () => ({ callVilao: vi.fn() }));
import { callVilao } from '../../vilao.js';
import { transcribeImage } from '../transcribeImage.js';

describe('transcribeImage (Pass -1: chép đề ảnh → chữ)', () => {
  beforeEach(() => callVilao.mockReset());

  it('gọi callVilao với ẢNH + model vision, trả về đề đã trim', async () => {
    callVilao.mockResolvedValue('  Cho chóp S.ABCD SA=2a. a) Thể tích. b) M trung điểm SC.  \n');
    const r = await transcribeImage('data:image/jpeg;base64,ZZZ');
    expect(callVilao).toHaveBeenCalledTimes(1);
    const [sys, user, opts] = callVilao.mock.calls[0];
    expect(typeof sys).toBe('string');                 // TRANSCRIBE_PROMPT (system)
    expect(typeof user).toBe('string');                // "Chép đề trong ảnh đính kèm."
    expect(opts.imageBase64).toBe('data:image/jpeg;base64,ZZZ');   // ĐÚNG opt ảnh của callVilao
    expect(opts.model).toBe('ram/gemini-3.5-flash-low');           // model vision rẻ
    expect(r).toBe('Cho chóp S.ABCD SA=2a. a) Thể tích. b) M trung điểm SC.');  // đã trim
  });

  it('callVilao trả null → trả về "" (không ném)', async () => {
    callVilao.mockResolvedValue(null);
    expect(await transcribeImage('data:img')).toBe('');
  });

  it('opts.transcribeModel/transcribeApiKey ghi đè model+key mặc định', async () => {
    callVilao.mockResolvedValue('đề x');
    await transcribeImage('data:img', { transcribeModel: 'ram/other', transcribeApiKey: 'KEY123' });
    const [, , opts] = callVilao.mock.calls[0];
    expect(opts.model).toBe('ram/other');
    expect(opts.apiKey).toBe('KEY123');
  });
});
