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
