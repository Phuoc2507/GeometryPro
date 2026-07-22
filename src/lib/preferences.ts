/**
 * Tuỳ chọn hiển thị bản vẽ, lưu bền trong localStorage (một khoá JSON).
 * Nguồn sự thật cho các toggle; GeometryContext seed state từ đây lúc mount.
 * Thuần logic — không phụ thuộc React — nên test được trong env 'node'.
 */

export interface AppPreferences {
  /** Bật/tắt mặt phẳng lưới Oxy trong scene 3D. */
  showCoordinateGrid: boolean;
  /** Hiện nhãn/chấm cho các điểm. */
  showPoints: boolean;
  /** Tự tô màu các mặt phẳng (khớp GeometryState.autoColor). */
  autoColorPlanes: boolean;
  /** Tự động xoay hình 3D. */
  autoRotate: boolean;
  /** Hiện giá trị đo ở hình minh hoạ đại diện (dành cho tiểu-dự án C). */
  showIllustrationValues: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  showCoordinateGrid: true,
  showPoints: true,
  autoColorPlanes: false,
  autoRotate: false,
  showIllustrationValues: true,
};

const STORAGE_KEY = 'geo3d:prefs';

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Chỉ nhận giá trị boolean cho mỗi khoá đã biết; khoá thiếu/sai kiểu → default. */
function normalize(parsed: Record<string, unknown>): AppPreferences {
  const out: AppPreferences = { ...DEFAULT_PREFERENCES };
  (Object.keys(DEFAULT_PREFERENCES) as (keyof AppPreferences)[]).forEach((k) => {
    if (typeof parsed[k] === 'boolean') {
      out[k] = parsed[k] as boolean;
    }
  });
  return out;
}

export function loadPreferences(): AppPreferences {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFERENCES };
    return normalize(parsed as Record<string, unknown>);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(next: AppPreferences): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage đầy/không khả dụng → bỏ qua, giữ in-memory */
  }
}

export function setPreference<K extends keyof AppPreferences>(
  key: K,
  value: AppPreferences[K],
): AppPreferences {
  const next = { ...loadPreferences(), [key]: value };
  savePreferences(next);
  return next;
}
