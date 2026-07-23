import type { ModelReply } from "../types";
import { parseOpenAIResponse } from "./openai";

export function buildOpenRouterRequest(
  model: string,               // đã bỏ tiền tố "openrouter:" (vd "qwen/qwen-2.5-72b-instruct")
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number },
  apiKey: string
): { url: string; headers: Record<string, string>; body: string } {
  return {
    url: "https://openrouter.ai/api/v1/chat/completions",
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

// OpenRouter trả response y hệt OpenAI => dùng lại parseOpenAIResponse.
export function parseOpenRouterResponse(json: any, latencyMs: number): ModelReply {
  return parseOpenAIResponse(json, latencyMs);
}

export async function call(
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<ModelReply> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Thiếu OPENROUTER_API_KEY trong môi trường (.env)");
  const req = buildOpenRouterRequest(model, system, user, opts, apiKey);
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
      throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const json = await res.json();
    return parseOpenRouterResponse(json, Date.now() - t0);
  } finally {
    clearTimeout(timeout);
  }
}
