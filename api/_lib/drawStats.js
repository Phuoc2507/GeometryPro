// api/_lib/drawStats.js
// Đếm lượt vẽ theo ngày (bảng draw_stats) để tính TỈ LỆ vẽ được ở trang admin.
// BULLETPROOF: không bao giờ throw, có timeout, hỏng cũng KHÔNG chặn việc vẽ.
// (Nếu bảng/RPC chưa migrate → rpc trả lỗi, ta nuốt im lặng.)
import { createClient } from '@supabase/supabase-js';

const TIMEOUT_MS = 2500;

let cachedClient = null;
let cachedKey = '';
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const ck = `${url}:${key}`;
  if (!cachedClient || cachedKey !== ck) {
    cachedClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    cachedKey = ck;
  }
  return cachedClient;
}

/**
 * Tăng bộ đếm. p_kind: 'attempt' (mỗi lần thử vẽ) | 'fail' (lỗi cứng).
 * PHẢI await (serverless đóng băng sau response) nhưng có timeout để không treo.
 */
export async function recordDrawStat(endpoint, kind) {
  try {
    const client = getClient();
    if (!client || !endpoint) return;
    const call = client
      .rpc('bump_draw_stat', { p_endpoint: String(endpoint).slice(0, 64), p_kind: kind })
      .then(({ error }) => { if (error) console.warn('[draw-stat] rpc failed:', error.message); },
            (err) => { console.warn('[draw-stat] rpc threw:', err?.message || err); });
    await Promise.race([call, new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS))]);
  } catch (err) {
    try { console.warn('[draw-stat] error:', err?.message || err); } catch { /* im lặng */ }
  }
}
