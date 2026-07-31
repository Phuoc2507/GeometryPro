// api/_lib/engineCacheVersion.js
// Phiên bản HÌNH mà engine tất định (kernel) phát ra. BUMP con số này mỗi khi engine đổi CẤU TRÚC
// hình xuất ra (ví dụ: thêm field `curves` để bài "đống rơm" hết rỗng). Khi bump, mọi payload engine
// ĐÃ CACHE trước đó (thiếu field mới) sẽ bị coi là CŨ → bỏ qua khi đọc `ai_cache` → chạy lại engine
// → phục vụ hình mới. KHÔNG đụng cache của luồng LLM (payload không mang engine:'kernel').
//
// LỊCH SỬ:
//   1 — mốc đầu: engine ghép đồ thị hàm số (curves) vào figure cho bài optimize/solve 1-tham-số
//       (commit 54a5e07). Payload engine cache TRƯỚC mốc này thiếu `curves` ⇒ phải bỏ qua.
export const ENGINE_FIGURE_VERSION = 1;

// True ⇒ COI NHƯ CACHE MISS: đây là payload do engine phục vụ (engine:'kernel') nhưng từ một phiên
// bản hình CŨ hơn hiện tại (hoặc chưa từng đánh dấu figureVersion) ⇒ hình có thể thiếu field mới.
// Payload luồng LLM (không có engine:'kernel') KHÔNG bao giờ bị coi là cũ ở đây.
export function isStaleEngineCache(response, version = ENGINE_FIGURE_VERSION) {
  if (!response || typeof response !== 'object') return false;
  if (response.engine !== 'kernel') return false;
  return (Number(response.figureVersion) || 0) < version;
}
