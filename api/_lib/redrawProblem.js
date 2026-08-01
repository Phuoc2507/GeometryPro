// api/_lib/redrawProblem.js
// "Vẽ lại kỹ hơn" cho một đề mà máy từng vẽ SAI — dùng cho trang admin (nút
// "Nhờ AI vẽ lại"). Khác luồng vẽ đại trà (model rẻ, 1 lần) ở chỗ đổ nhiều tài
// nguyên hơn vì chỉ chạy cho số ít bài lỗi:
//   1) ENGINE tất định (kernel) TRƯỚC — nếu dựng được thì đây là hình ĐÚNG tuyệt
//      đối (kernel tự kiểm mọi điều kiện đề), khỏi cần LLM.
//   2) Không được thì: Pass 1 phân loại để lấy RÀNG BUỘC MÁY KIỂM ĐƯỢC, rồi cho
//      LLM vẽ (ưu tiên model mạnh DETAILED_MODEL nếu có key), rồi TỰ CHẤM bằng
//      verifyWithKernel. Đạt (0 vi phạm) ⇒ "máy tự tin đúng"; không ⇒ trả bản tốt
//      nhất kèm cờ "chưa tự chấm được" để admin nhìn mắt quyết.
//
// KHÔNG phục vụ khách, KHÔNG cache, KHÔNG trừ credit — chỉ trả candidate cho admin
// duyệt. Fail-safe: lỗi ở bước nào cũng cố trả bản tốt nhất có được (hoặc null).
import { callVilao } from './vilao.js';
import { parseJsonResponseWithAiRepair } from './jsonHelpers.js';
import { normalizeGeometryData } from './normalizeGeometry.js';
import { isLikely3DPrompt, isLikelyFlatGeometry, applyApexLiftFallback } from './flatGuard.js';
import { verifyWithKernel } from './kernelVerify.js';
import { BASE_PROMPT } from '../_prompts/prompts/base.js';
import { LEVEL_STATIC } from '../_prompts/prompts/levels.js';
import { STEP1_PARSE_PROMPT } from '../_prompts/prompts/classifier.js';

const DETAILED_MODEL = process.env.DETAILED_MODEL || 'ant/claude-sonnet-4-6';
const DETAILED_API_KEY = process.env.DETAILED_API_KEY || '';

function pointsOf(geometry) {
  return Array.isArray(geometry?.points) ? geometry.points : [];
}

/**
 * @param {string} prompt
 * @param {{maxAttempts?: number}} [opts]
 * @returns {Promise<{
 *   geometry: object|null,
 *   verified: boolean,   // máy TỰ CHẤM được và ĐẠT (0 vi phạm) ⇒ tự tin đúng
 *   ok: boolean,         // không có vi phạm nào bị bắt (kể cả khi chưa chấm được)
 *   confidence: number|null,
 *   violations: object[],
 *   source: 'kernel'|'llm'|'none',
 *   attempts: number,
 *   checkedConstraints: number, // số ràng buộc máy đã kiểm (0 = chưa tự chấm được)
 *   note: string,
 * }>}
 */
