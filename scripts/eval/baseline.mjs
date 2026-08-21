// scripts/eval/baseline.mjs
// HARNESS SO SÁNH: chạy nhiều phương pháp trên cùng tập đề, đo và lập bảng chỉ số — trọng tâm là
// ACCURACY và "CONFIDENTLY-WRONG" (đưa đáp số sai một cách tự tin) + PRECISION-khi-trả-lời
// (khi hệ CÓ trả đáp thì đúng bao nhiêu %). Đây là bằng chứng cho luận điểm "AI đáng tin cậy".
//
//   # Offline (kiểm thử harness, 0đ):
//   node scripts/eval/baseline.mjs --methods system,llm-direct --mock
//   # Thật (cần VILAO_API_KEY), chỉ trên tập TEST đã giữ riêng:
//   VILAO_API_KEY=... node scripts/eval/baseline.mjs --methods system,llm-direct --split default --use test
import fs from 'node:fs';
import path from 'node:path';
import { loadDataset } from '../prompt-opt/dataset.mjs';
import { makeMethod } from './methods.mjs';
import { loadSplit } from './split.mjs';
import { compareCase } from '../../api/_lib/bench/compareCase.js';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  return a;
}
function pLimit(n) {
  const q = []; let active = 0;
  const runNext = () => { if (active >= n || !q.length) return; active++; const { fn, res, rej } = q.shift(); fn().then(res, rej).finally(() => { active--; runNext(); }); };
  return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); runNext(); });
}
const pct = (x) => (x * 100).toFixed(1) + '%';

// Chấm một output đã chuẩn hoá của phương pháp so với đáp đúng của ca.
function classify(item, out) {
  if (out.status === 'abstain') return 'abstain';
  if (out.status === 'error') return 'error';
  const cmp = compareCase({ id: item.id, expect: { ok: true, answers: item.expect.answers } }, { ok: true, answers: out.answers });
  return cmp.verdict === 'pass' ? 'correct' : 'wrong'; // 'wrong' = confidently wrong
}

function metricsFor(rows) {
  const n = rows.length;
  const c = { correct: 0, wrong: 0, abstain: 0, error: 0 };
  let ms = 0;
  for (const r of rows) { c[r.klass]++; ms += r.ms || 0; }
  const answered = c.correct + c.wrong;
  return {
    total: n, ...c,
    accuracy: n ? c.correct / n : 0,
    confidentlyWrong: n ? c.wrong / n : 0,
    coverage: n ? answered / n : 0,
    precisionWhenAnswered: answered ? c.correct / answered : 0,
    abstainRate: n ? c.abstain / n : 0,
    avgMs: n ? ms / n : 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const methodNames = String(args.methods || 'system,llm-direct').split(',').map((s) => s.trim()).filter(Boolean);
  const mock = !!args.mock;
  const apiKey = args.apiKey || process.env.VILAO_API_KEY || null;
  const concurrency = Number(args.concurrency || 4);
  const dataDir = args.data || path.resolve('bench/golden');

  if (!mock && !apiKey) { console.error('Chạy thật cần VILAO_API_KEY (hoặc dùng --mock để kiểm thử harness).'); process.exit(2); }

  let dataset = loadDataset(dataDir);
  if (args.split) {
    const sp = loadSplit(String(args.split));
    if (!sp) { console.error('Không thấy split:', args.split); process.exit(1); }
    const use = args.use === 'train' ? sp.train : sp.test; // mặc định test
    const set = new Set(use);
    dataset = dataset.filter((it) => set.has(it.id));
    console.log(`Split '${args.split}' / ${args.use || 'test'}: ${dataset.length} ca`);
  }
  if (args.limit) dataset = dataset.slice(0, Number(args.limit));
  if (!dataset.length) { console.error('Tập rỗng.'); process.exit(1); }

  const limit = pLimit(concurrency);
  const results = {}; // method → rows
  for (const name of methodNames) {
    const run = makeMethod(name, { apiKey, model: args.model || null, mock });
    const rows = await Promise.all(dataset.map((item) => limit(async () => {
      const out = await run(item);
      return { id: item.id, klass: classify(item, out), status: out.status, ms: out.ms, note: out.note };
    })));
    results[name] = rows;
  }

  // Bảng chỉ số.
  const M = Object.fromEntries(methodNames.map((n) => [n, metricsFor(results[n])]));
  const header = '| Phương pháp | Accuracy | Confidently-wrong | Precision khi trả lời | Từ chối | Lỗi | Latency TB |';
  const sep = '|---|---:|---:|---:|---:|---:|---:|';
  const rowsMd = methodNames.map((n) => {
    const m = M[n];
    return `| ${n} | ${pct(m.accuracy)} | ${pct(m.confidentlyWrong)} | ${pct(m.precisionWhenAnswered)} | ${pct(m.abstainRate)} | ${m.error} | ${Math.round(m.avgMs)}ms |`;
  });

  const tag = args.tag || (mock ? 'mock' : (args.split ? `${args.split}-${args.use || 'test'}` : 'full'));
  const outDir = path.resolve('docs/nghien-cuu/eval-runs', tag);
  fs.mkdirSync(outDir, { recursive: true });

  const report = [
    `# So sánh baseline — ${tag}`,
    ``,
    `_Chạy ${new Date().toISOString()} · ${dataset.length} ca · chế độ: ${mock ? 'MOCK (kiểm thử harness, KHÔNG phải kết quả khoa học)' : 'THẬT (LLM)'}._`,
    ``,
    header, sep, ...rowsMd,
    ``,
    `## Ý nghĩa các cột`,
    `- **Accuracy**: tỉ lệ ra đáp ĐÚNG trên toàn tập.`,
    `- **Confidently-wrong**: tỉ lệ đưa đáp số SAI một cách tự tin — chỉ số AN TOÀN then chốt (càng thấp càng tốt).`,
    `- **Precision khi trả lời**: khi hệ CÓ đưa đáp (không từ chối), tỉ lệ đúng = correct/(correct+wrong). Hệ Neuro-Symbolic kỳ vọng CAO nhờ tự kiểm + từ chối an toàn.`,
    `- **Từ chối**: tỉ lệ hệ chủ động không trả lời (an toàn, không tính là sai).`,
    ``,
    mock
      ? `> ⚠️ MOCK: 'llm-direct' là giả lập tất định, 'system' dùng plan golden (bỏ khâu dịch). Chỉ để kiểm thử bảng chỉ số. Số THẬT cần chạy không có --mock, có API key.`
      : `> Chạy trên LLM thật (${args.model || 'model mặc định'}).`,
    ``,
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'report.md'), report);
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ tag, dataset: dataset.length, mock, metrics: M, perItem: results }, null, 2));

  console.log(`\n== So sánh baseline (${tag}) ==\n`);
  console.log([header, sep, ...rowsMd].join('\n'));
  console.log(`\n  ghi: ${path.relative(process.cwd(), outDir)}/ (report.md, results.json)\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
