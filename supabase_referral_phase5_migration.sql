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
