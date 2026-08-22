-- supabase_advance_timings_migration.sql
-- Đo p95 nhánh "advance-from-detailed" (Vẽ kỹ định tuyến nâng cao) một cách BỀN VỮNG.
-- Trước đây `ms` chỉ console.log ra Vercel (ephemeral, không truy vấn được). Bảng này lưu từng
-- lần chạy nhánh advance để trang admin tính p95/p50 bất cứ lúc nào.
--
-- Áp SAU supabase_admin_role_migration.sql (cần hàm public.is_admin()).
-- Server GHI bằng service_role (bypass RLS); client authenticated chỉ ĐỌC qua RLS is_admin().
-- KHÔNG lưu nội dung đề (giữ nguyên tắc "chỉ log độ dài/tín hiệu" của engineDecisionLog.js).

create table if not exists public.advance_timings (
  id             uuid primary key default gen_random_uuid(),
  reason         text    not null,               -- 'advance-from-detailed' | '-image' | 'advance-miss' | 'advance-deadline' | 'image-transcript-reuse' | 'advance-image-fail' | ...
  ms             integer not null,               -- thời gian THẬT của pipeline nâng cao
  served         boolean not null default false, -- có phục vụ được scene advance không
  image_provided boolean not null default false, -- đề vào bằng ảnh?
  created_at     timestamptz not null default now()
);

alter table public.advance_timings enable row level security;

-- Server ghi bằng service_role (bypass RLS). Client chỉ đọc QUA RLS is_admin(); không cấp insert cho client.
grant select on table public.advance_timings to authenticated;
grant select, insert on table public.advance_timings to service_role;

drop policy if exists "advance_timings admin read" on public.advance_timings;
create policy "advance_timings admin read" on public.advance_timings
  for select using (public.is_admin());

create index if not exists advance_timings_reason_created_idx
  on public.advance_timings (reason, created_at desc);
