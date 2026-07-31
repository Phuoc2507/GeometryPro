import { describe, it, expect } from 'vitest';
import { ENGINE_FIGURE_VERSION, isStaleEngineCache } from '../engineCacheVersion.js';

describe('isStaleEngineCache — bỏ qua cache engine từ phiên bản hình cũ', () => {
  it('payload engine CŨ (không có figureVersion) ⇒ coi là cũ (bypass)', () => {
    // Đây chính là payload "đống rơm" đã cache TRƯỚC fix curves: engine:'kernel' nhưng thiếu curves.
    const stale = { engine: 'kernel', step2: { geometry: { points: [{ id: 'B' }] } } };
    expect(isStaleEngineCache(stale)).toBe(true);
  });

  it('payload engine MỚI (figureVersion = hiện tại) ⇒ KHÔNG cũ (phục vụ)', () => {
    const fresh = { engine: 'kernel', figureVersion: ENGINE_FIGURE_VERSION };
    expect(isStaleEngineCache(fresh)).toBe(false);
  });

  it('payload engine phiên bản CAO hơn ⇒ KHÔNG cũ (không tự huỷ tương lai)', () => {
    const future = { engine: 'kernel', figureVersion: ENGINE_FIGURE_VERSION + 5 };
    expect(isStaleEngineCache(future)).toBe(false);
  });

  it('payload luồng LLM (không engine:kernel) ⇒ KHÔNG bao giờ cũ (giữ cache LLM)', () => {
    const llm = { step2: { geometry: { points: [] } } };
    expect(isStaleEngineCache(llm)).toBe(false);
    expect(isStaleEngineCache({ engine: 'llm', figureVersion: 0 })).toBe(false);
  });

  it('đầu vào rỗng/không object ⇒ false (an toàn)', () => {
    expect(isStaleEngineCache(null)).toBe(false);
    expect(isStaleEngineCache(undefined)).toBe(false);
    expect(isStaleEngineCache('xâu')).toBe(false);
  });
});
