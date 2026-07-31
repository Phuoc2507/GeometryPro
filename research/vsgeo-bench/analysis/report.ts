// research/vsgeo-bench/analysis/report.ts
// Sinh báo cáo Markdown + summary.json từ log kết quả. Chạy:
//   npx tsx research/vsgeo-bench/analysis/report.ts <results/> <data/seeds/> <out/>
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EvalRecord, SeedIndex, AccuracyRow,
  BenchmarkSummary, ModelSummary, TopicStat, DifficultyStat, RobustnessStat, Difficulty,
} from "./types";
import { accuracyBy, calibrationRate } from "./stats";
import { loadRecords, loadSeeds } from "./load";

// Cấu trúc NỘI BỘ nuôi buildReport -> report.md (bảng người-đọc). KHÔNG phải summary.json.
// summary.json dùng kiểu máy-đọc canonical BenchmarkSummary (khai báo ở analysis/types.ts).
export interface ReportSummary {
  generatedAt: string;
  totalRecords: number;
  byModel: AccuracyRow[];        // xếp hạng model (accuracy tổng)
  byTopic: AccuracyRow[];        // §6.3 theo chủ đề
  byDifficulty: AccuracyRow[];   // §6.3 theo độ khó
  byAuxiliary: AccuracyRow[];    // H1: cần hình phụ hay không
  calibration: { confidentWrong: number; totalWrong: number; rate: number }; // H3
  robustness?: { overall: number; byKind: Record<string, number> };          // H2 (từ kế hoạch 04)
}

// Lấy id bài GỐC của một bản ghi (biến thể tra theo parentSeedId).
function baseId(r: EvalRecord): string {
  return r.perturbation ? r.perturbation.parentSeedId : r.seedId;
}

// HÀM THUẦN: nhận dữ liệu, trả markdown + summary. Không đọc/ghi file -> test được dễ dàng.
export function buildReport(
  records: EvalRecord[],
  seeds: SeedIndex,
  robustness?: { overall: number; byKind: Record<string, number> },
): { markdown: string; summary: ReportSummary } {
  const byModel = accuracyBy(records, (r) => r.modelId);
  const byTopic = accuracyBy(records, (r) => seeds.get(baseId(r))?.tags.topic ?? ["(không rõ)"]);
  const byDifficulty = accuracyBy(records, (r) => "độ khó " + (seeds.get(baseId(r))?.tags.difficulty ?? "?"));
  const byAuxiliary = accuracyBy(records, (r) => {
    const s = seeds.get(baseId(r));
    if (!s) return "(không rõ)";
    return s.tags.requires_auxiliary_construction ? "cần hình phụ" : "không cần hình phụ";
  });
  const calibration = calibrationRate(records);

  const summary: ReportSummary = {
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    byModel, byTopic, byDifficulty, byAuxiliary, calibration, robustness,
  };
  return { markdown: renderMarkdown(summary), summary };
}

// HÀM THUẦN: gom số liệu theo model thành BenchmarkSummary (HỢP ĐỒNG máy-đọc, kế hoạch 07).
// Kiểu BenchmarkSummary/ModelSummary/… là CANONICAL ở analysis/types.ts — dashboard import từ đó.
export function buildBenchmarkSummary(records: EvalRecord[], seeds: SeedIndex): BenchmarkSummary {
  // acc(xs) = số verdict "correct" / xs.length; mảng rỗng -> 0.
  const acc = (xs: EvalRecord[]): number =>
    xs.length === 0 ? 0 : xs.filter((r) => r.verdict === "correct").length / xs.length;

  // Gom bản ghi theo modelId.
  const byModelId = new Map<string, EvalRecord[]>();
  for (const r of records) {
    if (!byModelId.has(r.modelId)) byModelId.set(r.modelId, []);
    byModelId.get(r.modelId)!.push(r);
  }

  const models: ModelSummary[] = [];
  for (const [modelId, recs] of byModelId) {
    const total = recs.length;
    const correct = recs.filter((r) => r.verdict === "correct").length;
    const incorrect = recs.filter((r) => r.verdict === "incorrect").length;
    const unsure = recs.filter((r) => r.verdict === "unsure").length;

    // byTopic: gom theo TỪNG chủ đề của BÀI GỐC (bài nhiều chủ đề -> cộng vào từng chủ đề).
    const topicBuckets = new Map<string, EvalRecord[]>();
    for (const r of recs) {
      for (const t of seeds.get(baseId(r))?.tags.topic ?? []) {
        if (!topicBuckets.has(t)) topicBuckets.set(t, []);
        topicBuckets.get(t)!.push(r);
      }
    }
    const byTopic: TopicStat[] = [...topicBuckets].map(([topic, xs]) => ({
      topic, total: xs.length, correct: xs.filter((r) => r.verdict === "correct").length, accuracy: acc(xs),
    }));
    byTopic.sort((a, b) => a.topic.localeCompare(b.topic));

    // byDifficulty: gom theo độ khó (1..4) của BÀI GỐC.
    const diffBuckets = new Map<Difficulty, EvalRecord[]>();
    for (const r of recs) {
      const d = seeds.get(baseId(r))?.tags.difficulty;
      if (d === undefined) continue;
      if (!diffBuckets.has(d)) diffBuckets.set(d, []);
      diffBuckets.get(d)!.push(r);
    }
    const byDifficulty: DifficultyStat[] = [...diffBuckets].map(([difficulty, xs]) => ({
      difficulty, total: xs.length, correct: xs.filter((r) => r.verdict === "correct").length, accuracy: acc(xs),
    }));
    byDifficulty.sort((a, b) => a.difficulty - b.difficulty);

    // robustness: bài GỐC (không perturbation) vs BIẾN THỂ (có perturbation).
    const base = recs.filter((r) => !r.perturbation);
    const perturbed = recs.filter((r) => r.perturbation);
    const robustness: RobustnessStat = {
      baseAccuracy: acc(base),
      perturbedAccuracy: acc(perturbed),
      gap: acc(base) - acc(perturbed),
    };

    // Chi phí (tổng nếu có) & độ trễ (trung bình).
    const costs = recs.map((r) => r.costUsd).filter((x): x is number => typeof x === "number");
    const costUsd = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : undefined;
    const avgLatencyMs = total === 0 ? undefined : recs.reduce((a, r) => a + r.latencyMs, 0) / total;

    models.push({
      modelId,
      overall: { total, correct, incorrect, unsure, accuracy: total === 0 ? 0 : correct / total },
      byTopic, byDifficulty, robustness, costUsd, avgLatencyMs,
    });
  }
  models.sort((a, b) => a.modelId.localeCompare(b.modelId)); // thứ tự ổn định

  return { generatedAt: new Date().toISOString(), seedCount: seeds.size, models };
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + "%";
}

