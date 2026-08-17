// api/analyze-advance.js
// Route "Advance mode" — RÁP pipeline đa-câu thành một endpoint.
// Luồng: auth Bearer (Supabase) → trừ credit `draw_advance` → splitProblem (Pass 0) → phân nhánh:
//   - multi_question   → buildAdvanceScene → scene≠null ⇒ { mode:'advance', scene }
//   - continuous_animation → solveProblem (engine bài đơn, kinematic chảy qua đây) → gói 1-step timeline
//   - single / build-fail / animation-fail → FALLBACK bài đơn (solveProblem) + HOÀN chênh lệch credit
//     xuống mức "Vẽ kỹ" (draw_detailed) ⇒ { mode:'kernel', degraded:true, ...out }
//
// LƯU Ý (giống analyze-geometry.js): các mảnh advance/kernel-bridge được nạp ĐỘNG trong handler,
// KHÔNG import tĩnh — vì solveWithKernel.js kéo theo api/_lib/kernel-dist/ (BỊ GITIGNORE, chỉ sinh
// bởi `npm run build:kernel`). Import tĩnh sẽ giết route lúc load nếu kernel chưa build; nạp động ⇒
// lỗi rơi vào try/catch và trả lỗi sạch (đồng thời hoàn credit).
import crypto from 'crypto';
import { refund, creditCostFor } from './_lib/credits.js';
import { accessError, resolveAiAccess, withQuota, refundAiUsage } from './_lib/aiAccess.js';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { logBrokenProblem } from './_lib/brokenProblemLog.js';
import { createClient } from '@supabase/supabase-js';
import { findGolden } from './_lib/goldenStore.js';
import { requireAdmin } from './_lib/adminAuth.js';

// KHOÁ Advance (đang nâng cấp): tạm thời CHỈ quản trị viên được dùng chế độ Advance.
// Thông điệp trả về cho người dùng thường khi họ (hoặc client cũ) gọi thẳng endpoint.
export const ADVANCE_ADMIN_ONLY_MSG =
  'Chế độ Advance đang được nâng cấp, tạm thời chỉ dành cho quản trị viên. ' +
  'Bạn hãy dùng Vẽ nhanh hoặc Vẽ kỹ nhé.';

// Client service-role để tra "hình chuẩn" (golden). Thiếu env ⇒ null ⇒ bỏ qua golden (luồng cũ chạy y nguyên).
const _supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = _supaUrl && _supaKey ? createClient(_supaUrl, _supaKey) : null;

// Nhắn TRUNG THỰC khi đề rõ là tròn xoay nhưng KHÔNG dựng được mẫu rev-ox (ảnh mờ, kiểu quay chưa
// hỗ trợ…): thà báo thẳng còn hơn vẽ bừa một hình 3D không liên quan.
export const REV_UNSUPPORTED_MSG =
  'Đề tròn xoay này mình chưa dựng được khối (có thể ảnh đọc chưa rõ, hoặc kiểu quay chưa hỗ trợ). ' +
  'Bạn thử gõ lại đề bằng chữ, hoặc chụp rõ hơn giúp mình nhé.';

// Đợt 2: đề RÕ là "thể tích theo thiết diện đã biết" nhưng KHÔNG dựng được mẫu cross-known ⇒ báo thẳng
// (chống ảo giác), tái dùng cờ revUnsupported để frontend HOÀN credit + hiện toast như tròn xoay.
export const CROSS_UNSUPPORTED_MSG =
  'Mình nhận ra đây là bài thể tích theo thiết diện nhưng chưa dựng được. ' +
  'Bạn thử ghi rõ miền đáy (giới hạn bởi đường nào) và hình lát (vuông/tam giác đều/nửa tròn) giúp mình nhé.';

// Đợt 2: đề RÕ là "diện tích hình phẳng" nhưng KHÔNG dựng được mẫu area-plane ⇒ báo thẳng (chống ảo
// giác), tái dùng cờ revUnsupported để frontend HOÀN credit + hiện toast như tròn xoay.
export const AREA_UNSUPPORTED_MSG =
  'Mình nhận ra đây là bài diện tích hình phẳng nhưng chưa dựng được. ' +
  'Bạn thử ghi rõ hai đường giới hạn miền (y=… và y=…) giúp mình nhé.';

