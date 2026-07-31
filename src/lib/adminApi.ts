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

export interface ListUsersResult { users: AdminUser[]; page: number; hasMore: boolean; total: number | null }
export interface ListOrdersResult { orders: AdminOrder[]; page: number; hasMore: boolean }

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
