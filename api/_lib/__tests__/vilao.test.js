import { describe, it, expect } from 'vitest';
import { isNetworkError } from '../vilao.js';

describe('isNetworkError — nhận diện lỗi tạm để RETRY', () => {
  // Bug đã sửa: đồng hồ CỨNG ném Error('Request timed out'). Chuỗi 'timed out' (có dấu cách)
  // KHÔNG chứa 'timeout' → trước đây isNetworkError trả false → callVilao không retry khi timeout
  // → 1 spike độ trễ của model là hỏng cả lượt Advance. Test này khoá lại hành vi đúng.
  it('nhận diện "Request timed out" (thông điệp của đồng hồ cứng) là lỗi mạng', () => {
    expect(isNetworkError(new Error('Request timed out'))).toBe(true);
  });

  it('vẫn nhận diện các biến thể timeout/econnreset/network', () => {
    expect(isNetworkError(new Error('socket timeout'))).toBe(true);
    expect(isNetworkError(new Error('ECONNRESET'))).toBe(true);
    expect(isNetworkError(new Error('network error'))).toBe(true);
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
  });

  // Khi đồng hồ cứng hủy request GIỮA lúc đọc body (model gửi header sớm rồi nhỏ giọt),
  // for-await ném Error('aborted') code ECONNRESET — message KHÔNG có 'timed out'. Phải soi cả .code.
  it('nhận diện abort giữa stream: Error("aborted") code ECONNRESET', () => {
    const err = new Error('aborted');
    err.code = 'ECONNRESET';
    expect(isNetworkError(err)).toBe(true);
  });

  it('nhận diện qua .code kể cả khi message trống', () => {
    const err = new Error('');
    err.code = 'ETIMEDOUT';
    expect(isNetworkError(err)).toBe(true);
  });

  it('KHÔNG coi lỗi nghiệp vụ (vd 403/JSON hỏng) là lỗi mạng', () => {
    expect(isNetworkError(new Error('Vilao API error: 403 FORBIDDEN'))).toBe(false);
    expect(isNetworkError(new Error('Failed to parse Vilao response'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
