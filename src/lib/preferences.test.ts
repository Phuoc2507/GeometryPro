import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AppPreferences,
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  setPreference,
} from './preferences';

// Vitest env = 'node' → không có localStorage native. Tiêm một fake in-memory.
function makeFakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

describe('preferences', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = makeFakeStorage();
  });
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it('trả DEFAULT_PREFERENCES khi chưa có gì lưu', () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trip: save rồi load ra đúng object', () => {
    const custom: AppPreferences = {
      ...DEFAULT_PREFERENCES,
      showCoordinateGrid: false,
      autoRotate: true,
    };
    savePreferences(custom);
    expect(loadPreferences()).toEqual(custom);
  });

  it('hợp nhất default khi thiếu key', () => {
    globalThis.localStorage.setItem('geo3d:prefs', JSON.stringify({ showPoints: false }));
    const loaded = loadPreferences();
    expect(loaded.showPoints).toBe(false);
    expect(loaded.showCoordinateGrid).toBe(DEFAULT_PREFERENCES.showCoordinateGrid);
    expect(loaded.autoRotate).toBe(DEFAULT_PREFERENCES.autoRotate);
  });

  it('fallback về default khi JSON hỏng', () => {
    globalThis.localStorage.setItem('geo3d:prefs', '{not valid json');
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('bỏ qua giá trị sai kiểu, giữ default cho khoá đó', () => {
    globalThis.localStorage.setItem('geo3d:prefs', JSON.stringify({ showPoints: 'yes', autoRotate: true }));
    const loaded = loadPreferences();
    expect(loaded.showPoints).toBe(DEFAULT_PREFERENCES.showPoints); // 'yes' bị bỏ
    expect(loaded.autoRotate).toBe(true); // boolean hợp lệ được nhận
  });

  it('setPreference chỉ đổi một khoá và trả bản mới', () => {
    const next = setPreference('autoColorPlanes', true);
    expect(next.autoColorPlanes).toBe(true);
    expect(next.showPoints).toBe(DEFAULT_PREFERENCES.showPoints);
    expect(loadPreferences().autoColorPlanes).toBe(true);
  });

  it('không ném khi localStorage vắng mặt (SSR/node)', () => {
    delete (globalThis as any).localStorage;
    expect(() => loadPreferences()).not.toThrow();
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(() => savePreferences(DEFAULT_PREFERENCES)).not.toThrow();
  });
});
