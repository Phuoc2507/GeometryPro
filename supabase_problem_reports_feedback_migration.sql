-- ════════════════════════════════════════════════════════════════════════════
-- Bảng "bài lỗi" (problem_reports) & "feedback người dùng" (user_feedback).
-- Áp SAU supabase_admin_role_migration.sql (cần hàm public.is_admin()).
--
-- Nguyên tắc phân quyền:
--   • problem_reports  : server GHI bằng service_role; chỉ ADMIN đọc/sửa.
--   • user_feedback    : người dùng đăng nhập tự GỬI (RLS owner-check);
--                        chỉ ADMIN đọc/sửa.
--
-- LƯU Ý RIÊNG TƯ: hai bảng này lưu NỘI DUNG đề (prompt) + JSON hình — trái với
--   nguyên tắc "chỉ log độ dài" ở engineDecisionLog.js. Đã bù lại bằng: RLS
--   admin-only, cột `prompt` để RIÊNG (có thể để NULL/cắt bớt tuỳ endpoint), và
--   KHÔNG bao giờ lưu ảnh base64 (chỉ cờ image_provided). Xoá tài khoản là bay
--   hết dữ liệu của user đó (on delete cascade + danh sách xoá ở delete-account).
--
-- An toàn chạy lại nhiều lần (idempotent). Bọc trong transaction.
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ file → Run.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- ── 1) problem_reports — máy vẽ SAI / KHÔNG vẽ được (server tự bắt) ───────────
create table if not exists public.problem_reports (
  id             uuid        primary key default gen_random_uuid(),
  -- NULL cho lần vẽ của KHÁCH (chưa đăng nhập). Tham chiếu auth.users(id) (PK,
  -- chắc chắn UNIQUE) theo đúng lối usage_counters/credit_ledger.
  user_id        uuid        references auth.users(id) on delete cascade,
  endpoint       text        not null,           -- 'analyze-geometry'|'analyze-advance'|'solve'|'modify-geometry'|'analyze-geometry-v2'
  mode           text,                            -- 'quick'|'detailed'|'advance'…
  prompt         text,                            -- đề bài (NHẠY CẢM — có thể NULL/cắt bớt)
  prompt_len     integer,                         -- độ dài đề (luôn an toàn, theo lối engineDecisionLog)
  image_provided boolean     not null default false, -- có ảnh OCR không (KHÔNG lưu ảnh)
  ai_json        jsonb,                           -- "JSON prompt" / đầu ra AI đã hỏng
  error_message  text,                            -- thông báo lỗi
  error_stage    text,                            -- 'exception'|'parse'|'verify'|'timeout'|'unsupported'…
  model          text,                            -- model đã dùng
  duration_ms    integer,                         -- thời gian xử lý (cho tab Thống kê)
  status         text        not null default 'mới'
                   check (status in ('mới', 'đang xem', 'đã sửa', 'bỏ qua')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()   -- đặt = now() thủ công khi đổi status
);

alter table public.problem_reports enable row level security;

-- Server ghi bằng service_role (bypass RLS). Client authenticated chỉ đọc/sửa
-- QUA RLS (is_admin); không cấp insert cho client.
revoke all on table public.problem_reports from public, anon, authenticated;
grant  select, update on table public.problem_reports to authenticated;
grant  select, insert, update, delete on table public.problem_reports to service_role;

drop policy if exists "problem_reports admin read"   on public.problem_reports;
drop policy if exists "problem_reports admin update" on public.problem_reports;
create policy "problem_reports admin read"   on public.problem_reports
  for select using (public.is_admin());
create policy "problem_reports admin update" on public.problem_reports
  for update using (public.is_admin()) with check (public.is_admin());

create index if not exists problem_reports_status_created_idx
  on public.problem_reports (status, created_at desc);
create index if not exists problem_reports_endpoint_idx
  on public.problem_reports (endpoint);
create index if not exists problem_reports_user_idx
  on public.problem_reports (user_id) where user_id is not null;

-- ── 2) user_feedback — người dùng CHỦ ĐỘNG gửi góp ý / báo lỗi ────────────────
create table if not exists public.user_feedback (
  id                uuid        primary key default gen_random_uuid(),
  -- NOT NULL: chỉ người ĐÃ ĐĂNG NHẬP mới gửi được (đồng ý ngầm + xoá được khi
  -- xoá tài khoản + chống spam). Khách bấm nút sẽ được mời đăng nhập ở UI.
  user_id           uuid        not null references auth.users(id) on delete cascade,
  kind              text        not null default 'góp ý'
                      check (kind in ('lỗi', 'góp ý', 'khác')),
  message           text        not null,          -- nội dung người dùng gõ
  -- "bản vẽ liên quan": tham chiếu bản đã lưu, hoặc snapshot nếu chưa lưu.
  saved_geometry_id uuid        references public.saved_geometries(id) on delete set null,
  geometry_snapshot jsonb,                          -- ảnh chụp geometry_data lúc báo (nếu chưa lưu)
  prompt            text,                            -- đề tạo ra bản vẽ (tuỳ chọn)
  page_path         text,                            -- đang ở trang nào khi báo
  status            text        not null default 'mới'
                      check (status in ('mới', 'đang xem', 'đã sửa', 'bỏ qua')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

-- Người dùng đăng nhập tự INSERT bản của MÌNH (owner-check). ADMIN đọc/sửa tất cả.
revoke all on table public.user_feedback from public, anon, authenticated;
grant  select, insert, update on table public.user_feedback to authenticated;
grant  select, insert, update, delete on table public.user_feedback to service_role;

drop policy if exists "user_feedback insert own"  on public.user_feedback;
drop policy if exists "user_feedback admin read"   on public.user_feedback;
drop policy if exists "user_feedback admin update" on public.user_feedback;
-- Chủ nhân tự gửi feedback của mình.
create policy "user_feedback insert own" on public.user_feedback
  for insert with check (auth.uid() = user_id);
-- Admin đọc/sửa tất cả (đổi trạng thái xử lý). (Chủ nhân KHÔNG được đọc lại
-- danh sách feedback — tránh lộ; nếu muốn cho chủ nhân xem lại, thêm policy sau.)
create policy "user_feedback admin read" on public.user_feedback
  for select using (public.is_admin());
create policy "user_feedback admin update" on public.user_feedback
  for update using (public.is_admin()) with check (public.is_admin());

create index if not exists user_feedback_status_created_idx
  on public.user_feedback (status, created_at desc);
create index if not exists user_feedback_kind_idx
  on public.user_feedback (kind);
create index if not exists user_feedback_user_idx
  on public.user_feedback (user_id);

-- ── draw_stats — đếm lượt vẽ theo NGÀY để tính TỈ LỆ thành công ───────────────
-- attempts: mỗi lần thử vẽ; fails: số lần lỗi cứng. tỉ lệ vẽ được = 1 - fails/attempts.
create table if not exists public.draw_stats (
  day       date    not null,
  endpoint  text    not null,
  attempts  integer not null default 0,
  fails     integer not null default 0,
  primary key (day, endpoint)
);

alter table public.draw_stats enable row level security;
revoke all on table public.draw_stats from public, anon, authenticated;
grant  select on table public.draw_stats to authenticated;                 -- RLS vẫn siết còn admin
grant  select, insert, update on table public.draw_stats to service_role;

drop policy if exists "draw_stats admin read" on public.draw_stats;
create policy "draw_stats admin read" on public.draw_stats
  for select using (public.is_admin());

-- Tăng bộ đếm atomic (server gọi bằng service_role). p_kind: 'attempt' | 'fail'.
create or replace function public.bump_draw_stat(p_endpoint text, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.draw_stats(day, endpoint, attempts, fails)
  values (current_date, p_endpoint,
          case when p_kind = 'attempt' then 1 else 0 end,
          case when p_kind = 'fail'    then 1 else 0 end)
  on conflict (day, endpoint) do update
     set attempts = public.draw_stats.attempts + (case when p_kind = 'attempt' then 1 else 0 end),
         fails    = public.draw_stats.fails    + (case when p_kind = 'fail'    then 1 else 0 end);
end $$;

revoke all on function public.bump_draw_stat(text, text) from public, anon, authenticated;
grant execute on function public.bump_draw_stat(text, text) to service_role;

commit;

-- ────────────────────────────────────────────────────────────────────────────
-- Kiểm tra nhanh sau khi chạy:
-- select count(*) from public.problem_reports;
-- select count(*) from public.user_feedback;
-- ────────────────────────────────────────────────────────────────────────────
