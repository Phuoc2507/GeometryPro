import type { ModelReply } from "../types";

// ===== Phần THUẦN 1: dựng request. Test được, không đụng mạng. =====
export function buildOpenAIRequest(
  model: string,               // tên model đã BỎ tiền tố "openai:" (vd "gpt-5.6")
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number },
  apiKey: string
): { url: string; headers: Record<string, string>; body: string } {
  return {
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0,
    }),
  };
}

// ===== Phần THUẦN 2: đọc response. Test được, không đụng mạng. =====
export function parseOpenAIResponse(json: any, latencyMs: number): ModelReply {
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("OpenAI: response không có nội dung hợp lệ");
  }
  const u = json.usage;
  const usage = u ? { in: u.prompt_tokens ?? 0, out: u.completion_tokens ?? 0 } : undefined;
  return { text: content, latencyMs, usage };
}

// ===== Phần CÓ MẠNG: chỉ chạy khi chạy thật. Không viết unit test cho hàm này. =====
export async function call(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<ModelReply> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Thiếu OPENAI_API_KEY trong môi trường (.env)");
  const req = buildOpenAIRequest(model, system, user, opts, apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);
  const t0 = Date.now();
  try {
    const res = await fetch(req.url, {
      method: "POST",
      headers: req.headers,
      body: req.body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const json = await res.json();
    return parseOpenAIResponse(json, Date.now() - t0);
  } finally {
    clearTimeout(timeout);
  }
}
