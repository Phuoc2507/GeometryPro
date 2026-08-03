/**
 * SolveJobsContext — quản lý các lượt "Giải bài" THEO TỪNG BÀI (không theo panel).
 *
 * Vấn đề cũ: trạng thái giải nằm trong SolverPanel (useSolver). Đổi sang bài khác
 * lúc đang giải → mất, và kết quả về trễ của bài A có thể đổ/lưu nhầm sang bài B.
 *
 * Ở đây: mỗi bài có một "job" (đang giải / đã xong / lỗi) lưu theo khoá bài. Đổi bài
 * chỉ là đọc job của khoá khác — job cũ vẫn chạy nền và giữ nguyên. Quay lại bài đó
 * sẽ thấy đúng "đang giải" hoặc "đã giải". Giải nhiều bài song song được.
 */
import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { GeometryData } from '@/types/geometry';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cacheQuotaFromResponse } from '@/lib/quota';
import { markSolving, clearSolving } from '@/lib/solvingMarker';
import type { SolveResult } from '@/hooks/useSolver';

export interface SolveJob {
  status: 'solving' | 'done' | 'error';
  id: string | null;          // id lịch sử (?id) để lưu lời giải kèm hình khi xong
  problem: string;
  geometry: GeometryData;
  result: SolveResult | null;
  error: string | null;
}

interface SolveJobsContextType {
  getJob: (key: string) => SolveJob | undefined;
  startJob: (key: string, args: { id: string | null; problem: string; geometry: GeometryData; tags?: string[] }) => void;
  clearJob: (key: string) => void;
  /** Nhận quyền LƯU kết quả cho khoá này đúng 1 lần (chống 2 panel desktop+mobile lưu trùng). */
  claimSave: (key: string) => boolean;
  /** Trả lại quyền lưu (khi giải lại) để lần sau lưu được. */
  releaseSave: (key: string) => void;
}

const SolveJobsContext = createContext<SolveJobsContextType | null>(null);

export function SolveJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Record<string, SolveJob>>({});
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const savedRef = useRef<Set<string>>(new Set());
  const { openAuthModal } = useAuth();

  const getJob = useCallback((key: string) => jobs[key], [jobs]);

  const startJob = useCallback<SolveJobsContextType['startJob']>((key, { id, problem, geometry, tags }) => {
    // Đang giải rồi thì không giải lại (bấm 2 lần / 2 panel cùng bấm).
    if (jobsRef.current[key]?.status === 'solving') return;
    setJobs((prev) => ({ ...prev, [key]: { status: 'solving', id, problem, geometry, result: null, error: null } }));
    markSolving(id, problem);   // để reload giữa chừng biết mà chờ kết quả server lưu

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/solve', {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify({ problem, geometry, tags, id }),  // id: để server LƯU lời giải kèm bài (chống mất khi F5)
        });
        const data = await res.json();
        cacheQuotaFromResponse(res, data);

        if (!res.ok) {
          if (res.status === 429 || data.code === 'guest_quota_exceeded' || data.code === 'guest_ip_quota_exceeded') {
            openAuthModal('quota');
          }
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const result: SolveResult = {
          steps: data.steps ?? [],
          final_answer: data.final_answer ?? '',
          answer_value: data.answer_value ?? null,
          verified: data.verified ?? false,
          verify_error: data.verify_error ?? null,
          tier: data.tier ?? null,
        };
        // Chỉ ghi nếu job chưa bị xoá (người dùng bấm "Giải lại" xoá đi giữa chừng).
        setJobs((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], status: 'done', result, error: null } } : prev));
        clearSolving(id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setJobs((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], status: 'error', error: msg } } : prev));
        clearSolving(id);
      }
    })();
  }, [openAuthModal]);

  const clearJob = useCallback((key: string) => {
    savedRef.current.delete(key);
    setJobs((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const claimSave = useCallback((key: string) => {
    if (savedRef.current.has(key)) return false;
    savedRef.current.add(key);
    return true;
  }, []);

  const releaseSave = useCallback((key: string) => {
    savedRef.current.delete(key);
  }, []);

  return (
    <SolveJobsContext.Provider value={{ getJob, startJob, clearJob, claimSave, releaseSave }}>
      {children}
    </SolveJobsContext.Provider>
  );
}

export function useSolveJobs() {
  const ctx = useContext(SolveJobsContext);
  if (!ctx) throw new Error('useSolveJobs must be used within SolveJobsProvider');
  return ctx;
}
