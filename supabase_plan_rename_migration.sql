-- ════════════════════════════════════════════════════════════════════════════
-- Đổi TÊN gói sang trung tính (theo dung lượng credit), bỏ tên theo vai trò.
-- Mục tiêu: một ví credit dùng chung cho cả Học sinh & Giáo viên — đổi mode
-- không mất phí. Chỉ đổi cột `name` hiển thị; KHÔNG đổi `code`/`tier`/giá/credit
-- để không ảnh hưởng thanh toán, cấp credit, hay các đơn đã tạo.
--
-- Cách dùng: mở Supabase → SQL Editor → dán toàn bộ file này → Run.
-- ════════════════════════════════════════════════════════════════════════════

update public.plans set name = 'Cơ bản · 1 tháng'       where code = 'teacher_1m';
update public.plans set name = 'Cơ bản · 3 tháng'       where code = 'teacher_3m';
update public.plans set name = 'Chuyên nghiệp · 1 tháng' where code = 'pro_1m';
update public.plans set name = 'Trường học · 1 năm'      where code = 'school_1y';

-- Kiểm tra lại:
-- select code, tier, name, price_vnd, credits_per_cycle from public.plans order by price_vnd;
