import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { validateReferral, referralReasonText } from './_lib/referralCore.js';

// Mã Mời — endpoint GỘP (giữ số Serverless Function của Vercel Hobby ≤ 12).
//   GET                     → thông tin mã mời + ví + STK + lịch sử rút
//   GET  ?validate=CODE     → kiểm tra mã (màn thanh toán)
//   POST { action:'save-account', bankCode, accountNumber, accountName } → lưu/đổi STK
//   POST { action:'withdraw', amount }                                    → tạo yêu cầu rút

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// Bảng chữ dễ đọc: bỏ 0/O/1/I để người dùng đọc/gõ tay không nhầm.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(len = 7) {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

const WITHDRAW_ERR = {
  invalid_amount: 'Số tiền rút không hợp lệ',
  no_account: 'Bạn cần thêm tài khoản ngân hàng trước khi rút',
  insufficient: 'Số dư hoa hồng không đủ',
  profile_not_found: 'Không đọc được tài khoản',
};

// ── GET: thông tin ví + mã mời ───────────────────────────────────────────────
async function getInfo(user, res) {
  await supabase.from('profiles').upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

  let { data: profile } = await supabase
    .from('profiles').select('referral_code, commission_available, commission_pending')
    .eq('user_id', user.id).maybeSingle();

  if (!profile?.referral_code) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = genCode();
      const { error: updErr } = await supabase
        .from('profiles').update({ referral_code: code }).eq('user_id', user.id).is('referral_code', null);
      if (!updErr) break;
      if (updErr.code === '23505') continue;
      console.error('[referral] set code:', updErr);
      return res.status(500).json({ error: 'Không tạo được mã mời' });
    }
    const reread = await supabase
      .from('profiles').select('referral_code, commission_available, commission_pending')
      .eq('user_id', user.id).maybeSingle();
    profile = reread.data;
  }

  const { count: referredCount } = await supabase
    .from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id);

  const { data: payoutAccount } = await supabase
    .from('payout_accounts').select('bank_code, account_number, account_name')
    .eq('user_id', user.id).maybeSingle();

  const { data: withdrawals } = await supabase
    .from('withdrawals').select('id, amount, status, requested_at, processed_at')
    .eq('user_id', user.id).order('requested_at', { ascending: false }).limit(10);

  return res.status(200).json({
    code: profile?.referral_code || null,
    referredCount: referredCount || 0,
    commissionAvailable: profile?.commission_available || 0,
    commissionPending: profile?.commission_pending || 0,
    payoutAccount: payoutAccount || null,
    withdrawals: withdrawals || [],
  });
}

// ── POST action=save-account: lưu/đổi STK ngân hàng ──────────────────────────
async function saveAccount(user, req, res) {
  const bankCode = String(req.body?.bankCode || '').trim();
  const accountNumber = String(req.body?.accountNumber || '').trim();
  const accountName = String(req.body?.accountName || '').trim().toUpperCase();

  if (!bankCode) return res.status(400).json({ error: 'Vui lòng chọn ngân hàng' });
  if (!/^[0-9]{6,20}$/.test(accountNumber)) return res.status(400).json({ error: 'Số tài khoản không hợp lệ (6–20 chữ số)' });
  if (accountName.length < 2 || accountName.length > 100) return res.status(400).json({ error: 'Tên chủ tài khoản không hợp lệ' });

  const { data, error } = await supabase
    .from('payout_accounts')
    .upsert(
      { user_id: user.id, bank_code: bankCode, account_number: accountNumber, account_name: accountName, verified_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select('bank_code, account_number, account_name')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Số tài khoản này đã được dùng cho một tài khoản GeoPro khác' });
    console.error('[referral:save-account]', error);
    return res.status(500).json({ error: 'Không lưu được tài khoản ngân hàng' });
  }
  return res.status(200).json({ account: data });
}

// ── POST action=withdraw: tạo yêu cầu rút (RPC atomic) ───────────────────────
async function withdraw(user, req, res) {
  const amount = Math.floor(Number(req.body?.amount));
  if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ error: WITHDRAW_ERR.invalid_amount });

  const { data, error } = await supabase.rpc('request_withdrawal', { p_user_id: user.id, p_amount: amount });
  if (error) {
    console.error('[referral:withdraw] rpc:', error);
    return res.status(500).json({ error: 'Không tạo được yêu cầu rút' });
  }
  if (!data?.ok) {
    const status = data?.err === 'insufficient' || data?.err === 'no_account' ? 400 : 500;
    return res.status(status).json({ error: WITHDRAW_ERR[data?.err] || 'Không tạo được yêu cầu rút', available: data?.available });
  }
  return res.status(200).json({ ok: true, withdrawalId: data.withdrawal_id, balanceAfter: data.balance_after });
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase service role chưa được cấu hình' });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });

    if (req.method === 'GET') {
      const validateCode = req.query?.validate;
      if (validateCode !== undefined) {
        const result = await validateReferral(supabase, validateCode, user.id);
        return res.status(200).json({
          valid: result.ok,
          reason: result.reason || null,
          message: result.ok ? null : referralReasonText(result.reason),
          referrerName: result.ok ? (result.referrerName || null) : null,
        });
      }
      return await getInfo(user, res);
    }

    // POST
    const action = req.body?.action;
    if (action === 'save-account') return await saveAccount(user, req, res);
    if (action === 'withdraw') return await withdraw(user, req, res);
    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (error) {
    await reportServerError(error, { route: 'referral' });
    console.error('[referral]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler, 'referral');
