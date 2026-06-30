// DeepSeek API wrapper — used by sympy mode in analyzeGeometry.js
import 'dotenv/config';

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

export async function callDeepSeek(systemPrompt, userMessage, options = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set in .env');

  const model = options.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const maxTokens = options.maxTokens || 4096;
  const timeoutMs = options.timeoutMs || 90000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0,
        stream: false,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`DeepSeek API ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(`DeepSeek error: ${JSON.stringify(data.error)}`);

    // deepseek-reasoner returns reasoning_content + content; we want only content
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('DeepSeek returned empty content');
    return content;
  } finally {
    clearTimeout(timer);
  }
}
