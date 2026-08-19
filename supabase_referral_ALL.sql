-- =====================================================================
-- Geo3D — Mã Mời · GỘP TẤT CẢ (Phase 0 → 3 → 4 → 5)
-- Chạy 1 lần trong Supabase SQL Editor (service role) TRƯỚC khi merge code lên main.
-- An toàn chạy lại (idempotent) & tương thích ngược (không hỏng web hiện tại).
-- =====================================================================

-- ─────────────── PHASE 0: nền móng dữ liệu ───────────────
-- =====================================================================
-- Geo3D — Chương trình Mã Mời (Referral 60-10) · PHASE 0: Nền móng dữ liệu
-- Chạy trong Supabase SQL Editor (service role). An toàn chạy lại (idempotent).
--
-- Phase 0 CHỈ dựng SCHEMA (bảng + cột + index + RLS). KHÔNG có logic tính tiền —
-- logic (sinh mã, ghi hoa hồng, rút tiền) nằm ở các phase sau, mỗi phase 1 migration.
--
-- Mô hình đã chốt:
--   • Người được mời: giảm 10% đơn đầu khi nhập mã (xác minh SĐT = khách mới).
--   • Người mời: hoa hồng 60% đơn đầu tiên → tích vào ví → rút về STK (KYC).
--   • Không hoàn tiền · thu qua QR (PayOS) như hiện tại · trả hoa hồng thủ công (đầu).
--   • Chống gian lận: 1 SĐT = 1 lần hoa hồng, 1 STK ↔ 1 account, trần lượt/tháng.
--
-- Quy ước: sổ cái hoa hồng nhân bản mẫu `credit_ledger` (append-only + idempotent ref).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) profiles: mã mời riêng, người giới thiệu, SĐT xác minh, ví hoa hồng
--    (đặt trên profiles cho đồng bộ với ví credit/gói vốn đã nằm ở đây).
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code        text,          -- mã mời của chính user này
  add column if not exists referred_by          uuid references auth.users(id),  -- ai đã rủ user này
  add column if not exists phone_e164           text,          -- SĐT đã xác minh (chuẩn E.164, vd +8490...)
  add column if not exists phone_verified_at    timestamptz,
  add column if not exists commission_pending   integer not null default 0,   -- hoa hồng đang treo (chưa rút được)
  add column if not exists commission_available integer not null default 0;   -- hoa hồng đã "chín" (rút được)

-- Mã mời là duy nhất toàn hệ thống (bỏ qua NULL khi chưa sinh mã).
create unique index if not exists profiles_referral_code_uniq
  on public.profiles (referral_code) where referral_code is not null;

-- Tra cứu nhanh theo SĐT (phục vụ kiểm "SĐT này đã từng mua chưa").
create index if not exists profiles_phone_idx
  on public.profiles (phone_e164) where phone_e164 is not null;

-- RLS: KHÔNG cho client tự sửa ví hoa hồng / SĐT / người giới thiệu.
-- Mở rộng policy "non-plan" cũ để khoá thêm các cột tiền nhạy cảm này.
drop policy if exists "Users can update non-plan fields" on public.profiles;
create policy "Users can update non-plan fields" on public.profiles
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and plan_type            is not distinct from (select p.plan_type            from public.profiles p where p.user_id = auth.uid())
  and plan_tier            is not distinct from (select p.plan_tier            from public.profiles p where p.user_id = auth.uid())
  and plan_code            is not distinct from (select p.plan_code            from public.profiles p where p.user_id = auth.uid())
  and plan_expires_at      is not distinct from (select p.plan_expires_at      from public.profiles p where p.user_id = auth.uid())
  and plan_credits         is not distinct from (select p.plan_credits         from public.profiles p where p.user_id = auth.uid())
  and purchased_credits    is not distinct from (select p.purchased_credits    from public.profiles p where p.user_id = auth.uid())
  and referral_code        is not distinct from (select p.referral_code        from public.profiles p where p.user_id = auth.uid())
  and referred_by          is not distinct from (select p.referred_by          from public.profiles p where p.user_id = auth.uid())
  and phone_e164           is not distinct from (select p.phone_e164           from public.profiles p where p.user_id = auth.uid())
  and phone_verified_at    is not distinct from (select p.phone_verified_at    from public.profiles p where p.user_id = auth.uid())
  and commission_pending   is not distinct from (select p.commission_pending   from public.profiles p where p.user_id = auth.uid())
  and commission_available is not distinct from (select p.commission_available from public.profiles p where p.user_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- 2) orders: gắn mã mời + người giới thiệu + số tiền đã giảm cho đơn này
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists referral_code   text,
  add column if not exists referrer_id     uuid references auth.users(id),
  add column if not exists discount_amount integer not null default 0;   -- 10% đã giảm (đồng)

