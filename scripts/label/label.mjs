// scripts/label/label.mjs
// CÔNG CỤ GÁN NHÃN DỮ LIỆU — biến "đề + đáp đúng" thành ca benchmark golden, tối thiểu công người.
//
// Ý tưởng: người dùng chỉ cung cấp ĐỀ và ĐÁP ĐÚNG (đã tự xác minh). Công cụ:
//   1) lấy PLAN cho đề — từ trường `plan` nếu người dùng dán sẵn, hoặc để LLM DỊCH (cần API key, --llm);
//   2) chạy engine `solvePlan(plan)` → đáp của máy;
//   3) ĐỐI CHIẾU đáp máy với đáp người (so BẰNG SỐ, tái dùng compareCase);
//   4) phân 3 rổ:  ✅ NHẬN (khớp)  ·  ⚠️ CẦN SOÁT (lệch)  ·  🕳️ ENGINE CHƯA GIẢI (abstain/lỗi/ok:false);
//   5) ca NHẬN được đóng gói vào bench/golden-staging/ (KHÔNG ghi thẳng rổ tin cậy) + một report.md.
//
// Cách chạy:
//   node scripts/label/label.mjs --in bench/worklist.example.json              # offline (chỉ ca có sẵn plan)
//   VILAO_API_KEY=... node scripts/label/label.mjs --in worklist.json --llm    # để LLM dịch đề thiếu plan
//   node scripts/label/label.mjs --promote                                     # chép staging → bench/golden
//
// Worklist = mảng JSON, mỗi phần tử: { text, expected, source?, difficulty?, kind?, plan? }
//   • expected: chuỗi hoặc mảng chuỗi — đáp ĐÚNG do người dùng cung cấp (BẮT BUỘC để đối chiếu).
//   • plan (tùy chọn): nếu có, dùng luôn (chạy được OFFLINE). Nếu không, cần --llm + API key.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { solvePlan } from '../../api/_lib/kernel-bridge/solveWithKernel.js';
import { compareCase } from '../../api/_lib/bench/compareCase.js';

const GOLDEN_DIR = path.resolve('bench/golden');
const STAGING_DIR = path.resolve('bench/golden-staging');

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      a[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return a;
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const hash8 = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 8);

function existingIds() {
  const ids = new Set();
  for (const dir of [GOLDEN_DIR, STAGING_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      try { ids.add(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).id); } catch { /* bỏ file hỏng */ }
    }
  }
  return ids;
}

// Chép staging → golden (sau khi người đã mắt-thường soát lại).
function promote() {
  if (!fs.existsSync(STAGING_DIR)) { console.log('Không có bench/golden-staging/ để promote.'); return; }
  const files = fs.readdirSync(STAGING_DIR).filter((f) => f.endsWith('.json'));
  let n = 0;
  for (const f of files) {
    const dest = path.join(GOLDEN_DIR, f);
    if (fs.existsSync(dest)) { console.log('  bỏ qua (đã có):', f); continue; }
    fs.copyFileSync(path.join(STAGING_DIR, f), dest);
    n++;
  }
  console.log(`Đã promote ${n}/${files.length} ca staging → bench/golden/. Nhớ chạy \`npm run bench:gate\` để chốt.`);
}

