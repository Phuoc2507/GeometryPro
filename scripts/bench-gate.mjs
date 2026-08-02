// scripts/bench-gate.mjs
// Cổng regression engine (Tầng 1) — chạy TAY trước deploy: phát lại rổ đề mốc qua engine,
// rớt là chặn (exit≠0). Mặc định engine-replay (solvePlan — tất định, KHÔNG gọi AI).
// Cờ --full: chạy cả bước dịch (solveProblem — TỐN LLM, cần env .env.local).
// Cờ --dir <path>: đổi rổ golden (mặc định bench/golden).
// Chạy: npm run bench:gate   |   npm run bench:gate -- --full
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadGoldenDir } from '../api/_lib/bench/loadGolden.js';
import { runGate } from '../api/_lib/bench/runGate.js';
import { solvePlan, solveProblem } from '../api/_lib/kernel-bridge/solveWithKernel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const full = argv.includes('--full');
const dir = argv.includes('--dir') ? argv[argv.indexOf('--dir') + 1] : join(__dirname, '..', 'bench', 'golden');

// --full cần khoá API translator: nạp .env.local (đường chính engine-replay KHÔNG cần env).
if (full) {
  try { const { config } = await import('dotenv'); config({ path: join(__dirname, '..', '.env.local') }); }
  catch { /* dotenv thiếu → cứ chạy, callVilao sẽ báo thiếu khoá */ }
}

const cases = loadGoldenDir(dir);
console.log(`bench:gate — ${cases.length} ca | chế độ: ${full ? 'full-pipeline (LLM)' : 'engine-replay (tất định)'} | rổ: ${dir}`);

const solveOne = full ? (c) => solveProblem(c.text) : (c) => solvePlan(c.plan);
const { results, summary, hasRegression } = await runGate(cases, solveOne);

for (const r of results) {
  console.log(`  ${r.verdict === 'pass' ? '✅' : '❌'} ${r.id} [${r.verdict}] ${r.detail}`);
}
console.log(`Tổng: pass=${summary.pass} regress-status=${summary['regress-status']} regress-answer=${summary['regress-answer']} error=${summary.error}`);
console.log(hasRegression ? 'GATE FAIL ❌ (có tụt lùi)' : 'GATE PASS ✅');
process.exit(hasRegression ? 1 : 0);
