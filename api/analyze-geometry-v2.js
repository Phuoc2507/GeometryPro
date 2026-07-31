import crypto from 'crypto';
import { solveProblem, solvePlan } from './_lib/kernel-bridge/solveWithKernel.js';
import { accessError, resolveAiAccess, withQuota, refundAiUsage } from './_lib/aiAccess.js';
import { refund } from './_lib/credits.js';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { logBrokenProblem } from './_lib/brokenProblemLog.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startedAt = Date.now();  // đo thời gian (log bài lỗi)
  const { problem, plan } = req.body || {};
  if (plan) {
    // Raw plans are a deterministic developer/test entrypoint, not a public
    // production API.
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not Found' });
    }
    return res.json({ mode: 'dry-run', ...solvePlan(plan) });
  }

  if (!problem || typeof problem !== 'string' || problem.trim().length < 1) {
    return res.status(400).json({ error: 'Provide { problem: string }' });
  }
  if (problem.trim().length > 5000) {
    return res.status(400).json({ error: 'Mô tả quá dài (tối đa 5000 ký tự)' });
  }

  const access = await resolveAiAccess(req, res, {
    feature: 'draw',
    action: 'draw_quick',
    allowGuest: true,
    guestFeature: 'draw_quick',
    guestMax: 2,
  });
  if (!access.ok) return accessError(res, access);

  const creditCharge = access.actorType === 'account' && access.gate.mode === 'credit'
    ? { cost: access.gate.cost, reqId: crypto.randomUUID() }
    : null;

  try {
    const out = await solveProblem(problem.trim());
    return res.json(withQuota({ mode: 'kernel', ...out }, access));
  } catch (error) {
    await reportServerError(error, { route: 'analyze-geometry-v2' });
    await refundAiUsage(access); // hoàn quota free/khách khi lỗi
    if (creditCharge && access.userId) {
      await refund(access.userId, creditCharge.cost, creditCharge.reqId);
    }
    await logBrokenProblem({
      endpoint: 'analyze-geometry-v2', userId: access.userId, mode: 'kernel',
      prompt: (problem || '').trim() || null,
      errorMessage: error instanceof Error ? error.message : 'kernel-mode failed',
      errorStage: 'exception', durationMs: Date.now() - startedAt,
    });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'kernel-mode failed',
    });
  }
}

export default withSentry(handler, 'analyze-geometry-v2');
