import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';

// Phase 4 — Tạo yêu cầu rút hoa hồng. Trừ số dư "đã chín" nguyên tử qua RPC.
// Phase 6 — RPC tự "chín" các khoản hết hạn treo rồi mới kiểm ngưỡng rút tối thiểu
// (chi tiền là chuyển khoản tay ⇒ phải gom lại mới cho rút). Admin duyệt & chi ở Phase 5.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const fmtVnd = (v) => Number(v || 0).toLocaleString('vi-VN') + 'đ';

const ERR_TEXT = {
  invalid_amount: 'Số tiền rút không hợp lệ',
  no_account: 'Bạn cần thêm tài khoản ngân hàng trước khi rút',
  insufficient: 'Số dư hoa hồng không đủ',
  profile_not_found: 'Không đọc được tài khoản',
};

// `below_min` cần chèn con số lấy từ DB nên không đặt được trong bảng tĩnh ở trên.
function errText(data) {
  if (data?.err === 'below_min') {
    return `Số tiền rút tối thiểu là ${fmtVnd(data.min)}. Hãy tích thêm hoa hồng rồi rút một lần.`;
  }
  return ERR_TEXT[data?.err] || 'Không tạo được yêu cầu rút';
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase service role chưa được cấu hình' });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập' });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });

    const amount = Math.floor(Number(req.body?.amount));
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: ERR_TEXT.invalid_amount });
    }

    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_user_id: user.id,
      p_amount: amount,
    });
    if (error) {
      console.error('[withdraw] rpc:', error);
      return res.status(500).json({ error: 'Không tạo được yêu cầu rút' });
    }
    if (!data?.ok) {
      // Lỗi do NGƯỜI DÙNG (chưa đủ tiền / chưa đủ ngưỡng / chưa có STK) là 400,
      // không phải 500 — client dựa vào đây để hiện thông báo thay vì báo lỗi hệ thống.
      const userErrors = ['insufficient', 'no_account', 'below_min', 'invalid_amount'];
      const status = userErrors.includes(data?.err) ? 400 : 500;
      return res.status(status).json({
        error: errText(data),
        code: data?.err || null,
        available: data?.available,
        min: data?.min,
      });
    }

    return res.status(200).json({ ok: true, withdrawalId: data.withdrawal_id, balanceAfter: data.balance_after });
  } catch (error) {
    await reportServerError(error, { route: 'withdraw' });
    console.error('[withdraw]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler, 'withdraw');
