-- =====================================================================
-- Kiểm chứng RÀO CHẮN mã mời (Phase 6) trên Postgres THẬT.
--
-- Vì sao cần file này: toàn bộ logic tiền hoa hồng nằm trong plpgsql, mà vitest
-- không chạm tới được. Không có nó thì rào chắn hoàn toàn không có lưới an toàn —
-- sửa một dòng trong fulfill_paid_order là hỏng mà không ai biết.
--
-- Cách chạy (cần một database Postgres TRỐNG — KHÔNG chạy trên production):
--     npm run test:referral-sql                 # dùng $DATABASE_URL
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/referral-guard-test.sql
--
-- Mọi kiểm tra đều `raise exception` khi sai ⇒ psql thoát khác 0 ⇒ dùng làm cổng được.
-- Chạy từ THƯ MỤC GỐC của repo (file có \i tới migration theo đường dẫn tương đối).
-- =====================================================================

\set ON_ERROR_STOP on

-- ── Stub Supabase: chỉ đủ để các migration referral chạy được ─────────
drop schema if exists auth cascade;
drop table if exists public.credit_ledger, public.orders, public.pricing_config,
                     public.plans, public.profiles,
                     public.withdrawals, public.payout_accounts,
                     public.commission_ledger, public.referrals cascade;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon;          end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role;  end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text default 'user',
  display_name text,
  plan_type text, plan_tier text, plan_code text,
  plan_expires_at timestamptz,
  plan_credits numeric not null default 0,
  purchased_credits numeric not null default 0,
  credits_reset_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can update non-plan fields" on public.profiles for update using (true);

create table public.plans (
  code text primary key, tier text, role text, name text,
  price_vnd integer, credits_per_cycle integer, cycle_days integer,
  duration_days integer, active boolean default true
);
create table public.pricing_config (key text primary key, value integer not null);
insert into public.pricing_config values ('credit_price_vnd', 500);
create table public.orders (
  order_code bigserial primary key,
  user_id uuid references auth.users(id),
  amount integer not null, plan_code text, credit_amount numeric,
  status text default 'pending', fulfilled_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, delta numeric, reason text, ref text, balance_after numeric,
  created_at timestamptz default now()
);

-- ── Nạp migration THẬT (không chép lại logic — test phải kiểm đúng thứ sẽ deploy) ──
\i supabase_referral_ALL.sql

-- ── Dữ liệu nền ───────────────────────────────────────────────────────
insert into public.plans(code,tier,role,name,price_vnd,credits_per_cycle,cycle_days,duration_days,active)
values ('student_1m','student','student','HS 1 tháng',29000,700,30,30,true);

insert into auth.users(id,email) values
 ('11111111-1111-1111-1111-111111111111','nguoimoi@x.com'),
 ('22222222-2222-2222-2222-222222222222','a@x.com'),
 ('33333333-3333-3333-3333-333333333333','b@x.com'),
 ('44444444-4444-4444-4444-444444444444','c@x.com');
insert into public.profiles(user_id) select id from auth.users;
update public.profiles set referral_code='ABC1234'
 where user_id='11111111-1111-1111-1111-111111111111';
insert into public.payout_accounts(user_id,bank_code,account_number,account_name)
values ('11111111-1111-1111-1111-111111111111','VCB','9990001','NGUYEN VAN R');

-- Đơn đã áp mã mời: 29.000 − 10% = 26.100 ⇒ hoa hồng 60% = 15.660
create function pg_temp.mkorder(p_buyer uuid) returns integer language sql as $$
  insert into public.orders(user_id,amount,plan_code,status,referral_code,referrer_id,discount_amount)
  values (p_buyer, 26100, 'student_1m', 'pending', 'ABC1234',
          '11111111-1111-1111-1111-111111111111', 2900)
  returning order_code::integer;
$$;

