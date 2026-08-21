-- =====================================================================
-- Geo3D — Mã Mời · GỘP TẤT CẢ (Phase 0 → 3 → 4 → 5 → 6)
-- Chạy 1 lần trong Supabase SQL Editor (service role) TRƯỚC khi merge code lên main.
-- Phase 6 nằm CUỐI và `create or replace` lại fulfill_paid_order + request_withdrawal của
-- Phase 3/4 — chạy hết file này là ra đúng trạng thái cuối, không cần chạy riêng phase nào.
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
  and role                 is not distinct from (select p.role                 from public.profiles p where p.user_id = auth.uid())
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
  -- BỌC EXCEPTION: mọi lỗi ở khâu hoa hồng TUYỆT ĐỐI không được làm hỏng việc cấp
  -- gói cho khách (khách đã trả tiền). Khối begin/exception tạo savepoint riêng, nên
  -- lỗi ở đây chỉ HOÀN TÁC phần hoa hồng, KHÔNG đụng phần cấp gói/credit đã làm ở trên.
  if v_order.referrer_id is not null and v_order.plan_code is not null then
    begin
      if not exists (select 1 from public.referrals where invitee_id = v_order.user_id) then
        v_commission := round(v_order.amount::numeric * 0.60)::integer;

        -- Cộng ví TRƯỚC + chặn nếu người mời không có dòng profiles (tránh ghi sổ mà không cộng ví).
        update public.profiles
           set commission_available = commission_available + v_commission,
               updated_at = now()
         where user_id = v_order.referrer_id
         returning commission_available into v_referrer_balance;
        if not found then
          raise exception 'referrer profile % not found', v_order.referrer_id;
        end if;

        insert into public.referrals(
          referrer_id, invitee_id, code, order_code, status,
          discount_amount, commission_amount, confirmed_at,
          payer_account_number, payer_account_bank
        ) values (
          v_order.referrer_id, v_order.user_id, coalesce(v_order.referral_code, ''), p_order_code, 'confirmed',
          coalesce(v_order.discount_amount, 0), v_commission, now(),
          p_counter_account_number, p_counter_account_name
        );

        insert into public.commission_ledger(user_id, delta, reason, ref, balance_after)
        values (v_order.referrer_id, v_commission, 'commission', v_ref, v_referrer_balance);
      end if;
    exception when others then
      raise warning 'commission skipped for order %: %', p_order_code, sqlerrm;
    end;
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

-- ─────────────── PHASE 6: rào chắn chống gian lận ───────────────
-- =====================================================================
-- Geo3D — Mã Mời · PHASE 6: RÀO CHẮN (chống gian lận + kỷ luật chi tiền)
-- Chạy trong Supabase SQL Editor (service role). An toàn chạy lại (idempotent).
--
-- Phase 3 cố tình bỏ qua phần này để ra tính năng trước ("hoa hồng chín ngay").
-- Phase 6 đóng lại 4 lỗ hổng, KHÔNG đụng tới tỉ lệ 60%/10% (đó là quyết định kinh doanh):
--
--   1. THỜI GIAN CHÍN. Hoa hồng vào `commission_pending` trước, sau N ngày mới
--      chuyển sang `commission_available` (rút được). Trước đây tiền chín NGAY →
--      không có cửa sổ nào để phát hiện gian lận trước khi tiền ra khỏi hệ thống.
--      Cột `commission_pending` đã có sẵn từ Phase 0 nhưng CHƯA TỪNG được ghi vào.
--
--   2. NGƯỠNG RÚT TỐI THIỂU. Chi tiền là chuyển khoản TAY. Duyệt từng khoản 15k
--      không scale — gom lại mới cho rút.
--
--   3. CHẶN TỰ-GIỚI-THIỆU QUA TÀI KHOẢN PHỤ. Phase 3 chỉ chặn `referrer_id = user_id`
--      (cùng một account). Lập account thứ hai bằng email khác thì lọt. Ở đây dùng
--      STK NGƯỜI TRẢ mà PayOS trả về (Phase 3 đã lưu sẵn vào referrals.payer_account_number
--      đúng cho mục đích này) để đối chiếu với STK NHẬN hoa hồng của người mời.
--
--   4. TRẦN LƯỢT/THÁNG. Index `referrals_referrer_idx` được tạo từ Phase 0 kèm ghi chú
--      "phục vụ trần 10/tháng" nhưng trần chưa bao giờ được áp.
--
-- Lượt bị nghi ngờ KHÔNG bị âm thầm nuốt mất: nó vào trạng thái 'flagged', tiền nằm
-- ở `commission_pending` và KHÔNG tự chín — admin duyệt tay (review_referral).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Tham số điều chỉnh được (không phải hằng số chôn trong hàm)
--    `on conflict do nothing` — chạy lại migration KHÔNG đạp lên giá trị admin đã chỉnh.
-- ---------------------------------------------------------------------
insert into public.pricing_config (key, value) values
  ('referral_hold_days',      7),        -- số ngày hoa hồng phải "treo" trước khi rút được
  ('referral_min_withdrawal', 100000),   -- ngưỡng rút tối thiểu (đồng)
  ('referral_monthly_cap',    10)        -- số lượt giới thiệu/tháng trước khi bị gắn cờ