async function getPlan(entry, useLlm, apiKey) {
  if (entry.plan && typeof entry.plan === 'object') return { plan: entry.plan, planSource: 'pasted' };
  if (!useLlm) return { plan: null, planSource: 'pending', note: 'thiếu plan & chưa bật --llm' };
  const { planFromProblem } = await import('../../api/_lib/kernel-bridge/solveWithKernel.js');
  const plan = await planFromProblem(entry.text, { apiKey }); // ném nếu abstain / non-JSON / schema fail
  return { plan, planSource: 'llm' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.promote) return promote();

  const inFile = args.in || 'bench/worklist.example.json';
  if (!fs.existsSync(inFile)) { console.error('Không thấy worklist:', inFile); process.exit(1); }
  const worklist = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  if (!Array.isArray(worklist)) { console.error('Worklist phải là một MẢNG.'); process.exit(1); }

  const useLlm = !!args.llm;
  const apiKey = args.apiKey || process.env.VILAO_API_KEY || null;
  if (useLlm && !apiKey) { console.error('--llm cần VILAO_API_KEY.'); process.exit(2); }

  fs.mkdirSync(STAGING_DIR, { recursive: true });
  const ids = existingIds();

  const accepted = [], review = [], gap = [], pending = [];

  for (const entry of worklist) {
    const expected = Array.isArray(entry.expected) ? entry.expected : [entry.expected];
    if (!entry.text || expected[0] == null) { review.push({ entry, reason: 'thiếu text hoặc expected' }); continue; }

    let planInfo;
    try {
      planInfo = await getPlan(entry, useLlm, apiKey);
    } catch (e) {
      const msg = String(e && e.message || e);
      (/abstain/i.test(msg) ? gap : review).push({ entry, reason: 'dịch lỗi: ' + msg });
      continue;
    }
    if (!planInfo.plan) { pending.push({ entry, reason: planInfo.note }); continue; }

    let result;
    try {
      result = solvePlan(planInfo.plan);
    } catch (e) {
      gap.push({ entry, reason: 'engine ném: ' + String(e && e.message || e) });
      continue;
    }

    // Đối chiếu: dựng golden tạm từ đáp NGƯỜI rồi so với kết quả máy.
    const tempGolden = { id: 'tmp', expect: { ok: true, answers: expected.map((t) => ({ text: String(t) })) } };
    const cmp = compareCase(tempGolden, result);

    if (cmp.verdict === 'pass') {
      const kind = entry.kind || (result.answers?.[0]?.kind) || 'khác';
      const id = `case-${slug(kind)}-${hash8(entry.text)}`;
      if (ids.has(id)) { review.push({ entry, reason: 'trùng id đã có: ' + id }); continue; }
      ids.add(id);
      const golden = {
        id,
        source: entry.source || 'labeled',
        difficulty: entry.difficulty || undefined,
        text: entry.text,
        plan: planInfo.plan,
        expect: { ok: true, answers: result.answers.map((a) => ({ kind: a.kind, text: a.text })) },
      };
      fs.writeFileSync(path.join(STAGING_DIR, id + '.json'), JSON.stringify(golden, null, 2));
      accepted.push({ id, kind, engine: golden.expect.answers.map((a) => a.text).join(' | '), planSource: planInfo.planSource });
    } else if (cmp.verdict === 'error' || !result.ok) {
      gap.push({ entry, reason: cmp.detail });
    } else {
      const got = (result.answers || []).map((a) => a.text).join(' | ');
      review.push({ entry, reason: `LỆCH — người: "${expected.join(' | ')}"  ≠  máy: "${got}"` });
    }
  }

  // Báo cáo.
  const line = (r) => `- ${r.reason}${r.entry ? `  ⟵ "${String(r.entry.text).slice(0, 70)}…"` : ''}`;
  const report = [
    `# Báo cáo gán nhãn — ${new Date().toISOString()}`,
    ``,
    `Nguồn: \`${inFile}\` · ${worklist.length} mục · chế độ dịch: ${useLlm ? 'LLM (--llm)' : 'offline (chỉ plan dán sẵn)'}`,
    ``,
    `| Rổ | Số |`,
    `|---|---:|`,
    `| ✅ Nhận (đã stage) | ${accepted.length} |`,
    `| ⚠️ Cần soát (lệch/lỗi) | ${review.length} |`,
    `| 🕳️ Engine chưa giải | ${gap.length} |`,
    `| ⏳ Chờ dịch (thiếu plan, chưa --llm) | ${pending.length} |`,
    ``,
    `## ✅ Nhận — đã ghi vào bench/golden-staging/`,
    ...(accepted.length ? accepted.map((a) => `- \`${a.id}\` [${a.kind}] đáp: ${a.engine}  (plan: ${a.planSource})`) : ['(không có)']),
    ``,
    `## ⚠️ Cần soát`,
    ...(review.length ? review.map(line) : ['(không có)']),
    ``,
    `## 🕳️ Engine chưa giải (ứng viên known-gap để vá engine)`,
    ...(gap.length ? gap.map(line) : ['(không có)']),
    ``,
    `## ⏳ Chờ dịch`,
    ...(pending.length ? pending.map(line) : ['(không có)']),
    ``,
    `---`,
    `Bước tiếp: mắt-thường soát rổ ✅ trong \`bench/golden-staging/\`, rồi \`node scripts/label/label.mjs --promote\` để chép sang \`bench/golden/\`, cuối cùng \`npm run bench:gate\`.`,
    ``,
  ].join('\n');
  fs.writeFileSync(path.join(STAGING_DIR, 'report.md'), report);

  console.log(`\n== Gán nhãn ==  (${useLlm ? 'LLM' : 'offline'})`);
  console.log(`  ✅ nhận: ${accepted.length}   ⚠️ cần soát: ${review.length}   🕳️ engine chưa giải: ${gap.length}   ⏳ chờ dịch: ${pending.length}`);
  for (const a of accepted) console.log(`     ✅ ${a.id} [${a.kind}] → ${a.engine}`);
  for (const r of review) console.log(`     ⚠️ ${r.reason}`);
  console.log(`  report: bench/golden-staging/report.md`);
  console.log(`  ⇒ soát staging rồi: node scripts/label/label.mjs --promote  &&  npm run bench:gate\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
