-- supabase_teams_migration.sql
-- GHẾ CHO TỔ TOÁN (multi-seat): 1 chủ tổ + tới N giáo viên, mỗi người ví 2000/tháng.
-- Thêm thành viên bằng EMAIL (GV đã có tài khoản) — không cần hạ tầng gửi mail.
-- Chạy trong Supabase SQL editor (service role). An toàn chạy lại (idempotent).

begin;

-- 1) Số ghế theo gói (group_1y = 5, còn lại = 1).
alter table public.plans add column if not exists seats integer not null default 1;
update public.plans set seats = 5 where code = 'group_1y';

-- 2) Bảng tổ + thành viên -----------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references auth.users(id) on delete cascade,
  plan_code  text not null,
  seat_limit integer not null default 5,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id  uuid not null references public.teams(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null default 'member' check (role in ('owner','member')),
  added_at timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (user_id)   -- một người chỉ thuộc 1 tổ
);

alter table public.teams        enable row level security;
alter table public.team_members enable row level security;

-- Chỉ ĐỌC: chủ tổ + thành viên thấy tổ của mình. Mọi thay đổi qua RPC security-definer.
drop policy if exists "team readable by members" on public.teams;
create policy "team readable by members" on public.teams for select using (
  owner_id = auth.uid()
  or id in (select tm.team_id from public.team_members tm where tm.user_id = auth.uid())
);
drop policy if exists "members readable by team" on public.team_members;
create policy "members readable by team" on public.team_members for select using (
  user_id = auth.uid()
  or team_id in (select t.id from public.teams t where t.owner_id = auth.uid())
);

-- 3) fulfill_paid_order: khi mua gói có seats>1 → tạo/gia hạn tổ + đưa người mua làm CHỦ.
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
  v_team_id uuid;
  v_ref text := p_order_code::text;
begin
  select * into v_order from public.orders where order_code = p_order_code for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'order_not_found'); end if;
  if v_order.status = 'paid' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'paid'); end if;
  if coalesce(v_order.status, 'pending') <> 'pending' then
    return jsonb_build_object('ok', false, 'err', 'invalid_order_status', 'status', v_order.status);
  end if;

  select * into v_profile from public.profiles where user_id = v_order.user_id for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'profile_not_found'); end if;

  if exists (select 1 from public.credit_ledger where user_id = v_order.user_id and ref = v_ref) then
    update public.orders set status = 'paid', fulfilled_at = now(), updated_at = now() where order_code = p_order_code;
    return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'paid');
  end if;

  if v_order.plan_code is null then
    select value into v_credit_price from public.pricing_config where key = 'credit_price_vnd';
    v_credit_amount := coalesce(v_order.credit_amount, round(v_order.amount::numeric / nullif(v_credit_price, 0), 2));
    if v_credit_amount is null or v_credit_amount <= 0 then
      return jsonb_build_object('ok', false, 'err', 'invalid_credit_amount');
    end if;
    update public.profiles set purchased_credits = purchased_credits + v_credit_amount, updated_at = now()
      where user_id = v_order.user_id returning * into v_profile;
    insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
      values (v_order.user_id, v_credit_amount, 'purchase', v_ref, v_profile.plan_credits + v_profile.purchased_credits);
  else
    select * into v_plan from public.plans where code = v_order.plan_code;
    if not found then return jsonb_build_object('ok', false, 'err', 'plan_not_found'); end if;

    v_expiry := greatest(now(), coalesce(v_profile.plan_expires_at, now())) + (v_plan.duration_days || ' days')::interval;

    update public.profiles
       set plan_type = v_plan.tier, plan_tier = v_plan.tier, plan_code = v_plan.code,
           plan_expires_at = v_expiry, plan_credits = v_plan.credits_per_cycle,
           credits_reset_at = now(), updated_at = now()
     where user_id = v_order.user_id returning * into v_profile;

    insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
      values (v_order.user_id, v_plan.credits_per_cycle, 'plan_grant', v_ref, v_profile.plan_credits + v_profile.purchased_credits);

    -- Gói nhiều ghế → tạo/gia hạn tổ, người mua là CHỦ (chiếm 1 ghế).
    if coalesce(v_plan.seats, 1) > 1 then
      insert into public.teams(owner_id, plan_code, seat_limit, expires_at)
        values (v_order.user_id, v_plan.code, v_plan.seats, v_expiry)
        on conflict (owner_id) do update
          set plan_code = excluded.plan_code, seat_limit = excluded.seat_limit, expires_at = excluded.expires_at
        returning id into v_team_id;
      insert into public.team_members(team_id, user_id, role)
        values (v_team_id, v_order.user_id, 'owner')
        on conflict (user_id) do update set team_id = excluded.team_id, role = 'owner', added_at = now();
    end if;
  end if;

  update public.orders set status = 'paid', fulfilled_at = now(), updated_at = now() where order_code = p_order_code;
  return jsonb_build_object('ok', true, 'duplicate', false, 'status', 'paid',
    'kind', case when v_order.plan_code is null then 'credits' else 'plan' end);
