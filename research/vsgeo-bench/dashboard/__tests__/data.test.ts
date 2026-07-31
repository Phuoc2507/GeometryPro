import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildLeaderboard, type BenchmarkSummary } from "../data";

// __dirname không tồn tại sẵn trong ESM, nên ta tự dựng đường dẫn thư mục hiện tại
// từ import.meta.url (URL của chính file test này) rồi đọc file JSON cạnh nó.
const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(
  readFileSync(path.join(here, "sample-summary.json"), "utf8"),
) as BenchmarkSummary;

describe("buildLeaderboard — bảng xếp hạng model", () => {
  it("sắp model theo accuracy giảm dần và đánh số hạng từ 1", () => {
    const rows = buildLeaderboard(sample);
    expect(rows.map((r) => r.modelId)).toEqual(["gpt-flagship", "open-model-7b"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("đổi accuracy phân số (0..1) thành phần trăm làm tròn 1 chữ số thập phân", () => {
    const rows = buildLeaderboard(sample);
    expect(rows[0].accuracyPct).toBe(82); // 0.82 -> 82
    expect(rows[1].accuracyPct).toBe(50); // 0.50 -> 50
  });

  it("giữ nguyên số câu đúng/tổng và kèm chi phí, độ trễ nếu có", () => {
    const rows = buildLeaderboard(sample);
    expect(rows[0].correct).toBe(246);
    expect(rows[0].total).toBe(300);
    expect(rows[0].costUsd).toBe(4.2);
    expect(rows[0].avgLatencyMs).toBe(5300);
  });

  it("là hàm thuần: gọi lần nữa cho kết quả y hệt và không sửa input", () => {
    const before = JSON.stringify(sample);
    const a = buildLeaderboard(sample);
    const b = buildLeaderboard(sample);
    expect(a).toEqual(b);
    expect(JSON.stringify(sample)).toBe(before); // input không bị đụng vào
  });
});
