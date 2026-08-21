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
