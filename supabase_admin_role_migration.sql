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
