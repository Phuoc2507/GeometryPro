-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: cho phép credit LẺ (numeric) — phục vụ "sửa bằng AI = 0,2 credit/lần"
-- Áp SAU supabase_credits_migration.sql. An toàn chạy lại nhiều lần (idempotent).
--
-- Đổi 4 cột credit từ integer -> numeric(12,2) và 3 RPC spend/refund/grant sang
-- nhận numeric. Gói nạp (50/100/200/500) vẫn nguyên; chỉ phần TRỪ mới có số lẻ.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Nới cột sang numeric (integer -> numeric là ép rộng, số cũ giữ nguyên) -----
alter table public.profiles
  alter column plan_credits      type numeric(12,2),
  alter column purchased_credits type numeric(12,2);

alter table public.credit_ledger
  alter column delta         type numeric(12,2),
  alter column balance_after type numeric(12,2);

-- 2) Bỏ RPC chữ ký int cũ (create-or-replace KHÔNG đổi được kiểu tham số,
--    nó tạo overload mới -> nhập nhằng; nên phải DROP trước). ------------------
drop function if exists public.spend_credits(uuid, int, text, text);
drop function if exists public.refund_credits(uuid, int, text);
drop function if exists public.grant_credits(uuid, int, text, text, boolean);

-- 3) Tạo lại — tham số + biến nội bộ dùng numeric ----------------------------

-- 3a) Trừ credit — ATOMIC (khoá hàng), refill lười, hạ gói hết hạn
create function public.spend_credits(
  p_user_id uuid, p_cost numeric, p_reason text, p_ref text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.profiles; v_plan public.plans;
        v_from_plan numeric; v_from_purchased numeric; v_total numeric;
begin
  select * into v_p from public.profiles where user_id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'no_profile'); end if;

  -- Hết hạn -> hạ về free (credit gói = 0, giữ purchased).
  if public.effective_tier(v_p) = 'free' and v_p.plan_code <> 'free' then
    update public.profiles
       set plan_code='free', plan_tier='free', plan_type='free',
           plan_credits=0, credits_reset_at=now()
     where user_id = p_user_id returning * into v_p;
  end if;

  select * into v_plan from public.plans where code = v_p.plan_code;

  -- Refill lười theo chu kỳ (chỉ gói trả phí còn hạn).
  if v_p.plan_code <> 'free' and coalesce(v_plan.cycle_days,0) > 0
     and now() >= v_p.credits_reset_at + (v_plan.cycle_days || ' days')::interval then
    update public.profiles
       set plan_credits = v_plan.credits_per_cycle, credits_reset_at = now()
     where user_id = p_user_id returning * into v_p;
  end if;

  v_total := v_p.plan_credits + v_p.purchased_credits;
  if v_total < p_cost then
    return jsonb_build_object('ok', false, 'err', 'insufficient', 'remaining', v_total);
  end if;

  -- Trừ credit-gói trước, credit-mua (bằng tiền) sau.
  v_from_plan      := least(v_p.plan_credits, p_cost);
  v_from_purchased := p_cost - v_from_plan;

  update public.profiles
     set plan_credits      = plan_credits - v_from_plan,
         purchased_credits = purchased_credits - v_from_purchased
   where user_id = p_user_id returning * into v_p;

  insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
  values (p_user_id, -p_cost, p_reason, p_ref, v_p.plan_credits + v_p.purchased_credits);

  return jsonb_build_object('ok', true,
    'remaining', v_p.plan_credits + v_p.purchased_credits,
    'plan_credits', v_p.plan_credits, 'purchased_credits', v_p.purchased_credits);
end $$;

-- 3b) Hoàn credit khi AI lỗi (ref riêng 'refund:...' để không đụng unique)
create function public.refund_credits(
  p_user_id uuid, p_amount numeric, p_ref text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.profiles;
begin
  select * into v_p from public.profiles where user_id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false); end if;
  -- Hoàn vào purchased để không bị reset chu kỳ nuốt mất.
  update public.profiles set purchased_credits = purchased_credits + p_amount
   where user_id = p_user_id returning * into v_p;
  insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
  values (p_user_id, p_amount, 'refund', 'refund:'||p_ref, v_p.plan_credits + v_p.purchased_credits)
  on conflict (user_id, ref) where ref is not null do nothing;   -- khớp PARTIAL index; hoàn 2 lần cùng ref = no-op
  return jsonb_build_object('ok', true, 'remaining', v_p.plan_credits + v_p.purchased_credits);
end $$;

-- 3c) Cấp credit khi mua gói / nạp lẻ (idempotent theo ref = order_code)
create function public.grant_credits(
  p_user_id uuid, p_amount numeric, p_reason text, p_ref text, p_to_purchased boolean default true
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.profiles; v_exists int;
begin
  select * into v_p from public.profiles where user_id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'no_profile'); end if;

  -- Đã cấp cho ref này rồi thì thôi (webhook PayOS có thể bắn lặp). Kiểm SAU khi khoá
  -- hàng để 2 webhook trùng không cùng vượt qua rồi cùng cấp.
  select 1 into v_exists from public.credit_ledger
    where user_id = p_user_id and ref = p_ref limit 1;
  if found then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  if p_to_purchased then
    update public.profiles set purchased_credits = purchased_credits + p_amount
      where user_id = p_user_id returning * into v_p;
  else
    update public.profiles set plan_credits = plan_credits + p_amount, credits_reset_at = now()
      where user_id = p_user_id returning * into v_p;
  end if;

  insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
  values (p_user_id, p_amount, p_reason, p_ref, v_p.plan_credits + v_p.purchased_credits);

  return jsonb_build_object('ok', true, 'remaining', v_p.plan_credits + v_p.purchased_credits);
end $$;

-- 4) Cấp lại quyền (DROP làm mất grant cũ) — chỉ service_role được gọi -------
revoke all on function public.spend_credits(uuid,numeric,text,text)         from public, anon, authenticated;
revoke all on function public.refund_credits(uuid,numeric,text)             from public, anon, authenticated;
revoke all on function public.grant_credits(uuid,numeric,text,text,boolean) from public, anon, authenticated;

grant execute on function public.spend_credits(uuid,numeric,text,text)         to service_role;
grant execute on function public.refund_credits(uuid,numeric,text)             to service_role;
grant execute on function public.grant_credits(uuid,numeric,text,text,boolean) to service_role;
