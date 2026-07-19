// Task 4 của "Advance mode" (bài đa-câu) — Pass 1 + ráp cảnh.
// Sau khi splitProblem (Task 3) tách đề thành parts, hàm này dịch BASE (toàn bộ hình) MỘT lần
// rồi tạo các Step bóc lớp. Lý do dịch một lần: nếu dịch lại mỗi câu, hai lần dịch LLM có thể
// chọn hệ toạ độ khác nhau → cùng điểm S ở chỗ khác nhau giữa câu a và b (trôi toạ độ).
// Một base = một hệ toạ độ. visibleIds của mỗi Step là CUMULATIVE (câu sau ⊇ câu trước).

import { planFromProblem, solvePlan } from '../kernel-bridge/solveWithKernel.js';

// Tên phần tử mới trong 1 part (chuỗi mô tả) → id điểm (chữ cái đầu, có thể có phẩy/số).
const nameOf = (s) => String(s).trim().match(/^[A-Za-z]'?[0-9]?/)?.[0] || String(s).trim();

export async function buildAdvanceScene(problem, split, opts = {}) {
  // Dịch BASE một lần: setup + hợp mọi câu hỏi → 1 hệ toạ độ (tránh trôi toạ độ giữa các câu).
  const baseProblem = `${split.setup}\n` + split.parts.map((p, i) => `${p.label || i + 1}) ${p.hoi}`).join('\n');
  const basePlan = await planFromProblem(baseProblem, opts);
  const baseRes = solvePlan(basePlan);
  if (!baseRes?.ok || !(baseRes.geometry?.points?.length)) return null; // base fail → route rơi về bài đơn
  const base = baseRes.geometry;

  const allIds = new Set(base.points.map((p) => p.id));
  const introduced = new Set(split.parts.flatMap((p) => (p.phan_tu_moi || []).map(nameOf)));
  const baseline = [...allIds].filter((id) => !introduced.has(id));  // id không câu nào khai là "mới"

  const cumulative = new Set();
  const steps = [];
  for (const p of split.parts) {
    for (const nm of (p.phan_tu_moi || []).map(nameOf)) if (allIds.has(nm)) cumulative.add(nm);
    steps.push({
      id: p.label || `câu ${steps.length + 1}`,
      label: p.label || `Câu ${steps.length + 1}`,
      visibleIds: [...new Set([...baseline, ...cumulative])],
      answer: undefined,   // Task 5 sẽ điền đáp từng câu qua engine
    });
  }
  return { base, steps };
}