// Đợt 3: đề RÕ là "thiết diện khối đa diện" nhưng KHÔNG dựng được mẫu section-poly ⇒ báo thẳng (chống
// ảo giác), tái dùng cờ revUnsupported để frontend HOÀN credit + hiện toast như tròn xoay.
export const SECTION_UNSUPPORTED_MSG =
  'Mình nhận ra đây là bài thiết diện của khối đa diện nhưng chưa dựng được. ' +
  'Bạn thử ghi rõ khối (chóp/lăng trụ/hộp/lập phương) và 3 điểm xác định mặt phẳng cắt giúp mình nhé.';

// Vật thể tròn xoay GHÉP KHÚC (bình/lu/chậu/phễu): đề RÕ là vật thật tròn xoay nhưng KHÔNG dựng được
// mẫu rev-vessel (chưa trích được các khúc, số đo không khớp, hoặc mô hình không tự kiểm) ⇒ báo thẳng.
export const VESSEL_UNSUPPORTED_MSG =
  'Mình nhận ra đây là vật thể tròn xoay (bình/lu/chậu…) nhưng chưa dựng được. ' +
  'Bạn thử ghi rõ từng phần theo thiết diện qua trục (trụ / nón cụt / chỏm–đới cầu) kèm số đo giúp mình nhé.';

// Đọc ẢNH hỏng (vision timeout / ảnh mờ) ⇒ không chép được đề. Báo THẲNG, KHÔNG chạy fallback bài đơn
// trên text rỗng (translator sẽ tự retry → chồng thời gian → 504). Xem fail-fast trong assembleAdvance.
export const IMAGE_READ_FAILED_MSG =
  'Mình chưa đọc được đề trong ảnh (có thể ảnh hơi mờ hoặc chữ nhỏ). ' +
  'Bạn thử chụp rõ/gần hơn, hoặc gõ đề bằng chữ giúp mình nhé.';

// Chạm DEADLINE tổng (~52s) trước lằn 60s của Vercel ⇒ trả thông điệp sạch thay vì 504 thô (non-JSON).
export const ADVANCE_DEADLINE_MSG =
  'Đề này xử lý lâu quá mức cho phép. Bạn thử gõ đề bằng chữ (rút gọn), hoặc chụp rõ hơn rồi thử lại nhé.';

// Nhận diện đề TRÒN XOAY một cách TẤT ĐỊNH (không LLM) — dùng ở nhánh fallback để chống vẽ-bừa.
// Bắt "tròn xoay", hoặc (quay/xoay + quanh + trục Ox/Oy/hoành/tung).
export function looksLikeRevolution(text) {
  const s = String(text || '').toLowerCase();
  if (!s) return false;
  if (s.includes('tròn xoay')) return true;
  const hasSpin = /\b(quay|xoay)\b/.test(s);
  const hasAxis = /quanh/.test(s) && /(trục|\box\b|\boy\b|hoành|tung)/.test(s);
  return hasSpin && hasAxis;
}

// Nhận diện VẬT THỂ tròn xoay GHÉP KHÚC (vật thật: bình/lu/chậu/phễu/cốc/vại/bồn/thùng…) một cách TẤT
// ĐỊNH — dùng ở nhánh guard để báo thẳng khi chưa dựng được mẫu rev-vessel, thay vì rơi về vẽ-bừa.
// Cần TÊN VẬT + ngữ cảnh tròn-xoay/thiết-diện-qua-trục (để khỏi bắt nhầm mấy đề chỉ nhắc "cái bình" chơi).
export function looksLikeVessel(text) {
  const s = (text || '').toLowerCase();
  const hasVessel = /(b[iì]nh|c[aá]i lu|\blu\b|ch[aậ]u|ph[eễ]u|c[oố]c|\bly\b|v[aạ]i|b[oồ]n|th[uù]ng|chai|\bvò\b)/.test(s);
  const hasCtx = /(thi[eế]t di[eệ]n|tr[oò]n xoay|quay quanh|dung t[ií]ch)/.test(s);
  return hasVessel && hasCtx;
}

