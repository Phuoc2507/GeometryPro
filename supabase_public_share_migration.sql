-- ============================================================================
-- Public share migration — cho phép ĐỌC ẨN DANH các hình đã đánh dấu công khai
-- ============================================================================
-- Mục đích: bật link chia sẻ công khai dạng /s/:id. Người lạ (chưa đăng nhập)
-- chỉ đọc được các bản ghi saved_geometries có is_public = true và KHÔNG phải
-- mục lịch sử. Chủ sở hữu vẫn đọc/ghi bình thường qua các policy sẵn có.
--
-- An toàn:
--   * Chỉ mở quyền SELECT (đọc), không mở INSERT/UPDATE/DELETE cho anon.
--   * Điều kiện is_public = true ⇒ chỉ lộ đúng bài người dùng chủ động công khai.
--   * loại trừ is_history = true ⇒ không lộ các mục lịch sử vô tình.
-- Chạy được nhiều lần (idempotent).
-- ============================================================================

alter table public.saved_geometries enable row level security;

drop policy if exists "Public can read public geometries" on public.saved_geometries;

create policy "Public can read public geometries"
  on public.saved_geometries
  for select
  to anon, authenticated
  using (
    is_public = true
    and coalesce(is_history, false) = false
  );
