import type { ModelReply } from "../types";

export function buildGeminiRequest(
  model: string,               // đã bỏ tiền tố "gemini:" (vd "gemini-2.5-pro")
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number },
  apiKey: string
): { url: string; headers: Record<string, string>; body: string } {
  return {
    url:
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0,
        maxOutputTokens: opts.maxTokens ?? 4096,
      },
    }),
  };
}

export function parseGeminiResponse(json: any, latencyMs: number): ModelReply {
  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: any) => p?.text ?? "").join("")
    : "";
  if (!text || text.trim() === "") {
    throw new Error("Gemini: không có nội dung (có thể bị chặn an toàn)");
  }
  const u = json.usageMetadata;
  const usage = u ? { in: u.promptTokenCount ?? 0, out: u.candidatesTokenCount ?? 0 } : undefined;
  return { text, latencyMs, usage };
}

export async function call(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<ModelReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY trong môi trường (.env)");
  const req = buildGeminiRequest(model, system, user, opts, apiKey);
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
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const json = await res.json();
    return parseGeminiResponse(json, Date.now() - t0);
  } finally {
    clearTimeout(timeout);
  }
}
