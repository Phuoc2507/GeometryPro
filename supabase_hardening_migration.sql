-- GeometryPro hardening migration.
-- Apply after supabase_credits_fractional_migration.sql.
begin;

-- Anonymous AI quotas. Only irreversible HMAC values are stored.
create table if not exists public.guest_usage_counters (
  scope         text        not null check (scope in ('device', 'ip')),
  subject_hash  text        not null,
  feature       text        not null,
  window_start  timestamptz not null default now(),
  used          integer     not null default 0 check (used >= 0),
  primary key (scope, subject_hash, feature)
);

alter table public.guest_usage_counters enable row level security;
revoke all on table public.guest_usage_counters from public, anon, authenticated;
grant select, insert, update on table public.guest_usage_counters to service_role;

create or replace function public.consume_guest_quota(
  p_subject_hash text,
  p_ip_hash text,
  p_feature text,
  p_max integer,
  p_ip_max integer,
  p_period_days integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.guest_usage_counters;
  v_ip public.guest_usage_counters;
begin
  if p_subject_hash is null or length(p_subject_hash) < 32
     or p_ip_hash is null or length(p_ip_hash) < 32
     or p_feature is null or p_max <= 0 or p_ip_max <= 0 or p_period_days <= 0 then
    return jsonb_build_object('ok', false, 'err', 'invalid_quota_request');
  end if;

  insert into public.guest_usage_counters(scope, subject_hash, feature)
  values ('device', p_subject_hash, p_feature)
  on conflict do nothing;
  insert into public.guest_usage_counters(scope, subject_hash, feature)
  values ('ip', p_ip_hash, p_feature)
  on conflict do nothing;

  select * into v_device
  from public.guest_usage_counters
  where scope = 'device' and subject_hash = p_subject_hash and feature = p_feature
  for update;

  select * into v_ip
  from public.guest_usage_counters
  where scope = 'ip' and subject_hash = p_ip_hash and feature = p_feature
  for update;

  if now() >= v_device.window_start + (p_period_days || ' days')::interval then
    update public.guest_usage_counters
       set window_start = now(), used = 0
     where scope = 'device' and subject_hash = p_subject_hash and feature = p_feature
     returning * into v_device;
  end if;
  if now() >= v_ip.window_start + (p_period_days || ' days')::interval then
    update public.guest_usage_counters
       set window_start = now(), used = 0
     where scope = 'ip' and subject_hash = p_ip_hash and feature = p_feature
     returning * into v_ip;
  end if;

  if v_device.used >= p_max then
    return jsonb_build_object(
      'ok', false, 'err', 'guest_quota_exceeded',
      'used', v_device.used, 'max', p_max, 'window_start', v_device.window_start
    );
  end if;
  if v_ip.used >= p_ip_max then
    return jsonb_build_object(
      'ok', false, 'err', 'guest_ip_quota_exceeded',
      'used', v_ip.used, 'max', p_ip_max, 'window_start', v_ip.window_start
    );
  end if;

  update public.guest_usage_counters
     set used = used + 1
   where scope = 'device' and subject_hash = p_subject_hash and feature = p_feature
   returning * into v_device;
  update public.guest_usage_counters
     set used = used + 1
   where scope = 'ip' and subject_hash = p_ip_hash and feature = p_feature;

  return jsonb_build_object(
    'ok', true, 'used', v_device.used, 'max', p_max,
    'window_start', v_device.window_start
  );
end
$$;

revoke all on function public.consume_guest_quota(text,text,text,integer,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_guest_quota(text,text,text,integer,integer,integer)
  to service_role;

-- Profiles contain private balance/subscription fields. Public profile browsing
-- can later be implemented through a narrow view containing display fields only.
drop policy if exists "Users can view any profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select using (auth.uid() = user_id);

-- Stable order identifiers and an exact snapshot for loose-credit purchases.
alter table public.orders
  add column if not exists credit_amount numeric(12,2),
  add column if not exists fulfilled_at timestamptz;

create sequence if not exists public.order_code_seq
  as bigint minvalue 100000 maxvalue 2147483647 no cycle;

select setval(
  'public.order_code_seq',
  greatest(coalesce((select max(order_code) from public.orders), 100000), 100000),
  exists(select 1 from public.orders)
);

alter table public.orders
  alter column order_code set default nextval('public.order_code_seq');
grant usage, select on sequence public.order_code_seq to service_role;

-- Fulfill an order exactly once. Any exception rolls the profile, ledger and
-- order status back together.
create or replace function public.fulfill_paid_order(p_order_code integer)
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

  return jsonb_build_object(
    'ok', true, 'duplicate', false, 'status', 'paid',
    'kind', case when v_order.plan_code is null then 'credits' else 'plan' end
  );
end
$$;

revoke all on function public.fulfill_paid_order(integer)
  from public, anon, authenticated;
grant execute on function public.fulfill_paid_order(integer)
  to service_role;

commit;