function renderAccuracyTable(title: string, rows: AccuracyRow[]): string {
  const lines = [`### ${title}`, "", "| Nhóm | Đúng/Tổng | Accuracy | CI 95% |", "|---|---|---|---|"];
  for (const r of rows) {
    lines.push(`| ${r.key} | ${r.correct}/${r.total} | ${pct(r.accuracy)} | [${pct(r.ci95[0])}, ${pct(r.ci95[1])}] |`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderMarkdown(s: ReportSummary): string {
  const parts: string[] = [];
  parts.push("# Báo cáo VSGeo-Bench");
  parts.push(`_Sinh lúc ${s.generatedAt} · ${s.totalRecords} bản ghi_`);
  parts.push("");
  parts.push(renderAccuracyTable("Xếp hạng model (accuracy tổng)", s.byModel));
  parts.push(renderAccuracyTable("Theo chủ đề (§6.3)", s.byTopic));
  parts.push(renderAccuracyTable("Theo độ khó (§6.3)", s.byDifficulty));
  parts.push(renderAccuracyTable("H1 — Theo cờ cần hình phụ", s.byAuxiliary));
  parts.push('### H3 — Tỉ lệ "tự tin nhưng sai"');
  parts.push(`- Câu sai: ${s.calibration.totalWrong}`);
  parts.push(`- Trong đó trình bày quả quyết: ${s.calibration.confidentWrong}`);
  parts.push(`- Tỉ lệ: ${pct(s.calibration.rate)}`);
  parts.push("");
  if (s.robustness) {
    parts.push("### H2 — Khoảng rớt robustness");
    parts.push(`- Tổng: ${pct(s.robustness.overall)}`);
    for (const [k, v] of Object.entries(s.robustness.byKind)) {
      parts.push(`- ${k}: ${pct(v)}`);
    }
    parts.push("");
  }
  return parts.join("\n");
}

// PHẦN CLI: chỉ chạy khi gọi trực tiếp bằng tsx, KHÔNG chạy khi bị import trong test.
async function main() {
  const [resultsDir, seedsDir, outDir] = process.argv.slice(2);
  if (!resultsDir || !seedsDir || !outDir) {
    console.error("Dùng: npx tsx research/vsgeo-bench/analysis/report.ts <results/> <data/seeds/> <out/>");
    process.exit(1);
  }
  const records = loadRecords(resultsDir);
  const seeds = loadSeeds(seedsDir);

  // Dùng lại robustnessReport từ kế hoạch 04 (nạp động để không phụ thuộc cứng lúc test).
  let robustness: { overall: number; byKind: Record<string, number> } | undefined;
  try {
    const { robustnessReport } = await import("../perturbations/metrics");
    const base = records.filter((r) => !r.perturbation);
    const variants = records.filter((r) => r.perturbation);
    robustness = robustnessReport(base, variants);
  } catch {
    console.warn("Chưa có perturbations/metrics.ts (kế hoạch 04) — bỏ qua H2 robustness.");
  }

  // report.md dùng buildReport (bảng người-đọc); summary.json dùng buildBenchmarkSummary
  // (kiểu máy-đọc canonical BenchmarkSummary ở analysis/types.ts, cho dashboard kế hoạch 07).
  const { markdown } = buildReport(records, seeds, robustness);
  const benchmarkSummary = buildBenchmarkSummary(records, seeds);
  writeFileSync(join(outDir, "report.md"), markdown, "utf8");
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(benchmarkSummary, null, 2), "utf8");
  console.log(`Đã ghi report.md và summary.json vào ${outDir}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
