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
  /** Luôn hiện lời giải: bỏ ẩn đáp số & không cần bấm "Vì sao?" ở mỗi bước. */
  alwaysShowSolution: boolean;
  /** Độ mờ lớp kính khi bật "tô màu mặt phẳng" (0.03–0.6). */
  planeGlassOpacity: number;
}

/** Giới hạn độ mờ lớp kính để không quá đặc (che hình) hay quá nhạt (không thấy). */
export const GLASS_OPACITY_MIN = 0.03;
export const GLASS_OPACITY_MAX = 0.6;
export const clampGlassOpacity = (v: number): number =>
  Math.min(GLASS_OPACITY_MAX, Math.max(GLASS_OPACITY_MIN, v));

export const DEFAULT_PREFERENCES: AppPreferences = {
  showCoordinateGrid: true,
  showPoints: true,
  autoColorPlanes: false,
  autoRotate: false,
  showIllustrationValues: true,
  alwaysShowSolution: true, // mặc định HIỆN thẳng lời giải (bỏ gating "Vì sao?"); tắt để bật lại chế độ tự nghĩ
  planeGlassOpacity: 0.18,
};

const STORAGE_KEY = 'geo3d:prefs';

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Nhận đúng KIỂU của mỗi khoá đã biết (boolean/number); khoá thiếu/sai kiểu → default. */
function normalize(parsed: Record<string, unknown>): AppPreferences {
  const out: AppPreferences = { ...DEFAULT_PREFERENCES };
  (Object.keys(DEFAULT_PREFERENCES) as (keyof AppPreferences)[]).forEach((k) => {
    const def = DEFAULT_PREFERENCES[k];
    const val = parsed[k];
    if (typeof def === 'boolean' && typeof val === 'boolean') {
      (out[k] as boolean) = val;
    } else if (typeof def === 'number' && typeof val === 'number' && Number.isFinite(val)) {
      (out[k] as number) = k === 'planeGlassOpacity' ? clampGlassOpacity(val) : val;
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
