const CACHE_KEY = 'geometrypro_quota_display';

export interface QuotaMetadata {
  actorType: 'guest' | 'account';
  feature: string;
  remaining: number | null;
  resetAt: string | null;
}

type QuotaCache = Record<string, QuotaMetadata>;

function readCache(): QuotaCache {
  if (typeof window === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed as QuotaCache : {};
  } catch {
    return {};
  }
}

export function cacheQuota(quota: QuotaMetadata | null | undefined): void {
  if (!quota || typeof window === 'undefined') return;
  const cache = readCache();
  cache[quota.feature] = quota;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent('geometrypro:quota', { detail: quota }));
}

export function cacheQuotaFromResponse(response: Response, payload?: unknown): void {
  const bodyQuota = payload && typeof payload === 'object' && 'quota' in payload
    ? (payload as { quota?: QuotaMetadata }).quota
    : undefined;
  if (bodyQuota) {
    cacheQuota(bodyQuota);
    return;
  }

  const actorType = response.headers.get('X-Quota-Actor');
  const feature = response.headers.get('X-Quota-Feature');
  if ((actorType !== 'guest' && actorType !== 'account') || !feature) return;
  const remainingHeader = response.headers.get('X-Quota-Remaining');
  cacheQuota({
    actorType,
    feature,
    remaining: remainingHeader == null ? null : Number(remainingHeader),
    resetAt: response.headers.get('X-Quota-Reset'),
  });
}

export function getGuestQuotaRemaining(feature: 'draw_quick' | 'draw_detailed' | 'solve'): number | null {
  const cached = readCache()[feature];
  if (!cached || cached.actorType !== 'guest') {
    return feature === 'draw_quick' ? 2 : 1;
  }
  if (cached.resetAt && Date.now() >= new Date(cached.resetAt).getTime()) {
    return feature === 'draw_quick' ? 2 : 1;
  }
  return cached.remaining;
}
