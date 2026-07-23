import { describe, it, expect, vi } from "vitest";
import { callModel } from "../callModel";
import type { ModelReply } from "../types";

// Một adapter giả: ghi lại nó nhận model gì, trả về reply cố định.
function fakeAdapter(reply: ModelReply) {
  const spy = vi.fn(async (_model: string) => reply);
  return { call: spy, spy };
}

const noSleep = async (_ms: number) => {};  // sleep giả: không chờ gì cả

describe("callModel — định tuyến theo tiền tố", () => {
  it("chọn đúng adapter theo tiền tố và bỏ tiền tố khỏi tên model", async () => {
    const openai = fakeAdapter({ text: "\\boxed{1}", latencyMs: 10, usage: { in: 5, out: 1 } });
    const gemini = fakeAdapter({ text: "\\boxed{2}", latencyMs: 20 });
    const reply = await callModel(
      "gemini:gemini-2.5-pro", "S", "U", {},
      { adapters: { openai: openai.call, gemini: gemini.call }, sleep: noSleep }
    );
    expect(gemini.spy).toHaveBeenCalledWith("gemini-2.5-pro", "S", "U", {});
    expect(openai.spy).not.toHaveBeenCalled();
    expect(reply.text).toBe("\\boxed{2}");
  });

  it("gắn costUsd từ bảng giá khi có usage + model có giá", async () => {
    const adapter = fakeAdapter({ text: "x", latencyMs: 1, usage: { in: 1000, out: 500 } });
    const reply = await callModel(
      "test:demo", "S", "U", {},
      { adapters: { test: adapter.call }, sleep: noSleep }
    );
    expect(reply.costUsd).toBeCloseTo(0.002, 9);  // theo PRICING['test:demo']
  });

  it("ném lỗi khi tiền tố không có adapter tương ứng", async () => {
    await expect(
      callModel("khong:gi", "S", "U", {}, { adapters: {}, sleep: noSleep })
    ).rejects.toThrow(/không nhận ra nhà cung cấp/);
  });
});

describe("callModel — retry khi lỗi tạm thời", () => {
  it("thử lại rồi thành công ở lần 2", async () => {
    let n = 0;
    const flaky = vi.fn(async () => {
      n++;
      if (n === 1) throw new Error("network timeout tạm thời");
      return { text: "ok", latencyMs: 5 } as ModelReply;
    });
    const reply = await callModel(
      "openai:gpt-x", "S", "U", {},
      { adapters: { openai: flaky }, sleep: noSleep, maxAttempts: 3 }
    );
    expect(n).toBe(2);
    expect(reply.text).toBe("ok");
  });

  it("hết số lần thử thì ném lỗi cuối", async () => {
    const always = vi.fn(async () => { throw new Error("HTTP 503 dịch vụ bận"); });
    await expect(
      callModel("openai:gpt-x", "S", "U", {}, { adapters: { openai: always }, sleep: noSleep, maxAttempts: 3 })
    ).rejects.toThrow(/503/);
    expect(always).toHaveBeenCalledTimes(3);
  });
});
