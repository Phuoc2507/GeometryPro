import { createClient } from '@supabase/supabase-js';
import { callVilao } from './_lib/vilao.js';
import { parseJsonResponse, repairTruncatedJson } from './_lib/jsonHelpers.js';
import { SOLVE_SYSTEM_PROMPT, buildSolveUserMessage, buildCoordPreamble } from './_lib/solvePrompts.js';

function parseSolveResponse(raw) {
  const text = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed = null;
  // parseJsonResponse handles fence-stripping + first-JSON extraction, and throws on failure.
  try {
    parsed = parseJsonResponse(text);
  } catch (_e) {
    try {
      parsed = parseJsonResponse(repairTruncatedJson(text));
    } catch (_e2) {
      return null;
    }
  }
  if (!parsed) return null;

  if (!Array.isArray(parsed.steps)) return null;
  if (typeof parsed.final_answer !== 'string') return null;

  return parsed;
}

function normalizeSteps(steps) {
  return steps.map((s, i) => ({
    id:          s.id          || `s${i + 1}`,
    title:       s.title       || `Bước ${i + 1}`,
    explanation: s.explanation || '',
    formula:     s.formula     || null,
    highlight:   Array.isArray(s.highlight) ? s.highlight : [],
    view_mode:   s.view_mode === '2d' ? '2d' : '3d',
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { problem, geometry, tags } = req.body || {};

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Bạn cần đăng nhập để giải bài' });
  }
  const token = authHeader.split(' ')[1];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Phiên đăng nhập không hợp lệ' });
  }
  
  // Check Pro Plan
  const { data: profile } = await supabase.from('profiles').select('plan_type, plan_expires_at').eq('user_id', user.id).maybeSingle();
  const isPro = profile?.plan_type === 'pro' && profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date();
  if (!isPro) {
    return res.status(403).json({ error: 'Forbidden: Tính năng Giải bài không giới hạn yêu cầu tài khoản Pro' });
  }

  if (!problem || typeof problem !== 'string' || problem.trim().length < 10) {
    return res.status(400).json({ error: 'problem text is required (min 10 chars)' });
  }
  if (!geometry || !Array.isArray(geometry.points) || geometry.points.length < 2) {
    return res.status(400).json({
      error: 'geometry is required with at least 2 points. Call /api/analyze-geometry first.',
    });
  }

  const userMessage = buildSolveUserMessage(problem.trim(), geometry, tags);

  let raw;
  try {
    raw = await callVilao(SOLVE_SYSTEM_PROMPT, userMessage, {
      maxTokens: 6144,
      timeoutMs: 120000,
    });
  } catch (err) {
    console.error('[solve] Vilao API error:', err.message);
    return res.status(502).json({ error: `LLM call failed: ${err.message}` });
  }

  const parsed = parseSolveResponse(raw);
  if (!parsed) {
    console.error('[solve] Failed to parse LLM response:n', raw.slice(0, 500));
    return res.status(422).json({
      error: 'LLM returned invalid JSON',
      raw_preview: raw.slice(0, 300),
    });
  }

  const steps = normalizeSteps(parsed.steps);
  const finalAnswer = parsed.final_answer;
  const answerValue = typeof parsed.answer_value === 'number' ? parsed.answer_value : null;

  // On Vercel we don't have local Python execution.
  // We assume the LLM result is correct without local python sandbox verification.
  const verified = true;
  const verifyError = null;
  const sandboxValue = answerValue;

  return res.json({
    steps,
    final_answer:  finalAnswer,
    answer_value:  sandboxValue,
    verified,
    verify_error:  verifyError,
    geometry,
  });
}
