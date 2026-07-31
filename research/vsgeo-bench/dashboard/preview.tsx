// dashboard/preview.tsx — CHỈ để xem trước trên máy, không phải sản phẩm giao nộp.
// Ghi chú: Task 4 (Leaderboard) chưa dựng ở nhánh này, nên preview hiện chỉ render
// DEMO SỐNG "Kiểm tra lời giải AI". Khi Leaderboard có mặt, thêm <Leaderboard/> lên trên.
import { createRoot } from "react-dom/client";
import { CheckAiSolution } from "./CheckAiSolution";

const root = createRoot(document.getElementById("root")!);
root.render(
  <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
    <CheckAiSolution />
  </div>,
);
