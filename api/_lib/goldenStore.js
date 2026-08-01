// api/_lib/goldenStore.js
// "Hình chuẩn" (golden): hình ĐÚNG do quản trị viên duyệt cho một đề cụ thể. Khi
// máy vẽ sai một bài khó, admin dựng lại hình đúng (bằng bộ công cụ vẽ tay có sẵn)
// rồi lưu làm golden. Lần sau gặp LẠI đúng đề đó → phục vụ THẲNG hình golden, bỏ
// qua cả engine lẫn LLM ⇒ đúng tức thì, không tốn model.
//
// Khoá so khớp = normalizePrompt(đề) (khớp gần đúng nguyên văn, xem promptNormalize.js).
//
// AN TOÀN: mọi hàm ở đây fail-safe — lỗi/DB thiếu ⇒ trả null, KHÔNG bao giờ ném ra
// làm chết route vẽ. Golden chỉ là "đường tắt phục vụ"; thiếu nó thì luồng vẽ cũ
// (engine → LLM) vẫn chạy y như trước.
import { normalizePrompt } from './promptNormalize.js';

/**
 * Tra hình chuẩn cho một đề. Đọc bằng client service-role của route (bypass RLS).
 * @param {import('@supabase/supabase-js').SupabaseClient|null} client
 * @param {string} prompt
 * @returns {Promise<{response: any, id: string}|null>}  payload để phục vụ, hoặc null
 */
export async function findGolden(client, prompt) {
  try {
    if (!client) return null;
    const norm = normalizePrompt(prompt);
    if (!norm) return null; // đề rỗng ⇒ không khớp bừa vào một golden nào

    const { data, error } = await client
      .from('golden_figures')
      .select('id, response')
      .eq('prompt_norm', norm)
      .maybeSingle();

    if (error) {
      console.warn('[golden] tra cứu lỗi (bỏ qua):', error.message);
      return null;
    }
    if (!data || !data.response) return null;

    // Chỉ phục vụ khi payload có hình vẽ được. Hai dạng: TĨNH (step2.geometry.points) hoặc NÂNG CAO
    // (scene.base.points — golden của bình/lu/chậu, khối tròn xoay… lưu nguyên scene advance).
    const r = data.response;
    const staticPts = r?.step2?.geometry?.points;
    const advPts = r?.scene?.base?.points;
    const drawable = (Array.isArray(staticPts) && staticPts.length > 0)
      || (Array.isArray(advPts) && advPts.length > 0);
    if (!drawable) return null;

    return { response: data.response, id: data.id };
  } catch (err) {
    console.warn('[golden] findGolden ngoại lệ (bỏ qua):', err?.message || err);
    return null;
  }
}

/**
 * Dựng payload phục vụ từ hình admin cung cấp.
 *  - Có `advanceScene` ⇒ golden dạng NÂNG CAO: trả thẳng { mode:'advance', scene } (giữ nguyên bước +
 *    đáp số verified). Cả analyze-geometry (Vẽ kỹ) lẫn analyze-advance đều phục vụ được dạng này.
 *  - Không ⇒ golden TĨNH: { step1, step2:{ geometry } } như cũ. confidence=1, không vi phạm (người đã duyệt).
 * @param {{prompt: string, geometry: any, advanceScene?: any, mode?: string, calculationLog?: string}} p
 * @returns {any}
 */
export function buildGoldenResponse({ prompt, geometry, advanceScene, mode, calculationLog }) {
  if (advanceScene && advanceScene.base && Array.isArray(advanceScene.base.points)) {
    return { mode: 'advance', scene: advanceScene, engine: 'golden' };
  }
  const points = Array.isArray(geometry?.points) ? geometry.points : [];
  const tags = Array.isArray(geometry?.tags) ? geometry.tags : [];
  return {
    step1: {
      text: prompt,
      gemini_dsl: '',
      points_needed: points.map((pt) => pt?.id).filter(Boolean),
      shape_type: geometry?.shape_type || '',
      constraints: [],
      tags: tags.length ? tags : ['golden'],
      detailLevel: geometry?.detailLevel || 'static',
    },
    step2: {
      geometry,
      calculation_log: calculationLog || 'Hình chuẩn do quản trị viên duyệt.',
      confidence: 1,
      constraint_violations: [],
    },
    mode: mode || 'detailed',
    engine: 'golden', // để đo tỉ lệ phục vụ bằng golden so với engine/LLM
  };
}
