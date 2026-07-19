// Task 4 của "Advance mode" (bài đa-câu) — Pass 1 + ráp cảnh.
// Sau khi splitProblem (Task 3) tách đề thành parts, hàm này dịch BASE (toàn bộ hình) MỘT lần
// rồi tạo các Step bóc lớp. Lý do dịch một lần: nếu dịch lại mỗi câu, hai lần dịch LLM có thể
// chọn hệ toạ độ khác nhau → cùng điểm S ở chỗ khác nhau giữa câu a và b (trôi toạ độ).
// Một base = một hệ toạ độ. visibleIds của mỗi Step là CUMULATIVE (câu sau ⊇ câu trước).

import { planFromProblem, solvePlan } from '../kernel-bridge/solveWithKernel.js';

// Tên phần tử mới trong 1 part (chuỗi mô tả) → id điểm (chữ cái đầu, có thể có phẩy/số).
const nameOf = (s) => String(s).trim().match(/^[A-Za-z]'?[0-9]?/)?.[0] || String(s).trim();

// Task 5 — GIẢI MỘT CÂU bằng engine (tách riêng để test inject được, không gọi LLM thật).
// Dịch "setup + hỏi" qua planFromProblem + solvePlan; lấy đáp số đầu tiên (answers[0], rồi answer).
// Engine chịu (ok=false / không có đáp / ném) → { ok:false } ⇒ câu đó "chưa kiểm chứng", KHÔNG bịa số.
async function defaultSolveQuestion(hoi, setup, opts = {}) {
  try {
    const plan = await planFromProblem(`${setup}\n${hoi}`, opts);
    const res = solvePlan(plan);
    const ansObj = res?.answers?.[0] ?? res?.answer;   // bài hình: answers[]; bài analysis: answer (phòng hờ)
    return { ok: !!(res?.ok && ansObj), text: ansObj?.text, approx: ansObj?.approx };
  } catch {
    return { ok: false };   // ném (khước từ dịch, ngoài tầm…) ⇒ câu chưa kiểm chứng
  }
}

export async function buildAdvanceScene(problem, split, opts = {}) {
  const solveQuestion = opts.solveQuestion || defaultSolveQuestion;
  // Dịch BASE một lần: setup + hợp mọi câu hỏi → 1 hệ toạ độ (tránh trôi toạ độ giữa các câu).
  const baseProblem = `${split.setup}\n` + split.parts.map((p, i) => `${p.label || i + 1}) ${p.hoi}`).join('\n');
  // planFromProblem NÉM khi translator abstain / JSON hỏng / schema-fail (ca out-of-catalog phổ biến).
  // Bắt để trả null (base fail) ⇒ route rơi về bài đơn an toàn, KHÔNG để 500 xuyên lên handler.
  let baseRes;
  try {
    const basePlan = await planFromProblem(baseProblem, opts);
    baseRes = solvePlan(basePlan);
  } catch {
    return null;
  }
  if (!baseRes?.ok || !(baseRes.geometry?.points?.length)) return null; // base fail → route rơi về bài đơn
  const base = baseRes.geometry;

  const allIds = new Set(base.points.map((p) => p.id));
  const introduced = new Set(split.parts.flatMap((p) => (p.phan_tu_moi || []).map(nameOf)));
  const baseline = [...allIds].filter((id) => !introduced.has(id));  // id không câu nào khai là "mới"

  const cumulative = new Set();
  const steps = [];
  for (const p of split.parts) {
    for (const nm of (p.phan_tu_moi || []).map(nameOf)) if (allIds.has(nm)) cumulative.add(nm);
    // Task 5 — thử engine giải CÂU này. Giải được ⇒ verified:true (đã tự kiểm). Engine chịu ⇒
    // verified:false ("chưa kiểm chứng"), TUYỆT ĐỐI KHÔNG bịa số (để trống text ở v1).
    const q = await solveQuestion(p.hoi, split.setup, opts);
    steps.push({
      id: p.label || `câu ${steps.length + 1}`,
      label: p.label || `Câu ${steps.length + 1}`,
      visibleIds: [...new Set([...baseline, ...cumulative])],
      answer: q?.ok && q.text !== undefined
        ? { text: q.text, approx: q.approx, verified: true }
        : { verified: false },
    });
  }
  return { base, steps };
}
