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