-- ---------------------------------------------------------------------
-- 3) referrals: mỗi quan hệ giới thiệu + vòng đời của nó
--    Trạng thái: pending → confirmed → (rút) ; hoặc → clawed_back / rejected
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  id                uuid        primary key default gen_random_uuid(),
  referrer_id       uuid        not null references auth.users(id) on delete cascade,  -- người mời
  invitee_id        uuid        references auth.users(id) on delete set null,          -- người được rủ
  invitee_phone     text,          -- SĐT đã xác minh của người được rủ (khoá "đơn đầu theo danh tính")
  code              text        not null,   -- mã mời đã dùng
  order_code        bigint,        -- đơn đủ điều kiện (đơn ĐẦU của người được rủ)
  status            text        not null default 'pending',   -- pending|confirmed|clawed_back|rejected
  discount_amount   integer     not null default 0,   -- tiền đã giảm cho người được rủ
  commission_amount integer     not null default 0,   -- hoa hồng cho người mời (60%)
  created_at        timestamptz not null default now(),
  confirmed_at      timestamptz,
  note              text
);

-- Mỗi người được rủ chỉ sinh hoa hồng ĐÚNG 1 LẦN — khoá theo account VÀ theo SĐT.
create unique index if not exists referrals_invitee_uniq
  on public.referrals (invitee_id) where invitee_id is not null;
create unique index if not exists referrals_invitee_phone_uniq
  on public.referrals (invitee_phone) where invitee_phone is not null;
-- Đếm nhanh số lượt của một người mời trong tháng (phục vụ trần 10/tháng).
create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id, created_at);

alter table public.referrals enable row level security;
drop policy if exists "referrals readable by referrer" on public.referrals;
create policy "referrals readable by referrer"
  on public.referrals for select using (auth.uid() = referrer_id);

-- ---------------------------------------------------------------------
-- 4) commission_ledger: SỔ CÁI ví hoa hồng (nhân bản mẫu credit_ledger)
--    append-only; 1 ref ghi đúng 1 lần (chống cộng/trừ trùng khi webhook lặp).
-- ---------------------------------------------------------------------
create table if not exists public.commission_ledger (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,  -- người mời
  delta         integer     not null,   -- dương = hoa hồng cộng ; âm = rút/clawback
  reason        text        not null,   -- 'commission'|'confirm'|'withdraw'|'clawback'|'adjust'
  ref           text,                   -- referral id / withdrawal id
  balance_after integer     not null,   -- số dư "đã chín" sau bút toán
  created_at    timestamptz not null default now()
);
create unique index if not exists commission_ledger_ref_uniq
  on public.commission_ledger (user_id, ref) where ref is not null;

alter table public.commission_ledger enable row level security;
drop policy if exists "commission ledger readable by owner" on public.commission_ledger;
create policy "commission ledger readable by owner"
  on public.commission_ledger for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5) payout_accounts: tài khoản ngân hàng của người mời để nhận tiền
--    Ràng buộc CHỐNG GIAN LẬN: mỗi user 1 STK  &  1 STK ↔ 1 account (2 chiều).
-- ---------------------------------------------------------------------
create table if not exists public.payout_accounts (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  bank_code      text        not null,   -- mã ngân hàng (Napas/BIN)
  account_number text        not null,
  account_name   text        not null,   -- tên chủ TK (đối chiếu khi KYC)
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);
-- Mỗi user chỉ gắn 1 STK.
create unique index if not exists payout_accounts_user_uniq
  on public.payout_accounts (user_id);
-- 1 STK (ngân hàng + số TK) chỉ thuộc DUY NHẤT 1 account GeoPro → chặn nuôi account ảo.
create unique index if not exists payout_accounts_bank_uniq
  on public.payout_accounts (bank_code, account_number);

