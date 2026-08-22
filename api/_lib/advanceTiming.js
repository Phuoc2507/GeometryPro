// api/_lib/advanceTiming.js
// GHI 1 dòng timing cho nhánh "advance-from-detailed" (Vẽ kỹ → engine nâng cao) vào bảng
// advance_timings → trang admin tính p95/p50 bền vững (thay vì grep log Vercel ephemeral).
// BULLETPROOF: không bao giờ throw, có timeout, hỏng cũng KHÔNG chặn việc vẽ.
// (Bảng chưa migrate → insert trả lỗi, ta nuốt im lặng.)
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
 * Ghi 1 timing. PHẢI await (serverless đóng băng sau response) nhưng có timeout để không treo.
 * @param {{reason:string, ms:number, served?:boolean, imageProvided?:boolean}} rec
 */
export async function recordAdvanceTiming({ reason, ms, served = false, imageProvided = false }) {
  try {
    const client = getClient();
    if (!client || !reason || !Number.isFinite(ms)) return;
    const row = {
      reason: String(reason).slice(0, 60),
      ms: Math.round(ms),
      served: !!served,
      image_provided: !!imageProvided,
    };
    const call = client.from('advance_timings').insert(row).then(
      ({ error }) => { if (error) console.warn('[advance-timing] insert failed:', error.message); },
      (err) => { console.warn('[advance-timing] insert threw:', err?.message || err); },
    );
    await Promise.race([call, new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS))]);
  } catch (err) {
    try { console.warn('[advance-timing] error:', err?.message || err); } catch { /* im lặng */ }
  }
}
