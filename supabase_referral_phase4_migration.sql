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