alter table public.payout_accounts enable row level security;
drop policy if exists "payout accounts readable by owner" on public.payout_accounts;
create policy "payout accounts readable by owner"
  on public.payout_accounts for select using (auth.uid() = user_id);
-- Ghi/sửa STK đi qua API (service role) để xác minh + đảm bảo ràng buộc → không mở policy write cho client.

-- ---------------------------------------------------------------------
-- 6) withdrawals: yêu cầu rút tiền + trạng thái duyệt/chi
--    Giai đoạn đầu: admin chi thủ công rồi đánh dấu 'paid' + lưu mã giao dịch.
-- ---------------------------------------------------------------------
create table if not exists public.withdrawals (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  amount            integer     not null,   -- số tiền rút (đồng) — KHÔNG áp ngưỡng tối thiểu
  payout_account_id uuid        references public.payout_accounts(id),
  status            text        not null default 'requested',   -- requested|approved|paid|rejected
  transfer_ref      text,          -- mã giao dịch khi admin đã chuyển khoản
  admin_note        text,
  requested_at      timestamptz not null default now(),
  processed_at      timestamptz
);
create index if not exists withdrawals_status_idx
  on public.withdrawals (status, requested_at);
create index if not exists withdrawals_user_idx
  on public.withdrawals (user_id, requested_at);

alter table public.withdrawals enable row level security;
drop policy if exists "withdrawals readable by owner" on public.withdrawals;
create policy "withdrawals readable by owner"
  on public.withdrawals for select using (auth.uid() = user_id);
-- Tạo yêu cầu rút đi qua API (service role) để KHOÁ số dư nguyên tử → không mở policy write cho client.

commit;

-- =====================================================================
-- GHI CHÚ CHO CÁC PHASE SAU (chưa làm ở Phase 0):
--   • Phase 1: hàm sinh referral_code duy nhất + trang "Giới thiệu bạn".
--   • Phase 2: checkout.js áp giảm 10% + xác minh SĐT người được rủ (OTP).
--   • Phase 3: sửa fulfill_paid_order → ghi referrals + commission_ledger (trần 10/tháng).
--   • Phase 4: API thêm STK (KYC) + tạo withdrawals (khoá số dư).
--   • Phase 5: trang admin duyệt & đánh dấu 'paid'.
--   • Phase 6: chống gian lận (chặn tự-refer, cờ trùng thiết bị/IP, clawback).
-- =====================================================================

-- ─────────────── PHASE 3: cộng hoa hồng ───────────────
-- =====================================================================
-- Geo3D — Mã Mời · PHASE 3: Ghi hoa hồng vào ví khi đơn được thanh toán
-- Chạy trong Supabase SQL Editor (service role). An toàn chạy lại (idempotent).
--
-- Khi một đơn CÓ người giới thiệu được xác nhận 'paid', và đây là ĐƠN ĐẦU của
-- người được rủ (khoá bằng unique invitee_id) → cộng 60% giá đơn (đã giảm) vào ví
-- người mời (commission_available), ghi sổ commission_ledger + bản ghi referrals.
--
-- CHƯA lọc chống farm (Phase 6). Ở đây chỉ LƯU SẴN số TK người trả (PayOS trả về)
-- để Phase 6 dùng. Hoa hồng "chín" ngay (không treo) theo quyết định làm tính năng trước.
-- =====================================================================

begin;

-- 1) Lưu số TK người trả trên mỗi bản ghi hoa hồng (để Phase 6 lọc trùng sau).
alter table public.referrals
  add column if not exists payer_account_number text,
  add column if not exists payer_account_bank   text;

-- 2) Thay fulfill_paid_order: thêm 2 tham số STK người trả + khối cộng hoa hồng.
--    Đổi chữ ký hàm nên DROP bản cũ trước (webhook vẫn gọi được vì 2 tham số mới có default).
drop function if exists public.fulfill_paid_order(integer);

