-- supabase_pricing_v2_migration.sql
-- ĐỊNH GIÁ v2 (Pha 1): đơn vị credit ×10 + vai trò student/teacher + gói mới.
--
-- Ý tưởng:
--   • Chi phí hành động ×10 (ở api/_lib/entitlements.js) → credit gói cũng ×10 tại đây.
--     Sức mua GIỮ NGUYÊN, chỉ là con số to hơn + hết số lẻ (Sửa AI 0,2 → 2).
--   • Thêm cột `role` (student/teacher/any) để Pha 2 khoá chuyển vai trò khi còn gói.
--   • Người dùng CŨ: ×10 cả plan_credits LẪN purchased_credits (giữ đúng giá trị).
--     Credit nạp lẻ (purchased_credits) CHỈ được ×10 — KHÔNG bao giờ bị reset/zero
--     (logic reset/hết hạn trong spend_credits vốn chỉ đụng plan_credits).
--
-- AN TOÀN: phần ×10 số dư được KHOÁ bằng bảng đánh dấu → chạy lại file KHÔNG nhân đôi.
-- Chạy trên Supabase SQL editor (service role).

begin;

-- 1) Cột vai trò cho bảng gói (mặc định 'teacher'; gói student sẽ ghi đè bên dưới).
alter table public.plans add column if not exists role text not null default 'teacher';

-- 2) Bảng đánh dấu migration (idempotent guard cho các bước "chạy đúng 1 lần").
create table if not exists public.app_migrations (
  key        text primary key,
  applied_at timestamptz not null default now()
);

-- 3) ×10 MỌI SỐ DƯ (plan + nạp lẻ) — ĐÚNG 1 LẦN.
--    Khoá bằng key 'credits_x10_v2' để chạy lại không nhân tiếp.
do $$
begin
  if not exists (select 1 from public.app_migrations where key = 'credits_x10_v2') then
    update public.profiles
       set plan_credits      = plan_credits      * 10,
           purchased_credits = purchased_credits * 10;
    insert into public.app_migrations(key) values ('credits_x10_v2');
  end if;
end $$;

-- 4) Cập nhật + thêm gói: giá & credit v2, cột role, gói NĂM refill mỗi 30 ngày (cycle_days=30).
--    duration_days = thời hạn gói; cycle_days = chu kỳ nạp lại credit gói.
insert into public.plans (code, tier, role, name, price_vnd, duration_days, credits_per_cycle, cycle_days) values
  ('free',       'free',    'any',     'Miễn phí',                0,       0,   0,     0),
  ('student_1m', 'student', 'student', 'Học sinh · 1 tháng',      29000,   30,  700,   30),
  ('student_1y', 'student', 'student', 'Học sinh · 1 năm học',    199000,  365, 700,   30),
  ('teacher_1m', 'teacher', 'teacher', 'Giáo viên · 1 tháng',     79000,   30,  2000,  30),
  ('teacher_1y', 'teacher', 'teacher', 'Giáo viên · 1 năm học',   549000,  365, 2000,  30),
  ('pro_1m',     'pro',     'teacher', 'Pro · 1 tháng',           149000,  30,  6000,  30),
  ('pro_1y',     'pro',     'teacher', 'Pro · 1 năm học',         890000,  365, 6000,  30),
  ('group_1y',   'pro',     'teacher', 'Tổ Toán · 1 năm (≤5 GV)', 1490000, 365, 2000,  30),
  ('school_1y',  'school',  'teacher', 'Trường học · 1 năm',      0,       365, 50000, 30)
on conflict (code) do update set
  tier=excluded.tier, role=excluded.role, name=excluded.name, price_vnd=excluded.price_vnd,
  duration_days=excluded.duration_days, credits_per_cycle=excluded.credits_per_cycle,
  cycle_days=excluded.cycle_days, active=true;

-- 5) Gói cũ không còn dùng → huỷ kích hoạt (KHÔNG xoá, giữ lịch sử order tham chiếu).
update public.plans set active=false where code = 'teacher_3m';

commit;

-- GHI CHÚ Pha sau (chưa làm ở đây):
--   • Tổ Toán (group_1y): 2000 credit/GV × ≤5 GV — cần quản lý ghế (seats). Bản này tạm 1 tài khoản.
--   • Trường (school_1y): giá "Liên hệ" (price_vnd=0) + kho credit lớn 50000 — cấp/điều chỉnh thủ công.
--   • Khoá chuyển vai trò theo `plans.role` khi gói còn hạn (Pha 2).
