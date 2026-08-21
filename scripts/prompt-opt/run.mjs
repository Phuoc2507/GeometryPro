// scripts/prompt-opt/run.mjs
// CLI chạy tối ưu prompt tiến hoá.
//   node scripts/prompt-opt/run.mjs --provider mock  --pop 12 --gen 8 --seed 42
//   node scripts/prompt-opt/run.mjs --provider vilao --pop 10 --gen 6 --seed 42 --limit 12   # cần VILAO_API_KEY
// Kết quả ghi vào docs/nghien-cuu/prompt-opt-runs/<provider>-seed<seed>/ : history.json/csv,
// best-prompt.txt, best-genome.json, summary.md.
import fs from 'node:fs';
import path from 'node:path';
import { makeRng } from './prng.mjs';
import { loadDataset } from './dataset.mjs';
import { makeTranslator } from './translate.mjs';
import { runGA } from './ga.mjs';
import { assemblePrompt, activeTags } from './genome.mjs';
import { TRANSLATOR_PROMPT } from '../../api/_lib/kernel-bridge/translatorPrompt.js';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      a[k] = v;
    }
  }
  return a;
}
const num = (v, d) => (v == null ? d : Number(v));

function sparkline(values) {
  const bars = '▁▂▃▄▅▆▇█';
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  return values.map((v) => bars[Math.min(7, Math.floor(((v - lo) / span) * 7))]).join('');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = args.provider || 'mock';
  const seed = num(args.seed, 42);
  const cfg = {
    pop: num(args.pop, 12), gen: num(args.gen, 8), elite: num(args.elite, 2),
    tournamentK: num(args.tournament, 3), pMutBit: num(args.pmut, 0.15),
    pMutSwap: num(args.pswap, 0.3), initPOn: num(args.pon, 0.5),
  };
  const lambda = num(args.lambda, 0.02);
  const concurrency = num(args.concurrency, 4);
  const dataDir = args.data || path.resolve('bench/golden');
  const limit = args.limit ? Number(args.limit) : null;

  let dataset = loadDataset(dataDir);
  if (limit) dataset = dataset.slice(0, limit);
  if (dataset.length === 0) { console.error('Không có ca nào (cần golden có field text).'); process.exit(1); }

  if (provider === 'vilao' && !process.env.VILAO_API_KEY && !args.apiKey) {
    console.error('provider=vilao cần VILAO_API_KEY (đặt trong môi trường) — đây là bước TỐN PHÍ.');
    console.error('Chạy thử miễn phí bằng: --provider mock');
    process.exit(2);
  }

  const outDir = args.out || path.resolve('docs/nghien-cuu/prompt-opt-runs', `${provider}-seed${seed}`);
  fs.mkdirSync(outDir, { recursive: true });

  const translate = makeTranslator({
    provider, apiKey: args.apiKey || process.env.VILAO_API_KEY || null,
    model: args.model || null,
  });
  const ctx = { basePrompt: TRANSLATOR_PROMPT, dataset, translate, cache: new Map(), lambda, concurrency, provider, model: args.model || null };
  const rng = makeRng(seed);

  console.log(`\n== Tối ưu prompt tiến hoá ==`);
  console.log(`provider=${provider}  dataset=${dataset.length} ca  pop=${cfg.pop} gen=${cfg.gen} seed=${seed} lambda=${lambda}`);
  if (provider === 'mock') console.log(`[MOCK] Giả lập tất định, 0 đồng — dùng để kiểm thử cỗ máy tiến hoá, KHÔNG phải kết quả khoa học.\n`);

  const t0 = Date.now();
  const { history, best, evaluations } = await runGA(ctx, cfg, rng, {
    onGen: (rec) => console.log(
      `  gen ${String(rec.gen).padStart(2)} | best fit=${rec.bestFitness.toFixed(3)} acc=${(rec.bestAccuracy * 100).toFixed(1)}% tok=${rec.bestTokens} | mean fit=${rec.meanFitness.toFixed(3)} | genome đã chấm=${rec.uniqueGenomes}`
    ),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const bestPrompt = assemblePrompt(TRANSLATOR_PROMPT, best.genome);
  const bestTags = activeTags(best.genome);

  // Ghi kết quả.
  fs.writeFileSync(path.join(outDir, 'history.json'), JSON.stringify(history, null, 2));
  const csv = ['gen,bestFitness,bestAccuracy,bestTokens,meanFitness,meanAccuracy,uniqueGenomes']
    .concat(history.map((r) => [r.gen, r.bestFitness, r.bestAccuracy, r.bestTokens, r.meanFitness, r.meanAccuracy, r.uniqueGenomes].join(',')))
    .join('\n');
  fs.writeFileSync(path.join(outDir, 'history.csv'), csv);
  fs.writeFileSync(path.join(outDir, 'best-prompt.txt'), bestPrompt);
  fs.writeFileSync(path.join(outDir, 'best-genome.json'), JSON.stringify({
    seed, provider, config: cfg, lambda,
    bestKey: best.stats.key, activeTags: bestTags,
    bits: best.genome.bits, order: best.genome.order,
    stats: { fitness: best.stats.fitness, accuracy: best.stats.accuracy, passes: best.stats.passes, total: best.stats.total, tokens: best.stats.tokens, abstain: best.stats.abstain, verdictCounts: best.stats.verdictCounts },
  }, null, 2));

  const first = history[0], last = history[history.length - 1];
  const summary = [
    `# Kết quả tối ưu prompt — provider=${provider}, seed=${seed}`,
    ``,
    `_Chạy lúc ${new Date().toISOString()} · ${elapsed}s · ${evaluations} genome khác nhau được chấm._`,
    ``,
    provider === 'mock'
      ? `> ⚠️ **MOCK (giả lập tất định).** Con số dưới đây chỉ để KIỂM THỬ cỗ máy tiến hoá và minh hoạ đường cong fitness — **không phải kết quả khoa học**. Kết quả thật cần chạy \`--provider vilao\` với khoá API.`
      : `> Kết quả chạy trên LLM thật (${args.model || 'model dịch mặc định'}).`,
    ``,
    `## Đường cong fitness qua các thế hệ`,
    ``,
    '```',
    `best  ${sparkline(history.map((h) => h.bestFitness))}`,
    `mean  ${sparkline(history.map((h) => h.meanFitness))}`,
    '```',
    ``,
    `| gen | best fitness | best accuracy | best tokens | mean fitness |`,
    `|----:|:---:|:---:|:---:|:---:|`,
    ...history.map((r) => `| ${r.gen} | ${r.bestFitness.toFixed(3)} | ${(r.bestAccuracy * 100).toFixed(1)}% | ${r.bestTokens} | ${r.meanFitness.toFixed(3)} |`),
    ``,
    `## Cải thiện`,
    ``,
    `- Best fitness: **${first.bestFitness.toFixed(3)} → ${last.bestFitness.toFixed(3)}** qua ${history.length} thế hệ.`,
    `- Best accuracy: **${(first.bestAccuracy * 100).toFixed(1)}% → ${(last.bestAccuracy * 100).toFixed(1)}%**.`,
    `- Prompt tốt nhất bật các gene: ${bestTags.length ? '`' + bestTags.join('`, `') + '`' : '(không gene nào — chính là prompt gốc)'}.`,
    ``,
    `## Cấu hình`,
    ``,
    '```json',
    JSON.stringify({ provider, seed, dataset: dataset.length, lambda, ...cfg }, null, 2),
    '```',
    ``,
    `Tệp kèm theo: \`history.json\`, \`history.csv\`, \`best-prompt.txt\`, \`best-genome.json\`.`,
    ``,
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'summary.md'), summary);

  console.log(`\n  best fitness: ${first.bestFitness.toFixed(3)} → ${last.bestFitness.toFixed(3)}  |  best accuracy: ${(first.bestAccuracy * 100).toFixed(1)}% → ${(last.bestAccuracy * 100).toFixed(1)}%`);
  console.log(`  gene bật ở prompt tốt nhất: ${bestTags.join(', ') || '(baseline)'}`);
  console.log(`  đã ghi: ${path.relative(process.cwd(), outDir)}/  (summary.md, history.csv, best-prompt.txt, best-genome.json)\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
