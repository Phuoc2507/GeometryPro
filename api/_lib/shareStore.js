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
