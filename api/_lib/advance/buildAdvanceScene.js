// Task 4 của "Advance mode" (bài đa-câu) — Pass 1 + ráp cảnh.
// Sau khi splitProblem (Task 3) tách đề thành parts, hàm này dịch BASE (toàn bộ hình) MỘT lần
// rồi tạo các Step bóc lớp. Lý do dịch một lần: nếu dịch lại mỗi câu, hai lần dịch LLM có thể
// chọn hệ toạ độ khác nhau → cùng điểm S ở chỗ khác nhau giữa câu a và b (trôi toạ độ).
// Một base = một hệ toạ độ. visibleIds của mỗi Step là CUMULATIVE (câu sau ⊇ câu trước).

import { planFromProblem, solvePlan } from '../kernel-bridge/solveWithKernel.js';
import { solveSteps } from '../solveCore.js';

// #3 — Điểm MỚI của 1 mô tả = id ĐẦU TIÊN (IN HOA, có thể phẩy/số) xuất hiện trong mô tả VÀ có trong allIds.
// KHÔNG lấy chữ-cái-đầu-chuỗi: điểm được ĐỊNH NGHĨA thường đứng TRƯỚC điểm tham chiếu →
// "M là trung điểm SC", "trung điểm M của SC" đều → M; "hình chiếu H của A" → H; "Gọi N trung điểm BC" → N.
const firstIdInAllIds = (desc, ids) => (String(desc).match(/[A-Z]'?[0-9]?/g) || []).find((t) => ids.has(t));
// id mới do 1 part khai (đã lọc rỗng — mô tả không chứa id nào của base thì bỏ).
const newIdsOf = (part, ids) => (part.phan_tu_moi || []).map((d) => firstIdInAllIds(d, ids)).filter(Boolean);

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
  const solveFn = opts.solveSteps || solveSteps;   // Task B2 — solveSteps injectable (test không gọi LLM).
  // #1 — cap N ≤ 6: bài 7-8 câu chỉ dựng 6 câu đầu (tránh timeout). Dùng `parts` (đã cap) từ đây.
  const parts = (split.parts || []).slice(0, 6);
  // Dịch BASE một lần: setup + hợp mọi câu hỏi → 1 hệ toạ độ (tránh trôi toạ độ giữa các câu).
  const baseProblem = `${split.setup}\n` + parts.map((p, i) => `${p.label || i + 1}) ${p.hoi}`).join('\n');
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

  const allIds = new Set(base.points.map((p) => p.id));   // id điểm base — cần TRƯỚC khi dùng newIdsOf/baseline
  const introduced = new Set(parts.flatMap((p) => newIdsOf(p, allIds)));
  const baseline = [...allIds].filter((id) => !introduced.has(id));  // id không câu nào khai là "mới"

  // pha 1: visibleIds cumulative theo THỨ TỰ (đồng bộ, không await — câu sau ⊇ câu trước).
  const cumulative = new Set();
  const metas = parts.map((p, i) => {
    for (const nm of newIdsOf(p, allIds)) cumulative.add(nm);
    return { p, i, visibleIds: [...new Set([...baseline, ...cumulative])] };
  });
  // pha 2: giải đáp SONG SONG (Promise.all giữ đúng thứ tự index → answers[i] khớp câu i).
  // Task 5 — thử engine giải CÂU này. Giải được ⇒ verified:true (đã tự kiểm). Engine chịu ⇒
  // verified:false ("chưa kiểm chứng"), TUYỆT ĐỐI KHÔNG bịa số (để trống text ở v1).
  const answers = await Promise.all(parts.map((p) => solveQuestion(p.hoi, split.setup, opts)));
  // pha 3: sinh LỜI GIẢI từng bước SONG SONG (cùng lúc — không chạy engine lại). TÁI DÙNG engineAnswer:
  // câu engine giải được (answers[i].ok + text) → eng={text,approx,verified:true} để solveSteps dẫn tới
  // đúng đáp số; câu engine chịu → eng=null (lời giải LLM "chưa kiểm chứng"). solveSteps thuần/không throw,
  // vẫn bọc .catch(→null) phòng inject lỗi. index giữ đúng thứ tự → solutions[i] khớp câu i.
  const solutions = await Promise.all(parts.map((p, i) => {
    const a = answers[i];
    const eng = a?.ok && a.text !== undefined ? { text: a.text, approx: a.approx, verified: true } : null;
    return Promise.resolve(solveFn(`${split.setup}\n${p.hoi}`, base, eng, opts)).catch(() => null);
  }));
  const steps = metas.map((m) => {
    const q = answers[m.i];
    return {
      id: m.p.label || `câu ${m.i + 1}`,
      label: m.p.label || `Câu ${m.i + 1}`,
      visibleIds: m.visibleIds,
      answer: q?.ok && q.text !== undefined
        ? { text: q.text, approx: q.approx, verified: true }
        : { verified: false },
      solution: solutions[m.i] || null,
    };
  });
  return { base, steps };
}
