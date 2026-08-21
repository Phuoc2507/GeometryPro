// scripts/prompt-opt/ga.mjs
// VÒNG LẶP TIẾN HOÁ (Genetic Algorithm) tối ưu prompt của bộ DỊCH.
//   quần thể prompt → chấm fitness trên benchmark → chọn lọc (tournament) → lai ghép → đột biến →
//   thế hệ mới, có ELITISM (giữ cá thể tốt nhất). Ghi lại đường cong fitness qua từng thế hệ.
// Tất định theo --seed (RNG hạt giống) ⇒ tái lập được.
import { baselineGenome, randomGenome, crossover, mutate, genomeKey } from './genome.mjs';
import { evaluateGenome } from './fitness.mjs';

// Chấm cả quần thể, có memo theo genomeKey (fitness chỉ phụ thuộc prompt ⇒ genome trùng khoá thì
// dùng lại kết quả, khỏi tính/gọi LLM lại).
async function evaluatePopulation(pop, ctx, statCache, onEval) {
  const out = [];
  for (const genome of pop) {
    const key = genomeKey(genome);
    let stats = statCache.get(key);
    if (!stats) {
      stats = await evaluateGenome(genome, ctx);
      statCache.set(key, stats);
      if (onEval) onEval(stats);
    }
    out.push({ genome, stats });
  }
  return out;
}

function tournament(rng, scored, k) {
  let best = null;
  for (let i = 0; i < k; i++) {
    const cand = scored[rng.int(scored.length)];
    if (!best || cand.stats.fitness > best.stats.fitness) best = cand;
  }
  return best.genome;
}

export async function runGA(ctx, cfg, rng, hooks = {}) {
  const {
    pop = 12, gen = 8, elite = 2, tournamentK = 3,
    pMutBit = 0.15, pMutSwap = 0.3, initPOn = 0.5,
  } = cfg;

  const statCache = new Map(); // genomeKey → stats (dùng chung toàn run)
  const history = [];

  // Quần thể khởi tạo: LUÔN gồm baseline (để so sánh trực tiếp), phần còn lại ngẫu nhiên.
  let population = [baselineGenome()];
  while (population.length < pop) population.push(randomGenome(rng, initPOn));

  let bestOverall = null;

  for (let g = 0; g < gen; g++) {
    const scored = await evaluatePopulation(population, ctx, statCache, hooks.onEval);
    scored.sort((a, b) => b.stats.fitness - a.stats.fitness);

    const best = scored[0];
    const mean = scored.reduce((s, x) => s + x.stats.fitness, 0) / scored.length;
    const meanAcc = scored.reduce((s, x) => s + x.stats.accuracy, 0) / scored.length;
    if (!bestOverall || best.stats.fitness > bestOverall.stats.fitness) {
      bestOverall = { genome: best.genome, stats: best.stats };
    }

    const rec = {
      gen: g,
      bestFitness: +best.stats.fitness.toFixed(4),
      bestAccuracy: +best.stats.accuracy.toFixed(4),
      bestTokens: best.stats.tokens,
      bestKey: best.stats.key,
      meanFitness: +mean.toFixed(4),
      meanAccuracy: +meanAcc.toFixed(4),
      uniqueGenomes: statCache.size,
    };
    history.push(rec);
    if (hooks.onGen) hooks.onGen(rec, scored);

    if (g === gen - 1) break; // thế hệ cuối chỉ để chấm, không sinh tiếp

    // Sinh thế hệ mới: elitism + con lai.
    const next = scored.slice(0, elite).map((s) => s.genome);
    while (next.length < pop) {
      const pa = tournament(rng, scored, tournamentK);
      const pb = tournament(rng, scored, tournamentK);
      let child = crossover(rng, pa, pb);
      child = mutate(rng, child, pMutBit, pMutSwap);
      next.push(child);
    }
    population = next;
  }

  return { history, best: bestOverall, evaluations: statCache.size };
}