export async function redrawProblem(prompt, opts = {}) {
  const maxAttempts = Math.max(1, Math.min(3, opts.maxAttempts || 1));
  const trimmed = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmed) {
    return { geometry: null, verified: false, ok: false, confidence: null, violations: [], source: 'none', attempts: 0, checkedConstraints: 0, note: 'đề rỗng' };
  }

  // ── 0) ENGINE NÂNG CAO trước (đúng engine cho lớp bài vật thật/tròn xoay/thiết diện/thể tích) ─────
  // Nút "Nhờ AI vẽ lại" trước đây bỏ qua luồng Nâng cao ⇒ không vẽ lại được bình/lu/chậu. Nay thử engine
  // Nâng cao TRƯỚC (regex-gated) — nếu dựng được scene thì trả candidate kèm advanceScene để admin duyệt
  // thành golden (Giai đoạn 3). Fail-safe: lỗi/không phải dạng Nâng cao ⇒ rơi xuống kernel + LLM như cũ.
  try {
    const advMod = await import('../analyze-advance.js');
    const isAdvance = advMod.looksLikeVessel(trimmed) || advMod.looksLikeRevolution(trimmed)
      || advMod.looksLikeCrossSection(trimmed) || advMod.looksLikeArea(trimmed) || advMod.looksLikeSection(trimmed);
    if (isAdvance) {
      const { runAdvance } = await import('./advance/runAdvance.js');
      // "Nhờ AI vẽ lại" = vũ khí nặng: khâu TRÍCH số đo (splitProblem) dùng model mạnh nếu có key riêng
      // ⇒ đọc số đo bình/lu/chậu chính xác hơn model rẻ. Không có key ⇒ dùng model mặc định.
      const advOpts = DETAILED_API_KEY ? { model: DETAILED_MODEL, apiKey: DETAILED_API_KEY } : {};
      const adv = await runAdvance(trimmed, advOpts);
      if (adv && adv.mode === 'advance' && adv.scene && adv.scene.base
          && Array.isArray(adv.scene.base.points) && adv.scene.base.points.length > 0) {
        const answerStep = (adv.scene.steps || []).find((s) => s && s.answer);
        const verified = !!(answerStep && answerStep.answer && answerStep.answer.verified);
        return {
          geometry: adv.scene.base,
          advanceScene: adv.scene,   // để admin duyệt lưu golden dạng Nâng cao (giữ nguyên bước + đáp số)
          verified, ok: true, confidence: verified ? 1 : null, violations: [],
          source: 'advance', attempts: 0, checkedConstraints: verified ? 1 : 0,
          note: verified
            ? 'Dựng bằng engine Nâng cao — thể tích/diện tích đã tự kiểm.'
            : 'Dựng bằng engine Nâng cao (đáp số chưa tự kiểm — hãy nhìn kỹ).',
        };
      }
    }
  } catch (e) {
    console.warn('[redraw] advance bỏ qua:', e?.message || e);
  }

  // ── 1) ENGINE tất định trước ────────────────────────────────────────────────
  try {
    const { solveProblem } = await import('./kernel-bridge/solveWithKernel.js');
    const k = await solveProblem(trimmed);
    const usable = k.ok && Array.isArray(k.geometry?.points) && k.geometry.points.length > 0
      && (k.violations?.length ?? 0) === 0 && (k.errors?.length ?? 0) === 0;
    if (usable) {
      return {
        geometry: normalizeGeometryData(k.geometry),
        verified: true, ok: true, confidence: 1, violations: [],
        source: 'kernel', attempts: 0, checkedConstraints: -1, // -1: kernel tự kiểm toàn bộ đề
        note: 'Engine tất định dựng được — toạ độ chính xác, đã tự kiểm mọi điều kiện đề.',
      };
    }
  } catch (e) {
    console.warn('[redraw] kernel bỏ qua:', e?.message || e);
  }

  // ── 2) Pass 1: lấy ràng buộc MÁY KIỂM ĐƯỢC (best-effort) ────────────────────
  let structured = [];
  try {
    const pass1Raw = await callVilao(STEP1_PARSE_PROMPT, trimmed, { maxTokens: 2048, timeoutMs: 25000 });
    const step1 = await parseJsonResponseWithAiRepair(pass1Raw);
    if (Array.isArray(step1?.constraints_structured)) structured = step1.constraints_structured;
  } catch (e) {
    console.warn('[redraw] Pass 1 bỏ qua:', e?.message || e);
  }

  // ── 3) LLM vẽ + tự chấm, giữ bản tốt nhất ───────────────────────────────────
  const SYSTEM_PROMPT = `${BASE_PROMPT}\n\n${LEVEL_STATIC}`;
  const userMsg = `Đề bài: "${trimmed}"

Bản vẽ TRƯỚC của hệ thống bị SAI. Hãy vẽ LẠI thật cẩn thận, ưu tiên ĐÚNG mọi điều kiện đề:
1. Xác định loại hình, đặt hệ toạ độ Oxyz Z-up hợp lý.
2. Tính toạ độ 3D CHÍNH XÁC cho các điểm chính (≤15 điểm). Kiểm lại từng điều kiện: vuông góc, độ dài, song song, trung điểm…
3. Dùng cones/spheres/circles cho hình tròn xoay.
4. Liệt kê các CẠNH CHÍNH (≤20 lines).
${structured.length ? `\nRÀNG BUỘC BẮT BUỘC THỎA (dạng máy sẽ tự kiểm):\n${JSON.stringify(structured)}\n` : ''}
⚠️ CHỈ trả về JSON thuần { geometry, calculation_log }, KHÔNG markdown. calculation_log tối đa 1 dòng.`;

  let best = null;
  let attempts = 0;
  for (let i = 0; i < maxAttempts; i++) {
    attempts = i + 1;
    try {
      // Ưu tiên model mạnh nếu có key riêng; không thì dùng model mặc định (vẫn hơn
      // luồng cũ nhờ Pass 1 + tự chấm + kernel-first). useReasoning=false ⇒ giữ JSON mode.
      const vilaoOpts = { maxTokens: 8192, timeoutMs: 35000, maxAttempts: 1 };
      if (DETAILED_API_KEY) { vilaoOpts.model = DETAILED_MODEL; vilaoOpts.apiKey = DETAILED_API_KEY; }
      const raw = await callVilao(SYSTEM_PROMPT, userMsg, vilaoOpts);
      const parsed = await parseJsonResponseWithAiRepair(raw);
      let geom = normalizeGeometryData(parsed.geometry || parsed);
      if (isLikely3DPrompt(trimmed) && isLikelyFlatGeometry(geom)) {
        geom = applyApexLiftFallback(geom);
      }
      if (pointsOf(geom).length === 0) continue; // bản này vô dụng, thử tiếp

      // Tự chấm bằng kernel (chỉ khi có ràng buộc cấu trúc).
      let verified = false, ok = true, confidence = null, violations = [], checked = 0;
      if (structured.length > 0) {
        try {
          const kv = await verifyWithKernel(geom.points, structured);
          if (kv.verified) {
            verified = kv.ok; ok = kv.ok; confidence = kv.confidence;
            violations = kv.violations || []; checked = kv.checked || 0;
          }
        } catch (e) {
          console.warn('[redraw] verify bỏ qua:', e?.message || e);
        }
      }

      const cand = {
        geometry: geom, verified: verified && ok, ok, confidence,
        violations, source: 'llm', attempts, checkedConstraints: checked,
        note: checked > 0
          ? (ok ? `Máy tự chấm ĐẠT ${checked} ràng buộc.` : `Máy tự chấm còn ${violations.length}/${checked} vi phạm — hãy nhìn kỹ.`)
          : 'Chưa tự chấm được (đề không có ràng buộc dạng máy hiểu) — hãy nhìn kỹ.',
      };
      // Tự chấm ĐẠT ⇒ dừng sớm.
      if (cand.verified) return cand;
      // Giữ bản tốt nhất: ít vi phạm hơn thì thay.
      if (!best || (cand.violations.length < best.violations.length)) best = cand;
    } catch (e) {
      console.warn(`[redraw] lần thử ${attempts} lỗi:`, e?.message || e);
    }
  }

  if (best) return best;
  return { geometry: null, verified: false, ok: false, confidence: null, violations: [], source: 'none', attempts, checkedConstraints: 0, note: 'Không vẽ được — thử lại hoặc dựng tay.' };
}
