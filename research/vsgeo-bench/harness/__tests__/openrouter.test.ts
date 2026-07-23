import { describe, it, expect } from "vitest";
import { buildOpenRouterRequest, parseOpenRouterResponse } from "../models/openrouter";

describe("OpenRouter adapter — tương thích OpenAI, chỉ khác URL", () => {
  it("dựng request tới endpoint openrouter với body kiểu OpenAI", () => {
    const req = buildOpenRouterRequest("qwen/qwen-2.5-72b-instruct", "SYS", "USER", { maxTokens: 512 }, "sk-or-test");
    expect(req.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(req.headers["Authorization"]).toBe("Bearer sk-or-test");
    const body = JSON.parse(req.body);
    expect(body.model).toBe("qwen/qwen-2.5-72b-instruct");
    expect(body.messages[0]).toEqual({ role: "system", content: "SYS" });
  });

  it("parse dùng lại logic OpenAI", () => {
    const sample = { choices: [{ message: { content: "\\boxed{1}" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } };
    const reply = parseOpenRouterResponse(sample, 400);
    expect(reply.text).toBe("\\boxed{1}");
    expect(reply.usage).toEqual({ in: 10, out: 2 });
  });
});
