const QUOTA_KEY = 'geo3d_guest_ai_usage';
const MAX_GUEST_AI_CALLS = 3;

interface QuotaData {
  date: string;
  count: number;
}

export function checkAndIncrementGuestQuota(): boolean {
  // Check if we have localStorage available
  if (typeof window === 'undefined' || !window.localStorage) {
    return true; // Allow by default if no localStorage
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const quotaDataStr = localStorage.getItem(QUOTA_KEY);
  
  let quotaData: QuotaData = { date: today, count: 0 };
  
  if (quotaDataStr) {
    try {
      const parsed = JSON.parse(quotaDataStr);
      // If it's the same day, use the existing count
      if (parsed.date === today) {
        quotaData = parsed;
      }
    } catch (e) {
      // Ignore parse errors and reset
    }
  }

  // Check if quota is exceeded
  if (quotaData.count >= MAX_GUEST_AI_CALLS) {
    return false; // Quota exceeded
  }

  // Increment quota
  quotaData.count += 1;
  localStorage.setItem(QUOTA_KEY, JSON.stringify(quotaData));
  
  return true; // Allowed
}

export function getGuestQuotaRemaining(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return MAX_GUEST_AI_CALLS;
  }

  const today = new Date().toISOString().split('T')[0];
  const quotaDataStr = localStorage.getItem(QUOTA_KEY);
  
  if (quotaDataStr) {
    try {
      const parsed = JSON.parse(quotaDataStr);
      if (parsed.date === today) {
        return Math.max(0, MAX_GUEST_AI_CALLS - parsed.count);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return MAX_GUEST_AI_CALLS;
}
