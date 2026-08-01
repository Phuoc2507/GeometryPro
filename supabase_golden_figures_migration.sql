-- ════════════════════════════════════════════════════════════════════════════
-- Bảng "hình chuẩn" (golden_figures) — hình ĐÚNG do quản trị viên duyệt cho một
-- đề cụ thể. Đóng vòng lặp "máy vẽ sai → admin sửa → lần sau vẽ đúng luôn".
--
-- Áp SAU:
--   • supabase_admin_role_migration.sql            (cần hàm public.is_admin())
--   • supabase_problem_reports_feedback_migration  (cần bảng public.problem_reports)
--
-- LUỒNG PHỤC VỤ (api/analyze-geometry.js):
--   đề đến → tra golden theo prompt_norm → nếu có ⇒ trả THẲNG response, bỏ qua
--   engine + LLM. Route đọc bằng SERVICE_ROLE (bypass RLS).
--
-- PHÂN QUYỀN:
--   • Server GHI/ĐỌC bằng service_role (bypass RLS).
--   • Client chỉ thao tác qua /api/admin (requireAdmin). Policy authenticated
--     dưới đây gắn is_admin() làm lớp chặn phòng khi có ai đọc/ghi trực tiếp.
--   • anon: không quyền.
--
-- RIÊNG TƯ: lưu NGUYÊN VĂN đề (prompt) + JSON hình → giống problem_reports, đã
--   bù bằng RLS admin-only. Không lưu ảnh base64.
--
-- An toàn chạy lại nhiều lần (idempotent). Bọc trong transaction.
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ file → Run.
-- ════════════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.golden_figures (
  id               uuid        primary key default gen_random_uuid(),
  -- KHOÁ so khớp: đề đã chuẩn hoá (normalizePrompt). UNIQUE ⇒ mỗi đề đúng một hình
  -- chuẩn; duyệt lại cùng đề = GHI ĐÈ (upsert on conflict).
  prompt_norm      text        not null unique,
  prompt           text        not null,           -- đề nguyên văn (để admin xem)
  mode             text,                            -- chế độ lúc dựng ('quick'|'detailed') — chỉ để tham khảo, KHÔNG dùng khi khớp
  response         jsonb       not null,            -- payload phục vụ (shape = finalPayload: { step1, step2, mode, engine })
  source           text        not null default 'admin', -- 'admin'|'manual-fix'|'resolve-job'
  note             text,                            -- ghi chú của admin
  -- Bài lỗi gốc sinh ra golden này (nếu duyệt từ trang admin). SET NULL nếu bài lỗi bị xoá.
  source_report_id uuid        references public.problem_reports(id) on delete set null,
  created_by       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.golden_figures enable row level security;

revoke all on table public.golden_figures from public, anon, authenticated;
grant  select, insert, update, delete on table public.golden_figures to authenticated; -- RLS is_admin() vẫn siết
grant  select, insert, update, delete on table public.golden_figures to service_role;

drop policy if exists "golden admin read"   on public.golden_figures;
drop policy if exists "golden admin insert" on public.golden_figures;
drop policy if exists "golden admin update" on public.golden_figures;
drop policy if exists "golden admin delete" on public.golden_figures;
create policy "golden admin read"   on public.golden_figures
  for select using (public.is_admin());
create policy "golden admin insert" on public.golden_figures
  for insert with check (public.is_admin());
create policy "golden admin update" on public.golden_figures
  for update using (public.is_admin()) with check (public.is_admin());
create policy "golden admin delete" on public.golden_figures
  for delete using (public.is_admin());

-- prompt_norm đã có unique index (từ ràng buộc UNIQUE). Thêm index sắp xếp cho tab admin.
create index if not exists golden_figures_created_idx
  on public.golden_figures (created_at desc);

commit;

-- ────────────────────────────────────────────────────────────────────────────
-- Kiểm tra nhanh sau khi chạy:
-- select count(*) from public.golden_figures;
-- ────────────────────────────────────────────────────────────────────────────
