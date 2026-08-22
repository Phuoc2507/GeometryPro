// fetch có TIMEOUT — nếu mạng khựng thì tự huỷ để không kẹt spinner/nút mãi mãi.
// Huỷ sẽ ném lỗi (AbortError) → rơi vào catch của nơi gọi → reset trạng thái loading.
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
