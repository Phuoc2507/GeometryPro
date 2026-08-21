// scripts/label-studio/server.mjs
// XƯỞNG GÁN NHÃN BẰNG ẢNH — dán ảnh đề (Win+Shift+S) → hệ đọc chữ + dịch → đối chiếu đáp bạn giải → lưu golden.
// CHẠY TRÊN MÁY BẠN (cần VILAO_API_KEY; web của Claude chặn api.vilao.ai).
//
//   VILAO_API_KEY=sk-... npm run label:studio
//   → mở http://localhost:5178
//
// Luồng: dán ảnh → /api/ocr (LLM đọc đề) → sửa text nếu cần → nhập ĐÁP bạn tự giải + nguồn
//        → /api/check (LLM dịch→engine→đối chiếu) → nếu KHỚP thì /api/save ghi vào bench/golden-staging/.
// Sau đó: `node scripts/label/label.mjs --promote && npm run bench:gate`, rồi tự commit.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { callVilao } from '../../api/_lib/vilao.js';
import { planFromProblem, solvePlan } from '../../api/_lib/kernel-bridge/solveWithKernel.js';
import { compareCase } from '../../api/_lib/bench/compareCase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STAGING = path.resolve('bench/golden-staging');
const PORT = process.env.PORT || 5178;

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const hash8 = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 8);

function existingIds() {
  const ids = new Set();
  for (const dir of [path.resolve('bench/golden'), STAGING]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      try { ids.add(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).id); } catch { /* bỏ */ }
    }
  }
  return ids;
}

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.static(__dirname)); // phục vụ index.html

// 1) ĐỌC ĐỀ TỪ ẢNH ---------------------------------------------------------
const OCR_SYS = 'Bạn là công cụ chép lại đề toán hình học không gian từ ảnh. CHỈ chép nguyên văn phần ĐỀ BÀI bằng tiếng Việt, giữ đúng ký hiệu (a, √, ⊥, //, góc). Không giải, không thêm lời. Trả JSON: {"de_bai": "<đề>"}';
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'thiếu ảnh' });
    const raw = await callVilao(OCR_SYS, 'Chép lại đề bài trong ảnh, trả JSON {"de_bai": "..."}.', { imageBase64, maxTokens: 1200, timeoutMs: 45000 });
    let text = String(raw || '').trim();
    try { const j = JSON.parse(text); text = j.de_bai || j.text || text; } catch { /* dùng raw */ }
    res.json({ text });
  } catch (e) { res.status(500).json({ error: String(e && e.message || e) }); }
});

// 2) DỊCH → ENGINE → ĐỐI CHIẾU --------------------------------------------
app.post('/api/check', async (req, res) => {
  try {
    const { text, expected, kind } = req.body || {};
    const exp = (Array.isArray(expected) ? expected : [expected]).map((s) => String(s ?? '').trim()).filter(Boolean);
    if (!text || !exp.length) return res.status(400).json({ error: 'thiếu đề hoặc đáp' });

    let plan;
    try { plan = await planFromProblem(text, {}); }
    catch (e) {
      const msg = String(e && e.message || e);
      return res.json({ verdict: /abstain/i.test(msg) ? 'abstain' : 'translate-error', detail: msg });
    }
    let result;
    try { result = solvePlan(plan); }
    catch (e) { return res.json({ verdict: 'engine-error', detail: String(e && e.message || e), plan }); }

    const tmp = { id: 'tmp', expect: { ok: true, answers: exp.map((t) => ({ text: t })) } };
    const cmp = compareCase(tmp, result);
    const got = (result.answers || []).map((a) => a.text ?? a.relation);
    if (cmp.verdict === 'pass') {
      const k = kind || result.answers?.[0]?.kind || 'khac';
      const id = `case-${slug(k)}-${hash8(text)}`;
      const golden = {
        id, source: '', text,
        plan,
        expect: { ok: true, answers: result.answers.map((a) => ({ kind: a.kind, text: a.text ?? a.relation })) },
      };
      return res.json({ verdict: 'match', got, golden, dup: existingIds().has(id) });
    }
    res.json({ verdict: cmp.verdict === 'error' || !result.ok ? 'engine-gap' : 'mismatch', got, detail: cmp.detail, plan });
  } catch (e) { res.status(500).json({ error: String(e && e.message || e) }); }
});

// 3) LƯU GOLDEN (chỉ ca đã KHỚP) ------------------------------------------
app.post('/api/save', (req, res) => {
  try {
    const { golden, source, difficulty } = req.body || {};
    if (!golden || !golden.id) return res.status(400).json({ error: 'thiếu golden' });
    fs.mkdirSync(STAGING, { recursive: true });
    const out = { ...golden, source: source || 'de-that-anh', difficulty: difficulty || undefined };
    fs.writeFileSync(path.join(STAGING, golden.id + '.json'), JSON.stringify(out, null, 2));
    res.json({ ok: true, file: `bench/golden-staging/${golden.id}.json` });
  } catch (e) { res.status(500).json({ error: String(e && e.message || e) }); }
});

app.listen(PORT, () => {
  if (!process.env.VILAO_API_KEY) console.log('⚠️  Chưa có VILAO_API_KEY — /api/ocr và /api/check sẽ lỗi. Chạy: VILAO_API_KEY=sk-... npm run label:studio');
  console.log(`\n  Xưởng gán nhãn bằng ảnh: http://localhost:${PORT}\n  (dừng: Ctrl+C · ca đã lưu nằm ở bench/golden-staging/)\n`);
});