create or replace function public.fulfill_paid_order(
  p_order_code integer,
  p_counter_account_number text default null,
  p_counter_account_name   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_profile public.profiles;
  v_plan public.plans;
  v_credit_price numeric;
  v_credit_amount numeric;
  v_expiry timestamptz;
  v_ref text := p_order_code::text;
  v_commission integer;
  v_referrer_balance integer;
begin
  select * into v_order
  from public.orders
  where order_code = p_order_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'err', 'order_not_found');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'paid');
  end if;
  if coalesce(v_order.status, 'pending') <> 'pending' then
    return jsonb_build_object('ok', false, 'err', 'invalid_order_status', 'status', v_order.status);
  end if;

  select * into v_profile
  from public.profiles
  where user_id = v_order.user_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'err', 'profile_not_found');
  end if;

  -- Recover safely from a legacy webhook that granted before marking paid.
  if exists (
    select 1 from public.credit_ledger
    where user_id = v_order.user_id and ref = v_ref
  ) then
    update public.orders
       set status = 'paid', fulfilled_at = now(), updated_at = now()
     where order_code = p_order_code;
    return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'paid');
  end if;

  if v_order.plan_code is null then
    select value into v_credit_price
    from public.pricing_config
    where key = 'credit_price_vnd';
    v_credit_amount := coalesce(
      v_order.credit_amount,
      round(v_order.amount::numeric / nullif(v_credit_price, 0), 2)
    );
    if v_credit_amount is null or v_credit_amount <= 0 then
      return jsonb_build_object('ok', false, 'err', 'invalid_credit_amount');
    end if;

    update public.profiles
       set purchased_credits = purchased_credits + v_credit_amount,
           updated_at = now()
     where user_id = v_order.user_id
     returning * into v_profile;

    insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
    values (
      v_order.user_id, v_credit_amount, 'purchase', v_ref,
      v_profile.plan_credits + v_profile.purchased_credits
    );
  else
    select * into v_plan
    from public.plans
    where code = v_order.plan_code;
    if not found then
      return jsonb_build_object('ok', false, 'err', 'plan_not_found');
    end if;

    v_expiry := greatest(now(), coalesce(v_profile.plan_expires_at, now()))
      + (v_plan.duration_days || ' days')::interval;

    update public.profiles
       set plan_type = v_plan.tier,
           plan_tier = v_plan.tier,
           plan_code = v_plan.code,
           plan_expires_at = v_expiry,
           plan_credits = v_plan.credits_per_cycle,
           credits_reset_at = now(),
           updated_at = now()
     where user_id = v_order.user_id
     returning * into v_profile;

    insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
    values (
      v_order.user_id, v_plan.credits_per_cycle, 'plan_grant', v_ref,
      v_profile.plan_credits + v_profile.purchased_credits
    );
  end if;

  update public.orders
     set status = 'paid', fulfilled_at = now(), updated_at = now()
   where order_code = p_order_code;

  -- ── HOA HỒNG MÃ MỜI ────────────────────────────────────────────────
  -- Chỉ với đơn GÓI có người giới thiệu, và là ĐƠN ĐẦU của người được rủ.
  if v_order.referrer_id is not null and v_order.plan_code is not null then
    if not exists (select 1 from public.referrals where invitee_id = v_order.user_id) then
      v_commission := round(v_order.amount::numeric * 0.60)::integer;

      insert into public.referrals(
        referrer_id, invitee_id, code, order_code, status,
        discount_amount, commission_amount, confirmed_at,
        payer_account_number, payer_account_bank
      ) values (
        v_order.referrer_id, v_order.user_id, coalesce(v_order.referral_code, ''), p_order_code, 'confirmed',
        coalesce(v_order.discount_amount, 0), v_commission, now(),
        p_counter_account_number, p_counter_account_name
      );

      update public.profiles
         set commission_available = commission_available + v_commission,
             updated_at = now()
       where user_id = v_order.referrer_id
       returning commission_available into v_referrer_balance;

      insert into public.commission_ledger(user_id, delta, reason, ref, balance_after)
      values (
        v_order.referrer_id, v_commission, 'commission', v_ref,
        coalesce(v_referrer_balance, v_commission)
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'status', 'paid',
    'kind', case when v_order.plan_code is null then 'credits' else 'plan' end
  );
end
$$;

revoke all on function public.fulfill_paid_order(integer, text, text)
  from public, anon, authenticated;
