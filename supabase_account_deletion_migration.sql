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