// Nhận diện đề THỂ TÍCH THEO THIẾT DIỆN đã biết một cách TẤT ĐỊNH (không LLM) — dùng ở nhánh guard để
// chống vẽ-bừa khi classifier trượt template cross-known. Cần cả "thiết diện" + tên hình lát.
export function looksLikeCrossSection(text) {
  const s = (text || '').toLowerCase();
  return /thi[eế]t di[eệ]n/.test(s) && /(vu[oô]ng|tam gi[aá]c|n[uử]a (h[iì]nh )?tr[oò]n|ch[uữ] nh[aậ]t)/.test(s);
}

// Nhận diện đề DIỆN TÍCH HÌNH PHẲNG một cách TẤT ĐỊNH (không LLM) — dùng ở nhánh guard để chống vẽ-bừa
// khi classifier trượt template area-plane. Cần "diện tích" + (hình phẳng | giới hạn | miền). Guard này
// chạy SAU looksLikeCrossSection (đề thiết diện có "diện tích" cũng có thể lọt vào đây) → thiết diện bắt trước.
export function looksLikeArea(text) {
  const s = (text || '').toLowerCase();
  return /di[eệ]n t[ií]ch/.test(s) && /(h[iì]nh ph[aẳ]ng|gi[oớ]i h[aạ]n|mi[eề]n)/.test(s);
}

