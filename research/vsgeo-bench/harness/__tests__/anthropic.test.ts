import { describe, it, expect } from "vitest";
import { buildAnthropicRequest, parseAnthropicResponse } from "../models/anthropic";

describe("Anthropic adapter — dựng request (thuần)", () => {
  it("dùng header x-api-key + anthropic-version, system tách riêng", () => {
    const req = buildAnthropicRequest("claude-opus-4-8", "SYS", "USER", { temperature: 0, maxTokens: 1024 }, "sk-ant-test");
    expect(req.url).toBe("https://api.anthropic.com/v1/messages");
    expect(req.headers["x-api-key"]).toBe("sk-ant-test");
    expect(req.headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(req.body);
    expect(body.model).toBe("claude-opus-4-8");
    expect(body.system).toBe("SYS");
    expect(body.max_tokens).toBe(1024);
    expect(body.messages).toEqual([{ role: "user", content: "USER" }]);
  });
});

describe("Anthropic adapter — parse response (thuần)", () => {
  it("bóc content[].text + usage input/output_tokens", () => {
    const sample = {
      content: [{ type: "text", text: "Kết luận \\boxed{2}" }],
      usage: { input_tokens: 50, output_tokens: 8 },
    };
    const reply = parseAnthropicResponse(sample, 700);
    expect(reply.text).toBe("Kết luận \\boxed{2}");
    expect(reply.usage).toEqual({ in: 50, out: 8 });
  });

  it("ném lỗi khi content rỗng", () => {
    expect(() => parseAnthropicResponse({ content: [] } as any, 3)).toThrow();
  });
});
