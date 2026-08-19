import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';

// Phase 4 — Lưu/đổi tài khoản ngân hàng nhận hoa hồng của người mời.
// Ràng buộc DB: mỗi user 1 STK; mỗi STK (bank+số) chỉ thuộc 1 tài khoản GeoPro.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

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

    const bankCode = String(req.body?.bankCode || '').trim();
    const accountNumber = String(req.body?.accountNumber || '').trim();
    const accountName = String(req.body?.accountName || '').trim().toUpperCase();

    if (!bankCode) return res.status(400).json({ error: 'Vui lòng chọn ngân hàng' });
    if (!/^[0-9]{6,20}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Số tài khoản không hợp lệ (6–20 chữ số)' });
    }
    if (accountName.length < 2 || accountName.length > 100) {
      return res.status(400).json({ error: 'Tên chủ tài khoản không hợp lệ' });
    }

    const { data, error } = await supabase
      .from('payout_accounts')
      .upsert(
        { user_id: user.id, bank_code: bankCode, account_number: accountNumber, account_name: accountName, verified_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select('bank_code, account_number, account_name')
      .single();

    if (error) {
      // 23505: đụng ràng buộc UNIQUE (bank_code, account_number) của user khác.
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Số tài khoản này đã được dùng cho một tài khoản GeoPro khác' });
      }
      console.error('[payout-account]', error);
      return res.status(500).json({ error: 'Không lưu được tài khoản ngân hàng' });
    }

    return res.status(200).json({ account: data });
  } catch (error) {
    await reportServerError(error, { route: 'payout-account' });
    console.error('[payout-account]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler, 'payout-account');
