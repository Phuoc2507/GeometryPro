import type { GeometryData } from '@/types/geometry';

// Lưu ngăn HOÀN TÁC / LÀM LẠI của TỪNG hình (khoá = id lịch sử) vào localStorage,
// để mở lại hình (đổi bài, tải lại trang, hôm sau quay lại) vẫn còn undo/redo.
// Trong phiên đang mở, undo vẫn KHÔNG giới hạn; bản lưu chỉ giữ MAX_STEPS bước gần nhất
// để không làm phình bộ nhớ trình duyệt.
const KEY = 'geo3d_undo_history';
const MAX_STEPS = 25;    // mỗi ngăn (undo/redo) lưu tối đa 25 bước gần nhất
const MAX_FIGURES = 6;   // theo dõi tối đa 6 hình gần nhất (bỏ hình cũ nhất khi vượt)

interface Entry { undo: GeometryData[]; redo: GeometryData[]; t: number }
type Store = Record<string, Entry>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Hết chỗ → bỏ hình cũ nhất rồi thử lại một lần (không nuốt to, đây là tính năng phụ).
    const ids = Object.keys(store).sort((a, b) => store[a].t - store[b].t);
    if (ids.length) {
      delete store[ids[0]];
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* bỏ qua */ }
    }
  }
}

export function loadUndoHistory(id: string): { undo: GeometryData[]; redo: GeometryData[] } {
  if (!id) return { undo: [], redo: [] };
  const e = read()[id];
  return e ? { undo: e.undo ?? [], redo: e.redo ?? [] } : { undo: [], redo: [] };
}

export function saveUndoHistory(id: string, undo: GeometryData[], redo: GeometryData[], now: number): void {
  if (!id) return;
  // Cả hai ngăn rỗng (trạng thái mount ban đầu, hoặc hình vừa nạp chưa sửa) → KHÔNG ghi đè/xoá:
  // tránh đua với lúc mở hình (nạp bất đồng bộ) làm mất lịch sử đã lưu. Bản lưu sẽ được cập nhật
  // khi người dùng thật sự sửa (stack có phần tử).
  if (undo.length === 0 && redo.length === 0) return;
  const store = read();
  store[id] = { undo: undo.slice(-MAX_STEPS), redo: redo.slice(-MAX_STEPS), t: now };
  const ids = Object.keys(store);
  if (ids.length > MAX_FIGURES) {
    ids.sort((a, b) => store[a].t - store[b].t);
    for (const old of ids.slice(0, ids.length - MAX_FIGURES)) delete store[old];
  }
  write(store);
}
