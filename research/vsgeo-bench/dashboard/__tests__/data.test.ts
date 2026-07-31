import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildLeaderboard, type BenchmarkSummary } from "../data";
import { buildTopicMatrix, modelIds } from "../data";
import { buildRobustnessGap } from "../data";

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

describe("buildTopicMatrix — accuracy theo chủ đề cho biểu đồ cột nhóm", () => {
  it("mỗi hàng là một chủ đề, có accuracyPct của từng model", () => {
    const rows = buildTopicMatrix(sample);
    const theTich = rows.find((r) => r.topic === "the_tich");
    expect(theTich).toBeDefined();
    expect(theTich!["gpt-flagship"]).toBe(90); // 0.9 -> 90
    expect(theTich!["open-model-7b"]).toBe(65); // 0.65 -> 65
  });

  it("chủ đề được sắp xếp ổn định theo thứ tự chữ cái", () => {
    const rows = buildTopicMatrix(sample);
    expect(rows.map((r) => r.topic)).toEqual(["goc", "khoang_cach", "the_tich"]);
  });

  it("model thiếu số liệu ở một chủ đề thì điền 0 (không để trống)", () => {
    // dựng một summary méo: model thứ hai không có chủ đề 'goc'
    const lệch: BenchmarkSummary = {
      ...sample,
      models: [
        sample.models[0],
        { ...sample.models[1], byTopic: sample.models[1].byTopic.filter((t) => t.topic !== "goc") },
      ],
    };
    const rows = buildTopicMatrix(lệch);
    const goc = rows.find((r) => r.topic === "goc")!;
    expect(goc["open-model-7b"]).toBe(0);
  });

  it("modelIds trả đúng danh sách model theo thứ tự trong summary", () => {
    expect(modelIds(sample)).toEqual(["gpt-flagship", "open-model-7b"]);
  });
});

describe("buildRobustnessGap — khoảng rớt độ bền (H2)", () => {
  it("tính đúng phần trăm gốc, sau biến đổi và khoảng rớt", () => {
    const rows = buildRobustnessGap(sample);
    const gpt = rows.find((r) => r.modelId === "gpt-flagship")!;
    expect(gpt.basePct).toBe(82); // 0.82
    expect(gpt.perturbedPct).toBe(71); // 0.71
    expect(gpt.gapPct).toBe(11); // 0.11
  });

  it("sắp model theo khoảng rớt giảm dần (giòn nhất lên đầu)", () => {
    const rows = buildRobustnessGap(sample);
    // open-model-7b rớt 0.21 > gpt-flagship rớt 0.11
    expect(rows.map((r) => r.modelId)).toEqual(["open-model-7b", "gpt-flagship"]);
  });
});
