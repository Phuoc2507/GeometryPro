// api/_lib/kernel/compute/__tests__/answer.test.ts
import { describe, it, expect } from 'vitest';
import { firstDegenerate, certifyDistance, recognizeDegree } from '../answer';
import { rat, fromExact, makeExact, num } from '../../scalar';
import { ratVec } from '../../vec3s';

describe('firstDegenerate', () => {
  it('phát hiện mặt phẳng pháp tuyến 0', () => {
    const plane = { kind: 'plane' as const, n: ratVec(0n, 0n, 0n), d: rat(5n) };
    expect(firstDegenerate([plane])).toMatch(/plane/i);
  });
  it('phát hiện đường chỉ phương 0', () => {
    const line = { kind: 'line' as const, p: ratVec(0n, 0n, 0n), dir: ratVec(0n, 0n, 0n) };
    expect(firstDegenerate([line])).toMatch(/line/i);
  });
  it('mặt cầu R²≤0', () => {
    const s = { kind: 'sphere' as const, center: ratVec(0n, 0n, 0n), r2: rat(-1n) };
    expect(firstDegenerate([s])).toMatch(/sphere/i);
  });
  it('entity hợp lệ ⇒ null', () => {
    const plane = { kind: 'plane' as const, n: ratVec(0n, 0n, 1n), d: rat(0n) };
    expect(firstDegenerate([plane])).toBeNull();
  });
});

describe('certifyDistance — self-certificate', () => {
  it('giữ exact khi khớp float độc lập', () => {
    const a = certifyDistance(fromExact(makeExact(1n, 1n, 3)), Math.sqrt(3));
    expect(a.exact).toEqual(makeExact(1n, 1n, 3));
    expect(a.text).toBe('√3');
    expect(a.approximate).toBe(false);
  });
  it('bỏ exact khi lệch float (nghi ngờ lỗi số học) → trả float', () => {
    const a = certifyDistance(fromExact(makeExact(1n, 1n, 3)), 999);
    expect(a.exact).toBeNull();
    expect(a.approximate).toBe(true);
    expect(a.approx).toBe(999);
  });
  it('không có exact ⇒ dùng float độc lập', () => {
    const a = certifyDistance(num(1.234), 1.234);
    expect(a.exact).toBeNull();
    expect(a.approximate).toBe(true);
  });
});

describe('recognizeDegree', () => {
  it('nhận diện góc đẹp', () => {
    expect(recognizeDegree(45)).toBe(45);
    expect(recognizeDegree(60.0000001)).toBe(60);
    expect(recognizeDegree(54.7356)).toBeNull();
  });
});
