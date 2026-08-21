// scripts/prompt-opt/dataset.mjs
// Nạp tập fitness từ rổ golden: mỗi ca là { id, text, plan, expect:{answers} } — TỰ CHỨA cả đề (text)
// lẫn đáp đúng (expect) ⇒ dùng trực tiếp để chấm "đề → LLM(prompt) → plan → engine → so đáp".
import fs from 'node:fs';
import path from 'node:path';

export function loadDataset(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const items = [];
  for (const f of files) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (!c.text) continue; // cần đề bằng chữ để dịch; ca không có text thì bỏ (chỉ hợp engine-replay)
    items.push({ id: c.id || f.replace(/\.json$/, ''), text: c.text, plan: c.plan, expect: c.expect || {} });
  }
  return items;
}
