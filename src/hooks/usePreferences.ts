import { useState, useCallback } from 'react';
import { AppPreferences, loadPreferences, setPreference } from '@/lib/preferences';

/**
 * Đọc/ghi tuỳ chọn hiển thị cho phần UI (trang Settings).
 * `prefs` là snapshot lúc mount; `setPref` ghi localStorage rồi cập nhật state để render lại.
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());

  const setPref = useCallback(
    <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
      setPrefs(setPreference(key, value));
    },
    [],
  );

  return { prefs, setPref };
}
