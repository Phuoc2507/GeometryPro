// api/delete-account.js
// Xoá vĩnh viễn tài khoản + toàn bộ dữ liệu cá nhân của chính người gọi.
// Cần SERVICE ROLE vì (a) xoá được bản ghi auth.users và (b) dọn các bảng bất kể RLS.
// userId LẤY TỪ JWT đã verify — không bao giờ tin userId từ body (chống xoá nhầm/ác ý).
import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!admin) {
    return res.status(500).json({ error: 'Máy chủ chưa cấu hình đầy đủ để xoá tài khoản' });
  }

  // Xác thực người gọi qua JWT.
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để xoá tài khoản' });
  }
  const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.slice(7).trim());
  if (authError || !user) {
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
  }

  // Xác nhận chủ ý (client gửi confirm:true sau khi người dùng gõ xác nhận).
  if (req.body?.confirm !== true) {
    return res.status(400).json({ error: 'Thiếu xác nhận xoá tài khoản' });
  }

  const userId = user.id;

  // 1) Dọn dữ liệu CÁ NHÂN trước (thứ tự an toàn khoá ngoại; không phụ thuộc cascade).
  //    CỐ Ý KHÔNG xoá `orders` và `credit_ledger`: đó là HỒ SƠ TÀI CHÍNH cần giữ cho
  //    hoàn tiền/đối soát/kế toán. Chúng được ẨN DANH (user_id → NULL) qua khoá ngoại
  //    ON DELETE SET NULL khi xoá profiles/auth user (xem supabase_account_deletion_migration.sql).
  //    Nếu migration đó CHƯA áp, khoá ngoại vẫn ON DELETE CASCADE → chúng bị xoá như cũ
  //    (fallback an toàn, không lỗi). Nếu bước nào lỗi → DỪNG, chưa xoá auth user.
  //    `problem_reports` & `user_feedback` lưu NỘI DUNG đề của user → XOÁ hẳn (không ẩn danh),
  //    đúng nguyên tắc riêng tư. (Chúng cũng có ON DELETE CASCADE nên bước xoá auth user là
  //    lưới an toàn; xoá tường minh ở đây cho chắc & không phụ thuộc thứ tự cascade.)
  // problem_reports/user_feedback có thể CHƯA migrate (deploy code trước khi chạy SQL).
  // Với 2 bảng này, bỏ qua lỗi "bảng không tồn tại" để việc xoá tài khoản không bị chặn;
  // các bảng còn lại vẫn bắt buộc thành công.
  const softTables = new Set(['problem_reports', 'user_feedback']);
  const isMissingRelation = (err) =>
    err?.code === '42P01' || err?.code === 'PGRST205' ||
    /does not exist|schema cache|could not find the table/i.test(err?.message || '');

  const tables = ['saved_geometries', 'usage_counters', 'problem_reports', 'user_feedback', 'profiles'];
  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) {
      if (softTables.has(table) && isMissingRelation(error)) {
        console.warn(`[delete-account] bỏ qua ${table} (bảng chưa tồn tại):`, error.message);
        continue;
      }
      console.error(`[delete-account] xoá ${table} lỗi:`, error.message);
      await reportServerError(error, { route: 'delete-account', table });
      return res.status(500).json({ error: `Không xoá được dữ liệu (${table}). Vui lòng thử lại.` });
    }
  }

  // 2) Xoá bản ghi xác thực (đăng nhập) — bước cuối, không thể hoàn tác.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error('[delete-account] deleteUser lỗi:', delErr.message);
    await reportServerError(delErr, { route: 'delete-account', step: 'deleteUser' });
    return res.status(500).json({ error: 'Không xoá được tài khoản đăng nhập. Vui lòng liên hệ hỗ trợ.' });
  }

  return res.status(200).json({ success: true });
}

export default withSentry(handler, 'delete-account');
