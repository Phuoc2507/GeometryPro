// src/hooks/useSubjectSolver.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hook gọi route đa môn POST `/api/analyze-problem` với { problem } cho đề LÝ/HÓA.
//
// THUẦN & ĐỘC LẬP: không đụng GeometryContext (luồng Toán). Lấy Bearer token GIỐNG HỆT cách
// GeometryContext.invokeLocalApi lấy — `supabase.auth.getSession()` → access_token → header
// Authorization. Prefix `VITE_LOCAL_API_URL` cũng y hệt (dev proxy /api → server.js).
//
// Trả về { loading, result, error, solve, reset }:
//   • solve(problem): gọi route, set result (mọi phản hồi 200 — kể cả ok:false / delegate) hoặc error.
//   • result: thân JSON của route (subject/ok/answers/scene/violations/errors/trace…). ok:false ⇒
//     result vẫn set để SimulationView hiện "ngoài phạm vi" + violations/trace (KHÔNG coi là error).
//   • error: 401 chưa đăng nhập (kind:'auth'), lỗi HTTP khác (kind:'http'), hoặc mạng (kind:'network').
//
// Route theo D22: chỉ YÊU CẦU ĐĂNG NHẬP, KHÔNG trừ credit/quota. Nên hook không đụng quota/upgrade.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_API = (import.meta.env.VITE_LOCAL_API_URL as string | undefined) ?? '';

/** Một đáp số — hợp nhất shape của engine Lý (PhysicsAnswer) và Hóa (ChemAnswer). Mọi field optional. */
export interface SubjectAnswer {
  /** Nhãn câu hỏi (Lý). */
  label?: string;
  /** Loại truy vấn (velocity_at, mass, volume_gas…). */
  kind?: string;
  /** Chuỗi trình bày sẵn của engine ("6 m/s", "n(Cu) = 0,1 mol"…). */
  text?: string;
  /** Đề phòng route đổi tên trường trình bày (engine hiện dùng `text`). */
  display?: string;
  /** Đáp hữu tỉ exact dạng chuỗi (Hóa: "32/5"); Lý không có. */
  exact?: string | null;
  /** Xấp xỉ thập phân. */
  approx?: number | null;
  /** Đơn vị ("m/s", "g", "L", "mol", "%", ""). */
  unit?: string;
  /** Lý: true nếu đáp là xấp xỉ (không nhận ra hằng đẹp). */
  approximate?: boolean;
  queryIndex?: number;
  query?: unknown;
}

/** Thân phản hồi của `/api/analyze-problem` (permissive — giữ field riêng môn qua index). */
export interface SubjectResult {
  subject?: 'geometry' | 'physics' | 'chem' | string;
  mode?: 'engine' | 'dry-run' | string;
  /** Đề Toán/không rõ ⇒ route trả delegate:true để FE giữ luồng Toán. */
  delegate?: boolean;
  detected?: string;
  ok?: boolean;
  answers?: SubjectAnswer[];
  violations?: unknown[];
  errors?: { message?: string }[];
  /** Nhật ký tự kiểm (Lý: checks; Hóa: trace[]). */
  trace?: unknown[];
  /** Physics: { geometry, charts, playback, units, tPhys }. Chem: ChemScene. Xem extractor ở SimulationView. */
  scene?: unknown;
  /** Bộ dịch tự khước từ (đề thiếu số liệu / ngoài phạm vi). */
  abstained?: boolean;
  plan?: unknown;
  // checks/meta (Lý) · reactions/ledger/noReaction (Hóa) … giữ mở.
  [k: string]: unknown;
}

export interface SolverError {
  message: string;
  code?: string;
  status?: number;
  /** 'auth' = 401 chưa/đăng nhập hỏng · 'http' = lỗi máy chủ khác · 'network' = mất mạng/parse. */
  kind: 'auth' | 'http' | 'network';
}

export interface UseSubjectSolver {
  loading: boolean;
  result: SubjectResult | null;
  error: SolverError | null;
  solve: (problem: string) => Promise<SubjectResult | null>;
  reset: () => void;
}

// Mã lỗi coi là "cần đăng nhập" (route phát 'auth_required'/'invalid_token'; kèm 401 cho chắc).
const AUTH_CODES = new Set(['auth_required', 'invalid_token']);

export function useSubjectSolver(): UseSubjectSolver {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubjectResult | null>(null);
  const [error, setError] = useState<SolverError | null>(null);
  // Chống race: chỉ phản hồi của lượt gọi MỚI NHẤT được ghi vào state.
  const callSeq = useRef(0);

  const reset = useCallback(() => {
    callSeq.current++; // huỷ hiệu lực mọi lượt đang bay
    setLoading(false);
    setResult(null);
    setError(null);
  }, []);

  const solve = useCallback(async (problem: string): Promise<SubjectResult | null> => {
    const seq = ++callSeq.current;
    const isCurrent = () => seq === callSeq.current;

    if (!problem || !problem.trim()) {
      const e: SolverError = { message: 'Vui lòng nhập đề bài.', kind: 'network' };
      if (isCurrent()) { setError(e); setResult(null); setLoading(false); }
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Bearer token — LẤY GIỐNG GeometryContext.invokeLocalApi (supabase session access_token).
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${LOCAL_API}/api/analyze-problem`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ problem: problem.trim() }),
      });

      // Đọc CHỮ trước rồi mới parse JSON — khi hàm máy chủ crash/quá giờ, Vercel trả TRANG LỖI
      // (không phải JSON); gọi res.json() thẳng sẽ ném lỗi khó hiểu (mirror invokeLocalApi).
      const rawBody = await res.text();
      let data: SubjectResult | null = null;
      try { data = rawBody ? (JSON.parse(rawBody) as SubjectResult) : null; }
      catch { data = null; }

      if (!res.ok) {
        const code = (data as { code?: string } | null)?.code;
        const kind: SolverError['kind'] = res.status === 401 || (code && AUTH_CODES.has(code)) ? 'auth' : 'http';
        const message = kind === 'auth'
          ? 'Vui lòng đăng nhập để dùng tính năng giải Lý/Hóa.'
          : (data?.errors?.[0]?.message
            || (data as { error?: string } | null)?.error
            || (rawBody && !data
              ? `Máy chủ đang lỗi hoặc quá tải (HTTP ${res.status}), vui lòng thử lại.`
              : `HTTP ${res.status}`));
        const e: SolverError = { message, code, status: res.status, kind };
        if (isCurrent()) { setError(e); setResult(null); }
        return null;
      }

      if (!data) {
        const e: SolverError = { message: 'Máy chủ trả dữ liệu không hợp lệ, vui lòng thử lại.', kind: 'network' };
        if (isCurrent()) { setError(e); setResult(null); }
        return null;
      }

      // 200 OK — kể cả ok:false (ngoài phạm vi / abstain) và delegate:true (đề Toán) đều set RESULT,
      // để SimulationView tự quyết cách hiện (đáp số / violations / "đề Toán"). KHÔNG coi là error.
      if (isCurrent()) { setResult(data); setError(null); }
      return data;
    } catch (err: unknown) {
      const e: SolverError = {
        message: err instanceof Error ? err.message : 'Lỗi mạng khi gọi máy chủ.',
        kind: 'network',
      };
      if (isCurrent()) { setError(e); setResult(null); }
      return null;
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  return { loading, result, error, solve, reset };
}

export default useSubjectSolver;
