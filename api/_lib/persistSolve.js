// persistSolve — lưu KẾT QUẢ GIẢI vào DB ngay tại server (không phụ thuộc client).
// Nhờ vậy nếu người dùng F5 / rời trang giữa chừng, lời giải VẪN được lưu vào bài
// (saved_geometries.geometry_data.solve) → mở lại thấy, và KHÔNG mất credit oan.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
let cached = null;
function admin() {
  if (!url || !key) return null;
  if (!cached) cached = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return cached;
}

/**
 * Ghi solve = { problem, result } vào geometry_data của hàng saved_geometries.
 * Lọc theo user_id để KHÔNG đụng bài của người khác (service role bỏ qua RLS).
 * Trả { ok } — mọi lỗi đều nuốt, không được làm hỏng response giải bài.
 */
export async function persistSolveResult({ userId, historyId, problem, result }) {
  const db = admin();
  if (!db || !userId || !historyId) return { ok: false, reason: 'skip' };
  try {
    const { data, error } = await db
      .from('saved_geometries')
      .select('geometry_data')
      .eq('id', historyId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return { ok: false, reason: 'not_found' };

    const gd = data.geometry_data && typeof data.geometry_data === 'object' ? data.geometry_data : {};
    const merged = { ...gd, solve: { problem, result } };

    const { error: upErr } = await db
      .from('saved_geometries')
      .update({ geometry_data: merged })
      .eq('id', historyId)
      .eq('user_id', userId);
    if (upErr) return { ok: false, reason: upErr.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}