end $$;

revoke all on function public.fulfill_paid_order(integer) from public, anon, authenticated;
grant execute on function public.fulfill_paid_order(integer) to service_role;

-- 4) RPC: thông tin tổ + danh sách thành viên (chủ tổ & thành viên đều xem được) ----
create or replace function public.team_get()
returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare v_team public.teams; v_members jsonb;
begin
  select t.* into v_team from public.teams t
   where t.owner_id = auth.uid()
      or t.id in (select tm.team_id from public.team_members tm where tm.user_id = auth.uid())
   limit 1;
  if not found then return jsonb_build_object('ok', true, 'team', null); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', m.user_id, 'role', m.role, 'email', u.email,
           'plan_credits', p.plan_credits, 'purchased_credits', p.purchased_credits
         ) order by (m.role = 'owner') desc, m.added_at), '[]'::jsonb)
    into v_members
    from public.team_members m
    left join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
   where m.team_id = v_team.id;

  return jsonb_build_object('ok', true, 'team', jsonb_build_object(
    'id', v_team.id, 'seat_limit', v_team.seat_limit, 'expires_at', v_team.expires_at,
    'is_owner', v_team.owner_id = auth.uid(),
    'members', v_members));
end $$;

-- 5) RPC: chủ tổ THÊM thành viên bằng email (GV đã có tài khoản) -------------------
create or replace function public.team_add_member(p_email text)
returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare v_team public.teams; v_target uuid; v_used int; v_credits numeric;
begin
  select * into v_team from public.teams where owner_id = auth.uid();
  if not found then return jsonb_build_object('ok', false, 'err', 'not_owner'); end if;
  if v_team.expires_at is not null and v_team.expires_at <= now() then
    return jsonb_build_object('ok', false, 'err', 'expired'); end if;

  select count(*) into v_used from public.team_members where team_id = v_team.id;
  if v_used >= v_team.seat_limit then return jsonb_build_object('ok', false, 'err', 'full'); end if;

  select id into v_target from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_target is null then return jsonb_build_object('ok', false, 'err', 'user_not_found'); end if;
  if v_target = auth.uid() then return jsonb_build_object('ok', false, 'err', 'is_owner'); end if;
  if exists (select 1 from public.team_members where user_id = v_target) then
    return jsonb_build_object('ok', false, 'err', 'already_in_team'); end if;

  insert into public.team_members(team_id, user_id, role) values (v_team.id, v_target, 'member');

  -- Cấp entitlement cho thành viên = gói của tổ (tier pro, credit mỗi kỳ, hạn = hạn tổ).
  select credits_per_cycle into v_credits from public.plans where code = v_team.plan_code;
  update public.profiles
     set plan_type = 'pro', plan_tier = 'pro', plan_code = v_team.plan_code,
         plan_expires_at = v_team.expires_at, plan_credits = coalesce(v_credits, 0),
         credits_reset_at = now(), updated_at = now()
   where user_id = v_target;

  insert into public.credit_ledger(user_id, delta, reason, ref, balance_after)
    values (v_target, coalesce(v_credits, 0), 'team_grant', 'team:'||v_team.id::text, coalesce(v_credits, 0));

  return jsonb_build_object('ok', true);
end $$;

-- 6) RPC: chủ tổ GỠ thành viên (thành viên về free, giữ credit nạp lẻ) --------------
create or replace function public.team_remove_member(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_team public.teams;
begin
  select * into v_team from public.teams where owner_id = auth.uid();
  if not found then return jsonb_build_object('ok', false, 'err', 'not_owner'); end if;
  if p_user_id = auth.uid() then return jsonb_build_object('ok', false, 'err', 'cannot_remove_owner'); end if;

  delete from public.team_members where team_id = v_team.id and user_id = p_user_id and role = 'member';
  if not found then return jsonb_build_object('ok', false, 'err', 'not_member'); end if;

  -- Về free; KHÔNG đụng purchased_credits (credit nạp lẻ).
  update public.profiles
     set plan_type = 'free', plan_tier = 'free', plan_code = 'free',
         plan_credits = 0, plan_expires_at = null, credits_reset_at = now(), updated_at = now()
   where user_id = p_user_id;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.team_get()                from public, anon;
revoke all on function public.team_add_member(text)     from public, anon;
revoke all on function public.team_remove_member(uuid)  from public, anon;
grant execute on function public.team_get()               to authenticated;
grant execute on function public.team_add_member(text)    to authenticated;
grant execute on function public.team_remove_member(uuid) to authenticated;

commit;