on conflict (key) do nothing;

create or replace function public.referral_config(p_key text, p_default integer)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce((select value from public.pricing_config where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------
-- 2) referrals: mốc chín + lý do gắn cờ
-- ---------------------------------------------------------------------
alter table public.referrals
  add column if not exists mature_at   timestamptz,   -- null = không tự chín (đang bị gắn cờ)
  add column if not exists flag_reason text;

-- Quét "đã tới hạn chín" phải rẻ.
create index if not exists referrals_pending_mature_idx
  on public.referrals (mature_at) where status = 'pending';
-- Dò STK người trả bị dùng lại (bộ lọc chống farm).
create index if not exists referrals_payer_account_idx
  on public.referrals (referrer_id, payer_account_number)
  where payer_account_number is not null;

-- ---------------------------------------------------------------------
-- 3) mature_commissions — chuyển hoa hồng đã tới hạn: pending → available
--
--    Gọi LƯỜI (khi đọc trang "Giới thiệu bạn" và trước khi rút) nên KHÔNG cần cron.
--    p_user_id = null → quét toàn hệ thống (dùng cho cron/admin nếu sau này cần).
--
--    Chống cộng trùng bằng unique index sẵn có commission_ledger(user_id, ref):
--    hai lần quét song song thì lần thứ hai đụng unique_violation và tự bỏ qua.
-- ---------------------------------------------------------------------
create or replace function public.mature_commissions(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_balance integer;
  v_count integer := 0;
begin
  for r in
    select id, referrer_id, commission_amount
      from public.referrals
     where status = 'pending'
       and mature_at is not null
       and mature_at <= now()
       and commission_amount > 0
       and (p_user_id is null or referrer_id = p_user_id)
     order by mature_at
     for update skip locked
  loop
    begin
      update public.profiles
         set commission_pending   = greatest(0, commission_pending - r.commission_amount),
             commission_available = commission_available + r.commission_amount,
             updated_at = now()
       where user_id = r.referrer_id
       returning commission_available into v_balance;
      if not found then
        raise exception 'referrer profile % not found', r.referrer_id;
      end if;

      -- Sổ cái CHỈ ghi ví "đã chín" → bút toán cộng nằm ở đây, không ở lúc phát sinh.
      insert into public.commission_ledger(user_id, delta, reason, ref, balance_after)
      values (r.referrer_id, r.commission_amount, 'confirm', r.id::text, v_balance);

      update public.referrals
         set status = 'confirmed', confirmed_at = now()
       where id = r.id;

      v_count := v_count + 1;
    exception
      when unique_violation then
        -- Đã có bút toán cho lượt này ⇒ tiền đã cộng ở lần quét trước, chỉ là trạng thái
        -- chưa kịp cập nhật. Sửa trạng thái để lần sau không quét lại; KHÔNG cộng lần hai.
        update public.referrals
           set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
         where id = r.id;
      when others then
        raise warning 'mature_commissions bỏ qua referral %: %', r.id, sqlerrm;
    end;
  end loop;

  return v_count;
end
$$;

-- ---------------------------------------------------------------------
-- 4) fulfill_paid_order — thay khối hoa hồng: treo + lọc chống farm
--    Phần cấp gói/credit GIỮ NGUYÊN từ Phase 3, không đụng tới.
-- ---------------------------------------------------------------------
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
  v_hold_days integer;
  v_cap integer;
  v_month_count integer;
  v_status text;
  v_flag text;
  v_mature timestamptz;
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

  -- ── HOA HỒNG MÃ MỜI (Phase 6: treo + lọc) ──────────────────────────
  -- BỌC EXCEPTION như Phase 3: lỗi ở khâu hoa hồng TUYỆT ĐỐI không được làm hỏng
  -- việc cấp gói cho khách đã trả tiền.
  if v_order.referrer_id is not null
     and v_order.plan_code is not null
     and v_order.referrer_id <> v_order.user_id            -- chặn tự-refer cùng account
  then
    begin
      if not exists (select 1 from public.referrals where invitee_id = v_order.user_id) then
        v_commission := round(v_order.amount::numeric * 0.60)::integer;
        v_hold_days  := public.referral_config('referral_hold_days', 7);
        v_cap        := public.referral_config('referral_monthly_cap', 10);
        v_status     := 'pending';
        v_flag       := null;

        select count(*) into v_month_count
          from public.referrals
         where referrer_id = v_order.referrer_id
           and created_at >= date_trunc('month', now());

        if p_counter_account_number is not null and exists (
             select 1 from public.payout_accounts pa
              where pa.user_id = v_order.referrer_id
                and pa.account_number = p_counter_account_number
           ) then
          -- Người TRẢ tiền và người NHẬN hoa hồng dùng chung một tài khoản ngân hàng
          -- ⇒ cùng một con người. Từ chối thẳng, không hoa hồng.
          v_status := 'rejected';
          v_flag   := 'payer_is_referrer_bank_account';
          v_commission := 0;

        elsif p_counter_account_number is not null and exists (
             select 1 from public.referrals r
              where r.referrer_id = v_order.referrer_id
                and r.payer_account_number = p_counter_account_number
           ) then
          -- Cùng một STK trả cho nhiều "người được mời" của cùng người mời ⇒ dấu hiệu farm.
          v_status := 'flagged';
          v_flag   := 'payer_account_reused';

        elsif v_month_count >= v_cap then
          v_status := 'flagged';
          v_flag   := 'monthly_cap_exceeded';
        end if;

        -- 'pending' mới có mốc chín. 'flagged' treo vô hạn tới khi admin duyệt.
        v_mature := case when v_status = 'pending'
                         then now() + (v_hold_days || ' days')::interval
                         else null end;

        if v_commission > 0 then
          -- Vào ví TREO, KHÔNG vào ví rút được. Bút toán sổ cái sẽ ghi lúc CHÍN.
          update public.profiles
             set commission_pending = commission_pending + v_commission,
                 updated_at = now()
           where user_id = v_order.referrer_id;
          if not found then
            raise exception 'referrer profile % not found', v_order.referrer_id;
          end if;
        end if;

        insert into public.referrals(
          referrer_id, invitee_id, code, order_code, status,
          discount_amount, commission_amount, confirmed_at,
          payer_account_number, payer_account_bank, mature_at, flag_reason
        ) values (
          v_order.referrer_id, v_order.user_id, coalesce(v_order.referral_code, ''), p_order_code, v_status,
          coalesce(v_order.discount_amount, 0), v_commission, null,
          p_counter_account_number, p_counter_account_name, v_mature, v_flag
        );
      end if;
    exception when others then
      raise warning 'commission skipped for order %: %', p_order_code, sqlerrm;
    end;
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

