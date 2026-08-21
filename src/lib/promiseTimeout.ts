// Bọc TIMEOUT cho các promise dạng { data, error } (vd supabase.rpc) — mạng đứng thì trả lỗi
// thay vì treo nút "Đang xử lý…" mãi. Hết giờ resolve { data: null, error } để nơi gọi xử lý như lỗi.
export function withTimeout<T extends { error: unknown }>(
  promise: PromiseLike<T>,
  ms = 15000,
  timeoutValue: T = { data: null, error: new Error('Mạng chậm, vui lòng thử lại.') } as unknown as T,
): Promise<T> {
  const timeout = new Promise<T>((resolve) => setTimeout(() => resolve(timeoutValue), ms));
  return Promise.race([Promise.resolve(promise), timeout]);
}
