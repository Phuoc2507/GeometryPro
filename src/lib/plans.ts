// Nguồn dùng chung cho UpgradeModal + trang Bảng giá.
// Giá/credit khớp supabase_pricing_v2_migration.sql (credit đã ×10).

export interface Plan {
  code: string;
  tier: string;
  role: string;          // 'student' | 'teacher' | 'any'
  name: string;
  price_vnd: number;
  credits_per_cycle: number;
  cycle_days: number;
  duration_days: number;
}

// Fallback khi bảng `plans` chưa áp migration — để UI vẫn hiển thị đúng.
export const FALLBACK_PLANS: Plan[] = [
  { code: "student_1m", tier: "student", role: "student", name: "Học sinh · 1 tháng",      price_vnd: 29000,   credits_per_cycle: 700,  cycle_days: 30, duration_days: 30 },
  { code: "student_1y", tier: "student", role: "student", name: "Học sinh · 1 năm học",    price_vnd: 199000,  credits_per_cycle: 700,  cycle_days: 30, duration_days: 365 },
  { code: "teacher_1m", tier: "teacher", role: "teacher", name: "Giáo viên · 1 tháng",     price_vnd: 79000,   credits_per_cycle: 2000, cycle_days: 30, duration_days: 30 },
  { code: "teacher_1y", tier: "teacher", role: "teacher", name: "Giáo viên · 1 năm học",   price_vnd: 549000,  credits_per_cycle: 2000, cycle_days: 30, duration_days: 365 },
  { code: "pro_1m",     tier: "pro",     role: "teacher", name: "Pro · 1 tháng",           price_vnd: 149000,  credits_per_cycle: 6000, cycle_days: 30, duration_days: 30 },
  { code: "pro_1y",     tier: "pro",     role: "teacher", name: "Pro · 1 năm học",         price_vnd: 890000,  credits_per_cycle: 6000, cycle_days: 30, duration_days: 365 },
  { code: "group_1y",   tier: "pro",     role: "teacher", name: "Tổ Toán · 1 năm (≤5 GV)", price_vnd: 1490000, credits_per_cycle: 2000, cycle_days: 30, duration_days: 365 },
];

export const fmtVnd = (v: number) => v.toLocaleString("vi-VN") + "đ";