grant execute on function public.fulfill_paid_order(integer, text, text)
  to service_role;

commit;

-- ─────────────── PHASE 4: rút tiền ───────────────
-- =====================================================================
-- Geo3D — Mã Mời · PHASE 4: Rút tiền hoa hồng (atomic)
-- Chạy trong Supabase SQL Editor (service role). An toàn chạy lại.
--
-- request_withdrawal: khoá dòng profile, kiểm số dư "đã chín" (commission_available),
-- trừ số dư, tạo bản ghi withdrawals ('requested') + ghi sổ commission_ledger.
-- KHÔNG áp ngưỡng tối thiểu (theo yêu cầu). Admin duyệt & chi ở Phase 5.
-- =====================================================================

begin;

create or replace function public.request_withdrawal(p_user_id uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_account public.payout_accounts;
  v_wid uuid;
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'err', 'invalid_amount');
  end if;

  select * into v_account from public.payout_accounts where user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'err', 'no_account');
  end if;

  select * into v_profile from public.profiles where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'err', 'profile_not_found');
  end if;
  if coalesce(v_profile.commission_available, 0) < p_amount then
    return jsonb_build_object('ok', false, 'err', 'insufficient', 'available', coalesce(v_profile.commission_available, 0));
  end if;

  insert into public.withdrawals(user_id, amount, payout_account_id, status)
  values (p_user_id, p_amount, v_account.id, 'requested')
  returning id into v_wid;

  update public.profiles
     set commission_available = commission_available - p_amount,
         updated_at = now()
   where user_id = p_user_id
   returning commission_available into v_balance;

  insert into public.commission_ledger(user_id, delta, reason, ref, balance_after)
  values (p_user_id, -p_amount, 'withdraw', v_wid::text, v_balance);

  return jsonb_build_object('ok', true, 'withdrawal_id', v_wid, 'balance_after', v_balance);
end
$$;

revoke all on function public.request_withdrawal(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.request_withdrawal(uuid, integer)
  to service_role;

commit;

-- ─────────────── PHASE 5: admin duyệt & chi ───────────────
-- =====================================================================
-- Geo3D — Mã Mời · PHASE 5: Admin duyệt & chi hoa hồng
-- Chạy trong Supabase SQL Editor (service role). An toàn chạy lại.
--
-- resolve_withdrawal: khoá yêu cầu rút, chỉ xử khi đang 'requested'/'approved'.
--   • 'paid'     → đánh dấu đã chi + lưu mã giao dịch.
--   • 'rejected' → đánh dấu từ chối + HOÀN tiền về ví (commission_available) + ghi sổ.
-- =====================================================================

begin;

create or replace function public.resolve_withdrawal(
  p_withdrawal_id uuid,
  p_action text,
  p_transfer_ref text default null,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w public.withdrawals;
  v_balance integer;
begin
  if p_action not in ('paid', 'rejected') then
    return jsonb_build_object('ok', false, 'err', 'invalid_action');
  end if;

  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'err', 'not_found');
  end if;
  if v_w.status not in ('requested', 'approved') then
    return jsonb_build_object('ok', false, 'err', 'already_resolved', 'status', v_w.status);
  end if;

  if p_action = 'paid' then
    update public.withdrawals
       set status = 'paid', processed_at = now(), transfer_ref = p_transfer_ref, admin_note = p_admin_note
     where id = p_withdrawal_id;
  else
    update public.withdrawals
       set status = 'rejected', processed_at = now(), admin_note = p_admin_note
     where id = p_withdrawal_id;
    -- Hoàn tiền về ví người mời.
    update public.profiles
       set commission_available = commission_available + v_w.amount, updated_at = now()
     where user_id = v_w.user_id
     returning commission_available into v_balance;
    insert into public.commission_ledger(user_id, delta, reason, ref, balance_after)
    values (v_w.user_id, v_w.amount, 'refund', p_withdrawal_id::text || ':refund', coalesce(v_balance, v_w.amount));
  end if;

  return jsonb_build_object('ok', true, 'status', case when p_action = 'paid' then 'paid' else 'rejected' end);
end
$$;

revoke all on function public.resolve_withdrawal(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_withdrawal(uuid, text, text, text)
  to service_role;

commit;
