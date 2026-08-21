import { callVilao } from './_lib/vilao.js';
import { SOLVE_SYSTEM_PROMPT, buildSolveUserMessage } from './_lib/solvePrompts.js';
import { engineSolved, assembleSolveResult } from './_lib/solveAssemble.js';
// parseSolveResponse rút sang solveCore.js (dùng chung với solveSteps) — 1 nguồn sự thật.
import { parseSolveResponse } from './_lib/solveCore.js';
import { tierFromThrow } from './_lib/kernel-bridge/classifyTier.js';
import { refund } from './_lib/credits.js';
import { accessError, resolveAiAccess, withQuota, refundAiUsage } from './_lib/aiAccess.js';
import crypto from 'crypto';
import { withSentry } from './_lib/sentry.js';
import { logBrokenProblem } from './_lib/brokenProblemLog.js';
import { persistSolveResult } from './_lib/persistSolve.js';
import { normalizePrompt } from './_lib/promptNormalize.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startedAt = Date.now();  // đo thời gian (log bài lỗi)
  const { problem, geometry, tags, id } = req.body || {};  // id = khoá lịch sử (?id) để LƯU kèm ở server

  // Validate đầu vào TRƯỚC khi trừ credit (không trừ cho request hỏng).
  if (!problem || typeof problem !== 'string' || problem.trim().length < 10) {
    return res.status(400).json({ error: 'problem text is required (min 10 chars)' });
  }
  if (!geometry || !Array.isArray(geometry.points) || geometry.points.length < 2) {
    return res.status(400).json({
      error: 'geometry is required with at least 2 points. Call /api/analyze-geometry first.',
    });
  }

  const access = await resolveAiAccess(req, res, {
    feature: 'solve',
    action: 'solve',
    allowGuest: true,
    guestFeature: 'solve',
    guestMax: 1,
  });
  if (!access.ok) return accessError(res, access);

  let creditCharge = access.actorType === 'account' && access.gate.mode === 'credit'
    ? { cost: access.gate.cost, reqId: crypto.randomUUID() }
    : null;
  const refundIfCharged = async () => {
    // Hoàn lượt quota free / khách (no-op với credit); có once-guard nên gọi nhiều lần vẫn 1 lần.
    await refundAiUsage(access);
    if (creditCharge && access.userId) {
      try { await refund(access.userId, creditCharge.cost, creditCharge.reqId); }
      catch (e) { console.warn('[solve] refund credit lỗi:', e?.message); }
      creditCharge = null;
    }
  };

  // Engine tất định giải trước → đáp số + verified THẬT. Có thể ném (abstain/schema) ⇒ bọc try/catch.
  let eng = null;
  let engTier = null; // tier khi solveProblem NÉM (hiếm: import kernel-dist hỏng / runAny nổ bất ngờ).
  const es = geometry.engineSolve;
  const ea = geometry.engineAnswer;
  // Fix #1 — CHỈ tái dùng đáp engine từ bước VẼ khi ĐỀ hiện tại KHỚP đề đã sinh ra đáp đó
  // (đóng dấu geometry.engineProblem lúc vẽ). Ô đề trong SolverPanel SỬA được: nếu người dùng đổi
  // câu hỏi trên cùng một hình, đáp cũ KHÔNG còn đúng → tuyệt đối không được gắn "đã kiểm chứng" cho
  // nó. engineProblem VẮNG (hình vẽ trước bản vá) ⇒ giữ hành vi tái dùng (tránh hồi quy chi phí dịch).
  const engineProblemMatches = geometry.engineProblem == null
    || normalizePrompt(geometry.engineProblem) === normalizePrompt(problem.trim());
  if (engineProblemMatches && es && typeof es === 'object' && Array.isArray(es.answers)) {
    // Tái dùng TRỌN kết quả engine từ bước VẼ (engine tất định ⇒ chạy lại cũng y hệt) — bỏ HẲN
    // lượt gọi translator LLM lần hai. Áp cho cả bài THANG CHỮ (approx=null) mà engineAnswer bỏ sót.
    eng = { ok: !!es.ok, answers: es.answers, violations: es.violations || [], tier: es.tier || null };
  } else if (engineProblemMatches && ea && typeof ea.approx === 'number' && Number.isFinite(ea.approx)) {
    // Tái dùng đáp engine từ bước VẼ — KHÔNG chạy engine lại (bỏ dịch+giải trùng)
    eng = { ok: !!ea.verified, answers: [{ text: ea.text, approx: ea.approx }], violations: [] };
  } else {
    try {
      const { solveProblem } = await import('./_lib/kernel-bridge/solveWithKernel.js');
      eng = await solveProblem(problem.trim());
    } catch (e) {
      console.warn('[solve] engine không giải được, dùng lời giải LLM:', e?.message || e);
      engTier = tierFromThrow(e);
    }
  }
  const engAnswer = engineSolved(eng) ? eng.answers[0].text : null;

  const userMessage = buildSolveUserMessage(problem.trim(), geometry, tags, engAnswer);

  let raw;
  try {
    raw = await callVilao(SOLVE_SYSTEM_PROMPT, userMessage, {
      maxTokens: 6144,
      timeoutMs: 120000,
    });
  } catch (err) {
    console.error('[solve] Vilao API error:', err.message);
    await refundIfCharged();
    await logBrokenProblem({
      endpoint: 'solve', userId: access.userId, prompt: problem,
      errorMessage: `LLM call failed: ${err.message}`, errorStage: 'llm_failed',
      durationMs: Date.now() - startedAt,
    });
    return res.status(502).json({ error: `LLM call failed: ${err.message}` });
  }

  const parsed = parseSolveResponse(raw);
  if (!parsed) {
    console.error('[solve] Failed to parse LLM response:n', raw.slice(0, 500));
    await refundIfCharged();
    await logBrokenProblem({
      endpoint: 'solve', userId: access.userId, prompt: problem,
      errorMessage: `LLM returned invalid JSON: ${raw.slice(0, 300)}`, errorStage: 'parse',
      durationMs: Date.now() - startedAt,
    });
    return res.status(422).json({
      error: 'LLM returned invalid JSON',
      raw_preview: raw.slice(0, 300),
    });
  }

  const out = assembleSolveResult(eng, parsed);
  // Ưu tiên: tier từ solveProblem → tier lỗi (catch) → classification tái dùng từ hình (nhánh reuse).
  const tier = (eng && eng.tier) || engTier || (geometry && geometry.classification) || null;
  const result = { ...out, tier };

  // LƯU kết quả tại SERVER (nếu là tài khoản + có id lịch sử) → F5/rời trang giữa chừng
  // vẫn không mất lời giải, không mất credit oan. Nuốt lỗi, không chặn response.
  if (access.userId && typeof id === 'string' && id) {
    try { await persistSolveResult({ userId: access.userId, historyId: id, problem: problem.trim(), result }); }
    catch { /* bỏ qua */ }
  }

  return res.json(withQuota({ ...result, geometry }, access));
}

export default withSentry(handler, 'solve');
