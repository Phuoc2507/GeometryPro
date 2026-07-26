import { describe, it, expect } from 'vitest';
import { authUrlWithRedirect, sanitizeRedirect } from '@/lib/authRedirect';

describe('authUrlWithRedirect', () => {
  it('encodes the destination path into ?redirect=', () => {
    expect(authUrlWithRedirect('/saved')).toBe('/auth?redirect=%2Fsaved');
  });

  it('encodes paths that carry a query string', () => {
    expect(authUrlWithRedirect('/teacher?id=abc')).toBe('/auth?redirect=%2Fteacher%3Fid%3Dabc');
  });
});

describe('sanitizeRedirect', () => {
  it('keeps a plain internal path', () => {
    expect(sanitizeRedirect('/saved')).toBe('/saved');
    expect(sanitizeRedirect('/teacher?id=abc')).toBe('/teacher?id=abc');
  });

  it('falls back to / for empty / null input', () => {
    expect(sanitizeRedirect(null)).toBe('/');
    expect(sanitizeRedirect(undefined)).toBe('/');
    expect(sanitizeRedirect('')).toBe('/');
  });

  it('blocks open-redirect targets (protocol-relative and absolute URLs)', () => {
    expect(sanitizeRedirect('//evil.com')).toBe('/');
    expect(sanitizeRedirect('https://evil.com')).toBe('/');
    expect(sanitizeRedirect('http://evil.com')).toBe('/');
    expect(sanitizeRedirect('javascript:alert(1)')).toBe('/');
  });

  it('blocks looping back to the auth page itself', () => {
    expect(sanitizeRedirect('/auth')).toBe('/');
    expect(sanitizeRedirect('/auth?redirect=%2Fsaved')).toBe('/');
    expect(sanitizeRedirect('/auth/anything')).toBe('/');
  });
});
