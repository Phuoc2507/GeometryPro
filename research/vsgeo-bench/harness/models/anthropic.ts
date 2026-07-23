import type { ModelReply } from "../types";

export function buildAnthropicRequest(
  model: string,               // đã bỏ tiền tố "anthropic:" (vd "claude-opus-4-8")
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number },
  apiKey: string
): { url: string; headers: Record<string, string>; body: string } {
  return {
    url: "https://api.anthropic.com/v1/messages",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0,
      system,                                       // Anthropic để system TÁCH RIÊNG, không trong messages
      messages: [{ role: "user", content: user }],
    }),
  };
}

export function parseAnthropicResponse(json: any, latencyMs: number): ModelReply {
  const blocks = json?.content;
  const text = Array.isArray(blocks)
    ? blocks.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("")
    : "";
  if (!text || text.trim() === "") {
    throw new Error("Anthropic: response không có nội dung text");
  }
  const u = json.usage;
  const usage = u ? { in: u.input_tokens ?? 0, out: u.output_tokens ?? 0 } : undefined;
  return { text, latencyMs, usage };
}

export async function call(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<ModelReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Thiếu ANTHROPIC_API_KEY trong môi trường (.env)");
  const req = buildAnthropicRequest(model, system, user, opts, apiKey);
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
      throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const json = await res.json();
    return parseAnthropicResponse(json, Date.now() - t0);
  } finally {
    clearTimeout(timeout);
  }
}
