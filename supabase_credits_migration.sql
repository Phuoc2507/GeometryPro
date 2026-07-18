-- =====================================================================
-- Geo3D — Ví credit & gói cước (migration)
-- Chạy trong Supabase SQL Editor. An toàn chạy lại (idempotent).
-- Nguồn sự thật về TIỀN + credit-cấp-mỗi-kỳ nằm ở bảng `plans`.
-- Chính sách "mỗi gói mở khoá gì" (quota/credit) nằm ở api/_lib/entitlements.js.
-- =====================================================================

-- 1) Danh mục gói -----------------------------------------------------
create table if not exists public.plans (
  code              text primary key,
  tier              text        not null,   -- 'free' | 'teacher' | 'pro' | 'school'
  name              text        not null,
  price_vnd         integer     not null,
  duration_days     integer     not null,   -- thời hạn subscription (0 = free/vô hạn)
  credits_per_cycle integer     not null,   -- credit cấp mỗi chu kỳ
  cycle_days        integer     not null,   -- 30 | 365 (free = 0, không dùng)
  active            boolean     not null default true
);

insert into public.plans (code, tier, name, price_vnd, duration_days, credits_per_cycle, cycle_days) values
  ('free',       'free',    'Miễn phí',                0,      0,   0,    0),
  ('teacher_1m', 'teacher', 'Giáo viên · 1 tháng',     79000,  30,  200,  30),
  ('teacher_3m', 'teacher', 'Giáo viên · 3 tháng',     199000, 90,  200,  30),
  ('pro_1m',     'pro',     'Chuyên nghiệp · 1 tháng', 149000, 30,  600,  30),
  ('school_1y',  'school',  'Trường học · 1 năm',      999000, 365, 5000, 365)
on conflict (code) do update set
  tier=excluded.tier, name=excluded.name, price_vnd=excluded.price_vnd,
  duration_days=excluded.duration_days, credits_per_cycle=excluded.credits_per_cycle,
  cycle_days=excluded.cycle_days, active=true;

-- Giá lẻ (credit mua rời) để 1 chỗ cho client đọc.
create table if not exists public.pricing_config (
  key   text primary key,
  value integer not null
);
insert into public.pricing_config (key, value) values ('credit_price_vnd', 500)
on conflict (key) do update set value=excluded.value;

alter table public.plans          enable row level security;
alter table public.pricing_config enable row level security;
drop policy if exists "plans readable by all" on public.plans;
drop policy if exists "pricing readable by all" on public.pricing_config;
create policy "plans readable by all"   on public.plans          for select using (true);
create policy "pricing readable by all" on public.pricing_config for select using (true);

-- 2) Cột ví trên profiles --------------------------------------------
alter table public.profiles
  add column if not exists plan_tier         text        not null default 'free',
  add column if not exists plan_code         text        not null default 'free',
  add column if not exists plan_credits      integer     not null default 0,
  add column if not exists credits_reset_at  timestamptz not null default now(),
  add column if not exists purchased_credits integer     not null default 0;
-- plan_type / plan_expires_at đã có từ migration cũ.

-- RLS: chặn client tự sửa gói/ví (mở rộng policy "non-plan" cũ).
drop policy if exists "Users can update non-plan fields" on public.profiles;
create policy "Users can update non-plan fields" on public.profiles
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and plan_type         is not distinct from (select p.plan_type         from public.profiles p where p.user_id = auth.uid())
  and plan_tier         is not distinct from (select p.plan_tier         from public.profiles p where p.user_id = auth.uid())
  and plan_code         is not distinct from (select p.plan_code         from public.profiles p where p.user_id = auth.uid())
  and plan_expires_at   is not distinct from (select p.plan_expires_at   from public.profiles p where p.user_id = auth.uid())
  and plan_credits      is not distinct from (select p.plan_credits      from public.profiles p where p.user_id = auth.uid())
  and purchased_credits is not distinct from (select p.purchased_credits from public.profiles p where p.user_id = auth.uid())
);

-- 3) Bộ đếm quota (gói free) -----------------------------------------
create table if not exists public.usage_counters (
  user_id      uuid        not null references public.profiles(user_id) on delete cascade,
  feature      text        not null,   -- 'draw' | 'solve' | 'export_image' | 'export_tikz'
  window_start timestamptz not null default now(),
  used         integer     not null default 0,
  primary key (user_id, feature)
);
alter table public.usage_counters enable row level security;
drop policy if exists "usage readable by owner" on public.usage_counters;
create policy "usage readable by owner" on public.usage_counters for select using (auth.uid() = user_id);

