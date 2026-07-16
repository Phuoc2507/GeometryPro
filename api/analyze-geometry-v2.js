// api/analyze-geometry-v2.js
// "Kernel mode" — route MỚI, chạy SONG SONG với /api/analyze-geometry cũ (không đụng luồng cũ).
// Đề → engine tất định → hình đúng + đáp số exact. Không để LLM tự sinh toạ độ.
//
// POST body:
//   { problem: "..." }  → dịch bằng LLM (Vilao) rồi chạy engine.
//   { plan: {...} }      → chạy thẳng Plan JSON qua engine (dry-run, không cần LLM — để test).
import { solveProblem, solvePlan } from './_lib/kernel-bridge/solveWithKernel.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { problem, plan } = req.body || {};
  try {
    if (plan) {
      // Dry-run: kiểm nửa engine mà không cần LLM.
      return res.json({ mode: 'dry-run', ...solvePlan(plan) });
    }
    if (!problem || typeof problem !== 'string') {
      return res.status(400).json({ error: 'Provide { problem: string } (LLM) hoặc { plan } (dry-run engine)' });
    }
    const out = await solveProblem(problem);
    return res.json({ mode: 'kernel', ...out });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'kernel-mode failed' });
  }
}
