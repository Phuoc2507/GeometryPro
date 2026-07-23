import { describe, it, expect } from "vitest";
import { estimateCostUsd, PRICING } from "../pricing";

describe("estimateCostUsd — ước tính chi phí theo số token", () => {
  it("tính đúng chi phí khi model có trong bảng giá", () => {
    // Giả sử model 'test:demo' giá 1.00 USD / 1 triệu token vào, 2.00 USD / 1 triệu token ra.
    // Dùng 1000 token vào + 500 token ra => 1000/1e6*1 + 500/1e6*2 = 0.001 + 0.001 = 0.002.
    const cost = estimateCostUsd("test:demo", { in: 1000, out: 500 });
    expect(cost).toBeCloseTo(0.002, 9);
  });

  it("trả undefined khi model KHÔNG có trong bảng giá (không đoán bừa)", () => {
    const cost = estimateCostUsd("khong:ton-tai", { in: 100, out: 100 });
    expect(cost).toBeUndefined();
  });

  it("trả undefined khi thiếu thông tin usage", () => {
    expect(estimateCostUsd("test:demo", undefined)).toBeUndefined();
  });

  it("bảng giá PRICING phủ MỖI nhà cung cấp chính (openai/gemini/anthropic/openrouter)", () => {
    // Bản cũ chỉ kiểm PRICING["test:demo"] (khoá DEMO) — tên test hứa "model chính" nhưng
    // KHÔNG canh dòng giá THẬT nào: ai lỡ xoá hết dòng thật thì mọi costUsd rỗng mà test vẫn
    // XANH (bộ tự-phản-biện phát hiện). Kiểm THEO TIỀN TỐ nhà cung cấp, KHÔNG khoá cứng tên
    // model (tên model đổi theo thời giá; con số càng không kiểm).
    const providers = new Set(Object.keys(PRICING).map((key) => key.split(":")[0]));
    for (const p of ["openai", "gemini", "anthropic", "openrouter"]) {
      expect(providers).toContain(p);
    }
  });

  it("estimateCostUsd ra số dương cho một model THẬT trong bảng (không chỉ demo)", () => {
    const realKey = Object.keys(PRICING).find((key) => !key.startsWith("test:"));
    expect(realKey).toBeDefined();
    const cost = estimateCostUsd(realKey!, { in: 1000, out: 1000 });
    expect(cost).toBeGreaterThan(0);
  });
});
