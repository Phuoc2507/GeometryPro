// api/_lib/entitlements.js
// CHÍNH SÁCH "mỗi gói mở khoá gì" — dịch trực tiếp từ bảng unlock trong spec.
// (TIỀN + credit-cấp-mỗi-kỳ ở bảng DB `plans`; đây chỉ là chính sách tính năng.)
//
// mode cho mỗi (tier, feature):
//   'quota'     -> đếm lượt: { max, periodDays }  (chỉ gói free)
//   'credit'    -> trừ credit theo action (xem CREDIT_COST)
//   'unlimited' -> không giới hạn, không tốn credit
//   'blocked'   -> gói này không được dùng

// Giá credit mỗi HÀNH ĐỘNG (chỉ áp cho mode 'credit').
// Xuất ảnh/tikz/word/pdf = 0 (client sinh, chỉ khoá theo gói) nên không nằm ở đây.
export const CREDIT_COST = {
  draw_quick: 1,
  draw_detailed: 2,
  draw_advance: 3,    // mode "Advance": tách đề đa-câu + ráp cảnh bóc lớp (nặng hơn Vẽ kỹ)
  modify: 0.2,        // sửa hình bằng AI (chat tự do) — rẻ vì thao tác nhỏ
  solve: 2,
  export_video: 5,
};

export function creditCostFor(action) {
  return CREDIT_COST[action] ?? 0;
}

// feature: 'draw' | 'solve' | 'export_image' | 'export_tikz' | 'export_doc' | 'export_video'
const FREE = {
  draw:         { mode: 'quota', max: 3, periodDays: 1 },   // 3 lượt vẽ/ngày (nhanh+kỹ chung)
  modify:       { mode: 'blocked' },                        // sửa bằng AI: gói free phải nâng cấp
  solve:        { mode: 'quota', max: 3, periodDays: 30 },  // 3 lượt giải/tháng
  export_image: { mode: 'quota', max: 1, periodDays: 30 },  // 1 lượt/tháng
  export_tikz:  { mode: 'quota', max: 1, periodDays: 30 },  // 1 lượt/tháng (đếm riêng)
  export_doc:   { mode: 'blocked' },
  export_video: { mode: 'blocked' },
};

const TEACHER = {
  draw:         { mode: 'credit' },
  modify:       { mode: 'credit' },    // sửa bằng AI: trừ CREDIT_COST.modify (0,2)
  solve:        { mode: 'credit' },
  export_image: { mode: 'unlimited' },
  export_tikz:  { mode: 'unlimited' },
  export_doc:   { mode: 'unlimited' },
  export_video: { mode: 'blocked' },   // GV chưa có video
};

const PRO = {
  ...TEACHER,
  export_video: { mode: 'credit' },    // Pro/Trường mới có video
};

export const POLICY = {
  free:    FREE,
  teacher: TEACHER,
  pro:     PRO,
  school:  PRO,   // Trường = Pro (chỉ khác số credit ở bảng plans)
};

// Trả về quy tắc cho (tier, feature); mặc định 'blocked' nếu không khai báo.
export function ruleFor(tier, feature) {
  return (POLICY[tier] && POLICY[tier][feature]) || { mode: 'blocked' };
}
