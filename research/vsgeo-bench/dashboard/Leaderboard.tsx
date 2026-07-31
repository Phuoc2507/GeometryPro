// dashboard/Leaderboard.tsx
// Component React THUẦN HIỂN THỊ: nhận summary đã có sẵn, gọi các hàm ở data.ts để
// tính, rồi vẽ bằng recharts. Mọi phép tính nằm ở data.ts (đã có test), ở đây chỉ "bày ra".
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  buildLeaderboard,
  buildTopicMatrix,
  buildRobustnessGap,
  modelIds,
  type BenchmarkSummary,
} from "./data";

// Bảng màu cố định để mỗi model một màu ổn định qua các biểu đồ.
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

export function Leaderboard({ summary }: { summary: BenchmarkSummary }) {
  const leaderboard = buildLeaderboard(summary);
  const topicRows = buildTopicMatrix(summary);
  const robustness = buildRobustnessGap(summary);
  const ids = modelIds(summary);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>VSGeo-Bench — Bảng xếp hạng</h1>
      <p style={{ color: "#555" }}>
        Tổng {summary.seedCount} bài · Cập nhật {new Date(summary.generatedAt).toLocaleString("vi-VN")}
      </p>

      {/* 1) Bảng xếp hạng */}
      <h2>1. Xếp hạng tổng thể</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Hạng", "Model", "Accuracy", "Đúng/Tổng", "Chi phí (USD)", "Độ trễ TB (ms)"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "2px solid #333", padding: "6px 8px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((r) => (
            <tr key={r.modelId}>
              <td style={cell}>{r.rank}</td>
              <td style={cell}>{r.modelId}</td>
              <td style={cell}>{r.accuracyPct}%</td>
              <td style={cell}>
                {r.correct}/{r.total}
              </td>
              <td style={cell}>{r.costUsd ?? "—"}</td>
              <td style={cell}>{r.avgLatencyMs ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 2) Accuracy theo chủ đề */}
      <h2>2. Accuracy theo chủ đề (%)</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={topicRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="topic" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          {ids.map((id, i) => (
            <Bar key={id} dataKey={id} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* 3) Khoảng rớt độ bền */}
      <h2>3. Độ bền: accuracy gốc vs sau biến đổi (%)</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={robustness}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="modelId" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="basePct" name="Bài gốc" fill="#16a34a" />
          <Bar dataKey="perturbedPct" name="Sau biến đổi" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const cell: React.CSSProperties = { borderBottom: "1px solid #ddd", padding: "6px 8px" };
