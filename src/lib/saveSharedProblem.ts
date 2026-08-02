import { supabase } from '@/integrations/supabase/client';
import { GeometryData } from '@/types/geometry';
import type { Json } from '@/integrations/supabase/types';

/**
 * Lưu một bài ĐƯỢC SHARE về tài khoản người nhận, vào CẢ HAI danh sách:
 *   - Lịch sử (is_history = true)  → hiện ở left panel trong editor
 *   - Kho "Hình đã lưu" (is_history = false) → hiện ở trang /saved
 *
 * Chống trùng theo từng danh sách: nếu đã có bản y hệt (so nội dung geometry_data),
 * XOÁ hết bản trùng rồi CHÈN một bản mới ⇒ bài nhảy lên ĐẦU danh sách (do sắp theo
 * thời gian) và không để lại bản dưới.
 */

export interface SaveSharedResult {
  ok: boolean;
  /** true nếu bài đã tồn tại từ trước (ở ít nhất một danh sách). */
  duplicated: boolean;
  error?: string;
}

/**
 * Chữ ký nội dung để so trùng. geometry_data lưu dạng jsonb (Postgres chuẩn hoá
 * thứ tự khoá) nên JSON.stringify của hai bản cùng nội dung sẽ khớp nhau.
 */
export function geometrySignature(g: GeometryData): string {
  try {
    return JSON.stringify(g);
  } catch {
    return '';
  }
}

export async function saveSharedProblem(params: {
  userId: string;
  name: string;
  prompt: string | null;
  geometry: GeometryData;
}): Promise<SaveSharedResult> {
  const { userId, name, prompt, geometry } = params;
  const targetSig = geometrySignature(geometry);

  try {
    // Lấy toàn bộ bài của user (cả history lẫn saved) để so trùng nội dung.
    const { data, error } = await supabase
      .from('saved_geometries')
      .select('id, is_history, geometry_data')
      .eq('user_id', userId);
    if (error) throw error;

    const rows = data || [];
    let duplicated = false;

    // Xử lý riêng cho từng danh sách: lịch sử (true) và kho đã lưu (false).
    for (const isHistory of [true, false] as const) {
      const matchIds = rows
        .filter(
          (r) =>
            Boolean(r.is_history) === isHistory &&
            geometrySignature(r.geometry_data as unknown as GeometryData) === targetSig,
        )
        .map((r) => r.id);

      if (matchIds.length > 0) {
        duplicated = true;
        const { error: delErr } = await supabase
          .from('saved_geometries')
          .delete()
          .in('id', matchIds)
          .eq('user_id', userId);
        if (delErr) throw delErr;
      }

      const { error: insErr } = await supabase.from('saved_geometries').insert({
        user_id: userId,
        name,
        prompt,
        geometry_data: geometry as unknown as Json,
        is_history: isHistory,
        is_public: false,
      });
      if (insErr) throw insErr;
    }

    // Báo cho left panel (useGeometryHistory) tải lại danh sách.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('geo3d_history_sync'));
    }

    return { ok: true, duplicated };
  } catch (err) {
    return { ok: false, duplicated: false, error: err instanceof Error ? err.message : 'lỗi' };
  }
}
