-- ═══════════════════════════════════════════════════════════════════════════
-- GỘP CÁC MIGRATION CÒN LẠI — dán 1 lần vào Supabase → SQL Editor → Run.
-- Tất cả đều IDEMPOTENT (chạy lại nhiều lần vẫn an toàn), nên dù bạn đã áp
-- một phần trước đó thì chạy nguyên file này vẫn cho ra trạng thái đúng.
-- Yêu cầu: đã áp các migration 23/07 (credits) trước — nếu app đang chạy
-- được đăng nhập + hiện credit thì tức là đã có.
-- Thứ tự: hardening → quota_refund → account_deletion → plan_rename →
--         admin_role → problem_reports_feedback  (khu QUẢN TRỊ, thêm mới).
-- LƯU Ý: sau khi chạy xong, mở phần 5/6 và BỎ CHÚ THÍCH câu CẤP QUYỀN ADMIN
--        (thay email của bạn) để tài khoản bạn trở thành quản trị viên.
-- ═══════════════════════════════════════════════════════════════════════════

-- ┌─── 1/6 · supabase_hardening_migration.sql ───────────────────────────────
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

-- ┌─── 2/6 · supabase_quota_refund_migration.sql ────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Hoàn 1 lượt QUOTA (free / khách) khi AI lỗi phía server
-- Áp SAU supabase_hardening_migration.sql. Idempotent, chỉ service_role gọi được.
--
-- Trước đây: khi model lỗi, route hoàn CREDIT (gói trả phí) nhưng KHÔNG hoàn lượt
-- quota miễn phí (user free) hay lượt dùng thử (khách) → người dùng mất oan 1 lượt.
-- Hai RPC dưới trả lại 1 lượt (giảm used, sàn 0). aiAccess.refundAiUsage gọi chúng.
-- ═══════════════════════════════════════════════════════════════════════════
begin;

-- Hoàn lượt quota của TÀI KHOẢN (gói free) ---------------------------------------
create or replace function public.refund_quota(p_user_id uuid, p_feature text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.usage_counters;
begin
  update public.usage_counters
     set used = greatest(0, used - 1)
   where user_id = p_user_id and feature = p_feature
   returning * into v_row;
  return jsonb_build_object('ok', found, 'used', coalesce(v_row.used, 0));
end $$;

-- Hoàn lượt dùng thử của KHÁCH (giảm cả bộ đếm thiết bị lẫn IP) -------------------
create or replace function public.refund_guest_quota(p_subject_hash text, p_ip_hash text, p_feature text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.guest_usage_counters set used = greatest(0, used - 1)
   where scope = 'device' and subject_hash = p_subject_hash and feature = p_feature;
  update public.guest_usage_counters set used = greatest(0, used - 1)
   where scope = 'ip' and subject_hash = p_ip_hash and feature = p_feature;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.refund_quota(uuid,text)              from public, anon, authenticated;
revoke all on function public.refund_guest_quota(text,text,text)   from public, anon, authenticated;
grant execute on function public.refund_quota(uuid,text)            to service_role;
grant execute on function public.refund_guest_quota(text,text,text) to service_role;

commit;

-- ┌─── 3/6 · supabase_account_deletion_migration.sql ────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Ẩn danh hoá hồ sơ tài chính khi xoá tài khoản (thay vì xoá cứng)
-- Áp SAU supabase_hardening_migration.sql. An toàn chạy lại nhiều lần (idempotent).
--
-- Mục tiêu: khi người dùng xoá tài khoản, GIỮ LẠI `orders` và `credit_ledger`
-- (hồ sơ thanh toán — cần cho hoàn tiền/đối soát/kế toán theo luật VN), nhưng
-- CẮT LIÊN KẾT tới người dùng: user_id → NULL (ẩn danh).
--
-- Cách làm: đổi khoá ngoại user_id của 2 bảng từ ON DELETE CASCADE sang
-- ON DELETE SET NULL, và cho phép cột NULL. Endpoint api/delete-account.js đã
-- ngừng xoá cứng 2 bảng này; khi nó xoá `profiles` và bản ghi auth.users, khoá
-- ngoại SET NULL sẽ tự ẩn danh các hàng còn lại.
--
-- Bọc trong transaction: lỗi giữa chừng → không áp gì.
-- ═══════════════════════════════════════════════════════════════════════════
begin;

-- 1) orders.user_id: cho NULL + đổi FK (→ profiles.user_id) sang ON DELETE SET NULL ----
alter table public.orders alter column user_id drop not null;

do $$
declare fk_name text;
begin
  -- Tìm & bỏ mọi FK hiện có trên cột orders.user_id (tên có thể khác nhau giữa các môi trường).
  for fk_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.orders'::regclass
      and con.contype = 'f'
      and att.attname = 'user_id'
  loop
    execute format('alter table public.orders drop constraint %I', fk_name);
  end loop;
end $$;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references public.profiles(user_id) on delete set null;

-- 2) credit_ledger.user_id: cho NULL + đổi FK (→ auth.users) sang ON DELETE SET NULL ----
alter table public.credit_ledger alter column user_id drop not null;

do $$
declare fk_name text;
begin
  for fk_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.credit_ledger'::regclass
      and con.contype = 'f'
      and att.attname = 'user_id'
  loop
    execute format('alter table public.credit_ledger drop constraint %I', fk_name);
  end loop;
end $$;

alter table public.credit_ledger
  add constraint credit_ledger_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- Ghi chú: RLS "chỉ chủ đọc" (auth.uid() = user_id) khiến hàng đã ẩn danh (user_id NULL)
-- không ai đọc được qua client — chỉ service_role thấy, đúng ý đồ lưu trữ nội bộ.

commit;

