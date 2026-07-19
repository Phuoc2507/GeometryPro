// E2E đo pipeline Advance (đa-câu) với model thật.
// Chạy: nạp .env.local cho VILAO_API_KEY (base translate = gemini), và đặt
//   ADVANCE_MODEL / ADVANCE_API_KEY qua ENV (inline lúc chạy, KHÔNG commit key) cho splitProblem.
// Ví dụ: ADVANCE_MODEL=cd/gpt-5.6-sol ADVANCE_API_KEY=sk-... node scripts/e2e-advance.mjs
import fs from 'fs';

// nạp .env.local (repo gốc — worktree không share file gitignored). Không ghi đè ENV đã set.
let envTxt = null;
for (const cand of ['.env.local', '../../../.env.local']) {
  try { envTxt = fs.readFileSync(cand, 'utf8'); break; } catch { /* thử tiếp */ }
}
if (envTxt) {
  for (const l of envTxt.split('\n')) {
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} else {
  console.warn('⚠️ không tìm thấy .env.local — cần VILAO_API_KEY qua ENV cho base translate.');
}

const { splitProblem } = await import('../api/_lib/advance/splitProblem.js');
const { buildAdvanceScene } = await import('../api/_lib/advance/buildAdvanceScene.js');

const PROBLEM = `Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 2a, SA vuông góc với đáy, SA = 2a.
a) Tính thể tích khối chóp S.ABCD.
b) Gọi M là trung điểm cạnh SC. Tính khoảng cách từ M đến mặt phẳng (ABCD).
c) Tính khoảng cách từ điểm A đến mặt phẳng (SBC).`;

console.log('ADVANCE_MODEL =', process.env.ADVANCE_MODEL || '(mặc định gemini)');
for (let i = 1; i <= 2; i++) {
  console.log(`\n===== LẦN ${i} =====`);
  try {
    const split = await splitProblem(PROBLEM, {});
    console.log(`split.type = ${split.type} | #parts = ${split.parts?.length ?? '-'}` +
      (split._coverageMissing ? ` | coverageMissing=${JSON.stringify(split._coverageMissing)}` : ''));
    if (split.type !== 'multi_question') { console.log('  → không đa-cảnh (rơi về bài đơn).'); continue; }
    split.parts.forEach((p, k) => console.log(`  part ${k}: "${p.label}" mới=${JSON.stringify(p.phan_tu_moi || [])}`));
    const scene = await buildAdvanceScene(PROBLEM, split, {});
    if (!scene) { console.log('  → build fail (base không dựng được) → null.'); continue; }
    console.log(`  base.points = ${scene.base.points.length} | steps = ${scene.steps.length}`);
    let cumulOk = true;
    scene.steps.forEach((s, k) => {
      if (k > 0 && !scene.steps[k - 1].visibleIds.every((id) => s.visibleIds.includes(id))) cumulOk = false;
      const a = s.answer || {};
      console.log(`    ${s.label}: visible=${s.visibleIds.length} | đáp=${a.verified ? (a.text ?? '?') + ' ✓' : 'chưa kiểm chứng'}`);
    });
    console.log(`  visibleIds cumulative đúng? ${cumulOk ? 'CÓ ✓' : 'KHÔNG ✗'}`);
  } catch (e) {
    console.log('  lỗi:', String(e.message).slice(0, 80));
  }
}
