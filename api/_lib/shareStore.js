// api/_lib/shareStore.js
// Đọc một bài đã chia sẻ công khai (/s/:id) ở phía máy chủ.
//
// CỐ Ý dùng khoá ANON chứ không phải service role: khoá anon đi qua RLS, mà policy
// "Public can read public geometries" chỉ trả về bản ghi is_public = true và không
// phải mục lịch sử. Nghĩa là bài riêng tư KHÔNG THỂ lọt ra thẻ OG ngay cả khi ai đó
// đoán trúng id. Dùng service role ở đây là tự tay bỏ mất lớp bảo vệ đó.

import { createClient } from '@supabase/supabase-js';

let cached = null;
let cachedKey = '';

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const ck = `${url}:${key}`;
  if (!cached || cachedKey !== ck) {
    cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    cachedKey = ck;
  }
  return cached;
}

/**
 * @returns {Promise<{name:string, prompt:string|null, geometry_data:object}|null>}
 *          null khi không có, không công khai, hoặc chưa cấu hình Supabase.
 */
export async function fetchPublicShare(id) {
  const supabase = anonClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('saved_geometries')
    .select('name, prompt, geometry_data')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn('[share] không đọc được bài chia sẻ:', error.message);
    return null;
  }
  return data || null;
}

// ── Liệt kê bài chia sẻ cho sitemap ──────────────────────────────────────────
// RLS của khoá anon vốn đã chỉ trả về is_public = true và không phải mục lịch sử.
// Vẫn ghi tường minh các điều kiện đó ở đây để câu truy vấn tự nói ra ý định và
// dùng được index, thay vì phụ thuộc ngầm vào policy.
//
// CHỈ lấy bài CÓ ĐỀ BÀI. Bài chỉ có hình mà không có chữ là trang mỏng — nộp hàng
// nghìn trang như thế cho Google là tự hạ chất lượng cả tên miền. Muốn đổi ý thì
// bỏ hai dòng lọc `prompt` bên dưới.

function publicShareQuery(supabase, select, opts) {
  return supabase
    .from('saved_geometries')
    .select(select, opts)
    .eq('is_public', true)
    .eq('is_history', false)
    .not('prompt', 'is', null)
    .neq('prompt', '');
}

/** @returns {Promise<number>} tổng số bài đủ điều kiện lên sitemap (0 nếu lỗi). */
export async function countPublicShares() {
  const supabase = anonClient();
  if (!supabase) return 0;
  const { count, error } = await publicShareQuery(supabase, 'id', { count: 'exact', head: true });
  if (error) {
    console.warn('[sitemap] không đếm được bài chia sẻ:', error.message);
    return 0;
  }
  return count || 0;
}

/**
 * Một trang bản ghi cho file sitemap con.
 * Sắp theo updated_at giảm dần để bài mới sửa nằm ở trang đầu — trang Google ghé lại nhiều nhất.
 * @returns {Promise<Array<{id:string, updated_at:string}>>}
 */
export async function listPublicShares({ from, to }) {
  const supabase = anonClient();
  if (!supabase) return [];
  const { data, error } = await publicShareQuery(supabase, 'id, updated_at')
    .order('updated_at', { ascending: false })
    .range(from, to);
  if (error) {
    console.warn('[sitemap] không liệt kê được bài chia sẻ:', error.message);
    return [];
  }
  return data || [];
}
