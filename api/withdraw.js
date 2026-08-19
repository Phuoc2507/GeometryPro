import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';

// Phase 4 — Tạo yêu cầu rút hoa hồng. Trừ số dư "đã chín" nguyên tử qua RPC.
// Không áp ngưỡng tối thiểu. Admin duyệt & chi ở Phase 5.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const ERR_TEXT = {
  invalid_amount: 'Số tiền rút không hợp lệ',
  no_account: 'Bạn cần thêm tài khoản ngân hàng trước khi rút',
  insufficient: 'Số dư hoa hồng không đủ',
  profile_not_found: 'Không đọc được tài khoản',
};

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
      const status = data?.err === 'insufficient' || data?.err === 'no_account' ? 400 : 500;
      return res.status(status).json({ error: ERR_TEXT[data?.err] || 'Không tạo được yêu cầu rút', available: data?.available });
    }

    return res.status(200).json({ ok: true, withdrawalId: data.withdrawal_id, balanceAfter: data.balance_after });
  } catch (error) {
    await reportServerError(error, { route: 'withdraw' });
    console.error('[withdraw]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler, 'withdraw');
