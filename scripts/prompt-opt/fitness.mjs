// scripts/prompt-opt/fitness.mjs
// Chấm điểm MỘT genome trên tập dữ liệu:
//   fitness = accuracy  −  lambda · (số_token_prompt / 1000)
//   accuracy = tỉ lệ ca mà: đề → dịch(prompt) → plan → engine.solvePlan → compareCase == 'pass'.
// Trả thêm chỉ số phụ (abstain, phân bố verdict, latency) để báo cáo & vẽ biểu đồ.
//
// CACHE theo (provider, model, genomeKey, itemId): nhiều genome trùng nhau qua các thế hệ ⇒ KHÔNG
// gọi lại LLM ⇒ tiết kiệm phí thật. Cache do run.mjs cấp (Map) và có thể ghi ra đĩa.
import { assemblePrompt, genomeKey } from './genome.mjs';
import { solvePlan } from '../../api/_lib/kernel-bridge/solveWithKernel.js';
import { compareCase } from '../../api/_lib/bench/compareCase.js';

const estTokens = (s) => Math.ceil(String(s).length / 4); // xấp xỉ nhanh; đủ để phạt độ dài prompt

// Chạy một ca, trả { verdict, reason, ms }. Không ném — mọi lỗi quy về verdict thất bại.
async function runOne(translate, item, prompt, genome) {
  const t0 = Date.now();
  try {
    const plan = await translate(item, prompt, genome);
    const result = solvePlan(plan);
    const cmp = compareCase(item, result);
    return { verdict: cmp.verdict, reason: cmp.detail, ms: Date.now() - t0 };
  } catch (e) {
    const msg = String(e && e.message || e);
    const verdict = /abstain/i.test(msg) ? 'abstain' : 'translate-error';
    return { verdict, reason: msg, ms: Date.now() - t0 };
  }
}

// Giới hạn số tác vụ chạy đồng thời (cho provider thật gọi mạng).
function pLimit(n) {
  const q = [];
  let active = 0;
  const runNext = () => {
    if (active >= n || q.length === 0) return;
    active++;
    const { fn, resolve, reject } = q.shift();
    fn().then(resolve, reject).finally(() => { active--; runNext(); });
  };
  return (fn) => new Promise((resolve, reject) => { q.push({ fn, resolve, reject }); runNext(); });
}

export async function evaluateGenome(genome, ctx) {
  const { basePrompt, dataset, translate, cache, lambda = 0.02, concurrency = 4 } = ctx;
  const prompt = assemblePrompt(basePrompt, genome);
  const key = genomeKey(genome);
  const limit = pLimit(concurrency);

  const perItem = await Promise.all(
    dataset.map((item) =>
      limit(async () => {
        const ck = `${ctx.provider}|${ctx.model || ''}|${key}|${item.id}`;
        if (cache && cache.has(ck)) return { id: item.id, ...cache.get(ck), cached: true };
        const r = await runOne(translate, item, prompt, genome);
        if (cache) cache.set(ck, r);
        return { id: item.id, ...r, cached: false };
      })
    )
  );

  const passes = perItem.filter((r) => r.verdict === 'pass').length;
  const accuracy = dataset.length ? passes / dataset.length : 0;
  const tokens = estTokens(prompt);
  const fitness = accuracy - lambda * (tokens / 1000);

  const verdictCounts = {};
  let totalMs = 0;
  for (const r of perItem) {
    verdictCounts[r.verdict] = (verdictCounts[r.verdict] || 0) + 1;
    totalMs += r.ms || 0;
  }

  return {
    key,
    fitness,
    accuracy,
    passes,
    total: dataset.length,
    tokens,
    abstain: verdictCounts.abstain || 0,
    verdictCounts,
    avgMs: dataset.length ? totalMs / dataset.length : 0,
    perItem,
  };
}
