import { describe, it, expect } from "vitest";
import { buildGeminiRequest, parseGeminiResponse } from "../models/gemini";

describe("Gemini adapter — dựng request (thuần)", () => {
  it("khoá nằm trong URL, đề nằm trong contents, system ở systemInstruction", () => {
    const req = buildGeminiRequest("gemini-2.5-pro", "SYS", "USER", { temperature: 0, maxTokens: 2048 }, "AIza-test");
    expect(req.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=AIza-test"
    );
    const body = JSON.parse(req.body);
    expect(body.systemInstruction.parts[0].text).toBe("SYS");
    expect(body.contents[0].parts[0].text).toBe("USER");
    expect(body.generationConfig.temperature).toBe(0);
    expect(body.generationConfig.maxOutputTokens).toBe(2048);
  });
});

describe("Gemini adapter — parse response (thuần)", () => {
  it("bóc text từ candidates + usageMetadata", () => {
    const sample = {
      candidates: [{ content: { parts: [{ text: "Vậy \\boxed{a^3}" }] } }],
      usageMetadata: { promptTokenCount: 88, candidatesTokenCount: 12 },
    };
    const reply = parseGeminiResponse(sample, 900);
    expect(reply.text).toBe("Vậy \\boxed{a^3}");
    expect(reply.latencyMs).toBe(900);
    expect(reply.usage).toEqual({ in: 88, out: 12 });
  });

  it("ném lỗi khi bị chặn / không có candidates", () => {
    expect(() => parseGeminiResponse({ promptFeedback: { blockReason: "SAFETY" } } as any, 5)).toThrow();
  });
});