-- ┌─── 4/6 · supabase_plan_rename_migration.sql ─────────────────────────────
-- ════════════════════════════════════════════════════════════════════════════
-- Đổi TÊN gói sang trung tính (theo dung lượng credit), bỏ tên theo vai trò.
-- Mục tiêu: một ví credit dùng chung cho cả Học sinh & Giáo viên — đổi mode
-- không mất phí. Chỉ đổi cột `name` hiển thị; KHÔNG đổi `code`/`tier`/giá/credit
-- để không ảnh hưởng thanh toán, cấp credit, hay các đơn đã tạo.
--
-- Cách dùng: mở Supabase → SQL Editor → dán toàn bộ file này → Run.
-- ════════════════════════════════════════════════════════════════════════════

update public.plans set name = 'Cơ bản · 1 tháng'       where code = 'teacher_1m';
update public.plans set name = 'Cơ bản · 3 tháng'       where code = 'teacher_3m';
update public.plans set name = 'Chuyên nghiệp · 1 tháng' where code = 'pro_1m';
update public.plans set name = 'Trường học · 1 năm'      where code = 'school_1y';

-- Kiểm tra lại:
-- select code, tier, name, price_vnd, credits_per_cycle from public.plans order by price_vnd;

-- ┌─── 5/6 · supabase_admin_role_migration.sql ──────────────────────────────
-- Phân quyền QUẢN TRỊ VIÊN: cột `role` trên profiles + hàm is_admin() cho RLS.
-- (Các bảng "bài lỗi"/"feedback" ở phần 6/6 sẽ chỉ cho admin đọc bằng hàm này.)
begin;

-- 1) Cột vai trò: 'user' (mặc định) hoặc 'admin'.
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- 2) Hàm kiểm tra admin — dùng trong RLS của các bảng quản trị.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = uid and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

commit;

-- ► CẤP QUYỀN ADMIN cho tài khoản đầu tiên: BỎ CHÚ THÍCH 2 dòng dưới, thay email,
--   rồi Run riêng câu này (chạy SAU khi bạn đã đăng nhập ít nhất 1 lần).
-- update public.profiles set role = 'admin'
--   where user_id = (select id from auth.users where email = 'phuocphuoc2507@gmail.com');
--
-- Kiểm tra: select p.role, u.email from public.profiles p
--   join auth.users u on u.id = p.user_id where p.role = 'admin';

-- ┌─── 6/6 · supabase_problem_reports_feedback_migration.sql ─────────────────
-- Bảng "bài lỗi" (problem_reports) & "feedback người dùng" (user_feedback).
-- CẦN phần 5/6 (hàm is_admin) đứng trước. Chỉ ADMIN đọc/sửa; server ghi bài lỗi
-- bằng service_role; người dùng đăng nhập tự gửi feedback (owner-check).
begin;

-- ── problem_reports — máy vẽ SAI / KHÔNG vẽ được (server tự bắt) ──────────────
create table if not exists public.problem_reports (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references auth.users(id) on delete cascade,
  endpoint       text        not null,
  mode           text,
  prompt         text,
  prompt_len     integer,
  image_provided boolean     not null default false,
  ai_json        jsonb,
  error_message  text,
  error_stage    text,
  model          text,
  duration_ms    integer,
  status         text        not null default 'mới'
                   check (status in ('mới', 'đang xem', 'đã sửa', 'bỏ qua')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.problem_reports enable row level security;

revoke all on table public.problem_reports from public, anon, authenticated;
grant  select, update on table public.problem_reports to authenticated;
grant  select, insert, update, delete on table public.problem_reports to service_role;

drop policy if exists "problem_reports admin read"   on public.problem_reports;
drop policy if exists "problem_reports admin update" on public.problem_reports;
create policy "problem_reports admin read"   on public.problem_reports
  for select using (public.is_admin());
create policy "problem_reports admin update" on public.problem_reports
  for update using (public.is_admin()) with check (public.is_admin());

create index if not exists problem_reports_status_created_idx
  on public.problem_reports (status, created_at desc);
create index if not exists problem_reports_endpoint_idx
  on public.problem_reports (endpoint);
create index if not exists problem_reports_user_idx
  on public.problem_reports (user_id) where user_id is not null;

-- ── user_feedback — người dùng CHỦ ĐỘNG gửi góp ý / báo lỗi ───────────────────
create table if not exists public.user_feedback (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  kind              text        not null default 'góp ý'
                      check (kind in ('lỗi', 'góp ý', 'khác')),
  message           text        not null,
  saved_geometry_id uuid        references public.saved_geometries(id) on delete set null,
  geometry_snapshot jsonb,
  prompt            text,
  page_path         text,
  status            text        not null default 'mới'
                      check (status in ('mới', 'đang xem', 'đã sửa', 'bỏ qua')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

revoke all on table public.user_feedback from public, anon, authenticated;
grant  select, insert, update on table public.user_feedback to authenticated;
grant  select, insert, update, delete on table public.user_feedback to service_role;

drop policy if exists "user_feedback insert own"  on public.user_feedback;
drop policy if exists "user_feedback admin read"   on public.user_feedback;
drop policy if exists "user_feedback admin update" on public.user_feedback;
create policy "user_feedback insert own" on public.user_feedback
  for insert with check (auth.uid() = user_id);
create policy "user_feedback admin read" on public.user_feedback
  for select using (public.is_admin());
create policy "user_feedback admin update" on public.user_feedback
  for update using (public.is_admin()) with check (public.is_admin());

create index if not exists user_feedback_status_created_idx
  on public.user_feedback (status, created_at desc);
create index if not exists user_feedback_kind_idx
  on public.user_feedback (kind);
create index if not exists user_feedback_user_idx
  on public.user_feedback (user_id);

commit;
