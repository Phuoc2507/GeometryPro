/**
 * useSolver — POST /api/solve wrapper
 *
 * Usage:
 *   const { solve, result, loading, error, currentStep, setCurrentStep } = useSolver();
 *   await solve(problemText, geometryData);
 */
import { useState, useCallback } from 'react';
import { GeometryData } from '@/types/geometry';

export interface SolveStep {
  id: string;
  title: string;
  explanation: string;
  formula?: string | null;
  highlight: string[];
  view_mode: '3d' | '2d';
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

  const solve = useCallback(async (problem: string, geometry: GeometryData, tags?: string[]) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
