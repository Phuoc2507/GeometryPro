// scripts/bench-gate.mjs
// Cổng regression cho engine — phát lại rổ đề mốc, rớt là chặn.
//
// HAI CHẾ ĐỘ, hai mục đích khác hẳn nhau:
//
//   npm run bench:gate                  ENGINE-REPLAY (mặc định)
//     Chạy thẳng Plan JSON qua engine. Tất định, offline, miễn phí, chạy bao nhiêu
//     lần cũng ra một kết quả ⇒ dùng làm CỔNG CHẶN: rớt một ca là exit 1.
//
//   npm run bench:gate -- --full        FULL-PIPELINE (tốn LLM, cần .env.local)
//     Chạy CẢ bước dịch đề → đúng đường mà người dùng thật đi qua. Bước LLM là
//     NGẪU NHIÊN nên đây là PHÉP ĐO, không phải cổng chặn: mặc định luôn exit 0 và
//     in ra tỉ lệ. Muốn biến nó thành cổng thì đặt ngưỡng: --min-pass 0.8
//
// Cờ:
//   --full               chạy cả bước dịch (mặc định: chỉ engine)
//   --repeat N           mỗi ca chạy N lượt (chỉ --full; mặc định 1). LLM ngẫu nhiên
//                        nên 1 lượt là một mẫu, không phải sự thật.
//   --concurrency N      số lượt chạy song song (chỉ --full; mặc định 4)
//   --min-pass R         (chỉ --full) tỉ lệ đúng tối thiểu, thấp hơn thì exit 1
//   --dry-run            (chỉ --full) chạy y hệt --full nhưng THAY bước dịch bằng
//                        Plan có sẵn ⇒ không gọi LLM, không tốn tiền, không cần khoá.
//                        Dùng để thử/soi chính phần báo cáo trước khi tiêu tiền thật.
//   --only <chuỗi>       chỉ chạy các ca có id chứa chuỗi này
//   --out <file>         ghi báo cáo JSON (để theo dõi theo thời gian)
//   --dir <path>         đổi rổ golden (mặc định bench/golden)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadGoldenDir } from '../api/_lib/bench/loadGolden.js';
import { runGate } from '../api/_lib/bench/runGate.js';
import { compareCase } from '../api/_lib/bench/compareCase.js';
import { runFullBench, STAGE_LABELS } from '../api/_lib/bench/fullReport.js';
import { solvePlan, solveProblem } from '../api/_lib/kernel-bridge/solveWithKernel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);

const full = flag('--full');
const dir = value('--dir', join(__dirname, '..', 'bench', 'golden'));
const only = value('--only', '');
const outFile = value('--out', '');
const repeat = Math.max(1, Number(value('--repeat', '1')) || 1);
const concurrency = Math.max(1, Number(value('--concurrency', '4')) || 4);
const minPass = argv.includes('--min-pass') ? Number(value('--min-pass', '0')) : null;
const dryRun = flag('--dry-run');

// --full cần khoá API translator: nạp .env.local (đường engine-replay KHÔNG cần env).
if (full && !dryRun) {
  try { const { config } = await import('dotenv'); config({ path: join(__dirname, '..', '.env.local') }); }
  catch { /* dotenv thiếu → cứ chạy, callVilao sẽ báo thiếu khoá */ }
}

let cases = loadGoldenDir(dir);
if (only) cases = cases.filter((c) => c.id.includes(only));
if (cases.length === 0) {
  console.error(`Không có ca nào khớp${only ? ` --only "${only}"` : ''} trong ${dir}`);
  process.exit(1);
}

const pct = (r) => `${(r * 100).toFixed(1)}%`;

// ── Chế độ engine-replay: cổng chặn tất định (giữ nguyên hành vi cũ) ─────────
if (!full) {
  console.log(`bench:gate — ${cases.length} ca | chế độ: engine-replay (tất định) | rổ: ${dir}`);
  const { results, summary, hasRegression } = await runGate(cases, (c) => solvePlan(c.plan));
  for (const r of results) {
    console.log(`  ${r.verdict === 'pass' ? '✅' : '❌'} ${r.id} [${r.verdict}] ${r.detail}`);
  }
  console.log(`Tổng: pass=${summary.pass} regress-status=${summary['regress-status']} regress-answer=${summary['regress-answer']} error=${summary.error}`);
  console.log(hasRegression ? 'GATE FAIL ❌ (có tụt lùi)' : 'GATE PASS ✅');
  if (outFile) writeReport(outFile, { mode: 'engine-replay', dir, summary, results });
  process.exit(hasRegression ? 1 : 0);
}

// ── Chế độ full-pipeline: ĐO chất lượng đường mà người dùng thật đi qua ──────
const withText = cases.filter((c) => typeof c.text === 'string' && c.text.trim());
const skipped = cases.filter((c) => !withText.includes(c));
const totalCalls = withText.length * repeat;