// Nhận diện đề THIẾT DIỆN KHỐI ĐA DIỆN (Đợt 3) TẤT ĐỊNH: cần TỪ KHỐI + TÍN HIỆU CẮT. Đặt TRƯỚC
// looksLikeCrossSection (Đợt 2) vì đề chóp/hộp có thể chứa "vuông/tam giác" ở đáy → dễ bị cross-known nuốt.
export function looksLikeSection(text) {
  const s = (text || '').toLowerCase();
  const hasSolid = /(ch[oó]p|l[aă]ng tr[uụ]|h[iì]nh h[oộ]p|l[aậ]p\s*ph[uư][ơo]?ng|t[uứ] di[eệ]n)/.test(s);
  const hasCut = /(thi[eế]t di[eệ]n|c[aắ]t b[oở]i|m[aặ]t ph[aẳ]ng|mp\s*\()/.test(s);
  return hasSolid && hasCut;
}

// ===== LÕI THUẦN (deps-injected) — test 3 nhánh KHÔNG cần mạng =====
// deps = { splitProblem, buildAdvanceScene, solveProblem, buildRevolutionScene }. Xem test analyze-advance.test.js.
export async function assembleAdvance(problem, deps, opts = {}) {
  // GỘP đọc-ảnh + tách-đề: có ẢNH thì đẩy THẲNG ảnh xuống splitProblem (1 lượt vision vừa CHÉP đề vào
  // `setup` vừa phân loại) — thay cho 2 lượt transcribe→split (nhanh gấp đôi, ít điểm-spike hơn).
  const split = await deps.splitProblem(problem, opts);

  // Đề vào bằng ẢNH ⇒ `problem` rỗng; bản chép nằm ở `split.setup`. `effectiveText` là văn bản đề THẬT
  // (chữ user gõ, hoặc bản chép từ ảnh) — dùng cho nhận-diện tròn-xoay, fallback bài đơn & nhãn lịch sử.
  const effectiveText = (problem && problem.trim()) ? problem : (split.setup || '');

  // "Nộp cả bài" (Tầng 0): mọi nhánh engine BÓ TAY đính kèm `split` (bản máy đã HIỂU/TÁCH đề — phân loại
  // type/template + templateParams + bản chép đề ở split.setup) để route ghi vào problem_reports làm
  // nguyên liệu tự-cải-tiến. Trước đây các nhánh này trả về KHÔNG kèm gì ⇒ mất trắng "bài làm" của Advance
  // (route chỉ ghi được result.scene vốn null ở mọi ca hỏng). giveUp mặc định ok:false (đúng mọi nhánh bó
  // tay); nhánh fallback bài-đơn KHÔNG dùng giveUp vì `out` có thể ok:true (vẽ được) — xem chú thích ở đó.
  const giveUp = (extra) => ({ mode: 'kernel', degraded: true, ok: false, split, ...extra });

  // Nhánh mẫu calculus (Đợt 1: rev-ox). Engine dựng khối tất định, tự kiểm thể tích.
  if (split.template === 'rev-ox' && split.templateParams && deps.buildRevolutionScene) {
    try {
      const scene = deps.buildRevolutionScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng mẫu hỏng → rơi xuống fallback bài đơn */ }
  }

  // Vật thể tròn xoay GHÉP KHÚC (bình/lu/chậu/phễu). Engine dựng khối ghép + tự kiểm thể tích (công thức
  // đóng đối chiếu tích phân số). buildVesselScene trả null khi mô hình không tự-kiểm ⇒ rơi xuống guard.
  if (split.template === 'rev-vessel' && split.templateParams && deps.buildVesselScene) {
    try {
      const scene = deps.buildVesselScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng mẫu hỏng → rơi xuống guard vessel/fallback */ }
  }

  // Đợt 2: khối thiết diện đã biết. Engine dựng & tự-kiểm thể tích.
  if (split.template === 'cross-known' && split.templateParams && deps.buildSliceScene) {
    try {
      const scene = deps.buildSliceScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng hỏng → fallback */ }
  }

  // Đợt 2: diện tích hình phẳng. Engine tính & tự-kiểm S=∫|f−g|dx.
  if (split.template === 'area-plane' && split.templateParams && deps.buildAreaScene) {
    try {
      const scene = deps.buildAreaScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng hỏng → fallback */ }
  }

  // Đợt 3: thiết diện khối đa diện. Engine dựng đa giác giao & tự-kiểm diện tích.
  if (split.template === 'section-poly' && split.templateParams && deps.buildSectionScene) {
    try {
      const scene = deps.buildSectionScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng hỏng → fallback */ }
  }

  if (split.type === 'multi_question') {
    const scene = await deps.buildAdvanceScene(effectiveText, split, opts);
    if (scene) return { mode: 'advance', scene };
    // scene=null (base dựng hỏng) → rơi xuống fallback bài đơn.
  } else if (split.type === 'continuous_animation') {
    try {
      const out = await deps.solveProblem(effectiveText, opts);
      if (out?.ok && out.geometry) {
        const g = out.geometry;
        return {
          mode: 'advance',
          scene: {
            base: g,
            steps: [{ id: 'main', label: '', visibleIds: (g.points || []).map((p) => p.id), timeline: g.timeline }],
          },
        };
      }
    } catch { /* solveProblem ném → rơi xuống fallback bài đơn */ }
    // engine chịu animation → rơi xuống fallback bài đơn.
  }

  // Đề RÕ là tròn xoay nhưng rơi tới đây (không dựng được mẫu rev-ox) ⇒ KHÔNG vẽ bừa hình 3D lạ
  // (chống ảo giác). Trả tín hiệu trung thực để frontend nhắn người dùng gõ lại / chụp rõ hơn.
  // (Bài đã dựng được rev-ox thì đã return ở nhánh trên, không chạm tới đây.)
  // Đợt 2: đề RÕ là thể tích theo thiết diện nhưng không dựng nổi mẫu cross-known ⇒ báo thẳng (tái dùng
  // cờ revUnsupported để frontend hoàn credit). Đặt TRƯỚC guard tròn xoay: đề thiết diện không khớp
  // rev-ox/looksLikeRevolution nên cần bắt riêng, tránh rơi xuống fallback bài đơn (vẽ hình lạ).
  // Đợt 3: đề RÕ là thiết diện khối đa diện nhưng không dựng nổi mẫu section-poly ⇒ báo thẳng (tái dùng
  // cờ revUnsupported để hoàn credit). Đặt TRƯỚC guard cross-known: đề chóp/hộp có thể chứa "vuông/tam
  // giác" ở đáy → phải cho looksLikeSection bắt trước, tránh cross-known nuốt nhầm.
  if (looksLikeSection(effectiveText)) {
    return giveUp({ revUnsupported: true, error: SECTION_UNSUPPORTED_MSG });
  }

  if (looksLikeCrossSection(effectiveText)) {
    return giveUp({ revUnsupported: true, error: CROSS_UNSUPPORTED_MSG });
  }

  // Đợt 2: đề RÕ là diện tích hình phẳng nhưng không dựng nổi mẫu area-plane ⇒ báo thẳng (tái dùng cờ
  // revUnsupported để hoàn credit). Đặt SAU guard thiết diện: đề thiết diện cũng chứa "diện tích" nên
  // phải cho looksLikeCrossSection bắt trước, tránh area nuốt nhầm.
  if (looksLikeArea(effectiveText)) {
    return giveUp({ revUnsupported: true, error: AREA_UNSUPPORTED_MSG });
  }

  // Vật thật tròn xoay (bình/lu/chậu) chưa dựng nổi mẫu rev-vessel ⇒ báo thẳng (tái dùng cờ revUnsupported
  // để hoàn credit). Đặt TRƯỚC looksLikeRevolution: vật thật có chứa "tròn xoay" nên cần bắt riêng để cho
  // thông điệp cụ thể hơn (ghi rõ trụ/nón cụt/chỏm cầu) thay vì thông điệp tròn-xoay-giải-tích chung chung.
  if (looksLikeVessel(effectiveText)) {
    return giveUp({ revUnsupported: true, error: VESSEL_UNSUPPORTED_MSG });
  }

  if (looksLikeRevolution(effectiveText)) {
    return giveUp({ revUnsupported: true, error: REV_UNSUPPORTED_MSG });
  }

  // FAIL-FAST (gốc bug 504): đề vào bằng ẢNH nhưng vision KHÔNG chép được đề (effectiveText rỗng) ⇒ đừng
  // chạy fallback solveProblem trên text RỖNG — vừa vô nghĩa, vừa để translator tự retry (maxAttempts:2)
  // chồng thời gian > 60s → 504. Báo thẳng + đánh dấu revUnsupported để handler HOÀN TOÀN BỘ (vẽ được gì
  // đâu). `imageReadFailed` phân biệt "đọc ảnh hỏng" với "kiểu quay chưa hỗ trợ" (frontend nhắn cho hợp).
  if (opts.imageBase64 && !effectiveText.trim()) {
    return giveUp({ revUnsupported: true, imageReadFailed: true, error: IMAGE_READ_FAILED_MSG });
  }

  // single / build-fail / animation-fail → FALLBACK: xử bài đơn, đánh dấu degraded để handler hoàn credit.
  // solveProblem NÉM khi translator abstain → trả degraded sạch (KHÔNG để 500 xuyên lên handler).
  try {
    const out = await deps.solveProblem(effectiveText, opts);
    // KHÔNG dùng giveUp: `out` có thể ok:true (vẽ được bài đơn) — không được ép ok:false. Đính `split`
    // TRƯỚC `...out` để `out` (nếu có plan riêng) vẫn đè lên; route ghi được cả split + plan khi ok:false.
    return { mode: 'kernel', degraded: true, split, ...out };
  } catch (e) {
    return giveUp({ abstained: true, error: String(e?.message || e).slice(0, 120) });
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let userId = null;        // ví credit: cần ở scope hàm để catch ngoài cùng hoàn được
  let creditCharge = null;  // { cost, reqId } nếu đã TRỪ credit (paid tier) → hoàn khi lỗi
  let access = null;        // cần ở scope hàm để catch hoàn được quota free/khách
  const startedAt = Date.now();          // đo thời gian (log bài lỗi)
  let dbgPrompt = null, dbgImage = false; // ngữ cảnh cho log lỗi ở catch
  try {
    // ---- Đề bài ---- (Advance nhận CHỮ hoặc ẢNH: có ảnh thì Pass -1 CHÉP đề ảnh ra chữ trong lõi)
    const { prompt, imageBase64 } = req.body || {};
    dbgImage = !!imageBase64;
    const hasText = typeof prompt === 'string' && prompt.trim().length >= 1;
    if (!hasText && !imageBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu: cần prompt hoặc ảnh' });
    }
    if (hasText && prompt.trim().length > 5000) {
      return res.status(400).json({ error: 'Mô tả quá dài (tối đa 5000 ký tự)' });
    }
    // Seed CHỮ: có chữ thì dùng chữ; chỉ-ảnh → '' (splitProblem sẽ đọc ảnh & điền đề vào split.setup).
    const problemSeed = hasText ? prompt.trim() : '';
    dbgPrompt = problemSeed || null;

    // ---- KHOÁ Advance: CHỈ quản trị viên ---- (chặn TRƯỚC khi trừ credit/quota)
    // Đọc role='admin' TỪ DB (không tin client). Người dùng thường / khách nhận 403 với thông điệp
    // "đang nâng cấp"; chưa đăng nhập (không có Bearer) nhận 401 để client mời đăng nhập.
    const adminGate = await requireAdmin(req);
    if (!adminGate.ok) {
      if (adminGate.status === 403) {
        return res.status(403).json({ error: ADVANCE_ADMIN_ONLY_MSG, code: 'advance_admin_only' });
      }
      return res.status(adminGate.status).json({ error: adminGate.error });
    }

    access = await resolveAiAccess(req, res, {
      feature: 'draw',
      action: 'draw_advance',
      allowGuest: false,
    });
    if (!access.ok) return accessError(res, access);
    userId = access.userId;
    if (access.gate.mode === 'credit') {
      creditCharge = { cost: access.gate.cost, reqId: crypto.randomUUID() };
    }

    // ---- HÌNH CHUẨN (GOLDEN) — phục vụ THẲNG nếu đề này đã có hình admin duyệt (chỉ CHỮ) ----
    // Bình/lu/chậu (hoặc bài Nâng cao khác) từng vẽ sai, admin đã "Nhờ AI vẽ lại" + duyệt ⇒ lần sau ra
    // ngay, không tốn engine. Không gọi pipeline ⇒ HOÀN credit như nhánh cache. Fail-safe: findGolden nuốt
    // mọi lỗi/DB thiếu và trả null ⇒ rơi êm về luồng Nâng cao bình thường.
    if (problemSeed && supabase) {
      const golden = await findGolden(supabase, problemSeed);
      if (golden) {
        if (creditCharge && userId) {
          try { await refund(userId, creditCharge.cost, creditCharge.reqId); }
          catch (e) { console.warn('Hoàn credit golden-hit (advance) lỗi:', e?.message); }
          creditCharge = null;
        }
        console.log('[golden] phục vụ (advance):', problemSeed.substring(0, 60));
        return res.json(withQuota(golden.response, access));
      }
    }

    // ---- Nạp ĐỘNG các mảnh pipeline (lỗi import ⇒ rơi vào catch, hoàn credit) ----
    const [{ splitProblem }, { buildAdvanceScene }, { solveProblem }, { buildRevolutionScene }, { buildSliceScene }, { buildAreaScene }, { buildSectionScene }, { buildVesselScene }] = await Promise.all([
      import('./_lib/advance/splitProblem.js'),
      import('./_lib/advance/buildAdvanceScene.js'),
      import('./_lib/kernel-bridge/solveWithKernel.js'),
      import('./_lib/advance/buildRevolutionScene.js'),
      import('./_lib/advance/buildSliceScene.js'),
      import('./_lib/advance/buildAreaScene.js'),
      import('./_lib/advance/buildSectionScene.js'),
      import('./_lib/advance/buildVesselScene.js'),
    ]);

    // Có ảnh → splitProblem GỘP đọc-ảnh + tách-đề trong 1 lượt vision (chép đề vào split.setup rồi phân
    // loại). assembleAdvance lấy split.setup làm `effectiveText` cho nhận-diện tròn-xoay + fallback bài đơn.
    //
    // DEADLINE tổng (~52s): chặn TRƯỚC lằn 60s của Vercel để trả JSON sạch thay vì 504 thô (non-JSON,
    // frontend chỉ hiện "Lỗi Advance"). Chạm deadline ⇒ coi như revUnsupported (hoàn TOÀN BỘ, vẽ được gì
    // đâu) + thông điệp thân thiện. Dù chống chồng thời gian ở các tầng dưới rồi, đây là lưới an toàn cuối.
    const DEADLINE_MS = Number(process.env.ADVANCE_DEADLINE_MS) || 52000;
    let deadlineTimer;
    const deadline = new Promise((resolve) => { deadlineTimer = setTimeout(() => resolve({ __deadline: true }), DEADLINE_MS); });
    let result = await Promise.race([
      assembleAdvance(problemSeed, { splitProblem, buildAdvanceScene, solveProblem, buildRevolutionScene, buildSliceScene, buildAreaScene, buildSectionScene, buildVesselScene }, { imageBase64 }),
      deadline,
    ]);
    clearTimeout(deadlineTimer);
    if (result && result.__deadline) {
      result = { mode: 'kernel', degraded: true, ok: false, revUnsupported: true, error: ADVANCE_DEADLINE_MSG };
    }

    // ---- Fallback tụt-hạng: đã trừ mức Advance nhưng chỉ xử bài đơn ⇒ HOÀN chênh lệch xuống Vẽ kỹ ----
    // Công bằng: user chỉ bị tính bằng mức "Vẽ kỹ" (draw_detailed) khi không được phục vụ đa-cảnh.
    if (result?.degraded && creditCharge && userId) {
      if (result.revUnsupported) {
        // KHÔNG vẽ được gì (đề tròn xoay không dựng nổi) ⇒ HOÀN TOÀN BỘ, không tính tiền.
        try { await refund(userId, creditCharge.cost, creditCharge.reqId + ':rev-unsupported'); }
        catch (e) { console.warn('Hoàn credit rev-unsupported lỗi:', e?.message); }
        creditCharge.cost = 0;
      } else {
        const target = creditCostFor('draw_detailed');
        const diff = creditCharge.cost - target;
        if (diff > 0) {
          try { await refund(userId, diff, creditCharge.reqId + ':downgrade'); }
          catch (e) { console.warn('Hoàn credit tụt-hạng lỗi:', e?.message); }
          creditCharge.cost = target; // còn lại = mức Vẽ kỹ (phòng lỗi phát sinh sau vẫn hoàn đúng)
        }
      }
    }

    // Soft-failure Advance (trả 200 kèm error) — máy KHÔNG dựng được cảnh; ghi cho admin.
    // KHÔNG log nhánh `degraded` thuần (vẫn vẽ được bài đơn) — chỉ log khi thực sự hỏng.
    if (result && (result.ok === false || result.revUnsupported || result.imageReadFailed || result.abstained)) {
      await logBrokenProblem({
        endpoint: 'analyze-advance', userId, mode: 'advance', prompt: problemSeed || null,
        imageProvided: !!imageBase64,
        // "Nộp cả bài": scene (nếu dựng được rồi vẫn hỏng) → else BẢN MÁY HIỂU ĐỀ: split (phân loại +
        // bản chép đề) + plan (Plan translator ở nhánh bài-đơn, nếu có). Trước đây luôn là null.
        aiJson: result.scene
          || (result.split || result.plan
                ? { split: result.split ?? null, plan: result.plan ?? null }
                : null),
        errorMessage: result.error || 'advance không dựng được cảnh',
        errorStage: result.revUnsupported ? 'unsupported'
          : result.imageReadFailed ? 'image_read'
          : result.abstained ? 'abstain' : 'degraded',
        durationMs: Date.now() - startedAt,
      });
    }

    return res.json(withQuota(result, access));
  } catch (error) {
    await reportServerError(error, { route: 'analyze-advance' });
    console.error('Error in analyze-advance:', error);
    // Lỗi sau khi đã trừ ⇒ HOÀN credit đã trừ (nếu có) VÀ lượt quota free/khách.
    await refundAiUsage(access);
    if (creditCharge && userId) {
      try { await refund(userId, creditCharge.cost, creditCharge.reqId); }
      catch (e) { console.warn('refund credit lỗi:', e?.message); }
    }
    const isAbort = error?.name === 'AbortError' || (error?.message || '').includes('aborted');
    // Ghi bài lỗi (ngoại lệ/timeout) cho trang admin — không chặn phản hồi.
    await logBrokenProblem({
      endpoint: 'analyze-advance', userId, mode: 'advance', prompt: dbgPrompt,
      imageProvided: dbgImage, errorMessage: error?.message || String(error),
      errorStage: isAbort ? 'timeout' : 'exception', durationMs: Date.now() - startedAt,
    });
    const status = isAbort ? 504 : (error?.status || 500);
    const message = isAbort
      ? 'Yêu cầu quá lâu, vui lòng thử lại với đề bài ngắn hơn'
      : (error?.message || 'Unknown error');
    return res.status(status).json({ error: message });
  }
}

export const config = { maxDuration: 60 };

export default withSentry(handler, 'analyze-advance');
