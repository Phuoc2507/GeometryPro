import type { Json } from '@/integrations/supabase/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cột saved_geometries.id là kiểu Postgres `uuid`. Chỉ chuỗi đúng dạng UUID mới nhét làm khoá được.
export function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export interface MigrationRow {
  id: string;
  user_id: string;
  name: string;
  prompt: string | null;
  geometry_data: Json;
  is_history: true;
  created_at: string;
}

// Dựng các hàng saved_geometries từ lịch sử vẽ vô danh (localStorage) để upsert khi đăng nhập.
// Tách thuần khỏi AuthContext để test không cần render context/supabase.
//
// BUG đã sửa: bản CŨ tái dùng THẲNG `it.id` làm khoá chính nếu là chuỗi bất kỳ. Dữ liệu lịch sử
// cũ có id dạng "Local_1782853880654_zyb317x" (KHÔNG phải uuid) → Postgres ném 22P02
// "invalid input syntax for type uuid" → CẢ mẻ upsert 400 (Bad Request) → lịch sử không di trú &
// console spam mỗi lần đăng nhập. Nay CHỈ tái dùng id khi là UUID hợp lệ (bản mới dùng
// crypto.randomUUID ⇒ giữ idempotent chống nhân đôi); id không hợp lệ ⇒ cấp UUID mới (mục cũ mất
// idempotent — chấp nhận: di trú 1 lần, localStorage bị xoá sau khi upload thành công).
export function buildMigrationRows(
  parsed: unknown,
  userId: string,
  newId: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
): MigrationRow[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((it): it is Record<string, unknown> =>
      typeof it === 'object' &&
      it !== null &&
      'geometry_data' in it &&
      typeof (it as Record<string, unknown>).geometry_data === 'object' &&
      (it as Record<string, unknown>).geometry_data !== null)
    .map((it) => ({
      id: isValidUuid(it.id) ? it.id : newId(),
      user_id: userId,
      name: typeof it.name === 'string' && it.name ? it.name : 'Bản vẽ',
      prompt: typeof it.prompt === 'string' ? it.prompt : null,
      geometry_data: it.geometry_data as Json,
      is_history: true as const,
      // Giữ đúng thứ tự thời gian; project_id local không tồn tại server → bỏ (để null).
      created_at: typeof it.created_at === 'string' ? it.created_at : now(),
    }));
}
