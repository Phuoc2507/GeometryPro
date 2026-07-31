// api/_lib/adminAuth.js
// Xác thực người gọi là QUẢN TRỊ VIÊN cho các endpoint admin.
// Verify JWT bằng service-role rồi kiểm profiles.role = 'admin'.
// TUYỆT ĐỐI không tin "role" gửi từ client — luôn đọc lại từ DB.
import { createClient } from '@supabase/supabase-js';

let cachedAdmin = null;
let cachedKey = '';

export function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const ck = `${url}:${key}`;
  if (!cachedAdmin || cachedKey !== ck) {
    cachedAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    cachedKey = ck;
  }
  return cachedAdmin;
}

/**
 * Kiểm tra request đến từ một admin hợp lệ.
 * @returns {Promise<{ok:true, admin, userId:string} | {ok:false, status:number, error:string}>}
 */
export async function requireAdmin(req) {
  const admin = getAdmin();
  if (!admin) return { ok: false, status: 500, error: 'Máy chủ chưa cấu hình đầy đủ' };

  const authHeader = req.headers?.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Bạn cần đăng nhập' };
  }
  const token = authHeader.slice(7).trim();

  const { data: { user } = {}, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: 'Phiên đăng nhập không hợp lệ' };

  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (pErr) return { ok: false, status: 500, error: 'Không đọc được hồ sơ' };
  if (!profile || profile.role !== 'admin') {
    return { ok: false, status: 403, error: 'Bạn không có quyền quản trị' };
  }

  return { ok: true, admin, userId: user.id };
}