console.log(`bench:gate — chế độ: FULL-PIPELINE${dryRun ? ' [DRY-RUN — KHÔNG gọi LLM]' : ' (có gọi LLM)'} | rổ: ${dir}`);
console.log(`  ${withText.length} ca × ${repeat} lượt = ${totalCalls} lượt${dryRun ? ' (dùng Plan có sẵn thay cho bước dịch)' : ' gọi translator'}, chạy ${concurrency} luồng song song`);
if (skipped.length) {
  // Ca không có `text` thì KHÔNG THỂ chạy full — bỏ qua và NÓI RA, chứ không âm thầm
  // tính là đậu (sẽ thổi phồng tỉ lệ).
  console.log(`  ⚠️  bỏ qua ${skipped.length} ca thiếu trường "text": ${skipped.map((c) => c.id).join(', ')}`);
}
if (!dryRun && !process.env.VILAO_API_KEY) {
  console.error('  ✖ Thiếu VILAO_API_KEY — đặt trong .env.local rồi chạy lại.');
  console.error('    (Muốn xem thử phần báo cáo mà không tốn tiền: thêm --dry-run)');
  process.exit(1);
}
console.log('');

const { summary: s } = await runFullBench({
  cases: withText,
  repeat,
  concurrency,
  // DRY-RUN thay bước dịch bằng Plan có sẵn của ca đó. Phải gắn kèm `plan` vào kết quả
  // y như solveProblem làm, nếu không bộ phân loại sẽ tưởng là "dịch hỏng".
  solve: dryRun
    ? async (text) => {
      const c = withText.find((g) => g.text === text);
      return { plan: c.plan, ...solvePlan(c.plan) };
    }
    : (text) => solveProblem(text),
  compare: compareCase,
  onProgress: (done, total) => process.stdout.write(`\r  đang chạy ${done}/${total}…   `),
});
process.stdout.write('\r' + ' '.repeat(40) + '\r');

console.log('Kết quả theo ca (thấp nhất trước):');
for (const c of s.perCase) {
  const icon = c.passRate === 1 ? '✅' : c.passRate === 0 ? '❌' : '🟡';
  const stages = [...new Set(c.stages.filter((x) => x !== 'pass'))].map((x) => STAGE_LABELS[x] || x);
  console.log(`  ${icon} ${c.id.padEnd(38)} ${String(c.passes).padStart(2)}/${c.runs}${stages.length ? '  ← ' + stages.join(', ') : ''}`);
}

// Không gọi được API thì KHÔNG có gì để đo. In tỉ lệ 0% ở tình huống này là đánh lừa:
// người đọc sẽ tưởng chất lượng engine tệ trong khi thực ra khoá/mạng/quota mới là vấn đề.
if (s.apiErrors > 0) {
  console.log(`\n⚠️  ${s.apiErrors}/${s.totalRuns} lượt KHÔNG GỌI ĐƯỢC API (khoá, mạng, hoặc quota).`);
  console.log('    Các lượt đó đã bị LOẠI khỏi mẫu — không tính là "dịch không được".');
}
if (s.measuredRuns === 0) {
  console.log('\n✖ PHÉP ĐO THẤT BẠI: không lượt nào gọi được API, không có gì để kết luận.');
  console.log('  Kiểm tra VILAO_API_KEY, quota, và đường mạng ra api.vilao.ai rồi chạy lại.');
  if (outFile) writeReport(outFile, { mode: 'full-pipeline', dir, repeat, summary: s, failed: 'api-unreachable' });
  process.exit(1);
}

console.log(`\nHai con số cần nhìn (trên ${s.measuredRuns} lượt đo được):`);
console.log(`  • DỊCH ĐƯỢC : ${pct(s.translateRate)}  (translator ra Plan hợp lệ — thước đo prompt/model)`);
console.log(`  • ĐÁP ĐÚNG  : ${pct(s.passRate)}  (đúng tới đáp số cuối — thước đo cả đường ống)`);

if (s.worstStages.length) {
  console.log('\nHỏng ở đâu:');
  for (const [stage, n] of s.worstStages) {
    console.log(`  ${String(n).padStart(3)} lượt — ${STAGE_LABELS[stage] || stage}`);
  }
}
if (s.unstable.length) {
  console.log(`\n⚠️  ${s.unstable.length} ca KHÔNG ỔN ĐỊNH (cùng đề, lần được lần không):`);
  for (const u of s.unstable) console.log(`  ${u.id} — ${u.passes}/${u.runs}`);
} else if (repeat > 1) {
  console.log('\nKhông có ca nào lúc được lúc không.');
}

if (outFile) writeReport(outFile, { mode: 'full-pipeline', dir, repeat, summary: s });

if (minPass !== null) {
  const ok = s.passRate >= minPass;
  console.log(`\nNgưỡng --min-pass ${pct(minPass)}: ${ok ? 'ĐẠT ✅' : 'KHÔNG ĐẠT ❌'}`);
  process.exit(ok ? 0 : 1);
}
// Không đặt ngưỡng ⇒ đây là PHÉP ĐO, không phải cổng chặn: luôn exit 0.
console.log('\n(Chạy đo, không phải cổng chặn. Thêm --min-pass 0.8 để biến thành cổng.)');
process.exit(0);

function writeReport(file, payload) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    // KHÔNG nhúng thời gian vào nội dung: người gọi tự đặt tên file theo ngày nếu cần,
    // nhờ vậy chạy lại cùng một rổ cho ra file giống hệt, diff được.
    writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
    console.log(`\nĐã ghi báo cáo: ${file}`);
  } catch (e) {
    console.error(`Không ghi được báo cáo ${file}: ${e.message}`);
  }
}