-- 4) Sổ cái credit ---------------------------------------------------
create table if not exists public.credit_ledger (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(user_id) on delete cascade,
  delta         integer     not null,   -- âm = tiêu, dương = cấp/mua/hoàn
  reason        text        not null,   -- 'draw_quick'|'draw_detailed'|'solve'|'export_video'|'plan_grant'|'purchase'|'refund'
  ref           text,                   -- order_code / request id ('refund:...' cho hoàn)
  balance_after integer     not null,
  created_at    timestamptz not null default now()
);
-- Idempotency: 1 ref chỉ ghi đúng 1 lần (chống cộng credit 2 lần khi webhook lặp).
create unique index if not exists credit_ledger_ref_uniq
  on public.credit_ledger (user_id, ref) where ref is not null;
alter table public.credit_ledger enable row level security;
drop policy if exists "ledger readable by owner" on public.credit_ledger;
create policy "ledger readable by owner" on public.credit_ledger for select using (auth.uid() = user_id);

-- 5) orders: gắn plan đã mua -----------------------------------------
alter table public.orders add column if not exists plan_code text references public.plans(code);

-- 6) Tier hiệu lực (hạ về free khi hết hạn) --------------------------
-- STABLE (không phải IMMUTABLE): hàm dùng now() nên kết quả đổi theo thời gian;
-- khai IMMUTABLE dễ bị planner cache sai -> tier hết hạn vẫn tính là còn hạn.
create or replace function public.effective_tier(p public.profiles)
returns text language sql stable as $$
  select case
    when p.plan_code = 'free'                       then 'free'
    when p.plan_expires_at is null                  then 'free'
    when p.plan_expires_at <= now()                 then 'free'
    else p.plan_tier
  end;
$$;

-- 7) Trừ credit — ATOMIC (khoá hàng), refill lười, hạ gói hết hạn ----
create or replace function public.spend_credits(
  p_user_id uuid, p_cost int, p_reason text, p_ref text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.profiles; v_plan public.plans;
        v_from_plan int; v_from_purchased int; v_total int;
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

-- 8) Hoàn credit khi AI lỗi (ref riêng 'refund:...' để không đụng unique)
create or replace function public.refund_credits(
  p_user_id uuid, p_amount int, p_ref text
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

-- 9) Cấp credit khi mua gói / nạp lẻ (idempotent theo ref = order_code) --
create or replace function public.grant_credits(
  p_user_id uuid, p_amount int, p_reason text, p_ref text, p_to_purchased boolean default true
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

-- 10) Tiêu quota (gói free) — atomic, cửa sổ trượt theo period ---------
create or replace function public.consume_quota(
  p_user_id uuid, p_feature text, p_max int, p_period_days int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row public.usage_counters;
begin
  -- Đảm bảo có dòng RỒI mới khoá (tránh race lần dùng đầu tiên gây lỗi trùng khoá chính).
  insert into public.usage_counters(user_id, feature, window_start, used)
  values (p_user_id, p_feature, now(), 0)
  on conflict (user_id, feature) do nothing;

  select * into v_row from public.usage_counters
    where user_id = p_user_id and feature = p_feature for update;

  if now() >= v_row.window_start + (p_period_days || ' days')::interval then
    update public.usage_counters set window_start = now(), used = 0
      where user_id = p_user_id and feature = p_feature returning * into v_row;
  end if;

  if v_row.used >= p_max then
    return jsonb_build_object('ok', false, 'err', 'quota_exceeded', 'used', v_row.used, 'max', p_max);
  end if;

  update public.usage_counters set used = used + 1
    where user_id = p_user_id and feature = p_feature returning * into v_row;

  return jsonb_build_object('ok', true, 'used', v_row.used, 'max', p_max);
end $$;

-- 11) BẢO MẬT: chỉ service_role được gọi các hàm ghi. -----------------
-- (Không thì user tự gọi refund_credits/grant_credits để tự cộng credit.)
revoke all on function public.spend_credits(uuid,int,text,text)         from public;
revoke all on function public.refund_credits(uuid,int,text)             from public;
revoke all on function public.grant_credits(uuid,int,text,text,boolean) from public;
revoke all on function public.consume_quota(uuid,text,int,int)          from public;
-- ...nhưng SERVER (service_role) BẮT BUỘC gọi được — nếu không cả hệ credit chết
-- vì revoke from public đã lấy luôn quyền của service_role.
grant execute on function public.spend_credits(uuid,int,text,text)         to service_role;
grant execute on function public.refund_credits(uuid,int,text)             to service_role;
grant execute on function public.grant_credits(uuid,int,text,text,boolean) to service_role;
grant execute on function public.consume_quota(uuid,text,int,int)          to service_role;

-- 12) Backfill user hiện có ------------------------------------------
update public.profiles
   set plan_tier = coalesce(nullif(plan_tier,''), 'free'),
       plan_code = coalesce(nullif(plan_code,''), 'free')
 where plan_code is null or plan_code = '';
