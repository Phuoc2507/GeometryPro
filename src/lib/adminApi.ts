// src/lib/adminApi.ts
// Gọi endpoint quản trị /api/admin kèm Bearer token (giống lối /api/delete-account).
// Server tự kiểm role='admin' — client chỉ là lớp tiện ích, không nắm bảo mật.
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  display_name: string | null;
  role: string;
  plan_tier: string;
  plan_code: string;
  plan_expires_at: string | null;
  plan_credits: number;
  purchased_credits: number;
  credits: number;
}

export interface AdminOrder {
  id: string;
  user_id: string | null;
  order_code: number;
  plan_code: string | null;
  amount: number;
  credit_amount: number | null;
  status: string | null;
  fulfilled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  display_name: string | null;
}

export interface GoldenFigure {
  id: string;
  prompt: string;
  prompt_norm: string;
  mode: string | null;
  source: string;
  note: string | null;
  source_report_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ListUsersResult { users: AdminUser[]; page: number; hasMore: boolean; total: number | null }
export interface ListOrdersResult { orders: AdminOrder[]; page: number; hasMore: boolean }
export interface ListGoldenResult { golden: GoldenFigure[]; page: number; hasMore: boolean }

async function adminApi<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Bạn cần đăng nhập lại');

  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Lỗi máy chủ');
  return body as T;
}

export const listUsers = (page = 1, perPage = 30) =>
  adminApi<ListUsersResult>('list-users', { page, perPage });

export const listOrders = (page = 1, perPage = 30) =>
  adminApi<ListOrdersResult>('list-orders', { page, perPage });

export const grantCredit = (userId: string, amount: number, reason?: string, idempotencyKey?: string) =>
  adminApi<{ ok: boolean; remaining: number | null }>('grant-credit', { userId, amount, reason, idempotencyKey });

export const setRole = (userId: string, role: 'admin' | 'user') =>
  adminApi<{ ok: boolean }>('set-role', { userId, role });

// ── Hình chuẩn (golden) ──────────────────────────────────────────────────────
export interface SaveGoldenParams {
  prompt: string;
  geometry: unknown;
  advanceScene?: unknown | null;   // nếu có ⇒ lưu golden dạng Nâng cao (giữ nguyên bước + đáp số)
  mode?: string | null;
  note?: string | null;
  sourceReportId?: string | null;
}

export const saveGolden = (params: SaveGoldenParams) =>
  adminApi<{ ok: boolean; id: string | null }>('save-golden', {
    prompt: params.prompt,
    geometry: params.geometry,
    advanceScene: params.advanceScene ?? null,
    mode: params.mode ?? null,
    note: params.note ?? null,
    sourceReportId: params.sourceReportId ?? null,
  });

export const listGolden = (page = 1, perPage = 30) =>
  adminApi<ListGoldenResult>('list-golden', { page, perPage });

export const deleteGolden = (id: string) =>
  adminApi<{ ok: boolean }>('delete-golden', { id });

// ── Nhờ AI vẽ lại (endpoint riêng /api/admin-redraw vì chạy lâu) ──────────────
export interface RedrawVerdict {
  verified: boolean;                 // máy TỰ CHẤM được và ĐẠT (tự tin đúng)
  ok: boolean;
  confidence: number | null;
  violations: Array<Record<string, unknown>>;
  source: 'kernel' | 'llm' | 'advance' | 'none';
  attempts: number;
  checkedConstraints: number;        // >0: số ràng buộc đã kiểm; -1: kernel kiểm toàn bộ; 0: chưa tự chấm được
  note: string;
}
export interface RedrawCandidate {
  geometry: unknown | null;
  advanceScene?: unknown | null;   // có khi dựng bằng engine Nâng cao (vessel/tròn xoay/thiết diện)
  prompt: string;
  verdict: RedrawVerdict;
}

export const redrawProblem = async (prompt: string, maxAttempts = 1): Promise<RedrawCandidate> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Bạn cần đăng nhập lại');

  const res = await fetch('/api/admin-redraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt, maxAttempts }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Lỗi máy chủ khi vẽ lại');
  return body.candidate as RedrawCandidate;
};
