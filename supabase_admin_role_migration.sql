-- ════════════════════════════════════════════════════════════════════════════
-- Phân quyền QUẢN TRỊ VIÊN (admin).
-- Thêm cột `role` vào profiles + hàm tiện ích is_admin() để dùng cho RLS về sau
-- (các bảng "bài lỗi", "feedback" sẽ chỉ cho admin đọc bằng hàm này).
--
-- An toàn khi chạy lại nhiều lần (idempotent).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ file này → Run.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- 1) Cột vai trò: 'user' (mặc định) hoặc 'admin'.
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- 2) Hàm kiểm tra admin — dùng trong RLS của các bảng quản trị sau này.
--    security definer để đọc được profiles bất kể RLS của người gọi.
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

-- 3) KHOÁ cột `role` trong policy tự-sửa-hồ-sơ.
--    Nếu KHÔNG có bước này: RLS chỉ pin các cột gói/ví, nên user tự chạy
--      supabase.from('profiles').update({ role:'admin' }).eq('user_id', <mình>)
--    là tự lên admin → lỗ hổng leo thang quyền. Tạo lại policy (giữ nguyên các
--    ràng buộc cũ) + thêm `role` vào WITH CHECK. set-role của admin đi qua
--    service_role nên KHÔNG bị policy này chặn.
drop policy if exists "Users can update non-plan fields" on public.profiles;
create policy "Users can update non-plan fields" on public.profiles
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and role              is not distinct from (select p.role              from public.profiles p where p.user_id = auth.uid())
  and plan_type         is not distinct from (select p.plan_type         from public.profiles p where p.user_id = auth.uid())
  and plan_tier         is not distinct from (select p.plan_tier         from public.profiles p where p.user_id = auth.uid())
  and plan_code         is not distinct from (select p.plan_code         from public.profiles p where p.user_id = auth.uid())
  and plan_expires_at   is not distinct from (select p.plan_expires_at   from public.profiles p where p.user_id = auth.uid())
  and plan_credits      is not distinct from (select p.plan_credits      from public.profiles p where p.user_id = auth.uid())
  and purchased_credits is not distinct from (select p.purchased_credits from public.profiles p where p.user_id = auth.uid())
);

commit;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) CẤP QUYỀN ADMIN cho tài khoản đầu tiên.
--    Bỏ comment dòng dưới, thay email đúng, rồi Run riêng câu này:
--
-- update public.profiles set role = 'admin'
--   where user_id = (select id from auth.users where email = 'phuocphuoc2507@gmail.com');
--
-- Kiểm tra lại:
-- select p.role, u.email
--   from public.profiles p join auth.users u on u.id = p.user_id
--   where p.role = 'admin';
-- ────────────────────────────────────────────────────────────────────────────