-- ---------------------------------------------------------------------
-- 5) request_withdrawal — chín trước, rồi mới kiểm ngưỡng tối thiểu
-- ---------------------------------------------------------------------
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
  v_min integer;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'err', 'invalid_amount');
  end if;

  select * into v_account from public.payout_accounts where user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'err', 'no_account');
  end if;

  -- Chín các khoản đã tới hạn TRƯỚC khi khoá dòng profile, để người dùng không phải
  -- chờ tới lần mở trang sau mới rút được.
  perform public.mature_commissions(p_user_id);

  v_min := public.referral_config('referral_min_withdrawal', 100000);
  if p_amount < v_min then
    return jsonb_build_object('ok', false, 'err', 'below_min', 'min', v_min);
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

-- ---------------------------------------------------------------------
-- 6) review_referral — admin xử lượt bị gắn cờ (hoặc thu hồi lượt đã chín)
--    'approve' → cho chín NGAY (bỏ qua thời gian treo).
--    'reject'  → thu hồi. Tiền đang treo thì trừ ở treo (không có bút toán, vì nó
--                chưa từng vào ví rút được); đã chín rồi thì trừ ở ví + ghi 'clawback'.
--                Nếu người mời đã rút mất thì chỉ thu hồi được phần còn lại —
--                trả về `recovered` để admin biết còn thiếu bao nhiêu.
-- ---------------------------------------------------------------------
create or replace function public.review_referral(
  p_referral_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.referrals;
  v_balance integer;
  v_take integer;
begin
  if p_action not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'err', 'invalid_action');
  end if;

  select * into v_r from public.referrals where id = p_referral_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'err', 'not_found');
  end if;

  if p_action = 'approve' then
    if v_r.status not in ('pending', 'flagged') then
      return jsonb_build_object('ok', false, 'err', 'not_reviewable', 'status', v_r.status);
    end if;

    update public.profiles
       set commission_pending   = greatest(0, commission_pending - v_r.commission_amount),
           commission_available = commission_available + v_r.commission_amount,
           updated_at = now()
     where user_id = v_r.referrer_id
     returning commission_available into v_balance;
    if not found then
      return jsonb_build_object('ok', false, 'err', 'referrer_not_found');
    end if;

    -- KHÔNG dùng `on conflict do nothing`: nếu lượt này đã có bút toán 'confirm' thì
    -- ta vừa cộng ví lần thứ hai — phải để lỗi nổ ra và cuộn ngược, chứ không nuốt im.
    insert into public.commission_ledger(user_id, delta, reason, ref, balance_after)
    values (v_r.referrer_id, v_r.commission_amount, 'confirm', v_r.id::text, v_balance);

    update public.referrals
       set status = 'confirmed', confirmed_at = now(), mature_at = null,
           note = coalesce(p_note, note)
     where id = p_referral_id;

    return jsonb_build_object('ok', true, 'status', 'confirmed', 'amount', v_r.commission_amount);
  end if;

  -- reject / thu hồi
  if v_r.status = 'clawed_back' then
    return jsonb_build_object('ok', false, 'err', 'already_resolved', 'status', v_r.status);
  end if;

  if v_r.status in ('pending', 'flagged') then
    update public.profiles
       set commission_pending = greatest(0, commission_pending - v_r.commission_amount),
           updated_at = now()
     where user_id = v_r.referrer_id;
    v_take := v_r.commission_amount;
  elsif v_r.status = 'confirmed' then
    select least(coalesce(commission_available, 0), v_r.commission_amount) into v_take
      from public.profiles where user_id = v_r.referrer_id for update;
    v_take := coalesce(v_take, 0);
    if v_take > 0 then
      update public.profiles
         set commission_available = commission_available - v_take, updated_at = now()
       where user_id = v_r.referrer_id
       returning commission_available into v_balance;
      insert into public.commission_ledger(user_id, delta, reason, ref, balance_after)
      values (v_r.referrer_id, -v_take, 'clawback', v_r.id::text || ':clawback', v_balance);
    end if;
  else
    v_take := 0;
  end if;

  update public.referrals
     set status = 'clawed_back', note = coalesce(p_note, note)
   where id = p_referral_id;

  return jsonb_build_object(
    'ok', true, 'status', 'clawed_back',
    'amount', v_r.commission_amount, 'recovered', coalesce(v_take, 0)
  );
end
$$;

revoke all on function public.review_referral(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_referral(uuid, text, text)
  to service_role;

revoke all on function public.mature_commissions(uuid)
  from public, anon, authenticated;
grant execute on function public.mature_commissions(uuid)
  to service_role;

commit;

-- =====================================================================
-- CÒN LẠI (chưa làm ở Phase 6, ghi ra để không quên):
--   • Xác minh SĐT người được mời (OTP) — rào chắn mạnh nhất, cần dịch vụ SMS.
--     Cột referrals.invitee_phone + unique index đã dựng sẵn từ Phase 0.
--   • Đối chiếu TÊN chủ tài khoản với tên người mời khi thêm STK
--     (payout_accounts.verified_at hiện được đặt mà KHÔNG xác minh gì).
-- =====================================================================
