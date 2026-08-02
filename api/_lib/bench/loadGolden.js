// Nạp rổ đề mốc từ 1 thư mục: đọc mọi *.json, validate tối thiểu. NÉM nếu có ca hỏng
// (cổng phải báo lỗi rõ, không được chạy mù trên rổ hỏng).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function validateGolden(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'không phải object' };
  if (typeof obj.id !== 'string' || !obj.id) return { ok: false, error: 'thiếu id' };
  if (!obj.plan || typeof obj.plan !== 'object') return { ok: false, error: `[${obj.id || '?'}] thiếu plan` };
  if (!obj.expect || typeof obj.expect !== 'object') return { ok: false, error: `[${obj.id}] thiếu expect` };
  if (obj.expect.ok !== false && !Array.isArray(obj.expect.answers)) {
    return { ok: false, error: `[${obj.id}] expect.answers phải là mảng khi ok:true` };
  }
  return { ok: true };
}

export function loadGoldenDir(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const cases = [];
  for (const f of files) {
    let obj;
    try { obj = JSON.parse(readFileSync(join(dir, f), 'utf8')); }
    catch (e) { throw new Error(`golden hỏng JSON: ${f}: ${e.message}`); }
    const v = validateGolden(obj);
    if (!v.ok) throw new Error(`golden không hợp lệ: ${f}: ${v.error}`);
    cases.push(obj);
  }
  return cases;
}