create function pg_temp.assert(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if not p_ok then raise exception 'HỎNG: %', p_what; end if;
  raise notice '  ok — %', p_what;
end $$;

-- ── 1. Hoa hồng phải vào ví TREO, không vào ví rút được ───────────────
do $$
declare v_pending integer; v_avail integer; v_r public.referrals;
begin
  raise notice '1) đơn hợp lệ → hoa hồng treo';
  perform public.fulfill_paid_order(pg_temp.mkorder('22222222-2222-2222-2222-222222222222'), '8880001','KHACH A');
  select commission_pending, commission_available into v_pending, v_avail
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';
  select * into v_r from public.referrals where invitee_id='22222222-2222-2222-2222-222222222222';

  perform pg_temp.assert(v_pending = 15660, 'tiền vào ví treo (15.660)');
  perform pg_temp.assert(v_avail = 0,       'ví rút được vẫn bằng 0');
  perform pg_temp.assert(v_r.status = 'pending',      'trạng thái = pending');
  perform pg_temp.assert(v_r.mature_at is not null,   'có mốc chín');
  perform pg_temp.assert(not exists (select 1 from public.commission_ledger),
                         'CHƯA ghi sổ cái (sổ cái chỉ ghi ví đã chín)');
end $$;

-- ── 2. Chưa chín thì không rút được ───────────────────────────────────
do $$
declare v jsonb;
begin
  raise notice '2) chưa chín → không rút được';
  v := public.request_withdrawal('11111111-1111-1111-1111-111111111111', 15660);
  perform pg_temp.assert((v->>'ok')::boolean is false, 'yêu cầu rút bị từ chối');
end $$;

-- ── 3. Tới hạn → chín, và chạy lại KHÔNG cộng lần hai ─────────────────
do $$
declare v_avail integer; v_avail2 integer; n integer;
begin
  raise notice '3) tới hạn → chín (và chống cộng trùng)';
  update public.referrals set mature_at = now() - interval '1 day' where status='pending';
  n := public.mature_commissions('11111111-1111-1111-1111-111111111111');
  select commission_available into v_avail
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';

  perform pg_temp.assert(n = 1,            'chín đúng 1 lượt');
  perform pg_temp.assert(v_avail = 15660,  'tiền chuyển sang ví rút được');
  perform pg_temp.assert(
    exists (select 1 from public.commission_ledger where reason='confirm' and delta=15660),
    'có bút toán confirm');
  perform pg_temp.assert(
    (select commission_pending from public.profiles
      where user_id='11111111-1111-1111-1111-111111111111') = 0,
    'ví treo đã về 0');

  perform public.mature_commissions();   -- quét lại toàn hệ thống
  select commission_available into v_avail2
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';
  perform pg_temp.assert(v_avail2 = 15660, 'chạy lại KHÔNG cộng lần hai');
end $$;

-- ── 4. Ngưỡng rút tối thiểu ───────────────────────────────────────────
do $$
declare v jsonb;
begin
  raise notice '4) ngưỡng rút tối thiểu';
  v := public.request_withdrawal('11111111-1111-1111-1111-111111111111', 15000);
  perform pg_temp.assert(v->>'err' = 'below_min', 'dưới ngưỡng → below_min');
  perform pg_temp.assert((v->>'min')::integer = 100000, 'trả về đúng ngưỡng 100.000');
end $$;

-- ── 5. Tự giới thiệu qua tài khoản phụ: người TRẢ dùng STK NHẬN của người mời ──
do $$
declare v_r public.referrals; v_pending integer;
begin
  raise notice '5) tự giới thiệu qua account phụ → từ chối';
  perform public.fulfill_paid_order(pg_temp.mkorder('33333333-3333-3333-3333-333333333333'), '9990001','NGUYEN VAN R');
  select * into v_r from public.referrals where invitee_id='33333333-3333-3333-3333-333333333333';
  select commission_pending into v_pending
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';

  perform pg_temp.assert(v_r.status = 'rejected', 'lượt bị từ chối');
  perform pg_temp.assert(v_r.flag_reason = 'payer_is_referrer_bank_account', 'ghi đúng lý do');
  perform pg_temp.assert(v_r.commission_amount = 0, 'không phát sinh hoa hồng');
  perform pg_temp.assert(v_pending = 0, 'ví treo không bị cộng thêm');
end $$;

-- ── 6. Farm: một STK trả cho nhiều "người được mời" của cùng người mời ─
do $$
declare v_r public.referrals; n integer;
begin
  raise notice '6) STK người trả bị dùng lại → gắn cờ, không tự chín';
  perform public.fulfill_paid_order(pg_temp.mkorder('44444444-4444-4444-4444-444444444444'), '8880001','KHACH A');
  select * into v_r from public.referrals where invitee_id='44444444-4444-4444-4444-444444444444';

  perform pg_temp.assert(v_r.status = 'flagged', 'lượt bị gắn cờ');
  perform pg_temp.assert(v_r.flag_reason = 'payer_account_reused', 'ghi đúng lý do');
  perform pg_temp.assert(v_r.mature_at is null, 'KHÔNG có mốc chín');

  n := public.mature_commissions();
  perform pg_temp.assert(n = 0, 'lượt gắn cờ không bao giờ tự chín');
end $$;

-- ── 7. Trần lượt/tháng ────────────────────────────────────────────────
do $$
declare i int; u uuid; n_capped integer;
begin
  raise notice '7) trần lượt/tháng';
  for i in 1..10 loop
    u := gen_random_uuid();
    insert into auth.users(id,email) values (u, 'cap'||i||'@x.com');
    insert into public.profiles(user_id) values (u);
    perform public.fulfill_paid_order(pg_temp.mkorder(u), 'PAY'||i, 'KHACH '||i);
  end loop;
  select count(*) into n_capped from public.referrals where flag_reason='monthly_cap_exceeded';
  perform pg_temp.assert(n_capped > 0, 'vượt trần thì bị gắn cờ');
end $$;

-- ── 8. Admin duyệt lượt bị gắn cờ → chín ngay ─────────────────────────
do $$
declare v jsonb; v_before integer; v_after integer; v_id uuid;
begin
  raise notice '8) admin duyệt lượt gắn cờ';
  select commission_available into v_before
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';
  select id into v_id from public.referrals where flag_reason='payer_account_reused' limit 1;
  v := public.review_referral(v_id, 'approve', 'đã gọi điện xác minh');
  select commission_available into v_after
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';

  perform pg_temp.assert((v->>'ok')::boolean, 'duyệt thành công');
  perform pg_temp.assert(v_after - v_before = 15660, 'cộng đúng số tiền vào ví rút được');
  perform pg_temp.assert(
    (select status from public.referrals where id = v_id) = 'confirmed', 'trạng thái → confirmed');
end $$;

-- ── 9. Thu hồi lượt ĐÃ CHÍN → trừ ví + ghi sổ clawback ────────────────
do $$
declare v jsonb; v_id uuid; v_before integer; v_after integer;
begin
  raise notice '9) thu hồi lượt đã chín';
  select commission_available into v_before
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';
  select id into v_id from public.referrals where status='confirmed' order by created_at limit 1;
  v := public.review_referral(v_id, 'reject', 'khách chargeback');
  select commission_available into v_after
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';

  perform pg_temp.assert(v_before - v_after = 15660, 'trừ đúng số tiền');
  perform pg_temp.assert(
    exists (select 1 from public.commission_ledger where reason='clawback' and delta=-15660),
    'có bút toán clawback');
  perform pg_temp.assert(
    (select status from public.referrals where id=v_id) = 'clawed_back', 'trạng thái → clawed_back');
end $$;

-- ── 10. Đã rút mất thì chỉ thu hồi được phần còn lại (không để ví âm) ──
do $$
declare v jsonb; v_id uuid; v_after integer;
begin
  raise notice '10) thu hồi một phần khi người mời đã rút';
  update public.profiles set commission_available = 5000
   where user_id='11111111-1111-1111-1111-111111111111';
  select id into v_id from public.referrals where status='confirmed' order by created_at limit 1;
  v := public.review_referral(v_id, 'reject', 'đã rút mất');
  select commission_available into v_after
    from public.profiles where user_id='11111111-1111-1111-1111-111111111111';

  perform pg_temp.assert((v->>'recovered')::integer = 5000, 'chỉ thu được phần còn lại');
  perform pg_temp.assert(v_after = 0, 'ví về 0, KHÔNG âm');

  -- Xử lại lượt đã xử lý phải bị chặn.
  v := public.review_referral(v_id, 'reject', 'lặp lại');
  perform pg_temp.assert(v->>'err' = 'already_resolved', 'không xử lý lượt đã xong hai lần');
end $$;

-- ── 11. Rút hợp lệ khi đủ ngưỡng ──────────────────────────────────────
do $$
declare v jsonb;
begin
  raise notice '11) rút hợp lệ';
  update public.profiles set commission_available = 150000
   where user_id='11111111-1111-1111-1111-111111111111';
  v := public.request_withdrawal('11111111-1111-1111-1111-111111111111', 150000);
  perform pg_temp.assert((v->>'ok')::boolean, 'tạo được yêu cầu rút');
  perform pg_temp.assert((v->>'balance_after')::integer = 0, 'trừ hết số dư');
  perform pg_temp.assert(
    (select status from public.withdrawals where id = (v->>'withdrawal_id')::uuid) = 'requested',
    'yêu cầu ở trạng thái chờ duyệt');
end $$;

\echo ''
\echo 'RÀO CHẮN MÃ MỜI: TẤT CẢ KIỂM TRA ĐỀU ĐẠT ✅'
