// api/test-apikey.js
// TAB admin "Test API Key": gửi 1 đề qua NHIỀU api key, đo token/thời gian, trả JSON hình
// (để admin tự đối chiếu). KHÔNG trừ credit, KHÔNG đụng kernel — chỉ gọi LLM thô.
import { requireAdmin } from './_lib/adminAuth.js';
import { callVilao } from './_lib/vilao.js';
import { BASE_PROMPT } from './_prompts/prompts/base.js';
import { LEVEL_STATIC } from './_prompts/prompts/levels.js';
import { getTestApiKeys, getTestApiKeysPublic } from './_lib/testApiKeys.js';

export const config = { maxDuration: 60 };

const SYSTEM_PROMPT = `${BASE_PROMPT}\n\n${LEVEL_STATIC}`;

async function runOne(key, problem, image) {
  const t0 = Date.now();
  try {
    const userMsg = image
      ? (problem || 'Đề bài nằm trong ảnh đính kèm — hãy đọc kỹ và dựng hình.')
      : problem;
    const raw = await callVilao(SYSTEM_PROMPT, userMsg, {
      model: key.model,
      apiKey: key.apiKey,
      maxTokens: 8192,
      timeoutMs: 50000,
      aiModel: 'low',
      maxAttempts: 1,   // test: KHÔNG retry để đo trung thực từng key
      imageBase64: image || null,
      returnRaw: true,
    });
    let parsed = null;
    let parseError = null;
    try { parsed = JSON.parse(raw.content); } catch (e) { parseError = e.message; }
    const geometry = parsed ? (parsed.geometry || parsed) : null;
    return {
      keyId: key.id, keyName: key.name, model: key.model, ok: true,
      timeMs: Date.now() - t0,
      tokens: raw.usage ? {
        prompt: raw.usage.prompt_tokens ?? null,
        completion: raw.usage.completion_tokens ?? null,
        total: raw.usage.total_tokens ?? null,
      } : null,
      raw: raw.content,
      geometry,
      parseError,
    };
  } catch (e) {
    return {
      keyId: key.id, keyName: key.name, model: key.model, ok: false,
      timeMs: Date.now() - t0, error: e?.message || 'Lỗi không xác định',
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const gate = await requireAdmin(req);
  if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

  const { action, problem, keyIds, image } = req.body || {};

  if (action === 'list-keys') {
    return res.status(200).json({ keys: getTestApiKeysPublic() });
  }

  const text = (problem || '').toString().trim();
  const img = typeof image === 'string' && image ? image : null;
  if (!text && !img) return res.status(400).json({ error: 'Thiếu đề bài (gõ chữ hoặc dán ảnh)' });

  const all = getTestApiKeys();
  const chosen = (Array.isArray(keyIds) && keyIds.length)
    ? all.filter((k) => keyIds.includes(k.id))
    : all;
  if (!chosen.length) return res.status(400).json({ error: 'Không có API key hợp lệ để gửi' });

  const results = await Promise.all(chosen.map((k) => runOne(k, text, img)));
  return res.status(200).json({ results });
}
