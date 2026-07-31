// dashboard/data.ts
// Lớp hàm THUẦN biến JSON tóm tắt (do analysis/report.ts sinh — xem kế hoạch 05)
// thành các cấu trúc sẵn-sàng-vẽ cho recharts. KHÔNG import React ở đây, để test được.

// ---- Hình dạng file JSON tóm tắt (HỢP ĐỒNG với kế hoạch 05) ----
// Các type canonical (Difficulty, TopicStat, DifficultyStat, RobustnessStat, ModelSummary,
// BenchmarkSummary) do KẾ HOẠCH 05 SỞ HỮU và sống ở `analysis/types.ts` — một nguồn sự thật
// duy nhất. Dashboard KHÔNG định nghĩa lại; chỉ IMPORT rồi RE-EXPORT lại để các file cạnh
// (test, Leaderboard.tsx, preview.tsx) vẫn `import ... from "./data"` như trước.
import type {
  BenchmarkSummary,
  ModelSummary,
  TopicStat,
  DifficultyStat,
  RobustnessStat,
  Difficulty,
} from "../analysis/types";
export type {
  BenchmarkSummary,
  ModelSummary,
  TopicStat,
  DifficultyStat,
  RobustnessStat,
  Difficulty,
};

// ---- Tiện ích nhỏ ----
// Đổi phân số 0..1 sang phần trăm, làm tròn 1 chữ số thập phân. VD 0.826 -> 82.6
export function toPct(fraction: number): number {
  return Math.round(fraction * 1000) / 10;
}

// ---- 1) Bảng xếp hạng ----
export type LeaderboardRow = {
  rank: number;
  modelId: string;
  accuracyPct: number;
  correct: number;
  total: number;
  costUsd?: number;
  avgLatencyMs?: number;
};

export function buildLeaderboard(summary: BenchmarkSummary): LeaderboardRow[] {
  // [...] tạo bản sao để KHÔNG sửa mảng gốc (giữ tính thuần).
  const sorted = [...summary.models].sort(
    (a, b) =>
      b.overall.accuracy - a.overall.accuracy || // accuracy cao lên trước
      a.modelId.localeCompare(b.modelId), // hoà nhau thì sắp theo tên cho ổn định
  );
  return sorted.map((m, i) => ({
    rank: i + 1,
    modelId: m.modelId,
    accuracyPct: toPct(m.overall.accuracy),
    correct: m.overall.correct,
    total: m.overall.total,
    costUsd: m.costUsd,
    avgLatencyMs: m.avgLatencyMs,
  }));
}
