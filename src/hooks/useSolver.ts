/**
 * useSolver — POST /api/solve wrapper
 *
 * Usage:
 *   const { solve, result, loading, error, currentStep, setCurrentStep } = useSolver();
 *   await solve(problemText, geometryData);
 */
import { useState, useCallback } from 'react';
import { GeometryData } from '@/types/geometry';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { checkAndIncrementGuestQuota } from '@/lib/quota';
import type { ConstructSpec } from '@/lib/solveReveal';

export interface SolveStep {
  id: string;
  title: string;
  explanation: string;
  formula?: string | null;
  highlight: string[];
  view_mode: '3d' | '2d';
  /** Điểm mới bước này giới thiệu (luật dựng; toạ độ do frontend tính từ hình). */
  construct?: ConstructSpec[];
}

export interface SolveResult {
  steps: SolveStep[];
  final_answer: string;
  answer_value: number | null;
  verified: boolean;
  verify_error: string | null;
}

export function useSolver() {
  const [result, setResult]           = useState<SolveResult | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const { user, openAuthModal } = useAuth();

  const solve = useCallback(async (problem: string, geometry: GeometryData, tags?: string[]) => {
    if (!user && !checkAndIncrementGuestQuota()) {
      openAuthModal('quota');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/solve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ problem, geometry, tags }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResult({
        steps:        data.steps        ?? [],
        final_answer: data.final_answer ?? '',
        answer_value: data.answer_value ?? null,
        verified:     data.verified     ?? false,
        verify_error: data.verify_error ?? null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setCurrentStep(0);
  }, []);

  return { solve, reset, result, loading, error, currentStep, setCurrentStep };
}
