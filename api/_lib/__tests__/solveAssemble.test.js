import { describe, it, expect } from 'vitest';
import { engineSolved, assembleSolveResult } from '../solveAssemble.js';

describe('solveAssemble', () => {
  it('engineSolved: đúng khi ok + answer số + 0 violation', () => {
    expect(engineSolved({ ok: true, answers: [{ text: '√2', approx: 1.4142 }], violations: [] })).toBe(true);
    expect(engineSolved({ ok: false, answers: [] })).toBe(false);
    expect(engineSolved(null)).toBe(false);
    expect(engineSolved({ ok: true, answers: [{ text: 'x', approx: NaN }], violations: [] })).toBe(false);
    expect(engineSolved({ ok: true, answers: [{ text: 'x', approx: 1 }], violations: [{}] })).toBe(false);
  });
  it('engine giải được → đáp engine + verified=true, steps từ LLM (đè đáp LLM)', () => {
    const eng = { ok: true, answers: [{ text: '√2', approx: 1.4142 }], violations: [] };
    const llm = { steps: [{ id: 's1', title: 't', explanation: 'e' }], final_answer: '1.41 (LLM tự chế)', answer_value: 1.41 };
    const r = assembleSolveResult(eng, llm);
    expect(r.verified).toBe(true);
    expect(r.final_answer).toBe('√2');
    expect(r.answer_value).toBeCloseTo(1.4142, 4);
    expect(r.steps.length).toBe(1);
    expect(r.verify_error).toBeNull();
  });
  it('engine chịu → đáp LLM + verified=false + verify_error', () => {
    const llm = { steps: [{ id: 's1', title: 't', explanation: 'e' }], final_answer: 'abc', answer_value: 5 };
    const r = assembleSolveResult(null, llm);
    expect(r.verified).toBe(false);
    expect(r.final_answer).toBe('abc');
    expect(r.answer_value).toBe(5);
    expect(r.verify_error).toMatch(/chưa kiểm chứng|engine/i);
  });
});
