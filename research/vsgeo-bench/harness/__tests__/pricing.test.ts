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

  it("bảng giá PRICING có ít nhất các model chính của đề tài", () => {
    // Chỉ kiểm tra khoá tồn tại, KHÔNG kiểm tra con số (con số là cấu hình, sẽ đổi theo thời giá).
    expect(PRICING["test:demo"]).toBeDefined();
  });
});
