// scripts/bench-capture.mjs
// GOM ca golden "known-good" để LÀM DÀY rổ phanh (bench:gate).
// Đưa từng đề (bench/seed-problems.json) cho engine giải qua solveProblem (GỌI AI — translator);
// bài nào engine giải GỌN + đáp so được bằng số → đóng gói thành bench/golden/<id>.json (kèm plan
// để phanh chạy lại MIỄN PHÍ về sau). In bảng giữ/bỏ để NGƯỜI ngó lại đáp trước khi commit.
//
// Cờ: --dry (chỉ in, không ghi) | --seed <path> | --env <path .env.local> | --out <dir>
// Chạy: npm run bench:capture   |   node scripts/bench-capture.mjs --dry --env ../../../.env.local
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildGoldenFromSolve } from '../api/_lib/bench/captureCase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, def) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : def);
const dry = argv.includes('--dry');
const envPath = flag('--env', join(__dirname, '..', '.env.local'));
const seedPath = flag('--seed', join(__dirname, '..', 'bench', 'seed-problems.json'));
const outDir = flag('--out', join(__dirname, '..', 'bench', 'golden'));

// solveProblem GỌI AI ⇒ cần VILAO_API_KEY. Nạp .env.local TRƯỚC khi import engine.
try { const { config } = await import('dotenv'); config({ path: envPath }); } catch { /* dotenv thiếu */ }
if (!process.env.VILAO_API_KEY) {
  console.error(`Thiếu VILAO_API_KEY (đã thử nạp: ${envPath}). Truyền --env <đường dẫn .env.local>.`);
  process.exit(2);
}
const { solveProblem } = await import('../api/_lib/kernel-bridge/solveWithKernel.js');

const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
console.log(`bench:capture — ${seed.length} đề | ${dry ? 'DRY (không ghi)' : 'ghi vào ' + outDir} | env: ${envPath}`);
let kept = 0, skipped = 0;
for (const item of seed) {
  let result;
  try { result = await solveProblem(item.text); }
  catch (e) { console.log(`  ⛔ ${item.id} [lỗi] ${e && e.message ? e.message : e}`); skipped++; continue; }
  const r = buildGoldenFromSolve(item.id, item.text, result);
  if (r.kept) {
    const ans = r.golden.expect.answers.map((a) => `${a.kind}=${a.text}`).join(', ');
    console.log(`  ✅ ${item.id} — ${ans}`);
    if (!dry) writeFileSync(join(outDir, `${item.id}.json`), JSON.stringify(r.golden, null, 2) + '\n', 'utf8');
    kept++;
  } else {
    console.log(`  ⛔ ${item.id} — ${r.reason}`);
    skipped++;
  }
}
console.log(`Tổng: giữ=${kept} bỏ=${skipped}${dry ? ' (DRY — chưa ghi file nào)' : ''}`);
console.log('⚠ NGÓ LẠI đáp số bằng mắt trước khi commit — máy có thể "tự tin nhưng sai" ở ca hiếm.');
