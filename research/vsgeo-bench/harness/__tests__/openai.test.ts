import { describe, it, expect } from "vitest";
import { buildOpenAIRequest, parseOpenAIResponse } from "../models/openai";

describe("OpenAI adapter — dựng request (thuần, không mạng)", () => {
  it("đặt đúng endpoint, header Bearer và body messages", () => {
    const req = buildOpenAIRequest("gpt-5.6", "SYS", "USER", { temperature: 0, maxTokens: 1024 }, "sk-test");
    expect(req.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(req.headers["Authorization"]).toBe("Bearer sk-test");
    expect(req.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(req.body);
    expect(body.model).toBe("gpt-5.6");
    expect(body.max_tokens).toBe(1024);
    expect(body.temperature).toBe(0);
    expect(body.messages).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "USER" },
    ]);
  });
});

describe("OpenAI adapter — parse response (thuần, không mạng)", () => {
  it("bóc text + usage từ JSON mẫu ra ModelReply", () => {
    const sample = {
      choices: [{ message: { content: "Đáp án \\boxed{8}" } }],
      usage: { prompt_tokens: 120, completion_tokens: 30 },
    };
    const reply = parseOpenAIResponse(sample, 1500);
    expect(reply.text).toBe("Đáp án \\boxed{8}");
    expect(reply.latencyMs).toBe(1500);
    expect(reply.usage).toEqual({ in: 120, out: 30 });
  });

  it("ném lỗi khi response không có choices (để callModel bắt và retry)", () => {
    expect(() => parseOpenAIResponse({ error: "boom" } as any, 10)).toThrow();
  });
});
