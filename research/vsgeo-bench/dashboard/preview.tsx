// dashboard/preview.tsx — CHỈ để xem trước trên máy, không phải sản phẩm giao nộp.
// Gộp HAI phần: (1) Bảng xếp hạng VSGeo-Bench (Task 4), (2) DEMO SỐNG "Kiểm tra lời giải AI"
// (Task 4B) — điểm nhấn phỏng vấn. Nạp file JSON mẫu ở Task 1 để có số liệu mà vẽ.
import { createRoot } from "react-dom/client";
import { Leaderboard } from "./Leaderboard";
import { CheckAiSolution } from "./CheckAiSolution";
import type { BenchmarkSummary } from "./data";
import sample from "./__tests__/sample-summary.json";

const root = createRoot(document.getElementById("root")!);
root.render(
  <div>
    <Leaderboard summary={sample as BenchmarkSummary} />
    <hr style={{ maxWidth: 960, margin: "32px auto", border: "none", borderTop: "1px solid #ddd" }} />
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <CheckAiSolution />
    </div>
  </div>,
);
