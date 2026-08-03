// Đánh dấu "đang giải bài" theo id lịch sử, lưu localStorage.
// Dùng để: sau khi F5/rời trang GIỮA LÚC đang giải, quay lại biết cần CHỜ kết quả
// server lưu (persistSolve) rồi tự nạp — thay vì tưởng là mất.
const KEY = 'geo3d:solving';
const MAX_AGE = 5 * 60 * 1000; // 5 phút — quá thì coi như bỏ (giải chắc đã xong/lỗi)

type Marks = Record<string, { problem: string; at: number }>;

function read(): Marks {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as Marks; }
  catch { return {}; }
}
function write(m: Marks) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* bỏ qua */ }
}

export function markSolving(id: string | null | undefined, problem: string) {
  if (!id) return;
  const m = read();
  m[id] = { problem, at: Date.now() };
  write(m);
}

export function clearSolving(id: string | null | undefined) {
  if (!id) return;
  const m = read();
  if (m[id]) { delete m[id]; write(m); }
}

export function getSolving(id: string | null | undefined): { problem: string; at: number } | null {
  if (!id) return null;
  const m = read();
  const e = m[id];
  if (!e) return null;
  if (Date.now() - e.at > MAX_AGE) { clearSolving(id); return null; }
  return e;
}
