// api/_lib/brokenProblemLog.js
// Ghi lại "bài lỗi" (máy vẽ SAI / KHÔNG vẽ được) vào bảng public.problem_reports để
// quản trị viên xem/sửa ở trang /admin. Fire-and-forget: KHÔNG await, KHÔNG bao giờ
// để lỗi ghi log làm chết request (mirror lối `ai_cache` insert trong analyze-geometry).
//
// RIÊNG TƯ:
//   • KHÔNG bao giờ nhận/ lưu ảnh base64 (chỉ cờ imageProvided) — ảnh có thể dính PII.
//   • `prompt` (đề) là dữ liệu nhạy cảm → cắt bớt độ dài lưu trữ, nhưng vẫn ghi
//     `prompt_len` thật. Bảng đã khoá RLS chỉ admin đọc.
import { createClient } from '@supabase/supabase-js';

const PROMPT_STORE_MAX = 5000;   // cắt bớt đề khi lưu (đủ để chẩn lỗi, tránh phình DB)
const AI_JSON_STORE_MAX = 200000; // chặn JSON quá khổ (ký tự) — bỏ qua nếu vượt
const LOG_TIMEOUT_MS = 3000;      // trần thời gian chờ ghi log (không để treo response)

let cachedClient = null;
let cachedKey = '';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;                 // không có service role → bỏ qua im lặng
  const cacheKey = `${url}:${key}`;
  if (!cachedClient || cachedKey !== cacheKey) {
    cachedClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    cachedKey = cacheKey;
  }
  return cachedClient;
}

// Chỉ giữ JSON nếu nhỏ gọn; tránh lưu vật thể khổng lồ vào DB.
function safeJson(value) {
  if (value == null) return null;
  try {
    const s = JSON.stringify(value);
    if (!s || s.length > AI_JSON_STORE_MAX) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Ghi một bản ghi bài lỗi.
 * PHẢI await ở call site: trên serverless (Vercel), instance bị đóng băng ngay sau
 * khi trả response → promise chưa await bị bỏ, bài lỗi KHÔNG kịp lưu. Vì mọi call
 * site đều nằm ở nhánh LỖI (sắp trả về), await thêm vài chục ms là chấp nhận được.
 * Hàm không bao giờ throw; có timeout để không treo response quá lâu.
 * @param {object} p
 * @param {string} p.endpoint       route phát hiện lỗi (bắt buộc)
 * @param {string|null} [p.userId]  auth uid (null nếu khách)
 * @param {string|null} [p.mode]    'quick'|'detailed'|'advance'…
 * @param {string|null} [p.model]   model AI đã dùng
 * @param {string|null} [p.prompt]  đề bài (sẽ bị cắt bớt khi lưu)
 * @param {boolean} [p.imageProvided]
 * @param {*} [p.aiJson]            đầu ra AI / geometry đã hỏng
 * @param {string|null} [p.errorMessage]
 * @param {string|null} [p.errorStage] 'exception'|'parse'|'verify'|'timeout'|'unsupported'…
 * @param {number|null} [p.durationMs]
 */
export async function logBrokenProblem(p = {}) {
  try {
    const client = getClient();
    if (!client || !p.endpoint) return;

    const promptText = typeof p.prompt === 'string' ? p.prompt : null;
    const row = {
      endpoint: String(p.endpoint).slice(0, 64),
      user_id: p.userId || null,
      mode: p.mode ? String(p.mode).slice(0, 32) : null,
      model: p.model ? String(p.model).slice(0, 64) : null,
      prompt: promptText ? promptText.slice(0, PROMPT_STORE_MAX) : null,
      prompt_len: promptText ? promptText.length : null,
      image_provided: !!p.imageProvided,
      ai_json: safeJson(p.aiJson),
      error_message: p.errorMessage ? String(p.errorMessage).slice(0, 2000) : null,
      error_stage: p.errorStage ? String(p.errorStage).slice(0, 32) : null,
      duration_ms: Number.isFinite(p.durationMs) ? Math.round(p.durationMs) : null,
    };

    // AWAIT (kèm timeout): chắc chắn insert bay đi & hoàn tất trước khi handler trả
    // response, nhưng không bao giờ để việc ghi log giữ response quá LOG_TIMEOUT_MS.
    const insert = client.from('problem_reports').insert([row]).then(({ error }) => {
      if (error) console.warn('[broken-problem] insert failed:', error.message);
    }, (err) => {
      console.warn('[broken-problem] insert threw:', err?.message || err);
    });
    await Promise.race([insert, new Promise((resolve) => setTimeout(resolve, LOG_TIMEOUT_MS))]);
  } catch (err) {
    // Không bao giờ để việc ghi log làm hỏng request chính.
    try { console.warn('[broken-problem] log error:', err?.message || err); } catch { /* im lặng */ }
  }
}
