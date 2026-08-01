// api/admin-redraw.js
// Endpoint ADMIN: "Nhờ AI vẽ lại kỹ hơn" một bài từng vẽ sai. Tách riêng khỏi
// /api/admin vì chạy LÂU (gọi LLM nhiều bước) — để giới hạn thời lượng riêng và
// không giữ chỗ hàm admin gộp.
//
// KHÔNG phục vụ khách, KHÔNG cache, KHÔNG trừ credit: chỉ trả candidate + "máy tự
// chấm" cho admin xem rồi tự bấm Đúng/Sai (lưu golden qua /api/admin save-golden).
import { withSentry, reportServerError } from './_lib/sentry.js';
import { requireAdmin } from './_lib/adminAuth.js';
import { redrawProblem } from './_lib/redrawProblem.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const gate = await requireAdmin(req);
  if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) return res.status(400).json({ error: 'Thiếu đề bài' });
  if (prompt.length > 5000) return res.status(400).json({ error: 'Đề bài quá dài' });

  // Cho phép admin xin nhiều lần thử hơn (1..3). Mặc định 1 để chắc chắn trong hạn thời lượng.
  const maxAttempts = Math.max(1, Math.min(3, parseInt(req.body?.maxAttempts, 10) || 1));

  try {
    const candidate = await redrawProblem(prompt, { maxAttempts });
    return res.json({
      ok: true,
      candidate: {
        geometry: candidate.geometry,
        prompt,
        verdict: {
          verified: candidate.verified,
          ok: candidate.ok,
          confidence: candidate.confidence,
          violations: candidate.violations,
          source: candidate.source,
          attempts: candidate.attempts,
          checkedConstraints: candidate.checkedConstraints,
          note: candidate.note,
        },
      },
    });
  } catch (error) {
    await reportServerError(error, { route: 'admin-redraw' });
    console.error('[admin-redraw] lỗi:', error?.message);
    return res.status(500).json({ error: error?.message || 'Lỗi máy chủ khi vẽ lại' });
  }
}

// Chạy nhiều bước LLM → cần thời lượng dài hơn mặc định (khớp mức analyze-advance).
export const config = { maxDuration: 60 };

export default withSentry(handler, 'admin-redraw');
